import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: "/ingest",
  ui_host: "https://us.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
});

/* Sentry sisi browser — DSN publik tidak rahasia; kosong = no-op */
if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

/* instrumentasi navigasi App Router utk Sentry */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
