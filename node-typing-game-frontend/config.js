// Game and backend configuration
module.exports = {
  NUM_WORDS: 10, // Number of words per game session
  BACKEND_URL: process.env.BACKEND_URL || "http://localhost:3001", // Backend API URL
};
