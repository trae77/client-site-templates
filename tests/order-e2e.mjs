// Pickup-order flow on samples/restaurant-ordering at 390 and 1440. Exits 1 on any FAIL.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const BASE = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch(); const out = [];
const ok = (c, m) => { out.push((c ? 'PASS ' : 'FAIL ') + m); };
for (const mob of [true, false]) {
  const ctx = await b.newContext(mob ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`${BASE}/samples/restaurant-ordering/`, { waitUntil: 'networkidle' });
  const tag = mob ? '[390]' : '[1440]';
  // item with options: Large + Extra topping => 10+2+1 = 13
  await p.click('button[aria-label="Add Sample item A"]');
  ok(await p.isVisible('dialog.order-dialog'), `${tag} options dialog opens`);
  await p.click('label:has-text("Large")'); await p.click('label:has-text("Extra topping")');
  await p.click('.order-confirm');
  ok((await p.textContent('.order-lines')).includes('1 × Sample item A (Large, Extra topping) · $13.00'), `${tag} options priced into line`);
  await p.click('button[aria-label="Add Sample item C"]');
  await p.click('button[aria-label="Add one more Sample item C"]');
  ok((await p.textContent('.order-total')).includes('$31.00'), `${tag} total 13 + 2x9 = $31.00`);
  await p.click('button[aria-label="Remove one Sample item C"]');
  ok((await p.textContent('.order-total')).includes('$22.00'), `${tag} remove one -> $22.00`);
  // Phones: one merged bottom bar. The call bar's main button becomes the cart button; the separate .order-bar stays hidden.
  if (mob) {
    const cb = (await p.textContent('.call-bar .cb-money')).trim();
    ok(await p.isVisible('.call-bar .cb-money') && cb === 'Order · 2 · $22.00' && (await p.getAttribute('.call-bar .cb-money', 'href')) === '#order-cart' && !(await p.isVisible('.order-bar')), `${tag} merged call bar shows the cart: "${cb}"`);
  }
  // persistence
  await p.reload({ waitUntil: 'networkidle' });
  ok((await p.textContent('.order-total')).includes('$22.00'), `${tag} cart persists after reload (localStorage)`);
  // required option validation: drink requires Size (first preselected) -> fine; time picker
  await p.click('.order-review');
  ok((await p.textContent('.order-msg')).includes('pickup date and time'), `${tag} review blocked without pickup time`);
  const d = new Date(Date.now() + 86400000); const iso = d.toISOString().slice(0, 10);
  await p.fill('#order-date', iso); await p.fill('#order-time', '12:30');
  await p.fill('#order-name', 'Test'); await p.fill('#order-phone', '5550100');
  await p.click('.order-review');
  const sum = await p.textContent('.order-summary');
  ok(sum.includes(`Pickup: ${iso} 12:30`) && sum.includes('Estimated total: $22.00 (pay at pickup)') && sum.includes('Sample item A'), `${tag} summary shows items, time, pay at pickup`);
  ok((await p.textContent('.order-send')).includes('Email this order'), `${tag} submit is mailto (email given, no endpoint)`);
  // past time rejected
  await p.fill('#order-date', new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10)); await p.click('.order-review');
  ok((await p.textContent('.order-msg')).length > 0, `${tag} past pickup time rejected`);
  // keyboard: Escape closes dialog
  await p.click('button[aria-label="Add Sample drink"]'); await p.keyboard.press('Escape');
  ok(!(await p.isVisible('dialog.order-dialog')), `${tag} Escape closes options dialog`);
  ok((await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)), `${tag} no horizontal scroll with cart`);
  ok(errs.length === 0, `${tag} no console errors ${errs.join('|')}`);
  await ctx.close();
}
await b.close(); server.close(); console.log(out.join('\n'));
process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
