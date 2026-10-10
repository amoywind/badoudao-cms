import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { getSessionUser, ensureAdminExists, SESSION_COOKIE } from '@/lib/auth';
import { LogoutButton } from './LogoutButton';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  /* Auto-create the first admin from env vars so a fresh install works
     immediately. Change the password in /admin/settings after logging in. */
  await bootstrap();

  const token = cookies().get(SESSION_COOKIE)?.value;
  const user = token ? await getSessionUser(token) : null;

  if (!user) {
    redirect('/admin/login');
  }

  return (
    <div className="app">
      <Sidebar user={user} />
      <div className="main">{children}</div>
    </div>
  );
}

function Sidebar({ user }) {
  const pending = 0; // filled client-side from the inquiries API

  return (
    <aside className="side">
      <div className="side-h">
        <div className="lg">BADOU<span>DAO</span></div>
        <div className="who">{user.name} · {user.role}</div>
      </div>

      <nav className="nav">
        <div className="nav-g">总览</div>
        <a className="nav-i" href="/admin">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
          <span>仪表盘</span>
        </a>

        <div className="nav-g">商品</div>
        <a className="nav-i" href="/admin/products">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3.3 7.5L12 12.5l8.7-5M12 22V12.5"/></svg>
          <span>产品管理</span>
        </a>
        <a className="nav-i" href="/admin/categories">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18M3 12h18M3 17h12"/></svg>
          <span>分类管理</span>
        </a>

        <div className="nav-g">内容</div>
        <a className="nav-i" href="/admin/posts">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          <span>博客文章</span>
        </a>
        <a className="nav-i" href="/admin/pages">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          <span>页面管理</span>
        </a>
        <a className="nav-i" href="/admin/media">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <span>图片库</span>
        </a>

        <div className="nav-g">询盘</div>
        <a className="nav-i" href="/admin/inquiries">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>询盘管理</span>
          <span className="bdg" id="nav-inq-count">{pending || ''}</span>
        </a>

        <div className="nav-g">系统</div>
        <a className="nav-i" href="/admin/settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
          <span>系统设置</span>
        </a>
      </nav>

      <div className="side-f">
        <LogoutButton />
      </div>
    </aside>
  );
}

/** Create the first admin if no user exists. */
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
    console.log('Created initial admin:', email);
  } catch (err) {
    console.error('bootstrap failed:', err.message);
  }
}