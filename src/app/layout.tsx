import './globals.css';
import './admin.css';
import { getSettings } from '@/lib/db';

/**
 * Root layout metadata — defaults only.
 *
 * Every public route supplies its own title and description through
 * generateMetadata(); these values are the fallback for /admin, /login and
 * anything else that has none. They are deliberately generic: an earlier
 * version put the homepage copy here, which meant all eight public pages
 * emitted the same <title> and told Google they were the same document.
 */
export const metadata = {
  title: 'Badoudao',
  description: 'Quartz clock manufacturer.'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

/**
 * Site-wide verification and analytics.
 *
 * read at request time rather than baked in, because a Search Console token
 * is issued once and pasted here by the owner from the admin — hard-coding
 * it would mean a redeploy to verify a domain.
 *
 * Plausible is loaded with `defer`, and only when a domain is configured.
 * It is one small script that never sets a cookie and collects no personal
 * data, which keeps the site out of the consent-banner requirement most
 * European traffic would otherwise trigger — and it matters more than the
 * analytics do: a buyer on a slow connection is what this page has to
 * survive.
 */
export default async function RootLayout({ children }) {
  const s = await getSettings().catch(() => ({}) as Record<string, string>);

  const sc = String(s.search_console_token || '').trim();
  const bing = String(s.bing_verification || '').trim();
  const plausible = String(s.plausible_domain || '').trim();

  return (
    <html lang="en">
      <head>
        {sc && <meta name="google-site-verification" content={sc} />}
        {bing && <meta name="msvalidate.01" content={bing} />}
        {plausible && (
          <script
            defer
            data-domain={plausible}
            src="https://plausible.io/js/script.js"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}