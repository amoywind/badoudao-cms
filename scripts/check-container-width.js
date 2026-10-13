const fs = require('fs');
const css = fs.readFileSync('src/app/globals.css', 'utf8');

/*
 * A grid or flex container with a max-width but no width sizes itself to
 * its content, not to the viewport.
 *
 * That is fine for a text column and wrong for anything containing an
 * image: a 1400px hero photo inside a `max-width:1200px; margin:0 auto`
 * container makes the container 1400px wide, so on a 390px phone the
 * column never becomes 390px and the text runs off the right edge. The
 * media queries that follow are all correct and all ignored.
 *
 * The fix is `width:100%` alongside max-width. This check finds the
 * containers that are missing it.
 */
const RULES = [
  ['.wrap', '.wrap {'],
  ['.hero .wrap', '.hero .wrap {'],
  ['.cta .wrap', '.cta .wrap {'],
  ['.split', '.split {'],
  ['.pd', '.pd {'],
  ['.quality-layout', '.quality-layout {']
];

let bad = 0;
console.log('=== 网格容器的宽度声明 ===\n');

for (const [name, open] of RULES) {
  const i = css.indexOf(open);
  if (i < 0) { console.log(`  --  ${name.padEnd(18)} 未在 globals.css 定义`); continue; }
  const body = css.slice(i, css.indexOf('}', i));
  const hasMax = /max-width:/.test(body);
  const hasWidth = /(^|[;{\s])width:/.test(body);
  const isGrid = /display:\s*grid|grid-template/.test(body);

  if (isGrid && hasMax && !hasWidth) {
    bad++;
    console.log(`  NG  ${name.padEnd(18)} 网格容器有 max-width 但无 width:100%`);
  } else {
    const tags = [isGrid && 'grid', hasMax && 'max-w', hasWidth && 'width']
      .filter(Boolean).join(' ') || 'plain';
    console.log(`  OK  ${name.padEnd(18)} ${tags}`);
  }
}

console.log(bad === 0
  ? '\n所有网格容器都设了 width。'
  : `\n${bad} 个容器需要加 width:100%`);
process.exit(bad === 0 ? 0 : 1);