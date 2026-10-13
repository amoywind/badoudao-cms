import fs from 'node:fs';
import { htmlToMd } from '../src/lib/markdown.ts';

/* Pull a page body out of D1 and print it as Markdown, so a page damaged
   by the htmlToMd heading bug can be rewritten from readable text rather
   than patched. Editing the damaged HTML fixes what is visible and leaves
   the nesting behind — <p>…<h3>…</h3>…</p> — which the browser resolves by
   closing the paragraph itself, so the document keeps saying something the
   source never intended.

   Usage: node scripts/dump-page-md.js <page-id>
*/
const id = process.argv[2];
if (!id) { console.log('用法: node scripts/dump-page-md.js <page-id>'); process.exit(2); }

const TOKEN = fs.readFileSync(
  'D:/website/workbuddy/badoudao-cms/.dev.vars', 'utf8'
).match(/^(?:CLOUDFLARE_)?API_TOKEN=(.+)$/m)[1].trim();

const res = await fetch(
  'https://api.cloudflare.com/client/v4/accounts/086d893ed76ae09ae6abac33113d7eab/d1/database/aba203a7-d49a-4c93-b4f9-aa931aa219c7/query',
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sql: `SELECT body FROM pages WHERE id = '${String(id).replace(/'/g, "''")}'`
    })
  }
);
const r = await res.json();
const rows = r.result?.[0]?.results ?? [];
if (!rows.length) { console.log('找不到该页面'); process.exit(2); }

/* Strip the damage first: an <hN> sitting inside a <p> is lifted out, then
   the now-empty paragraphs go, then the normal conversion runs. */
let html = String(rows[0].body);

html = html.replace(/<p>\s*(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)\s*([\s\S]*?)<\/p>/gi,
  (_m, head, tail) => (String(tail).trim() ? `${head}\n<p>${tail}</p>` : head));
html = html.replace(/<\/h[1-6]>\s*<h([1-6])/gi, '</h$1>\n<h$1');
html = html.replace(/<\/(h[1-6])>\s*(?!<p|<h|<ul|<ol|<blockquote|<table)/gi, '</$1>\n\n');

const md = htmlToMd(html);

/* Headings must not carry a stray bold run left by the original damage. */
const clean = md
  .replace(/^(\#{1,6}\s+)\*\*(.+?)\*\*\s*$/gm, '$1$2')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

console.log(clean);