import './globals.css';
import './tokens.css';
import './responsive.css';
import { getSettings } from '@/lib/db';
import { inter, spaceGrotesk, jetbrainsMono } from './fonts';

/* The font variables are set on <html> rather than on a wrapper, because
   the public pages and the admin are separate trees with different
   wrappers and the admin keeps its own system font stack. Putting them on
   <html> makes the variable available to both without either depending on
   the other's markup — and the admin's own rules keep overriding
   --font-body for its elements, so it is unaffected by the change. */
const fontVars = `${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`;

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
  description: 'Quartz clock manufacturer.',
  /* Declared here rather than left to the browser's default probe.

     With no <link rel=icon> the browser requests /favicon.ico by
     default — which 404s, on every page, and shows up in the console
     as a failed resource. These are the factory's own mark.

     The mark is a drawing of thin lines — two coconut trees, an
     island, three waves — and thin lines are what a sixteen-pixel
     square cannot hold, so the small sizes are the brand blue with
     the mark reversed out of it. The shape is the same at every size;
     the contrast is what carries it down to the smallest one. */
  icons: {
    icon: [
      { url: '/site/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/site/brand/favicon-64.png', sizes: '64x64', type: 'image/png' },
      { url: '/site/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/site/brand/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/site/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

/**
 * Site-wide verification only.
 *
 * Tokens are read at request time rather than baked in, because a Search
 * Console token is issued once and pasted here by the owner from the admin
 * — hard-coding it would mean a redeploy to verify a domain. No third-party
 * analytics or tracking script is loaded anywhere on the site.
 */
export default async function RootLayout({ children }) {
  const s = await getSettings().catch(() => ({}) as Record<string, string>);

  const sc = String(s.search_console_token || '').trim();
  const bing = String(s.bing_verification || '').trim();

  return (
    <html lang="en" className={fontVars}>
      <head>
        {sc && <meta name="google-site-verification" content={sc} />}
        {bing && <meta name="msvalidate.01" content={bing} />}
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