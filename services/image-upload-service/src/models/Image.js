// services/image-upload-service/src/models/Image.js
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    originalFilename: {
        type: String,
        required: true
    },
    uniqueFilename: { 
        type: String,
        required: true,
        unique: true
    },
    mimeType: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true 
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    processedFilename: { // To store the name of the processed file, if any
        type: String,
        required: false
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    processingLog: [ // To store any messages/errors during processing
        {
            timestamp: { type: Date, default: Date.now },
            message: String,
            level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' }
        }
    ]
});

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;