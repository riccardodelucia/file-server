import Redis from 'ioredis';
import winston from 'winston';

const messageStatus = {
  UPLOADED: 'uploaded',
  ERROR: 'error',
};

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

let redis = undefined;
// This method is structured as a memoized factory function because we need to avoid the instantiation of a Redis instance when the publisher is disabled.
// This function is in fact executed only when the publish method is called, which in turns is executed iff the publisher env var is set to true
const getRedisInstance = () => {
  if (!redis) {
    redis = new Redis({
      host: 'redis',
      port: 6379,
      connectTimeout: 10000,
      retryStrategy(times) {
        logger.info('Redis client setup retry: ', times);
        const delay = Math.min(times * 50, 20000);
        return delay;
      },
    });
  }
  return redis;
};

const publish = (status, filename, objectKey) => {
  logger.info(
    `Publish message -> status: ${status} | filename: ${filename} | objectKey: ${objectKey}`
  );
  const redis = getRedisInstance();
  const uploadArray = [
    'status',
    status,
    'filename',
    filename,
    'objectKey',
    objectKey,
  ];
  redis.xadd('ccr', '*', ...uploadArray).catch((err) => {
    logger.error(`Error while trying to publish message: ${err.message}`);
  });
};

export default {
  publishErrorMsg: publish.bind(undefined, messageStatus.ERROR),
  publishUploadedMsg: publish.bind(undefined, messageStatus.UPLOADED),
};
