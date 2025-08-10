// services/image-upload-service/src/controllers/imageUploadController.js
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Image = require('../models/Image');
const { getChannel } = require('../config/rabbitmq');
require('dotenv').config();

const SHARED_STORAGE_PATH = process.env.SHARED_STORAGE_PATH || '/app/images';
const UPLOAD_DIR = path.join(SHARED_STORAGE_PATH, 'original');

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure the directory exists (Docker volume handles this, but good practice for local)
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueFilename);
    }
});

// Multer upload middleware instance
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit (adjust as needed)
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
        }
    }
}).single('image'); // 'image' is the field name expected from the frontend form data

// Controller function for handling image uploads
const uploadImage = (req, res) => {
    console.log("okkk");
    
    upload(req, res, async (err) => { 
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err.message);
            return res.status(400).json({ message: `File upload error: ${err.message}` });
        } else if (err) {
            console.error('Unknown upload error:', err.message);
            return res.status(500).json({ message: `Upload failed: ${err.message}` });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided.' });
        }

        const { originalname, mimetype, size, filename } = req.file

        try {
            const newImage = new Image({
                originalFilename: originalname,
                uniqueFilename: filename,
                mimeType: mimetype,
                size: size,
                status: 'pending'
            });

            await newImage.save();
            console.log(`Image saved to DB: ${newImage._id}`);

            // Publish message to RabbitMQ for processing
            const channel = getChannel();
            const message = JSON.stringify({
                imageId: newImage._id.toString(), // Convert ObjectId to string
                uniqueFilename: newImage.uniqueFilename,
                originalPath: path.join(UPLOAD_DIR, newImage.uniqueFilename)
            });

            channel.sendToQueue('image_processing_queue', Buffer.from(message), {
                persistent: true // Message will survive broker restarts
            });
            console.log(`Message sent to RabbitMQ for image ID: ${newImage._id}`);

            res.status(202).json({
                message: 'Image uploaded successfully and queued for processing.',
                id: newImage._id,
                status: newImage.status,
                originalFilename: newImage.originalFilename
            });

        } catch (dbError) {
            console.error('Database or RabbitMQ publishing error:', dbError.message);
            // Optionally, delete the uploaded file if DB save fails
            // fs.unlinkSync(req.file.path);
            console.error(`Error saving image metadata: ${dbError.message}`);
            res.status(500).json({ message: 'Failed to save image metadata or queue for processing.' });
        }
    });
};   

// services/image-upload-service/src/controllers/imageUploadController.js
// ... inside getImageStatusById function
const getImageStatusById = async (req, res) => {
    try {
        const { id } = req.params;
        const image = await Image.findById(id);

        if (!image) {
            return res.status(404).json({ message: 'Image not found' });
        }

        // Construct the relative paths based on your volume structure and stored filenames
        // Remember: /app/images/original/ and /app/images/processed/
        const originalFilePath = path.join('original', image.uniqueFilename); // e.g., "original/some-uuid.jpg"
        const processedFilePath = image.processedFilename ? path.join('processed', image.processedFilename) : null; // e.g., "processed/some-uuid.jpg"

        res.status(200).json({
            id: image._id,
            status: image.status,
            originalPath: originalFilePath, // <<< Use the constructed path
            processedPath: processedFilePath // <<< Use the constructed path from processedFilename
        });
    } catch (error) {
        console.error('Error fetching image status:', error);
        res.status(500).json({ message: 'Error fetching image status', error: error.message });
    }
};

// Health check endpoint (for docker-compose healthcheck)
const getHealth = (req, res) => {
    // if (getChannel() && Image.db.readyState === 1) { // 1 means connected
    if (getChannel()) { 
        console.log('Image Upload Service is healthy');
        return res.status(200).json({ status: 'Image Upload Service is healthy', db: 'connected', rabbitmq: 'connected' });
    }
    
    res.status(503).json({ status: 'Image Upload Service is unhealthy' });
};

module.exports = {
    uploadImage,
    getHealth,
    getImageStatusById
};