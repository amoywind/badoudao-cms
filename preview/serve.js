/**
 * Static file server for the preview build.
 * Zero dependencies — the preview is plain HTML.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'out');
const PORT = Number(process.env.PORT || 8788);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  let file = path.join(ROOT, pathname);

  /* directory → index.html (must resolve the extension AFTER this) */
  if (!path.extname(file)) file = path.join(file, 'index.html');
  const ext = path.extname(file);

  /* prevent path traversal */
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(file, (err, buf) => {
    if (err) {
      const notFound = path.join(ROOT, '404.html');
      if (fs.existsSync(notFound)) {
        const body = fs.readFileSync(notFound);
        res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(body);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(
          '<h1>404</h1><p><a href="/">Back to home</a></p>'
        );
      }
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    }).end(buf);
  });
});

server.listen(PORT, () => {
  console.log(`Badoudao preview running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.');
});