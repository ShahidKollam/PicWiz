// services/notification-service/app.js
const express = require('express');
const { connectRabbitMQ, getChannel } = require('./src/config/rabbitmq');
const { startConsumingNotifications } = require('./src/consumers/notificationConsumer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001; // This is the CONTAINER's internal port

// Basic health check endpoint
app.get('/health', (req, res) => {
    let rabbitmqConnected = false;

    // Check RabbitMQ channel
    try {
        const rabbitmqChannel = getChannel();
        if (rabbitmqChannel) {
            rabbitmqConnected = true;
        }
    } catch (e) {
        // If getChannel throws, RabbitMQ is not connected
        rabbitmqConnected = false;
    }

    if (rabbitmqConnected) {
        return res.status(200).json({ status: 'Notification Service is healthy', rabbitmq: 'connected' });
    } else {
        res.status(503).json({ status: 'Notification Service is unhealthy', errors: ['RabbitMQ disconnected'] });
    }
});

const startServer = async () => {
    try {
        await connectRabbitMQ();

        // Start consuming RabbitMQ messages after connections are established
        await startConsumingNotifications();

        // Start the Express server (primarily for health checks)
        app.listen(PORT, () => {
            console.log(`Notification Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start Notification Service:', error.message);
        process.exit(1); // Exit with failure if any startup step fails
    }
};

startServer();