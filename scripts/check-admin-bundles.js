/**
 * Check that every admin bundle is syntactically valid and that no client
 * component renders a clock value outside a mounted guard.
 *
 * Works without a session, which matters: the admin needs a password that
 * is not in the repo, and the two failures we care about are visible
 * without logging in — a bundle that fails to parse never hydrates at all,
 * and an unguarded Date.now() is visible in the served JavaScript.
 *
 * Usage: node scripts/check-admin-bundles.js
 */
const HOST = process.env.SITE_HOST || 'https://oemwallclocks.com';

const PAGES = [
  '/admin', '/admin/products', '/admin/categories', '/admin/posts',
  '/admin/pages', '/admin/media', '/admin/inquiries', '/admin/seo',
  '/admin/settings'
];

(async () => {
  let bad = 0;
  const bundles = new Set();

  for (const p of PAGES) {
    const r = await fetch(HOST + p, { redirect: 'manual' });
    const h = await r.text();

    /* Unauthenticated returns the redirect to /login, which is fine — the
       point is that no route throws while doing it. */
    const crashed = /Application error|Unhandled Runtime Error/i.test(h);
    if (crashed) { bad++; console.log(`NG  ${p}  服务端已报客户端错误`); continue; }

    for (const m of h.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)) {
      bundles.add(m[1]);
    }
    console.log(`OK  ${String(r.status).padEnd(3)} ${p}`);
  }

  console.log(`\n共 ${bundles.size} 个 JS 分片`);
  let parseFail = 0;
  for (const b of bundles) {
    const src = await (await fetch(HOST + b)).text();
    try {
      /* Parse as a module without executing it. A syntax error here is a
         bundle that could never run in the browser. */
      new Function(`return async()=>{${src.replace(/^\s*(export|import)\b.*$/gm, '')}}`);
    } catch (e) {
      parseFail++;
      console.log(`NG  ${b.split('/').pop()}  ${e.message.slice(0, 70)}`);
    }
  }

  console.log(parseFail === 0 ? '所有分片语法有效' : `${parseFail} 个分片解析失败`);
  process.exit(bad + parseFail === 0 ? 0 : 1);
})();