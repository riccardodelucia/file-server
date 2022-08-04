const Busboy = require('busboy');
const { default: PQueue } = require('p-queue');
const winston = require('winston');

const { publish } = require('../publisher');
const { multipartUpload } = require('../s3');
const AppError = require('../utils/appError');

const uploadStatus = {
  UPLOADED: 'uploaded',
  ERROR: 'error',
};

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

exports.uploadFile = async (req, res, next) => {
  const uploadId = req.headers['x-upload-id'];

  if (!uploadId) {
    logger.warn('Missing Upload Id');
    return next(new AppError('Missing "X-Upload-Id" header', 400)); //res.status(400).json({ message: 'Missing "X-Upload-Id" header' });
  }

  // check: https://stackoverflow.com/questions/63632422/express-js-how-handle-errors-with-busboy

  const info = {};
  let filename = undefined;
  let objectKey = undefined;

  const busboy = Busboy({ headers: req.headers });
  const workQueue = new PQueue({ concurrency: 1 });

  async function abort(e, code = 500) {
    logger.warn(`Aborting connection`);

    req.unpipe(busboy);
    workQueue.pause();
    try {
      await publish(uploadStatus.ERROR, uploadId, filename, objectKey, info);
    } catch (error) {
      logger.error('Unable to send message to the subscriber: ', error);
    } finally {
      res.status(code);
      res.send(e?.message);
    }
  }

  async function handleError(fn) {
    workQueue.add(async () => {
      try {
        await fn();
      } catch (e) {
        await abort(e);
      }
    });
  }

  busboy.on('file', (_, file, fileInfo) => {
    handleError(async () => {
      filename = fileInfo.filename;
      const date = String(Date.now());
      objectKey = [uploadId, date, filename].join('/');
      await multipartUpload(file, objectKey);
    });
  });

  busboy.on('field', (name, val) => {
    handleError(async () => {
      // storing all form fields inside an info object allows to avoid clashes with publisher reserved message fields
      info[name] = val;
    });
  });

  busboy.on('finish', async () => {
    handleError(async () => {
      await publish(uploadStatus.UPLOADED, uploadId, filename, objectKey, info);
      res.sendStatus(200);
    });
  });

  req.on('aborted', () => {
    abort(new Error('Connection aborted'), 499);
  });

  busboy.on('error', (e) => {
    abort(e);
  });

  req.pipe(busboy);
};
