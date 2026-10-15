/**
 * SEO tag storage.
 *
 * Separate from db.ts because the tag routes need their own small surface
 * and putting four more functions in a 700-line module makes both harder to
 * read. It imports the same primitives.
 *
 * A tag is a link a visitor clicks to reach more of the same thing: "MDF
 * Wood" goes to the MDF products, "Silent Sweep" to the silent ones. The
 * destination is the point of it, which is why it lives in the database
 * rather than being derived alongside the label — deriving both means the
 * href is decided in code, and a destination nobody can change without a
 * deploy is not a link the owner controls.
 */
import { all, one, run } from './db';

/**
 * Packaging photographs, by media id.
 *
 * Ids come from PACKAGING_OPTIONS rather than being written as URLs here:
 * the media row owns the url, so a file that moves from D1 to R2 when the
 * bucket is enabled changes one place. A missing id yields no row rather
 * than a broken request, and the card falls back to its drawn outline.
 */
export async function packagingImages(
  ids: string[]
): Promise<Record<string, { url: string; alt: string }>> {
  const wanted = ids.filter(Boolean);
  if (!wanted.length) return {};

  const placeholders = wanted.map(() => '?').join(',');
  const rows = (await all(
    `SELECT id, url, alt FROM media WHERE id IN (${placeholders})`,
    ...wanted
  )) as { id: string; url: string; alt: string }[];

  const map: Record<string, { url: string; alt: string }> = {};
  for (const r of rows) map[r.id] = { url: r.url, alt: r.alt || '' };
  return map;
}

export type SeoTagRow = {
  id: number;
  key: string;
  label: string;
  href: string;
  scope: string;
  scopeValue: string | null;
  sortOrder: number;
  active: number;
};

/** The camelCase shape the page and the admin work in. */
type RawTag = {
  id: number;
  key: string;
  label: string;
  href: string;
  scope: string;
  scope_value: string | null;
  sort_order: number;
  active: number;
};

function toRow(r: RawTag): SeoTagRow {
  return {
    id: r.id,
    key: r.key,
    label: r.label,
    href: r.href,
    scope: r.scope,
    scopeValue: r.scope_value,
    sortOrder: r.sort_order,
    active: r.active
  };
}

/** Active tags in display order. The product page reads only these. */
export async function listSeoTags({ includeInactive = false } = {}): Promise<SeoTagRow[]> {
  const where = includeInactive ? '' : 'WHERE active = 1';
  const rows = (await all(
    `SELECT * FROM seo_tags ${where} ORDER BY sort_order, label`
  )) as RawTag[];
  return rows.map(toRow);
}

export async function getSeoTag(id: number): Promise<SeoTagRow | null> {
  const r = await one('SELECT * FROM seo_tags WHERE id = ?', id);
  return r ? toRow(r as RawTag) : null;
}

export type SeoTagInput = {
  id?: number;
  key?: string;
  label: string;
  href: string;
  scope?: string;
  scopeValue?: string | null;
  sortOrder?: number;
  active?: number;
};

/** Lowercase, dash-separated, stable across label edits. */
export function slugTagKey(raw: string) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* Reject a destination that is neither a site path nor an absolute URL.
   A tag whose href is "javascript:..." or empty is worse than no tag: it
   looks like navigation and does nothing, or executes. */
export function normaliseTagHref(href: string): string {
  const h = String(href || '').trim();
  if (!h) throw new Error('链接不能为空');
  if (h.startsWith('/')) return h;
  if (/^https?:\/\//i.test(h)) return h;
  throw new Error('链接必须以 / 开头，或填写完整网址（https://…）');
}

export async function saveSeoTag(t: SeoTagInput): Promise<string> {
  const label = String(t.label || '').trim();
  if (!label) throw new Error('标签名称不能为空');

  const href = normaliseTagHref(t.href);
  const key = slugTagKey(t.key || label);
  if (!key) throw new Error('标签标识为空');

  const scope = t.scope === 'category' ? 'category' : 'global';
  const scopeValue = scope === 'category' ? (t.scopeValue || null) : null;
  const sortOrder = Number(t.sortOrder) || 0;
  const active = t.active === 0 ? 0 : 1;

  if (t.id) {
    await run(
      `UPDATE seo_tags SET key=?, label=?, href=?, scope=?, scope_value=?, sort_order=?, active=?
       WHERE id = ?`,
      key, label, href, scope, scopeValue, sortOrder, active, t.id
    );
    return key;
  }

  /* ON CONFLICT on the key: retyping an existing label updates that row
     instead of failing the save with a constraint error the admin cannot
     act on. */
  await run(
    `INSERT INTO seo_tags (key, label, href, scope, scope_value, sort_order, active)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET
       label = excluded.label,
       href = excluded.href,
       scope = excluded.scope,
       scope_value = excluded.scope_value,
       sort_order = excluded.sort_order,
       active = excluded.active`,
    key, label, href, scope, scopeValue, sortOrder, active
  );
  return key;
}

export async function deleteSeoTag(id: number) {
  await run('DELETE FROM seo_tags WHERE id = ?', id);
}
