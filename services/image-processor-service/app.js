// services/image-processor-service/app.js
const express = require("express");
const connectDB = require("./src/config/db");
const { connectRabbitMQ } = require("./src/config/rabbitmq");
const { startConsuming } = require("./src/consumers/imageProcessingConsumer");
const Image = require("./src/models/Image"); // Required for health check if you check db.readyState
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001; // Use a different port than upload service (e.g., 5000)

// Basic health check endpoint
app.get("/health", (req, res) => {
    // A more robust check would involve trying to connect to DB/RabbitMQ
    let dbConnected = false;
    let rabbitmqConnected = false;

    // Check MongoDB connection state (0 = disconnected, 1 = connected)
    if (Image.db.readyState === 1) {
        dbConnected = true;
    }

    // Check RabbitMQ channel
    try {
        const rabbitmqChannel = require("./src/config/rabbitmq").getChannel();
        if (rabbitmqChannel) {
            // Just checking if channel object exists and isn't null
            rabbitmqConnected = true;
        }
    } catch (e) {
        // If getChannel throws, RabbitMQ is not connected
        rabbitmqConnected = false;
    }

    if (dbConnected && rabbitmqConnected) {
        return res
            .status(200)
            .json({ status: "Image Processor Service is healthy", db: "connected", rabbitmq: "connected" });
    } else {
        const errors = [];
        if (!dbConnected) errors.push("MongoDB disconnected");
        if (!rabbitmqConnected) errors.push("RabbitMQ disconnected");
        res.status(503).json({ status: "Image Processor Service is unhealthy", errors: errors });
    }
});

const startServer = async () => {
    try {
        await connectDB();
        await connectRabbitMQ();

        // Start consuming RabbitMQ messages after connections are established
        await startConsuming();

        // Start the server (primarily for health checks)
        app.listen(PORT, () => {
            console.log(`Image Processor Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start Image Processor Service:", error.message);
        process.exit(1); // Exit with failure if any startup step fails
    }
};

startServer();
