import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Add this server configuration
    server: {
        host: true, // This tells Vite to listen on 0.0.0.0 (all network interfaces)
        // You can also explicitly set the port here if you want Vite to always use 3000 inside the container:
        // port: 3000
        // If you set port: 3000 here, remember to update docker-compose.yml port mapping to '3000:3000'
    },
});
