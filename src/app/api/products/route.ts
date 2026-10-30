import { NextResponse } from 'next/server';
import { getDB, one, all, run, batch, getProduct, listProducts, listCategories, uid, slugify, log } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';

export const runtime = 'edge';

/* ------------------------------------------------------------------ */
/* GET — list or fetch one                                             */
/* ------------------------------------------------------------------ */

export async function GET(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id) {
    const product = await getProduct(id);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    /* The categories come back on this branch too. The product editor reads
       them from this same response — the name field, the category dropdown,
       the filtered product list all arrive in one fetch — so returning only
       the product left the dropdown empty on every edit screen. */
    const categories = await listCategories();
    return NextResponse.json({ product, categories });
  }

  const products = await listProducts({
    category: searchParams.get('category') || undefined,
    status: searchParams.get('status') || undefined,
    featured: searchParams.has('featured')
      ? searchParams.get('featured') === '1' ? 1 : 0
      : undefined
  });
  const categories = await listCategories();

  return NextResponse.json({ products, categories });
}

/* ------------------------------------------------------------------ */
/* POST — create                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
  }

  const db = getDB();
  const id = String(body.id || '').trim() || uid('BD');

  /* unique sku */
  const dup = await one('SELECT id FROM products WHERE id = ?', id);
  if (dup) return NextResponse.json({ error: `SKU ${id} already exists` }, { status: 409 });

  let slug = slugify(body.slug || body.name);
  const slugTaken = await one('SELECT id FROM products WHERE slug = ?', slug);
  if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`;

  const catExists = await one('SELECT id FROM categories WHERE id = ?', body.category || '');
  if (!catExists) {
    return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
  }

  const stmts = [
    db.prepare(
      `INSERT INTO products
       (id, slug, name, category, summary, price_min, price_max, moq, lead_time,
        move_level, difficulty, content, featured, status, sort_order)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, slug, String(body.name).slice(0, 200), body.category,
      body.summary || '', Number(body.priceMin) || 0, Number(body.priceMax) || 0,
      Number(body.moq) || 500, body.leadTime || '20-30 days',
      body.moveLevel || '中国机芯', body.difficulty || 'simple',
      body.content || '', body.featured ? 1 : 0,
      body.status || 'draft', Number(body.sortOrder) || 0
    )
  ];

  (body.specs || []).forEach((s, i) => {
    if (!s?.label) return;
    stmts.push(
      db.prepare(
        'INSERT INTO product_specs (product_id, label, value, sort_order) VALUES (?,?,?,?)'
      ).bind(id, String(s.label).slice(0, 100), String(s.value || '').slice(0, 300), i)
    );
  });

  (body.options || []).forEach((o, i) => {
    if (!o?.label) return;
    stmts.push(
      db.prepare(
        'INSERT INTO product_options (product_id, label, price_delta, sort_order) VALUES (?,?,?,?)'
      ).bind(id, String(o.label).slice(0, 100), Number(o.priceDelta) || 0, i)
    );
  });

  if (Array.isArray(body.customizations)) {
    stmts.push(...customisationStatements(db, id, body.customizations));
  }

  (body.prices || []).forEach((p) => {
    if (!p || p.unitPrice === '' || p.unitPrice == null) return;
    stmts.push(
      db.prepare(
        'INSERT INTO product_prices (product_id, min_qty, max_qty, unit_price) VALUES (?,?,?,?)'
      ).bind(
        id,
        Number(p.minQty) || 0,
        p.maxQty ? Number(p.maxQty) : null,
        Number(p.unitPrice) || 0
      )
    );
  });

  (body.images || []).forEach((img, i) => {
    if (!img?.mediaId) return;
    stmts.push(
      db.prepare(
        'INSERT INTO product_images (product_id, media_id, sort_order, is_main) VALUES (?,?,?,?)'
      ).bind(id, img.mediaId, i, i === 0 ? 1 : 0)
    );
  });

  /* `batch()` from lib/db, not `db.batch()`: the wrapper is what drops the
     cached reads. Called directly, the products index and the category pages
     kept serving the pre-edit rows until the cache TTL expired. */
  await batch(stmts);
  await log(user.id, 'create', 'products', id, body.name);

  return NextResponse.json({ ok: true, id, slug });
}

/* ------------------------------------------------------------------ */
/* PUT — update                                                        */
/* ------------------------------------------------------------------ */

