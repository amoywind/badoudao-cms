import { NextResponse } from 'next/server';
import { currentUser, can } from '@/lib/auth';
import { listSeoTags, saveSeoTag, deleteSeoTag, getSeoTag } from '@/lib/seo-tags';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/** GET — the admin's tag list, including hidden ones.

    The product page does not call this: it reads the tags directly rather
    than through an API, so the public render costs one D1 query instead of
    a fetch to itself. This endpoint exists for the admin screen. */
export async function GET(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'settings', 'write')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  try {
    const tags = await listSeoTags({ includeInactive: true });
    return NextResponse.json({ tags });
  } catch (e) {
    /* A missing table means the migration has not run. Say so rather than
       returning an empty list, which looks like "no tags configured" and
       sends the owner looking in the wrong place. */
    const msg = e instanceof Error ? e.message : String(e);
    if (/no such table/i.test(msg)) {
      return NextResponse.json(
        { error: '标签表尚未创建，请先运行 0011_seo_tags.sql 迁移' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST — create or update one tag. */
export async function POST(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'settings', 'write')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  try {
    const key = await saveSeoTag(body);
    const saved = body.id ? await getSeoTag(Number(body.id)) : null;
    return NextResponse.json({ ok: true, key, tag: saved });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    /* normaliseTagHref throws on a destination that is neither a path nor a
       URL. That is a message for the person typing, not a server fault. */
    const bad = /链接|标识|名称/.test(msg);
    return NextResponse.json({ error: msg }, { status: bad ? 400 : 500 });
  }
}

/** DELETE — remove a tag. */
export async function DELETE(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'settings', 'write')) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });

  await deleteSeoTag(id);
  return NextResponse.json({ ok: true });
}