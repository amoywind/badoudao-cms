'use client';

import { useEffect, useState } from 'react';
import { Toast, useToast } from '../_ui';

/**
 * The site video slots.
 *
 * Every video position that belongs to the site rather than to a product
 * is a named slot, and this page is where those slots are filled. The
 * home page has four factory clips, the quality page has the four
 * process clips, and the product page has the drop test.
 *
 * YouTube only. The admin pastes a link or an embed snippet and the
 * eleven-character id is taken out of it — the player is built by the
 * site, not by whatever was pasted, so a pasted snippet cannot bring
 * another origin along with it.
 *
 * A slot with no video is listed as outstanding rather than hidden. The
 * page shows what is still missing, because that is the list the person
 * filming needs.
 */
export default function SiteVideosPage() {
  const [slots, setSlots] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState('');
  const { toast, show, dismiss } = useToast();

  async function load() {
    const res = await fetch('/api/site-videos');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const d = await res.json();
    setSlots(d.slots || []);
    setDrafts({});
  }

  useEffect(() => { load(); }, []);

  async function save(slot) {
    const draft = drafts[slot] || {};
    setSaving(slot);
    try {
      const res = await fetch('/api/site-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot,
          youtubeId: draft.youtubeId ?? '',
          title: draft.title ?? ''
        })
      });
      const d = await res.json();
      if (!res.ok) { show(d.error || '保存失败', 'err'); return; }
      show(d.cleared ? '已清空' : '已保存');
      load();
    } catch {
      show('保存失败', 'err');
    } finally {
      setSaving('');
    }
  }

  const set = (slot, key, val) =>
    setDrafts((d) => ({ ...d, [slot]: { ...(d[slot] || {}), [key]: val } }));

  const value = (slot, key) => {
    const d = drafts[slot];
    if (d && d[key] !== undefined) return d[key];
    const row = slots?.find((s) => s.slot === slot);
    return row?.[key] ?? '';
  };

  return (
    <>
      <div className="card">
        <div className="card-h">
          <h3>站点视频</h3>
          <span className="sub">
            {slots ? `${slots.filter((s) => s.youtubeId).length} / ${slots.length} 已填` : '…'}
          </span>
        </div>

        <div className="card-b">
          <div className="note note-i" style={{ marginTop: 0, marginBottom: 18 }}>
            <b>只支持 YouTube</b>：粘贴视频链接或「嵌入」代码都可以，系统会自动取出视频 ID。
            视频在访客点击播放按钮时才会加载，不会拖慢页面。留空即表示该位置还没有素材。
            <br />
            全站视频统一按 <b>9:16 竖版</b> 展示 —— 请上传竖屏视频，横版视频会在页面里被裁掉两侧。
          </div>

          {!slots ? (
            <div className="empty"><span className="spin" /></div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {slots.map((s) => {
                const has = !!s.youtubeId;
                return (
                  <div
                    key={s.slot}
                    style={{
                      border: '1px solid var(--line2)',
                      borderRadius: 8,
                      padding: 16,
                      background: has ? '#f7fbf8' : '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 3,
                          background: has ? '#e3f2ea' : '#f0f2f4',
                          color: has ? '#0f5c4a' : '#8a9199'
                        }}
                      >
                        {has ? '已设置' : '待提供'}
                      </span>
                      <b style={{ fontSize: 13.5 }}>{s.label}</b>
                      <code style={{ fontSize: 11, color: '#8a9199', marginLeft: 'auto' }}>{s.slot}</code>
                    </div>

                    {/* The preview is the shape the video will be
                        shown in on the page. Every video on the site
                        is vertical, so a 16:9 thumbnail here would
                        show the owner a frame the visitor never sees.
                        YouTube has no vertical thumbnail of its own,
                        so the wide one is cropped to the middle. */}
                    {has && (
                      <div style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            width: 108,
                            aspectRatio: '9 / 16',
                            borderRadius: 6,
                            overflow: 'hidden',
                            background: '#16181C',
                            border: '1px solid var(--line2)'
                          }}
                        >
                          <img
                            src={`https://i.ytimg.com/vi/${s.youtubeId}/hqdefault.jpg`}
                            alt=""
                            width={480}
                            height={360}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label className="fl" style={{ fontSize: 11.5 }}>YouTube 链接或嵌入代码</label>
                        <input
                          className="inp"
                          value={value(s.slot, 'youtubeId')}
                          placeholder="https://www.youtube.com/watch?v=..."
                          onChange={(e) => set(s.slot, 'youtubeId', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="fl" style={{ fontSize: 11.5 }}>标题（选填）</label>
                        <input
                          className="inp"
                          value={value(s.slot, 'title')}
                          placeholder="工厂实拍 · CNC 雕刻"
                          onChange={(e) => set(s.slot, 'title', e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-p btn-sm"
                        onClick={() => save(s.slot)}
                        disabled={saving === s.slot}
                      >
                        {saving === s.slot ? '保存中…' : '保存'}
                      </button>
                      {has && (
                        <button
                          className="btn btn-sm btn-d"
                          onClick={() => {
                            set(s.slot, 'youtubeId', '');
                            set(s.slot, 'title', '');
                            setTimeout(() => save(s.slot), 0);
                          }}
                        >
                          清除
                        </button>
                      )}
                      {has && (
                        <a
                          className="btn btn-sm"
                          href={`https://www.youtube.com/watch?v=${s.youtubeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          在 YouTube 打开
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} dismiss={dismiss} />
    </>
  );
}
