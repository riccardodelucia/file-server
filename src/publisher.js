import Redis from 'ioredis';
import winston from 'winston';

export const messageStatus = {
  UPLOADED: 'uploaded',
  ERROR: 'error',
};

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});
const publisher = process.env.PUBLISHER === 'true';

logger.info(`Publisher configured: ${publisher}`);

export let publish;

/**
 * This module implements a dependency-injection system for defining the publish method, according to the actual need for publishing messages to a subscribed service.  * If there is no need for informing other services about the outcome of an upload endpoint (i.e. the server is only used to upload random files to an s3 bucket), the  * publish method simply prints a message and returns
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

  /**
   * This publisher simply sends all info it has when it's called. This info can highly vary according to where and why this is called
   * e.g because of an error/ successfull upload, etc.
   * It is up to the subscriber to parse the message and react accordingly to available information
   * Note: it is better to leave publish as a fire-and-forget action in order not to block replies to clients.
   * Should any error occur during publishing, a logger message is printed and the message is unfortunately lost before reaching the subscriber
   */
  publish = ({ status, uploadId, fileId, filename, objectKey }) => {
    logger.info(
      `Publish message: status ${status} | uploadId: ${uploadId} | fileId: ${fileId} | filename: ${filename} | objectKey: ${objectKey}`
    );
    const uploadArray = [
      'status',
      status,
      'uploadId',
      uploadId,
      'fileId',
      fileId,
      'filename',
      filename,
      'objectKey',
      objectKey,
    ];
    redis.xadd('ccr', '*', ...uploadArray).catch((err) => {
      logger.error(`Error while trying to publish message: ${err.message}`);
    });
  };
} else {
  publish = () => {
    logger.info('No message published: publisher disabled');
  };
}
