'use client';

import { useEffect, useState } from 'react';
import { Toast, useToast } from '../_ui';
import { DESC_MAX } from '@/lib/category-limits';
import { SeoBox } from '../_seo';

const BLANK = {
  id: '', name: '', short: '', description: '',
  designs: '', priceRange: '', sortOrder: 0, status: 'published',
  seoTitle: '', seoDescription: ''
};

export default function CategoriesPage() {
  const [cats, setCats] = useState(null);
  const [editing, setEditing] = useState(null);
  const {toast, show, dismiss } = useToast();

  async function load() {
    const res = await fetch('/api/categories');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const d = await res.json();
    setCats(d.categories);
  }

  useEffect(() => { load(); }, []);

  /* Optional chaining, because editing starts as null and this runs on the
     first render, before any row has been clicked. Reading
     editing.description directly threw "Cannot read properties of null"
     and took the whole admin page down before the list even appeared. */
  const descLen = (editing?.description || '').length;

  async function save() {
    const res = await fetch('/api/categories', {
      method: editing.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing)
    });
    const d = await res.json();
    if (!res.ok) { show(d.error || '保存失败', 'err'); return; }
    /* The API reports what it could not store. Saying 已保存 and nothing
       else is what let three descriptions end mid-word without anyone
       noticing until the page was live. */
    if (d.dropped > 0) {
      show(`已保存，但有 ${d.dropped} 个字符超出 ${d.limit} 未保存，请缩短后重新保存`, 'err');
    } else {
      show('已保存');
    }
    setEditing(null);
    load();
  }

  async function remove(c) {
    if (!confirm(`删除分类 ${c.name}？`)) return;
    const res = await fetch(`/api/categories?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) { show(d.error, 'err'); return; }
    show('已删除');
    load();
  }

  if (!cats) return <div className="empty"><span className="spin" /></div>;

  return (
    <>
      <div className="card">
        <div className="card-h">
          <h3>分类管理</h3>
          <span className="sub">{cats.length} 个分类</span>
          <div className="r">
            <button className="btn btn-p btn-sm" onClick={() => setEditing({ ...BLANK })}>
              + 新建分类
            </button>
          </div>
        </div>

        <div className="card-b flush">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>序</th>
                <th>分类</th>
                <th>说明</th>
                <th style={{ textAlign: 'right' }}>产品数</th>
                <th style={{ textAlign: 'right' }}>价格区间</th>
                <th style={{ width: 140 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id}>
                  <td style={{ color: '#767f8c' }}>{c.sort_order}</td>
                  <td>
                    <div className="pname">{c.name}</div>
                    <div className="psku">{c.id} · {c.short}</div>
                  </td>
                  <td style={{ fontSize: 12.5, color: '#3d4450', maxWidth: 260 }}>
                    {c.description?.slice(0, 70)}
                    {c.description?.length > 70 && '…'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: c.product_count ? 600 : 400 }}>
                    {c.product_count || <span style={{ color: '#b45309' }}>0</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {c.price_range ? <span className="exw">EXW {c.price_range}</span> : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm"
                        onClick={() => setEditing({
                          id: c.id, name: c.name, short: c.short,
                          description: c.description || '', designs: c.designs || '',
                          priceRange: c.price_range || '', sortOrder: c.sort_order,
                          status: c.status,
                          seoTitle: c.seo_title || '', seoDescription: c.seo_description || ''
                        })}>编辑</button>
                      <button className="btn btn-sm btn-d" onClick={() => remove(c)}>删</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          display: 'grid', placeItems: 'center', zIndex: 200, padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, margin: 0 }}>
            <div className="card-h">
              <h3>{editing.id ? '编辑分类' : '新建分类'}</h3>
              <div className="r">
                <button className="btn btn-sm" onClick={() => setEditing(null)}>取消</button>
                <button className="btn btn-p btn-sm" onClick={save}>保存</button>
              </div>
            </div>
            <div className="card-b">
              {!editing.id && (
                <div className="fg">
                  <label className="fl">ID<span className="req">*</span><span className="hint">URL 用，创建后不可改</span></label>
                  <input className="inp" value={editing.id} placeholder="wall-clocks"
                    onChange={(e) => setEditing({ ...editing, id: e.target.value })} />
                </div>
              )}

              <div className="fg2">
                <div className="fg">
                  <label className="fl">名称<span className="req">*</span></label>
                  <input className="inp" value={editing.name} placeholder="Quartz Wall Clocks"
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="fl">简称<span className="hint">用于面包屑</span></label>
                  <input className="inp" value={editing.short} placeholder="Wall Clocks"
                    onChange={(e) => setEditing({ ...editing, short: e.target.value })} />
                </div>
              </div>

              <div className="fg">
                <label className="fl">说明
                  <span className="hint">出现在前台分类页</span>
                </label>
                <textarea className="inp" value={editing.description}
                  placeholder="Round, square and vintage styles in plastic, metal and MDF…"
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                {/* Counter, not a silent cut. The count goes red past the
                    limit so the shortfall is visible while typing rather
                    than after saving. */}
                <div className={'hint' + (descLen > DESC_MAX ? ' over' : '')}>
                  {descLen > DESC_MAX
                    ? `超出 ${descLen - DESC_MAX} 字符，超出部分不会保存`
                    : `${descLen} / ${DESC_MAX} 字符`}
                </div>
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="fl">款式数</label>
                  <input className="inp" value={editing.designs} placeholder="300+"
                    onChange={(e) => setEditing({ ...editing, designs: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="fl">价格区间</label>
                  <input className="inp" value={editing.priceRange} placeholder="$1.60-9.80"
                    onChange={(e) => setEditing({ ...editing, priceRange: e.target.value })} />
                </div>
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="fl">排序</label>
                  <input className="inp" type="number" value={editing.sortOrder}
                    onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} />
                </div>
                <div className="fg">
                  <label className="fl">状态</label>
                  <select className="inp" value={editing.status}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                    <option value="published">已发布</option>
                    <option value="draft">草稿</option>
                  </select>
                </div>
              </div>

              {/* Search results for this category, and nothing else on this
                  screen that changes them: the page title and the meta
                  description were generated from the name and the
                  description field, with no way to override either. A
                  category whose id says alarm-clocks but whose name is
                  Wood Wall Clock therefore went out under a title built
                  from the wrong word. The SeoBox writes to the
                  seo_title and seo_description columns, which buildMeta
                  already prefers over the generated pair; left blank they
                  fall back exactly as before. */}
              <SeoBox
                value={{ title: editing.seoTitle, description: editing.seoDescription }}
                onChange={(v) => setEditing({
                  ...editing, seoTitle: v.title, seoDescription: v.description
                })}
                fallbackTitle={`Wholesale ${editing.name || editing.short || 'Category'} — OEM Manufacturer | Badoudao`}
                fallbackDescription={editing.description}
                path={`/products/${editing.id || 'category'}/`}
              />
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} dismiss={dismiss} />
    </>
  );
}