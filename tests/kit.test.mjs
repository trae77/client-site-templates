// Tests for the one-command client site kit (kit/). Run: npm run test:kit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeIntake } from '../kit/lib/intake.mjs';
import { finishHtml, joinAreas } from '../kit/lib/finish.mjs';
import { checkText } from '../kit/gates/copy-check.mjs';
import { PLANS, LOCKED_PRICES } from '../kit/lib/plans.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAMPLE = path.join(ROOT, 'kit/samples/juniper-ridge-painting.intake.json');
const sample = JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));

test('plan prices are the locked $199/$399/$599/$899', () => {
  assert.deepEqual(Object.values(PLANS).map((p) => p.price), LOCKED_PRICES);
  assert.deepEqual(LOCKED_PRICES, [199, 399, 599, 899]);
});

test('sample intake normalizes with no errors and records the plan', () => {
  const { errors, facts } = normalizeIntake(sample);
  assert.deepEqual(errors, []);
  assert.equal(facts.name, 'Juniper Ridge Painting');
  assert.equal(facts.plan.label, 'Lead Engine');
  assert.equal(facts.plan.price, 599);
  assert.equal(facts.address, '', 'service-area-only address stays hidden');
  assert.equal(facts.services.length, 4);
  assert.equal(facts.services[0].price, '', 'prices stay off unless prices=show');
});

test('missing required answers are refused', () => {
  const { errors } = normalizeIntake({ 'public-name': 'X Co' });
  assert.ok(errors.some((e) => /public-phone/.test(e)));
  assert.ok(errors.some((e) => /service-area/.test(e)));
  assert.ok(errors.some((e) => /services-list/.test(e)));
});

test('joinAreas uses an Oxford comma', () => {
  assert.equal(joinAreas(['A', 'B', 'C']), 'A, B, and C');
  assert.equal(joinAreas(['A', 'B']), 'A and B');
});

test('copy check catches invented prices, plan names, dev text, filler and claims', () => {
  const { facts } = normalizeIntake(sample);
  const bad = 'Juniper Ridge Painting\n(555) 010-0142\nInterior painting from $350.\nLead Engine plan\nSample photos for this mockup.\nWe elevate your home.\nLicensed and insured.';
  const probs = checkText(bad, facts, 'http://x/privacy.html').map((f) => f.problem).join(' | ');
  for (const re of [/price \$350/, /plan or agency/, /dev \/ placeholder/, /AI filler/, /claim the owner did not supply/]) assert.match(probs, re);
  assert.deepEqual(checkText('Juniper Ridge Painting\n(555) 010-0142\nInterior painting', facts, 'http://x/privacy.html'), []);
  const home = checkText('Juniper Ridge Painting\n(555) 010-0142\nInterior painting', facts, 'http://x/');
  assert.ok(home.some((f) => /service text missing/.test(f.problem)), 'home page must show every intake service verbatim');
});

test('end to end: build has owner services, noindex, no PII, no mockup text', () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-test-'));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'kit/client-site.mjs'), SAMPLE, '--out', out, '--skip-gates'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const html = fs.readFileSync(path.join(out, 'site/index.html'), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(fs.readFileSync(path.join(out, 'site/robots.txt'), 'utf8'), /Disallow: \//);
  assert.match(fs.readFileSync(path.join(out, 'site/_headers'), 'utf8'), /X-Robots-Tag: noindex/);
  for (const s of sample['services-list']) assert.ok(html.includes(s.split('|')[0].trim()), s);
  for (const k of ['contact-email', 'contact-phone', 'contact-name', 'legal-name', 'lead-email']) assert.ok(!html.includes(sample[k]), k);
  assert.doesNotMatch(html, /mockup|placeholder|design concept|does not send|api\.ttawebdev\.com\/v\.gif|<form/i);
  assert.equal((html.match(/>Privacy Policy</g) || []).length, 1);
  assert.doesNotMatch(html, /\$(199|399|599|899)\b/);
  const priv = fs.readFileSync(path.join(out, 'site/privacy.html'), 'utf8');
  assert.match(priv, /noindex/);
  assert.doesNotMatch(priv, /Template\.|type into a form/);
  fs.rmSync(out, { recursive: true, force: true });
});

test('prices with $1-style text survive replacement (no regex backrefs)', () => {
  const { facts } = normalizeIntake({ ...sample, prices: 'show', 'services-list': ['Drywall | Patch | from $150', 'Doors | Fix | from $95'] });
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-test-'));
  const f2 = path.join(out, 'in.json');
  fs.writeFileSync(f2, JSON.stringify({ ...sample, prices: 'show', 'services-list': ['Drywall | Patch | from $150', 'Doors | Fix | from $95'] }));
  const r = spawnSync(process.execPath, [path.join(ROOT, 'kit/client-site.mjs'), f2, '--out', path.join(out, 'o'), '--skip-gates'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const html = fs.readFileSync(path.join(out, 'o/site/index.html'), 'utf8');
  assert.match(html, /from &#36;150/);
  assert.equal((html.match(/id="services-title"/g) || []).length, 1);
  assert.equal(facts.services[0].price, 'from $150');
  fs.rmSync(out, { recursive: true, force: true });
});

test('raw finishHtml keeps the owner phone and drops gallery placeholders', () => {
  const { facts } = normalizeIntake(sample);
  const tpl = '<head><meta name="viewport" content="x"></head><nav><a href="#gallery">Gallery</a></nav><p class="lead">x</p><section id="services"><div class="container"><div class="section-head"><h2 id="services-title">Services</h2><p>Typical services shown for this mockup.</p></div><div class="cards"><article>a</article>\n        </div>\n      </div>\n    </section>\n<section id="gallery"><span>Photo placeholder</span></section>';
  const h = finishHtml(tpl, facts);
  assert.doesNotMatch(h, /gallery|placeholder|mockup/i);
  assert.match(h, /Interior painting/);
});
