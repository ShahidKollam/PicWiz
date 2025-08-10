// services/image-processor-service/src/consumers/imageProcessingConsumer.js
const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises");
const { getChannel } = require("../config/rabbitmq");
const Image = require("../models/Image");
require("dotenv").config();

const SHARED_STORAGE_PATH = process.env.SHARED_STORAGE_PATH || "/app/images";
const ORIGINAL_DIR = path.join(SHARED_STORAGE_PATH, "original");
const PROCESSED_DIR = path.join(SHARED_STORAGE_PATH, "processed");

// Path to your watermark image
const WATERMARK_PATH = path.join(__dirname, "../assets/watermark.jpg"); // Assuming you have an 'assets' folder

const ensureProcessedDir = async () => {
    try {
        await fs.mkdir(PROCESSED_DIR, { recursive: true });
        console.log(`Ensured processed directory exists: ${PROCESSED_DIR}`);
    } catch (error) {
        console.error(`Failed to ensure processed directory: ${error.message}`);
        process.exit(1);
    }
};

const startConsuming = async () => {
    await ensureProcessedDir();

    const channel = getChannel();
    const queue = "image_processing_queue";
    channel.prefetch(1);

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

                await Image.findByIdAndUpdate(imageId, {
                    status: "processing",
                    $push: { processingLog: { message: "Image processing started.", level: "info" } },
                });
                console.log(`Image ${imageId} status updated to 'processing'.`);

                try {
                    // --- THE IMAGE PROCESSING CHAIN ---
                    // ... inside the consumer's try block ...

                    // --- THE IMAGE PROCESSING CHAIN ---
                    await sharp(originalPath)
                        .resize(800) // First, resize the main image
                        .composite([
                            {
                                // Create a sharp instance for the watermark and resize it
                                input: await sharp(WATERMARK_PATH).resize(150).toBuffer(), // Resize the watermark to a max width of 150px and get it as a buffer
                                gravity: "southeast", // Position the resized watermark
                            },
                        ])
                        .webp({ quality: 80 })
                        .toFile(processedPath);

                    console.log(`Image ${uniqueFilename} processed (resized, watermarked) and saved to ${processedPath}`);

                    await Image.findByIdAndUpdate(imageId, {
                        status: "completed",
                        processedFilename: processedFilename,
                        $push: { processingLog: { message: "Image processing completed successfully.", level: "info" } },
                    });
                    console.log(`Image ${imageId} status updated to 'completed'.`);

                    channel.ack(msg);
                    console.log(`[x] Message acknowledged for image ID: ${imageId}`);

                    // Send notification to the notification service
                    const notificationChannel = getChannel();
                    notificationChannel.sendToQueue(
                        "image_processing_notifications",
                        Buffer.from(
                            JSON.stringify({
                                imageId: imageId,
                                status: "completed",
                                message: "Your image has been processed!",
                                processedUrl: `/images/processed/${processedFilename}`,
                            })
                        ),
                        { persistent: true }
                    );
                    console.log(`Notification sent for image ID: ${imageId}`);
                } catch (processingError) {
                    console.error(`Error processing image ${imageId}:`, processingError.message);
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
                    channel.reject(msg, false);
                }
            } catch (error) {
                console.error("Error in image processing consumer:", error.message);
                channel.reject(msg, false);
            }
        },
        { noAck: false }
    );
};

module.exports = { startConsuming };
