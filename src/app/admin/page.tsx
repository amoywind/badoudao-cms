'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [inq, setInq] = useState(null);
  const [products, setProducts] = useState(null);

  useEffect(() => {
    fetch('/api/inquiries').then((r) => r.json()).then(setInq).catch(() => {});
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(d.products)).catch(() => {});
  }, []);

  if (!inq || !products) return <div className="empty"><span className="spin" /></div>;

  const s = inq.stats;
  const missingImages = products.filter((p) => !p.images.length);
  const noSpecs = products.filter((p) => !p.specs.length);
  const drafts = products.filter((p) => p.status === 'draft');

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
        <div className="note" style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b' }}>
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
                  {inq.inquiries.slice(0, 8).map((i) => (
                    <tr key={i.id}>
                      <td style={{ width: 100, fontSize: 12 }}>{i.created_at.slice(5, 16)}</td>
                      <td>
                        <div className="pname">{i.name || i.email}</div>
                        <div style={{ fontSize: 11, color: '#767f8c' }}>
                          {i.country} · {i.quantity}
                        </div>
                      </td>
                      <td style={{ width: 80 }}><Link href={`/admin/inquiries/${i.id}`} className="btn btn-sm">打开</Link></td>
                    </tr>
                  ))}
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
                  <th style={{ width: 44 }}></th>
                  <th>产品</th>
                  <th style={{ width: 140 }}>分类</th>
                  <th style={{ width: 110, textAlign: 'right' }}>出厂价</th>
                  <th style={{ width: 76 }}>状态</th>
                  <th style={{ width: 80 }}>完整度</th>
                </tr>
            </thead>
            <tbody>
              {products.slice(0, 10).map((p) => {
                const complete = p.images.length > 0 && p.specs.length > 0 && p.summary.length > 20;
                return (
                  <tr key={p.id}>
                    <td>{p.images.length
                      ? <img className="thumb" src={p.images[0].url} alt="" />
                      : <div className="thumb-ph">!</div>}</td>
                    <td>
                      <div className="pname"><Link href={`/admin/products/${p.id}`}>{p.name}</Link></div>
                      <div className="psku">{p.id}</div>
                    </td>
                    <td><span className="pl pl-n">{p.category}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
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
        </div>
      </div>
    </>
  );
}

function Todo({ n, tone, label, href }: { n: number; tone: string; label: string; href?: string }) {
  const bg = { danger: '#fee2e2', warn: '#fef3c7', green: '#dcfce7', gray: '#f0f2f4' }[tone];
  const fg = { danger: '#b91c1c', warn: '#b45309', green: '#15803d', gray: '#767f8c' }[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: '1px solid #f0f2f4' }}>
      <div style={{ width: 24, height: 24, borderRadius: 5, background: bg, color: fg, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600 }}>
        {n}
      </div>
      <span style={{ fontSize: 13.5 }}>{label}</span>
      {href && <Link href={href} className="btn btn-sm" style={{ marginLeft: 'auto' }}>处理</Link>}
    </div>
  );
}