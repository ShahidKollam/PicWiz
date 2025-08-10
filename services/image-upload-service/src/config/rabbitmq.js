// services/image-upload-service/src/config/rabbitmq.js
const amqp = require("amqplib");
require("dotenv").config();

let channel = null;

const connectRabbitMQ = async () => {
    try {
        const rabbitmqUri = process.env.RABBITMQ_URI;
        if (!rabbitmqUri) {
            throw new Error("RABBITMQ_URI is not defined in environment variables.");
        }
        const connection = await amqp.connect(rabbitmqUri);
        channel = await connection.createChannel();
        console.log("RabbitMQ connected successfully");

        // Ensure the queue exists where the image processor will listen
        await channel.assertQueue("image_processing_queue", { durable: true });
        console.log('Queue "image_processing_queue" asserted.');

        // Graceful shutdown
        process.on("beforeExit", () => {
            if (connection) {
                console.log("Closing RabbitMQ connection...");
                connection.close();
            }
        });
    } catch (error) {
        console.error("RabbitMQ connection error:", error.message);
        process.exit(1);
    }
};

const getChannel = () => {
    if (!channel) {
        throw new Error("RabbitMQ channel not established. Call connectRabbitMQ first.");
    }
    return channel;
};

module.exports = { connectRabbitMQ, getChannel };
