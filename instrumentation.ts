/* AjarKit — instrumentasi server (Next.js instrumentation hook).
   Sentry error monitoring utk runtime Node/route handlers (prd.md §2).
   DSN kosong = no-op (aman utk lingkungan tanpa Sentry). */

import * as Sentry from "@sentry/nextjs";

export function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // sampling ringan utk performa
    // jangan kirim data pribadi pengguna
    sendDefaultPii: false,
  });
}

/* Tangkap error dari React Server Components / route handlers */
export const onRequestError = Sentry.captureRequestError;
