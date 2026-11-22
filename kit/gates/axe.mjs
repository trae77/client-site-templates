#!/usr/bin/env node
// axe-core WCAG 2.2 AA scan of each URL at 1280x800 and 390x844 (Playwright + the repo's axe-core).
//   node kit/gates/axe.mjs [--out report.json] <url> [url...]
// Exit 0 = no violations, 1 = violations, 2 = browser unavailable.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
let out = '';
const oi = args.indexOf('--out');
if (oi >= 0) { out = args[oi + 1]; args.splice(oi, 2); }
const urls = args;
if (!urls.length) { console.error('Usage: node kit/gates/axe.mjs [--out report.json] <url> [url...]'); process.exit(2); }
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const VIEWPORTS = [{ width: 1280, height: 800 }, { width: 390, height: 844 }];
let chromium;
try { ({ chromium } = require('playwright')); } catch { console.error('axe: playwright not installed (npm install)'); process.exit(2); }
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const exe = process.env.CHROME || process.env.CHROME_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
let browser;
try { browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
catch (e) { console.error('axe: browser unavailable: ' + e.message.split('\n')[0] + ' (run: npx playwright install chromium)'); process.exit(2); }
const runs = [];
try {
  for (const url of urls) for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: vp, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => ({ status: () => 0, err: e }));
    await page.addScriptTag({ content: axeSource });
    const r = await page.evaluate(async (tags) => {
      const res = await window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete'] });
      return { violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) })), passes: res.passes.length, incomplete: res.incomplete.length };
    }, TAGS);
    const status = resp.status();
    const nodes = r.violations.reduce((n, v) => n + v.nodes, 0);
    runs.push({ url, viewport: `${vp.width}x${vp.height}`, status, ...r, violationNodes: nodes });
    console.log(`${r.violations.length || status !== 200 ? 'FAIL' : 'PASS'}  axe ${vp.width}x${vp.height} ${url}  violations ${r.violations.length} (${nodes} nodes), passes ${r.passes}, needs-review ${r.incomplete}${status !== 200 ? `, HTTP ${status}` : ''}`);
    for (const v of r.violations) console.log(`   - ${v.id} [${v.impact}] ${v.help} (${v.nodes}): ${v.targets.join(' | ')}`);
    await ctx.close();
  }
} finally { await browser.close(); }
const pass = runs.every((r) => r.violations.length === 0 && r.status === 200);
const report = { pass, tags: TAGS, runs, totals: { scans: runs.length, violations: runs.reduce((n, r) => n + r.violations.length, 0), nodes: runs.reduce((n, r) => n + r.violationNodes, 0), incomplete: runs.reduce((n, r) => n + r.incomplete, 0) } };
if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`AXE: ${pass ? 'PASS' : 'FAIL'} (${report.totals.scans} scans, ${report.totals.violations} violations)`);
process.exit(pass ? 0 : 1);
