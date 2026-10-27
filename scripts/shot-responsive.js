const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const HOST = process.env.SITE_HOST || 'https://www.oemwallclocks.com';
const OUT = path.join(os.tmpdir(), 'resp');

const PAGES = [
  ['home', '/'],
  ['products', '/products'],
  ['category', '/products/wall-clocks'],
  ['detail', '/products/wood-wall-clocks/math-formula-blackboard-wooden-wall-clock'],
  ['factory', '/p/factory'],
  ['quality', '/p/quality'],
  ['contact', '/contact']
];

const DEVICES = [
  { name: 'phone',  w: 390,  h: 844,  dsf: 2 },
  { name: 'tablet', w: 820,  h: 1180, dsf: 2 },
  { name: 'laptop', w: 1440, h: 900,  dsf: 1 }
];

fs.mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const only = args[0];               // optional: one page name
const device = args[1] || 'all';

const run = DEVICES.filter(d => device === 'all' || device === d.name);

for (const d of run) {
  for (const [name, p] of PAGES) {
    if (only && only !== 'all' && only !== name) continue;
    const file = path.join(OUT, `${d.name}-${name}.png`);
    try {
      execFileSync(EDGE, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars',
        `--window-size=${d.w},${d.h}`,
        `--screenshot=${file}`,
        HOST + p
      ], { stdio: 'ignore', timeout: 40000 });
      const kb = (fs.statSync(file).size / 1024).toFixed(0);
      console.log(`${d.name.padEnd(7)} ${name.padEnd(10)} ${kb.padStart(5)}KB  ${file}`);
    } catch (e) {
      console.log(`${d.name.padEnd(7)} ${name.padEnd(10)} 失败`);
    }
  }
}

console.log(`\n输出目录: ${OUT}`);
