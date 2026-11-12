import '../admin.css';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db';
import { getSessionUser, ensureAdminExists, SESSION_COOKIE } from '@/lib/auth';
import { LoginForm } from './LoginForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/* A login form is not a landing page. Keep it out of the index alongside
   /admin, which the admin layout already excludes. */
export const metadata = {
  title: '登录 · Badoudao CMS',
  robots: { index: false, follow: false, nocache: true }
};

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
    /* .admin-root keeps the admin variables in scope. .login-root owns every
       visual rule on this screen: the login page has no .app wrapper, so none
       of the .app .btn / .app .inp rules can reach it. Importing admin.css
       here is what makes both classes real on this route. */
    <div className="admin-root login-root">
      <div className="lg-wrap">
        <div className="lg-brand">
          <div className="lg-bc">
            <div className="lg-logo">
              <div className="lg-mark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              </div>
              <div>
                <div className="nm">BADOUDAO</div>
                <div className="cn">巴 豆 岛</div>
              </div>
            </div>

            <div className="lg-mid">
              <div className="lg-eyebrow">FACTORY CONTENT HUB</div>
              <h2>自有工厂，<br/><em>自有标准。</em></h2>
              <p>产品、页面、询盘与 SEO，都在这里统一管理。每一次改动，最终都会落到车间里那支钟上。</p>
              <div className="lg-facts">
                <div className="lg-fact">
                  <span className="fi"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20V9l-6 4V9l-6 4V4H2z"/><path d="M6 16h2M12 16h2M18 16h1"/></svg></span>
                  厦门自有工厂 · 石英钟 OEM / ODM
                </div>
                <div className="lg-fact">
                  <span className="fi"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3.3 7.5L12 12.5l8.7-5"/></svg></span>
                  日产能 2,000 支 · EXW 出厂价口径
                </div>
                <div className="lg-fact">
                  <span className="fi"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg></span>
                  机芯符合 CE / RoHS
                </div>
              </div>
            </div>

            <div className="lg-slogan">自有工厂 · 自有标准</div>

            <div className="lg-foot">
              <span>oemwallclocks.com</span>
              <span>© 2026 Xiamen Orange Cat</span>
            </div>
          </div>
        </div>

        <div className="lg-panel">
          <div className="lg-card">
            <div className="lg-kicker">ADMIN CONSOLE</div>
            <h1>登录管理后台</h1>
            <p className="lg-sub">请使用管理员账号继续</p>
            <LoginForm />
            <div className="lg-sep"></div>
            <div className="lg-bottom">
              <a className="lg-back" href="/">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                返回网站首页
              </a>
              <span className="lg-secure">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                安全会话
              </span>
            </div>
            <p className="lg-fine">登录会话经加密，后台页面不对搜索引擎开放。</p>
          </div>
        </div>
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
