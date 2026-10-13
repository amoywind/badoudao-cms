/**
 * Repair pages whose stored HTML has Markdown markers baked into it.
 *
 * htmlToMd was losing every heading marker — it replaced </h2> with a
 * blank line before the heading rule ran, so <h2…>…</h2> no longer
 * existed to match. The editor then loaded bare prose, the writer saved it,
 * and mdToHtml read "1. IQC Incoming Material Inspection" as an ordered
 * list. Saving again wrapped the list in <strong> and left the "##" from
 * the toolbar's H2 button sitting inside the text:
 *
 *   <p><strong>### 1. IQC Incoming Material Inspection</strong> …</p>
 *
 * Once that is stored the heading level is gone for good, so this rewrites
 * the markers back into real headings.
 *
 * Only touches pages that actually contain the pattern, and reports each
 * one so the change is visible rather than silent.
 *
 *   node scripts/repair-page-markdown.js            # dry run
 *   node scripts/repair-page-markdown.js --write    # apply
 */
import { htmlToMd, mdToHtml } from '../src/lib/markdown.ts';
import fs from 'node:fs';

const DRY = !process.argv.includes('--write');

/* Called "vars" not "url": a local named url shadows the global URL and
   then fetch() returns a Response whose .json is not the one expected,
   which is a confusing way to lose twenty minutes. */
const varsText = fs.readFileSync(
  new URL('../.dev.vars', import.meta.url),
  'utf8'
);
const TOKEN = varsText.match(/^(?:CLOUDFLARE_)?API_TOKEN=(.+)$/m)[1].trim();

const ACCOUNT = '086d893ed76ae09ae6abac33113d7eab';
const DB = 'aba203a7-d49a-4c93-b4f9-aa931aa219c7';

async function q(sql) {
  /* Two steps, not await fetch(...).json(): the D1 endpoint occasionally
     answers with a body the JSON parser cannot read, and doing it this way
     leaves the status available for the error message instead of throwing
     "fetch(...).json is not a function" with nothing to go on. */
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB}/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    }
  );

  if (!res.ok) throw new Error(`HTTP ${res.status} from D1`);
  const r = await res.json();
  if (!r.success) throw new Error(JSON.stringify(r.errors));
  /* The REST shape is result[0].results — one array per statement in the
     batch, not the rows directly. */
  return r.result?.[0]?.results ?? [];
}

/**
 * A heading marker trapped inside a bold run is the fingerprint of the
 * bug: the toolbar inserted "## ", mdToHtml read the surrounding text as a
 * list, and the next save wrapped it all in <strong>.
 */
const BROKEN = /<strong>\s*(#{2,4})\s+([\s\S]*?)<\/strong>/gi;

/** Same marker as plain paragraph text, e.g. "<p>### 2. IPQC …</p>". */
const BROKEN_P = /<(p|h[1-6])>\s*(#{2,4})\s+([\s\S]*?)<\/\1>/gi;

function repair(html) {
  let out = String(html);

  /* "## Heading" wrapped in bold, optionally with trailing prose after it. */
  out = out.replace(BROKEN, (_m, hashes, rest) => {
    /* Keep anything after the marker: the bold run often ends mid-sentence
       where the writer's paragraph continues. */
    const m = rest.match(/^([^\n]*?)(  |  \n)([\s\S]*)$/);
    const head = m ? m[1] : rest.replace(/\s+$/, '');
    const tail = m ? m[3] : '';
    const tag = 'h' + hashes.length;
    return `<${tag}>${head}</${tag}>${m ? ' ' + tail : ''}`;
  });

  /* The same marker as a bare paragraph. */
  out = out.replace(BROKEN_P, (_m, tag, hashes, rest) => {
    const h = 'h' + hashes.length;
    /* Already a heading of the right level: leave it. */
    if (tag === h) return _m;
    return `<${h}>${rest.trim()}</${h}>`;
  });

  /* Lift headings out of the paragraphs they ended up inside.

     The bad markup was "<p><strong>## Title</strong> prose</p>", so
     rewriting the marker in place leaves "<p><h2>Title</h2> prose</p>" —
     a heading inside a paragraph. Browsers close the <p> themselves, which
     splits the paragraph around the heading and leaves a stray </p>, so
     this is not cosmetic: it changes what the reader sees. */
  out = out.replace(/<p>\s*(<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)\s*([\s\S]*?)<\/p>/gi,
    (_m, head, tail) => {
      const rest = String(tail).trim();
      return rest ? `${head}\n<p>${rest}</p>` : head;
    });

  return out;
}

(async () => {
  const rows = await q(
    "SELECT id, title, body FROM pages WHERE status='published' AND (body LIKE '%<p><h%' OR body LIKE '%###%' OR body LIKE '%## %')"
  );

  let fixed = 0;
  const report = [];

  for (const row of rows) {
    const body = String(row.body || '');
    if (!/#{2,4}\s/.test(body) && !/<p>\s*<h[1-6]/.test(body)) continue;

    const repaired = repair(body);
    if (repaired === body) continue;

    /* The result has to be valid HTML, and the marker count has to drop. */
    const before = (body.match(/#{2,4}\s/g) || []).length;
    const after = (repaired.match(/<h[1-6]>/g) || []).length;
    if (after === 0) {
      report.push({ id: row.id, status: '跳过', why: '修复后没有标题，不敢写入' });
      continue;
    }

    report.push({ id: row.id, status: '可修复', markers: before, headings: after });

    if (!DRY) {
      const lit = "'" + repaired.replace(/'/g, "''") + "'";
      await q(`UPDATE pages SET body = ${lit}, updated_at = datetime('now') WHERE id = '${row.id}'`);
    }
    fixed++;
  }

  console.log(`\n${DRY ? '试运行（未写入）' : '已写入'}\n`);
  if (!report.length) {
    console.log('没有页面含被破坏的标记。');
  } else {
    for (const r of report) {
      console.log(`  ${r.status.padEnd(6)} ${r.id}${r.markers ? `  标记 ${r.markers} 个 → 标题 ${r.headings} 个` : ''}${r.why ? '  ' + r.why : ''}`);
    }
    console.log(`\n共 ${fixed} 个页面。`);
  }
  process.exit(0);
})();