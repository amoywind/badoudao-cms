'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/* Categories are stored as slugs ("wood-wall-clocks"); the table reads
   better with the label a person would say ("Wood Wall Clocks"). */
const catLabel = (s: string) =>
  s.split('-').map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : '')).join(' ');

/* Module-local: never exported. A "use client" module that exports plain
   values to a server component breaks at runtime even though the build
   passes. */
const STAT_PATHS = {
  inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.4 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.4-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.8 1.1z"/></>,
  trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  check: <path d="M20 6L9 17l-5-5"/>,
  alert: <><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>
};

function StatIcon({ kind }: { kind: keyof typeof STAT_PATHS }) {
  return (
    <span className="stat-ico">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {STAT_PATHS[kind]}
      </svg>
    </span>
  );
}

function initials(s: string) {
  const t = String(s || '?').trim();
  if (/^[\u4e00-\u9fff]/.test(t)) return t.slice(0, 1);
  const parts = t.split(/\s+/).filter(Boolean);
  const v = ((parts[0] || '')[0] || '') + ((parts[1] || '')[0] || '');
  return (v || t.slice(0, 1)).toUpperCase();
}

export default function DashboardPage() {
  const [inq, setInq] = useState(null);
  const [products, setProducts] = useState(null);
  const [pg, setPg] = useState(1);
  /* Filled after mount: rendering new Date() during SSR would put a
     different day into the server HTML than the client hydration pass. */
  const [today, setToday] = useState('');

  useEffect(() => {
    const d = new Date();
    setToday(`${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`);
    fetch('/api/inquiries').then((r) => r.json()).then(setInq).catch(() => {});
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(d.products)).catch(() => {});
  }, []);

  if (!inq || !products) return <div className="empty"><span className="spin" /></div>;

  const s = inq.stats;
  const missingImages = products.filter((p) => !p.images.length);
  const noSpecs = products.filter((p) => !p.specs.length);
  const drafts = products.filter((p) => p.status === 'draft');

  /* Dashboard overview is a scan, not a work surface: five rows per page
     keeps every row at full height with no scrolling, and the pager gives
     the count a purpose. */
  const PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(products.length / PER_PAGE));
  const cur = Math.min(pg, totalPages);
  const rows = products.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);
  const start = Math.max(1, Math.min(cur - 2, totalPages - 4));
  const pageNums = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <>
      <div className="page-t">
        <div>
          <h1>仪表盘</h1>
          <p>{today ? `${today} · ` : ''}站点运行正常</p>
        </div>
        <div className="act">
          <Link href="/admin/inquiries" className="btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
            查看询盘
          </Link>
          <Link href="/admin/products/new" className="btn btn-p">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            新建产品
          </Link>
        </div>
      </div>

      {s.stale > 0 && (
        <div className="alert">
          <span className="alert-ic">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
          </span>
          <span>有 <b>{s.stale}</b> 条询盘超过 24 小时未回复。承诺是 <b>12 小时</b>内回复，超时的询盘转化率会明显下降。</span>
          <Link href="/admin/inquiries" className="alert-go">立即处理 →</Link>
        </div>
      )}

      <div className="stats">
        <div className="stat">
          <div className="stat-top"><span className="stat-l">今日新增询盘</span><StatIcon kind="inbox" /></div>
          <div className="stat-n">{s.today}</div>
          <div className="stat-f">今日 00:00 起累计</div>
        </div>
        <div className="stat">
          <div className="stat-top"><span className="stat-l">近 7 天</span><StatIcon kind="trend" /></div>
          <div className="stat-n">{s.week}</div>
          <div className="stat-f">近 7 天累计</div>
        </div>
        <div className="stat k-warn">
          <div className="stat-top"><span className="stat-l">待跟进</span><StatIcon kind="clock" /></div>
          <div className="stat-n">{s.pending}</div>
          <div className="stat-f">未成交且未关闭</div>
        </div>
        <div className="stat">
          <div className="stat-top"><span className="stat-l">近 7 天成交</span><StatIcon kind="check" /></div>
          <div className="stat-n" style={{ color: s.won ? '#15803d' : undefined }}>{s.won}</div>
          <div className="stat-f">状态为已成交</div>
        </div>
        <div className="stat k-danger">
          <div className="stat-top"><span className="stat-l">超时未回复</span><StatIcon kind="alert" /></div>
          <div className="stat-n">{s.stale}</div>
          <div className="stat-f">超 24h · 超出 12h 承诺</div>
        </div>
      </div>

      {/* grid2-wide, not grid2: the left card holds a list whose row count
          varies, the right one a fixed list of five. Equal columns left the
          right card half empty and squeezed the list beside it. */}
      <div className="grid2-wide" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-h">
            <h3>最新询盘</h3>
            <div className="r"><Link href="/admin/inquiries" className="lnk">查看全部 →</Link></div>
          </div>
          <div className="card-b flush">
            {inq.inquiries.length === 0 ? (
              <div className="empty">
                <div className="t">还没有询盘</div>
                <p style={{ fontSize: 13 }}>前台提交表单后会出现在这里</p>
              </div>
            ) : (
              <>
                <div className="inq-list">
                  {inq.inquiries.slice(0, 8).map((i) => {
                    const meta = [i.country, i.quantity].filter(Boolean).join(' · ');
                    const who = i.name || i.email || '匿名买家';
                    return (
                      <Link key={i.id} href={`/admin/inquiries/${i.id}`} className="inq-row">
                        <span className="inq-ava">{initials(who)}</span>
                        <span className="inq-tx">
                          <span className="inq-nm">{who}</span>
                          {i.message && <span className="inq-msg">{i.message}</span>}
                          {meta && <span className="inq-meta">{meta}</span>}
                        </span>
                        <span className="inq-tm">{i.created_at.slice(5, 16)}</span>
                      </Link>
                    );
                  })}
                </div>
                <div className="inq-foot">
                  最近 {Math.min(8, inq.inquiries.length)} 条 · 共 {inq.inquiries.length} 条询盘
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>待办提醒</h3></div>
          <div className="card-b todo-b">
            <Todo n={s.stale} tone="danger" label="询盘超 24h 未回复" href="/admin/inquiries" />
            <Todo n={missingImages.length} tone="warn" label="产品缺少图片" href="/admin/products" />
            <Todo n={noSpecs.length} tone="warn" label="产品缺规格参数" href="/admin/products" />
            <Todo n={drafts.length} tone="gray" label="草稿待发布" href="/admin/products" />
            <Todo n={0} tone="green" label="认证页与 sitemap 已配置" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>产品概览</h3>
          <span className="sub">共 {products.length} 款</span>
          <div className="r"><Link href="/admin/products" className="lnk">管理产品 →</Link></div>
        </div>
        <div className="card-b flush">
          {/* data-fixed: every column below declares a width, so fixed layout
              can hold them steady however long a product name is. Without it
              one long name pushes status and completeness off to the right
              and the header reads as a scatter of labels. */}
          <table data-fixed>
            <thead>
              <tr>
                  {/* Widths declared so table-layout:fixed has something to
                      work from: the product name takes the slack, and every
                      other column stays put however long the name is. */}
                  {/* 40px square thumb + 14px cell padding on each side.
                      A 56px column left only 28px of content and the
                      global img max-width:100% squashed the square into
                      a 28x40 rectangle. */}
                  <th style={{ width: 70 }}></th>
                  <th>产品</th>
                  <th style={{ width: 155 }}>分类</th>
                  <th className="tnum" style={{ width: 124, textAlign: 'right' }}>出厂价</th>
                  <th style={{ width: 76 }}>状态</th>
                  <th style={{ width: 80 }}>完整度</th>
                </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const complete = p.images.length > 0 && p.specs.length > 0 && p.summary.length > 20;
                return (
                  <tr key={p.id}>
                    <td>{p.images.length
                      ? <img
                          className="thumb"
                          src={p.images[0].thumbUrl || p.images[0].url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          width={44}
                          height={44}
                        />
                      : <div className="thumb-ph">!</div>}</td>
                    <td>
                      <div className="pname"><Link href={`/admin/products/${p.id}`}>{p.name}</Link></div>
                      <div className="psku">{p.id}</div>
                    </td>
                    <td><span className="pl pl-n">{catLabel(p.category)}</span></td>
                    <td className="tnum" style={{ textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {p.priceMin ? `$${p.priceMin.toFixed(2)}–${p.priceMax.toFixed(2)}` : '—'}
                    </td>
                    <td><span className={`pl ${p.status === 'published' ? 'pl-g' : 'pl-y'}`}>
                      {p.status === 'published' ? '已上架' : '草稿'}
                    </span></td>
                    <td><span className={`pl ${complete ? 'pl-g' : 'pl-y'}`}>{complete ? '完整' : '待补'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="pgn">
              <button className="btn btn-sm" disabled={cur <= 1} onClick={() => setPg(cur - 1)}>‹ 上一页</button>
              <div className="pgn-pages">
                {pageNums.map((n) => (
                  <button
                    key={n}
                    className={`pgn-pg${n === cur ? ' on' : ''}`}
                    onClick={() => setPg(n)}
                    aria-label={`第 ${n} 页`}
                    aria-current={n === cur ? 'page' : undefined}
                  >{n}</button>
                ))}
              </div>
              <span className="pgn-info">第 {cur} / {totalPages} 页 · 共 {products.length} 款</span>
              <button className="btn btn-sm" style={{ marginLeft: 'auto' }} disabled={cur >= totalPages} onClick={() => setPg(cur + 1)}>下一页 ›</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Todo({ n, tone, label, href }: { n: number; tone: string; label: string; href?: string }) {
  /* Zero rows carry no action: there is nothing to process, so the link
     only appears when the count is positive. The green row is a "state is
     healthy" line rather than a task, so zero reads as a check mark. */
  const zero = n === 0;
  const done = zero && tone === 'green';
  const kind = done ? 'green' : tone;
  return (
    <div className={`todo t-${kind}${zero ? ' todo-zero' : ''}`}>
      <span className="todo-dot" />
      <span className="todo-t">{label}</span>
      <span className="todo-n">
        {done
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          : n}
      </span>
      {href && !zero && <Link href={href} className="todo-go">处理</Link>}
    </div>
  );
}
