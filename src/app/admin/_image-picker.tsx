'use client';

/**
 * Image picker for the markdown editor.
 *
 * The toolbar's image button used to insert a literal placeholder —
 * ![alt text](/media/folder/image.jpg) — which is a line of code, not an
 * image. Someone publishing an article got a broken picture on a live page
 * and no indication of what to do about it, because nothing in the editor
 * ever asked them for a file.
 *
 * This asks for a file. It shows the media library, and offers an upload for
 * the common case where the picture does not exist there yet — an editor
 * writing about a factory visit wants to drop the photo in and carry on,
 * not to go and create it somewhere else first and come back.
 */
import { useEffect, useRef, useState } from 'react';

type Media = {
  id: string;
  filename: string;
  url: string;
  alt?: string;
  folder?: string;
  width?: number;
  height?: number;
  /* Set by the upload route when an image is not 1:1. Present on the POST
     response, absent on GET — hence optional rather than two types. */
  notice?: string;
};

export function ImagePicker({
  open,
  onClose,
  onPick
}: {
  open: boolean;
  onClose: () => void;
  onPick: (m: { url: string; alt: string }) => void;
}) {
  const [media, setMedia] = useState<Media[] | null>(null);
  const [q, setQ] = useState('');
  const [alt, setAlt] = useState('');
  const [picked, setPicked] = useState<Media | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  /* A note rather than a failure — the upload worked. Sharing one variable
     made "not square" render in the same red as a rejected file. */
  const [warn, setWarn] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setErr('');
    setWarn('');
    fetch('/api/media')
      .then((r) => r.json())
      .then((d) => setMedia(d.media || []))
      .catch(() => setMedia([]));
  }, [open]);

  /* Escape closes, and the body does not scroll behind the sheet. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const shown = (media || []).filter((m) =>
    !q || m.filename.toLowerCase().includes(q.toLowerCase())
  );

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    setErr('');
    setWarn('');

    const form = new FormData();
    Array.from(files).forEach((f) => form.append('file', f));
    form.append('folder', 'uploads');

    try {
      const r = await fetch('/api/media', { method: 'POST', body: form });
      const d = await r.json();

      if (!r.ok) {
        setErr(d.error || '上传失败');
        return;
      }
      /* The route returns { ok, saved, errors }. It did not return `media`,
         so the upload appeared to succeed and then failed on a missing url
         — the file was in the library the whole time, just not in the
         response. Read `saved`; `errors` is per-file, so a batch with one
         rejected file still returns the ones that worked. */
      const added: Media[] = Array.isArray(d.saved) ? d.saved : [];

      if (!added.length) {
        const why = Array.isArray(d.errors) && d.errors.length
          ? d.errors[0]?.error || d.errors[0]
          : d.error;
        setErr(why ? `上传失败：${why}` : '上传失败，请重试');
        return;
      }

      /* A batch can partially succeed. Say so rather than silently showing
         only the files that worked. */
      const failed = Array.isArray(d.errors) ? d.errors.length : 0;
      if (failed) setErr(`${added.length} 张上传成功，${failed} 张失败`);
      else setWarn('');

      /* The route flags images that are not 1:1, because the main image
         slot on a product prefers square. In an article the shape does not
         matter the same way, but a 2000x300 phone photo in a four-column
         grid does look wrong, so the warning is worth passing on. */
      const warned = added.find((m) => m.notice)?.notice;
      if (!failed && warned) setWarn(warned);

      setMedia((old) => [...added, ...(old || [])]);
      setPicked(added[0]);
      /* Pre-fill the alt from the filename: a buyer-facing article whose
         images have no alt is unreadable with a screen reader, and typing it
         by hand is the step people skip. */
      setAlt((a) => a || added[0].filename.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' '));
    } catch {
      setErr('上传失败，请重试');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function confirm() {
    if (!picked) return;
    onPick({ url: picked.url, alt: alt.trim() });
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(12,14,16,.55)',
        display: 'grid', placeItems: 'center', padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="ipk"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="插入图片"
      >
        <div className="ipk-h">
          <h3>{picked ? '插入这张图片' : '选择图片'}</h3>
          <button type="button" className="btn btn-sm" onClick={onClose}>×</button>
        </div>

        {picked ? (
          <div className="ipk-b">
            <img src={picked.url} alt="" className="ipk-preview" />

            <label className="fld" style={{ marginTop: 14 }}>
              <span>替代文字（alt）</span>
              <input
                className="inp" value={alt} autoFocus
                placeholder="描述这张图，读屏软件会念出来"
                onChange={(e) => setAlt(e.target.value)}
              />
              <small>留空则用「图片」两字。写清楚比留空好。</small>
            </label>

            <div className="ipk-row">
              <button type="button" className="btn" onClick={() => setPicked(null)}>
                重新选择
              </button>
              <button type="button" className="btn btn-primary" onClick={confirm}>
                插入
              </button>
            </div>
          </div>
        ) : (
          <div className="ipk-b">
            <div className="ipk-bar">
              <input
                className="inp" value={q} placeholder="按文件名筛选"
                onChange={(e) => setQ(e.target.value)}
              />
              <input
                ref={fileRef} type="file" accept="image/*" multiple hidden
                onChange={(e) => upload(e.target.files)}
              />
              <button
                type="button" className="btn btn-primary"
                disabled={uploading} onClick={() => fileRef.current?.click()}
              >
                {uploading ? '上传中…' : '上传新图片'}
              </button>
            </div>

            {err ? <p className="ipk-err">{err}</p> : null}
            {warn ? <p className="ipk-warn">{warn}</p> : null}

            {media === null ? (
              <p style={{ color: 'var(--ink3)', fontSize: 13.5, padding: '20px 0' }}>
                读取图片库…
              </p>
            ) : shown.length === 0 ? (
              <p style={{ color: 'var(--ink3)', fontSize: 13.5, padding: '20px 0' }}>
                {q
                  ? `没有文件名包含「${q}」的图片。`
                  : '图片库还是空的。点右上角「上传新图片」，或者先到图片库批量上传。'}
              </p>
            ) : (
              <div className="mgrid" style={{ maxHeight: 380, overflowY: 'auto' }}>
                {shown.map((m) => (
                  <div key={m.id} className="mi" onClick={() => { setPicked(m); setAlt(m.alt || ''); }}>
                    <div className="mi-img"><img src={m.url} alt="" loading="lazy" /></div>
                    <div className="mi-f"><b>{m.filename}</b></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}