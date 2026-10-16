'use client';

import { useEffect, useState } from 'react';
import { Toast, useToast } from '../_ui';
import { SeoBox } from '../_seo';
import { MarkdownEditor } from '../_md';
import { htmlToMd } from '@/lib/markdown';

/* Mirrors the columns in the pages table. body is stored as HTML because
   that is what the front end renders; the editor works in Markdown and the
   API converts on save. */
const BLANK = {
  id: '', slug: '', title: '', heading: '', intro: '',
  body: '', seoTitle: '', seoDescription: '', status: 'published',
  placement: 'top_nav', footerSlot: ''
};

/* Two independent places. They were one field once, and filling the footer
   meant emptying the header of six pages — placement holds top_nav, so a
   page set to a footer column left the nav. A page can now be in both. */
const NAV_SLOTS = [
  { value: 'top_nav', label: '顶部导航' },
  { value: '', label: '不放在任何导航栏' }
];

const FOOTER_SLOTS = [
  { value: '', label: '不显示在页脚' },
  { value: 'footer_2', label: 'SERVICES（服务）' },
  { value: 'footer_3', label: 'COMPANY（公司）' },
  { value: 'footer_4', label: 'RESOURCES（资源）' }
];

const STATUS = {
  published: { label: '已发布', cls: 'pl-g' },
  draft: { label: '草稿', cls: 'pl-n' }
};

/* Open an existing page in the editor as Markdown rather than raw tags. */
function toEdit(p) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    heading: p.heading || '',
    intro: p.intro || '',
    body: htmlToMd(p.body || ''),
    seoTitle: p.seo_title || '',
    seoDescription: p.seo_description || '',
    status: p.status
  };
}

