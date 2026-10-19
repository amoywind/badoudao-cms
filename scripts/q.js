/**
 * Run one ad-hoc SELECT against the remote D1 and print the rows.
 *
 * run-d1.js executes statements but discards the result payload, which is
 * fine for migrations and useless for questions. This keeps the same token
 * handling and endpoint, and prints JSON.
 *
 * Usage: node q.js "<sql>"
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEV_VARS = path.join(ROOT, '.dev.vars');
const ACCOUNT = process.env.CF_ACCOUNT_ID || '086d893ed76ae09ae6abac33113d7eab';
const DB_ID = process.env.CF_DATABASE_ID || 'aba203a7-d49a-4c93-b4f9-aa931aa219c7';

function readToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  const raw = fs.readFileSync(DEV_VARS, 'utf8');
  const m = raw.match(/^CLOUDFLARE_API_TOKEN=(.+)$/m);
  if (!m) throw new Error('CLOUDFLARE_API_TOKEN not found in .dev.vars');
  return m[1].trim();
}

async function main() {
  const sql = process.argv[2];
  if (!sql) { console.error('Usage: node q.js "<sql>"'); process.exit(1); }
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/d1/database/${DB_ID}/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${readToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    }
  );
  const json = await res.json();
  if (!json.success) {
    console.error('ERROR:', JSON.stringify(json.errors));
    process.exit(1);
  }
  const r = json.result && json.result[0];
  console.log(JSON.stringify(r && r.results, null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });