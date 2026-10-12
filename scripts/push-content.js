/**
 * Load the page content files into the pages table.
 *
 * The content lives in scripts/content/*.md rather than in the database as
 * the source of truth, because markdown files can be reviewed in a diff.
 * This pushes them up. Re-running it is safe: the migration runner skips
 * statements it has already applied, so it will not duplicate a page.
 *
 * Usage: node scripts/push-content.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = path.join(__dirname, 'content');

/* slug -> { file, title, heading, intro, seo_title, seo_description } */
const PAGES = [
  {
    slug: 'factory',
    file: 'factory.md',
    title: 'Factory',
    heading: 'The factory behind your order',
    intro:
      'Badoudao is the export arm of Xiamen Orange Cat Creative Home Co., Ltd. — 2,000 clocks a day, made in our own building in Xiamen, China.',
    seo_title: 'Quartz Clock Factory in Xiamen | OEM & ODM Manufacturer | Badoudao',
    seo_description:
      'In-house production of decorative quartz wall clocks in Xiamen: 2,000 units per day, 8 product series, custom structure, movement and packaging. MOQ from 500 pcs, Ex Works.'
  },
  {
    slug: 'quality',
    file: 'quality.md',
    title: 'Quality',
    heading: 'Four stages, every unit',
    intro:
      'Incoming inspection, in-process patrol, 100% powered testing of every finished clock, and batch reliability sampling. Sealed samples kept per batch.',
    seo_title: 'Quality Control for OEM Quartz Clocks | GB/T 6046 | Badoudao',
    seo_description:
      'How our quartz wall clocks are inspected: 4-stage QC to GB/T 6046, 100% powered testing of every unit, sealed samples per batch, full traceability and after-sales handling.'
  },
  {
    slug: 'faq',
    file: 'faq.md',
    title: 'FAQ',
    heading: 'Frequently asked questions',
    intro:
      'MOQ, lead times, samples, customisation, payment terms and shipping — answered with our actual numbers rather than "contact us for details".',
    seo_title: 'Quartz Clock Supplier FAQ — MOQ, Lead Time & Samples | Badoudao',
    seo_description:
      'Answers for buyers of wholesale quartz clocks: MOQ from 500 pcs, lead times by quantity, sample cost, what can be customised, payment terms and shipping terms from our Xiamen factory.'
  }
];

/** Escape a string for a single-quoted SQL literal. */
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

const sql = [];

for (const p of PAGES) {
  const file = path.join(DIR, p.file);
  if (!fs.existsSync(file)) {
    console.error(`缺少文件: ${file}`);
    process.exit(1);
  }

  const body = fs.readFileSync(file, 'utf8');

  sql.push(
    `UPDATE pages SET
       body = ${q(body)},
       title = ${q(p.title)},
       heading = ${q(p.heading)},
       intro = ${q(p.intro)},
       seo_title = ${q(p.seo_title)},
       seo_description = ${q(p.seo_description)},
       updated_at = datetime('now')
     WHERE slug = ${q(p.slug)}`
  );

  console.log(`  ${p.slug.padEnd(10)} ${String(body.length).padStart(5)} 字符  ${p.heading}`);
}

const sqlFile = path.join(__dirname, '.push-content.sql');
fs.writeFileSync(sqlFile, sql.join(';\n') + ';\n');

execFileSync(process.execPath, [path.join(__dirname, 'migrate.cjs'), sqlFile], {
  stdio: 'inherit'
});

fs.unlinkSync(sqlFile);
console.log('\n已写入数据库。');