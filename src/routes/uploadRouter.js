import express from 'express';
import uploadController from '../controllers/uploadController.js';
import authController from '../controllers/authController.js';
import errorController from '../controllers/errorController.js';

const isProtected = process.env.PROTECTED === 'true';

const router = express.Router({ mergeParams: true });

/*
 * Check the upload ID must be put before anything else to make it available to each subsequent stages asap
 * (i.e. if protect fails the auth, the publishErrorMsg error middleware needs to know the uploadId to inform back the app correctly)
 */
isProtected && router.use(authController.protect);
router.use(uploadController.checkUploadId);
router.use(uploadController.checkFileId);
router.post(
  '/',
  uploadController.uploadFile,
  uploadController.finalizeSuccessfullUpload
);
router.use(uploadController.abort);
router.use(errorController.publishErrorMsg);

export default router;
