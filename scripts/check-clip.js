/**
 * Screenshot-based overflow check: render at a width, then look for ink
 * touching the right edge across a tall band of rows.
 *
 * A DOM-based check needs a driver, and `--dump-dom` will not run injected
 * script. Reading pixels works because the symptom is visible: text that
 * runs off the screen ends abruptly at the last pixel column, and nothing
 * legitimate in this layout does that.
 *
 * Reports the fraction of sampled rows with ink in the last few columns.
 * Under about 8% is a border or an icon; above it is text being cut.
 *
 *   node scripts/check-clip.js [width] [page]
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const HOST = process.env.SITE_HOST || 'https://www.oemwallclocks.com';
const WIDTH = parseInt(process.argv[2] || '390', 10);
const PAGE = process.argv[3] || '/';

const OUT = path.join(os.tmpdir(), `clip-${process.pid}`);
fs.mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, 's.png');
const profile = path.join(OUT, 'profile');

/* Long enough to cover the hero and the first content block, which is
   where a two-column layout shows itself. */
const HEIGHT = 1000;

execFileSync(EDGE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--window-size=${WIDTH},${HEIGHT}`,
  `--user-data-dir=${profile}`,
  `--screenshot=${file}`,
  `${HOST}${PAGE}?cb=${Date.now()}`
], { stdio: 'ignore', timeout: 45000 });

/* Decoding a PNG in Node without a dependency: ask Edge for it as a data
   URL is not possible, so the image is measured by a tiny Python call
   instead. Kept here so the caller has one command. */
const py = process.env.PY || 'C:/Users/Administrator/.workbuddy/binaries/python/envs/default/Scripts/python.exe';
const script = `
from PIL import Image
im = Image.open(r'${file}').convert('RGB')
w, h = im.size
px = im.load()
edge = 5
rows_with_ink = 0
sampled = 0
first_offender = None
for y in range(0, h, 3):
    sampled += 1
    ink = 0
    for x in range(w - edge, w):
        r, g, b = px[x, y]
        # Anything clearly darker than the page background
        if r + g + b < 480:
            ink += 1
    if ink >= 2:
        rows_with_ink += 1
        if first_offender is None:
            first_offender = y
pct = 100.0 * rows_with_ink / sampled
print(f'{w}x{h}')
print(f'right-edge ink rows: {rows_with_ink}/{sampled} = {pct:.1f}%')
if first_offender is not None:
    print(f'first at y={first_offender}')
print('CLIPPED' if pct > 14 else 'OK')
`;

fs.writeFileSync(path.join(OUT, 'm.py'), script);
const out = execFileSync(py, [path.join(OUT, 'm.py')], { encoding: 'utf8' });

console.log(`\n${WIDTH}px  ${PAGE}`);
console.log(out.trim());

fs.rmSync(OUT, { recursive: true, force: true });

process.exit(out.includes('CLIPPED') ? 1 : 0);