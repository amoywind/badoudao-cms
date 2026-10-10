'use client';

import { useEffect, useState } from 'react';
import { Toast, useToast } from '../_ui';

const BLANK = {
  title: '', slug: '', excerpt: '', keyword: '', body: '',
  seoTitle: '', seoDescription: '', status: 'draft'
};

export default function PostsPage() {
  const [posts, setPosts] = useState(null);
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState('list');
  const { toast, show } = useToast();

  async function load() {
    const res = await fetch('/api/posts');
    if (res.status === 401) { window.location.href = '/admin/login'; return; }
    const d = await res.json();
    setPosts(d.posts);
  }

  useEffect(() => { load(); }, []);

  async function save(status) {
    const payload = { ...edit, status };
    const res = await fetch('/api/posts', {
      method: edit.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    if (!res.ok) { show(d.error || '保存失败', 'err'); return; }
    show(status === 'published' ? '已发布' : '已保存草稿');
    setEdit(null);
    load();
  }

  async function remove(p) {
    if (!confirm(`删除文章「${p.title}」？`)) return;
    const res = await fetch(`/api/posts?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    if (!res.ok) { show('删除失败', 'err'); return; }
    show('已删除');
    load();
  }

  async function publish(p) {
    const res = await fetch('/api/posts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, status: 'published' })
    });
    const d = await res.json();
    if (!res.ok) { show(d.error || '发布失败', 'err'); return; }
    show('已发布');
    load();
  }

  if (!posts) return <div className="empty"><span className="spin" /></div>;

  /* ---------- editor ---------- */
  if (edit && view === 'edit') {
    return (
      <>
        <div className="card">
          <div className="card-h">
            <button className="btn btn-sm" onClick={() => setEdit(null)}>← 返回</button>
            <h3>{edit.id ? '编辑文章' : '新建文章'}</h3>
            <span className="sub">{edit.title}</span>
            <div className="r">
              <button className="btn btn-sm" onClick={() => save('draft')}>存草稿</button>
              <button className="btn btn-p btn-sm" onClick={() => save('published')}>
                {edit.status === 'published' ? '更新' : '发布'}
              </button>
            </div>
          </div>
          <div className="card-b">
            <div className="fg2">
              <div className="fg">
                <label className="fl">标题<span className="req">*</span></label>
                <input className="inp" value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
              </div>
              <div className="fg">
                <label className="fl">URL slug<span className="hint">留空自动生成</span></label>
                <input className="inp" value={edit.slug}
                  onChange={(e) => setEdit({ ...edit, slug: e.target.value })}
                  placeholder="how-to-choose-clock-manufacturer" />
              </div>
            </div>

            <div className="fg">
              <label className="fl">目标关键词<span className="hint">这篇要抢的搜索词</span></label>
              <input className="inp" value={edit.keyword}
                onChange={(e) => setEdit({ ...edit, keyword: e.target.value })}
                placeholder="low MOQ quartz clock manufacturer" />
              <div className="help">想抢什么词就填什么，全文围绕它写</div>
            </div>

            <div className="fg">
              <label className="fl">摘要<span className="hint">160 字符内</span></label>
              <textarea className="inp" style={{ minHeight: 60 }} value={edit.excerpt}
                onChange={(e) => setEdit({ ...edit, excerpt: e.target.value })} />
              <div className="help">{edit.excerpt.length} / 160</div>
            </div>

            <div className="fg">
              <label className="fl">正文<span className="hint">支持 HTML</span></label>
              <textarea className="inp" style={{ minHeight: 420, fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
                value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                placeholder={'<p>第一段回答买家最关心的问题…</p>\n<h2>小标题</h2>\n<p>…</p>'} />
              <div className="help">
                每篇文章要链到至少 2 个分类页和 1 个产品页，这样 Google 才知道该把流量分给谁
              </div>
            </div>

            <div className="fg2">
              <div className="fg">
                <label className="fl">SEO 标题<span className="hint">60 字符内</span></label>
                <input className="inp" value={edit.seoTitle}
                  onChange={(e) => setEdit({ ...edit, seoTitle: e.target.value })} />
              </div>
              <div className="fg">
                <label className="fl">SEO 描述<span className="hint">155 字符内</span></label>
                <input className="inp" value={edit.seoDescription}
                  onChange={(e) => setEdit({ ...edit, seoDescription: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
        <Toast toast={toast} />
      </>
    );
  }

  /* ---------- list ---------- */
  return (
    <>
      <div className="card">
        <div className="card-h">
          <h3>博客文章</h3>
          <span className="sub">{posts.length} 篇 · {posts.filter((p) => p.status === 'published').length} 已发布</span>
          <div className="r">
            <button className="btn btn-p btn-sm" onClick={() => { setEdit({ ...BLANK }); setView('edit'); }}>
              + 新建文章
            </button>
          </div>
        </div>

        <div className="card-b flush">
          {posts.length === 0 ? (
            <div className="empty">
              <div className="t">还没有文章</div>
              <p style={{ fontSize: 13 }}>
                建议优先写：如何选择石英钟厂家、MOQ 详解、认证说明这几篇，它们直接承接采购搜索词
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>标题</th><th>目标关键词</th><th>字数</th>
                  <th>发布时间</th><th>状态</th><th style={{ width: 150 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="pname">{p.title}</div>
                      <div className="psku">/{p.slug}</div>
                    </td>
                    <td style={{ fontSize: 12.5, color: '#3d4450' }}>{p.keyword || '—'}</td>
                    <td style={{ fontSize: 12.5 }}>
                      {(p.body || '').replace(/<[^>]+>/g, '').trim().split(/\s+/).length}
                    </td>
                    <td style={{ fontSize: 12, color: '#767f8c' }}>
                      {p.published_at ? p.published_at.slice(0, 10) : '—'}
                    </td>
                    <td>
                      <span className={`pl ${p.status === 'published' ? 'pl-g' : 'pl-y'}`}>
                        {p.status === 'published' ? '已发布' : '草稿'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm"
                          onClick={() => { setEdit({ ...p }); setView('edit'); }}>编辑</button>
                        {p.status === 'draft' && (
                          <button className="btn btn-sm" onClick={() => publish(p)}>发布</button>
                        )}
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
      <Toast toast={toast} />
    </>
  );
}