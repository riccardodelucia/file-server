const Redis = require("ioredis");

const redis = new Redis({ host: "redis", port: 6379 });

const publish = async (
  status,
  uploadId,
  filename,
  objectKey = "",
  info = undefined
) => {
  const uploadArray = [
    "status",
    status,
    "uploadId",
    uploadId,
    "filename",
    filename,
    "objectKey",
    objectKey,
    "info",
    JSON.stringify(info),
  ];

  await redis.xadd("ccr", "*", ...uploadArray);
};

exports.publish = publish;
