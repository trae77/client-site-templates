#!/usr/bin/env node
/**
 * Quick homepage mockup generator.
 *
 *   npm run mockup -- --name "Acme Pressure Washing" --trade pressure-washing \
 *     --city "Aurora, CO" --phone "(303) 555-0142" --primary "#0b5394" --accent "#f1c232"
 *
 * Copies a template folder, swaps in the business name / city / phone / email,
 * re-brands the colors via CSS custom properties, and renders a full-page PNG
 * with headless Chromium (Playwright). Run with --help for all flags.
 */
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Template config: exact placeholder strings used in each template folder.
// If you edit a template's placeholder copy, update it here too.
// ---------------------------------------------------------------------------
const TEMPLATES = {
  'pressure-washing': {
    name: 'Summit Pressure Pros',
    phone: '(555) 214-8800',
    email: 'hello@summitpressurepros.example',
    homeCity: 'Denver',
    address: '1840 Ridgeway Ave, Denver, CO 80204',
    defaults: { primary: '#0369a1', accent: '#facc15' },
    extra: (c) => [['serving the Denver metro', `serving ${c.cityName} and the surrounding area`]],
  },
  landscaping: {
    name: 'Greenhaven Lawn & Landscape',
    phone: '(555) 391-2200',
    email: 'care@greenhavenlawn.example',
    homeCity: 'Fort Collins',
    address: '920 Maple Crest Dr, Fort Collins, CO 80525',
    defaults: { primary: '#15803d', accent: '#facc15' },
    extra: (c) => [['keeps Northern Colorado yards', `keeps ${c.cityName}-area yards`]],
  },
  plumbing: {
    name: 'Ridge Line Plumbing',
    phone: '(555) 748-9100',
    email: 'dispatch@ridgelineplumbing.example',
    homeCity: 'Colorado Springs',
    address: '410 Industrial Blvd, Colorado Springs, CO 80907',
    defaults: { primary: '#1e40af', accent: '#f97316' },
  },
  'cleaning-service': {
    name: 'BrightNest Cleaning Co.',
    phone: '(555) 602-4411',
    email: 'book@brightnestcleaning.example',
    homeCity: 'Boulder',
    address: '55 Pearl St, Suite 200, Boulder, CO 80302',
    defaults: { primary: '#6d28d9', accent: '#2dd4bf' },
  },
  restaurant: {
    name: "Nonna's Wood-Fired Pizza",
    phone: '(555) 833-1700',
    email: 'hello@nonnaspizza.example',
    homeCity: 'Golden',
    address: '312 Main Street, Golden, CO 80401',
    addressLabel: 'Location',
    defaults: { primary: '#b91c1c', accent: '#f59e0b' },
  },
  'auto-detailing': {
    name: 'MirrorFinish Auto Detail',
    phone: '(555) 477-3300',
    email: 'book@mirrorfinishdetail.example',
    homeCity: 'Aurora',
    address: '780 Commerce Park Rd, Aurora, CO 80011',
    dark: true,
    defaults: { primary: '#0891b2', accent: '#fbbf24' },
    extra: () => [['Real protection.. Serving', 'Real protection. Serving']],
  },
  handyman: {
    name: 'SteadyHands Home Repair',
    phone: '(555) 916-5500',
    email: 'jobs@steadyhandshome.example',
    homeCity: 'Denver',
    address: '2200 Blake St, Denver, CO 80205',
    defaults: { primary: '#b45309', accent: '#0f766e' },
  },
  'generic-business': {
    name: 'Northstar Local Co.',
    phone: '(555) 100-2000',
    email: 'hello@northstarlocal.example',
    homeCity: 'Your Town',
    address: '100 Market Street, Your Town, USA 00000',
    defaults: { primary: '#1e40af', accent: '#f59e0b' },
    extra: (c) => [
      [
        /<!-- COMPANY_NAME -->\s*Northstar Local Co\. is a placeholder small-business one-pager\.[^<]*/,
        `${c.nameHtml} is a locally owned business serving ${c.cityName} and nearby communities. ` +
          `We keep it simple: clear pricing, reliable scheduling, and work we are proud to put our name on.`,
      ],
      ['Nearby City', c.areas[1] || c.cityName],
    ],
  },
};

