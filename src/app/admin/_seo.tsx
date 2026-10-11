'use client';

/**
 * SEO block for an editor.
 *
 * Three things matter to someone writing a page and none of them are
 * visible without this component:
 *
 *   1. What the admin typed overrides the generated title. Everywhere else
 *      the page builds its own; here the editor is in charge.
 *   2. Google truncates a title past ~60 characters and drops a
 *      description past ~160. The counters show the budget being spent, so
 *      being cut off is a choice rather than a surprise.
 *   3. The preview shows the result. People write very different copy when
 *      they can see what a reader will actually get.
 */

export type SeoProps = {
  value: { title: string; description: string };
  onChange: (v: { title: string; description: string }) => void;
  /* What the page will fall back to when both fields are blank. Shown as a
     hint so the writer knows the baseline they are overriding. */
  fallbackTitle?: string;
  fallbackDescription?: string;
  path?: string;
  previewImage?: string;
  keywords?: string;
  onKeywordsChange?: (v: string) => void;
};

const TITLE_MAX = 60;
const DESC_MAX = 160;

/** Strip tags and collapse whitespace before measuring. */
function text(s: string) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function SeoBox({
  value,
  onChange,
  fallbackTitle = '',
  fallbackDescription = '',
  path = '',
  previewImage,
  keywords,
  onKeywordsChange
}: SeoProps) {
  const t = text(value.title);
  const d = text(value.description);

  const shownTitle = t || text(fallbackTitle);
  const shownDesc = d || text(fallbackDescription);
  const cutTitle = shownTitle.length > TITLE_MAX;
  const cutDesc = shownDesc.length > DESC_MAX;

  return (
    <div className="seo-box">
      <div className="seo-fields">
        <div className="fg">
          <label className="fl">
            搜索标题
            <span className="hint">留空则自动生成</span>
          </label>
          <input
            className="inp"
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value })}
            placeholder={text(fallbackTitle).slice(0, TITLE_MAX) || '页面标题'}
          />
          <div className={`cnt ${text(fallbackTitle) && !t ? 'cnt-auto' : ''}`}>
            {t.length}/{TITLE_MAX}
            {cutTitle && <b> 会被 Google 截断</b>}
            {!t && text(fallbackTitle) && ' · 使用自动生成'}
          </div>
        </div>

        <div className="fg">
          <label className="fl">
            搜索描述
            <span className="hint">留空则自动生成</span>
          </label>
          <textarea
            className="inp"
            rows={2}
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            placeholder={text(fallbackDescription).slice(0, DESC_MAX) || '页面描述'}
          />
          <div className={`cnt ${text(fallbackDescription) && !d ? 'cnt-auto' : ''}`}>
            {d.length}/{DESC_MAX}
            {cutDesc && <b> 会被 Google 截断</b>}
            {!d && text(fallbackDescription) && ' · 使用自动生成'}
          </div>
        </div>

        {onKeywordsChange && (
          <div className="fg">
            <label className="fl">
              关键词
              <span className="hint">逗号分隔</span>
            </label>
            <input
              className="inp"
              value={keywords || ''}
              onChange={(e) => onKeywordsChange(e.target.value)}
              placeholder="wall clock manufacturer, wholesale wall clock"
            />
          </div>
        )}
      </div>

      {/* Rendered the way a result looks, so the copy can be judged before
          it ships rather than after a week of waiting. */}
      <div className="seo-side">
        <div className="help">搜索结果预览</div>
        <div className="serp">
          <div className="serp-url">badoudao-site.pages.dev{path}</div>
          <div className="serp-title">{shownTitle || '（未设置标题）'}</div>
          <div className="serp-desc">
            {shownDesc || '（未设置描述）'}
          </div>
        </div>
        {previewImage && (
          <div className="serp">
            <div className="help" style={{ marginBottom: 6 }}>分享卡片</div>
            <img className="serp-img" src={previewImage} alt="" />
          </div>
        )}
      </div>
    </div>
  );
}
