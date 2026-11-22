// Tiny static server for gating a generated preview on 127.0.0.1. /sitemap.xml is generated from the
// folder's .html files so the sitemap-based gates (proofread, ux-gate, lychee) see every page.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml' };

export function pagesOf(dir) {
  return fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.html') && !/(^|\/)404\.html$/.test(f)).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)))
    .map((f) => '/' + f.replace(/(^|\/)index\.html$/, '$1'));
}

export function serve(dir, port = 0) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      const origin = `http://${req.headers.host}`;
      if (url.pathname === '/sitemap.xml') {
        res.writeHead(200, { 'content-type': 'application/xml', 'x-robots-tag': 'noindex' });
        return res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pagesOf(dir).map((p) => `  <url><loc>${origin}${p}</loc></url>`).join('\n')}\n</urlset>\n`);
      }
      let p = path.normalize(path.join(dir, decodeURIComponent(url.pathname)));
      if (!p.startsWith(path.resolve(dir))) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff' });
      fs.createReadStream(p).pipe(res);
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}
