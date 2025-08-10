// services/image-upload-service/src/config/db.js
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in environment variables.');
        }
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        // Exit process with failure
        process.exit(1);
    }
};

module.exports = connectDB;        