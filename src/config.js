const NODE_ENV = process.env.NODE_ENV || undefined;
const BUILD = process.env.BUILD || 0;
const VERSION = process.env.VERSION || 0;
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(', ') || '*';
const CORS_METHODS =
  process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE';
const JSON_SIZE_LIMIT = process.env.JSON_SIZE_LIMIT || '10GB';
const UPLOAD_MAX_FILE_SIZE = process.env.UPLOAD_MAX_FILE_SIZE || '10GB';
const RATE_LIMIT_MAX_REQUESTS = process.env.RATE_LIMIT_MAX_REQUESTS || 1000;
const RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || 1000;
const PROTECTED = process.env.PROTECTED
  ? process.env.PROTECTED === 'true'
  : true;
const PUBLISHER = process.env.PUBLISHER
  ? process.env.PUBLISHER === 'true'
  : true;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_ENDPOINT_URL = process.env.S3_ENDPOINT_URL;
const S3_BUCKET_REGION = process.env.S3_BUCKET_REGION;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const AUTH_JWKS_URL = process.env.AUTH_JWKS_URL;
const AUTH_TOKEN_AUDIENCE = process.env.AUTH_TOKEN_AUDIENCE;

export default {
  NODE_ENV,
  BUILD,
  VERSION,
  CORS_ORIGINS,
  CORS_METHODS,
  JSON_SIZE_LIMIT,
  UPLOAD_MAX_FILE_SIZE,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  PROTECTED,
  PUBLISHER,
  S3_BUCKET_NAME,
  S3_ENDPOINT_URL,
  S3_BUCKET_REGION,
  S3_ACCESS_KEY_ID,
  S3_SECRET_KEY,
  AUTH_JWKS_URL,
  AUTH_TOKEN_AUDIENCE,
};
