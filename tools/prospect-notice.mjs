#!/usr/bin/env node
// Compliance audit 2026-10-19 #8: every prospects/<slug>/index.html gets
//   <meta name="robots" content="noindex"> and the footer line "Design concept for <Business>. Not affiliated."
// Idempotent. Changes nothing else. Usage: node tools/prospect-notice.mjs [dir ...] [--check]
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2); const check = args.includes('--check');
const dirs = args.filter((a) => !a.startsWith('--'));
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const files = (dirs.length ? dirs : fs.readdirSync(path.join(root, 'prospects')).map((d) => path.join(root, 'prospects', d)))
  .map((d) => d.endsWith('.html') ? d : path.join(d, 'index.html')).filter((f) => fs.existsSync(f));
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"');
const ROBOTS = /<meta\b[^>]*name="robots"[^>]*noindex|<meta\b[^>]*content="noindex[^>]*name="robots"/;
export function businessName(html) {
  const m = html.match(/©\s*(?:<span id="year"><\/span>|\d{4})\s*([^<]+?)\.?\s*All rights reserved/) || html.match(/<a class="logo"[^>]*>([^<]+)<\/a>/) || html.match(/<title>([^<|·]+)/);
  return m ? m[1].trim().replace(/\.$/, '') : null;
}
export function addNotice(html) {
  const name = businessName(html); if (!name) return { html, err: 'no business name found' };
  let out = html;
  if (!ROBOTS.test(out)) out = out.replace(/(<meta\b[^>]*name="viewport"[^>]*>)/, '$1\n  <meta name="robots" content="noindex">');
  if (!/class="concept-notice"/.test(out)) out = out.replace(/(<div class="[^"]*footer-bottom[^"]*">[\s\S]*?)(\n\s*<\/div>)/, `$1\n      <span class="concept-notice">Design concept for ${name}. Not affiliated.</span>$2`);
  const ok = ROBOTS.test(out) && /class="concept-notice"/.test(out);
  return { html: out, err: ok ? null : 'could not place meta or footer line', name: dec(name) };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  let bad = 0, changed = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8'); const r = addNotice(src);
    if (r.err) { bad++; console.error(`✗ ${path.relative(root, f)}: ${r.err}`); continue; }
    if (r.html !== src) { if (check) { bad++; console.error(`✗ ${path.relative(root, f)}: missing noindex / concept notice`); } else { fs.writeFileSync(f, r.html); changed++; } }
  }
  console.log(`prospect-notice: ${files.length} page(s), ${check ? 'checked' : `${changed} updated`}, ${bad} problem(s)`);
  process.exit(bad ? 1 : 0);
}
