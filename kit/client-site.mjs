#!/usr/bin/env node
/**
 * One-command client site kit: intake answers -> gated PREVIEW site.
 *
 *   npm run kit -- kit/samples/juniper-ridge-painting.intake.json
 *
 * 1. Normalizes the intake JSON (field names from the paid-client intake form) and refuses to build on
 *    missing required answers. Private contact fields are never published.
 * 2. Builds the site with tools/mockup.mjs (facts only, --no-claim, --no-track), then finishes it as a
 *    client preview (kit/lib/finish.mjs): the owner's services, no mockup/placeholder text, no forms that
 *    do not send, one privacy link, noindex meta + robots.txt + X-Robots-Tag.
 * 3. Serves it on 127.0.0.1 and runs the pre-ship gate: ship-guard, copy proofread (shared proofread gate
 *    + kit copy check), axe WCAG 2.2 AA at 1280 and 390, ux-gate.mjs at 1280 and 390, lychee.
 * Writes <out>/site/ (deployable folder) and <out>/GATE-REPORT.md. Nothing is deployed or sent.
 * Exit 0 = every gate passed; 1 = a gate failed; 2 = bad intake or missing tool.
 */
import { parseArgs } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeIntake } from './lib/intake.mjs';
import { finishSite } from './lib/finish.mjs';
import { serve, pagesOf } from './lib/serve.mjs';
import { crossCheckPlans } from './lib/plans.mjs';

const KIT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(KIT, '..');
const GATES = process.env.TTA_GATES || '/workspace/ops/gates';
const QA = process.env.TTA_QA || '/workspace/ops/qa';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string' }, base: { type: 'string' }, 'skip-gates': { type: 'boolean' }, only: { type: 'string' },
    'keep-serving': { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  },
});
if (values.help || !positionals[0]) {
  console.log(`Usage: npm run kit -- <intake.json> [--out DIR] [--base REF] [--skip-gates] [--only gate,gate] [--keep-serving]
  gates: ship-guard, proofread, axe, ux, lychee        default --out: kit/out/<slug>/`);
  process.exit(values.help ? 0 : 2);
}

function run(cmd, args, { env = {}, quiet = false } = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: REPO, env: { ...process.env, ...env } });
    let out = '';
    const onData = (d) => { out += d; if (!quiet) process.stdout.write(d); };
    p.stdout.on('data', onData); p.stderr.on('data', onData);
    p.on('error', (e) => resolve({ code: 2, out: out + String(e) }));
    p.on('close', (code) => resolve({ code, out }));
  });
}
const exists = (p) => fs.existsSync(p);
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const rel = (p) => path.relative(process.cwd(), p) || p;

// ---------------------------------------------------------------- 1. intake
const intakePath = path.resolve(positionals[0]);
const raw = readJson(intakePath);
if (!raw) { console.error(`✗ cannot read intake JSON: ${intakePath}`); process.exit(2); }
const { errors, warnings, facts } = normalizeIntake(raw, { baseDir: path.dirname(intakePath) });
warnings.forEach((w) => console.log(`! ${w}`));
if (errors.length) { console.error(`✗ Intake is missing answers; nothing was built:\n  - ${errors.join('\n  - ')}`); process.exit(2); }
const plans = crossCheckPlans();
plans.notes.forEach((n) => console.log(`! prices: ${n}`));
if (!plans.ok) { console.error('✗ Locked plan prices do not match locked-facts.md; stop and ask William.'); process.exit(2); }

const outRoot = path.resolve(values.out || path.join(KIT, 'out', facts.slug));
const site = path.join(outRoot, 'site');
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outRoot, { recursive: true });

// ---------------------------------------------------------------- 2. build
const margs = [path.join(REPO, 'tools/mockup.mjs'), '--name', facts.name, '--trade', facts.trade, '--city', facts.city, '--phone', facts.phone,
  '--areas', facts.areas.join(','), '--out', site, '--no-png', '--no-claim', '--no-track', '--features', 'call-bar'];
