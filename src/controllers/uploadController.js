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

  if (!uploadId) {
    logger.warn('Missing Upload Id');
    return next(new AppError('Missing "X-Upload-Id" header', 400));
  }

  res.locals.uploadId = uploadId;
  next();
};

exports.uploadFile = async (req, res, next) => {
  const uploadId = res.locals.uploadId;
  const info = {};
  let filename = undefined;
  let objectKey = undefined;

  const busboy = Busboy({ headers: req.headers });
  const workQueue = new PQueue({ concurrency: 1 });

  busboy.on('file', (_, file, fileInfo) => {
    workQueue.add(
      catchAsync(async () => {
        filename = fileInfo.filename;
        res.locals.filename = filename;
        const date = String(Date.now());
        objectKey = [uploadId, date, filename].join('/');
        res.locals.objectKey = objectKey;
        await multipartUpload(file, objectKey);
      })
    );
  });

  busboy.on('field', (name, val) => {
    workQueue.add(
      catchAsync(async () => {
        // storing all form fields inside an info object allows to avoid clashes with publisher reserved message fields
        info[name] = val;
      })
    );
  });

  busboy.on('finish', async () => {
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

  res.locals.info = info;

  req.pipe(busboy);
};

exports.finalizeSuccessfullUpload = (req, res) => {
  const uploadId = res.locals.uploadId;
  const filename = res.locals.filename;
  const objectKey = res.locals.objectKey;
  const info = res.locals.info;

  publish({
    status: messageStatus.UPLOADED,
    uploadId,
    filename,
    objectKey,
    info,
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
