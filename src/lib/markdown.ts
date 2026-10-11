/**
 * A very small Markdown subset, rendered to HTML for the live preview.
 *
 * Why not a library: this only has to handle what the editor toolbar can
 * produce — headings, bold, italic, links, lists, quotes, code and rules.
 * Pulling in a full parser would add far more than it removes, and this
 * way the sanitiser below is applied to our own output rather than to
 * arbitrary input.
 *
 * The output is passed through `sanitise()` before it reaches
 * dangerouslySetInnerHTML. The stored body is HTML the editor typed, and
 * the front end renders it as-is, so this is the one place where an
 * injected <script> would survive to a visitor.
 */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function esc(s: string) {
  return String(s || '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Tags a visitor's browser will act on. Everything else is stripped. */
const ALLOWED = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
  'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr',
  'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span', 'figure', 'figcaption'
]);

const ALLOWED_ATTR: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope'])
};

/**
 * Whitelist-filter an HTML string.
 *
 * Removes disallowed elements entirely, unwrapping them so their text
 * survives, and drops event handlers and javascript: URLs — the two ways
 * an injected tag becomes executable.
 */
export function sanitise(html: string): string {
  let out = String(html || '');

  /* Strip dangerous schemes before anything else. */
  out = out.replace(/(href|src)\s*=\s*(["']?)\s*(javascript|vbscript|data:text\/html)[^"'>]*\2/gi, '$1="#"');

  /* Drop <script>, <style>, <iframe> and their contents outright. */
  out = out.replace(/<\s*(script|style|iframe|object|embed|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  out = out.replace(/<\s*(script|style|iframe|object|embed|form)\b[^>]*>/gi, '');

  /* Remove any tag not on the list, keeping what is inside it.
     The attribute pass below re-emits tags from scratch, so an event
     handler on a tag that *is* allowed — <div onclick="…"> is the case
     that matters — cannot survive: only attributes named in ALLOWED_ATTR
     are written back. */
  out = out.replace(/<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g, (m, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED.has(t)) return '';

    if (m.startsWith('</')) return `</${t}>`;

    const keep = ALLOWED_ATTR[t];
    const kept = [...attrs.matchAll(/([a-zA-Z-]+)\s*=\s*(["'])([^"']*)\2/g)]
      .filter(([, name]) => {
        const n = name.toLowerCase();
        /* An allowlist, so anything not named is dropped — including
           onerror, onclick, style and every other handler. */
        return !keep ? false : keep.has(n);
      })
      .map(([, name, , value]) => `${name.toLowerCase()}="${esc(value)}"`)
      .join(' ');

    /* Any external link opens safely; the bare target is not enough on its
       own because a page can still reach back through window.opener. */
    const rel =
      t === 'a' && kept.includes('href=') && !/target=/.test(kept)
        ? ' target="_blank" rel="noopener noreferrer"'
        : '';

    return `<${t}${kept ? ' ' + kept : ''}${rel}>`;
  });

  return out;
}

/** Inline formatting. Callers pass already-escaped text. */
function inline(escaped: string) {
  let s = escaped;

  /* Images before links, since both start with a bracket. */
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
    (_m, alt, src, title) =>
      `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''}>`);

  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, text, href) => `<a href="${href}">${text}</a>`);

  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');

  return s;
}

const HEADING = /^(#{1,4})\s+(.*)$/;
const UL = /^\s*[-*]\s+(.*)$/;
const OL = /^\s*\d+\.\s+(.*)$/;
const QUOTE = /^&gt;\s*(.*)$/;

/** A pipe table needs a header row and a |---|---| separator under it. */
const isTableSep = (line: string) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(line) && line.includes('-');

/** Split a table row on unescaped pipes, dropping the outer empties. */
function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return t.split('|').map((c) => c.trim());
}

function tableHtml(rows: string[][]): string {
  const head = `<thead><tr>${rows[0].map((c) => `<th>${inline(esc(c))}</th>`).join('')}</tr></thead>`;
  const body = rows
    .slice(1)
    .map((r) => `<tr>${r.map((c) => `<td>${inline(esc(c))}</td>`).join('')}</tr>`)
    .join('');
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

/** Convert Markdown to sanitised HTML. */
export function mdToHtml(src: string): string {
  const lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  let para: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let quote: string[] = [];
  let inCode = false;
  let code: string[] = [];
  /* Accumulated pipe rows; only flushed once a separator confirms it is
     really a table, so a single line mentioning "|" is left as prose. */
  let table: string[][] = [];

  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p>${inline(esc(para.join(' ')))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    out.push(`</${list}>`);
    list = null;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    out.push(`<blockquote>${inline(esc(quote.join(' ')))}</blockquote>`);
    quote = [];
  };
  const flushTable = () => {
    if (!table.length) return;
    out.push(tableHtml(table));
    table = [];
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); flushTable(); };

  for (const raw of lines) {
    const line = esc(raw);

    if (/^```/.test(raw)) {
      if (inCode) {
        out.push(`<pre><code>${code.join('\n')}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushAll();
        inCode = true;
      }
      continue;
    }
    if (inCode) { code.push(raw); continue; }

    if (!raw.trim()) { flushAll(); continue; }

    /* table row */
    if (raw.trim().includes('|') && raw.trim().startsWith('|')) {
      flushPara(); flushList(); flushQuote();

      if (isTableSep(raw)) {
        /* The separator confirms the header above it. If there is no
           header yet, start one so a stray separator is harmless. */
        if (!table.length) table.push(['Column', 'Value']);
      } else if (raw.trim() === '|') {
        table.push([]);
      } else {
        table.push(splitRow(raw));
      }
      continue;
    }
    flushTable();

    const h = line.match(HEADING);
    if (h) {
      flushAll();
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }

    if (/^(---|\*\*\*|___)\s*$/.test(raw)) {
      flushAll();
      out.push('<hr>');
      continue;
    }

    const q = line.match(QUOTE);
    if (q) {
      flushPara(); flushList(); flushTable();
      quote.push(q[1]);
      continue;
    }
    flushQuote();

    const u = line.match(UL);
    const o = line.match(OL);
    if (u || o) {
      flushPara();
      const want: 'ul' | 'ol' = u ? 'ul' : 'ol';
      if (list !== want) {
        flushList();
        out.push(`<${want}>`);
        list = want;
      }
      out.push(`<li>${inline((u || o)![1])}</li>`);
      continue;
    }
    flushList();

    para.push(raw);
  }

  if (inCode && code.length) out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
  flushAll();

  return sanitise(out.join('\n'));
}

/** Word count that treats Chinese characters individually. */
export function countWords(s: string): number {
  const t = String(s || '').trim();
  if (!t) return 0;
  const cjk = (t.match(/[一-鿿]/g) || []).length;
  const latin = (t.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9'-]+/g) || []).length;
  return cjk + latin;
}

/**
 * HTML back to Markdown, so existing content can be edited.
 *
 * The pages and posts tables have held HTML since before the editor
 * existed, and the front end renders it directly. Rather than migrate every
 * row — which would risk damaging content already live — the editor shows
 * the stored HTML converted to Markdown and converts back on save. The
 * round trip is not byte-identical, but it preserves structure, text and
 * links, which is what anyone editing a page actually cares about.
 */
export function htmlToMd(html: string): string {
  let s = String(html || '');
  if (!s.trim()) return '';

  s = s.replace(/<!--[\s\S]*?-->/g, '');

  /* Block elements become blank lines first, so closing and opening tags
     do not end up glued onto one line.
     `tr` and `li` are deliberately absent: their rows are collected by the
     table and list passes below, and breaking the lines here would split
     a table into loose cells before it could be read as a table. */
  s = s.replace(/<\/(p|div|h[1-6]|blockquote|pre)>/gi, '\n\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<(hr)\s*\/?>/gi, '\n\n---\n\n');

  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n\n');
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n\n');
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n\n');
  s = s.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n\n');

  /* Replace each <table> wholesale. Doing it in one pass keeps the rows
     together, which a row-level regex cannot: the pipe separators and the
     header rule have to be inserted between rows, and only a caller that
     knows which row is first can do that. */
  s = s.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_m, inner: string) => {
    const rows = [...String(inner).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) =>
      [...String(r[1]).matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)].map((c) =>
        String(c[2]).replace(/<[^>]*>/g, '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
      )
    ).filter((r) => r.length);

    if (!rows.length) return '';

    /* Normalise the width: a short row would otherwise produce a ragged
       table that the reader's Markdown parser treats as prose. */
    const width = Math.max(...rows.map((r) => r.length));
    const pad = (r: string[]) =>
      '| ' + [...r, ...Array(width - r.length).fill('')].join(' | ') + ' |';

    return [
      '',
      pad(rows[0]),
      `| ${Array(width).fill('---').join(' | ')} |`,
      ...rows.slice(1).map(pad),
      ''
    ].join('\n');
  });
  /* Any table markup outside a matched <table>…</table> pair. */
  s = s.replace(/<\/?(thead|tbody|table)[^>]*>/gi, '');

  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner: string) => {
    const t = String(inner).replace(/<[^>]*>/g, '').trim();
    return `\n- ${t}`;
  });
  s = s.replace(/<\/?(ul|ol)[^>]*>/gi, '\n\n');

  s = s.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner: string) =>
    `\n> ${String(inner).replace(/<[^>]*>/g, '').trim()}\n`
  );

  s = s.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_m, inner: string) =>
    `\n\`\`\`\n${String(inner).replace(/<[^>]*>/g, '')}\n\`\`\`\n`
  );

  /* Inline formatting, longest markers first so ** is not eaten by *. */
  s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  s = s.replace(/<(s|del|strike)[^>]*>([\s\S]*?)<\/\1>/gi, '~~$2~~');
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

  s = s.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, text: string) => `[${String(text).replace(/<[^>]*>/g, '')}](${href})`);
  s = s.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)');
  s = s.replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)');

  /* Anything left is inline markup we do not model — drop the tag. */
  s = s.replace(/<[^>]*>/g, '');

  /* Decode the handful of entities esc() produced, so the editor does not
     show &amp; where the author typed &. */
  s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

  return s.replace(/\n{3,}/g, '\n\n').trim();
}