// Sentry SDK initialization for backend error reporting
const Sentry = require("@sentry/node");
Sentry.init({
  dsn: "https://c25f59354a8ee19faeb653dcebc48785@o1161257.ingest.us.sentry.io/4510585073369088", // Sentry project DSN
  tracesSampleRate: 0, // No Sentry spans, only OTel
  integrations: [], // No extra integrations
  beforeSend(event, hint) {
    // Log every event before sending for debugging
    console.log("[SENTRY][beforeSend] Event:", JSON.stringify(event, null, 2));
    return event;
  },
  environment: "production", // Set environment
});
// Export initialized Sentry instance
module.exports = Sentry;
