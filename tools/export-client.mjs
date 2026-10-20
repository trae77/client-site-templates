#!/usr/bin/env node
// Export a one-pager folder as a clean, deploy-ready folder for a client's own host (Cloudflare Pages).
//   npm run export-client -- --site prospects/<slug> [--out dist-client/<slug>] [--site-url https://client.com] [--force]
// What it does (the source folder is never modified):
//   - removes the "$200 claim bar", .sample-tag labels and demo banners
//   - removes any <meta name="robots" content="noindex">, writes robots.txt that allows indexing
//   - with --site-url: sets <link rel=canonical>, og:url, the JSON-LD "url", and writes sitemap.xml
//   - scans the result for leftovers that need a human (sample text, 555-01xx numbers, example.com,
//     "mockup", "placeholder", "goes here", forms with no endpoint). Any finding fails the export
//     (exit 2) unless --force, so nothing half-finished gets deployed by accident.
// It does not deploy anything. See docs/DEPLOY-CLOUDFLARE-PAGES.md.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { CLAIM_MARK } from './claim-bar.mjs';
import { tradeOfFile, scanHtml, parseOverride } from './industry.mjs';

const { values } = parseArgs({ options: { site: { type: 'string' }, out: { type: 'string' }, 'site-url': { type: 'string' }, trade: { type: 'string' }, 'allow-feature': { type: 'string' }, 'allow-reason': { type: 'string' }, force: { type: 'boolean', default: false }, 'sms-addon': { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' } } });
if (values.help || !values.site) { console.log('Usage: npm run export-client -- --site <folder> [--trade <trade>] [--out <dir>] [--site-url https://client.com] [--allow-feature <id> --allow-reason TEXT] [--force]'); process.exit(values.help ? 0 : 1); }
const src = path.resolve(values.site);
if (!fs.existsSync(path.join(src, 'index.html'))) { console.error(`✗ ${src} has no index.html`); process.exit(1); }
let siteUrl = '';
if (values['site-url']) {
  const u = new URL(values['site-url']);
  if (u.protocol !== 'https:') { console.error('✗ --site-url must be https://'); process.exit(1); }
  siteUrl = u.origin + (u.pathname.replace(/\/+$/, '') || '') + '/';
}
// Industry matrix check (tools/industry-features.json) before anything is written. --force does not skip it.
{
  let ov; try { ov = parseOverride(values['allow-feature'], values['allow-reason']); } catch (e) { console.error(`✗ ${e.message}`); process.exit(5); }
  const allow = ov ? [ov.id] : [];
  const leaks = [];
  for (const f of fs.readdirSync(src, { recursive: true }).filter((x) => x.endsWith('.html'))) {
    const [t, why, a, pr = []] = tradeOfFile(path.join(src, f), values.trade);
    if (/\.html$/.test(f) && !/privacy\.html$/.test(f)) for (const x of pr) leaks.push(`${f}: ${x}`);
    const hits = scanHtml(fs.readFileSync(path.join(src, f), 'utf8'), t, [...allow, ...a]);
    if (hits.length) leaks.push(`${f} [${t.id} via ${why}]: ${hits.join('; ')}`);
    const html = fs.readFileSync(path.join(src, f), 'utf8');
    // Compliance (audit 2026-10-19 #3, #7): SMS lead texts are a paid add-on; sample reviews never ship in schema.
    if (/data-notify="(sms|both)"|name="sms_consent"/.test(html) && !values['sms-addon']) leaks.push(`${f}: SMS add-on present; pass --sms-addon only after the client paid and 10DLC is approved`);
    if (/name="sms_consent"[^>]*\bchecked/.test(html)) leaks.push(`${f}: SMS consent box is pre-checked (must start unchecked)`);
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) if (/"(aggregateRating|review)"/i.test(m[1]) && /sample|placeholder/i.test(m[1])) leaks.push(`${f}: sample rating/review in JSON-LD`);
  }
  if (!fs.existsSync(path.join(src, 'privacy.html'))) console.warn('! No privacy.html in this site. Rebuild with tools/mockup.mjs or add one before launch.');
  if (leaks.length) { console.error(`✗ Industry/compliance check failed; nothing was exported:\n  - ${leaks.join('\n  - ')}\nRemove the wrong-industry section, or pass --allow-feature <id> --allow-reason "TEXT" if the business really offers it.`); process.exit(5); }
}
const out = path.resolve(values.out || path.join('dist-client', path.basename(src)));
if (out === src || src.startsWith(out + path.sep)) { console.error('✗ --out must be a different folder from --site'); process.exit(1); }
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true, filter: (f) => !/(^|\/)(\.git|node_modules|chat-facts\.json)$/.test(f) && !/\.(png|log)$/.test(f) || /\/img\//.test(f) });

const changes = [];
for (const file of fs.readdirSync(out, { recursive: true }).filter((f) => f.endsWith('.html'))) {
  const p = path.join(out, file);
  let h = fs.readFileSync(p, 'utf8'); const before = h;
  h = h.replace(new RegExp(`<div ${CLAIM_MARK}[\\s\\S]*?</div>\\n?`, 'g'), () => (changes.push(`${file}: removed claim bar`), ''));
  h = h.replace(/<span class="sample-tag">[^<]*<\/span>(<br>)?/g, () => (changes.push(`${file}: removed sample tag`), ''));
  h = h.replace(/<div class="demo-banner"[^>]*>[\s\S]*?<\/div>\n?/g, () => (changes.push(`${file}: removed demo banner`), ''));
  h = h.replace(/[ \t]*<meta name="robots" content="[^"]*noindex[^"]*">\n?/gi, () => (changes.push(`${file}: removed noindex`), ''));
  if (siteUrl) {
    const pageUrl = siteUrl + (file === 'index.html' ? '' : file.replace(/index\.html$/, ''));
    h = h.replace(/[ \t]*<link rel="canonical"[^>]*>\n?/g, '').replace(/[ \t]*<meta property="og:url"[^>]*>\n?/g, '');
    h = h.replace(/(<meta name="viewport"[^>]*>)/, `$1\n  <link rel="canonical" href="${pageUrl}">\n  <meta property="og:url" content="${pageUrl}">`);
    h = h.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (m, a, json, c) => {
      try { const d = JSON.parse(json); if (d['@type'] && d['@type'] !== 'FAQPage' && d['@type'] !== 'Article') d.url = siteUrl; return a + JSON.stringify(d).replace(/</g, '\\u003c') + c; } catch { return m; }
    });
    changes.push(`${file}: canonical + og:url + JSON-LD url = ${pageUrl}`);
  }
  if (h !== before) fs.writeFileSync(p, h);
}
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}sitemap.xml\n` : ''}`);
if (siteUrl) {
  const pages = fs.readdirSync(out, { recursive: true }).filter((f) => f.endsWith('index.html')).map((f) => siteUrl + f.replace(/index\.html$/, ''));
  fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
}

