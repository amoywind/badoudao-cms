'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/* Categories are stored as slugs ("wood-wall-clocks"); the table reads
   better with the label a person would say ("Wood Wall Clocks"). */
const catLabel = (s: string) =>
  s.split('-').map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : '')).join(' ');

export default function DashboardPage() {
  const [inq, setInq] = useState(null);
  const [products, setProducts] = useState(null);
  const [pg, setPg] = useState(1);

  useEffect(() => {
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

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-l">今日新增询盘</div>
          <div className="stat-n">{s.today}</div>
        </div>
        <div className="stat">
          <div className="stat-l">近 7 天</div>
          <div className="stat-n">{s.week}</div>
        </div>
        <div className="stat">
          <div className="stat-l">待跟进</div>
          <div className="stat-n">{s.pending}</div>
        </div>
        <div className="stat">
          <div className="stat-l">近 7 天成交</div>
          <div className="stat-n" style={{ color: s.won ? '#15803d' : undefined }}>{s.won}</div>
        </div>
        <div className="stat">
          <div className="stat-l">超 24h 未回复</div>
          <div className="stat-n" style={{ color: s.stale ? '#b91c1c' : undefined }}>{s.stale}</div>
        </div>
      </div>

      {s.stale > 0 && (
        <div className="note note-danger">
          有 <strong>{s.stale}</strong> 条询盘超过 24 小时未回复。承诺是 12 小时内回复，
          超时的询盘转化率会明显下降。<Link href="/admin/inquiries">立即处理 →</Link>
        </div>
      )}

      {/* grid2-wide, not grid2: the left card holds a table whose row count
          varies, the right one a fixed list of five. Equal columns left the
          right card half empty and squeezed the table beside it. */}
      <div className="grid2-wide" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-h">
            <h3>最新询盘</h3>
            <div className="r"><Link href="/admin/inquiries" className="btn btn-sm">查看全部</Link></div>
          </div>
          <div className="card-b flush">
            {inq.inquiries.length === 0 ? (
              <div className="empty">
                <div className="t">还没有询盘</div>
                <p style={{ fontSize: 13 }}>前台提交表单后会出现在这里</p>
              </div>
            ) : (
              <table>
                <tbody>
                  {inq.inquiries.slice(0, 8).map((i) => {
                    const meta = [i.country, i.quantity].filter(Boolean).join(' · ');
                    return (
                      <tr key={i.id}>
                        <td className="itime">{i.created_at.slice(5, 16)}</td>
                        <td>
                          <div className="pname">{i.name || i.email}</div>
                          <div className="isum">{i.message}</div>
                          {meta && <div className="imeta">{meta}</div>}
                        </td>
                        <td style={{ width: 80, textAlign: 'right' }}>
                          <Link href={`/admin/inquiries/${i.id}`} className="btn btn-sm">打开</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>待办提醒</h3></div>
          <div className="card-b" style={{ paddingTop: 4, paddingBottom: 4 }}>
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
          <div className="r"><Link href="/admin/products" className="btn btn-sm">管理产品</Link></div>
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
                  <th style={{ width: 56 }}></th>
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
  /* Zero rows carry no action: there is nothing to process, so the button
     only appears when the count is positive. The green row is a "state is
     healthy" line rather than a task, so zero reads as a check mark. */
  const zero = n === 0;
  const done = zero && tone === 'green';
  return (
    <div className={`todo${zero ? ' todo-zero' : ''}`}>
      <span className={`todo-n t-${done ? 'green' : tone}`}>{done ? '✓' : n}</span>
      <span className="todo-t">{label}</span>
      {href && !zero && <Link href={href} className="btn btn-sm">处理</Link>}
    </div>
  );
}