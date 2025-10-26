// Socket.IO setup for real-time word emission
const { Server } = require("socket.io");
const { tracer, logger } = require("./otel"); // OTel tracer and logger

// List of words to emit
const WORDS = [
  "apple",
  "banana",
  "cherry",
  "dragon",
  "elephant",
  "falcon",
  "giraffe",
  "hippo",
  "iguana",
  "jaguar",
  "kiwi",
  "lemon",
  "mango",
  "nectarine",
  "orange",
  "papaya",
  "quince",
  "raspberry",
  "strawberry",
  "tangerine",
];

function setupSocket(server) {
  // Create Socket.IO server with CORS enabled
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    // Emit a random word every 5 seconds to connected client
    const interval = setInterval(() => {
      // Create OTel span for word emission
      const wordSpan = tracer.startSpan("emit.newWord");
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      // Emit OTel log for word emission
      logger.emit({
        body: `Emitting new word to socket: ${word}`,
        severityNumber: 5,
        severityText: "INFO",
        attributes: { event: "socket.emit", word },
      });
      socket.emit("newWord", word); // Send word to client
      wordSpan.end();
    }, 5000);

    // Clean up on disconnect
    socket.on("disconnect", () => {
      clearInterval(interval);
      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = setupSocket;
