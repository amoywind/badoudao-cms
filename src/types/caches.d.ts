/**
 * `caches.default` — Cloudflare's global Cache API.
 *
 * The standard DOM `CacheStorage` type has `open()` only. Workers adds a
 * pre-opened global instance at `caches.default`, which is what a Worker is
 * supposed to use; calling `open('my-cache')` there creates a regional cache
 * that is not shared between the Pages Function and the browser at all.
 *
 * Declared here rather than by installing `@cloudflare/workers-types`,
 * because that package redefines `Request`, `Response` and `fetch` for the
 * Workers runtime and collides with the DOM lib this project compiles
 * against. One property is cheaper to declare than that conflict is to
 * resolve.
 *
 * Two behaviors worth knowing, both from the Cache API docs rather than
 * from the type:
 *
 *   - `put()` rejects `stale-while-revalidate`; it is a fetch directive.
 *     That is why the middleware uses a plain `s-maxage`.
 *   - `put()` silently drops a response carrying `Set-Cookie`.
 */
declare global {
  interface CacheStorage {
    /** The data center-local cache every Worker shares. */
    readonly default: Cache;
  }
}

export {};