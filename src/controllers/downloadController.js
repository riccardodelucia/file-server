import winston from 'winston';
import { fileTypeFromStream } from 'file-type';

import { download } from '../s3.js';

import { catchAsync } from '../utils/catchAsync.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

export default {
  downloadFile: catchAsync(async (req, res) => {
    logger.info('Downloading file');
    const obj = await download('/abcd/1234/supermario.png');
    const stream = obj.Body;
    const contentType = await fileTypeFromStream(stream);
    res.setHeader('Content-Type', contentType.mime);
    stream.pipe(res);
  }),
};
