'use client';

import { useEffect, useRef, useState } from 'react';
import { Toast, useToast } from '../_ui';

export default function MediaPage() {
  const [media, setMedia] = useState(null);
  const [folders, setFolders] = useState([]);
  const [folder, setFolder] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const { toast, show } = useToast();

  async function load() {
    const res = await fetch(`/api/media${folder ? `?folder=${folder}` : ''}`);
    if (res.status === 401) { window.location.href = '/login'; return; }
    const d = await res.json();
    setMedia(d.media);
    setFolders(d.folders);
  }

  useEffect(() => { load(); }, [folder]);

  async function upload(files) {
    if (!files || !files.length) return;
    setUploading(true);

    const fd = new FormData();
    Array.from(files as FileList).forEach((f) => fd.append('file', f as unknown as Blob));
    fd.append('folder', folder || 'uploads');

    try {
      const res = await fetch('/api/media', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { show(data.error || '上传失败', 'err'); return; }
      show(`已上传 ${data.saved.length} 个文件`);
      if (data.errors?.length) show(data.errors[0], 'err');
      load();
    } catch {
      show('上传失败', 'err');
    } finally {
      setUploading(false);
    }
  }

  async function remove(m) {
    if (!confirm(`删除 ${m.filename}？`)) return;
    const res = await fetch(`/api/media?id=${encodeURIComponent(m.id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { show(data.error, 'err'); return; }
    show('已删除');
    load();
  }

  async function saveAlt(m, alt) {
    await fetch('/api/media', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, alt, folder: m.folder, tag: m.tag })
    });
    setMedia((list) => list.map((x) => (x.id === m.id ? { ...x, alt } : x)));
  }

  return (
    <>
      <div className="card">
        <div className="card-h">
          <h3>图片库</h3>
          <span className="sub">{media ? media.length : '…'} 个文件</span>
          <div className="r">
            <select className="inp fld" value={folder} onChange={(e) => setFolder(e.target.value)}>
              <option value="">全部目录</option>
              {folders.map((f) => <option key={f.folder} value={f.folder}>{f.folder} ({f.n})</option>)}
            </select>
            <button className="btn btn-p btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? '上传中…' : '选择文件'}
            </button>
          </div>
        </div>

        <div className="card-b">
          <div
            className={`dz ${dragOver ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              upload(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0f5c4a" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <div className="big">{uploading ? '上传中…' : '拖拽图片到这里，或点击选择'}</div>
            <div className="sm">支持 JPG / PNG / WebP / GIF · 单张最大 8MB · 一次最多 12 张</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
        </div>

        <div className="card-b flush">
          {!media ? (
            <div className="empty"><span className="spin" /></div>
          ) : media.length === 0 ? (
            <div className="empty">
              <div className="t">还没有图片</div>
              <p style={{ fontSize: 13 }}>上传产品图后可在这里管理，并添加到产品</p>
            </div>
          ) : (
            <div className="card-b">
              <div className="mgrid">
                {media.map((m) => (
                  <div key={m.id} className="mi">
                    <div className="mi-img">
                      <img src={m.url} alt={m.alt} />
                      {m.usedBy.length > 0 && <span className="mi-used">被 {m.usedBy.length} 个产品使用</span>}
                    </div>
                    <div className="mi-f">
                      <b title={m.filename}>{m.filename}</b>
                      {m.width > 0 && `${m.width}×${m.height} · `}
                      {Math.round((m.size || 0) / 1024)} KB
                    </div>
                    <div style={{ padding: 8, borderTop: '1px solid #f0f2f4' }}>
                      <input className="inp" defaultValue={m.alt} placeholder="Alt 文本（利于 SEO）"
                        style={{ fontSize: 11.5, padding: '5px 8px' }}
                        onBlur={(e) => e.target.value !== m.alt && saveAlt(m, e.target.value)} />
                      {m.usedBy.length === 0 && (
                        <button className="btn btn-sm btn-d" style={{ width: '100%', marginTop: 6 }}
                          onClick={() => remove(m)}>删除</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="note note-i" style={{ marginTop: 18, marginBottom: 0 }}>
                <b>使用追踪</b>：被产品使用的图片无法删除，避免前台图片缺失。
                Alt 文本会被读屏软件和搜索引擎使用，描述图片内容并自然包含关键词。
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast toast={toast} />
    </>
  );
}