// /words endpoint for serving word list with OTel instrumentation
const express = require("express");
const router = express.Router();
const { tracer, logger } = require("../otel"); // OTel tracer and logger
const { context, propagation } = require("@opentelemetry/api"); // OTel context APIs

// List of words to serve
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

router.get("/", (req, res) => {
  // Extract OTel context from incoming headers for distributed tracing
  const parentCtx = propagation.extract(context.active(), req.headers);
  if (!tracer || typeof tracer.startSpan !== "function") {
    // Defensive: create a dummy traceId if tracing is not initialized
    const traceId = "uninitialized-tracer";
    res
      .status(500)
      .json({ error: "Tracing not initialized", trace_id: traceId });
    return;
  }
  let span;
  try {
    // Create OTel span for GET /words
    span = tracer.startSpan("GET /words", undefined, parentCtx);
    // Emit OTel log for serving words
    logger.emit({
      body: `Serving words list to client`,
      severityNumber: 5,
      severityText: "INFO",
      attributes: { event: "words.serve", count: WORDS.length },
    });
    res.json({ words: WORDS }); // Send word list to client
    span.end();
  } catch (err) {
    // Error handling with trace ID
    const traceId =
      span && span.spanContext && span.spanContext().traceId
        ? span.spanContext().traceId
        : "unknown";
    res.status(500).json({ error: err.message, trace_id: traceId });
    if (span) span.end();
  }
});

module.exports = router;
