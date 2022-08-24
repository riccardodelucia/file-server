const winston = require('winston');
const AppError = require('../utils/appError');

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

/* eslint-disable */
module.exports = (err, req, res, next) => {
  let error = { ...err };
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'error';
  if (req.url.includes('upload')) res.header('Connection', 'close'); //this automatically closes the socket with the client -> it allows to interrupt file uploads from the client browser
  if (error.name === 'JWTExpired') error = handleTokenExpiredError();
  if (error.name === 'JWTClaimValidationFailed')
    error = handleTokenInvalidClaimError(error);
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else if (process.env.NODE_ENV === 'production') {
    sendErrorProd(error, res);
  }
};
