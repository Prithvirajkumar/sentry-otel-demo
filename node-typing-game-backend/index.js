// Entry point for backend server
require("dotenv").config(); // Load environment variables
const http = require("http");
const app = require("./app"); // Express app
const setupSocket = require("./socket"); // Socket.IO setup

const PORT = process.env.PORT || 3001; // Server port
const server = http.createServer(app); // Create HTTP server
setupSocket(server); // Attach Socket.IO

// Start server and log startup
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
