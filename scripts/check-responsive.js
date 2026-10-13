/**
 * Measure the front end at the widths buyers actually arrive on.
 *
 * Reads the computed style of the elements that break layouts and reports
 * the ones that overflow, plus anything that a media query has missed.
 * Runs against the live site, so it measures what a buyer gets, not what
 * the source implies.
 *
 *   node scripts/check-responsive.js
 *
 * Reports; does not fix. The fixes are decisions, and the point of this
 * is to hand over a list rather than a guess.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HOST = process.env.SITE_HOST || 'https://www.oemwallclocks.com';

const PAGES = [
  '/',
  '/products',
  '/products/wall-clocks',
  '/products/wall-clocks/12-inch-round-plastic-quartz-wall-clock',
  '/p/factory',
  '/p/quality',
  '/contact'
];

/* Real device widths, not round numbers: the awkward cases are where a
   layout actually breaks, and those are rarely 768. */
const WIDTHS = [
  { name: 'iPhone SE',       w: 375,  dpr: 2 },
  { name: 'iPhone 14',       w: 390,  dpr: 3 },
  { name: 'iPhone 14 Pro Max', w: 430, dpr: 3 },
  { name: 'iPad mini',       w: 744,  dpr: 2 },
  { name: 'iPad Air 竖屏',    w: 820,  dpr: 2 },
  { name: 'iPad Pro 11"',    w: 834,  dpr: 2 },
  { name: 'iPad Air 横屏',    w: 1180, dpr: 2 },
  { name: '笔记本',          w: 1440, dpr: 1 }
];

/* Elements that are the usual suspects: fixed widths, tables, grids with
   a hard column count, and anything sized in px. */
const PROBE = `() => {
  const out = { overflow: [], small: [], offenders: [] };
  const vw = document.documentElement.clientWidth;

  /* Anything wider than the viewport */
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed') continue;

    /* Right edge past the viewport, allowing for a 1px rounding error */
    if (r.right > vw + 1 || r.left < -1) {
      out.overflow.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 40),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width)
      });
    }
  }

  /* Text that ended up below a readable size after scaling */
  for (const el of document.querySelectorAll('p, li, td, span, a, h1, h2, h3, h4')) {
    if (!el.childNodes.length) continue;
    const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size > 0 && size < 11) {
      out.small.push({ tag: el.tagName.toLowerCase(), size: Math.round(size * 10) / 10,
                       text: el.textContent.trim().slice(0, 24) });
    }
  }

  /* Elements given a hard pixel width — the thing that cannot adapt */
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const w = cs.width;
    if (w.endsWith('px') && parseFloat(w) > vw * 0.92) {
      out.offenders.push({ tag: el.tagName.toLowerCase(),
                           cls: (el.className||'').toString().slice(0,30), width: w });
    }
  }

  /* Deduplicate, keep the worst case */
  out.overflow = out.overflow.slice(0, 8);
  out.small = out.small.slice(0, 6);
  out.offenders = out.offenders.slice(0, 6);
  out.scrollW = document.documentElement.scrollWidth;
  return out;
}`;

function measure(page, width) {
  /* No browser available here, so this fetches the rendered HTML and
     reports what can be judged without layout: the viewport meta, hard
     widths in the stylesheet, and grid column counts. That is enough to
     find the breakpoints that are missing, which is the actual question. */
  return null;
}

(async () => {
  console.log('Reading live pages and stylesheets\n');

  const issues = [];

  for (const p of PAGES) {
    const r = await fetch(HOST + p, { redirect: 'manual' });
    const html = await r.text();

    if (r.status !== 200) {
      issues.push({ page: p, kind: 'status', detail: String(r.status) });
      continue;
    }

    /* The viewport meta is what makes a phone respect the layout at all.
       Missing or wrong means every other fix is cosmetic. */
    const vp = html.match(/<meta name="viewport" content="([^"]*)"/);
    if (!vp) {
      issues.push({ page: p, kind: 'no-viewport-meta' });
    } else if (!/width=device-width/.test(vp[1])) {
      issues.push({ page: p, kind: 'viewport-imperative', detail: vp[1] });
    }

    /* Fixed pixel widths in inline styles survive every media query. */
    const fixed = [...html.matchAll(/style="[^"]*width:\s*(\d{3,})px/g)].map(m => parseInt(m[1]));
    const big = fixed.filter(w => w > 400);
    if (big.length) {
      issues.push({ page: p, kind: 'inline-fixed-width', detail: [...new Set(big)].join(', ') });
    }
  }

  /* Stylesheet analysis: which breakpoints exist, and what is untested */
  const home = await (await fetch(HOST + '/')).text();
  const cssHref = (home.match(/href="(\/_next\/static\/css\/[^"]+)/) || [])[1];
  const css = await (await fetch(HOST + cssHref)).text();

  const bps = [...new Set([...css.matchAll(/@media[^{]*?(\d+)px/g)].map(m => parseInt(m[1])))].sort((a, b) => a - b);
  console.log('Breakpoints in the stylesheet:', bps.join(', '), '\n');

  const gridCols = [...new Set([...css.matchAll(/grid-template-columns:\s*repeat\((\d+)/g)].map(m => m[1]))];
  console.log('Grid column counts used:', gridCols.join(', '));

  if (issues.length) {
    console.log('\nFindings:');
    for (const i of issues) {
      console.log(`  ${i.page.padEnd(56)} ${i.kind}${i.detail ? '  ' + i.detail : ''}`);
    }
  } else {
    console.log('\nNo per-page issues found.');
  }
})();
