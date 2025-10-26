// API calls and OTel instrumentation for frontend
const { trace, context, propagation } = require("@opentelemetry/api");
const axios = require("axios");
const { tracer } = require("./otel");
const Sentry = require("@sentry/node");

const BASE_URL = process.env.BACKEND_URL || "http://localhost:3001"; // Backend API URL

/**
 * Reports an exception to Sentry, attaching OTel trace context from the active span.
 */
function captureExceptionWithOtel(err) {
  Sentry.withScope((scope) => {
    const otelSpan = trace.getSpan(context.active());
    if (otelSpan) {
      const sc = otelSpan.spanContext();
      const traceId =
        sc.traceId.length === 32 ? sc.traceId : sc.traceId.padStart(32, "0");
      if (typeof scope.setPropagationContext === "function") {
        scope.setPropagationContext({
          traceId,
          parentSpanId: sc.spanId,
        });
      }
    }
    Sentry.captureException(err);
  });
}

/**
 * Fetches word list from backend, creates OTel span for distributed trace.
 */
async function fetchWords(parentSpan) {
  const span = tracer.startSpan("fetch.words", { parent: parentSpan });
  const headers = {};
  propagation.inject(context.active(), headers); // Inject OTel context for trace propagation
  try {
    const res = await axios.get(`${BASE_URL}/words`, { headers });
    span.setAttribute("words.count", res.data.words.length);
    span.end();
    return res.data.words;
  } catch (err) {
    span.recordException(err);
    span.end();
    throw err;
  }
}

/**
 * Checks spelling on backend, creates OTel span and propagates context.
 */
async function checkSpelling(word, input, parentSpan) {
  const span = tracer.startSpan("spelling.check", { parent: parentSpan });
  // Make the span active for propagation
  return await context.with(trace.setSpan(context.active(), span), async () => {
    const headers = {};
    propagation.inject(context.active(), headers); // Inject OTel context for trace propagation
    try {
      const res = await axios.post(
        `${BASE_URL}/check`,
        { word, input },
        { headers }
      );
      span.setAttribute("result", res.data.result);
      span.end();
      return res.data.result;
    } catch (err) {
      span.recordException(err);
      span.end();
      captureExceptionWithOtel(err); // Report error to Sentry
      throw err;
    }
  });
}

// Export API functions for use in game.js
module.exports = { fetchWords, checkSpelling };
