import './globals.css';
import './responsive.css';
import './admin.css';
import { getSettings } from '@/lib/db';

/**
 * Normalise whatever was pasted into the Plausible field down to a domain.
 *
 * Plausible shows a snippet like `<script async src=".../pa-XXXX.js">` with
 * the site id inside the filename, and it is easy to paste the whole thing
 * into a field asking for a domain. Left as-is it becomes a data-domain
 * containing HTML, which loads Plausible's own script a second time and
 * double-counts every visit — a silent failure, since the dashboard simply
 * looks empty.
 *
 * So: pull the site id out of a pasted snippet, and accept a bare hostname
 * with or without a scheme or a path.
 */
function plausibleDomain(input: unknown, siteHost: string): string {
  const raw = String(input || '').trim();
  if (!raw) return '';

  /* A pasted snippet: it carries no hostname, only a site id, so the site's
     own domain is the answer. Anything containing a < or a script tag is
     treated as one rather than trusted as a hostname. */
  if (/<|script|\.js/i.test(raw)) return siteHost;

  /* Otherwise treat it as a hostname and strip anything that is not one. */
  const host = raw
    .replace(/^[a-z]+:\/\//i, '')
    .split(/[/?#]/)[0]
    .trim()
    .toLowerCase();

  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) ? host : siteHost;
}

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

  /* The site's own host is the fallback when the field holds a pasted
     snippet, which carries a site id rather than a domain. */
  const siteHost = String(s.siteUrl || '').trim()
    .replace(/^[a-z]+:\/\//i, '')
    .split(/[/?#]/)[0]
    .toLowerCase();
  const plausible = plausibleDomain(s.plausible_domain, siteHost);

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
      {/* No class on <body>.

          An earlier attempt put .site here to scope the responsive layer,
          which needs bare element names — h1, section, table — so the
          public pages stay readable without wrapping every element in a
          class. Unscoped, `table { display: block }` reached the admin and
          dismantled every data table in it.

          The fix was wrong in a way that only showed up in the rendered
          admin: <body> is shared. Both the public pages and /admin render
          inside this one element, so .site marked the admin too, and the
          admin inherited the public responsive rules while admin.css lost
          the specificity fight. The dashboard came back with its table
          columns scattered and its two columns equal-width — the same
          symptoms as before, one layer down.

          Scoping has to happen where the two trees diverge, which is the
          admin's own shell: AdminShell carries .admin-root, and the
          responsive layer's .site selectors then match nothing in it.
          Front-end pages get .site on their own wrapper instead.

          check-css-scope.js only checks that the selectors are written
          correctly; it cannot see that the scope is attached to the wrong
          element. That took a screenshot of the admin to find. */}
      <body>{children}</body>
    </html>
  );
}