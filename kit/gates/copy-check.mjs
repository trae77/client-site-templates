#!/usr/bin/env node
// Rendered-copy checks the shared proofread gate does not do, run against the text a visitor sees:
// leftover dev/placeholder text, prices or plan names not in the intake, AI filler, unsupplied claims,
// repeated sentences, doubled words/punctuation, and a codespell typo pass (if codespell is installed).
//   node kit/gates/copy-check.mjs --facts facts.json [--out report.json] <url> [url...]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export const DEV_TEXT = /\b(sample|demo|mockup|design concept|placeholder|goes here|lorem ipsum|todo|tbd|fixme|confirm\]|customi[sz]e|company_name|coming soon|undefined|NaN|first draft|draft)\b|\[[^\]]{1,40}\]|\{\{|\}\}/i;
export const AI_FILLER = /\b(elevate|seamless(ly)?|unlock|unleash|delve|tapestry|game[- ]changer|cutting[- ]edge|state[- ]of[- ]the[- ]art|look no further|in today's fast[- ]paced|world[- ]class|second to none|top[- ]notch|one[- ]stop shop|we pride ourselves|your satisfaction is our|peace of mind|hassle[- ]free|bespoke|synergy|robust|leverage)\b/i;
export const CLAIMS = /\b(licensed|insured|bonded|certified|guarantee[ds]?|warrant(y|ies)|24\/7|same[- ]day|\d+\+? years|award[- ]winning|#1|number one|best in|five[- ]star|5[- ]star|free estimates?)\b/i;
const PLAN_NAMES = /\b(Starter|Visibility|Lead Engine|Growth Engine|Market Leader|TTA Web Dev)\b/;

export function checkText(text, facts, url = '') {
  const findings = [];
  const add = (severity, problem, quote) => findings.push({ url, severity, problem, quote: String(quote).slice(0, 160) });
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const supplied = [facts.tagline, ...(facts.services || []).flatMap((s) => [s.name, s.desc, s.price]), ...(facts.faq || []).flatMap((f) => [f.q, f.a]), facts.hours].filter(Boolean).join(' \n ');
  for (const l of lines) {
    const dev = l.match(DEV_TEXT); if (dev && !supplied.includes(dev[0])) add('embarrassing', 'leftover dev / placeholder text', l);
    const ai = l.match(AI_FILLER); if (ai && !supplied.toLowerCase().includes(ai[0].toLowerCase())) add('medium', `AI filler ("${ai[0]}")`, l);
    const cl = l.match(CLAIMS); if (cl && !supplied.toLowerCase().includes(cl[0].toLowerCase())) add('embarrassing', `claim the owner did not supply ("${cl[0]}")`, l);
    if (PLAN_NAMES.test(l) && !supplied.includes(l.match(PLAN_NAMES)[0])) add('embarrassing', 'TTA plan or agency name on a client page', l);
    for (const m of l.matchAll(/\$\s?\d[\d,]*(\.\d\d)?/g)) if (!supplied.includes(m[0])) add('embarrassing', `price ${m[0]} is not in the intake (never invent prices)`, l);
    const dw = l.match(/\b(\w{2,})\s+\1\b/i); if (dw && !/^\d+$/.test(dw[1])) add('medium', `repeated word "${dw[1]}"`, l);
    if (/[^.]\.\.(?!\.)|\s[,.;:]\s|,,|\?\?|!!/.test(l)) add('medium', 'doubled or stray punctuation', l);
    if (/\b(a)\s+[aeiou]\w+/i.test(l) && !/\ba\s+(one|uni|use|eu|u[sr])/i.test(l)) { const m = l.match(/\ba\s+[aeiou]\w+/i); add('minor', `article: "${m[0]}"`, l); }
  }
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 8);
  const seen = new Map();
  for (const s of sentences) seen.set(s, (seen.get(s) || 0) + 1);
  for (const [s, n] of seen) if (n > 1) add('medium', `same sentence ${n} times on one page`, s);
  if (/(^|\/)$|index\.html$/.test(new URL(url || 'http://x/').pathname)) {
    for (const sv of facts.services || []) for (const v of [sv.name, sv.desc, sv.price]) {
      if (v && !text.includes(v.replace(/[.]$/, ''))) add('embarrassing', 'intake service text missing or garbled on the page', v);
    }
  }
  if (facts.name && !text.includes(facts.name)) add('embarrassing', 'business name missing', facts.name);
  if (facts.phone && !text.includes(facts.phone)) add('embarrassing', 'public phone missing or reformatted', facts.phone);
  return findings;
}

function codespell(text, url) {
  const bin = [process.env.CODESPELL, path.join(os.homedir(), '.local/bin/codespell'), 'codespell'].find((b) => b && spawnSync(b, ['--version']).status === 0);
  if (!bin) return { ran: false, findings: [] };
  const tmp = path.join(os.tmpdir(), `kit-copy-${process.pid}.txt`);
  fs.writeFileSync(tmp, text);
  const r = spawnSync(bin, ['--check-filenames=false', tmp], { encoding: 'utf8' });
  fs.rmSync(tmp, { force: true });
  const findings = (r.stdout || '').split('\n').filter((l) => l.includes('==>')).map((l) => ({ url, severity: 'medium', problem: 'typo (codespell)', quote: l.replace(/^.*?:\d+:\s*/, '') }));
  return { ran: true, findings };
}

async function main() {
  const args = process.argv.slice(2);
  const take = (f) => { const i = args.indexOf(f); if (i < 0) return ''; const v = args[i + 1]; args.splice(i, 2); return v; };
  const factsFile = take('--facts'); const out = take('--out');
  if (!factsFile || !args.length) { console.error('Usage: copy-check.mjs --facts facts.json [--out report.json] <url>...'); process.exit(2); }
  const facts = JSON.parse(fs.readFileSync(factsFile, 'utf8'));
  const { chromium } = require('playwright');
  const exe = process.env.CHROME || process.env.CHROME_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const findings = []; const pages = []; let spell = false;
  try {
    for (const url of args) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(url, { waitUntil: 'networkidle' });
      const text = await page.evaluate(() => {
        const alts = [...document.querySelectorAll('img[alt], [aria-label]')].map((e) => e.getAttribute('alt') || e.getAttribute('aria-label')).filter(Boolean);
        return [document.title, document.querySelector('meta[name="description"]')?.content || '', document.body.innerText, ...alts].join('\n');
      });
      pages.push({ url, chars: text.length });
      findings.push(...checkText(text, facts, url));
      const cs = codespell(text, url); spell = spell || cs.ran; findings.push(...cs.findings);
      await page.close();
    }
  } finally { await browser.close(); }
  const counts = { embarrassing: 0, medium: 0, minor: 0 };
  for (const f of findings) counts[f.severity]++;
  const pass = !counts.embarrassing && !counts.medium;
  for (const f of findings) console.log(`  ${f.severity.toUpperCase()} ${f.problem}: "${f.quote}" (${f.url})`);
  console.log(`COPY CHECK: ${pass ? 'PASS' : 'FAIL'} (${pages.length} pages, ${findings.length} findings: ${counts.embarrassing} embarrassing, ${counts.medium} medium, ${counts.minor} minor; codespell ${spell ? 'ran' : 'not installed'})`);
  if (out) fs.writeFileSync(out, JSON.stringify({ pass, pages, counts, codespell: spell, findings }, null, 2));
  process.exit(pass ? 0 : 1);
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(2); });
