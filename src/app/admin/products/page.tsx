'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (filterCat) params.set('category', filterCat);
    if (filterStatus) params.set('status', filterStatus);

    const res = await fetch(`/api/products?${params}`);
    if (res.status === 401) {
      window.location.href = '/admin/login';
      return;
    }
    const data = await res.json();
    setProducts(data.products);
    setCategories(data.categories);
  }

  useEffect(() => {
    load();
  }, [filterCat, filterStatus]);

  const shown = (products || []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q)
    );
  });

  async function toggleStatus(p) {
    const next = p.status === 'published' ? 'draft' : 'published';
    await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, status: next })
    });
    load();
  }

  async function remove(p) {
    if (!confirm(`删除 ${p.id} ${p.name}？此操作不可撤销。`)) return;
    const res = await fetch(`/api/products?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    load();
  }

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="stat-l">产品总数</div>
          <div className="stat-n">{(products || []).length}</div>
        </div>
        <div className="stat">
          <div className="stat-l">已上架</div>
          <div className="stat-n">{shown.filter((p) => p.status === 'published').length}</div>
        </div>
        <div className="stat">
          <div className="stat-l">草稿</div>
          <div className="stat-n">{shown.filter((p) => p.status === 'draft').length}</div>
        </div>
        <div className="stat">
          <div className="stat-l">缺图片</div>
          <div className="stat-n" style={{ color: shown.filter((p) => !p.images.length).length ? '#b45309' : undefined }}>
            {shown.filter((p) => !p.images.length).length}
          </div>
        </div>
        <div className="stat">
          <div className="stat-l">缺规格参数</div>
          <div className="stat-n" style={{ color: shown.filter((p) => !p.specs.length).length ? '#b45309' : undefined }}>
            {shown.filter((p) => !p.specs.length).length}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>产品管理</h3>
          <span className="sub">{shown.length} 款</span>
          <div className="r">
            <input
              className="inp fld"
              style={{ width: 190 }}
              placeholder="搜索名称 / 型号"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Link href="/admin/products/new" className="btn btn-p btn-sm">+ 新建产品</Link>
          </div>
        </div>

        <div className="fbar">
          <select className="inp fld" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">全部分类</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="inp fld" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">全部状态</option>
            <option value="published">已上架</option>
            <option value="draft">草稿</option>
            <option value="archived">已归档</option>
          </select>
          <button className="btn btn-sm" onClick={load}>刷新</button>
        </div>

        <div className="card-b flush">
          {!products ? (
            <div className="empty"><span className="spin" /></div>
          ) : shown.length === 0 ? (
            <div className="empty">
              <div className="t">没有匹配的产品</div>
              <p style={{ fontSize: 13 }}>调整筛选条件，或新建一个产品</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>产品</th>
                  <th>分类</th>
                  <th style={{ textAlign: 'right' }}>出厂价 (EXW)</th>
                  <th style={{ textAlign: 'right' }}>MOQ</th>
                  <th style={{ textAlign: 'right' }}>交期</th>
                  <th>状态</th>
                  <th style={{ width: 170 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.images.length
                        ? <img className="thumb" src={p.images[0].url} alt="" />
                        : <div className="thumb-ph">!</div>}
                    </td>
                    <td>
                      <div className="pname">
                        <Link href={`/admin/products/${p.id}`}>{p.name}</Link>
                      </div>
                      <div className="psku">{p.id}</div>
                    </td>
                    <td>
                      <span className="pl pl-n">
                        {categories.find((c) => c.id === p.category)?.short || p.category}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                      {p.priceMin ? `$${p.priceMin.toFixed(2)}–${p.priceMax.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{p.moq}</td>
                    <td style={{ fontSize: 12, color: '#767f8c' }}>{p.leadTime}</td>
                    <td>
                      <span className={`pl ${p.status === 'published' ? 'pl-g' : p.status === 'draft' ? 'pl-y' : 'pl-n'}`}>
                        {p.status === 'published' ? '已上架' : p.status === 'draft' ? '草稿' : '已归档'}
                      </span>
                      {p.featured === 1 && <span className="pl pl-bs" style={{ marginLeft: 4 }}>首页</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link href={`/admin/products/${p.id}`} className="btn btn-sm">编辑</Link>
                        <button className="btn btn-sm" onClick={() => toggleStatus(p)}>
                          {p.status === 'published' ? '下架' : '上架'}
                        </button>
                        <button className="btn btn-sm btn-d" onClick={() => remove(p)}>删</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}