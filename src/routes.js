const express = require('express');

const uploadController = require('./controllers/uploadController');
const authController = require('./controllers/authController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router.post('/', uploadController.uploadFile);

module.exports = router;
