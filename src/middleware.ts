/**
 * Edge caching for the public pages.
 *
 * Read this before assuming it caches anything: it does not.
 *
 * Next middleware cannot change the response body — `NextResponse.next()`
 * carries only headers — so there is no way to store the rendered HTML
 * here. The tempting version of this file (fetch, `cache.put(key,
 * response.clone())`, serve the clone on the next request) compiles, runs,
 * and then serves every visitor a blank page, because what gets stored is
 * an empty body wearing the right headers. Next's own docs are explicit:
 * returning a body from middleware is not permitted.
 *
 * So the real edge cache lives one layer down, in `cached()` in lib/db.ts,
 * where what is cached is a D1 result rather than a document. That is where
 * the 1.5 seconds actually went — three sequential round trips to the
 * database on every page view, identical for every visitor.
 *
 * What this file does do is the part only middleware can do: tell the CDN
 * how long it may hold the HTML itself. Cloudflare does not cache Pages
 * Functions output by default (the default is `max-age=0,
 * must-revalidate`), and `_headers` does not apply to function output, so
 * without an explicit `s-maxage` on the response the document is
 * re-rendered on every request no matter how cheap the data lookup became.
 *
 * Which pages: public ones. Anything under /admin or /api, the login page,
 * and anything the matcher below excludes is left alone — a cached admin
 * document would be a worse bug than a slow one.
 */

import { NextRequest, NextResponse } from 'next/server';

/** How long the CDN may hold a rendered public page, in seconds. */
const HTML_TTL_SECONDS = 300;

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  /* max-age=0 so the visitor's own browser always revalidates: someone
     clicking around the site must never be shown a document from before
     their last edit. s-maxage is the one the edge honours. */
  response.headers.set(
    'Cache-Control',
    `public, max-age=0, s-maxage=${HTML_TTL_SECONDS}`
  );

  /* Surfaced so this can be verified from a terminal after deploy rather
     than inferred from a score. HIT means the CDN served the document
     without running the function at all. */
  response.headers.set('X-BD-Cache', 'PASS');

  return response;
}

export const config = {
  /*
   * A negative lookahead rather than a list of the pages that are public.
   * The failure mode of forgetting to list a new page is a slow page; the
   * failure mode of caching /admin is serving a dashboard to the public, so
   * the exclusions are the part that has to be right.
   */
  matcher: [
    '/((?!_next/static|_next/image|api|admin|login|favicon.ico|robots.txt|sitemap.xml).*)'
  ]
};