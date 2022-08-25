const express = require('express');

const uploadController = require('../controllers/uploadController');
const authController = require('../controllers/authController');
const errorController = require('../controllers/errorController');

const router = express.Router({ mergeParams: true });

/*
 * Check the upload ID must be put before anything else to make it available to each subsequent stages asap
 * (i.e. if protect fails the auth, the publishErrorMsg error middleware needs to know the uploadId to inform back the app correctly)
 */
router.use(uploadController.checkUploadId);
router.use(authController.protect);
router.post(
  '/',
  uploadController.uploadFile,
  uploadController.finalizeSuccessfullUpload
);
router.use(uploadController.abort);
router.use(errorController.publishErrorMsg);

module.exports = router;
