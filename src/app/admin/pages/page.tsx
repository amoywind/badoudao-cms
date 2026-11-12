'use client';

import { useEffect, useState } from 'react';
import { Toast, useToast } from '../_ui';
import { SeoBox } from '../_seo';
import { MarkdownEditor } from '../_md';
import { htmlToMd } from '@/lib/markdown';

/* The pages table holds three different things. Showing them as one flat
   list is what made a menu entry look like a broken page with a /p/ URL.
   Each group below gets only the fields its kind can actually use. */
const KINDS = ['content', 'fixed', 'nav'];
const KIND_META = {
  content: { label: '内容页', sub: '正文与 SEO 都可编辑', hint: '网址 /p/{id}，收录在 sitemap' },
  fixed: { label: '固定页', sub: '内容由站点代码提供，只能设置 SEO', hint: '根目录写死路由，不能删除' },
  nav: { label: '导航菜单', sub: '不是页面，只是菜单入口', hint: '指向另一个网址，不产生独立页面' }
};

/* Mirrors the columns in the pages table. body is stored as HTML because
   that is what the front end renders; the editor works in Markdown and the
   API converts on save. */
const BLANK = {
  id: '', slug: '', title: '', heading: '', intro: '',
  body: '', seoTitle: '', seoDescription: '', metaKeywords: '',
  status: 'published', kind: 'content', route: '',
  placement: 'top_nav', footerSlot: '', show_in_nav: 1,
  navLabel: '', externalKey: '', navOrder: 0, sortOrder: 0
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

/* Open an existing row in the editor as Markdown rather than raw tags.
   Carry every editable column: the old toEdit() dropped placement,
   footerSlot and show_in_nav, so opening a page displayed switches that did
   not reflect the database and saving wrote defaults back over them. */
function toEdit(p) {
  return {
    id: p.id,
    slug: p.slug || '',
    title: p.title || '',
    kind: p.kind || 'content',
    route: p.route || '',
    heading: p.heading || '',
    intro: p.intro || '',
    body: htmlToMd(p.body || ''),
    seoTitle: p.seo_title || '',
    seoDescription: p.seo_description || '',
    metaKeywords: p.meta_keywords || '',
    status: p.status || 'published',
    /* The select offers only top_nav / none. Historical rows also carry
       'content' and footer_* here, but the header queries only top_nav and
       the footer queries footer_slot, so collapsing those to none changes
       no visible menu. It also stops a value with no matching <option>
       from being silently replaced by the first option on save. */
    placement: p.placement === 'top_nav' ? 'top_nav' : '',
    footerSlot: p.footer_slot || '',
    show_in_nav: p.show_in_nav ?? 0,
    navLabel: p.nav_label || '',
    externalKey: p.external_key || '',
    navOrder: p.nav_order ?? 0,
    sortOrder: p.sort_order ?? 0
  };
}

/* Same resolution as listNav() — shown in the list so a menu entry reads
   as "→ /about-us" instead of looking like a page at /p/nav-about-factory. */
function navHref(p) {
  if (p.id === 'nav-home') return '/';
  const key = String(p.external_key || '').trim();
  if (key) return `/${key.replace(/^\/+|\/+$/g, '')}`;
  const t = String(p.target || '').trim();
  if (t) return `/p/${t}`;
  return `/p/${p.id}`;
}

export default function PagesAdmin() {
  const [pages, setPages] = useState(null);
  const [edit, setEdit] = useState(null);
  const { toast, show, dismiss } = useToast();

  async function load() {
    const res = await fetch('/api/pages');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const d = await res.json();
    setPages(d.pages || []);
  }

  useEffect(() => { load(); }, []);

  async function save(status) {
    const res = await fetch('/api/pages', {
      method: edit.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      /* The API re-whitelists by kind, so a fixed row can never gain a body
         even if a stale client sends one. */
      body: JSON.stringify({ ...edit, status })
    });
    const d = await res.json();
    if (!res.ok) { show(d.error || '保存失败', 'err'); return; }
    show(edit.kind === 'content' && status === 'published' ? '已发布' : '已保存');
    setEdit(null);
    load();
  }

  async function remove(p) {
    if (!confirm(`删除「${p.title}」？\n\n${p.kind === 'nav' ? '这是导航菜单项，删除后对应菜单入口会消失。' : '页面正文与 SEO 设置都会一并删除，无法恢复。'}`)) return;
    const res = await fetch(`/api/pages?id=${encodeURIComponent(p.id)}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { show(d.error || '删除失败', 'err'); return; }
    show('已删除');
    load();
  }

  if (!pages) return <div className="empty"><span className="spin" /></div>;

  const grouped = {};
  KINDS.forEach((k) => { grouped[k] = pages.filter((p) => (p.kind || 'content') === k); });
  const kind = edit?.kind || 'content';

  /* ---------- editor ---------- */
  if (edit) {
    return (
      <div className="card">
        <div className="card-h">
          <h3>
            {edit.id
              ? (kind === 'fixed' ? `设置 SEO · ${edit.route}` : `编辑 ${edit.id}`)
              : '新建内容页'}
          </h3>
          <div className="r">
            <button className="btn btn-sm" onClick={() => setEdit(null)}>取消</button>
            {kind === 'content' && (
              <>
                <button className="btn btn-sm" onClick={() => save('draft')}>存草稿</button>
                <button className="btn btn-p btn-sm" onClick={() => save('published')}>发布</button>
              </>
            )}
            {kind !== 'content' && (
              <button className="btn btn-p btn-sm" onClick={() => save(edit.status)}>保存</button>
            )}
          </div>
        </div>

        <div className="card-b">
          {kind === 'fixed' && (
            <div className="note note-g" style={{ marginBottom: 18 }}>
              这个页面的正文、版式和图片写在站点代码里，后台不能编辑，也不需要编辑。
              这里只设置搜索标题、描述和关键词 —— 保存后由 <b>buildMeta()</b> 在页面输出，
              留空的字段会回落到站点默认值（描述里的 MOQ / 交期会随设置自动更新）。
            </div>
          )}

          {kind === 'nav' && (
            <div className="note note-g" style={{ marginBottom: 18 }}>
              这是一条<b>导航菜单</b>，不是页面。它只在顶部导航或页脚里显示一个链接，
              没有自己的网址，也不参与 SEO。要改菜单文字请改「导航显示名」，
              而不是「栏目名」。
            </div>
          )}

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

          {/* ---------- nav: menu fields only ---------- */}
          {kind === 'nav' ? (
            <>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">导航显示名<span className="req">*</span></label>
                  <input className="inp" value={edit.navLabel} onChange={(e) => setEdit({ ...edit, navLabel: e.target.value })} />
                  <span className="hint">前台菜单上真正显示的文字。旧版只让改「栏目名」，改完菜单纹丝不动。</span>
                </div>
                <div className="fg">
                  <label className="fl">指向地址</label>
                  <input className="inp" value={edit.externalKey} onChange={(e) => setEdit({ ...edit, externalKey: e.target.value })} placeholder="about-us" />
                  <span className="hint">不带开头的斜杠。可带锚点，如 custom-services#anatomy。</span>
                </div>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="fl">栏目名</label>
                  <input className="inp" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                  <span className="hint">后台识别用，不显示在前台菜单。</span>
                </div>
                <div className="fg">
                  <label className="fl">顶部导航位置</label>
                  <select className="inp" value={edit.placement || ''} onChange={(e) => setEdit({ ...edit, placement: e.target.value })}>
                    {NAV_SLOTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">页脚栏位</label>
                  <select className="inp" value={edit.footerSlot || ''} onChange={(e) => setEdit({ ...edit, footerSlot: e.target.value })}>
                    {FOOTER_SLOTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">排序号</label>
                  <input className="inp" type="number" value={edit.navOrder} onChange={(e) => setEdit({ ...edit, navOrder: e.target.value })} />
                  <span className="hint">小的排前面。</span>
                </div>
              </div>
              <div className="fg">
                <label className="fl">在导航中出现</label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={edit.show_in_nav === 1 || edit.show_in_nav === true}
                    onChange={(e) => setEdit({ ...edit, show_in_nav: e.target.checked ? 1 : 0 })}
                  />
                  <span>显示这一项<em>关掉时顶部导航与页脚都看不到它。</em></span>
                </label>
              </div>
              <div className="help">当前指向：<b>{navHref({ ...edit, external_key: edit.externalKey, id: edit.id })}</b></div>
            </>
          ) : (
            <>
              {/* ---------- content: full editor (fixed skips these) ---------- */}
              {kind === 'content' && (
                <>
                  <div className="fg2">
                    <div className="fg">
                      <label className="fl">栏目名<span className="req">*</span></label>
                      <input className="inp" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Certification" />
                      <span className="hint">用于页脚和面包屑。</span>
                    </div>
                    <div className="fg">
                      <label className="fl">顶部导航位置</label>
                      <select className="inp" value={edit.placement || ''} onChange={(e) => setEdit({ ...edit, placement: e.target.value })}>
                        {NAV_SLOTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="fg">
                      <label className="fl">页脚栏位</label>
                      <select className="inp" value={edit.footerSlot || ''} onChange={(e) => setEdit({ ...edit, footerSlot: e.target.value })}>
                        {FOOTER_SLOTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="fg">
                      <label className="fl">在导航中出现</label>
                      <label className="switch-row">
                        <input
                          type="checkbox"
                          checked={edit.show_in_nav === 1 || edit.show_in_nav === true}
                          onChange={(e) => setEdit({ ...edit, show_in_nav: e.target.checked ? 1 : 0 })}
                        />
                        <span>显示这一页<em>顶部导航和页脚都受这个开关控制。</em></span>
                      </label>
                    </div>
                  </div>

                  <div className="fg2">
                    <div className="fg">
                      <label className="fl">URL 别名</label>
                      <input className="inp" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} placeholder="留空则同 ID" />
                    </div>
                    <div className="fg">
                      <label className="fl">排序号</label>
                      <input className="inp" type="number" value={edit.sortOrder} onChange={(e) => setEdit({ ...edit, sortOrder: e.target.value })} />
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
                    <label className="fl">正文<span className="hint">支持 Markdown</span></label>
                    <MarkdownEditor
                      value={edit.body}
                      onChange={(v) => setEdit({ ...edit, body: v })}
                      minHeight={320}
                      placeholder={'## 标题\n\n正文段落。\n\n- 列表项\n\n| 项目 | 参数 |\n| --- | --- |\n| 尺寸 | 12 英寸 |'}
                    />
                    <div className="help">支持 Markdown。保存时会自动转成网页格式。</div>
                  </div>
                </>
              )}

              {/* ---------- SEO: content + fixed ---------- */}
              <SeoBox
                value={{ title: edit.seoTitle, description: edit.seoDescription }}
                onChange={(v) => setEdit({ ...edit, seoTitle: v.title, seoDescription: v.description })}
                keywords={edit.metaKeywords}
                onKeywordsChange={(v) => setEdit({ ...edit, metaKeywords: v })}
                fallbackTitle={kind === 'fixed'
                  ? edit.title
                  : `${edit.heading || edit.title || 'Page'} | Badoudao Quartz Clock Manufacturer`}
                fallbackDescription={kind === 'fixed' ? '' : edit.intro}
                path={kind === 'fixed' ? edit.route : `/p/${edit.slug || edit.id}/`}
              />
              {kind === 'fixed' && (
                <div className="help" style={{ marginTop: 8 }}>
                  搜索描述留空 = 使用站点代码中的默认描述（含实时 MOQ、回复时限、产品数量）；
                  填写后以此处为准。
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  /* ---------- list ---------- */
  return (
    <>
      {KINDS.map((k) => {
        const rows = grouped[k];
        const meta = KIND_META[k];
        return (
          <div className="card" key={k} style={{ marginBottom: 16 }}>
            <div className="card-h">
              <h3>{meta.label}</h3>
              <span className="sub">{rows.length} 项 · {meta.sub}</span>
              {k === 'content' && (
                <div className="r">
                  <button className="btn btn-p btn-sm" onClick={() => setEdit({ ...BLANK })}>+ 新建内容页</button>
                </div>
              )}
            </div>

            <div className="card-b flush">
              {rows.length === 0 ? (
                <div className="empty"><div className="t">暂无{meta.label}</div></div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>{k === 'nav' ? '菜单项' : '页面'}</th>
                      <th>{k === 'nav' ? '指向' : '网址'}</th>
                      <th>{k === 'content' ? '状态' : k === 'fixed' ? 'SEO' : '位置'}</th>
                      <th style={{ width: 190 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const st = STATUS[p.status] || STATUS.draft;
                      const url = k === 'fixed' ? p.route : k === 'nav' ? navHref(p) : `/p/${p.id}/`;
                      return (
                        <tr key={p.id}>
                          <td>
                            <div className="pname">
                              {k === 'nav' ? (p.nav_label || p.title) : k === 'fixed' ? p.title : (p.heading || p.title)}
                            </div>
                            <div className="psku">{p.id}</div>
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--ink3)' }}>{url}</td>
                          <td>
                            {k === 'content' && <span className={`pl ${st.cls}`}>{st.label}</span>}
                            {k === 'fixed' && (
                              <span className={`pl ${p.seo_title ? 'pl-g' : 'pl-n'}`}>
                                {p.seo_title ? '已设置标题' : '站点默认'}
                              </span>
                            )}
                            {k === 'nav' && (
                              <span className={`pl ${p.show_in_nav ? 'pl-g' : 'pl-n'}`}>
                                {p.show_in_nav
                                  ? (p.placement === 'top_nav' ? '顶部导航' : p.footer_slot ? '页脚' : '已启用')
                                  : '未启用'}
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {k !== 'nav' && (
                                <a className="btn btn-sm" href={url} target="_blank" rel="noreferrer">查看</a>
                              )}
                              <button className="btn btn-sm" onClick={() => setEdit(toEdit(p))}>
                                {k === 'fixed' ? '设置 SEO' : '编辑'}
                              </button>
                              {k !== 'fixed' && (
                                <button className="btn btn-d btn-sm" onClick={() => remove(p)}>删除</button>
                              )}
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
        );
      })}

      <div className="note note-g">
        <b>三类不要混用：</b>内容页是真正写在数据库里的文档；固定页（首页、定制器、关于工厂等）的正文在站点代码里，
        后台只负责它的 SEO；导航菜单只是指向某个网址的入口，没有自己的页面。
        旧版把所有行平铺成一张表、并给每行都配一个 /p/ 开头的「查看」按钮，才出现了 About Factory 这类空壳页。
        现在这些网址会永久跳转到它们真正指向的页面。
      </div>

      <Toast toast={toast} dismiss={dismiss} />
    </>
  );
}
