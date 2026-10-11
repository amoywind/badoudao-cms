import { NextResponse } from 'next/server';
import { one, run, uid, log } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/* folders                                                              */
/* ------------------------------------------------------------------ */

/**
 * Create a folder, or rename / move an existing one.
 *
 * Folders are addressed by path rather than by nesting id: uploading into
 * "products / wall-clocks" writes the string "products/wall-clocks" into
 * media.folder, which is what the object key and the admin filter both
 * use. Keeping one representation avoids a join on every image read.
 */
export async function POST(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'media', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const action = body.action || 'create';
  const name = String(body.name || '').trim().toLowerCase()
    .replace(/[^a-z0-9一-龥/_-]/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '')
    .slice(0, 60);

  if (!name) {
    return NextResponse.json(
      { error: 'Folder name required — letters, numbers and dashes only.' },
      { status: 400 }
    );
  }

  /* Reject a path that would escape its parent: "../../etc" must not become
     a folder, let alone an object-storage prefix. */
  if (name.includes('..')) {
    return NextResponse.json({ error: 'Invalid folder name' }, { status: 400 });
  }

  const parent = String(body.parent || '').trim().replace(/^\/+|\/+$/g, '').slice(0, 120);

  if (action === 'rename' && body.id) {
    const old = await one('SELECT * FROM media_folders WHERE id = ?', body.id);
    if (!old) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

    const newPath = parent ? `${parent}/${name}` : name;
    const oldPath = old.parent ? `${old.parent}/${old.name}` : old.name;

    await run('UPDATE media_folders SET name = ?, parent = ? WHERE id = ?', name, parent, body.id);

    /* Move the contents too, otherwise renaming a folder orphans every
       image inside it into a path that no longer has a folder row. */
    await run('UPDATE media SET folder = ? WHERE folder = ?', newPath, oldPath);
    await log(user.id, 'update', 'media_folders', body.id, `${oldPath} → ${newPath}`);

    return NextResponse.json({ ok: true, path: newPath });
  }

  if (action === 'delete' && body.id) {
    const row = await one('SELECT * FROM media_folders WHERE id = ?', body.id);
    if (!row) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

    const path = row.parent ? `${row.parent}/${row.name}` : row.name;
    const n = await one('SELECT COUNT(*) AS c FROM media WHERE folder = ?', path);

    if (Number(n?.c || 0) > 0 && !body.force) {
      return NextResponse.json(
        { error: `Folder is not empty (${n.c} file(s)). Move or delete them first.` },
        { status: 409 }
      );
    }

    /* Children go too — an orphaned subfolder would be invisible in the UI. */
    await run('DELETE FROM media_folders WHERE id = ? OR parent = ?', body.id, row.name);
    await log(user.id, 'delete', 'media_folders', body.id, path);

    return NextResponse.json({ ok: true });
  }

  /* create */
  const path = parent ? `${parent}/${name}` : name;

  const clash = await one(
    'SELECT id FROM media_folders WHERE name = ? AND parent = ?',
    name, parent
  );
  if (clash) {
    return NextResponse.json({ error: 'A folder with that name already exists here' }, { status: 409 });
  }

  await run(
    'INSERT INTO media_folders (id, name, parent) VALUES (?,?,?)',
    uid('fld'), name, parent
  );
  await log(user.id, 'create', 'media_folders', '', path);

  return NextResponse.json({ ok: true, path });
}
