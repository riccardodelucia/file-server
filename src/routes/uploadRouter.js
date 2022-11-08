import express from 'express';
import uploadController from '../controllers/uploadController.js';
import authController from '../controllers/authController.js';
import { checkObjectKeyUser } from '../controllers/middleware.js';

import config from '../config.js';

const { PROTECTED, PUBLISHER } = config;

const router = express.Router({ mergeParams: true });

let middlewareChain = [];
let errorChain = [];

if (PROTECTED) {
  router.use(authController.protect);

  middlewareChain = middlewareChain.concat([
    uploadController.checkObjectKey,
    checkObjectKeyUser,
    uploadController.validateNewFileUpload,
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
} else {
  middlewareChain = middlewareChain.concat([
    uploadController.checkObjectKey,
    uploadController.validateNewFileUpload,
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
