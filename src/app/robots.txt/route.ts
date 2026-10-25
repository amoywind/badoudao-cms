/**
 * robots.txt, built at request time.
 *
 * It used to be a static file in public/ with the sitemap line pointing
 * at the old pages.dev address. The site has a custom domain now, and a
 * robots.txt that names the wrong host sends Google to fetch the sitemap
 * from somewhere that is not the canonical site — or, if that host
 * stops being deployed, from nowhere.
 *
 * The address is read from the same settings row the sitemap uses, so
 * the two cannot drift apart and a domain change needs no redeploy.
 *
 * The rules themselves are unchanged. The admin, the API and the login
 * screen hold nothing indexable, and a filtered listing duplicates the
 * canonical page it came from.
 */

import { getSettings } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DEFAULT_SITE = 'https://oemwallclocks.com';

export async function GET() {
  const s = await getSettings().catch(() => ({} as Record<string, string>));
  const site = String(s.siteUrl || '').trim().replace(/\/+$/, '') || DEFAULT_SITE;

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Admin, API and the login screen hold no indexable content.',
    'Disallow: /admin/',
    'Disallow: /api/',
    'Disallow: /login',
    '',
    '# Filtered listings (?q=, ?status=) duplicate the canonical pages.',
    'Disallow: /*?*',
    '',
    `Sitemap: ${site}/sitemap.xml`,
    ''
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
