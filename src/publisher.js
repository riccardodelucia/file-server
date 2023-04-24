import { createClient } from 'redis';
import winston from 'winston';

const messageStatus = {
  UPLOADED: 'uploaded',
  ERROR: 'error',
};

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const redis = createClient({
  url: 'redis://redis:6379',
});

redis.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
  await redis.connect();
})();

const publish = (status, filename, objectKey) => {
  logger.info(
    `Publish message -> status: ${status} | filename: ${filename} | objectKey: ${objectKey}`
  );

  const uploadMsg = { status, filename, objectKey };

  logger.info(`Redis is publishing`);

  return redis.publish('ccr', JSON.stringify(uploadMsg));
};

export default {
  publishErrorMsg: publish.bind(undefined, messageStatus.ERROR),
  publishUploadedMsg: publish.bind(undefined, messageStatus.UPLOADED),
};
