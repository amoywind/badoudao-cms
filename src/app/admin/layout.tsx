import '../admin.css';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';
import { LogoutButton } from './LogoutButton';
import { AdminShell } from './_shell';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * Nothing behind /admin should appear in a search result — the enquiry list
 * holds customer names, emails and WhatsApp numbers. This is the belt to
 * the robots.txt Disallow braces.
 */
export const metadata = {
  title: '管理后台',
  robots: { index: false, follow: false, nocache: true }
};

export default async function AdminLayout({ children }) {
  /* One-time admin creation lives in /login. That page sits outside this
     layout, and this layout redirects anonymous visitors before it could run. */

  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = token ? await getSessionUser(token) : null;

  if (!user) {
    redirect('/login');
  }

  return (
    /* The boundary wraps the content area rather than the whole shell, so a
       crash in a page never costs the owner the sidebar and the way back to
       the dashboard. */
    /* admin-root marks the admin as not-the-public-site.

       The responsive layer needs bare element names — h1, section, table —
       so the public pages stay readable without wrapping every element in a
       class, and those selectors are scoped to .site. <body> cannot carry
       that class: it is shared, so marking it marked this tree too and the
       admin inherited the public rules while admin.css lost the
       specificity fight.

       This is the outermost element of the admin, which is where the two
       trees diverge, so it is where the scope has to be set. */
    <div className="app admin-root">
      <Sidebar user={user} />
      <div className="main">
        {/* .content lives here rather than in each page: the padding is a
            property of the frame, not of the 13 pages that fill it, and a
            wrapper someone forgets is exactly how the dashboard ended up
            flush against the viewport edge. The boundary stays inside so a
            crash still cannot take the sidebar down, but the frame above it
            always keeps its padding. */}
        <div className="content">
          <AdminShell>{children}</AdminShell>
        </div>
      </div>
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
          <span>文章</span>
        </a>
        <a className="nav-i" href="/admin/pages">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          <span>页面管理</span>
        </a>
        <a className="nav-i" href="/admin/media">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          <span>图片库</span>
        </a>
        <a className="nav-i" href="/admin/site-videos">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/></svg>
          <span>站点视频</span>
        </a>

        <div className="nav-g">询盘</div>
        <a className="nav-i" href="/admin/inquiries">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>询盘管理</span>
          <span className="bdg" id="nav-inq-count">{pending || ''}</span>
        </a>

        <div className="nav-g">系统</div>
        <a className="nav-i" href="/admin/seo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M8 11h6"/></svg>
          <span>SEO 与统计</span>
        </a>
        <a className="nav-i" href="/admin/seo-tags">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.6 13.4L12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>
          <span>SEO 标签</span>
        </a>
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
