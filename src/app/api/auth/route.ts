import { NextResponse } from 'next/server';
import { one, log } from '@/lib/db';
import { verifyPassword, createSession, destroySession, sessionCookie, clearCookie, SESSION_COOKIE, readCookie } from '@/lib/auth';

export const runtime = 'edge';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  /* throttle: max 8 attempts per IP per 10 minutes */
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const recent = await one(
    `SELECT COUNT(*) AS n FROM audit_log
     WHERE action = 'login_failed' AND created_at > datetime('now', '-10 minutes')
       AND summary = ?`,
    ip
  );
  if (recent && recent.n >= 8) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again in 10 minutes.' },
      { status: 429 }
    );
  }

  const user = await one(
    'SELECT id, email, name, role, password_hash, active FROM users WHERE email = ?',
    email
  );

  const ok = user && user.active === 1
    ? await verifyPassword(password, user.password_hash)
    : false;

  if (!ok) {
    await log('', 'login_failed', 'users', email, ip);
    /* same message either way — do not reveal which accounts exist */
    return NextResponse.json({ error: 'Wrong email or password' }, { status: 401 });
  }

  const { token, expires } = await createSession(user.id);
  await log(user.id, 'login', 'users', user.id, ip);

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
  res.headers.set('Set-Cookie', sessionCookie(token, expires));
  return res;
}

export async function DELETE(request) {
  const token = readCookie(request.headers.get('Cookie') || '', SESSION_COOKIE);
  /* The session is deleted through the helper rather than by writing the
     same statement out again here. Two copies of the same delete is two
     places for it to be wrong. */
  if (token) await destroySession(token);

  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCookie());
  return res;
}