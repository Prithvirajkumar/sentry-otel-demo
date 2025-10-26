// Express route for spelling check with OTel and Sentry instrumentation
const express = require("express");
const router = express.Router();
// Import OTel tracer and logger
const { tracer, logger } = require("../otel");
// Import initialized Sentry instance
const Sentry = require("../sentry");
// OTel APIs for context propagation and span management
const { propagation, context, trace } = require("@opentelemetry/api");
const configureScope = Sentry.configureScope;

/**
 * Reports an exception to Sentry, attaching OTel trace context from the active span.
 * Uses Sentry.withScope to avoid leaking context between requests.
 */
async function captureExceptionWithOtel(err, label = "") {
  Sentry.withScope((scope) => {
    // Get the current OTel span from context
    const otelSpan = trace.getSpan(context.active());
    if (otelSpan) {
      const sc = otelSpan.spanContext();
      const traceId =
        sc.traceId.length === 32 ? sc.traceId : sc.traceId.padStart(32, "0");
      // Attach OTel trace context to Sentry event
      if (typeof scope.setPropagationContext === "function") {
        scope.setPropagationContext({
          traceId,
          parentSpanId: sc.spanId,
        });
      }
      console.log(
        `[SENTRY][${label}] captureExceptionWithOtel: traceId=${traceId}, spanId=${sc.spanId}`
      );
    } else {
      console.log(
        `[SENTRY][${label}] captureExceptionWithOtel: No active OTel span`
      );
    }
    Sentry.captureException(err);
  });
  // Ensure Sentry event is flushed before continuing
  if (typeof Sentry.flush === "function") {
    await Sentry.flush(2000);
    console.log(`[SENTRY][${label}] Sentry.flush(2000) completed.`);
  }
}

/**
 * POST /check
 * Receives a word and user input, checks spelling, and reports errors with OTel/Sentry instrumentation.
 * - Extracts OTel context from incoming headers for distributed tracing
 * - Creates OTel spans for request and spelling check
 * - Reports exceptions to Sentry with OTel trace context
 */
router.post("/", async (req, res) => {
  const { word, input } = req.body;
  // Extract parent context from incoming request headers
  // Extract parent OTel context from incoming HTTP headers
  const parentContext = propagation.extract(context.active(), req.headers);
  console.log(
    "[OTEL][BACKEND] Extracted parentContext from headers:",
    req.headers["traceparent"],
    parentContext
  );
  // Make the extracted context active for all spans in this request
  await context.with(parentContext, async () => {
    // Log the active span before starting a new one
    const activeSpanBefore = trace.getSpan(context.active());
    console.log(
      "[OTEL][BACKEND] Active span before startSpan:",
      activeSpanBefore &&
        activeSpanBefore.spanContext &&
        activeSpanBefore.spanContext()
    );
    // Create a new OTel span for the spelling check
    const span = tracer.startSpan("check.spelling", undefined, parentContext);
    console.log(
      "[OTEL][BACKEND] Started span:",
      span && span.spanContext && span.spanContext()
    );
    let result = "wrong";
    try {
      if (
        typeof word === "string" &&
        typeof input === "string" &&
        word === input.trim()
      ) {
        result = "correct";
      }
      // Simulate backend root cause if word is 'dragon' and input is 'error'
      // Simulate backend error for demo purposes
      if (word === "dragon" && input === "error") {
        const spanContext = span.spanContext();
        const otelTraceId = spanContext && spanContext.traceId;
        console.log(
          "Simulated backend exception sent to Sentry with trace ID:",
          otelTraceId
        );
        // Throw error to be caught and reported to Sentry
        throw new Error("Simulated backend root cause");
      }
      // Emit OTel log and set span attributes for trace richness
      logger.emit({
        body: `Spelling check for word: ${word}, input: ${input}, result: ${result}`,
        severityNumber: 5,
        severityText: result === "correct" ? "INFO" : "ERROR",
        attributes: { event: "spelling.check", word, input, result },
      });
      span.setAttribute("word", word);
      span.setAttribute("input", input);
      span.setAttribute("result", result);
      span.end();
      // Return result to frontend
      res.json({ result });
    } catch (err) {
      // Emit OTel log for backend error
      logger.emit({
        body: `Backend error: ${err}`,
        severityNumber: 5,
        severityText: "ERROR",
        attributes: { event: "backend.error", word, input },
      });
      // Report exception to Sentry with OTel trace context
      await captureExceptionWithOtel(err, "backend-catch");
      const spanContext = span.spanContext();
      const otelTraceId = spanContext && spanContext.traceId;
      span.end();
      // Pass trace ID to frontend in error response for correlation
      res.status(500).json({ error: err.message, trace_id: otelTraceId });
    }
  });
});

module.exports = router;
