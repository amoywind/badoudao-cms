/**
 * Execute a .sql file against a remote D1 database via the Cloudflare API.
 *
 * Why not wrangler: wrangler login requires a browser CAPTCHA that this
 * network blocks. The HTTP API with an API token needs no browser step.
 *
 * The D1 web Console only runs one statement per click, so statements are
 * split and sent individually here.
 *
 * Usage:
 *   node run-d1.js <sql-file> [--dry]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEV_VARS = path.join(ROOT, '.dev.vars');
const ACCOUNT = process.env.CF_ACCOUNT_ID || '086d893ed76ae09ae6abac33113d7eab';
const DB_ID = process.env.CF_DATABASE_ID || 'aba203a7-d49a-4c93-b4f9-aa931aa219c7';

/* ------------------------------------------------------------ token */

function readToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  const raw = fs.readFileSync(DEV_VARS, 'utf8');
  const m = raw.match(/^CLOUDFLARE_API_TOKEN=(.+)$/m);
  if (!m) throw new Error('CLOUDFLARE_API_TOKEN not found in .dev.vars');
  return m[1].trim();
}

/* ------------------------------------------------- statement splitting */

/**
 * Split a SQL file into individual statements.
 * Handles single-quoted strings, C-style block comments and double-dash line
 * comments, so a semicolon inside a string or comment does not split a
 * statement in half.
 */
function splitStatements(sql) {
  const out = [];
  let buf = '';
  let inStr = false;
  let inBlock = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    /* block comment */
    if (inBlock) {
      if (ch === '*' && sql[i + 1] === '/') { inBlock = false; i++; }
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') { inBlock = true; i++; continue; }

    if (inStr) {
      buf += ch;
      if (ch === "'") {
        /* '' is an escaped quote inside a string literal */
        if (sql[i + 1] === "'") { buf += sql[++i]; }
        else inStr = false;
      }
      continue;
    }

    /* line comment */
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

/* ------------------------------------------------------------- api */

async function exec(sql, token, dry) {
  if (dry) { console.log(`    [dry] ${sql.slice(0, 70).replace(/\s+/g, ' ')}…`); return true; }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB_ID}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    }
  );

  const json = await res.json();
  if (!json.success) {
    const msg = (json.errors || []).map((e) => e.message).join('; ');
    throw new Error(`${msg} —— 失败语句: ${sql.slice(0, 110).replace(/\s+/g, ' ')}`);
  }
  return true;
}

/* ------------------------------------------------------------- main */

async function main() {
  const file = process.argv[2];
  const dry = process.argv.includes('--dry');
  if (!file) {
    console.error('Usage: node run-d1.js <sql-file> [--dry]');
    process.exit(1);
  }

  const token = readToken();
  const sql = fs.readFileSync(path.resolve(file), 'utf8');
  const statements = splitStatements(sql);

  console.log(`\n${path.basename(file)} — ${statements.length} 条语句${dry ? '（dry run）' : ''}\n`);

  let ok = 0;
  const failed = [];

  for (const [i, stmt] of statements.entries()) {
    const label = stmt.slice(0, 62).replace(/\s+/g, ' ');
    try {
      await exec(stmt, token, dry);
      ok++;
      console.log(`  ${String(i + 1).padStart(3)}. ✓ ${label}`);
    } catch (err) {
      failed.push({ stmt, err: err.message });
      console.log(`  ${String(i + 1).padStart(3)}. ✗ ${label}`);
      console.log(`       ${err.message}`);
      break;
    }
  }

  console.log(`\n成功 ${ok} / ${statements.length}`);
  if (failed.length) {
    console.log(`\n首个失败：${failed[0].err}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n错误：', err.message, '\n');
  process.exit(1);
});