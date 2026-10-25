/**
 * Self-hosted typefaces.
 *
 * Inter, Space Grotesk and JetBrains Mono — all three under the SIL Open
 * Font License, which is what the specification asks for and what removes
 * any question about licensing a typeface on a commercial site.
 *
 * Why local files rather than next/font/google: that loader downloads the
 * font at build time, which means the Cloudflare build has to reach Google.
 * It usually does, but "usually" is not a property a production build
 * should have. The woff2 files in this directory are committed, so the
 * build cannot fail on a third party's uptime, and the browser never
 * contacts Google at all.
 *
 * That last part is the reason this is not a <link> to fonts.googleapis.com.
 * A stylesheet from Google tells Google the visitor's IP address. This
 * site deliberately runs Plausible rather than GA4 to stay out of the
 * European consent-banner requirement, and a font request to a third
 * party undercuts that choice in exactly the way a cookie banner would.
 *
 * The files are the latin subset only — 102 KB for all three — because
 * every word on the site is English and the buyer is reading English.
 */

import localFont from 'next/font/local';

export const inter = localFont({
  src: './fonts/Inter.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
});

export const spaceGrotesk = localFont({
  src: './fonts/SpaceGrotesk.woff2',
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: '300 700',
  fallback: ['Inter', '-apple-system', 'sans-serif']
});

export const jetbrainsMono = localFont({
  src: './fonts/JetBrainsMono.woff2',
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: '100 800',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
});
