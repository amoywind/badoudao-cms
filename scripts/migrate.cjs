/**
 * Apply a migration file to the live D1 database, skipping work already done.
 *
 * Why this exists alongside run-d1.js: SQLite has no
 * `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, so re-running a migration that
 * adds a column fails with "duplicate column name". Migrations are run by
 * hand from the dashboard as often as by script, so they have to be
 * safely re-runnable.
 *
 * For each ADD COLUMN it first asks D1 whether the column is already there,
 * and treats "duplicate column name" as success either way. CREATE TABLE and
 * CREATE INDEX use IF NOT EXISTS and go straight through.
 *
 * Usage:
 *   node scripts/migrate.cjs src/migrations/0002_content_enhancements.sql [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEV_VARS = path.join(ROOT, '.dev.vars');
const ACCOUNT = process.env.CF_ACCOUNT_ID || '086d893ed76ae09ae6abac33113d7eab';
const DB_ID = process.env.CF_DATABASE_ID || 'aba203a7-d49a-4c93-b4f9-aa931aa219c7';

function token() {
  if (process.env.CF_API_TOKEN) return process.env.CF_API_TOKEN.trim();
  const m = fs.readFileSync(DEV_VARS, 'utf8').match(/^(?:CLOUDFLARE_)?API_TOKEN=(.+)$/m);
  if (!m) throw new Error('No token. Set CF_API_TOKEN or add it to .dev.vars');
  return m[1].trim();
}

/* Statement splitter. Handles C-style block comments, line comments and
   semicolons inside single-quoted string literals. */
function splitStatements(sql) {
  const out = [];
  let buf = '';
  let inStr = false;
  let inBlock = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (inBlock) {
      if (ch === '*' && sql[i + 1] === '/') { inBlock = false; i++; }
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') { inBlock = true; i++; continue; }

    if (inStr) {
      buf += ch;
      if (ch === "'") {
        if (sql[i + 1] === "'") { buf += sql[++i]; }
        else inStr = false;
      }
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      buf += '\n';
      continue;
    }
    if (ch === "'") { inStr = true; buf += ch; continue; }
    if (ch === ';') { out.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

async function query(sql, tok) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB_ID}/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    }
  );
  return res.json();
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/migrate.cjs <migration.sql> [--dry]');
    process.exit(1);
  }
  const dry = process.argv.includes('--dry');
  const sql = fs.readFileSync(path.resolve(ROOT, file), 'utf8');
  const statements = splitStatements(sql);
  const tok = token();

  console.log(`\n迁移文件: ${file}`);
  console.log(`待执行  : ${statements.length} 条语句${dry ? '（dry run）' : ''}\n`);

  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const stmt of statements) {
    const label = stmt.replace(/\s+/g, ' ').slice(0, 72);
    const isAddColumn = /^ALTER\s+TABLE/i.test(stmt);

    if (dry) {
      console.log(`  [dry] ${label}…`);
      continue;
    }

    /* Ask first for column adds — cheaper than parsing the error. */
    if (isAddColumn) {
      const m = stmt.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i);
      if (m) {
        const probe = await query(
          `SELECT COUNT(*) AS c FROM pragma_table_info('${m[1]}') WHERE name='${m[2]}'`,
          tok
        );
        const exists = probe.result && probe.result[0] && probe.result[0].c > 0;
        if (exists) {
          console.log(`  skip ${label}…  (列已存在)`);
          skipped++;
          continue;
        }
      }
    }

    const json = await query(stmt, tok);
    if (json.success) {
      console.log(`   ok  ${label}…`);
      done++;
    } else {
      const msg = (json.errors || []).map((e) => e.message).join('; ');
      /* Belt and braces: if the column appeared between probe and exec. */
      if (isAddColumn && /duplicate column/i.test(msg)) {
        console.log(`  skip ${label}…  (列已存在)`);
        skipped++;
        continue;
      }
      console.error(`  FAIL ${label}…`);
      console.error(`       ${msg}`);
      failed++;
    }
  }

  console.log(`\n完成: ${done} 条执行, ${skipped} 条跳过, ${failed} 条失败`);
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error('\n迁移失败:', e.message);
  process.exit(1);
});