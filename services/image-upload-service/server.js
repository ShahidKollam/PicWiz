// services/image-upload-service/server.js
const app = require("./app");
const connectDB = require("./src/config/db");
const { connectRabbitMQ } = require("./src/config/rabbitmq");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();
        await connectRabbitMQ();
        app.listen(PORT, () => {
            console.log(`Image Upload Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start Image Upload Service:', error.message);
        process.exit(1);
    }
};

startServer();