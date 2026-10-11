import { redirect } from 'next/navigation';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * /blog/ is now /articles/.
 *
 * A permanent redirect rather than a second route: the guides moved into
 * the content system alongside company news, and keeping two URLs for the
 * same listings would split the ranking signal between them.
 */
export default function BlogRedirect() {
  redirect('/articles/');
}
