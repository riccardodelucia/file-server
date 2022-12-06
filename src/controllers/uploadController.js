import Busboy from 'busboy';
import PQueue from 'p-queue';
import winston from 'winston';

import publisher from '../publisher.js';
import { multipartUpload, checkObjectExistence } from '../s3.js';
import { AppError } from '../utils/appError.js';

import { catchAsync } from '../utils/catchAsync.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

export default {
  checkObjectKey: (req, res, next) => {
    logger.info('checkObjectKey called');
    const objectKey = req.headers['x-object-key'];
    logger.info(`objectKey: ${objectKey}`);

    if (!objectKey) {
      logger.error('Missing Object Key');
      throw new AppError('Missing "X-Object-Key" header', 400);
    }
    res.locals.objectKey = objectKey;
    next();
  },
  validateNewObjectKeyUpload: catchAsync(async (req, res, next) => {
    // we check whether the uploading object key already corresponds to an uploaded object
    // NOTE: this could have been don by inspecting the db as well. Since the unprotected version of the file server doesn't use a db, the object existence check is done by looking at the S3 bucket content
    logger.info('validateNewObjectKeyUpload called');
    const objectKey = res.locals.objectKey;
    const objectExists = await checkObjectExistence(objectKey);
    if (objectExists)
      return next(new AppError(`ObjectKey ${objectKey} already exists`, 403));
    return next();
  }),
  uploadFile: (req, res, next) => {
    /**
     * Since Busboy requires a send header of Content-Type: multipart/form-data, I cannot set the uploaded file type from the request.
     * This means the uploaded files on s3 inherit the standard type, which is octet-stream. When downloading files, I cannot retrieve the file type from the s3 downloaded object file. Therefore, I need a specific strategy for inferring the file type in the download controller.
     */
    logger.info(`uploadFile called`);
    const objectKey = res.locals.objectKey;

    const busboy = Busboy({ headers: req.headers });
    const workQueue = new PQueue({ concurrency: 1 });

    busboy.on('file', (_, file, fileInfo) => {
      workQueue.add(
        catchAsync(async () => {
          const filename = fileInfo.filename;
          res.locals.filename = filename;
          logger.info(`Got file  ${filename}. Object key: ${objectKey}`);

          // The control on filename matching the object key cna be done only at this stage. No dedicated middleware is therefore created for this task
          const parts = objectKey.split('/');
          if (parts.at(-1) !== filename)
            return next(
              new AppError(
                `Filename ${filename} doesn't match the object key pattern ${objectKey}`,
                400
              )
            );

          await multipartUpload(file, objectKey);
        })
      );
    });

    busboy.on('finish', () => {
      next();
    });

    req.on('aborted', () => {
      next(new Error('Connection aborted'), 499);
    });

    busboy.on('error', (err) => {
      next(err);
    });

    res.locals.busboy = busboy;
    res.locals.workQueue = workQueue;

    req.pipe(busboy);
  },
  sendUploadedResponse: (req, res) => {
    const objectKey = res.locals.objectKey;
    res.status(201).json({
      status: 'success',
      data: {
        objectKey,
      },
    });
  },
  abort: (err, req, res, next) => {
    logger.error('abort called');
    const busboy = res.locals.busboy;
    const workQueue = res.locals.workQueue;

    if (busboy && workQueue) {
      logger.warn(`Pending upload: aborting connection`);
      req.unpipe(busboy);
      workQueue.pause();
    }

    next(err);
  },
  closeConnectionOnError: (err, req, res, next) => {
    logger.error('closeConnectionOnError called');
    //this instruction automatically closes the socket with the client -> it allows to interrupt file uploads from the client browser
    res.header('Connection', 'close');
    next(err);
  },
  publishUploadedMsg: (req, res, next) => {
    logger.info('publishUploadedMsg called');
    const filename = res.locals.filename;
    const objectKey = res.locals.objectKey;

    publisher.publishUploadedMsg(filename, objectKey);
    next();
  },
  publishErrorMsg: (err, req, res, next) => {
    logger.error('publishErrorMsg called');
    const filename = res.locals.filename;
    const objectKey = res.locals.objectKey;
    publisher.publishErrorMsg(filename, objectKey);
    next(err);
  },
};
