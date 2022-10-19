import express from 'express';
import downloadController from '../controllers/downloadController.js';
import authController from '../controllers/authController.js';

const isProtected = process.env.PROTECTED === 'true';

const router = express.Router({ mergeParams: true });

isProtected && router.use(authController.protect);

router.get('/', downloadController.downloadFile);

export default router;
