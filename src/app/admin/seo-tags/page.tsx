'use client';

import { useEffect, useState } from 'react';
import { Toast, useToast } from '../_ui';

/**
 * Tag management.
 *
 * A tag is only worth having if where it points can be changed without a
 * deploy, so the destination is an input here rather than a constant in the
 * front end. The list is deliberately flat: these are half a dozen links,
 * not a taxonomy, and nesting them would imply a structure nobody is
 * maintaining.
 *
 * Hidden tags stay in the list rather than being deleted — turning one off
 * should not mean retyping it.
 */

const BLANK = {
  id: null, key: '', label: '', href: '',
  scope: 'global', scopeValue: '', sortOrder: 0, active: 1
};

export default function SeoTagsPage() {
  const [tags, setTags] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const {toast, show, dismiss } = useToast();

  async function load() {
    const res = await fetch('/api/seo-tags');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const d = await res.json();
    if (!res.ok) { setTags([]); show(d.error || '读取失败', 'err'); return; }
    setTags(d.tags);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    const res = await fetch('/api/seo-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing)
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { show(d.error || '保存失败', 'err'); return; }
    show(editing.id ? '已更新' : '已新增');
    setEditing(null);
    load();
  }

  async function toggle(t) {
    const res = await fetch('/api/seo-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...t, active: t.active ? 0 : 1 })
    });
    const d = await res.json();
    if (!res.ok) { show(d.error || '操作失败', 'err'); return; }
    load();
  }

  async function remove(t) {
    if (!confirm(`删除标签「${t.label}」？`)) return;
    const res = await fetch(`/api/seo-tags?id=${encodeURIComponent(t.id)}`, { method: 'DELETE' });
    if (!res.ok) { show('删除失败', 'err'); return; }
    show('已删除');
    load();
  }

  /* The key is derived from the label on save. Showing it while typing
     would update on every keystroke and fight the field; showing it on the
     saved row is enough to know what identifies it. */
  function edit(t) {
    setEditing(t ? { ...t } : { ...BLANK });
  }

  return (
    <>
      <div className="page-h">
        <div>
          <h1>SEO 标签</h1>
          <p className="sub">
            产品页的材质 / 机芯标签。启用中的标签显示在产品页，点击跳转到填写的链接。
          </p>
        </div>
        <div className="r">
          <button className="btn btn-primary" onClick={() => edit(null)}>+ 新建标签</button>
        </div>
      </div>

      <div className="note note-i">
        标签全部停用时，产品页会退回自动生成（从规格表的材质和机芯字段推断），
        这样新产品不会出现空白。链接必须以 <code>/</code> 开头，例如
        <code> /products/wood-clocks</code>。
      </div>

      <div className="card">
        <div className="card-h">
          <h3>标签列表</h3>
          <span className="sub">
            {tags ? `${tags.filter((t) => t.active).length} 个启用 / 共 ${tags.length} 个` : ''}
          </span>
        </div>
        <div className="card-b">
          {!tags && <p style={{ color: '#767f8c', fontSize: 13.5 }}>读取中…</p>}

          {tags && tags.length === 0 && (
            <p style={{ color: '#767f8c', fontSize: 13.5 }}>
              还没有标签。点右上角「新建标签」，或者直接停用全部标签让系统自动生成。
            </p>
          )}

          {tags && tags.length > 0 && (
            <div style={{ display: 'grid', gap: 0 }}>
              {tags.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 0',
                    borderBottom: i < tags.length - 1 ? '1px solid #e6e8eb' : 0,
                    opacity: t.active ? 1 : 0.5
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: 14 }}>{t.label}</b>
                      {t.scope === 'category' && (
                        <span style={{
                          fontSize: 11, padding: '2px 7px', borderRadius: 10,
                          background: '#dbeafe', color: '#1e40af'
                        }}>
                          仅 {t.scopeValue}
                        </span>
                      )}
                      {!t.active && (
                        <span style={{
                          fontSize: 11, padding: '2px 7px', borderRadius: 10,
                          background: '#f1f5f9', color: '#64748b'
                        }}>
                          已停用
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#767f8c', marginTop: 3, wordBreak: 'break-all' }}>
                      <code style={{ background: '#f6f7f9', padding: '1px 5px', borderRadius: 4 }}>
                        {t.href}
                      </code>
                      <span style={{ marginLeft: 8 }}>标识 {t.key}</span>
                    </div>
                  </div>

                  <button className="btn btn-sm" onClick={() => edit(t)}>编辑</button>
                  <button className="btn btn-sm" onClick={() => toggle(t)}>
                    {t.active ? '停用' : '启用'}
                  </button>
                  <button className="btn btn-sm btn-d" onClick={() => remove(t)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-h">
              <h3>{editing.id ? '编辑标签' : '新建标签'}</h3>
            </div>

            <div className="card-b">
              <label className="fld">
                <span>标签名称 *</span>
                <input
                  className="inp" value={editing.label} autoFocus
                  placeholder="MDF Wood"
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                />
                <small>访客看到的文字。保存后标识自动生成，改名不影响已有链接。</small>
              </label>

              <label className="fld">
                <span>跳转链接 *</span>
                <input
                  className="inp" value={editing.href}
                  placeholder="/products/wood-clocks"
                  onChange={(e) => setEditing({ ...editing, href: e.target.value })}
                />
                <small>以 / 开头的站内路径，或完整网址 https://…</small>
              </label>

              <label className="fld">
                <span>适用范围</span>
                <select
                  className="inp" value={editing.scope}
                  onChange={(e) => setEditing({ ...editing, scope: e.target.value, scopeValue: '' })}
                >
                  <option value="global">所有产品</option>
                  <option value="category">仅指定分类</option>
                </select>
              </label>

              {editing.scope === 'category' && (
                <label className="fld">
                  <span>分类标识</span>
                  <input
                    className="inp" value={editing.scopeValue}
                    placeholder="wall-clocks"
                    onChange={(e) => setEditing({ ...editing, scopeValue: e.target.value })}
                  />
                  <small>
                    与分类 id 一致，例如 wall-clocks / wood-clocks / metal-clocks。
                    填错则该标签在任何产品上都不显示。
                  </small>
                </label>
              )}

              <label className="fld">
                <span>排序</span>
                <input
                  className="inp" type="number" value={editing.sortOrder}
                  onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                />
                <small>数字小的排前面</small>
              </label>
            </div>

            <div className="modal-f">
              <button className="btn" onClick={() => setEditing(null)}>取消</button>
              <button className="btn btn-primary" disabled={busy} onClick={save}>
                {busy ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} dismiss={dismiss} />
    </>
  );
}