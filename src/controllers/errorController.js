const winston = require('winston');
const AppError = require('../utils/appError');
const { publish, messageStatus } = require('../publisher');

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    error: err,
    status: err.status,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // only operational errors should reveal error details to the client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    logger.error('Unexpected Internal Error: ', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
};

const handleTokenExpiredError = () => {
  return new AppError('Token expired', 403);
};

const handleTokenInvalidClaimError = (error) => {
  return new AppError(
    `Invalid Token Claim. Wrong claims: '${error.claim}'`,
    403
  );
};

exports.publishErrorMsg = (err, req, res, next) => {
  logger.error(`Publishing error message`);
  const uploadId = res.locals.uploadId;
  const filename = res.locals.filename;
  const objectKey = res.locals.objectKey;
  const info = res.locals.info || {};
  publish({
    status: messageStatus.ERROR,
    uploadId,
    filename,
    objectKey,
    info,
  });
  next(err);
};

exports.closeConnectionOnError = (err, req, res, next) => {
  //this instruction automatically closes the socket with the client -> it allows to interrupt file uploads from the client browser
  res.header('Connection', 'close');
  next(err);
};

/**
 * General error handler to respond upon any error occurred during a request processing
 * Critical error fields (like stack trace) are filtered by sending back a derived object from the exception with desired fields only
 */
// eslint-disable-next-line no-unused-vars
exports.globalErrorMiddleware = (err, req, res, _) => {
  logger.error(`Got error: ${err}`);
  let error = { ...err };
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'error';

  if (error.name === 'JWTExpired') error = handleTokenExpiredError();
  if (error.name === 'JWTClaimValidationFailed')
    error = handleTokenInvalidClaimError(error);

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, res);
  }
};
