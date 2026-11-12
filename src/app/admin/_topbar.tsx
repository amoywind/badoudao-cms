'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

/* The sidebar groups are the source of truth for these two maps. Keeping
   them here rather than reading the DOM means the crumb is right on a
   direct load of any of the thirteen modules, not just after a click. */
const GROUPS = {
  '': '总览',
  products: '商品', categories: '商品',
  posts: '内容', pages: '内容', media: '内容', 'site-videos': '内容',
  inquiries: '询盘',
  seo: '系统', 'seo-tags': '系统', settings: '系统'
};

const LABELS = {
  '': '仪表盘',
  products: '产品管理', categories: '分类管理',
  posts: '文章', pages: '页面管理', media: '图片库', 'site-videos': '站点视频',
  inquiries: '询盘管理',
  seo: 'SEO 与统计', 'seo-tags': 'SEO 标签', settings: '系统设置'
};

export function AdminTopbar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const boxRef = useRef(null);

  const parts = String(pathname || '/admin')
    .replace(/^\/admin\/?/, '')
    .split('/')
    .filter(Boolean);
  const seg = parts[0] || '';
  const group = GROUPS[seg] || '总览';
  const label = LABELS[seg] || '仪表盘';
  const detail = parts[1] ? (parts[1] === 'new' ? '新建' : '详情') : null;

  /* The sidebar badge has carried this id and a "filled client-side from
     the inquiries API" comment since it was written, but nothing ever
     filled it. Do it here so one request serves both indicators. */
  useEffect(() => {
    let alive = true;
    fetch('/api/inquiries')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d || !d.stats) return;
        const n = Number(d.stats.pending) || 0;
        setPending(n);
        const badge = document.getElementById('nav-inq-count');
        if (badge) badge.textContent = n ? String(n) : '';
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  /* Load the product list only when the field is first focused. The list
     endpoint is already used by the dashboard; loading it again on every
     one of the thirteen modules would be thirteen idle requests. */
  async function load() {
    if (items) return;
    try {
      const r = await fetch('/api/products');
      const d = await r.json();
      setItems(Array.isArray(d.products) ? d.products : []);
    } catch {
      setItems([]);
    }
  }

  const needle = q.trim().toLowerCase();
  const matches = needle
    ? (items || [])
        .filter((p) =>
          String(p.name || '').toLowerCase().includes(needle) ||
          String(p.id || '').toLowerCase().includes(needle)
        )
        .slice(0, 6)
    : [];

  function go(id) {
    setOpen(false);
    setQ('');
    router.push('/admin/products/' + id);
  }

  return (
    <header className="top">
      <div className="crumb">
        <span>{group}</span>
        <svg className="c-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        <b>{label}</b>
        {detail && (
          <>
            <svg className="c-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            <span>{detail}</span>
          </>
        )}
      </div>

      <div className="top-search" ref={boxRef}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { setOpen(true); load(); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setOpen(false); return; }
            if (e.key === 'Enter' && matches.length) go(matches[0].id);
          }}
          placeholder="搜索产品…"
          aria-label="搜索产品"
        />
        {open && needle && (
          <div className="ss-pop">
            {items === null ? (
              <div className="ss-empty">正在加载产品…</div>
            ) : matches.length === 0 ? (
              <div className="ss-empty">没有匹配的产品</div>
            ) : (
              matches.map((p) => (
                <button key={p.id} type="button" className="ss-item" onClick={() => go(p.id)}>
                  <span className="ss-ico">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                  </span>
                  <span className="ss-nm">{p.name}</span>
                  <span className="ss-id">{p.id}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <Link className="top-link" href="/" target="_blank" rel="noopener noreferrer">
        查看网站
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg>
      </Link>

      <Link
        className="icon-btn"
        href="/admin/inquiries"
        aria-label={pending ? `有 ${pending} 条待跟进询盘` : '询盘管理'}
        title={pending ? `有 ${pending} 条待跟进询盘` : '询盘管理'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
        {pending > 0 && <span className="dot" />}
      </Link>

      <div className="top-ava" title={`${user.name} · ${user.role}`}>
        {String(user.name || 'A').slice(0, 1)}
      </div>
    </header>
  );
}
