#!/usr/bin/env node
// Apply the compliance pass (tools/compliance.mjs) to the original template folders. Idempotent.
// Generated sites get it from tools/mockup.mjs automatically. Never touches prospects/.
import fs from 'node:fs';
import path from 'node:path';
import { applyCompliance, privacyHtml, A11Y_CSS } from './compliance.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SKIP = new Set(['samples', 'prospects', 'directory', 'tools', 'docs', 'upgrade', 'widgets', 'node_modules', 'dist-client', 'stock', 'ci']);
const dirs = fs.readdirSync(ROOT).filter((d) => !SKIP.has(d) && !d.startsWith('.') && fs.existsSync(path.join(ROOT, d, 'index.html')));
for (const d of dirs) {
  const f = path.join(ROOT, d, 'index.html'); const html = fs.readFileSync(f, 'utf8');
  const out = applyCompliance(html); if (out !== html) fs.writeFileSync(f, out);
  const name = (html.match(/<a class="logo"[^>]*>([^<]+)<\/a>/) || [])[1] || 'This business';
  const css = path.join(ROOT, d, 'styles.css');
  fs.writeFileSync(path.join(ROOT, d, 'privacy.html'), privacyHtml({ name: name.trim(), phone: null, email: null }));
  if (fs.existsSync(css)) { const c = fs.readFileSync(css, 'utf8'); const i = c.indexOf('\n/* a11y base (ported'); fs.writeFileSync(css, (i >= 0 ? c.slice(0, i) : c) + A11Y_CSS); }
  console.log(`${d}: ${out !== html ? 'updated' : 'already done'}`);
}
