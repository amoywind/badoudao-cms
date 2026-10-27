import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { getSessionUser, ensureAdminExists, SESSION_COOKIE } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  /* This page sits outside /admin so it does not inherit the admin layout's
     auth check — otherwise the layout would redirect an anonymous visitor
     straight back here and the page would never render.

     That also means the one-time admin creation has to happen here, since the
     admin layout redirects before it can run. */
  await bootstrap();

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token && (await getSessionUser(token))) {
    redirect('/admin');
  }

  return (
    /* The wrapper carries the admin's own class so the admin stylesheet
       applies here as well. Without it the screen loses the admin's
       background colour and the white card in the middle of it stops
       being a card — the background turns white too, and the border
       around it is the only thing left of it. */
    <div className="admin-root" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>
            BADOU<span style={{ color: '#0f5c4a' }}>DAO</span>
          </div>
          <p style={{ color: '#767f8c', fontSize: 13.5, marginTop: 6 }}>管理后台</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e6e8eb', borderRadius: 6, padding: 28 }}>
          <LoginForm />
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12.5, color: '#767f8c' }}>
          <a href="/" style={{ color: '#0f5c4a' }}>← 返回网站首页</a>
        </p>
      </div>
    </div>
  );
}

/** Create the first admin from env vars so a fresh install can be logged into. */
async function bootstrap() {
  try {
    const db = getDB();
    const existing = await db.prepare('SELECT id FROM users LIMIT 1').first();
    if (existing) return;

    const { getRequestContext } = await import('@cloudflare/next-on-pages');
    const { env } = getRequestContext();

    const email = env?.ADMIN_EMAIL || 'admin@badoudao.com';
    const password = env?.ADMIN_PASSWORD || 'badoudao-change-me';

    await ensureAdminExists(email, password);
  } catch (err) {
    console.error('bootstrap failed:', err.message);
  }
}