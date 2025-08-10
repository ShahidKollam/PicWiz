// services/image-processor-service/src/consumers/imageProcessingConsumer.js
const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises"); // For async file operations
const { getChannel } = require("../config/rabbitmq");
const Image = require("../models/Image");
require("dotenv").config();

const SHARED_STORAGE_PATH = process.env.SHARED_STORAGE_PATH || "/app/images";
const ORIGINAL_DIR = path.join(SHARED_STORAGE_PATH, "original");
const PROCESSED_DIR = path.join(SHARED_STORAGE_PATH, "processed");

// Ensure processed directory exists
const ensureProcessedDir = async () => {
    try {
        await fs.mkdir(PROCESSED_DIR, { recursive: true });
        console.log(`Ensured processed directory exists: ${PROCESSED_DIR}`);
    } catch (error) {
        console.error(`Failed to ensure processed directory: ${error.message}`);
        process.exit(1); // Critical failure
    }
};

const startConsuming = async () => {
    await ensureProcessedDir(); // Make sure directory is ready

    const channel = getChannel();
    const queue = "image_processing_queue";

    // Set prefetch to limit the number of unacknowledged messages
    channel.prefetch(1); // Process one message at a time

    console.log(`[*] Waiting for messages in ${queue}. To exit press CTRL+C`);

    channel.consume(
        queue,
        async (msg) => {
            if (msg === null) {
                console.log("Consumer cancelled by RabbitMQ. Exiting.");
                return;
            }

            let messageContent;
            let imageId;
            let uniqueFilename;

            try {
                messageContent = JSON.parse(msg.content.toString());
                imageId = messageContent.imageId;
                uniqueFilename = messageContent.uniqueFilename;
                const originalPath = path.join(ORIGINAL_DIR, uniqueFilename);
                const processedFilename = `processed-${uniqueFilename}`;
                const processedPath = path.join(PROCESSED_DIR, processedFilename);

                console.log(`[x] Received message for image ID: ${imageId}, Filename: ${uniqueFilename}`);

                // 1. Update image status to 'processing' in DB
                const imageDoc = await Image.findByIdAndUpdate(
                    imageId,
                    {
                        status: "processing",
                        $push: { processingLog: { message: "Image processing started.", level: "info" } },
                    },
                    { new: true }
                ); // Return the updated document

                if (!imageDoc) {
                    console.error(`Image with ID ${imageId} not found in DB. Acknowledging message.`);
                    channel.ack(msg); // Acknowledge to remove from queue
                    return; // Nothing to process if image not found
                }
                console.log(`Image ${imageId} status updated to 'processing'.`);

                // 2. Perform image processing using Sharp
                try {
                    // Example: Resize to 800px width, auto height, and convert to webp (modern format)
                    await sharp(originalPath).resize(800).webp({ quality: 80 }).toFile(processedPath);

                    console.log(`Image ${uniqueFilename} processed and saved to ${processedPath}`);

                    // 3. Update image status to 'completed' in DB
                    await Image.findByIdAndUpdate(imageId, {
                        status: "completed",
                        processedFilename: processedFilename,
                        $push: { processingLog: { message: "Image processing completed successfully.", level: "info" } },
                    });
                    console.log(`Image ${imageId} status updated to 'completed'.`);

                    // Acknowledge the message only if processing and DB update are successful
                    channel.ack(msg);
                    console.log(`[x] Message acknowledged for image ID: ${imageId}`);

                    // Optionally: Publish a message to a 'notification_queue' here
                    const notificationChannel = getChannel();
                    notificationChannel.sendToQueue('notification_queue', Buffer.from(JSON.stringify({
                        imageId: imageId,
                        status: 'completed',
                        message: 'Your image has been processed!',
                        processedUrl: `/images/processed/${processedFilename}` // Example URL
                    })), { persistent: true });
                    console.log(`Notification sent for image ID: ${imageId}`);
                    
                } catch (processingError) {
                    console.error(`Error processing image ${imageId}:`, processingError.message);
                    // Update status to failed
                    await Image.findByIdAndUpdate(imageId, {
                        status: "failed",
                        $push: {
                            processingLog: {
                                message: `Image processing failed: ${processingError.message}`,
                                level: "error",
                            },
                        },
                    });
                    console.log(`Image ${imageId} status updated to 'failed' due to processing error.`);
                    // Reject message, do not re-queue (processing errors are usually persistent)
                    channel.reject(msg, false);
                }
            } catch (error) {
                // Catches errors during JSON parsing or initial DB find/update
                console.error("Error in image processing consumer:", error.message);
                // If message parsing or initial DB operations fail, reject.
                // Consider if you want to re-queue (true) or discard (false) based on error type
                // For now, discarding malformed messages or initial DB errors that prevent processing.
                channel.reject(msg, false);
            }
        },
        {
            noAck: false, // We will manually acknowledge messages
        }
    );
};

module.exports = { startConsuming };
