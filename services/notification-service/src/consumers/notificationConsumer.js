// services/notification-service/src/consumers/notificationConsumer.js
const { getChannel } = require("../config/rabbitmq");

const NOTIFICATION_QUEUE = "image_processing_notifications"; // Name of the queue to listen to

const startConsumingNotifications = async () => {
    try {
        const channel = getChannel();

        // Assert the queue to ensure it exists (durable means it survives RabbitMQ restarts)
        await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
        console.log(`Waiting for messages in ${NOTIFICATION_QUEUE}. To exit press CTRL+C`);

        // Start consuming messages
        channel.consume(
            NOTIFICATION_QUEUE,
            (msg) => {
                if (msg !== null) {
                    const messageContent = JSON.parse(msg.content.toString());
                    console.log(" [x] Received notification:", messageContent);

                    // --- IMPORTANT: Add your notification handling logic here ---
                    // e.g., send push notification, email, update database, etc.
                    if (messageContent.status === "completed") {
                        console.log(`Image ${messageContent.imageId} processing completed! User: ${messageContent.userId}`);
                        // Example: You might update a frontend via WebSockets or push to another service
                    } else if (messageContent.status === "failed") {
                        console.error(`Image ${messageContent.imageId} processing failed! Error: ${messageContent.error}`);
                    }
                    // --- End of notification handling logic ---

                    // Acknowledge the message to remove it from the queue
                    channel.ack(msg);
                }
            },
            {
                noAck: false, // We will manually acknowledge messages
            }
        );
    } catch (error) {
        console.error("Failed to start consuming notifications:", error.message);
        throw error; // Re-throw to be caught by startServer in app.js
    }
};

module.exports = {
    startConsumingNotifications,
};
