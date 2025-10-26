// Sentry SDK initialization for frontend error reporting
const Sentry = require("@sentry/node");
Sentry.init({
  dsn: "https://a54f975c0645b4e41d3ff35a27a1a34f@o1161257.ingest.us.sentry.io/4505918888935424", // Sentry project DSN
  tracesSampleRate: 0, // No Sentry spans, only OTel
  integrations: [], // No extra integrations
});
// Export initialized Sentry instance
module.exports = Sentry;
