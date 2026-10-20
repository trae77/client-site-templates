#!/usr/bin/env node
// axe-core check (WCAG 2.0/2.1 A + AA). Fails on any serious or critical violation.
// Usage: node tools/a11y-check.mjs [dir-or-html ...]   (default: every samples/*/index.html and privacy.html)
//        node tools/a11y-check.mjs --palettes          (build one page per palette in tools/design.mjs and check each)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const args = process.argv.slice(2);
let base = ROOT; let pages = [];
if (args.includes('--palettes')) {
  const { PALETTES } = await import('./design.mjs');
  base = fs.mkdtempSync(path.join(os.tmpdir(), 'pal-'));
  for (const k of Object.keys(PALETTES)) {
    execFileSync('node', [path.join(ROOT, 'tools/mockup.mjs'), '--trade', 'handyman', '--name', 'Sample Co.', '--city', 'Aurora, CO', '--phone', '(555) 010-0199', '--palette', k, '--money', 'job-list', '--no-png', '--out', path.join(base, k)], { stdio: 'pipe' });
    pages.push(`${k}/index.html`);
  }
  console.log(`built ${pages.length} palette pages`);
} else {
  const targets = args.filter((a) => !a.startsWith('--'));
  const list = targets.length ? targets : fs.readdirSync(path.join(ROOT, 'samples')).map((d) => path.join('samples', d)).filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory());
  for (const t of list) {
    const abs = path.resolve(ROOT, t);
    if (abs.endsWith('.html')) pages.push(path.relative(ROOT, abs));
    else for (const f of ['index.html', 'privacy.html']) if (fs.existsSync(path.join(abs, f))) pages.push(path.relative(ROOT, path.join(abs, f)));
  }
}
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp' };
const server = http.createServer((q, r) => {
  let f = path.join(base, decodeURIComponent(q.url.split('?')[0]));
  if (f.endsWith('/')) f += 'index.html';
  if (!f.startsWith(base) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch();
let bad = 0;
for (const pg of pages) {
  for (const width of [390, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    // Fonts/maps from the internet are not needed for the check; block them so CI is offline-safe.
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    await p.goto(`http://127.0.0.1:${port}/${pg}`, { waitUntil: 'load' });
    await p.addScriptTag({ content: AXE });
    const res = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })).violations
      .map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 3).map((x) => x.target.join(' ') + (x.any[0]?.data?.contrastRatio ? ` (${x.any[0].data.contrastRatio}:1 ${x.any[0].data.fgColor} on ${x.any[0].data.bgColor})` : '')) })));
    const serious = res.filter((v) => ['serious', 'critical'].includes(v.impact));
    if (serious.length) { bad++; console.log(`✗ ${pg} @${width}: ${serious.map((v) => `${v.id} [${v.impact}] x${v.n}: ${v.ex.join(' | ')}`).join('\n    ')}`); }
    await ctx.close();
  }
}
await browser.close(); server.close();
console.log(bad ? `a11y: ${bad} page/width combo(s) with serious or critical violations` : `✓ a11y: ${pages.length} page(s) × 2 widths, no serious or critical axe violations`);
process.exit(bad ? 1 : 0);
