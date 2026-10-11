/** @type {import('next').NextConfig} */
const config = {
  images: {
    unoptimized: true  // no image optimiser at the edge
  },
  typescript: {
    ignoreBuildErrors: false
  },

  /**
   * No trailing slash — this has to agree with Cloudflare Pages, and the
   * direction of the disagreement matters.
   *
   * Pages rewrites /contact/ to /contact before the request reaches the
   * Worker, so a Next config expecting the slashed form never receives it
   * and sends the browser back the other way. The two then disagree
   * indefinitely: the browser follows the first hop, gets redirected a
   * second time, and gives up with ERR_TOO_MANY_REDIRECTS. The page works
   * from a command line — fetch caches the second response and hides it —
   * which is exactly why this looked fine until a real visitor hit it.
   *
   * Every internal link, canonical and sitemap entry is written without
   * the slash to match, so the visitor settles on the first response.
   */
  trailingSlash: false
};

export default config;