'use client';

import { Fragment, useMemo, useRef, useState, useCallback } from 'react';
import { mdToHtml, countWords } from '@/lib/markdown';
import { ImagePicker } from './_image-picker';

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
  /* A picker tool opens a dialog instead of editing the text, so it has no
     run. Only one exists — the image button. */
  run?: (sel: Selection) => Selection;
  opensPicker?: boolean;
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

/* Replace the block prefix on every line of the selection: the toolbar
   button for a heading has to win over whatever heading is already there,
   or pressing H2 on an H3 does nothing visible. */
function setLinePrefix(text: string, from: number, to: number, prefix: string, strip = /^(#{1,6}\s+|>\s+|[-*+]\s+|\d+\.\s+)/): Selection {
  const start = text.lastIndexOf('\n', from - 1) + 1;
  const endIdx = text.indexOf('\n', to);
  const end = endIdx === -1 ? text.length : endIdx;

  const block = text.slice(start, end);
  const next = block
    .split('\n')
    .map((l) => prefix + l.replace(strip, ''))
    .join('\n');

  return {
    text: text.slice(0, start) + next + text.slice(end),
    from: start,
    to: start + next.length
  };
}

/* Move whole lines up or down, which is the operation a writer reaches for
   when a paragraph is in the wrong place and retyping it is worse. */
function moveLines(text: string, from: number, to: number, dir: -1 | 1): Selection {
  const lines = text.split('\n');

  /* Line index of the caret's start and the end of the selection. */
  let first = 0, acc = 0;
  for (let i = 0; i < lines.length; i++) {
    if (acc + lines[i].length + 1 > from) { first = i; break; }
    acc += lines[i].length + 1;
  }
  let last = first, acc2 = 0;
  for (let i = 0; i < lines.length; i++) {
    if (acc2 + lines[i].length + 1 > to) { last = i; break; }
    acc2 += lines[i].length + 1;
  }

  const target = dir === -1 ? first - 1 : last + 1;
  if (target < 0 || target >= lines.length) {
    /* At the edge: return the selection unchanged rather than silently
       doing nothing, so the caret does not jump. */
    return { text, from, to };
  }

  const block = lines.splice(first, last - first + 1);
  lines.splice(target, 0, ...block);

  const next = lines.join('\n');
  /* Keep the caret on the same words it was on. */
  const offset = (next.slice(0, target).match(/\n/g) || []).length;
  const shift = dir === -1 ? -1 : block.length;

  return { text: next, from: from + shift, to: to + shift + offset * 0 };
}

/* Insert a hard line break inside the current paragraph.
   Two trailing spaces followed by a newline is what Markdown reads as a
   break; a bare newline is just a space, which is why the writer needs a
   button for this at all rather than pressing Return. */
function insertBreak(text: string, at: number): Selection {
  const before = text.slice(0, at);
  /* Already at the start of a line: there is nothing to break away from. */
  const atLineStart = at === 0 || text[at - 1] === '\n';
  if (atLineStart) return { text, from: at, to: at };

  const t = '  \n';
  return {
    text: before + t + text.slice(at),
    from: at + t.length,
    to: at + t.length
  };
}

const TOOLS: Tool[] = [
  { key: 'h2', label: 'H2', title: '小标题', run: (s) => setLinePrefix(s.text, s.from, s.to, '## ') },
  { key: 'h3', label: 'H3', title: '次级标题', run: (s) => setLinePrefix(s.text, s.from, s.to, '### ') },
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
  { key: 'strike', label: 'S̶', title: '删除线', run: (s) => wrap(s.text, s.from, s.to, '~~') },
  {
    key: 'code', label: '</>', title: '行内代码',
    run: (s) => wrap(s.text, s.from, s.to, '`')
  },
  {
    key: 'link', label: '🔗', title: '插入链接',
    run: (s) => {
      const sel = s.text.slice(s.from, s.to) || 'link text';
      const t = `[${sel}](https://)`;
      /* Select the label, not the URL: that is what has to be typed. */
      return { text: s.text.slice(0, s.from) + t + s.text.slice(s.to), from: s.from + 1, to: s.from + 1 + sel.length };
    }
  },
  {
    key: 'img', label: '🖼', title: '插入图片',
    /* No `run`: this button opens the picker rather than editing the text.
       It used to insert ![alt text](/media/folder/image.jpg) — a line of
       code that renders as a broken image on a published page, with nothing
       in the editor asking for a file. */
    opensPicker: true
  },
  { key: 'br', label: '↵', title: '段内换行', run: (s) => insertBreak(s.text, s.to), block: true },
  { key: 'ul', label: '• 列表', title: '无序列表', run: (s) => setLinePrefix(s.text, s.from, s.to, '- ') },
  { key: 'ol', label: '1. 列表', title: '有序列表', run: (s) => setLinePrefix(s.text, s.from, s.to, '1. ') },
  { key: 'quote', label: '❝', title: '引用', run: (s) => setLinePrefix(s.text, s.from, s.to, '> ') },
  { key: 'hr', label: '—', title: '分隔线', run: (s) => ({ text: prefixLines(s.text, s.from, s.to, '---\n'), from: s.from, to: s.to }), block: true },
  { key: 'table', label: '表格', title: '插入表格', run: (s) => ({ text: insertTable(s.text, s.from), from: s.from, to: s.to }), block: true },
  { key: 'up', label: '↑', title: '上移一行', run: (s) => moveLines(s.text, s.from, s.to, -1), block: true },
  { key: 'down', label: '↓', title: '下移一行', run: (s) => moveLines(s.text, s.from, s.to, 1), block: true }
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

/* Where a group begins, by index into TOOLS. Kept next to the list so
   adding a tool does not silently land it in the wrong group. */
const GROUP_STARTS = new Set([2, 5, 10, 12, 14]);

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
  const [picking, setPicking] = useState(false);
  /* Where the caret was when the picker opened. The dialog moves focus, so
     without this the image lands at position 0. */
  const caretRef = useRef<number>(0);

  const html = useMemo(() => mdToHtml(value), [value]);
  const words = countWords(value);

  function apply(tool: Tool) {
    const el = ref.current;
    if (!el) return;

    if (tool.opensPicker) {
      caretRef.current = el.selectionStart ?? value.length;
      setPicking(true);
      return;
    }
    if (!tool.run) return;

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

  /* The caret has to be captured before the dialog opens, because clicking
     into the picker collapses the textarea's selection. */
  const insertImage = useCallback((img: { url: string; alt: string }) => {
    const el = ref.current;
    const text = value;
    /* Newline before and after: a bare ![](x) between two paragraphs is
       absorbed into the previous line by most markdown renderers, and the
       image ends up inside the paragraph above it. */
    const snippet = `\n\n![${img.alt || '图片'}](${img.url})\n\n`;
    const at = Math.min(caretRef.current, text.length);

    onChange(text.slice(0, at) + snippet + text.slice(at));

    /* Put the caret on the blank line after the image. */
    const next = at + snippet.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next, next);
    });
  }, [value, onChange]);

  return (
    <div className="md">
      <div className="md-bar">
        <div className="md-tools">
          {TOOLS.map((t, i) => (
            <Fragment key={t.key}>
              {/* A hairline at each group boundary: headings, inline
                  formatting, insert, block, move. */}
              {GROUP_STARTS.has(i) && i !== 0 && <span className="md-sep" aria-hidden="true" />}
              <button
                type="button"
                className="md-btn"
                title={t.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => apply(t)}
              >
                {t.label}
              </button>
            </Fragment>
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
        <span className="md-hint">支持 Markdown：## 标题、**粗体**、- 列表、[链接](url)、表格、段内换行用 ↵</span>
      </div>

      <ImagePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={insertImage}
      />
    </div>
  );
}