export async function PUT(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const existing = await one('SELECT * FROM products WHERE id = ?', body.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  /* factory role can only touch inventory fields */
  const limited = user.role === 'factory';
  if (limited && (body.name || body.priceMin !== undefined || body.priceMax !== undefined)) {
    return NextResponse.json(
      { error: 'Factory role cannot change product definition or pricing' },
      { status: 403 }
    );
  }

  const db = getDB();
  const stmts = [];

  const sets = [];
  const vals = [];
  const push = (col, val) => {
    sets.push(`${col} = ?`);
    vals.push(val);
  };

  if (body.name !== undefined && !limited) push('name', String(body.name).slice(0, 200));
  if (body.slug !== undefined && !limited) {
    let slug = slugify(body.slug);
    if (slug !== existing.slug) {
      const taken = await one('SELECT id FROM products WHERE slug = ? AND id != ?', slug, body.id);
      if (taken) return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    }
    push('slug', slug);
  }
  if (body.category !== undefined && !limited) {
    const ok = await one('SELECT id FROM categories WHERE id = ?', body.category);
    if (!ok) return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
    push('category', body.category);
  }
  if (body.summary !== undefined && !limited) push('summary', body.summary);
  if (body.priceMin !== undefined && !limited) push('price_min', Number(body.priceMin) || 0);
  if (body.priceMax !== undefined && !limited) push('price_max', Number(body.priceMax) || 0);
  if (body.moq !== undefined) push('moq', Number(body.moq) || 500);
  if (body.leadTime !== undefined) push('lead_time', body.leadTime);
  if (body.moveLevel !== undefined && !limited) push('move_level', body.moveLevel);
  /* The three groups the collection page filters on, plus the carton the
     product ships in. They were left empty rather than guessed, and an
     empty column nobody can fill is an empty column forever — so they
     are editable here. */
  if (body.movementType !== undefined && !limited) push('movement_type', body.movementType || '');
  if (body.sizeInch !== undefined && !limited) {
    push('size_inch', body.sizeInch === '' || body.sizeInch === null ? null : Number(body.sizeInch));
  }
  if (body.cartonQty !== undefined) push('carton_qty', body.cartonQty === '' || body.cartonQty === null ? null : Number(body.cartonQty));
  if (body.cartonL !== undefined) push('carton_l', body.cartonL === '' || body.cartonL === null ? null : Number(body.cartonL));
  if (body.cartonW !== undefined) push('carton_w', body.cartonW === '' || body.cartonW === null ? null : Number(body.cartonW));
  if (body.cartonH !== undefined) push('carton_h', body.cartonH === '' || body.cartonH === null ? null : Number(body.cartonH));
  if (body.cartonGw !== undefined) push('carton_gw', body.cartonGw === '' || body.cartonGw === null ? null : Number(body.cartonGw));
  /* The three groups the collection page filters on, plus the carton the
     product ships in. They were left empty rather than guessed, and an
     empty column nobody can fill is an empty column forever — so they
     are editable here. */
  if (body.movementType !== undefined && !limited) push('movement_type', body.movementType || '');
  if (body.sizeInch !== undefined && !limited) {
    push('size_inch', body.sizeInch === '' || body.sizeInch === null ? null : Number(body.sizeInch));
  }
  if (body.cartonQty !== undefined) push('carton_qty', body.cartonQty === '' || body.cartonQty === null ? null : Number(body.cartonQty));
  if (body.cartonL !== undefined) push('carton_l', body.cartonL === '' || body.cartonL === null ? null : Number(body.cartonL));
  if (body.cartonW !== undefined) push('carton_w', body.cartonW === '' || body.cartonW === null ? null : Number(body.cartonW));
  if (body.cartonH !== undefined) push('carton_h', body.cartonH === '' || body.cartonH === null ? null : Number(body.cartonH));
  if (body.cartonGw !== undefined) push('carton_gw', body.cartonGw === '' || body.cartonGw === null ? null : Number(body.cartonGw));
  if (body.difficulty !== undefined && !limited) push('difficulty', body.difficulty);
  if (body.content !== undefined && !limited) push('content', body.content);
  if (body.featured !== undefined && !limited) push('featured', body.featured ? 1 : 0);
  if (body.status !== undefined && !limited) push('status', body.status);
  if (body.sortOrder !== undefined) push('sort_order', Number(body.sortOrder) || 0);

  push('updated_at', new Date().toISOString().slice(0, 19).replace('T', ' '));

  stmts.push(
    db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, body.id)
  );

  /* replace child collections wholesale — simpler and always consistent */

  /* Not gated on `limited`: the customization ticks are a separate editor
     from the field list, and saving the text fields must not silently drop
     them. Ticks are checked and reset from their own screen. */
  if (Array.isArray(body.customizations)) {
    stmts.push(...customisationStatements(db, body.id, body.customizations));
  }

  if (!limited && Array.isArray(body.specs)) {
    stmts.push(db.prepare('DELETE FROM product_specs WHERE product_id = ?').bind(body.id));
    body.specs.forEach((s, i) => {
      if (!s?.label) return;
      stmts.push(
        db.prepare(
          'INSERT INTO product_specs (product_id, label, value, sort_order) VALUES (?,?,?,?)'
        ).bind(body.id, String(s.label).slice(0, 100), String(s.value || '').slice(0, 300), i)
      );
    });
  }

  if (!limited && Array.isArray(body.options)) {
    stmts.push(db.prepare('DELETE FROM product_options WHERE product_id = ?').bind(body.id));
    body.options.forEach((o, i) => {
      if (!o?.label) return;
      stmts.push(
        db.prepare(
          'INSERT INTO product_options (product_id, label, price_delta, sort_order) VALUES (?,?,?,?)'
        ).bind(body.id, String(o.label).slice(0, 100), Number(o.priceDelta) || 0, i)
      );
    });
  }

  if (!limited && Array.isArray(body.prices)) {
    stmts.push(db.prepare('DELETE FROM product_prices WHERE product_id = ?').bind(body.id));
    body.prices.forEach((p) => {
      if (!p || p.unitPrice === '' || p.unitPrice == null) return;
      stmts.push(
        db.prepare(
          'INSERT INTO product_prices (product_id, min_qty, max_qty, unit_price) VALUES (?,?,?,?)'
        ).bind(
          body.id,
          Number(p.minQty) || 0,
          p.maxQty ? Number(p.maxQty) : null,
          Number(p.unitPrice) || 0
        )
      );
    });
  }

  if (!limited && Array.isArray(body.images)) {
    stmts.push(db.prepare('DELETE FROM product_images WHERE product_id = ?').bind(body.id));
    body.images.forEach((img, i) => {
      /* The picker writes { mediaId }, but a product loaded from GET
         carries { id } — the id of the product_images row, not of the
         media file. Accepting only mediaId meant every image was skipped on
         save, and since the delete above already ran, saving a product
         silently wiped its images. Take either, preferring mediaId. */
      const mediaId = img?.mediaId ?? (img?.kind !== undefined ? img?.id : undefined) ?? img?.id;
      if (!mediaId) return;
      stmts.push(
        db.prepare(
          'INSERT INTO product_images (product_id, media_id, sort_order, is_main, kind) VALUES (?,?,?,?,?)'
        ).bind(
          body.id,
          mediaId,
          i,
          i === 0 ? 1 : 0,
          img?.kind ? String(img.kind).slice(0, 20) : null
        )
      );
    });
  }

  await batch(stmts);
  await log(user.id, 'update', 'products', body.id, body.name || '');

  return NextResponse.json({ ok: true });
}

