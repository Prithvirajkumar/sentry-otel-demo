// Sentry SDK initialization for backend error reporting
const Sentry = require("@sentry/node");
Sentry.init({
  dsn: "https://352fe2e5f24020f4520bb0a84b694a7e@o1161257.ingest.us.sentry.io/4510234728988672", // Sentry project DSN
  tracesSampleRate: 0, // No Sentry spans, only OTel
  integrations: [], // No extra integrations
  beforeSend(event, hint) {
    // Log every event before sending for debugging
    console.log("[SENTRY][beforeSend] Event:", JSON.stringify(event, null, 2));
    return event;
  },
});
// Export initialized Sentry instance
module.exports = Sentry;
