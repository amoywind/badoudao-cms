/**
 * Fetch every admin page with a real session and report whether the served
 * HTML is a working page or an error shell.
 *
 * The dashboard and the enquiries list are the two that crashed; the rest
 * are checked too, because a client-side exception on any of them would
 * present the same way to the owner.
 *
 * Usage: node scripts/check-admin.js
 */
const fs = require('fs');
const path = require('path');

const V = fs.readFileSync(path.join(__dirname, '..', '.dev.vars'), 'utf8');
const EMAIL = (V.match(/^ADMIN_EMAIL=(.+)$/m) || [])[1];
const PASS = (V.match(/^ADMIN_PASSWORD=(.+)$/m) || [])[1];
const HOST = process.env.SITE_HOST || 'https://oemwallclocks.com';

const PAGES = [
  ['/admin', '仪表盘'],
  ['/admin/products', '产品管理'],
  ['/admin/categories', '分类管理'],
  ['/admin/posts', '文章管理'],
  ['/admin/pages', '页面管理'],
  ['/admin/media', '图片库'],
  ['/admin/inquiries', '询盘管理'],
  ['/admin/seo', 'SEO 与统计'],
  ['/admin/settings', '系统设置']
];

(async () => {
  if (!EMAIL || !PASS) {
    console.log('Set ADMIN_EMAIL and ADMIN_PASSWORD in .dev.vars');
    process.exit(2);
  }

  const login = await fetch(HOST + '/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL.trim(), password: PASS.trim() })
  });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];

  if (!cookie) {
    console.log(`登录失败 (${login.status}) — .dev.vars 里的密码与线上不一致`);
    process.exit(2);
  }

  let bad = 0;
  for (const [p, label] of PAGES) {
    const r = await fetch(HOST + p, { headers: { Cookie: cookie }, redirect: 'manual' });
    const h = await r.text();

    const crashed =
      /Application error|client-side exception|Unhandled Runtime Error/i.test(h);
    /* An admin shell has the sidebar; a crash shell does not. */
    const hasChrome = /class="nav-i"|nav-g/.test(h);

    if (crashed || !hasChrome || r.status !== 200) bad++;

    const mark = r.status === 200 && hasChrome && !crashed ? 'OK ' : 'NG ';
    console.log(`${mark} ${String(r.status).padEnd(3)} ${p.padEnd(20)} ${label.padEnd(8)} ${Math.round(h.length / 1024)}KB`);
  }

  console.log(bad === 0 ? '\nAll admin pages render.' : `\n${bad} page(s) need attention.`);
  process.exit(bad === 0 ? 0 : 1);
})();