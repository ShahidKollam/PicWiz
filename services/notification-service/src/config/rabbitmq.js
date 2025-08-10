// services/notification-service/src/config/rabbitmq.js
const amqp = require('amqplib');
require('dotenv').config();

let channel = null;
let connection = null;

const connectRabbitMQ = async () => {
    try {
        const rabbitmqUri = process.env.RABBITMQ_URI;
        if (!rabbitmqUri) {
            throw new Error('RABBITMQ_URI is not defined in environment variables.');
        }
        connection = await amqp.connect(rabbitmqUri);
        channel = await connection.createChannel();
        console.log('RabbitMQ connected successfully for Notification Service');

        // Assert the queue from which this service will consume notifications
        await channel.assertQueue('notification_queue', { durable: true });
        console.log('Queue "notification_queue" asserted for consumption.');

        // Graceful shutdown
        connection.on('close', () => {
            console.log('RabbitMQ connection closed for Notification Service.');
        });
        connection.on('error', (err) => {
            console.error('RabbitMQ connection error for Notification Service:', err.message);
            // Optionally, try to reconnect here or exit
            process.exit(1);
        });

        // Handle process exit gracefully
        process.on('SIGINT', async () => {
            if (channel) {
                await channel.close();
                console.log('RabbitMQ channel closed for Notification Service.');
            }
            if (connection) {
                await connection.close();
                console.log('RabbitMQ connection closed gracefully for Notification Service on SIGINT.');
            }
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            if (channel) {
                await channel.close();
                console.log('RabbitMQ channel closed for Notification Service.');
            }
            if (connection) {
                await connection.close();
                console.log('RabbitMQ connection closed gracefully for Notification Service on SIGTERM.');
            }
            process.exit(0);
        });

    } catch (error) {
        console.error('RabbitMQ connection error for Notification Service:', error.message);
        process.exit(1);
    }
};

const getChannel = () => {
    if (!channel) {
        throw new Error('RabbitMQ channel not established. Call connectRabbitMQ first.');
    }
    return channel;
};

module.exports = { connectRabbitMQ, getChannel };