// --- OpenTelemetry and Sentry Instrumentation Setup (Frontend) ---

// Import OTel NodeSDK and OTLP exporters for Sentry
const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  LoggerProvider,
  BatchLogRecordProcessor,
} = require("@opentelemetry/sdk-logs");
const { OTLPLogExporter } = require("@opentelemetry/exporter-logs-otlp-http");
const { trace } = require("@opentelemetry/api");

// Configure OTLP log exporter to send to local OTel Collector
const logExporter = new OTLPLogExporter({
  url: "http://localhost:4318/v1/logs", // Local OTel Collector endpoint
  // No auth headers needed for local collector
});

// Set up OTel logger provider with Sentry exporter
const loggerProvider = new LoggerProvider({
  processors: [new BatchLogRecordProcessor(logExporter)], // Batch processor for efficient log export
});
const logger = loggerProvider.getLogger("default", "1.0.0"); // Main logger instance

// Configure OTel NodeSDK for distributed tracing
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces", // Local OTel Collector endpoint
    // No auth headers needed for local collector
  }),
  serviceName: "typing-game", // Service name for trace grouping
  instrumentations: [getNodeAutoInstrumentations()], // Auto-instrument common Node modules
});

// Start OTel SDK immediately so tracer is available for all imports
if (!global.__otel_sdk_started) {
  // Enable OTel debug logging for troubleshooting
  process.env.OTEL_LOG_LEVEL = "debug";
  sdk.start(); // Start OTel SDK (async)
  global.__otel_sdk_started = true;
}

// Export OTel tracer and logger for use throughout the frontend
module.exports = {
  tracer: trace.getTracer("typing-game"), // Main tracer instance
  logger,
};
