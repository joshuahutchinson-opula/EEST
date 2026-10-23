import dotenv from "dotenv";
import * as Sentry from "@sentry/node";

// Error monitoring, on only when SENTRY_DSN is set. Imported before anything else so Sentry can
// instrument Express. Routes report failures with console.error, which the console integration
// forwards to Sentry.
dotenv.config();

export const sentryEnabled = Boolean(process.env.SENTRY_DSN);

if (sentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
    tracesSampleRate: 0,
  });
}

export { Sentry };
