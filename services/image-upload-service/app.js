// services/image-upload-service/app.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const imageRoutes = require("./src/routes/imageRoutes");
const { getHealth } = require("./src/controllers/imageUploadController");
const path = require('path');
const fs = require('fs');
require("dotenv").config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- START OF NEW CODE BLOCK (for directory creation) ---
const SHARED_STORAGE_PATH = process.env.SHARED_STORAGE_PATH || '/app/images';
const ORIGINAL_IMAGES_PATH = path.join(SHARED_STORAGE_PATH, 'original');
const PROCESSED_IMAGES_PATH = path.join(SHARED_STORAGE_PATH, 'processed');

// Function to ensure directories exist
const ensureDirectoriesExist = () => {
    try {
        if (!fs.existsSync(SHARED_STORAGE_PATH)) {
            fs.mkdirSync(SHARED_STORAGE_PATH, { recursive: true });
            console.log(`Created shared storage path: ${SHARED_STORAGE_PATH}`);
        }
        if (!fs.existsSync(ORIGINAL_IMAGES_PATH)) {
            fs.mkdirSync(ORIGINAL_IMAGES_PATH, { recursive: true });
            console.log(`Created original images path: ${ORIGINAL_IMAGES_PATH}`);
        }
        if (!fs.existsSync(PROCESSED_IMAGES_PATH)) {
            fs.mkdirSync(PROCESSED_IMAGES_PATH, { recursive: true });
            console.log(`Created processed images path: ${PROCESSED_IMAGES_PATH}`);
        }
    } catch (error) {
        console.error('Error ensuring directories exist:', error);
        process.exit(1);
    }
};

ensureDirectoriesExist();
// --- END OF NEW CODE BLOCK ---

app.use('/images', express.static(PROCESSED_IMAGES_PATH));
app.use("/api/images", imageRoutes);
app.get("/health", getHealth);

app.use((req, res, next) => {
    res.status(404).json({ message: "API endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Global error handler caught an error:", err.stack);
    res.status(err.status || 500).json({
        message: err.message || "An unexpected error occurred.",
        error: process.env.NODE_ENV === "development" ? err.stack : {},
    });
});

module.exports = app;