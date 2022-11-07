import winston from 'winston';
import path from 'path';

import { download } from '../s3.js';

import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/appError.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

export default {
  checkQueryString: (req, res, next) => {
    const { 'object-key': objectKey } = req.query;
    if (!objectKey)
      return next(
        new AppError(
          "Must provide a query string with a 'object-key' parameter for identifying the file to be downloaded",
          403
        )
      );
    res.locals.objectKey = objectKey;
    next();
  },
  downloadFile: catchAsync(async (req, res) => {
    const objectKey = res.locals.objectKey;
    logger.info(`Downloading file ${objectKey}`);
    const obj = await download(objectKey);
    logger.info(`File ${objectKey} downloaded`);
    const stream = obj.Body;

    // guess mime type from file extension. NOTE: this approach is very naive and definitely not robust. Nevertheless, available npm libraries for guessing the mime type suck, therefore...
    let contentType = '';
    const ext = path.extname(objectKey).slice(1);
    switch (ext) {
      case 'json':
        contentType = 'application/json';
        break;
      case 'csv':
        contentType = 'text/csv';
        break;
      case 'tsv':
        contentType = 'text/csv';
        break;
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      default:
        contentType = 'application/octet-stream';
        break;
    }
    logger.info(`Content type: ${contentType}`);

    res.setHeader('Content-Type', contentType);
    res.status(200);
    stream.pipe(res);
  }),
};
