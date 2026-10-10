/**
 * Clean wrangler --json output into plain arrays.
 * wrangler prints a proxy notice on the first line, so we slice from the
 * first '[' and parse the remainder.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'data');

function load(table) {
  const raw = fs.readFileSync(path.join(DIR, `${table}.json`), 'utf8');
  const start = raw.indexOf('[');
  if (start === -1) throw new Error(`${table}: no JSON array found`);
  const parsed = JSON.parse(raw.slice(start));
  return parsed[0]?.results || [];
}

const tables = {};
for (const t of fs.readdirSync(DIR)) {
  const name = t.replace(/\.json$/, '');
  tables[name] = load(name);
}

/* settings arrive as key/value rows — flatten into an object */
const settings = {};
for (const row of tables.settings || []) settings[row.key] = row.value;

module.exports = { tables, settings };