export default function PagesAdmin() {
  const [pages, setPages] = useState(null);
  const [edit, setEdit] = useState(null);
  const {toast, show, dismiss } = useToast();

  async function load() {
    const res = await fetch('/api/pages');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const d = await res.json();
    setPages(d.pages);
  }

  useEffect(() => { load(); }, []);

  async function save(status) {
    const payload = { ...edit, status };
    const res = await fetch('/api/pages', {
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
    if (!confirm(`删除页面「${p.title}」？`)) return;
    const res = await fetch(`/api/pages?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { show(d.error || '删除失败', 'err'); return; }
    show('已删除');
    load();
  }

  if (!pages) return <div className="empty"><span className="spin" /></div>;

  /* ---------- editor ---------- */
  if (edit) {
    return (
      <div className="card">
        <div className="card-h">
          <h3>{edit.id ? `编辑 ${edit.id}` : '新建页面'}</h3>
          <div className="r">
            <button className="btn btn-sm" onClick={() => setEdit(null)}>取消</button>
            <button className="btn btn-sm" onClick={() => save('draft')}>存草稿</button>
            <button className="btn btn-p btn-sm" onClick={() => save('published')}>发布</button>
          </div>
        </div>

        <div className="card-b">
          {!edit.id && (
            <div className="fg">
              <label className="fl">页面 ID<span className="req">*</span></label>
              <input
                className="inp"
                value={edit.id}
                onChange={(e) => setEdit({ ...edit, id: e.target.value.replace(/[^a-z0-9-]/gi, '') })}
                placeholder="certification"
              />
              <span className="hint">小写英文与连字符。发布后网址为 /p/你的ID/</span>
            </div>
          )}

          <div className="fg2">
            <div className="fg">
              <label className="fl">栏目名<span className="req">*</span></label>
              <input className="inp" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Certification" />
              <span className="hint">用于页脚和面包屑，例如「工厂」</span>
            </div>
            <div className="fg">
              <label className="fl">导航位置</label>
              <select
                className="inp"
                value={edit.placement || ''}
                onChange={(e) => setEdit({ ...edit, placement: e.target.value })}
              >
                {NAV_SLOTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="hint">顶部导航由此决定，与页脚栏位互不影响。</span>
            </div>
            <div className="fg">
              <label className="fl">页脚栏位</label>
              <select
                className="inp"
                value={edit.footerSlot || ''}
                onChange={(e) => setEdit({ ...edit, footerSlot: e.target.value })}
              >
                {FOOTER_SLOTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className="hint">
                独立的栏位。同一页可以同时在顶部导航和页脚里 ——
                之前两者共用一个字段，结果页脚一填，导航就空了。
              </span>
            </div>
            <div className="fg">
              <label className="fl">在导航中出现</label>
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={edit.show_in_nav === 1 || edit.show_in_nav === true}
                  onChange={(e) => setEdit({ ...edit, show_in_nav: e.target.checked ? 1 : 0 })}
                />
                <span>
                  显示这一页
                  <em>
                    页脚的每一栏也由这个开关控制。关掉时栏位里看不到它 ——
                    上一版把栏位选好了却依然不显示，就是这个原因。
                  </em>
                </span>
              </label>
            </div>
          </div>

          <div className="fg2">
            <div className="fg">
              <label className="fl">URL 别名</label>
              <input className="inp" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} placeholder="留空则同 ID" />
            </div>
          </div>

          <div className="fg">
            <label className="fl">页面大标题</label>
            <input className="inp" value={edit.heading} onChange={(e) => setEdit({ ...edit, heading: e.target.value })} placeholder="Certification and compliance" />
          </div>

          <div className="fg">
            <label className="fl">简介<span className="hint">显示在标题下方，也用于 SEO 描述</span></label>
            <textarea className="inp" rows={3} value={edit.intro} onChange={(e) => setEdit({ ...edit, intro: e.target.value })} />
          </div>

          <div className="fg">
            <label className="fl">正文<span className="hint">支持 HTML</span></label>
            <MarkdownEditor
              value={edit.body}
              onChange={(v) => setEdit({ ...edit, body: v })}
              minHeight={320}
              placeholder={'## 标题\n\n正文段落。\n\n- 列表项\n\n| 项目 | 参数 |\n| --- | --- |\n| 尺寸 | 12 英寸 |'}
            />
            <div className="help">
              支持 Markdown。保存时会自动转成网页格式。
            </div>
          </div>

          <SeoBox
            value={{ title: edit.seoTitle, description: edit.seoDescription }}
            onChange={(v) => setEdit({ ...edit, seoTitle: v.title, seoDescription: v.description })}
            fallbackTitle={`${edit.heading || edit.title || 'Page'} | Badoudao Quartz Clock Manufacturer`}
            fallbackDescription={edit.intro}
            path={`/p/${edit.slug || edit.id}/`}
          />
        </div>
      </div>
    );
  }

  /* ---------- list ---------- */
  return (
    <>
      <div className="card">
        <div className="card-h">
          <h3>页面管理</h3>
          <span className="sub">{pages.length} 个页面</span>
          <div className="r">
            <button className="btn btn-p btn-sm" onClick={() => setEdit({ ...BLANK })}>+ 新建页面</button>
          </div>
        </div>

        <div className="card-b flush">
          {pages.length === 0 ? (
            <div className="empty"><div className="t">还没有页面</div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>页面</th>
                  <th>标题</th>
                  <th>状态</th>
                  <th style={{ width: 190 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => {
                  const st = STATUS[p.status] || STATUS.draft;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="pname">{p.heading || p.title}</div>
                        <div className="psku">/p/{p.id}/</div>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--ink3)' }}>{p.title}</td>
                      <td><span className={`pl ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <a className="btn btn-sm" href={`/p/${p.id}/`} target="_blank" rel="noreferrer">查看</a>
                          <button className="btn btn-sm" onClick={() => setEdit(toEdit(p))}>编辑</button>
                          <button className="btn btn-d btn-sm" onClick={() => remove(p)}>删除</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="note note-g">
        这些页面直接影响采购决策，正文写实比写好更重要。
        种子数据已预置工厂介绍、小批量优势、认证说明等 5 个页面的标题与 SEO 信息，你只需填正文。
      </div>

      <Toast toast={toast} dismiss={dismiss} />
    </>
  );
}