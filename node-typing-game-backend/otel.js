// --- OpenTelemetry and Sentry Instrumentation Setup ---

// Import OTel logging SDK and OTLP log exporter for Sentry
const {
  LoggerProvider,
  BatchLogRecordProcessor,
} = require("@opentelemetry/sdk-logs");
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-http");

// Configure Sentry OTLP log exporter
const logExporter = new OTLPLogExporter({
  url: "https://o1161257.ingest.us.sentry.io/api/4510234728988672/integration/otlp/v1/logs", // Sentry log ingest endpoint
  headers: {
    "x-sentry-auth": "sentry sentry_key=352fe2e5f24020f4520bb0a84b694a7e", // Sentry auth key
  },
});

// Set up OTel logger provider with Sentry exporter
const loggerProvider = new LoggerProvider({
  processors: [new BatchLogRecordProcessor(logExporter)], // Batch processor for efficient log export
});
const logger = loggerProvider.getLogger("default", "1.0.0"); // Main logger instance

// Import OTel tracing SDK and OTLP trace exporter for Sentry
const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const { trace } = require("@opentelemetry/api");

// Configure OTel NodeSDK for distributed tracing
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: "https://o1161257.ingest.us.sentry.io/api/4510234728988672/integration/otlp/v1/traces", // Sentry trace ingest endpoint
    headers: {
      "x-sentry-auth": "sentry sentry_key=352fe2e5f24020f4520bb0a84b694a7e", // Sentry auth key
    },
  }),
  serviceName: "typing-game-backend", // Service name for trace grouping
  instrumentations: [getNodeAutoInstrumentations()], // Auto-instrument common Node modules
});

// Start OTel SDK immediately so tracer is available for all imports
if (!global.__otel_sdk_started) {
  // Enable OTel debug logging for troubleshooting
  process.env.OTEL_LOG_LEVEL = "debug";
  sdk.start(); // Start OTel SDK (async)
  global.__otel_sdk_started = true;
}

// Export OTel tracer and logger for use throughout the backend
module.exports = {
  tracer: trace.getTracer("typing-game-backend"), // Main tracer instance
  logger,
};
