require("dotenv").config();
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const { CreateBucketCommand } = require("@aws-sdk/client-s3");

const bucketName = process.env.S3_BUCKET_NAME;
const bucketEndpoint = process.env.S3_ENDPOINT_URL;
const region = process.env.S3_BUCKET_REGION;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_KEY;

const s3Client = new S3Client({
  region,
  endpoint: bucketEndpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

(async () => {
  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
    console.log("Bucket created: ", bucketName);
  } catch (err) {
    console.log("Error", err);
  }
})();

async function multipartUpload(file, objectKey) {
  const uploadParams = {
    Bucket: bucketName,
    Body: file,
    Key: objectKey,
  };

  const parallelUploads3 = new Upload({
    client: s3Client,
    params: uploadParams,
    tags: [], // optional tags
    queueSize: 4, // optional concurrency configuration
    partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
    leavePartsOnError: false, // optional manually handle dropped parts
  });

  parallelUploads3.on("httpUploadProgress", (progress) => {
    console.log(progress);
  });

  return parallelUploads3.done();
}

exports.multipartUpload = multipartUpload;
