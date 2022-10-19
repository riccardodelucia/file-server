import Busboy from 'busboy';
import PQueue from 'p-queue';
import winston from 'winston';

import { publish, messageStatus } from '../publisher.js';
import { multipartUpload } from '../s3.js';
import { AppError } from '../utils/appError.js';

import { catchAsync } from '../utils/catchAsync.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

export default {
  checkUploadId: (req, res, next) => {
    const uploadId = req.headers['x-upload-id'];
    logger.info(`uploadId: ${uploadId}`);

    if (!uploadId) {
      logger.warn('Missing Upload Id');
      throw new AppError('Missing "X-Upload-Id" header', 400);
    }

    res.locals.uploadId = uploadId;
    next();
  },
  checkFileId: (req, res, next) => {
    const fileId = req.headers['x-file-id'];
    logger.info(`fileId: ${fileId}`);

    if (!fileId) {
      logger.warn('Missing File Id');
      throw new AppError('Missing "X-File-Id" header', 400);
    }

    res.locals.fileId = fileId;
    next();
  },
  uploadFile: (req, res, next) => {
    /**
     * Since Busboy requires a send header of Content-Type: multipart/form-data, I cannot set the uploaded file type from the request.
     * This means the uploaded files on s3 inherit the standard type, which is octet-stream. When downloading files, I cannot retrieve the file type from the s3 downloaded object file. Therefore, I need a specific strategy for inferring the file type in the download controller.
     */
    logger.info(`uploadFile method`);
    const uploadId = res.locals.uploadId;
    const fileId = res.locals.fileId;
    let filename = undefined;
    let objectKey = undefined;

    const busboy = Busboy({ headers: req.headers });
    const workQueue = new PQueue({ concurrency: 1 });

    busboy.on('file', (_, file, fileInfo) => {
      workQueue.add(
        catchAsync(async () => {
          filename = fileInfo.filename;
          res.locals.filename = filename;
          objectKey = [uploadId, fileId, filename].join('/');
          res.locals.objectKey = objectKey;
          logger.info(
            `Got file. Filename: ${filename}. Produced object key: ${objectKey}`
          );
          await multipartUpload(file, objectKey);
        })
      );
    });

    busboy.on('finish', () => {
      logger.info(`Finished upload`);
      // in callback pattern we need to explicitly call next or next(err)
      next();
    });

    req.on('aborted', () => {
      // in callback pattern we need to explicitly call next or next(err)
      next(new Error('Connection aborted'), 499);
    });

    busboy.on('error', (err) => {
      // in callback pattern we need to explicitly call next or next(err)
      next(err);
    });

    res.locals.busboy = busboy;
    res.locals.workQueue = workQueue;

    req.pipe(busboy);
  },
  finalizeSuccessfullUpload: (req, res) => {
    const uploadId = res.locals.uploadId;
    const fileId = res.locals.fileId;
    const filename = res.locals.filename;
    const objectKey = res.locals.objectKey;

    publish({
      status: messageStatus.UPLOADED,
      uploadId,
      fileId,
      filename,
      objectKey,
    });
    res.sendStatus(200);
  },
  abort: (err, req, res, next) => {
    const busboy = res.locals.busboy;
    const workQueue = res.locals.workQueue;

    if (busboy && workQueue) {
      logger.warn(`Pending upload: aborting connection`);
      req.unpipe(busboy);
      workQueue.pause();
    }

    next(err);
  },
};
