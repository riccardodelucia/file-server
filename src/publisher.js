const Redis = require('ioredis');

const publisher = process.env.PUBLISHER || false;

let publish;

/**
 * This module implements a dependency-injection system for defining the publish method, according to the actual need for publishing messages to a subscribed service. If there is no need for informing other services about the outcome of an upload endpoint (i.e. the server is only used to upload random files to an s3 bucket), the publish method simply prints a message and returns
 */

if (publisher) {
  const redis = new Redis({
    host: 'redis',
    port: 6379,
    connectTimeout: 10000,
    retryStrategy(times) {
      console.log('retry: ', times);
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
    console.log('Publisher disabled');
  };
}

exports.publish = publish;
