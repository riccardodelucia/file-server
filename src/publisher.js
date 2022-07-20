const Redis = require('ioredis');
const winston = require('winston');

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});
const publisher = process.env.PUBLISHER === 'true';

logger.info(`Publisher configured: ${publisher}`);

let publish;

/**
 * This module implements a dependency-injection system for defining the publish method, according to the actual need for publishing messages to a subscribed service. If there is no need for informing other services about the outcome of an upload endpoint (i.e. the server is only used to upload random files to an s3 bucket), the publish method simply prints a message and returns
 */

if (publisher) {
  logger.info(`Setting up redis client: ${publisher}`);

  const redis = new Redis({
    host: 'redis',
    port: 6379,
    connectTimeout: 10000,
    retryStrategy(times) {
      logger.info('Redis client setup retry: ', times);
      const delay = Math.min(times * 50, 20000);
      return delay;
    },
  });

  publish = async (
    status,
    uploadId,
    filename,
    objectKey = '',
    info = undefined
  ) => {
    logger.info(
      `Publish message: file ${filename} with object key ${objectKey} upload ended with status ${status}`
    );
    const uploadArray = [
      'status',
      status,
      'uploadId',
      uploadId,
      'filename',
      filename,
      'objectKey',
      objectKey,
      'info',
      JSON.stringify(info),
    ];

    await redis.xadd('ccr', '*', ...uploadArray);
  };
} else {
  publish = () => {
    logger.info('No message published: publisher disabled');
  };
}

exports.publish = publish;
