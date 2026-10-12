import { NextResponse } from 'next/server';
import { getSettings, setSetting } from '@/lib/db';
import { currentUser, can } from '@/lib/auth';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const DEFAULTS = {
  siteName: 'Badoudao',
  siteUrl: 'https://badoudao.pages.dev',
  email: 'sales@badoudao.com',
  whatsapp: '+8613800000000',
  phone: '+86 138 0000 0000',
  address: 'Zhangzhou, Fujian, China',
  capacityMin: '2000',
  capacityMax: '2000',
  moq: '500',
  quoteHours: '12',
  sampleDays: '7-10',
  logoLight: '/logo-light.svg',
  logoDark: '/logo-dark.svg',
  brandColor: '#0f5c4a',
  accentColor: '#b8874a',
  /* Verification tokens and analytics. A token is pasted once and must
     reach <head> without a redeploy, so it is stored rather than compiled
     in; the admin SEO screen writes to these keys. */
  search_console_token: '',
  bing_verification: '',
  plausible_domain: ''
};

export async function GET(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'settings', 'read')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stored = await getSettings();

  /* seed defaults on first read so the admin sees every field */
  for (const [k, v] of Object.entries(DEFAULTS)) {
    if (stored[k] === undefined) {
      await setSetting(k, v);
      stored[k] = v;
    }
  }

  return NextResponse.json({ settings: stored });
}

export async function PUT(request) {
  const user = await currentUser(request);
  if (!user || !can(user.role, 'settings', 'write')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const allowed = new Set(Object.keys(DEFAULTS));
  const writes = [];

  for (const [k, v] of Object.entries(body)) {
    if (!allowed.has(k)) continue;
    writes.push(setSetting(k, String(v ?? '').slice(0, 500)));
  }

  await Promise.all(writes);

  return NextResponse.json({ ok: true });
}