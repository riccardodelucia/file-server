import winston from 'winston';
import {
  S3Client,
  CreateBucketCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import config from './config.js';

const {
  S3_BUCKET_NAME,
  S3_ENDPOINT_URL,
  S3_BUCKET_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_KEY,
} = config;

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

logger.info(`Creating/ Attaching to S3 bucket at: ${S3_ENDPOINT_URL}`);

const s3Client = new S3Client({
  region: S3_BUCKET_REGION,
  endpoint: S3_ENDPOINT_URL,
  forcePathStyle: true,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_KEY,
  },
});

(async () => {
  try {
    logger.info(`Setting up bucket: ${S3_BUCKET_NAME}`);
    await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET_NAME }));
    logger.info(`Bucket created: ${S3_BUCKET_NAME}`);
  } catch (err) {
    logger.error('Error', err);
  }
})();

export const multipartUpload = async (file, objectKey, user = undefined) => {
  logger.info(`Uploading ${objectKey} object`);

  const uploadParams = {
    Bucket: S3_BUCKET_NAME,
    Body: file,
    Key: objectKey,
  };
  if (user) uploadParams.Metadata = { user };

  const parallelUploads = new Upload({
    client: s3Client,
    params: uploadParams,
    tags: [], // optional tags
    queueSize: 4, // optional concurrency configuration
    partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
    leavePartsOnError: false, // optional manually handle dropped parts
  });

  parallelUploads.on('httpUploadProgress', (progress) => {
    if (progress.part % 100 === 0 || progress.part === 1) logger.info(progress);
  });

  return parallelUploads.done();
};
export const download = (objectKey) => {
  logger.info(`Streaming ${objectKey} object to client`);

  const downloadParams = {
    Bucket: S3_BUCKET_NAME,
    Key: objectKey,
  };

  const command = new GetObjectCommand(downloadParams);

  return s3Client.send(command);
};

export const checkObjectExistence = async (objectKey) => {
  const commandParams = {
    Bucket: S3_BUCKET_NAME,
    Key: objectKey,
  };
  const command = new HeadObjectCommand(commandParams);
  try {
    const response = await s3Client.send(command);
    if (response.$metadata.httpStatusCode === 200) return true;
    return false;
  } catch (error) {
    if (error.name === 'NotFound') return false;
    throw error;
  }
};
