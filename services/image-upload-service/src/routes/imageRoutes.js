// services/image-upload-service/src/routes/imageRoutes.js
const express = require('express');
const { uploadImage, getImageStatusById } = require('../controllers/imageUploadController');

const router = express.Router();

router.post('/upload', uploadImage);
router.get('/:id', getImageStatusById); // Or whatever your controller function is named

// Health check route
// router.get('/health', getHealth);

module.exports = router;