// Pre-launch scan: things a person has to fix with the client's real facts.
const CHECKS = [
  ['claim bar / $200 or $400 offer', /\$[24]00|Make it yours|data-claim-bar|buy\.stripe\.com\/[^"]*claim/i],
  ['sample/demo wording', /\b(sample|demo|mockup|design concept|placeholder|goes here|lorem ipsum)\b/i],
  ['555 test phone number', /\b555[-.) ]*01\d\d\b|\(555\)/],
  ['example.com address', /example\.(com|org|net)/i],
  ['form that does not send yet', /does not send messages yet|action="#"|data-mock-form/i],
  ['noindex', /noindex/i],
];
const findings = [];
for (const file of fs.readdirSync(out, { recursive: true }).filter((f) => /\.(html|js)$/.test(f))) {
  const text = fs.readFileSync(path.join(out, file), 'utf8');
  const visible = file.endsWith('.html') ? text.replace(/<script(?! type="application\/ld\+json")[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '') : text;
  for (const [what, re] of CHECKS) {
    const m = visible.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
    if (m) findings.push(`${file}: ${what} (${m.length}× e.g. "${m[0]}")`);
  }
}
if (!siteUrl) findings.push('no --site-url: canonical, JSON-LD url and sitemap.xml were not set');

console.log(`Exported ${path.relative(process.cwd(), src) || src} -> ${out}`);
changes.forEach((c) => console.log(`  ✓ ${c}`));
console.log('  ✓ robots.txt allows indexing' + (siteUrl ? ', sitemap.xml written' : ''));
if (findings.length) {
  console.log(`\nPre-launch: ${findings.length} item(s) need the client's real facts before going live:`);
  findings.forEach((f) => console.log(`  ✗ ${f}`));
  if (!values.force) { console.log('\nFix these in the source (or rebuild with real facts), then export again. --force writes the folder anyway for a private preview.'); process.exit(2); }
  console.log('\n--force: folder written anyway. Do not point a client domain at it until the list above is clear.');
} else console.log('\nPre-launch scan clean. Next: docs/DEPLOY-CLOUDFLARE-PAGES.md');
