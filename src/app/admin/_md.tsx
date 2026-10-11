'use client';

import { useMemo, useRef, useState } from 'react';
import { mdToHtml, countWords } from '@/lib/markdown';

/**
 * Markdown editor with a live preview.
 *
 * A rich-text editor was the alternative and was rejected: it emits
 * inline-styled HTML that bloats the page and confuses search engines,
 * it is a large dependency, and its table handling is worse than the
 * helper here. The content is prose, headings, lists and specification
 * tables — Markdown covers that in a few hundred lines.
 *
 * The preview runs through the same `sanitise()` the front end relies on,
 * so what the writer sees is what a visitor gets, script tags included
 * (that is, stripped).
 */

/* A tool returns the rewritten text plus where the caret should land, so
   the selection ends up inside the markup rather than after it. */
type Selection = { text: string; from: number; to: number };

type Tool = {
  key: string;
  label: string;
  title: string;
  run: (sel: Selection) => Selection;
  block?: boolean;
};

/* Wrapping rather than replacing: the selected text is what the reader
   came for, and replacing it with a bold marker loses the words. */
function wrap(text: string, from: number, to: number, before: string, after = before): Selection {
  const sel = text.slice(from, to);
  const pad = before === after ? ' ' : '';
  return {
    text: text.slice(0, from) + before + sel + after + pad + text.slice(to),
    from: from + before.length,
    to: from + before.length + sel.length
  };
}

const TOOLS: Tool[] = [
  { key: 'h2', label: 'H2', title: '小标题', run: (s) => wrap(s.text, s.from, s.to, '## ', '') },
  { key: 'h3', label: 'H3', title: '次级标题', run: (s) => wrap(s.text, s.from, s.to, '### ', '') },
  {
    key: 'bold', label: 'B', title: '加粗',
    run: (s) => wrap(s.text, s.from, s.to, '**'),
  },
  {
    key: 'em', label: 'I', title: '斜体',
    run: (s) => {
      /* _italic_ and **bold** collide on the underscore; use * so a
         selection that already sits inside bold is not re-parsed. */
      const out = wrap(s.text, s.from, s.to, '*');
      return out;
    }
  },
  {
    key: 'link', label: '🔗', title: '插入链接',
    run: (s) => {
      const sel = s.text.slice(s.from, s.to) || 'link text';
      const t = `[${sel}](https://)`;
      return { text: s.text.slice(0, s.from) + t + s.text.slice(s.to), from: s.from + 1, to: s.from + 1 + sel.length };
    }
  },
  {
    key: 'img', label: '🖼', title: '插入图片',
    run: (s) => {
      const t = '![alt text](/media/folder/image.jpg)';
      return { text: s.text.slice(0, s.from) + t + s.text.slice(s.to), from: s.from, to: s.from + t.length };
    }
  },
  { key: 'ul', label: '• 列表', title: '无序列表', run: (s) => ({ text: prefixLines(s.text, s.from, s.to, '- '), from: s.from, to: s.to }), block: true },
  { key: 'ol', label: '1. 列表', title: '有序列表', run: (s) => ({ text: prefixLines(s.text, s.from, s.to, '1. '), from: s.from, to: s.to }), block: true },
  { key: 'quote', label: '❝', title: '引用', run: (s) => ({ text: prefixLines(s.text, s.from, s.to, '> '), from: s.from, to: s.to }), block: true },
  { key: 'table', label: '表格', title: '插入表格', run: (s) => ({ text: insertTable(s.text, s.from), from: s.from, to: s.to }), block: true }
];

function prefixLines(text: string, from: number, to: number, prefix: string) {
  if (from === to) {
    /* No selection: start a new block on its own line. */
    const atLineStart = from === 0 || text[from - 1] === '\n';
    const p = (atLineStart ? '' : '\n') + prefix;
    return text.slice(0, from) + p + text.slice(from);
  }
  const start = text.lastIndexOf('\n', from - 1) + 1;
  const endIdx = text.indexOf('\n', to);
  const end = endIdx === -1 ? text.length : endIdx;
  const block = text.slice(start, end);
  const next = block
    .split('\n')
    .map((l) => (l.startsWith(prefix) ? l : prefix + l))
    .join('\n');
  return text.slice(0, start) + next + text.slice(end);
}

function insertTable(text: string, at: number) {
  const t =
    '\n| Specification | Value |\n| --- | --- |\n| Size | 12 inch |\n| Movement | Quartz |\n| MOQ | 500 pcs |\n';
  return text.slice(0, at) + t + text.slice(at);
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = 380
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  const html = useMemo(() => mdToHtml(value), [value]);
  const words = countWords(value);

  function apply(tool: Tool) {
    const el = ref.current;
    if (!el) return;
    const from = el.selectionStart;
    const to = el.selectionEnd;
    const out = tool.run({ text: value, from, to });
    onChange(out.text);

    /* Restore the caret after React has written the new value. */
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(out.from, out.to);
    });
  }

  return (
    <div className="md">
      <div className="md-bar">
        <div className="md-tools">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              type="button"
              className="md-btn"
              title={t.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(t)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="md-tabs">
          <button type="button" className={`md-tab ${tab === 'write' ? 'on' : ''}`}
            onClick={() => setTab('write')}>编辑</button>
          <button type="button" className={`md-tab ${tab === 'preview' ? 'on' : ''}`}
            onClick={() => setTab('preview')}>预览</button>
        </div>
      </div>

      <div className="md-panes">
        <textarea
          ref={ref}
          className="md-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight, display: tab === 'write' ? 'block' : 'none' }}
        />

        {/* Kept mounted and hidden rather than unmounted, so switching back
            does not lose the textarea's scroll position. */}
        <div className="md-preview"
          style={{ minHeight, display: tab === 'preview' ? 'block' : 'none' }}
          dangerouslySetInnerHTML={{ __html: html || '<p class="md-empty">还没有内容，左侧开始写。</p>' }}
        />
      </div>

      <div className="md-foot">
        <span>{words} 词</span>
        <span className="md-hint">支持 Markdown：## 标题、**粗体**、- 列表、[链接](url)、表格</span>
      </div>
    </div>
  );
}
