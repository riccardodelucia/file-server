import express from 'express';
import uploadController from '../controllers/uploadController.js';
import authController from '../controllers/authController.js';
import winston from 'winston';

import config from '../config.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const { PROTECTED, PUBLISHER } = config;

const router = express.Router({ mergeParams: true });

let middlewareChain = [];
let errorChain = [];

if (PROTECTED) {
  logger.info('uploadRouter is protected');

  router.use(authController.protect);

  middlewareChain = middlewareChain.concat([
    uploadController.checkObjectKey,
    authController.validateObjectKeyAgainstUser,
    uploadController.validateNewObjectKeyUpload,
    uploadController.uploadFile,
  ]);

  errorChain = errorChain.concat([
    uploadController.abort,
    uploadController.closeConnectionOnError,
  ]);

  if (PUBLISHER) {
    logger.info('Publish/Subscribe is active');
    middlewareChain.push(uploadController.publishUploadedMsg);
    errorChain.push(uploadController.publishErrorMsg);
  }

  middlewareChain.push(uploadController.sendUploadedResponse);
} else {
  middlewareChain = middlewareChain.concat([
    uploadController.checkObjectKey,
    uploadController.validateNewObjectKeyUpload,
    uploadController.uploadFile,
  ]);
  errorChain = errorChain.concat([
    uploadController.abort,
    uploadController.closeConnectionOnError,
  ]);

  if (PUBLISHER) {
    middlewareChain.push(uploadController.publishUploadedMsg);
    errorChain.push(uploadController.publishErrorMsg);
  }
  middlewareChain.push(uploadController.sendUploadedResponse);
}

router.post('/', ...middlewareChain, ...errorChain);

export default router;
