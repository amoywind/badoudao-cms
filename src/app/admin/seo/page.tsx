'use client';

import { useEffect, useState } from 'react';
import { Toast, useToast } from '../_ui';

const SITE = 'https://badoudao-site.pages.dev';

/**
 * Search Console, analytics and the sitemap in one place.
 *
 * The reason this exists: verifying a domain and submitting a sitemap are
 * the two steps that decide whether any of the SEO work reaches an audience,
 * and both live in a Google dashboard rather than in the website. Keeping
 * the tokens here means verifying does not require editing a component and
 * redeploying, which is where that kind of task usually stalls.
 *
 * The steps are written out rather than linked alone, because "it does not
 * work" nearly always turns out to be a DNS record that has not
 * propagated, or a file submitted before the token was in place.
 */
export default function SeoCenter() {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/settings');
      if (res.status === 401) { window.location.href = '/login'; return; }
      setS(await res.json());
    })();
  }, []);

  async function save() {
    setBusy(true);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s)
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      show(d.error || '保存失败', 'err');
      return;
    }
    show('已保存');
  }

  if (!s) return <div className="empty"><span className="spin" /></div>;

  const hasSc = !!String(s.search_console_token || '').trim();
  const hasPlausible = !!String(s.plausible_domain || '').trim();

  return (
    <>
      <div className="card">
        <div className="card-h">
          <h3>Search Console 验证</h3>
          <div className="r">
            <button className="btn btn-p btn-sm" onClick={save} disabled={busy}>
              {busy ? '保存中…' : '保存'}
            </button>
          </div>
        </div>

        <div className="card-b">
          <div className="notice note-i">
            <strong>前提</strong>：先在 Google 打开{' '}
            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
              search.google.com/search-console
            </a>
            ，添加「网址前缀」类型的资源，填入 <code>{SITE}</code>（带 https，不带结尾斜杠）。
            Google 会给出一个 <code>google-site-verification</code> 开头的字符串。
          </div>

          <div className="fg" style={{ marginTop: 14 }}>
            <label className="fl">
              Google 验证码
              <span className="hint">google-site-verification= 后面那串</span>
            </label>
            <input
              className="inp mono"
              value={s.search_console_token || ''}
              onChange={(e) => setS({ ...s, search_console_token: e.target.value })}
              placeholder="AbCdEf123456..."
            />
            <div className="cnt">
              {hasSc ? '✓ 已配置' : '未配置'}
              {hasSc && ' · 保存后 1-2 小时内生效'}
            </div>
          </div>

          <div className="fg">
            <label className="fl">
              Bing 验证码
              <span className="hint">可选，Bing Webmaster Tools 用</span>
            </label>
            <input
              className="inp mono"
              value={s.bing_verification || ''}
              onChange={(e) => setS({ ...s, bing_verification: e.target.value })}
              placeholder="msvalidate.01 后面那串"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>提交 Sitemap</h3>
        </div>
        <div className="card-b">
          <div className="sg-link">
            <code>{SITE}/sitemap.xml</code>
            <a className="btn btn-sm" href={`${SITE}/sitemap.xml`} target="_blank" rel="noopener noreferrer">
              查看
            </a>
          </div>

          <div className="notice note-i" style={{ marginTop: 12 }}>
            验证通过后，到 Search Console → <strong>Sitemaps</strong> → 输入上面的地址提交。
            提交不等于收录，通常 3-7 天。新增产品后可以在「网址检查」里手动提交单个 URL 加速。
          </div>

          <div className="sg-grid" style={{ marginTop: 14 }}>
            <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener noreferrer">
              打开 Sitemaps 面板 →
            </a>
            <a href="https://search.google.com/search-console/inspect" target="_blank" rel="noopener noreferrer">
              单个 URL 提交 →
            </a>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>流量统计</h3>
          <div className="r">
            <button className="btn btn-p btn-sm" onClick={save} disabled={busy}>保存</button>
          </div>
        </div>
        <div className="card-b">
          <div className="notice note-i">
            选了 Plausible 而不是 GA4：不设 Cookie、不收集个人数据，
            欧洲访客不需要弹同意框；而且它是一个脚本，不会拖慢页面。
          </div>

          <div className="fg" style={{ marginTop: 14 }}>
            <label className="fl">
              Plausible 域名
              <span className="hint">在 Plausible 注册后你会拿到一个域名</span>
            </label>
            <input
              className="inp mono"
              value={s.plausible_domain || ''}
              onChange={(e) => setS({ ...s, plausible_domain: e.target.value })}
              placeholder="badoudao.com"
            />
            <div className="cnt">{hasPlausible ? '✓ 统计已开启' : '未开启（留空则不加载任何脚本）'}</div>
          </div>

          {!hasPlausible && (
            <div className="help" style={{ marginTop: 6 }}>
              还没有？去 <a href="https://plausible.io" target="_blank" rel="noopener noreferrer">plausible.io</a>
              注册（免费额度每月 10 万次浏览），填入这里的域名即可。
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </>
  );
}