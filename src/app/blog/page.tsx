import { permanentRedirect } from 'next/navigation';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * /blog is now /articles.
 *
 * `permanentRedirect`, not `redirect`. `redirect()` answers 307, which
 * tells a crawler the move is temporary and to keep asking for the old
 * address — so the ranking signal stays split between two URLs, which is
 * the whole thing this route exists to prevent. `permanentRedirect()`
 * answers 308, the method-preserving form of a permanent move; Google
 * treats 301 and 308 the same way when consolidating.
 *
 * The target has no trailing slash. Pointing at `/articles/` cost a second
 * hop, because `trailingSlash: false` makes Pages strip the slash on the
 * way back out — so an old link took two requests to arrive, and the extra
 * hop was itself a redirect the owner had no reason to suspect.
 */
export default function BlogRedirect() {
  permanentRedirect('/articles');
}
