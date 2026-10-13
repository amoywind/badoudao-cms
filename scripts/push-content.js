/**
 * Render the page content files to HTML and store the result.
 *
 * The pages API runs mdToHtml() before saving. Writing markdown straight
 * into the database with SQL skips that, and the page then renders every
 * heading marker, bold marker and bullet as literal text, which is what
 * happened the first time this ran.
 *
 * So the conversion happens here, through the project's own renderer, and
 * the database receives HTML like it always did. It is worth converting
 * locally rather than posting to the API because a converter that silently
 * returns its input should fail loudly, and that is easier to detect here.
 *
 * Usage: node scripts/push-content.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = path.join(__dirname, 'content');

/* id -> { file, title, heading, intro, seo_title, seo_description }
   The route reads a page by id, not by slug, so these match the URL. */
const PAGES = [
  {
    id: 'factory',
    file: 'factory.md',
    title: 'Factory',
    heading: 'The factory behind your order',
    intro:
      'Badoudao is the export arm of Xiamen Orange Cat Creative Home Co., Ltd. Manufacturing decorative wall clocks on our own floor in Xiamen, China.',
    seo_title: 'Quartz Clock Factory in Xiamen | OEM & ODM Manufacturer | Badoudao',
    seo_description:
      'In-house production of decorative quartz wall clocks in Xiamen: 2,000 units per day, 8 product series, custom structure, movement and packaging. MOQ from 500 pcs, Ex Works.'
  },
  {
    id: 'quality',
    file: 'quality.md',
    title: 'Quality',
    heading: 'Four stages, every unit',
    intro:
      'Incoming inspection, in-process patrol, 100% powered testing of every finished clock, and batch reliability sampling. A sealed sample is kept per batch.',
    seo_title: 'Quality Control for OEM Quartz Clocks | GB/T 6046 | Badoudao',
    seo_description:
      'How our quartz wall clocks are inspected: 4-stage QC to GB/T 6046, 100% powered testing of every unit, sealed samples per batch, full traceability and after-sales handling.'
  },
  {
    id: 'oem-odm',
    file: 'oem-odm.md',
    title: 'OEM / ODM',
    heading: 'Your brand, our factory',
    intro:
      'OEM private labelling on moulds already proven in mass production, or ODM development from your own design. NDA available before you share anything.',
    seo_title: 'OEM & ODM Quartz Clock Manufacturer | Private Label | Badoudao',
    seo_description:
      'OEM private label quartz clocks on proven moulds, custom dial artwork, hands, case colour and packaging. ODM original development with ID design, tooling, movement matching and NDA. Xiamen factory, Ex Works.'
  },
  {
    id: 'small-batch',
    file: 'small-batch.md',
    title: 'Small Batch',
    heading: 'Test it before you commit',
    intro:
      'Small batch trial orders on existing moulds, with sample fees refunded on bulk orders. Low MOQ reduces the risk of testing a product nobody buys.',
    seo_title: 'Small Batch Quartz Clock Orders | Low MOQ OEM | Badoudao',
    seo_description:
      'Small batch quartz clock production for market testing: samples from 1-2 pieces, OEM on existing moulds at small quantities, tiered pricing, tooling fees refundable on bulk orders. MOQ from 500.'
  }
];

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

/**
 * Convert one markdown file with the project's own renderer, so this
 * cannot drift from the one the admin editor uses.
 */
function render(file) {
  /* file:// prefix is required: a bare absolute path like "D:/..." is
     parsed as a URL scheme, not a path, and the import fails. */
  const importer =
    'file:///' + path.join(__dirname, '..', 'src', 'lib', 'markdown.ts').replace(/\\/g, '/');

  const script = `
    const { mdToHtml } = await import('${importer}');
    const fs = await import('node:fs');
    const out = mdToHtml(fs.readFileSync(${JSON.stringify(file)}, 'utf8'));
    process.stdout.write('<<<HTML>>>' + out);
  `;

  const out = execFileSync(
    process.execPath,
    ['--experimental-strip-types', '--input-type=module', '-e', script],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );

  const marker = out.indexOf('<<<HTML>>>');
  if (marker < 0) throw new Error(`渲染失败: ${file}`);
  return out.slice(marker + '<<<HTML>>>'.length);
}

const sql = [];

for (const p of PAGES) {
  const file = path.join(DIR, p.file);
  if (!fs.existsSync(file)) {
    console.error(`缺少文件: ${file}`);
    process.exit(1);
  }

  const html = render(file);

  /* A converter that returns its input unchanged is exactly the failure
     that produced the broken pages, so refuse rather than store it. */
  if (/^#{1,3}\s/m.test(html) || /\*\*[^*]+\*\*/.test(html)) {
    console.error(`${p.file} 渲染后仍是 markdown，拒绝写入`);
    process.exit(1);
  }

  const insert = `INSERT OR IGNORE INTO pages (id, slug, title, heading, intro, seo_title, seo_description, body, status, updated_at)
     VALUES (${q(p.id)}, ${q(p.id)}, ${q(p.title)}, ${q(p.heading)}, ${q(p.intro)},
             ${q(p.seo_title)}, ${q(p.seo_description)}, ${q(html)}, 'published', datetime('now'))`;

  const update = `UPDATE pages SET
       body = ${q(html)},
       title = ${q(p.title)},
       heading = ${q(p.heading)},
       intro = ${q(p.intro)},
       seo_title = ${q(p.seo_title)},
       seo_description = ${q(p.seo_description)},
       updated_at = datetime('now')
     WHERE id = ${q(p.id)}`;

  sql.push(insert, update);

  const tags = (html.match(/<(h2|h3|ul|ol|li|p|strong)[ >]/g) || []).length;
  console.log(
    `  ${p.id.padEnd(9)} ${String(html.length).padStart(5)} 字符  ${String(tags).padStart(3)} 个标签  ${p.heading}`
  );
}

const sqlFile = path.join(__dirname, '.push-content.sql');
fs.writeFileSync(sqlFile, sql.join(';\n') + ';\n');

execFileSync(process.execPath, [path.join(__dirname, 'migrate.cjs'), sqlFile], {
  stdio: 'inherit'
});

fs.unlinkSync(sqlFile);
console.log('\n已写入数据库（HTML）。');