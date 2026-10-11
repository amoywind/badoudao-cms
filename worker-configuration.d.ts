/**
 * Cloudflare bindings available to this app.
 *
 * @cloudflare/next-on-pages ships a base CloudflareEnv, but it does not know
 * about the D1 database or the environment variables this project adds in
 * wrangler.toml and the Pages dashboard. Without this declaration every
 * `env.DB` and `env.RESEND_API_KEY` fails type checking.
 */
interface CloudflareEnv {
  /** D1 database, bound as "DB" in wrangler.toml */
  DB?: D1Database;

  /** R2 bucket for uploaded media, bound as "MEDIA_BUCKET" (optional) */
  MEDIA_BUCKET?: R2Bucket;

  /* Secrets and configuration set in the Pages dashboard */

  /** First admin account, created on first visit to /admin */
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;

  /** Resend API key used to forward enquiries by email */
  RESEND_API_KEY?: string;
  /** Where enquiry notifications are delivered */
  INBOX_EMAIL?: string;
  /** From header for those notifications */
  MAIL_FROM?: string;

  /** Public site URL, used for canonical tags and share images */
  SITE_URL?: string;

  /** Node version pin for the build image */
  NODE_VERSION?: string;
}