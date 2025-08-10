// frontend/src/App.js (or App.tsx)
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast"; // Import toast and Toaster
import "./App.css"; // Import your custom CSS file

// If you plan to use WebSockets for real-time notifications:
import io from 'socket.io-client';

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null); // For image preview
    const [uploading, setUploading] = useState(false);
    const [imageId, setImageId] = useState(null); // To track the image being processed
    const [imageStatus, setImageStatus] = useState({}); // To store status by imageId
    const [processedImageUrl, setProcessedImageUrl] = useState(null); // To display the processed image

     // Optional: WebSocket setup for real-time notifications (highly recommended for production)
    useEffect(() => {
      const socket = io('http://localhost:5002'); // Your notification service URL (if it supports WebSockets)

      socket.on('connect', () => {
        console.log('Connected to notification service via WebSocket'); 
      });

      socket.on('imageProcessed', (data) => {
        console.log('Real-time notification:', data);
        setImageStatus(prevStatus => ({ ...prevStatus, [data.imageId]: data.status }));

        let notificationMessage = `Image ${data.imageId} processing: ${data.status}`;
        if (data.status === 'completed') {
          toast.success(notificationMessage, { duration: 5000 });
          // Assuming your upload service serves static processed images or you have an Nginx gateway
          // You might need an API endpoint to retrieve the public URL of the processed image.
          // For now, assuming direct access if path is available
          setProcessedImageUrl(`http://localhost:5000/images/${data.processedPath.split('/').pop()}`);
        } else if (data.status === 'failed') {
          toast.error(`${notificationMessage}. Error: ${data.error}`, { duration: 8000 });
        } else {
          toast(notificationMessage); // Default toast for other statuses like 'processing'
        }
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from notification service');
      });

      return () => {
        socket.disconnect();
      };
    }, []); // Empty dependency array means this runs once on mount

    // Handle file selection and create preview URL
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            setImagePreviewUrl(URL.createObjectURL(file)); // Create URL for preview
            setProcessedImageUrl(null); // Clear previous processed image
            setImageId(null);
            setImageStatus({});
            toast.dismiss(); // Dismiss any existing toasts
        } else {
            setSelectedFile(null);
            setImagePreviewUrl(null);
        }
    };



    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error("Please select a file first.");
            return;
        }

        setUploading(true);
        const uploadToastId = toast.loading("Uploading image...");

        const formData = new FormData();
        formData.append("image", selectedFile); // 'image' should match the field name your backend expects

        try {
            const response = await axios.post("http://localhost:5000/api/images/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const { id, status, originalPath } = response.data; // Assuming your backend returns these
            setImageId(id);
            setImageStatus((prevStatus) => ({ ...prevStatus, [id]: status }));

            toast.success(`Image "${selectedFile.name}" uploaded! ID: ${id}. Processing will begin shortly.`, {
                id: uploadToastId,
                duration: 5000,
            });

            console.log("Upload response:", response.data);

            // Polling for status update (less efficient than WebSockets, but simpler initially)
            // In a real app, you'd use WebSockets for real-time status updates from notification service.
            const pollStatus = setInterval(async () => {
                try {
                    // Assuming your upload-service has an endpoint to get image status by ID
                    const statusResponse = await axios.get(`http://localhost:5000/api/images/${id}`);
                    const currentStatus = statusResponse.data.status;
                    const processedPath = statusResponse.data.processedPath;
                    const error = statusResponse.data.error;

                    setImageStatus((prevStatus) => ({ ...prevStatus, [id]: currentStatus }));

                    if (currentStatus === "completed") {
                        toast.success(`Processing complete for ID: ${id}!`, { duration: 5000 });
                        setProcessedImageUrl(`http://localhost:5000/images/${processedPath.split("/").pop()}`); // Adjust path
                        clearInterval(pollStatus);
                    } else if (currentStatus === "FAILED") {
                        toast.error(`Processing failed for ID: ${id}. Error: ${error || "Unknown error."}`, {
                            duration: 8000,
                        });
                        clearInterval(pollStatus);
                    } else {
                        // Keep the loading toast active if still processing
                        toast.loading(`Image ID: ${id}, Status: ${currentStatus}. Still processing...`, {
                            id: uploadToastId,
                        });
                    }
                } catch (pollError) {
                    console.error("Polling error:", pollError);
                    toast.error(`Error polling status for ID: ${id}.`, { id: uploadToastId });
                    clearInterval(pollStatus);
                }
            }, 3000); // Poll every 3 seconds
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error(`Upload failed: ${error.response?.data?.message || error.message}`, { id: uploadToastId });
        } finally {
            setUploading(false);
        }
    };

    // Determine status text class
    const getStatusClass = (status) => {
        switch (status) {
            case "PENDING":
                return "status-text-pending";
            case "PROCESSED":
                return "status-text-processed";
            case "FAILED":
                return "status-text-failed";
            default:
                return "";
        }
    };

    return (
        <div className="app-container">
            <Toaster position="top-right" reverseOrder={false} /> {/* Toaster component for notifications */}
            <div className="card">
                <h1 className="app-header">
                    <span className="app-header-highlight">Picflow</span> Image Processor
                </h1>

                {/* Image Upload Section */}
                <div className="upload-box">
                    <label htmlFor="file-upload" className={`upload-input-label ${selectedFile ? "has-file" : ""}`}>
                        <input
                            id="file-upload"
                            type="file"
                            onChange={handleFileChange}
                            disabled={uploading}
                            accept="image/*"
                        />
                        {imagePreviewUrl ? (
                            <img src={imagePreviewUrl} alt="Preview" className="upload-preview" />
                        ) : (
                            <>
                                <svg
                                    className="upload-icon"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a3 3 0 013 3v10a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
                                    ></path>
                                </svg>
                                <p className="upload-text">Drag & drop an image or click to select</p>
                                {selectedFile && <p className="text-gray-500 text-sm mt-2">{selectedFile.name}</p>}
                            </>
                        )}
                    </label>
                    <button onClick={handleUpload} disabled={uploading || !selectedFile} className="upload-button">
                        {uploading ? "Uploading..." : "Upload Image"}
                    </button>
                </div>

                {/* Status Display Section */}
                {imageId && (
                    <div className="status-box">
                        <h3>Image Processing Status:</h3>
                        <p>
                            ID: <strong>{imageId}</strong>
                        </p>
                        <p>
                            Current Status:{" "}
                            <span className={getStatusClass(imageStatus[imageId])}>
                                <strong>{imageStatus[imageId] || "Unknown"}</strong>
                            </span>
                        </p>
                    </div>
                )}

                {/* Processed Image Display Section */}
                {processedImageUrl && (
                    <div className="processed-image-display">
                        <h3>Processed Image:</h3>
                        <img src={processedImageUrl} alt="Processed" className="processed-image" />
                    </div>
                )}

                <p className="footer-note">
                    For real-time status updates, consider integrating WebSockets with your Notification Service.
                </p>
            </div>
        </div>
    );
}

export default App;
