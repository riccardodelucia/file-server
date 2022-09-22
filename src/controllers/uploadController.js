const Busboy = require('busboy');
const { default: PQueue } = require('p-queue');
const winston = require('winston');

const { publish, messageStatus } = require('../publisher');
const { multipartUpload } = require('../s3');
const AppError = require('../utils/appError');

const catchAsync = require('../utils/catchAsync');

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

exports.checkUploadId = (req, res, next) => {
  const uploadId = req.headers['x-upload-id'];
  logger.info(`uploadId: ${uploadId}`);

  if (!uploadId) {
    logger.warn('Missing Upload Id');
    return next(new AppError('Missing "X-Upload-Id" header', 400));
  }

  res.locals.uploadId = uploadId;
  next();
};

exports.checkFileId = (req, res, next) => {
  const fileId = req.headers['x-file-id'];
  logger.info(`fileId: ${fileId}`);

  if (!fileId) {
    logger.warn('Missing File Id');
    return next(new AppError('Missing "X-File-Id" header', 400));
  }

  res.locals.fileId = fileId;
  next();
};

exports.uploadFile = (req, res, next) => {
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
};

exports.finalizeSuccessfullUpload = (req, res) => {
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
};

exports.abort = (err, req, res, next) => {
  const busboy = res.locals.busboy;
  const workQueue = res.locals.workQueue;

  if (busboy && workQueue) {
    logger.warn(`Pending upload: aborting connection`);
    req.unpipe(busboy);
    workQueue.pause();
  }

  next(err);
};