// Friendly trade names -> template folder. Unknown trades fall back to generic-business.
const TRADE_ALIASES = {
  'pressure-washing': ['pressure-washing', 'pressure-wash', 'pressure', 'power-washing', 'power-wash', 'powerwashing', 'pressurewashing', 'soft-wash', 'softwash', 'exterior-cleaning', 'window-washing'],
  landscaping: ['landscaping', 'landscape', 'landscaper', 'lawn', 'lawn-care', 'lawncare', 'lawn-service', 'mowing', 'yard', 'yard-care', 'tree-service', 'snow-removal'],
  plumbing: ['plumbing', 'plumber', 'plumbers', 'drain', 'water-heater'],
  'cleaning-service': ['cleaning-service', 'cleaning', 'cleaner', 'cleaners', 'house-cleaning', 'maid', 'maids', 'janitorial', 'commercial-cleaning', 'carpet-cleaning'],
  restaurant: ['restaurant', 'pizza', 'pizzeria', 'cafe', 'coffee', 'bakery', 'food', 'food-truck', 'diner', 'bar', 'catering'],
  'auto-detailing': ['auto-detailing', 'detailing', 'detail', 'detailer', 'car-detailing', 'mobile-detailing', 'auto-detail', 'car-wash', 'ceramic-coating'],
  handyman: ['handyman', 'handy-man', 'home-repair', 'home-repairs', 'repair', 'repairs', 'home-improvement', 'remodeling', 'painting', 'painter', 'carpentry', 'drywall'],
  'generic-business': ['generic', 'generic-business', 'business', 'other', 'default'],
};

// Nearby-area suggestions for service-area pills (Front Range + a few big metros).
// Anything not listed gets [City, "Surrounding areas"] unless --areas is passed.
const NEARBY = {
  denver: ['Aurora', 'Lakewood', 'Englewood', 'Arvada', 'Westminster'],
  aurora: ['Denver', 'Centennial', 'Parker', 'Commerce City', 'Englewood'],
  thornton: ['Northglenn', 'Westminster', 'Brighton', 'Commerce City', 'Broomfield'],
  westminster: ['Arvada', 'Broomfield', 'Thornton', 'Northglenn', 'Federal Heights'],
  arvada: ['Westminster', 'Wheat Ridge', 'Golden', 'Lakewood', 'Broomfield'],
  lakewood: ['Denver', 'Golden', 'Wheat Ridge', 'Littleton', 'Arvada'],
  littleton: ['Englewood', 'Centennial', 'Highlands Ranch', 'Lakewood', 'Ken Caryl'],
  centennial: ['Aurora', 'Littleton', 'Greenwood Village', 'Parker', 'Englewood'],
  englewood: ['Denver', 'Littleton', 'Centennial', 'Sheridan', 'Cherry Hills Village'],
  'highlands ranch': ['Littleton', 'Lone Tree', 'Centennial', 'Castle Rock', 'Parker'],
  parker: ['Aurora', 'Castle Rock', 'Centennial', 'Lone Tree', 'Elizabeth'],
  'castle rock': ['Parker', 'Castle Pines', 'Highlands Ranch', 'Larkspur', 'Sedalia'],
  broomfield: ['Westminster', 'Louisville', 'Superior', 'Thornton', 'Erie'],
  northglenn: ['Thornton', 'Westminster', 'Federal Heights', 'Broomfield', 'Commerce City'],
  'commerce city': ['Denver', 'Thornton', 'Brighton', 'Aurora', 'Henderson'],
  brighton: ['Thornton', 'Commerce City', 'Henderson', 'Fort Lupton', 'Northglenn'],
  golden: ['Lakewood', 'Arvada', 'Wheat Ridge', 'Evergreen', 'Morrison'],
  boulder: ['Louisville', 'Lafayette', 'Superior', 'Longmont', 'Niwot'],
  longmont: ['Boulder', 'Niwot', 'Firestone', 'Frederick', 'Berthoud'],
  'fort collins': ['Loveland', 'Windsor', 'Timnath', 'Wellington', 'Greeley'],
  loveland: ['Fort Collins', 'Berthoud', 'Johnstown', 'Windsor', 'Greeley'],
  greeley: ['Evans', 'Windsor', 'Johnstown', 'Loveland', 'Eaton'],
  'colorado springs': ['Monument', 'Fountain', 'Manitou Springs', 'Falcon', 'Woodland Park'],
  pueblo: ['Pueblo West', 'Colorado City', 'Canon City', 'Fountain', 'Rye'],
  phoenix: ['Scottsdale', 'Tempe', 'Mesa', 'Glendale', 'Chandler'],
  dallas: ['Plano', 'Irving', 'Garland', 'Richardson', 'Mesquite'],
  houston: ['Katy', 'Sugar Land', 'Pearland', 'The Woodlands', 'Pasadena'],
  austin: ['Round Rock', 'Cedar Park', 'Pflugerville', 'Georgetown', 'Leander'],
  atlanta: ['Marietta', 'Decatur', 'Sandy Springs', 'Alpharetta', 'Smyrna'],
  charlotte: ['Concord', 'Matthews', 'Huntersville', 'Gastonia', 'Mint Hill'],
  nashville: ['Franklin', 'Brentwood', 'Murfreesboro', 'Hendersonville', 'Mount Juliet'],
  tampa: ['St. Petersburg', 'Clearwater', 'Brandon', 'Wesley Chapel', 'Riverview'],
  'salt lake city': ['Sandy', 'West Valley City', 'Murray', 'Draper', 'South Jordan'],
  'las vegas': ['Henderson', 'North Las Vegas', 'Summerlin', 'Paradise', 'Enterprise'],
};

