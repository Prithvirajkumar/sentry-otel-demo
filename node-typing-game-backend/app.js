// Express app setup for backend API
const express = require("express");
const wordsRouter = require("./routes/words"); // /words endpoint
const checkRouter = require("./routes/check"); // /check endpoint

const app = express();
app.use(express.json()); // Parse JSON bodies
app.use("/words", wordsRouter); // Mount words route
app.use("/check", checkRouter); // Mount check route

module.exports = app;
