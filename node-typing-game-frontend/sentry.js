// Sentry SDK initialization for frontend error reporting
const Sentry = require("@sentry/node");
Sentry.init({
  dsn: "https://9b0e1ae6af903816f468f3dc1bc42287@o1161257.ingest.us.sentry.io/4510585067864064", // Sentry project DSN
  tracesSampleRate: 0, // No Sentry spans, only OTel
  integrations: [], // No extra integrations
  environment: "development", // Set environment
});
// Export initialized Sentry instance
module.exports = Sentry;