// ---------------------------------------------------------------------------
// Color helpers (WCAG contrast)
// ---------------------------------------------------------------------------
function parseHex(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Invalid hex color: "${hex}" (use e.g. #0b5394)`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = parseHex(a), B = parseHex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const shade = (c, t) => mix(c, '#000000', t);
const tint = (c, t) => mix(c, '#ffffff', t);
function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }
const DARK_TEXT = '#0f172a';
const pickText = (bg) => (contrast('#ffffff', bg) >= contrast(DARK_TEXT, bg) ? '#ffffff' : DARK_TEXT);
/** Nudge `color` toward black/white until it reaches `min` contrast against `bg`. */
function ensureContrast(color, bg, min) {
  const toward = luminance(bg) > 0.4 ? '#000000' : '#ffffff';
  let c = color;
  for (let i = 1; i <= 20 && contrast(c, bg) < min; i++) c = mix(color, toward, i * 0.05);
  return c;
}
const rgba = (hex, a) => `rgba(${parseHex(hex).join(', ')}, ${a})`;

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const phoneDigits = (p) => { let d = String(p).replace(/\D/g, ''); if (d.length === 11 && d.startsWith('1')) d = d.slice(1); return d; };
const formatPhone = (p) => { const d = phoneDigits(p); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(p).trim(); };
const telHref = (p) => { const d = phoneDigits(p); return d.length === 10 ? `tel:+1${d}` : `tel:${d}`; };
const replaceAllLiteral = (str, find, rep) => str.split(find).join(rep);

function resolveTrade(trade) {
  const key = slugify(trade || '');
  for (const [folder, aliases] of Object.entries(TRADE_ALIASES)) if (aliases.includes(key)) return { folder, fallback: false };
  // loose match: "mobile-car-detailing" -> detailing, "lawn-mowing-co" -> lawn, etc.
  for (const [folder, aliases] of Object.entries(TRADE_ALIASES)) {
    if (folder === 'generic-business') continue;
    if (aliases.some((a) => key.split('-').includes(a) || (a.includes('-') && key.includes(a)))) return { folder, fallback: false };
  }
  return { folder: 'generic-business', fallback: true };
}

function parseCity(city) {
  const raw = String(city || '').trim();
  const m = raw.match(/^(.*?)(?:,\s*([A-Za-z .]+))?$/);
  const cityName = (m?.[1] || raw).trim();
  const state = (m?.[2] || '').trim();
  const stateOut = state.length === 2 ? state.toUpperCase() : state;
  return { cityName, state: stateOut, cityFull: stateOut ? `${cityName}, ${stateOut}` : cityName };
}

function usage() {
  return `
Quick homepage mockup generator

Usage:
  npm run mockup -- --name "Acme Pressure Washing" --trade pressure-washing \\
    --city "Aurora, CO" --phone "(303) 555-0142" [--primary "#0b5394"] [--accent "#f1c232"] [--mobile]

Required:
  --name      Business name (exactly as it should appear)
  --trade     Trade / template alias (see below). Unknown trades fall back to generic-business
  --city      City, optionally with state: "Thornton, CO"
  --phone     Phone number in any format: "(720) 555-0187", 7205550187, +1 720-555-0187

Optional:
  --primary   Main brand color (hex). Hero, buttons, links. Default: per-template
  --accent    Highlight color (hex). Hero CTA, badges, accent bars. Default: per-template
  --areas     Comma-separated service areas for the pills, e.g. "Aurora,Denver,Parker"
  --email     Email to show (default: <local>@<businessname>.com)
  --out       Output HTML folder (default: mockups/<slug>/ in the repo)
  --png-dir   Where PNGs go (default: the parent of --out, e.g. mockups/)
  --mobile    Also render a 390px-wide mobile screenshot
  --no-png    Skip screenshots (just build the HTML folder)
  --list      Print trade aliases and exit
  --help      Show this help

Trade aliases:
${Object.entries(TRADE_ALIASES).map(([f, a]) => `  ${f.padEnd(17)} ${a.join(', ')}`).join('\n')}
`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
function buildCss(cfg, primary, accent, galleryCount = 0) {
  const lines = [];
  const v = {};
  if (cfg.dark) {
    v.bg = mix(primary, '#0b1120', 0.9);
    v.card = mix(primary, '#131c31', 0.84);
    v.text = '#e2e8f0';
    v.muted = '#a3b1c6';
    v.headerBg = rgba(v.bg, 0.92);
    v.footerBg = mix(primary, '#020617', 0.94);
    v.link = ensureContrast(primary, v.card, 4.5);
    v.border = 'rgba(148,163,184,0.2)';
  } else {
    v.bg = mix(primary, '#ffffff', 0.955);
    v.card = '#ffffff';
    v.text = DARK_TEXT;
    v.muted = '#5b6577';
    v.headerBg = 'rgba(255,255,255,0.94)';
    v.footerBg = mix(primary, '#0b1120', 0.86);
    v.link = ensureContrast(primary, v.bg, 4.5);
    v.border = 'rgba(15,23,42,0.08)';
  }
  v.linkDark = cfg.dark ? tint(v.link, 0.2) : shade(v.link, 0.25);
  const onLink = pickText(v.link);
  const onLinkDark = pickText(v.linkDark);

  // Hero: keep text readable. White text over a deepened gradient when the primary allows it,
  // otherwise dark text over a light gradient.
  const whiteHero = contrast('#ffffff', primary) >= 3;
  let heroStart, heroMid, heroEnd, heroText;
  if (whiteHero) {
    heroText = '#ffffff';
    heroStart = shade(primary, 0.55);
    heroMid = shade(primary, 0.2);
    heroEnd = ensureContrast(mix(primary, accent, 0.18), '#ffffff', 3);
  } else {
    heroText = DARK_TEXT;
    heroStart = tint(primary, 0.45);
    heroMid = tint(primary, 0.15);
    heroEnd = primary;
  }
  const heroSoft = heroText === '#ffffff' ? '255,255,255' : '15,23,42';
  const onAccent = pickText(accent);
  const accentOnDark = ensureContrast(accent, v.footerBg, 4.5);
  const accentOnBg = ensureContrast(accent, v.card, 3); // large/bold text only

  lines.push(
    '',
    '/* ==========================================================================',
    '   Mockup brand overrides (generated by tools/mockup.mjs)',
    `   primary ${primary} · accent ${accent}`,
    '   ========================================================================== */',
    ':root {',
    `  --accent: ${v.link};`,
    `  --accent-dark: ${v.linkDark};`,
    `  --brand-primary: ${primary};`,
    `  --brand-accent: ${accent};`,
    `  --bg: ${v.bg};`,
    `  --text: ${v.text};`,
    `  --muted: ${v.muted};`,
    `  --card: ${v.card};`,
    `  --border: ${v.border};`,
    `  --header-bg: ${v.headerBg};`,
    `  --footer-bg: ${v.footerBg};`,
    '}',
    `.site-header { border-top: 4px solid var(--brand-accent); }`,
    `.nav-cta { color: ${onLink} !important; }`,
    `.nav-cta:hover { color: ${onLinkDark} !important; }`,
    `.hero { color: ${heroText}; background: linear-gradient(135deg, ${heroStart} 0%, ${heroMid} 55%, ${heroEnd} 100%); }`,
    `.hero::before { opacity: 0.22; }`,
    `.hero-badge { background: ${rgba(accent, 0.22)}; border-color: ${rgba(accent, 0.75)}; color: ${heroText}; }`,
    `.hero h1 { text-shadow: ${whiteHero ? '0 2px 18px rgba(0,0,0,0.25)' : 'none'}; }`,
    `.btn-primary { background: var(--brand-accent); color: ${onAccent}; }`,
    `.btn-primary:hover { background: ${onAccent === '#ffffff' ? shade(accent, 0.1) : tint(accent, 0.15)}; }`,
    `.btn-ghost { color: ${heroText}; border-color: rgba(${heroSoft},0.6); }`,
    `.btn-ghost:hover { background: rgba(${heroSoft},0.12); }`,
    `.btn:focus-visible { outline-color: ${heroText}; }`,
    `.btn-accent { color: ${onLink}; }`,
    `.btn-accent:hover { color: ${onLinkDark}; }`,
    `.section-head h2::after { content: ""; display: block; width: 56px; height: 4px; border-radius: 4px; margin: 0.65rem auto 0; background: var(--brand-accent); }`,
    `.card-icon { background: ${rgba(accent, 0.22)}; color: ${cfg.dark ? accentOnDark : v.link}; }`,
    `.stat { border-top: 3px solid var(--brand-accent); }`,
    `.stat strong { color: ${cfg.dark ? accentOnDark : v.link}; }`,
    `.pill { background: ${rgba(v.link, cfg.dark ? 0.25 : 0.12)}; color: ${cfg.dark ? tint(v.link, 0.4) : v.linkDark}; }`,
    `.form-success { color: ${cfg.dark ? tint(v.link, 0.4) : v.linkDark}; }`,
    `.site-footer { border-top: 4px solid var(--brand-accent); }`,
    `.site-footer a { color: ${accentOnDark}; }`,
  );
  if (galleryCount === 2) lines.push('.gallery { grid-template-columns: repeat(2, 1fr); }', '.gallery figure { aspect-ratio: 16/10; }');
  if (galleryCount === 4) lines.push('.gallery { grid-template-columns: repeat(4, 1fr); }', '@media (max-width: 700px) { .gallery { grid-template-columns: repeat(2, 1fr); } }');
  if (galleryCount === 3) lines.push('.gallery { grid-template-columns: repeat(3, 1fr); }', '@media (max-width: 700px) { .gallery { grid-template-columns: repeat(2, 1fr); } .gallery figure:first-child { grid-column: span 2; aspect-ratio: 16/9; } }');
  if (cfg.dark) lines.push(`.contact-form input, .contact-form textarea, .contact-form select { background: ${mix(primary, '#0b1120', 0.93)}; }`);
  void accentOnBg;
  return lines.join('\n') + '\n';
}

function buildHtml(cfg, html, ctx) {
  const { nameHtml, phoneDisplay, tel, email, cityName, cityFull, areas } = ctx;
  const oldNames = [cfg.name, escapeHtml(cfg.name), cfg.name.replace(/'/g, '&#39;'), cfg.name.replace(/'/g, '’')];
  // Pass 1 swaps placeholders for tokens, pass 2 renames the template's home city in the
  // remaining copy, pass 3 fills tokens. This keeps new values (e.g. a "Denver" service
  // area or a name containing a city) from being clobbered by the city rename.
  const tokens = [];
  const tok = (value) => { tokens.push(value); return `\u0000${tokens.length - 1}\u0000`; };
  let out = html;

  // Template-specific copy first (may reference the old name).
  for (const [find, rep] of cfg.extra ? cfg.extra(ctx) : []) {
    const r = tok(rep);
    out = find instanceof RegExp ? out.replace(new RegExp(find.source, find.flags.includes('g') ? find.flags : find.flags + 'g'), () => r) : replaceAllLiteral(out, find, r);
  }

  // Copyright line (avoid "Co.. All rights")
  for (const n of oldNames) out = replaceAllLiteral(out, `${n}. All rights`, tok(`${nameHtml}${nameHtml.endsWith('.') ? '' : '.'} All rights`));

  // Business name everywhere
  const nameTok = tok(nameHtml);
  for (const n of oldNames) out = replaceAllLiteral(out, n, nameTok);

  // Phone text + tel: links
  out = replaceAllLiteral(out, `tel:+1${phoneDigits(cfg.phone)}`, tok(tel));
  out = replaceAllLiteral(out, cfg.phone, tok(escapeHtml(phoneDisplay)));

  // Email
  out = replaceAllLiteral(out, cfg.email, tok(escapeHtml(email)));

  // Address -> service area (a fake street address would look like the prospect's real one)
  const label = cfg.addressLabel || 'Service area';
  const areaText = cfg.addressLabel ? escapeHtml(cityFull) : `${escapeHtml(cityFull)} &amp; surrounding areas`;
  out = replaceAllLiteral(out, `<strong>Address:</strong> ${cfg.address}`, tok(`<strong>${label}:</strong> ${areaText}`));
  out = replaceAllLiteral(out, cfg.address, tok(cfg.addressLabel ? escapeHtml(cityFull) : `Proudly serving ${escapeHtml(cityFull)}`));

  // Service-area pills
  out = out.replace(/(<div class="pill-list">)[\s\S]*?(<\/div>)/, (_, a, b) =>
    `${a}\n            ${tok(areas.map((x) => `<span class="pill">${escapeHtml(x)}</span>`).join(''))}\n          ${b}`);

  // Testimonial locations rotate through the service areas
  let i = 0;
  const realAreas = areas.filter((a) => !/surrounding/i.test(a));
  out = out.replace(/(<footer>— [^,<]+, )([^<]+)(<\/footer>)/g, (_, a, _loc, b) => `${a}${tok(escapeHtml(realAreas[i++ % realAreas.length] || cityName))}${b}`);

  // Hero personalization
  out = replaceAllLiteral(out, 'Locally owned · Fully insured', tok(`Locally owned · Serving ${escapeHtml(cityFull)}`));
  out = replaceAllLiteral(out, 'delivers reliable, professional service you can book with confidence.',
    tok(`delivers reliable, professional service in ${escapeHtml(cityName)} and surrounding areas — book with confidence.`));

  // Sales-friendly replacements for template-only notes
  out = replaceAllLiteral(out, 'Placeholder photos — replace with your own project shots.', tok(`A look at the kind of results we deliver around ${escapeHtml(cityName)}.`));
  out = replaceAllLiteral(out, 'Real-sounding placeholders — swap in verified reviews before launch.', tok('Sample reviews shown — your real Google reviews go here.'));
  out = replaceAllLiteral(out, 'Template — customize before publishing.', tok('Homepage mockup · design concept'));

  // Pass 2: remaining home-city mentions ("Serving Denver and nearby communities", "shop in Aurora", ...)
  out = out.replace(new RegExp(`\\b${escapeRe(cfg.homeCity)}\\b`, 'g'), escapeHtml(cityName));

  // Pass 3: fill tokens
  out = out.replace(/\u0000(\d+)\u0000/g, (_, n) => tokens[Number(n)]);

  // Picsum placeholders are random, off-topic photos: drop them and keep the trade-relevant ones.
  out = out.replace(/\s*<figure><img src="https:\/\/picsum\.photos[^>]*><\/figure>/g, '');

  // Load all images eagerly so full-page screenshots never catch empty lazy slots
  out = out.replace(/\sloading="lazy"/g, '');
  return out;
}

/**
 * Drop gallery images whose URL is gone (404/410) so the mockup never shows a broken tile.
 * Network errors (offline) keep the image; the screenshot step swaps in a gradient if it fails.
 * If fewer than 3 photos survive, the hero photo is reused as an extra tile.
 */
async function pruneGallery(html, css) {
  const figRe = /\s*<figure><img src="([^"]+)"[^>]*><\/figure>/g;
  const figs = [...html.matchAll(figRe)];
  const status = async (url) => {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) });
      return res.status;
    } catch { return 0; }
  };
  const results = await Promise.all(figs.map((m) => status(m[1])));
  const removed = [];
  figs.forEach((m, i) => {
    if (results[i] === 404 || results[i] === 410) { html = html.replace(m[0], ''); removed.push(m[1]); }
  });
  let count = figs.length - removed.length;
  const heroUrl = (css.match(/\.hero::before\s*{[^}]*url\(['"]?([^'")]+)/) || [])[1];
  if (count < 3 && heroUrl) {
    const alt = (html.match(/<img src="[^"]+" alt="([^"]*?) project photo/) || [])[1] || 'Project';
    const tile = `\n        <figure><img src="${heroUrl.replace(/w=\d+/, 'w=800')}" alt="${alt} project photo" width="800" height="600"></figure>`;
    html = html.replace(/(<div class="gallery">)/, `$1${tile}`);
    count++;
  }
  return { html, count, removed };
}

function verify(outHtml, cfg, ctx) {
  const problems = [];
  const warnings = [];
  for (const t of Object.values(TEMPLATES)) {
    for (const n of [t.name, escapeHtml(t.name)]) if (outHtml.includes(n) && !ctx.name.includes(t.name)) problems.push(`placeholder name "${t.name}" still present`);
  }
  if (outHtml.includes(cfg.phone) && cfg.phone !== ctx.phoneDisplay) problems.push(`placeholder phone ${cfg.phone} still present`);
  if (outHtml.includes(phoneDigits(cfg.phone)) && phoneDigits(cfg.phone) !== phoneDigits(ctx.phoneDisplay)) problems.push('placeholder tel: link still present');
  if (outHtml.includes(cfg.email)) problems.push(`placeholder email ${cfg.email} still present`);
  if (outHtml.includes(cfg.address)) problems.push('placeholder address still present');
  if (/\.example\b/.test(outHtml)) warnings.push('an ".example" domain is still present');
  if (!outHtml.includes(ctx.nameHtml)) problems.push('new business name not found in output');
  if (!outHtml.includes(ctx.tel)) problems.push('new tel: link not found in output');
  return { problems: [...new Set(problems)], warnings };
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------
async function loadPlaywright() {
  try { return (await import('playwright')).chromium; } catch { return null; }
}
function findSystemChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/snap/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function preparePage(page, primary, accent) {
  await page.evaluate(async ({ primary, accent }) => {
    const timeout = (ms) => new Promise((r) => setTimeout(r, ms));
    const imgs = [...document.images];
    imgs.forEach((img) => { img.loading = 'eager'; });
    await Promise.race([
      Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; })))),
      timeout(15000),
    ]);
    // Swap failed images for a branded gradient tile so nothing looks broken.
    imgs.forEach((img, i) => {
      if (!img.complete || img.naturalWidth === 0) {
        const fig = img.closest('figure') || img.parentElement;
        img.style.visibility = 'hidden';
        if (fig) fig.style.background = `linear-gradient(${135 + i * 20}deg, ${primary}, ${accent})`;
      }
    });
    // Wait for the hero background photo (CSS ::before)
    const hero = document.querySelector('.hero');
    if (hero) {
      const bg = getComputedStyle(hero, '::before').backgroundImage;
      const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
      if (m) await Promise.race([new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = m[1]; }), timeout(10000)]);
    }
    if (document.fonts) await Promise.race([document.fonts.ready, timeout(8000)]);
  }, { primary, accent });
  await page.waitForTimeout(400);
}

