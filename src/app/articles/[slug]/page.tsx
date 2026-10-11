import Link from 'next/link';
import { notFound } from 'next/navigation';
import { one, all, getSettings, buildMeta } from '@/lib/db';
import { TopBar, Header, Footer } from '../../SiteChrome';
import { InquiryCTA } from '../../InquiryForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * The target keyword was chosen when the article was written and is stored
 * in `posts.keyword`. Putting it in the title and description is the whole
 * point of that column — an article written around one phrase ranks for
 * that phrase.
 */
export async function generateMetadata({ params }) {
  const post = await one(
    "SELECT * FROM posts WHERE slug = ? AND status = 'published' AND type = 'article'",
    params.slug
  ).catch(() => null);

  if (!post) return { title: 'Article not found | Badoudao', robots: { index: false } };

  const kw = String(post.keyword || '').trim();

  return buildMeta({
    title: kw ? `${post.title} | ${kw} | Badoudao` : `${post.title} | Badoudao`,
    description:
      post.seo_description ||
      post.excerpt ||
      `${post.title} — a practical guide from Badoudao, an OEM and ODM quartz clock manufacturer.`,
    seoTitle: post.seo_title,
    seoDescription: post.seo_description,
    keywords: kw,
    path: `/articles/${post.slug}/`,
    image: post.cover,
    type: 'article'
  });
}

export default async function ArticlePage({ params }) {
  const { slug } = params;
  const post = await one(
    "SELECT * FROM posts WHERE slug = ? AND status = 'published' AND type = 'article'",
    slug
  ).catch(() => null);

  if (!post) notFound();

  const [related, s] = await Promise.all([
    all(
      `SELECT slug, title, excerpt FROM posts
        WHERE status = 'published' AND type = 'article' AND slug != ?
        ORDER BY COALESCE(published_at, created_at) DESC LIMIT 3`,
      slug
    ).catch(() => []),
    getSettings().catch(() => ({}))
  ]);

  return (
    <>
      <TopBar />
      <Header />

      <nav className="breadcrumb">
        <div className="wrap">
          <Link href="/">Home</Link><span>/</span>
          <Link href="/articles/">Articles</Link><span>/</span>
          <span>{post.title}</span>
        </div>
      </nav>

      <main>
        <article>
          <div className="wrap" style={{ maxWidth: 760, paddingTop: 48, paddingBottom: 24 }}>
            <div className="sec-tag">Article</div>
            <h1>{post.title}</h1>
            {post.published_at && (
              <div className="art-meta">{String(post.published_at).slice(0, 10)}</div>
            )}
            {post.cover && (
              <div className="art-cover">
                <img src={post.cover} alt={post.title} width={1200} height={630} />
              </div>
            )}
            {post.excerpt && <p className="art-lede">{post.excerpt}</p>}
            <div className="content-block" dangerouslySetInnerHTML={{ __html: post.body }} />
          </div>
        </article>

        {related.length > 0 && (
          <section className="alt">
            <div className="wrap">
              <div className="sec-head">
                <div className="sec-tag">Keep reading</div>
                <h2 style={{ fontSize: 26 }}>Related articles</h2>
              </div>
              <div className="grid-3">
                {related.map((r) => (
                  <Link key={r.slug} href={`/articles/${r.slug}/`} className="card">
                    <div className="c-body">
                      <h3 style={{ fontSize: 16 }}>{r.title}</h3>
                      {r.excerpt && <p style={{ fontSize: 13 }}>{String(r.excerpt).slice(0, 110)}…</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="wrap">
            <InquiryCTA label="Questions about this topic?" />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
