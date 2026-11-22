// Normalize intake answers (field names from the paid-client intake form, /workspace/ops/intake/)
// into the facts the site generator may publish. Private contact fields (contact-*, legal-name,
// lead-email, approver) are never published.
import fs from 'node:fs';
import path from 'node:path';
import { PLANS } from './plans.mjs';

const HEX = /#[0-9a-f]{6}\b/gi;
const SITE_SERVICES = new Set(['starter', 'visibility', 'lead-engine', 'growth']);

function list(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(/\r?\n|;/).map((x) => x.trim()).filter(Boolean);
  return [];
}
function areaList(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v || '').split(/,|\r?\n|;| and /).map((x) => x.trim()).filter(Boolean);
}
function clean(s) { return String(s ?? '').replace(/\s+/g, ' ').trim(); }

export function slugify(name) {
  return String(name).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
}

export function normalizeIntake(raw, { baseDir = process.cwd() } = {}) {
  const errors = [];
  const warnings = [];
  const name = clean(raw['public-name'] || raw.business_name || raw['legal-name']);
  if (!name) errors.push('public-name is required (A3: public name exactly as it should appear)');
  const phone = clean(raw['public-phone'] || (raw.phone_public === 'yes' ? raw.phone : ''));
  if (!phone) errors.push('public-phone is required (A3)');
  const areas = areaList(raw['service-area'] || raw.areas);
  let city = clean(raw.city);
  if (!city && areas.length) city = areas[0];
  if (!city) errors.push('service-area (or city) is required (A3)');
  if (!areas.length && city) areas.push(city.replace(/,\s*[A-Z]{2}$/, ''));
  const email = clean(raw['public-email'] || (raw.email_public === 'yes' ? raw.email : ''));
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(`public-email "${email}" is not an email address`);

  const addrRaw = clean(raw.address);
  const address = addrRaw && !/hide|service[- ]area only/i.test(addrRaw) && raw.address_public !== 'service-area' ? addrRaw : '';

  const hoursMode = clean(raw.hours_mode || '');
  let hours = '';
  if (hoursMode === 'hide') hours = '';
  else if (hoursMode === 'use-google') warnings.push('hours_mode=use-google: hours left off the preview until copied from the Google listing');
  else hours = clean(raw.hours);
  if (hours.length > 120) { warnings.push('hours longer than 120 characters; trimmed'); hours = hours.slice(0, 120); }

  const pricesRaw = clean(raw.prices).toLowerCase();
  const pricesMode = /show|list|yes/.test(pricesRaw) ? 'show' : /later|don.?t invent|send/.test(pricesRaw) ? 'later' : 'quote';
  const services = list(raw['services-list'] || raw.services_list || (Array.isArray(raw.services) && !raw.services.some((s) => SITE_SERVICES.has(s) || PLANS[s]) ? raw.services : [])).map((line) => {
    const [n, d = '', p = ''] = line.split('|').map((x) => clean(x));
    return { name: n, desc: d, price: pricesMode === 'show' ? p : '' };
  }).filter((s) => s.name);
  if (!services.length) errors.push('services-list is required (B1: list each service, one per line, "Name | short description")');
  for (const s of services) if (s.price && !/^\$?\d/.test(s.price) && !/from \$\d/i.test(s.price)) warnings.push(`price "${s.price}" for ${s.name} is not a dollar amount; shown as written`);
  if (pricesMode !== 'show' && list(raw['services-list']).some((l) => /\$\d/.test(l))) warnings.push('services-list mentions $ amounts but prices is not "show"; the $ text is kept only in descriptions as written');

  const hexes = String(raw.colors || '').match(HEX) || [];
  const purchased = list(raw.services).map((s) => s.toLowerCase());
  const planId = purchased.find((s) => PLANS[s]) || (raw.plan && PLANS[raw.plan] ? raw.plan : '');
  if (!planId) warnings.push('no website plan (starter/visibility/lead-engine/growth) in services; build.json records plan: none');

  let faq = [];
  if (Array.isArray(raw.faq)) faq = raw.faq.filter((f) => f && clean(f.q) && clean(f.a)).map((f) => ({ q: clean(f.q), a: clean(f.a) }));

  const photos = (Array.isArray(raw.photos) ? raw.photos : []).map((p) => (typeof p === 'string' ? { file: p, alt: '' } : p)).filter((p) => p && p.file)
    .map((p) => ({ file: path.resolve(baseDir, p.file), alt: clean(p.alt) }));
  for (const p of photos) {
    if (!fs.existsSync(p.file)) errors.push(`photo not found: ${p.file}`);
    if (!p.alt) errors.push(`photo ${path.basename(p.file)} needs alt text ("alt")`);
  }
  const formEndpoint = clean(raw['form-endpoint'] || '');
  if (formEndpoint && !/^https:\/\//.test(formEndpoint)) errors.push('form-endpoint must be an https:// URL (Formspree, Web3Forms, or the client Worker)');
  const tagline = clean(raw.tagline || '');
  if (tagline.length > 90) errors.push('tagline must be 90 characters or fewer');

  return {
    errors, warnings,
    facts: {
      name, slug: slugify(name), trade: clean(raw.trade || raw['gbp-category'] || 'generic-business').toLowerCase().replace(/\s+/g, '-'),
      city, areas, phone, email, address, hours, services, pricesMode,
      primary: hexes[0] || '', accent: hexes[1] || '', tagline, faq, photos, formEndpoint,
      text: raw.text_ok === true,
      avoid: clean(raw.avoid), sample: raw._sample === true,
      plan: planId ? { id: planId, ...PLANS[planId] } : null,
    },
  };
}
