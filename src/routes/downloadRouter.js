import express from 'express';
import downloadController from '../controllers/downloadController.js';
import authController from '../controllers/authController.js';
import winston from 'winston';

import config from '../config.js';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()],
});

const { PROTECTED } = config;

const router = express.Router({ mergeParams: true });

if (PROTECTED) {
  logger.info('downloadRouter is protected');
  router.use(authController.protect);
  router.get(
    '/',
    downloadController.checkQueryString,
    authController.validateObjectKeyAgainstUser,
    downloadController.downloadFile
  );
} else {
  router.get(
    '/',
    downloadController.checkQueryString,
    downloadController.downloadFile
  );
}

export default router;