if (facts.email) margs.push('--email', facts.email);
if (facts.hours) margs.push('--hours', facts.hours);
if (facts.address) margs.push('--address', facts.address);
if (facts.tagline) margs.push('--tagline', facts.tagline);
if (facts.primary) margs.push('--primary', facts.primary);
if (facts.accent) margs.push('--accent', facts.accent);
if (facts.text) margs.push('--text');
if (facts.formEndpoint) margs.push('--money', 'quote-form', '--money-endpoint', facts.formEndpoint); else margs.push('--money', 'none');
if (facts.faq.length) { const ff = path.join(outRoot, 'faq.json'); fs.writeFileSync(ff, JSON.stringify(facts.faq, null, 2)); margs.push('--faq-file', ff, '--faq-schema'); }
const b = spawnSync(process.execPath, margs, { cwd: REPO, encoding: 'utf8' });
fs.writeFileSync(path.join(outRoot, 'build.log'), `${b.stdout}\n${b.stderr}`);
if (b.status !== 0) { console.error(b.stdout, b.stderr); console.error('✗ tools/mockup.mjs failed (see build.log)'); process.exit(2); }
if (facts.photos.length) {
  fs.mkdirSync(path.join(site, 'img'), { recursive: true });
  facts.photos.forEach((p, i) => fs.copyFileSync(p.file, path.join(site, 'img', `photo-${i + 1}${path.extname(p.file).toLowerCase()}`)));
}
finishSite(site, facts, { hasPhotos: facts.photos.length > 0, hasForm: Boolean(facts.formEndpoint) });
if (facts.photos.length) {
  const idx = path.join(site, 'index.html');
  let h = fs.readFileSync(idx, 'utf8'); let i = 0;
  h = h.replace(/<div class="ph-tile"[^>]*>[\s\S]*?<\/div>/g, (m) => { const p = facts.photos[i]; if (!p) return ''; i++; return `<img src="img/photo-${i}${path.extname(p.file).toLowerCase()}" alt="${p.alt.replace(/"/g, '&quot;')}" loading="lazy" width="800" height="600">`; });
  h = h.replace(/(<section id="gallery"[\s\S]*?<div class="section-head">\s*<h2[^>]*>[^<]*<\/h2>\s*)<p>[\s\S]*?<\/p>/, '$1<p>Recent work.</p>');
  fs.writeFileSync(idx, h);
}
for (const pg of fs.readdirSync(site, { recursive: true }).filter((x) => x.endsWith('.html'))) {
  const h = fs.readFileSync(path.join(site, pg), 'utf8');
  if (!/<meta name="robots" content="noindex/.test(h)) { console.error(`✗ ${pg} is missing noindex; refusing to continue`); process.exit(2); }
  for (const k of ['contact-email', 'contact-phone', 'contact-name', 'legal-name', 'lead-email']) if (raw[k] && h.includes(String(raw[k]))) { console.error(`✗ private intake field ${k} leaked into ${pg}`); process.exit(2); }
}
const factsFile = path.join(outRoot, 'facts.json');
const { photos, ...publicFacts } = facts;
fs.writeFileSync(factsFile, JSON.stringify(publicFacts, null, 2));
fs.writeFileSync(path.join(outRoot, 'kit-build.json'), JSON.stringify({ builtAt: new Date().toISOString(), intake: rel(intakePath), slug: facts.slug, trade: facts.trade, plan: facts.plan, planPrices: plans, pages: pagesOf(site), warnings, noindex: true }, null, 2));
console.log(`✓ Built ${rel(site)} (${pagesOf(site).length} pages, noindex)`);
if (values['skip-gates']) process.exit(0);

// ---------------------------------------------------------------- 3. gates
const only = values.only ? new Set(values.only.split(',')) : null;
const want = (g) => !only || only.has(g);
const { server, origin } = await serve(site);
const urls = pagesOf(site).map((p) => origin + p);
const sitemap = `${origin}/sitemap.xml`;
const results = [];
const record = (gate, pass, detail, report = '') => { results.push({ gate, pass, detail, report }); console.log(`\n${pass ? '✓ PASS' : '✗ FAIL'} ${gate}: ${detail}\n`); };
const lastPath = (out, re) => { const m = [...out.matchAll(re)]; return m.length ? m[m.length - 1][1].trim() : ''; };

try {
  // (1) ship guard on this repo's branch
  if (want('ship-guard')) {
    let base = values.base || process.env.KIT_BASE || '';
    if (!base) {
      for (const cand of ['origin/main', 'origin/base/templates-full']) {
        if (spawnSync('git', ['merge-base', 'HEAD', cand], { cwd: REPO }).status === 0) { base = cand; break; }
      }
    }
    if (!exists(path.join(GATES, 'ship-guard.sh'))) record('1 ship-guard', false, `missing ${GATES}/ship-guard.sh`);
    else if (!base) record('1 ship-guard', false, 'no base ref shares history with HEAD; pass --base <ref>');
    else {
      const r = await run('bash', [path.join(GATES, 'ship-guard.sh'), REPO, base]);
      const fails = (r.out.match(/^FAIL:/gm) || []).length;
      const dirty = spawnSync('git', ['status', '--porcelain', '--', 'kit', 'tools', 'tests', 'package.json'], { cwd: REPO, encoding: 'utf8' }).stdout.trim();
      record('1 ship-guard', r.code === 0, `${r.code === 0 ? 'clean' : `${fails} finding(s)`} vs ${base}${dirty ? ' (note: uncommitted kit/tools changes are not scanned; commit first)' : ''}`);
    }
  }
  // (2) copy proofread: shared proofread gate + kit copy check
  if (want('proofread')) {
    const pargs = [path.join(GATES, 'proofread-gate.mjs'), '--sitemap', sitemap, '--base', origin];
    if (!process.env.GEMINI_API_KEY) pargs.push('--skip-gemini');
    const r = await run(process.execPath, pargs);
    const pdir = lastPath(r.out, /(\/\S+-proofread)\b/g);
    const pj = pdir ? readJson(path.join(pdir, 'proofread.json')) : null;
    const c = await run(process.execPath, [path.join(KIT, 'gates/copy-check.mjs'), '--facts', factsFile, '--out', path.join(outRoot, 'copy-check.json'), ...urls]);
    const cj = readJson(path.join(outRoot, 'copy-check.json'));
    const pc = pj?.counts ? `${pj.counts.total} findings (${pj.counts.embarrassing} embarrassing, ${pj.counts.medium} medium, ${pj.counts.minor} minor), Gemini ${pj.gemini?.ran ? `ran (kept ${pj.gemini.kept})` : `not run (${process.env.GEMINI_API_KEY ? pj.gemini?.reason || 'error' : 'no GEMINI_API_KEY'})`}` : `exit ${r.code}`;
    const cc = cj ? `${cj.findings.length} findings (${cj.counts.embarrassing} embarrassing, ${cj.counts.medium} medium, ${cj.counts.minor} minor), codespell ${cj.codespell ? 'ran' : 'missing'}` : `exit ${c.code}`;
    record('2 proofread', r.code === 0 && c.code === 0, `proofread-gate ${r.code === 0 ? 'PASS' : 'FAIL'}: ${pc}; kit copy-check ${c.code === 0 ? 'PASS' : 'FAIL'}: ${cc}; ${urls.length} pages`, pdir);
  }
  // (3) axe at 1280 + 390
  if (want('axe')) {
    const r = await run(process.execPath, [path.join(KIT, 'gates/axe.mjs'), '--out', path.join(outRoot, 'axe.json'), ...urls]);
    const a = readJson(path.join(outRoot, 'axe.json'));
    record('3 axe WCAG 2.2 AA', r.code === 0, a ? `${a.totals.scans} scans (${urls.length} pages × 1280/390), ${a.totals.violations} violations (${a.totals.nodes} nodes), ${a.totals.incomplete} needs-review` : `exit ${r.code}`, path.join(outRoot, 'axe.json'));
  }
  // (4) ux-gate at 1280 + 390
  if (want('ux')) {
    const r = await run(process.execPath, [path.join(GATES, 'ux-gate.mjs'), '--sitemap', sitemap, '--base', origin, '--concurrency', '4', '--max-hashes', '12']);
    const rp = lastPath(r.out, /Report: (\S+report\.md)/g);
    const j = rp ? readJson(path.join(path.dirname(rp), 'report.json')) : null;
    const nf = j ? j.runs.reduce((n, x) => n + x.findings.length, 0) : '?';
    record('4 ux-gate', r.code === 0, j ? `${j.runs.length} runs (${j.urls.length} pages × 1280x800/390x844), ${nf} findings` : `exit ${r.code}${r.code === 2 ? ' (browser unavailable)' : ''}`, rp ? path.dirname(rp) : '');
  }
  // (5) lychee: external links via lychee-check.sh + internal links offline
  if (want('lychee')) {
    const r = await run('bash', [path.join(QA, 'lychee-check.sh'), origin], { env: { LYCHEE_REPORTS: path.join(outRoot, 'lychee') } });
    const lj = (() => { const d = path.join(outRoot, 'lychee'); if (!exists(d)) return null; const s = fs.readdirSync(d).sort().pop(); const sub = s && fs.readdirSync(path.join(d, s)).find((x) => fs.statSync(path.join(d, s, x)).isDirectory()); return sub ? readJson(path.join(d, s, sub, 'lychee.json')) : null; })();
    const lychee = [path.join(QA, 'bin/lychee'), 'lychee', path.join(process.env.HOME || '', '.local/bin/lychee')].find((x) => spawnSync(x, ['--version']).status === 0);
    const off = lychee ? await run(lychee, ['--offline', '--no-progress', '--root-dir', site, '--include-fragments', '--format', 'json', '--output', path.join(outRoot, 'lychee-internal.json'), site]) : { code: 2 };
    const oj = readJson(path.join(outRoot, 'lychee-internal.json'));
    const ext = lj ? `${lj.total ?? '?'} links, ${lj.successful ?? '?'} ok, ${lj.errors ?? 0} errors, ${lj.excludes ?? 0} excluded` : `exit ${r.code}`;
    const int = oj ? `${oj.total ?? '?'} links, ${oj.errors ?? 0} errors` : 'not run';
    record('5 lychee', r.code === 0 && off.code === 0, `external (lychee-check.sh): ${ext}; internal (offline, fragments): ${int}`, path.join(outRoot, 'lychee'));
  }
} finally {
  if (!values['keep-serving']) server.close();
}

// ---------------------------------------------------------------- report
const allPass = results.length > 0 && results.every((r) => r.pass);
const md = [
  `# Client site kit gate report: ${facts.name}`, '',
  `- Built: ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })} MT from \`${rel(intakePath)}\``,
  `- Site folder: \`${rel(site)}\` (${pagesOf(site).length} pages, noindex meta + robots.txt + _headers X-Robots-Tag)`,
  `- Plan: ${facts.plan ? `${facts.plan.label} $${facts.plan.price}/mo (TTA records only, not on the site)` : 'none'}`,
  `- Result: **${allPass ? 'PASS, ready for preview review' : 'FAIL'}**`, '',
  '| Gate | Result | Detail | Report |', '|---|---|---|---|',
  ...results.map((r) => `| ${r.gate} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.detail.replace(/\|/g, '/')} | ${r.report ? `\`${r.report}\`` : ''} |`),
  '', warnings.length ? `Intake warnings:\n${warnings.map((w) => `- ${w}`).join('\n')}\n` : '',
  plans.notes.length ? `Price notes:\n${plans.notes.map((w) => `- ${w}`).join('\n')}\n` : '',
  'Go-live (48-hour path, after the owner approves the preview): `npm run export-client -- --site ' + rel(site) + ' --site-url https://<client-domain>` removes noindex and runs the pre-launch scan. Deploys follow docs/DEPLOY-CLOUDFLARE-PAGES.md on the client\'s own account.',
].join('\n');
fs.writeFileSync(path.join(outRoot, 'GATE-REPORT.md'), md + '\n');
fs.writeFileSync(path.join(outRoot, 'gate-results.json'), JSON.stringify({ pass: allPass, results }, null, 2));
console.log('\n' + results.map((r) => `${r.pass ? 'PASS' : 'FAIL'}  ${r.gate}: ${r.detail}`).join('\n'));
console.log(`\nKIT: ${allPass ? 'ALL GATES PASS' : 'GATE FAILURE'}  ->  ${rel(path.join(outRoot, 'GATE-REPORT.md'))}`);
if (values['keep-serving']) console.log(`Serving ${origin}/ (Ctrl+C to stop)`); else process.exit(allPass ? 0 : 1);
