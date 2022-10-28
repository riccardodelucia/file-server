import express from 'express';
import downloadController from '../controllers/downloadController.js';
import authController from '../controllers/authController.js';
import { checkObjectKeyUser } from '../controllers/middleware.js';

const PROTECTED = process.env.FILESERVER_PROTECTED === 'true';

const router = express.Router({ mergeParams: true });

if (PROTECTED) {
  router.use(authController.protect);
  router.get(
    '/',
    downloadController.checkQueryString,
    checkObjectKeyUser,
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