async function screenshot(htmlFile, pngPath, { mobile, primary, accent }) {
  const url = pathToFileURL(htmlFile).href;
  const chromium = await loadPlaywright();
  if (chromium) {
    let browser;
    try {
      browser = await chromium.launch();
    } catch (err) {
      const exe = findSystemChrome();
      if (!exe) throw new Error(`Playwright Chromium not installed (run: npx playwright install chromium). ${err.message.split('\n')[0]}`);
      console.warn(`! Playwright Chromium missing, using system browser: ${exe}`);
      browser = await chromium.launch({ executablePath: exe });
    }
    try {
      const context = await browser.newContext(mobile
        ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
        : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      try { await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }); }
      catch { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); }
      await preparePage(page, primary, accent);
      await page.screenshot({ path: pngPath, fullPage: true });
    } finally {
      await browser.close();
    }
    return;
  }
  // Fallback: no playwright package — use a system Chrome's CLI screenshot (fixed height).
  const exe = findSystemChrome();
  if (!exe) throw new Error('No Playwright and no Chrome/Chromium found. Run: npm install && npx playwright install chromium');
  console.warn(`! playwright package not found; falling back to ${exe} --screenshot (fixed-height capture)`);
  const size = mobile ? '390,6000' : '1440,4600';
  execFileSync(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${size}`,
    '--virtual-time-budget=15000', `--screenshot=${pngPath}`, url], { stdio: 'ignore' });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: 'string' }, trade: { type: 'string' }, city: { type: 'string' }, phone: { type: 'string' },
      primary: { type: 'string' }, accent: { type: 'string' }, areas: { type: 'string' }, email: { type: 'string' },
      out: { type: 'string' }, 'png-dir': { type: 'string' },
      mobile: { type: 'boolean', default: false }, 'no-png': { type: 'boolean', default: false },
      list: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
  });
  if (values.help) { console.log(usage()); return; }
  if (values.list) { console.log(usage().split('Trade aliases:')[1]); return; }
  const missing = ['name', 'trade', 'city', 'phone'].filter((k) => !values[k]);
  if (missing.length) { console.error(`Missing required flag(s): ${missing.map((m) => '--' + m).join(', ')}\n${usage()}`); process.exit(1); }

  const { folder, fallback } = resolveTrade(values.trade);
  const cfg = TEMPLATES[folder];
  const primary = toHex(parseHex(values.primary || cfg.defaults.primary));
  const accent = toHex(parseHex(values.accent || cfg.defaults.accent));
  const { cityName, cityFull } = parseCity(values.city);
  const slug = slugify(values.name) || 'mockup';
  const compact = slug.replace(/-/g, '');
  const emailLocal = cfg.email.split('@')[0];
  const email = values.email || `${emailLocal}@${compact}.com`;
  const phoneDisplay = formatPhone(values.phone);
  if (phoneDigits(values.phone).length !== 10) console.warn(`! Phone "${values.phone}" is not a 10-digit US number; using it as-is.`);

  const areas = values.areas
    ? values.areas.split(',').map((s) => s.trim()).filter(Boolean)
    : [cityName, ...(NEARBY[cityName.toLowerCase()] || ['Surrounding areas'])];
  if (!areas.some((a) => a.toLowerCase() === cityName.toLowerCase())) areas.unshift(cityName);

  const ctx = { name: values.name, nameHtml: escapeHtml(values.name), phoneDisplay, tel: telHref(values.phone), email, cityName, cityFull, areas };

  const outDir = path.resolve(values.out || path.join(REPO_ROOT, 'mockups', slug));
  const pngDir = path.resolve(values['png-dir'] || path.dirname(outDir));
  const srcDir = path.join(REPO_ROOT, folder);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(pngDir, { recursive: true });
  fs.cpSync(srcDir, outDir, { recursive: true });

  const htmlPath = path.join(outDir, 'index.html');
  const cssPath = path.join(outDir, 'styles.css');
  let css = fs.readFileSync(cssPath, 'utf8');
  const built = buildHtml(cfg, fs.readFileSync(htmlPath, 'utf8'), ctx);
  const { html: outHtml, count: galleryCount, removed } = await pruneGallery(built, css);
  if (removed.length) console.warn(`! Dropped ${removed.length} gallery photo(s) whose URL is gone (404)`);
  fs.writeFileSync(htmlPath, outHtml);
  css = replaceAllLiteral(css, cfg.name, values.name) + buildCss(cfg, primary, accent, galleryCount);
  fs.writeFileSync(cssPath, css);

  const { problems, warnings } = verify(outHtml, cfg, ctx);
  warnings.forEach((w) => console.warn(`! ${w}`));
  if (problems.length) { console.error(`✗ Verification failed:\n  - ${problems.join('\n  - ')}`); process.exit(2); }

  console.log(`Template: ${folder}${fallback ? `  (trade "${values.trade}" not recognized — using generic-business)` : ''}`);
  console.log(`Colors:   primary ${primary} · accent ${accent}${values.primary || values.accent ? '' : ' (template defaults)'}`);
  console.log('✓ Verified: no template placeholder names, phones, emails, or addresses remain');

  const pngs = [];
  if (!values['no-png']) {
    const desktopPng = path.join(pngDir, `${slug}-desktop.png`);
    await screenshot(htmlPath, desktopPng, { mobile: false, primary, accent });
    pngs.push(desktopPng);
    if (values.mobile) {
      const mobilePng = path.join(pngDir, `${slug}-mobile.png`);
      await screenshot(htmlPath, mobilePng, { mobile: true, primary, accent });
      pngs.push(mobilePng);
    }
  }
  console.log(`\nHTML folder: ${outDir}`);
  console.log(`Open:        ${htmlPath}`);
  pngs.forEach((p) => console.log(`PNG:         ${p}`));
}

main().catch((err) => { console.error(`✗ ${err.message}`); process.exit(1); });