/* ------------------------------------------------------------------ */
/* DELETE                                                              */
/* ------------------------------------------------------------------ */

export async function DELETE(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'products', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const row = await one('SELECT name FROM products WHERE id = ?', id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await run('DELETE FROM products WHERE id = ?', id);
  await log(user.id, 'delete', 'products', id, row.name);

  return NextResponse.json({ ok: true });
}
/* Persist the owner's per-product customization picks.

   Written as delete-then-insert rather than a diff: the admin sends the
   whole set every time, and the set is at most six groups of five values,
   so reconciling it costs more in code than re-inserting it does in
   statements. The UNIQUE (product_id, group_key, value) is what stops a
   double tick becoming two rows. */
function customisationStatements(db, productId, list) {
  const stmts = [db.prepare('DELETE FROM product_customisations WHERE product_id = ?').bind(productId)];
  (list || []).forEach((c, i) => {
    if (!c?.groupKey || !c?.value) return;
    stmts.push(
      db.prepare(
        'INSERT OR REPLACE INTO product_customisations (product_id, group_key, value, price_delta, sort_order) VALUES (?,?,?,?,?)'
      ).bind(
        productId,
        String(c.groupKey).slice(0, 40),
        String(c.value).slice(0, 80),
        Number(c.priceDelta) || 0,
        i
      )
    );
  });
  return stmts;
}
