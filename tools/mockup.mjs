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
 *
 * Facts only by default: the page states the name, trade, city, phone, and
 * (if passed) email. Template marketing copy that asserts things nobody
 * supplied (licensed/insured, years in business, hours, reviews, ratings,
 * 24/7, free estimates, ...) is rebuilt into neutral wording, and a
 * post-build claim check fails the run if any of it slips through.
 *
 * Optional, independent, and off unless passed:
 *   --licensed      shows "Licensed & insured"
 *   --years N       shows "N years in business"
 *   --hours TEXT    shows TEXT verbatim as business hours
 *   --tagline TEXT  replaces the neutral "<Trade> in <City>" headline
 *   --sample-reviews  a reviews section clearly labeled as samples
 *   --pay-url       https Payment Link (Stripe buy / checkout host only)
 *   --zelle-phone   and/or --zelle-email, plus optional --zelle-amount
 *   --chat          zero-cost chat widget (widgets/chat) + chat-facts.json built
 *                   only from the values above; no network calls, no API key
 * Nothing is inserted, and no payment URL or Zelle contact is written, when
 * those flags are omitted. There is no default phone, email, or amount.
 */
import { parseArgs } from 'node:util';
import { addClaimBar } from './claim-bar.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { COPY, jsonLd, parseHoursJson, faqBank } from './v3.mjs';
import { MONEY, MONEY_DEFAULTS, MONEY_CSS, MONEY_SCRIPT, buildMoney, buildZip, trustItems } from './money.mjs';
import { PALETTES, FONT_PAIRS, LAYOUTS, HEROES, resolveDesign, layoutHero, applyLayout, applyHero, heroCss, fontLinks, fontCss, paletteCss } from './design.mjs';
import { validateBooking, bookingEmbedHtml, BOOKING_CSS, BOOKING_HOSTS, validateNotify, HONEYPOT, payLabel, PAY_DEMO_HTML } from './addons.mjs';
import { tradeRules, parseOverride, checkTrade, failMessage } from './industry.mjs';
import { CATEGORIES, REUSED, REUSED_DEFAULTS, EXTRA_ALIASES, FEATURES, THEMES, FEATURE_CSS, themeCss, buildFeatures, buildFaq, parseCenter, geocode } from './library.mjs';

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
    services: [
      ['House Washing', 'Siding, trim, and entryways.'],
      ['Driveways & Concrete', 'Driveways, sidewalks, and patios.'],
      ['Decks & Fences', 'Wood and composite decks, fences, and railings.'],
      ['Commercial Exteriors', 'Storefronts and other commercial buildings.'],
    ],
  },
  landscaping: {
    name: 'Greenhaven Lawn & Landscape',
    phone: '(555) 391-2200',
    email: 'care@greenhavenlawn.example',
    homeCity: 'Fort Collins',
    address: '920 Maple Crest Dr, Fort Collins, CO 80525',
    defaults: { primary: '#15803d', accent: '#facc15' },
    services: [
      ['Lawn Mowing', 'Mowing, edging, and cleanup.'],
      ['Mulch & Beds', 'Mulch, bed edging, and planting.'],
      ['Tree & Shrub Care', 'Pruning and shaping for trees and shrubs.'],
      ['Yard Cleanup', 'Leaves, branches, and seasonal cleanup.'],
    ],
  },
  plumbing: {
    name: 'Ridge Line Plumbing',
    phone: '(555) 748-9100',
    email: 'dispatch@ridgelineplumbing.example',
    homeCity: 'Colorado Springs',
    address: '410 Industrial Blvd, Colorado Springs, CO 80907',
    defaults: { primary: '#1e40af', accent: '#f97316' },
    services: [
      ['Plumbing Repairs', 'Leaks, pipes, and fixtures.'],
      ['Water Heaters', 'Tank and tankless water heaters.'],
      ['Drain Clearing', 'Clogged sinks, tubs, and main lines.'],
      ['Fixture Installs', 'Faucets, toilets, and garbage disposals.'],
    ],
  },
  'cleaning-service': {
    name: 'BrightNest Cleaning Co.',
    phone: '(555) 602-4411',
    email: 'book@brightnestcleaning.example',
    homeCity: 'Boulder',
    address: '55 Pearl St, Suite 200, Boulder, CO 80302',
    defaults: { primary: '#6d28d9', accent: '#2dd4bf' },
    services: [
      ['Home Cleaning', 'Regular cleaning for houses and apartments.'],
      ['Deep Cleaning', 'A top-to-bottom clean, including the details.'],
      ['Move-In / Move-Out', 'Cleaning for an empty home before or after a move.'],
      ['Office Cleaning', 'Cleaning for offices and workspaces.'],
    ],
  },
  restaurant: {
    name: "Nonna's Wood-Fired Pizza",
    phone: '(555) 833-1700',
    email: 'hello@nonnaspizza.example',
    homeCity: 'Golden',
    address: '312 Main Street, Golden, CO 80401',
    addressLabel: 'Location',
    defaults: { primary: '#b91c1c', accent: '#f59e0b' },
    servicesTitle: 'Menu',
    servicesNote: 'Sample menu sections for this mockup. The menu can be matched to exactly what {name} serves.',
    ask: 'with any questions',
    services: [
      ['Menu Favorites', 'Your most-ordered dishes go here.'],
      ['Specials', 'Daily or seasonal specials go here.'],
      ['Sides & Extras', 'Sides, add-ons, and extras go here.'],
      ['Groups & Catering', 'Group or catering options go here, if offered.'],
    ],
  },
  'auto-detailing': {
    name: 'MirrorFinish Auto Detail',
    phone: '(555) 477-3300',
    email: 'book@mirrorfinishdetail.example',
    homeCity: 'Aurora',
    address: '780 Commerce Park Rd, Aurora, CO 80011',
    dark: true,
    defaults: { primary: '#0891b2', accent: '#fbbf24' },
    services: [
      ['Exterior Detail', 'Wash, decontamination, and wax.'],
      ['Interior Detail', 'Vacuum, wipe-down, and upholstery care.'],
      ['Paint Correction', 'Polishing to reduce swirls and light scratches.'],
      ['Ceramic Coating', 'Coating applied over the paint.'],
    ],
  },
  handyman: {
    name: 'SteadyHands Home Repair',
    phone: '(555) 916-5500',
    email: 'jobs@steadyhandshome.example',
    homeCity: 'Denver',
    address: '2200 Blake St, Denver, CO 80205',
    defaults: { primary: '#b45309', accent: '#0f766e' },
    services: [
      ['Home Repairs', 'Doors, trim, drywall patches, and small fixes.'],
      ['Mounting & Assembly', 'TVs, shelves, and furniture.'],
      ['Painting', 'Interior rooms, trim, and touch-ups.'],
      ['Fixture Installs', 'Light fixtures, faucets, and hardware.'],
    ],
  },
  'generic-business': {
    name: 'Northstar Local Co.',
    phone: '(555) 100-2000',
    email: 'hello@northstarlocal.example',
    homeCity: 'Your Town',
    address: '100 Market Street, Your Town, USA 00000',
    defaults: { primary: '#1e40af', accent: '#f59e0b' },
    services: [
      ['Main Service', 'A short description of this service goes here.'],
      ['Second Service', 'A short description of this service goes here.'],
      ['Third Service', 'A short description of this service goes here.'],
      ['Other Requests', 'Ask about anything not listed here.'],
    ],
  },
};

// Library categories (tools/library.mjs) reuse the generic-business HTML.
const GENERIC_PLACEHOLDERS = (({ name, phone, email, homeCity, address }) => ({ name, phone, email, homeCity, address }))(TEMPLATES['generic-business']);
for (const [key, c] of Object.entries(CATEGORIES)) {
  TEMPLATES[key] = { ...GENERIC_PLACEHOLDERS, base: 'generic-business', placeholderPhotos: true, library: true, ...c };
  // Free-licensed stock photos (stock/<key>/, credited in CREDITS.md) replace the grey tiles when present.
  const stockDir = path.join(REPO_ROOT, 'stock', key);
  if (fs.existsSync(stockDir)) TEMPLATES[key].stock = { key, files: fs.readdirSync(stockDir).filter((f) => /\.(jpe?g|webp|png)$/i.test(f)).sort() };
}

// Friendly trade names -> template folder. Unknown trades fall back to generic-business.
const TRADE_ALIASES = {
  'pressure-washing': ['pressure-washing', 'pressure-wash', 'pressure', 'power-washing', 'power-wash', 'powerwashing', 'pressurewashing', 'soft-wash', 'softwash', 'exterior-cleaning', 'window-washing'],
  landscaping: ['landscaping', 'landscape', 'landscaper', 'lawn', 'lawn-care', 'lawncare', 'lawn-service', 'mowing', 'yard', 'yard-care', 'snow-removal'],
  plumbing: ['plumbing', 'plumber', 'plumbers', 'drain', 'water-heater'],
  'cleaning-service': ['cleaning-service', 'cleaning', 'cleaner', 'cleaners', 'house-cleaning', 'maid', 'maids', 'janitorial', 'commercial-cleaning', 'carpet-cleaning'],
  restaurant: ['restaurant', 'pizza', 'pizzeria', 'cafe', 'coffee', 'bakery', 'food', 'food-truck', 'diner', 'bar', 'catering'],
  'auto-detailing': ['auto-detailing', 'detailing', 'detail', 'detailer', 'car-detailing', 'mobile-detailing', 'auto-detail', 'car-wash', 'ceramic-coating'],
  handyman: ['handyman', 'handy-man', 'home-repair', 'home-repairs', 'repair', 'repairs', 'home-improvement', 'remodeling', 'carpentry', 'drywall'],
  ...Object.fromEntries(Object.entries(CATEGORIES).map(([k, c]) => [k, c.aliases])),
  'generic-business': ['generic', 'generic-business', 'business', 'other', 'default'],
};
for (const [k, extra] of Object.entries(EXTRA_ALIASES)) TRADE_ALIASES[k].push(...extra);

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

// Hosts are composed so this file does not contain a payment URL literal.
const STRIPE_HOST = 'stripe.com';
const PAY_HOSTS = new Set([`buy.${STRIPE_HOST}`, `checkout.${STRIPE_HOST}`]);

/**
 * Stripe Payment Link / hosted checkout only. Rejects javascript:, http,
 * other hosts, and userinfo. Returns the caller's URL unchanged when valid.
 */
function validatePayUrl(raw) {
  if (raw == null) return null;
  const input = String(raw).trim();
  const allowed = [...PAY_HOSTS].join(' or ');
  if (!input) {
    throw new Error(`--pay-url was empty. Pass an https Payment Link on ${allowed}, or omit the flag.`);
  }
  if (/[\s<>"']/.test(input)) {
    throw new Error('--pay-url rejected: the URL must not contain spaces or quotes.');
  }
  let url;
  try { url = new URL(input); }
  catch {
    throw new Error(`--pay-url rejected: not a valid URL. Use https on ${allowed}.`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`--pay-url rejected: only https is allowed (got "${url.protocol.replace(':','')}"). Create the link in Stripe and pass that https URL.`);
  }
  if (url.username || url.password) {
    throw new Error('--pay-url rejected: URLs with a username or password are not allowed.');
  }
  const host = url.hostname.toLowerCase();
  if (!PAY_HOSTS.has(host)) {
    throw new Error(`--pay-url rejected: host must be ${allowed} (got "${host}"). Other sites are not accepted.`);
  }
  if (url.port && url.port !== '443') {
    throw new Error(`--pay-url rejected: unexpected port "${url.port}".`);
  }
  return input;
}

function validateZellePhone(raw) {
  const s = String(raw).trim();
  const digits = s.replace(/\D/g, '');
  if (!/^[+\d(][\d\s().-]{6,}$/.test(s) || digits.length < 10 || digits.length > 15) {
    throw new Error('--zelle-phone rejected: that value does not look like a phone number. Pass the client\'s Zelle phone, or omit the flag. There is no default number.');
  }
  return s;
}

function validateZelleEmail(raw) {
  const s = String(raw).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || s.length > 254) {
    throw new Error('--zelle-email rejected: that value does not look like an email. Pass the client\'s Zelle email, or omit the flag.');
  }
  return s;
}

function validateZelleAmount(raw) {
  const s = String(raw).trim();
  if (!/^\$?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?$/.test(s) && !/^\$?\d+(?:\.\d{1,2})?$/.test(s)) {
    throw new Error('--zelle-amount rejected: pass a dollar amount such as 150 or $150.00, or omit the flag. No amount is invented.');
  }
  return s;
}

/** Zelle is plain text (phone and/or email, optional amount). Independent of --pay-url. */
function validateZelle(values) {
  const phone = values['zelle-phone'];
  const email = values['zelle-email'];
  const amount = values['zelle-amount'];
  if (phone == null && email == null && amount == null) return null;
  if (phone == null && email == null) {
    throw new Error('--zelle-amount was set without --zelle-phone or --zelle-email. Zelle stays off unless a contact is passed. No default phone or email is used.');
  }
  return {
    phone: phone == null ? null : validateZellePhone(phone),
    email: email == null ? null : validateZelleEmail(email),
    amount: amount == null ? null : validateZelleAmount(amount),
  };
}

function buildPayBlock(payUrl, zelle, label = 'Pay') {
  const parts = [];
  if (payUrl) {
    parts.push(`<a class="btn btn-pay" href="${escapeHtml(payUrl)}" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
  }
  if (zelle) {
    const contacts = [zelle.phone, zelle.email].filter(Boolean).map((v) => escapeHtml(v));
    let text = `Zelle: ${contacts.join(' · ')}`;
    if (zelle.amount) text += ` · ${escapeHtml(zelle.amount)}`;
    parts.push(`<p class="zelle-pay">${text}</p>`);
  }
  if (!parts.length) return '';
  return `<div class="pay-options">\n            ${parts.join('\n            ')}\n          </div>`;
}

function insertPayBlock(html, block) {
  const re = /(<div class="hero-actions">[\s\S]*?)(\n[ \t]*<\/div>)/;
  if (!re.test(html)) {
    throw new Error('This template has no .hero-actions block, so the payment option could not be placed next to the call to action.');
  }
  return html.replace(re, `$1\n          ${block}$2`);
}

// Short words that must not pull a trade into another industry on a loose match (e.g. "tiki-bar-repair").
const LOOSE_SKIP = new Set(['bar', 'food', 'repair', 'repairs', 'detail', 'pressure', 'yard', 'cafe', 'coffee', 'drain', 'maid', 'lawn']);
function resolveTrade(trade) {
  const key = slugify(trade || '');
  for (const [folder, aliases] of Object.entries(TRADE_ALIASES)) if (aliases.includes(key)) return { folder, fallback: false };
  // loose match: "mobile-car-detailing" -> detailing, "lawn-mowing-co" -> lawn, etc.
  for (const [folder, aliases] of Object.entries(TRADE_ALIASES)) {
    if (folder === 'generic-business') continue;
    if (aliases.some((a) => (!LOOSE_SKIP.has(a) && key.split('-').includes(a)) || (a.includes('-') && key.includes(a)))) return { folder, fallback: false };
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

By default the page states only what you pass: name, trade, city, phone, and
email (if given). No licensed/insured, years, hours, reviews, ratings, 24/7,
or free-estimate claims. Add those only with the flags below, and only when
the business has told you they are true.

Required:
  --name      Business name (exactly as it should appear)
  --trade     Trade / template alias (see below). Unknown trades fall back to generic-business
  --city      City, optionally with state: "Thornton, CO"
  --phone     Phone number in any format: "(720) 555-0187", 7205550187, +1 720-555-0187

Optional:
  --primary   Main brand color (hex). Hero, buttons, links. Default: per-template
  --accent    Highlight color (hex). Hero CTA, badges, accent bars. Default: per-template
  --areas     Comma-separated service areas for the pills, e.g. "Aurora,Denver,Parker"
              Default: just the --city
  --email     Email to show. Omitted = no email on the page (none is invented)

Opt-in facts (off unless passed; the post-build check fails if they appear without the flag):
  --licensed        Show "Licensed & insured" (hero badge, about, stat)
  --years N         Show "N years in business" (whole number 1-150)
  --hours "TEXT"    Show business hours verbatim, e.g. "Mon-Fri 8-5" (max 120 chars)
  --tagline "TEXT"  Headline instead of the neutral "<Trade> in <City>" (max 90 chars)
  --sample-reviews  Add a reviews section labeled "Sample reviews" with generic
                    "Sample customer" cards and no star ratings

Payments (off unless passed):
  --pay-url   Optional https Stripe Payment Link (buy or checkout host only).
              Create the link in Stripe and pass it here. Omitted = no pay button
              and no payment URL in the HTML. Not a Checkout Session or secret key.
  --zelle-phone  Optional Zelle phone to show as plain text (not a payment link)
  --zelle-email  Optional Zelle email to show as plain text. One of phone/email is enough
  --zelle-amount Optional dollar amount to display with Zelle (150 or $150.00). Never invented.
              Zelle stays off unless a phone or email is passed. Independent of --pay-url.

Chat add-on (off unless passed):
  --chat      Copy widgets/chat/ into <out>/chat/, write <out>/chat-facts.json from ONLY
              the facts passed here (name, trade, city/--areas, phone, --email, --hours
              if given, and the services shown on the page), and add the tags.
              Answers are rule/FAQ matching in the browser: no API key, no network
              calls, works on GitHub Pages. Unknowns and prices reply "Please call".
              Add FAQ entries by editing chat-facts.json (see README).

Output:
Library (tools/library.mjs, see README "Template library"):
  --theme       bold-industrial | clean-minimal | warm-local | premium-dark | none
  --features    Comma list replacing the category defaults: call-bar, emergency, badges,
                quote-form, reviews, map, before-after, hours, booking, menu, pickup-order,
                process, checklist, pricing, team, faq (or none)
  --map-center "lat,lon"   --map-area "TEXT"   (map; --map-area is geocoded via OpenStreetMap)
  --reviews-file F.json    real reviews [{name,text,source?}]  (else use --sample-reviews)
  --before-after "b.jpg:a.jpg,..."   client photos; placeholders otherwise
  --menu-file F.json   --faq-file F.json   --booking-url https://...
  --money TYPE   money feature right after the hero (default per category): quote-form,
                emergency-request, inspection-request, instant-quote, job-list, service-request,
                package-picker, class-schedule, grooming-booking, appointment-request,
                listing-search, booking, pickup-order, none
  --money-endpoint https://...  form service URL (Formspree/Web3Forms, JSON POST)
  --money-link https://...      link-out to a booking/ordering page (not a payment link)
  --text         the phone takes texts: adds Text to the mobile bar and "text a photo" links
  --zips "80011,80012"  "Do you serve my area?" checker (also matches --areas names)
  --notify email|sms|both  --notify-endpoint https://...  lead alerts (sms/both REQUIRE the endpoint:
                     the client's Cloudflare Worker, see docs/NOTIFY-WORKER.md); adds a honeypot field
  --booking-provider calendly|square|tidycal|fresha|link   embed --booking-url (host allow-list) with a
                     click-to-load iframe and an always-visible "Open booking in a new tab" link
  --pay-label TEXT  --pay-context deposit|invoice|package   pay button text (no amounts, ever)
  --pay-demo         sample builds only: disabled "Payment button (demo, not active)" when there is no --pay-url
  --palette ID|auto  exact per-industry colors (spec v4 A1); --primary/--accent still override.
                     ${Object.keys(PALETTES).join(", ")}
  --fonts ID|auto    Google Font pairing, display=swap + preconnect: ${Object.keys(FONT_PAIRS).join(", ")}
  --layout ID|auto   section order (spec v4 A4); sets the default --hero. Unknown -> industry default.
  --hero ID          ${HEROES.join(" | ")}
  --hero-img FILE    client-supplied hero photo (local file is copied to img/, or an https URL)
  --license-no TEXT  --insured  --certs "A,B"   trust row under the hero CTA (facts only)
  --schedule-file F.json [{class,day,time}]   --listings-file F.json + --brokerage NAME
Spec v3:
  --faq-bank     print the trade's FAQ question bank as JSON (empty answers) and exit
  --faq-file F   owner answers; FAQ shows only answered questions   --faq-schema  add FAQPage JSON-LD
  --hours-json '{"Mon-Fri":"08:00-17:00"}'  structured hours for JSON-LD   --address TEXT   --cuisine TEXT
  --site-url https://...   --free-estimates (owner offers them; allows the word "free")
  --emergency "TEXT"   banner shown verbatim (e.g. what the business says about 24/7)
  --badges "A,B,C"     trust strip, verbatim (licenses, memberships the business gave you)
  --checklist "A,B"    "What's included" list    --steps-file F.json  process steps [{title,text?}]
  --pricing-file F.json  [{name,price?,details?}]   --team-file F.json  [{name,role?,bio?,photo?}]
  pickup-order (restaurants): needs --menu-file (items may have options); sends by
    --order-endpoint https://formspree.io/f/... (JSON POST) or mailto --email;
    --order-url https://... adds a link to Square/Toast. Pay at pickup; no payments.

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
function buildCss(cfg, primary, accent, galleryCount = 0, extras = {}) {
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
  if (extras.cta) extras.cta.push(['primary CTA button (.btn-primary, call bar)', onAccent, accent], ['nav / accent button (.nav-cta, .btn-accent)', onLink, v.link]);
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
  // Facts-only layout: the about panel spans the row when there is no stat row, the
  // stat row sizes to the opt-in facts, and the footer drops the hours column.
  if (!extras.stats) lines.push('.about-grid { grid-template-columns: 1fr; }', '.about-panel { max-width: 820px; width: 100%; margin-inline: auto; }');
  else lines.push(`.stat-row { grid-template-columns: repeat(${extras.stats}, 1fr); }`);
  if (!extras.hours) lines.push('@media (min-width: 701px) { .footer-grid { grid-template-columns: 1.4fr 1fr; } }');
  if (extras.pay || extras.zelle) {
    lines.push('.pay-options { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; flex-basis: 100%; }');
  }
  if (extras.pay) {
    lines.push(
      `.btn-pay { background: transparent; color: ${heroText}; border-color: rgba(${heroSoft}, 0.7); }`,
      `.btn-pay:hover { background: rgba(${heroSoft}, 0.12); color: ${heroText}; }`,
    );
  }
  if (extras.zelle) {
    lines.push(`.zelle-pay { margin: 0; font-weight: 600; font-size: 0.98rem; color: ${heroText}; }`);
  }
  void accentOnBg;
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Facts-only copy. Everything below is built from command-line values only.
// ---------------------------------------------------------------------------
const GENERIC_TRADES = new Set(TRADE_ALIASES['generic-business']);
/** "pressure-washing" -> "pressure washing"; generic aliases -> null. */
function tradeLabel(trade) {
  const raw = String(trade || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw || GENERIC_TRADES.has(slugify(raw))) return null;
  return raw.toLowerCase();
}
const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function validateYears(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!/^\d{1,3}$/.test(s) || Number(s) < 1 || Number(s) > 150) {
    throw new Error('--years must be a whole number of years in business from 1 to 150 (e.g. --years 12). Omit it if the business has not told you.');
  }
  return Number(s);
}

function validateText(flag, raw, max) {
  if (raw == null) return null;
  const s = String(raw).replace(/\s+/g, ' ').trim();
  if (!s) throw new Error(`--${flag} was empty. Pass the text to show, or omit the flag.`);
  if (s.length > max) throw new Error(`--${flag} is ${s.length} characters; keep it to ${max} or fewer.`);
  return s;
}

/** Opt-in facts shown in the hero badge, about copy, and stat row. */
function factLines(ctx) {
  const out = [];
  if (ctx.years) out.push({ badge: `${ctx.years} years in business`, stat: [String(ctx.years), 'Years in business'] });
  if (ctx.licensed) out.push({ badge: 'Licensed &amp; insured', stat: ['✓', 'Licensed &amp; insured'] });
  return out;
}

const SAMPLE_REVIEWS = [
  'Sample review. A real customer quote goes here.',
  'Sample review. Replace this with a real review before the site goes live.',
  'Sample review. This text is a placeholder, not a quote from a customer.',
];

function rebuildCopy(cfg, html, ctx, tok) {
  const { nameHtml, phoneDisplay, tel, email, cityFull } = ctx;
  const phone = escapeHtml(phoneDisplay);
  const city = escapeHtml(cityFull);
  const label = ctx.label ? escapeHtml(ctx.label) : null;
  const headline = ctx.tagline ? escapeHtml(ctx.tagline) : label ? `${capFirst(label)} in ${city}` : `Serving ${city}`;
  const facts = factLines(ctx);
  const emailHtml = email ? escapeHtml(email) : null;
  const ask = cfg.ask || 'to ask about your job';
  const sub = (re, rep, what) => {
    if (!re.test(html)) throw new Error(`Template ${what} block not found; update rebuildCopy() in tools/mockup.mjs.`);
    html = html.replace(re, () => tok(rep));
  };

  // <head>
  const meta = `${nameHtml}${label ? `: ${label}` : ''} in ${city}. Call ${phone}.`;
  sub(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${meta}">`, 'meta description');
  sub(/<title>[^<]*<\/title>/, `<title>${nameHtml} | ${headline}</title>`, '<title>');

  // Nav: no reviews link unless sample reviews; the contact link is just "Contact".
  if (!ctx.sampleReviews) html = html.replace(/\n[ \t]*<a href="#testimonials">[^<]*<\/a>/, '');
  sub(/<a href="#contact">[^<]*<\/a>/, '<a href="#contact">Contact</a>', 'nav contact link');

  // Hero
  const badge = [...facts.map((f) => f.badge), city].join(' · ');
  const lead = `${nameHtml}${label ? ` — ${label} in ${city}` : ` — serving ${city}`}. Call ${phone} or send a message ${ask}.`;
  sub(/<section class="hero"[\s\S]*?<\/section>/, `<section class="hero" aria-labelledby="hero-title">
      <div class="container">
        <span class="hero-badge">${badge}</span>
        <h1 id="hero-title">${headline}</h1>
        <p class="lead">${lead}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#contact">Send a Message</a>
          <a class="btn btn-ghost" href="${tel}">${phone}</a>
        </div>
      </div>
    </section>`, 'hero');

  // Services
  const note = (cfg.servicesNote || 'Typical services shown for this mockup. The list can be matched to exactly what {name} offers.').replace('{name}', nameHtml);
  const cards = cfg.services.map(([t, d], i) => `
          <article class="card">
            <div class="card-icon" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div>
            <h3>${escapeHtml(t)}</h3>
            <p>${escapeHtml(d)}</p>
          </article>`).join('');
  sub(/<section id="services"[\s\S]*?<\/section>/, `<section id="services" aria-labelledby="services-title">
      <div class="container">
        <div class="section-head">
          <h2 id="services-title">${cfg.servicesTitle || 'Services'}</h2>
          <p>${note}</p>
        </div>
        <div class="cards">${cards}
        </div>
      </div>
    </section>`, 'services');

  // About: neutral paragraph + service-area pills. Stat row only for opt-in facts.
  const aboutFacts = facts.map((f) => ` ${capFirst(f.badge)}.`).join('');
  const aboutAsk = cfg.ask ? ` Call ${phone}${emailHtml ? ` or email ${emailHtml}` : ''} ${cfg.ask}.` : ` Call ${phone}${emailHtml ? ` or email ${emailHtml}` : ''} to talk about your project.`;
  const stats = facts.length
    ? `\n        <div class="stat-row" role="list">\n${facts.map((f) => `          <div class="stat" role="listitem"><strong>${f.stat[0]}</strong><span>${f.stat[1]}</span></div>`).join('\n')}\n        </div>`
    : '';
  sub(/<section id="about"[\s\S]*?<\/section>/, `<section id="about" aria-labelledby="about-title">
      <div class="container about-grid">
        <div class="about-panel">
          <h2 id="about-title">About ${nameHtml}</h2>
          <p>${nameHtml} serves customers in ${city}.${aboutFacts}${aboutAsk}</p>
          <p><strong>${cfg.areasLabel || 'Service areas'}:</strong></p>
          <div class="pill-list">
            ${ctx.areas.map((x) => `<span class="pill">${escapeHtml(x)}</span>`).join('')}
          </div>
        </div>${stats}
      </div>
    </section>`, 'about');

  // Gallery: stock photos are labeled as samples, not "Recent Work".
  sub(/(?<=<section id="gallery"[^>]*>\s*<div class="container">\s*)<div class="section-head">[\s\S]*?<\/div>/, `<div class="section-head">
          <h2 id="gallery-title">Photos</h2>
          <p>${cfg.placeholderPhotos && cfg.stock?.files.length ? `Stock photos from Unsplash, not ${nameHtml}’s work.` : 'Sample photos for this mockup.'} ${nameHtml}'s own photos go here.</p>
        </div>`, 'gallery heading');
  html = html.replace(/alt="[^"]*project photo (\d+)"/g, 'alt="Sample photo $1"');

  if (cfg.placeholderPhotos && cfg.stock?.files.length) {
    sub(/<div class="gallery">[\s\S]*?\n[ \t]*<\/div>/, `<div class="gallery">${cfg.stock.files.slice(0, 3).map((f, i) => `
        <figure><img src="img/stock-${f}" alt="Stock photo ${i + 1} (not ${nameHtml}'s work)" loading="lazy" width="1000" height="750"><figcaption class="stock-cap">Stock photo</figcaption></figure>`).join('')}
        </div>`, 'gallery grid');
  } else if (cfg.placeholderPhotos) {
    sub(/<div class="gallery">[\s\S]*?\n[ \t]*<\/div>/, `<div class="gallery">${[1, 2, 3].map((i) => `
        <div class="ph-tile" role="img" aria-label="Photo placeholder ${i}"><span>Photo placeholder</span></div>`).join('')}
        </div>`, 'gallery grid');
  }

  // Reviews: removed unless --sample-reviews, and then clearly labeled samples.
  const reviewsRe = /\n\n[ \t]*<section id="testimonials"[\s\S]*?<\/section>/;
  if (!reviewsRe.test(html)) throw new Error('Template reviews section not found; update rebuildCopy() in tools/mockup.mjs.');
  html = html.replace(reviewsRe, () => (ctx.sampleReviews ? tok(`

    <section id="testimonials" aria-labelledby="reviews-title">
      <div class="container">
        <div class="section-head">
          <h2 id="reviews-title">Sample Reviews</h2>
          <p>Sample reviews: your real customer reviews go here. These are placeholders, not quotes from customers.</p>
        </div>
        <div class="testimonials">${SAMPLE_REVIEWS.map((q) => `
        <blockquote class="quote">
          <p>“${q}”</p>
          <footer>— Sample customer</footer>
        </blockquote>`).join('')}
        </div>
      </div>
    </section>`) : ''));

  // Contact
  sub(/(?<=<section id="contact"[^>]*>\s*<div class="container">\s*<div class="section-head">\s*<h2[^>]*>[^<]*<\/h2>\s*)<p>[^<]*<\/p>/,
    `<p>${emailHtml ? 'Call, email, or send a message.' : 'Call or send a message.'}</p>`, 'contact intro');
  const areaLabel = cfg.addressLabel || 'Service area';
  const contactItems = [
    `<li><strong>Phone:</strong> <a href="${tel}">${phone}</a></li>`,
    emailHtml && `<li><strong>Email:</strong> <a href="mailto:${emailHtml}">${emailHtml}</a></li>`,
    `<li><strong>${areaLabel}:</strong> ${city}</li>`,
    ctx.hours && `<li><strong>Hours:</strong> ${escapeHtml(ctx.hours)}</li>`,
  ].filter(Boolean);
  sub(/<ul class="contact-list">[\s\S]*?<\/ul>/, `<ul class="contact-list">\n              ${contactItems.join('\n              ')}\n            </ul>`, 'contact list');
  sub(/(?<=<option value="">[^<]*<\/option>)[\s\S]*?(?=\s*<\/select>)/,
    `\n                ${cfg.services.map(([t]) => `<option>${escapeHtml(t)}</option>`).join('')}\n                <option>Other / Not sure</option>`, 'service select');
  sub(/<p class="form-success"([^>]*)>[^<]*<\/p>/, `<p class="form-success" hidden role="status">Thanks! This mockup form does not send messages yet. Please call ${nameHtml} at ${phone}.</p>`, 'form success message');

  // Footer: name + headline, hours only with --hours, contact.
  const footerCols = [
    `<div>\n        <h4>${nameHtml}</h4>\n        <p>${ctx.tagline ? headline : `${headline}.`}</p>\n      </div>`,
    ctx.hours && `<div>\n        <h4>Hours</h4>\n        <p>${escapeHtml(ctx.hours)}</p>\n      </div>`,
    `<div>\n        <h4>Contact</h4>\n        <p><a href="${tel}">${phone}</a><br>\n        ${emailHtml ? `<a href="mailto:${emailHtml}">${emailHtml}</a><br>\n        ` : ''}${city}</p>\n      </div>`,
  ].filter(Boolean);
  sub(/(?<=<div class="container footer-grid">)[\s\S]*?(?=\n[ \t]*<\/div>\s*<div class="container footer-bottom">)/, `\n      ${footerCols.join('\n      ')}`, 'footer');
  return html;
}

function buildHtml(cfg, html, ctx) {
  const { nameHtml, phoneDisplay, tel, cityName } = ctx;
  const oldNames = [cfg.name, escapeHtml(cfg.name), cfg.name.replace(/'/g, '&#39;'), cfg.name.replace(/'/g, '’')];
  // Pass 1 swaps placeholders for tokens, pass 2 renames the template's home city in the
  // remaining copy, pass 3 fills tokens. This keeps new values (e.g. a "Denver" service
  // area or a name containing a city) from being clobbered by the city rename.
  const tokens = [];
  const tok = (value) => { tokens.push(value); return `\u0000${tokens.length - 1}\u0000`; };
  let out = html;

  // Replace every block of template marketing copy with facts-only copy.
  out = rebuildCopy(cfg, out, ctx, tok);

  // Copyright line (avoid "Co.. All rights")
  for (const n of oldNames) out = replaceAllLiteral(out, `${n}. All rights`, tok(`${nameHtml}${nameHtml.endsWith('.') ? '' : '.'} All rights`));

  // Business name everywhere else (logo, comments)
  const nameTok = tok(nameHtml);
  for (const n of oldNames) out = replaceAllLiteral(out, n, nameTok);

  // Remaining phone text + tel: links (nav "Call Now", "Click to Call")
  out = replaceAllLiteral(out, `tel:+1${phoneDigits(cfg.phone)}`, tok(tel));
  out = replaceAllLiteral(out, cfg.phone, tok(escapeHtml(phoneDisplay)));

  out = replaceAllLiteral(out, 'Template — customize before publishing.', tok('Homepage mockup · design concept'));

  // Pass 2: any remaining home-city mentions
  out = out.replace(new RegExp(`\\b${escapeRe(cfg.homeCity)}\\b`, 'g'), escapeHtml(cityName));

  // Pass 3: fill tokens
  out = out.replace(/\u0000(\d+)\u0000/g, (_, n) => tokens[Number(n)]);

  // Picsum placeholders are random, off-topic photos: drop them and keep the trade-relevant ones.
  out = out.replace(/\s*<figure><img src="https:\/\/picsum\.photos[^>]*><\/figure>/g, '');

  // Load all images eagerly so full-page screenshots never catch empty lazy slots
  out = out.replace(/\sloading="lazy"/g, '');

  // Payment options are inserted last so placeholder replacement cannot rewrite them,
  // and so they are absent entirely when no payment flags were passed.
  if (ctx.payBlock) out = insertPayBlock(out, ctx.payBlock);
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
    const tile = `\n        <figure><img src="${heroUrl.replace(/w=\d+/, 'w=800')}" alt="Sample photo" width="800" height="600"></figure>`;
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
// Claim check: no factual claim may appear unless the flag that supplies it
// was passed. Runs on the visible text (plus alt / aria-label / title / meta
// content), after removing values the user passed verbatim (name, city, trade,
// email, areas, tagline, hours, Zelle details), which are theirs to vouch for.
// `flag` names the ctx key that allows the rule; rules without one never pass.
// ---------------------------------------------------------------------------
const CLAIM_RULES = [
  { what: 'licensed / insured', flag: 'licensed', re: /\b(licen[sc]ed?|insured|insurance)\b/i },
  { what: 'bonded', re: /\bbonded\b/i },
  { what: 'certified / accredited', re: /\b(certified|certification|accredited|accreditation|master (plumber|electrician))\b/i },
  { what: 'warranty / guarantee', re: /\b(warrant(y|ies|eed)|guarantee[ds]?|satisfaction)\b/i },
  { what: 'years in business', flag: 'years', re: /\b\d+\s*\+?\s*(years?|yrs?)\b|\byears?\s+(serving|in business|of experience|experience)\b/i },
  { what: 'since / founded date', re: /\b(since|founded|established|est\.)\b/i },
  { what: 'ownership claim (family / locally owned)', re: /\b(family|locally|veteran|woman|women|minority)[- ]owned\b/i },
  { what: 'job / customer counts', re: /\b\d[\d,]*\s*\+|\b(happy|satisfied)\s+(clients|customers)\b|\b\d[\d,]*\s+(jobs|projects|homes|customers|clients|cars|vehicles)\b/i },
  { what: 'star rating', re: /[★☆⭐]|\bstars?\b|\b(rating|ratings|rated)\b|\bfive[- ]star\b/i },
  { what: 'reviews / testimonials', flag: 'sampleReviews', re: /\b(reviews?|reviewers?|testimonials?)\b/i },
  { what: '#1 / best / top-rated / award', re: /#\s?1\b|\bnumber one\b|\bbest\b|\btop[- ]rated\b|\bleading\b|\bpremier\b|\baward/i },
  { what: 'BBB', re: /\bBBB\b|better business bureau/i },
  { what: 'business hours', flag: 'hours', re: /\bhours\b|\b\d{1,2}(:\d{2})?\s*(am|pm)\b|\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(day)?\b|\bby appointment\b|\bappointments?\b/i },
  { what: '24/7 / emergency / same-day availability', re: /\b24\s*\/\s*7\b|\b24[- ]hour|\bemergenc(y|ies)\b|\bsame[- ]day\b|\bnext[- ]day\b|\bon[- ]call\b|\bweekends?\b|\bevenings?\b/i },
  { what: 'response-time promise', re: /\bwithin\s+(\d+|an?|one)\b|\b\d+\s*(minutes?|mins?|hours?|hrs?)\b|\bminutes\b|\b(fast|quick|quickly|prompt|promptly|rapid|shortly|on[- ]time|on schedule|one visit|first time|typically reply)\b/i },
  { what: 'free estimate / pricing promise', flag: 'freeEstimates', re: /\bfree\b|\bno[- ]obligation\b|\bdiscounts?\b|\bvolume pricing\b|\bno (surprise|hidden|mystery)\b|\b(upfront|clear|honest|transparent|fair) (quotes?|pricing|prices|rates)\b/i },
  { what: 'quality / trust claim', re: /\b(trusted|reliable|honest|upfront|transparent|expert|experts|experienced|professional|pro-grade|eco[- ]?(friendly|conscious)|trained|craftsmanship|showroom)\b/i },
  { what: 'team size / crews', re: /\b(crews?|teams?|technicians?|staff|employees|trucks?|fleet of)\b/i },
  { what: 'street address', re: /\b\d{1,6}\s+(?:[A-Z][\w.]*\s+){1,4}(St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Pkwy|Parkway|Pl|Place|Hwy|Highway)\b|\bSuite\s+\d+|\b\d{5}(-\d{4})?\b/ },
];

// ---------------------------------------------------------------------------
// Chat add-on (--chat). Facts JSON is built from command-line values plus the
// service cards already on the page, and is claim-checked like the page.
// ---------------------------------------------------------------------------
const CHAT_SRC = path.join(REPO_ROOT, 'widgets', 'chat');
function buildChatFacts(cfg, ctx) {
  const facts = {
    name: ctx.name,
    trade: ctx.label || undefined,
    phone: ctx.phoneDisplay,
    email: ctx.email || undefined,
    hours: ctx.hours || undefined,
    areas: ctx.areas.map((a) => (a.toLowerCase() === ctx.cityName.toLowerCase() ? ctx.cityFull : a)),
    services: cfg.services.map(([t, d]) => ({ name: t, keywords: [d] })),
    faq: [],
  };
  return JSON.parse(JSON.stringify(facts));
}
function chatFactsAsHtml(facts) {
  const vals = [facts.name, facts.trade, facts.phone, facts.email, facts.hours, ...facts.areas,
    ...facts.services.flatMap((s) => [s.name, ...(s.keywords || [])]), ...facts.faq.flatMap((f) => [f.q, f.a])];
  return vals.filter(Boolean).map((v) => `<p>${escapeHtml(v)}</p>`).join('\n');
}
function addChatTags(html) {
  if (!/<\/head>/.test(html) || !/<\/body>/.test(html)) throw new Error('--chat: page has no </head> or </body>');
  return html.replace('</head>', '  <link rel="stylesheet" href="chat/chat-widget.css">\n</head>')
    .replace(/<\/body>(?![\s\S]*<\/body>)/, '  <script src="chat/chat-widget.js" data-facts="chat-facts.json" defer></script>\n</body>');
}

const decodeEntities = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Visible text plus the attribute text a reader or search engine sees. */
function claimText(html) {
  return decodeEntities(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, (tag) => {
      const attrs = [...tag.matchAll(/\s(?:alt|aria-label|title|content|placeholder)="([^"]*)"/gi)].map((m) => m[1]);
      return ` ${attrs.join(' ')} `;
    }))
    .replace(/\s+/g, ' ');
}

function checkClaims(outHtml, ctx) {
  let text = claimText(outHtml);
  const supplied = [ctx.name, ctx.cityFull, ctx.cityName, ctx.label, ctx.tagline, ctx.hours, ctx.email, ctx.phoneDisplay,
    ...ctx.areas, ...(ctx.zelle ? [ctx.zelle.phone, ctx.zelle.email, ctx.zelle.amount] : []), ...(ctx.suppliedText || [])]
    .filter(Boolean).map((v) => String(v).replace(/\s+/g, ' ').trim()).sort((a, b) => b.length - a.length);
  for (const v of supplied) text = text.replace(new RegExp(escapeRe(v), 'gi'), ' ');

  const problems = [];
  for (const rule of CLAIM_RULES) {
    if (rule.flag && ctx[rule.flag]) continue;
    if (rule.flag === 'sampleReviews' && ctx.reviews) continue; // --reviews-file: the business supplied them
    if (rule.flag === 'licensed' && (ctx.insured || ctx.licenseNo)) continue; // --insured / --license-no
    if (rule.what === 'star rating' && ctx.rated) continue; // average computed from --reviews-file ratings
    const m = text.match(rule.re);
    if (m) {
      const at = Math.max(0, m.index - 40);
      problems.push(`${rule.what}: "…${text.slice(at, m.index + m[0].length + 40).trim()}…"` +
        (rule.flag ? ` (allowed only with --${rule.flag.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())})` : ''));
    }
  }
  if (ctx.sampleReviews) {
    const attributions = [...outHtml.matchAll(/<blockquote class="quote">[\s\S]*?<footer>([^<]*)<\/footer>/g)].map((m) => m[1].trim());
    if (!/<h2 id="reviews-title">Sample/.test(outHtml)) problems.push('sample reviews section is not labeled "Sample"');
    if (!attributions.length) problems.push('--sample-reviews was passed but no review cards were found');
    attributions.filter((a) => a !== '— Sample customer').forEach((a) => problems.push(`review attribution "${a}" is not the generic "Sample customer"`));
  }
  return problems;
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
// Library options: --theme / --features and their data flags
// ---------------------------------------------------------------------------
function libraryOptions(values, folder, tradeKey) {
  const cat = TEMPLATES[folder].library ? TEMPLATES[folder] : (tradeKey === folder || REUSED[tradeKey] === folder ? REUSED_DEFAULTS[tradeKey] : null);
  let theme = values.theme != null ? slugify(values.theme) : (cat?.theme || null);
  if (theme === 'none' || theme === 'default') theme = null;
  if (theme && !THEMES[theme]) throw new Error(`--theme "${values.theme}" is not a theme. Use one of: ${Object.keys(THEMES).join(', ')}, none.`);
  const explicit = values.features != null;
  const skipped = [];
  let features = explicit ? String(values.features).split(',').map((f) => slugify(f)).filter(Boolean) : [...(cat?.features || [])];
  if (features.includes('none')) features = [];
  const bad = features.filter((f) => !FEATURES.includes(f));
  if (bad.length) throw new Error(`--features: unknown "${bad.join(', ')}". Use any of: ${FEATURES.join(', ')} (or none).`);
  if (values['reviews-file'] && !features.includes('reviews')) features.push('reviews');
  if (values['before-after'] && !features.includes('before-after')) features.push('before-after');
  if ((values['map-center'] || values['map-area']) && !features.includes('map')) features.push('map');
  if (values['menu-file'] && !features.includes('menu')) features.push('menu');
  if (values['booking-url'] && !features.includes('booking')) features.push('booking');
  if (values['faq-file'] && !features.includes('faq')) features.push('faq');
  const dataFlag = { emergency: 'emergency', badges: 'badges', checklist: 'checklist', pricing: 'pricing-file', team: 'team-file', 'pickup-order': 'menu-file' };
  for (const [f, flag] of [['emergency', 'emergency'], ['badges', 'badges'], ['checklist', 'checklist'], ['pricing', 'pricing-file'], ['team', 'team-file'], ['process', 'steps-file']]) {
    if (values[flag] && !features.includes(f)) features.push(f);
  }
  if ((values['order-endpoint'] || values['order-url']) && !features.includes('pickup-order')) features.push('pickup-order');
  for (const [f, flag] of Object.entries(dataFlag)) {
    if (features.includes(f) && !values[flag]) {
      if (explicit || f === 'pickup-order') throw new Error(`--features ${f} needs --${flag}. Nothing is invented for it.`);
      features = features.filter((x) => x !== f); skipped.push(`${f} (no --${flag})`);
    }
  }
  if (features.includes('hours') && !values.hours) {
    if (explicit) throw new Error('--features hours needs --hours "TEXT". Hours are never invented.');
    features = features.filter((f) => f !== 'hours'); skipped.push('hours (no --hours)');
  }
  if (features.includes('reviews') && !values['reviews-file']) {
    if (!values['sample-reviews'] && explicit) throw new Error('--features reviews needs --reviews-file (real reviews) or --sample-reviews (labeled samples).');
    features = features.filter((f) => f !== 'reviews'); // --sample-reviews keeps the template's labeled sample section
  }
  if (features.includes('map') && !explicit && !values['map-center'] && !values['map-area']) {
    features = features.filter((f) => f !== 'map'); skipped.push('map (pass --map-center or --map-area)');
  }
  // Money feature (spec v1 P1): default per library category / new category name only.
  const libDefault = TEMPLATES[folder].library ? folder : (REUSED[tradeKey] === folder && REUSED_DEFAULTS[tradeKey] ? tradeKey : null);
  let money = values.money != null ? slugify(values.money) : (libDefault ? (MONEY_DEFAULTS[libDefault] ?? null) : null);
  if (money === 'none') money = null;
  if (money && !MONEY[money]) throw new Error(`--money "${values.money}" is not a money feature. Use one of: ${Object.keys(MONEY).join(', ')}, none.`);
  if (money === 'pickup-order' && !values['menu-file']) {
    if (values.money != null) throw new Error('--money pickup-order needs --menu-file.');
    money = null; skipped.push('pickup-order money feature (no --menu-file; menu + call instead, spec v5)');
  }
  if (money === 'listing-search' && values['listings-file'] && !values.brokerage) throw new Error('--listings-file needs --brokerage (the brokerage name is shown on every listing card).');
  if (MONEY[money]?.reuse && !features.includes(MONEY[money].reuse)) features.push(MONEY[money].reuse);
  if (money && money !== 'quote-form' && !MONEY[money].reuse) features = features.filter((f) => f !== 'quote-form'); // one form, not two
  if (money === 'quote-form') features = features.filter((f) => f !== 'quote-form');
  if (money && money !== 'booking') features = features.filter((f) => f !== 'booking'); // spec v3 B2: one booking section
  if (features.includes('faq') && !values['faq-file']) {
    if (explicit && values.features.includes('faq')) throw new Error('--features faq needs --faq-file with the owner\'s answers (see --faq-bank). Answers are never written for them.');
    features = features.filter((f) => f !== 'faq'); skipped.push('faq (no --faq-file; run --faq-bank for the question list)');
  }
  // No prices on pages: pricing only when the owner supplies --pricing-file.
  if (!values['pricing-file']) features = features.filter((f) => f !== 'pricing');
  // Order sections the same way every time.
  features = FEATURES.filter((f) => features.includes(f));
  return { theme, features, skipped, money };
}

function readJson(flag, file) {
  try { return JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }
  catch (e) { throw new Error(`--${flag}: could not read JSON from ${file} (${e.message})`); }
}

async function resolveFeatureData(values, lib, ctx, outDir) {
  const out = { suppliedText: [] };
  const has = (f) => lib.features.includes(f);
  if (has('booking') && values['booking-url']) {
    let u;
    try { u = new URL(values['booking-url']); } catch { throw new Error('--booking-url must be a full https URL (e.g. a Calendly or Square booking page).'); }
    if (u.protocol !== 'https:' || u.username || u.password) throw new Error('--booking-url must be https with no username or password.');
    if (u.hostname.toLowerCase().endsWith(STRIPE_HOST)) throw new Error('--booking-url cannot be a payment link. Use --pay-url for Stripe.');
    out.bookingUrl = u.toString();
    if (values['booking-provider']) out.bookingEmbed = validateBooking(values['booking-provider'], out.bookingUrl);
  } else if (values['booking-provider']) throw new Error('--booking-provider needs --booking-url and the booking feature (or --money booking).');
  if (has('reviews') && values['reviews-file']) {
    const r = readJson('reviews-file', values['reviews-file']);
    if (!Array.isArray(r) || !r.length || r.some((x) => !x || !x.text || !x.name)) throw new Error('--reviews-file must be a JSON array of { "name", "text", "source"? } copied from real reviews.');
    out.reviews = r.slice(0, 6);
    out.suppliedText.push(...out.reviews.flatMap((x) => [x.text, x.name, x.source]).filter(Boolean));
  }
  if ((has('menu') || has('pickup-order')) && values['menu-file']) {
    let m = readJson('menu-file', values['menu-file']);
    if (m && !Array.isArray(m) && Array.isArray(m.menu)) { out.orderMenuSample = Boolean(m.sample); m = m.menu; }
    if (!Array.isArray(m) || m.some((s) => !s.section || !Array.isArray(s.items))) throw new Error('--menu-file must be a JSON array of { "section", "items": [{ "name", "desc"?, "price"? }] }.');
    out.menu = m;
    if (has('pickup-order')) {
      m.forEach((sec) => sec.items.forEach((it) => (it.options || []).forEach((o) => {
        if (!o.name || !Array.isArray(o.choices) || !o.choices.every((c) => c && c.label)) throw new Error(`--menu-file: options on "${it.name}" need { "name", "choices": [{ "label", "price"? }] }.`);
        out.suppliedText.push(o.name, ...o.choices.flatMap((c) => [c.label, c.price]).filter(Boolean));
      })));
      out.orderMenu = m;
    }
    out.suppliedText.push(...m.flatMap((s) => [s.section, ...s.items.flatMap((i) => [i.name, i.desc, i.price])]).filter(Boolean));
  }
  if (values['faq-file']) {
    const f = readJson('faq-file', values['faq-file']);
    if (!Array.isArray(f) || f.some((x) => !x.q)) throw new Error('--faq-file must be a JSON array of { "q", "a" } supplied by the business.');
    out.faqExtra = f.filter((x) => String(x.a || '').trim());
    out.suppliedText.push(...f.flatMap((x) => [x.q, x.a]));
  }
  if (has('before-after') && values['before-after']) {
    fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
    out.baPairs = values['before-after'].split(',').map((pair, i) => pair.split(':').map((file, j) => {
      const src = path.resolve(file.trim());
      if (!fs.existsSync(src)) throw new Error(`--before-after: file not found: ${file}`);
      const dest = `img/ba-${i + 1}-${j ? 'after' : 'before'}${path.extname(src).toLowerCase()}`;
      fs.copyFileSync(src, path.join(outDir, dest));
      return dest;
    })).filter((p) => p.length === 2);
  }
  const httpsOnly = (flag, raw) => {
    let u;
    try { u = new URL(raw); } catch { throw new Error(`--${flag} must be a full https URL.`); }
    if (u.protocol !== 'https:' || u.username || u.password) throw new Error(`--${flag} must be https with no username or password.`);
    if (u.hostname.toLowerCase().endsWith(STRIPE_HOST)) throw new Error(`--${flag} cannot be a payment link. Orders are paid at pickup.`);
    return u.toString();
  };
  if (has('pickup-order')) {
    if (values['order-endpoint']) out.orderEndpoint = httpsOnly('order-endpoint', values['order-endpoint']);
    if (values['order-url']) out.orderUrl = httpsOnly('order-url', values['order-url']);
  }
  out.money = lib.money;
  out.freeEstimates = Boolean(values['free-estimates']);
  if (values['hours-json']) out.hoursSpec = parseHoursJson(values['hours-json']);
  if (values.address) out.address = validateText('address', values.address, 120);
  if (values.cuisine) out.cuisine = validateText('cuisine', values.cuisine, 60);
  if (values['site-url']) out.siteUrl = httpsOnly('site-url', values['site-url']);
  out.faqSchema = Boolean(values['faq-schema']);
  for (const v of [out.address, out.cuisine]) if (v) out.suppliedText.push(v);
  out.tradeKey = slugify(values.trade);
  out.textOk = Boolean(values.text);
  if (values['money-endpoint']) out.moneyEndpoint = httpsOnly('money-endpoint', values['money-endpoint']);
  out.notify = validateNotify(values.notify, values['notify-endpoint'], httpsOnly);
  if (out.notify?.endpoint && !out.moneyEndpoint) out.moneyEndpoint = out.notify.endpoint;
  if (values['money-link']) out.moneyLink = httpsOnly('money-link', values['money-link']);
  if (lib.money === 'pickup-order') { out.orderEndpoint = out.orderEndpoint || out.moneyEndpoint; out.orderUrl = out.orderUrl || out.moneyLink; }
  if (lib.money === 'booking' && out.moneyLink && !out.bookingUrl) out.bookingUrl = out.moneyLink;
  if (values.zips) {
    out.zips = values.zips.split(',').map((z) => z.trim()).filter(Boolean);
    if (out.zips.some((z) => !/^\d{5}$/.test(z))) throw new Error('--zips must be comma-separated 5-digit ZIP codes.');
  }
  if (values.brokerage && !out.brokerage) out.brokerage = validateText('brokerage', values.brokerage, 80);
  if (values['license-no']) out.licenseNo = validateText('license-no', values['license-no'], 60);
  out.insured = Boolean(values.insured);
  if (values.certs) out.certs = values.certs.split(',').map((c) => c.trim()).filter(Boolean);
  if (values['schedule-file']) {
    const sc = readJson('schedule-file', values['schedule-file']);
    if (!Array.isArray(sc) || sc.some((x) => !x.class || !x.day || !x.time)) throw new Error('--schedule-file must be a JSON array of { "class", "day", "time" }.');
    out.schedule = sc;
  }
  if (values['listings-file']) {
    const ls = readJson('listings-file', values['listings-file']);
    if (!Array.isArray(ls) || ls.some((x) => !x.title)) throw new Error('--listings-file must be a JSON array of the agent\'s own listings { "title", "price"?, "beds"?, "baths"?, "area"?, "url"? }.');
    fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
    out.listings = ls.map((x, i) => {
      if (!x.photo) return x;
      const src = path.resolve(path.dirname(path.resolve(values['listings-file'])), x.photo);
      if (!fs.existsSync(src)) throw new Error(`--listings-file: photo not found: ${x.photo}`);
      const dest = `img/listing-${i + 1}${path.extname(src).toLowerCase()}`;
      fs.copyFileSync(src, path.join(outDir, dest));
      return { ...x, photo: dest };
    });
    out.brokerage = validateText('brokerage', values.brokerage, 80);
  }
  out.rated = (out.reviews || []).some((r) => Number(r.rating) > 0);
  for (const v of [...(out.zips || []), out.licenseNo, ...(out.certs || []), out.brokerage, ...(out.schedule || []).flatMap((x) => [x.class, x.day, x.time]),
    ...(out.listings || []).flatMap((x) => [x.title, x.price, x.area, x.beds && `${x.beds} bd`, x.baths && `${x.baths} ba`])]) if (v) out.suppliedText.push(String(v));
  if (has('emergency')) out.emergency = validateText('emergency', values.emergency, 100);
  if (has('badges')) out.badges = values.badges.split(',').map((b) => b.trim()).filter(Boolean).slice(0, 8);
  if (has('checklist')) out.checklist = values.checklist.split(',').map((b) => b.trim()).filter(Boolean);
  if (has('process') && values['steps-file']) {
    const st = readJson('steps-file', values['steps-file']);
    if (!Array.isArray(st) || st.some((x) => !x.title)) throw new Error('--steps-file must be a JSON array of { "title", "text"? }.');
    out.steps = st.map((x) => [x.title, x.text || '']);
  }
  if (has('pricing')) {
    const pr = readJson('pricing-file', values['pricing-file']);
    if (!Array.isArray(pr) || pr.some((x) => !x.name)) throw new Error('--pricing-file must be a JSON array of { "name", "price"?, "details"?: [] } with the business\'s own prices.');
    out.pricing = pr;
  }
  if (has('team')) {
    const tm = readJson('team-file', values['team-file']);
    if (!Array.isArray(tm) || tm.some((x) => !x.name)) throw new Error('--team-file must be a JSON array of { "name", "role"?, "bio"?, "photo"? (local file) }.');
    fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
    out.team = tm.map((x, i) => {
      if (!x.photo) return x;
      const src = path.resolve(path.dirname(path.resolve(values['team-file'])), x.photo);
      if (!fs.existsSync(src)) throw new Error(`--team-file: photo not found: ${x.photo}`);
      const dest = `img/team-${i + 1}${path.extname(src).toLowerCase()}`;
      fs.copyFileSync(src, path.join(outDir, dest));
      return { ...x, photo: dest };
    });
  }
  for (const v of [out.emergency, ...(out.badges || []), ...(out.checklist || []), ...(out.steps || []).flat(),
    ...(out.pricing || []).flatMap((x) => [x.name, x.price, ...(x.details || [])]), ...(out.team || []).flatMap((x) => [x.name, x.role, x.bio])]) if (v) out.suppliedText.push(v);
  if (has('map')) {
    out.mapArea = values['map-area'] ? values['map-area'].trim() : ctx.cityFull;
    out.mapCenter = values['map-center'] ? parseCenter(values['map-center']) : await geocode(out.mapArea);
    out.suppliedText.push(out.mapArea);
  }
  return out;
}

/** Spec v3: per-trade copy blocks, JSON-LD, combo mobile nav, brokerage line. */
function applyV3(html, cfg, ctx, { folder, tradeKey, lib, libOn }) {
  const copy = COPY[folder];
  const city = escapeHtml(ctx.cityFull);
  if (copy) {
    const c = { name: ctx.nameHtml, city, cityName: escapeHtml(ctx.cityName), areas: ctx.areas.map(escapeHtml).join(', '), cuisine: ctx.cuisine && escapeHtml(ctx.cuisine),
      practice: /dent/.test(tradeKey) ? 'Dental care' : /medical|clinic|doctor|chiro|therapy/.test(tradeKey) ? 'Medical care' : 'Dental &amp; medical care' };
    if (!ctx.tagline) html = html.replace(/<h1 id="hero-title">[\s\S]*?<\/h1>/, () => `<h1 id="hero-title">${copy.h1(c)}</h1>`);
    html = html.replace(/<p class="lead">[\s\S]*?<\/p>/, () => `<p class="lead">${copy.sub(c)} Call <a href="${ctx.tel}">${escapeHtml(ctx.phoneDisplay)}</a>.</p>`);
    let primary = lib.money ? ((ctx.listings && copy.listingsPrimary) || (ctx.freeEstimates && copy.free) || copy.primary) : (copy.noMoneyPrimary || null);
    if (primary) {
      html = html.replace(/(<a class="btn btn-primary" href=")([^"]*)(">)[^<]*(<\/a>)/, (m, a, href, b, d) => `${a}${!lib.money && copy.noMoneyPrimary ? '#services' : href}${b}${escapeHtml(primary)}${d}`);
      html = html.replace(/(<a class="cb-alt cb-money" href="[^"]*">)[^<]*(<\/a>)/, (m, a, d) => `${a}${escapeHtml(copy.sticky)}${d}`);
    }
    const others = ctx.areas.filter((a) => a.toLowerCase() !== ctx.cityName.toLowerCase());
    const service = /truck/.test(tradeKey) && ctx.label ? capFirst(ctx.label) : copy.service;
    const t = `${service} in ${ctx.cityFull} | ${ctx.name}`;
    let meta = `${service} in ${ctx.cityFull}${others.length ? `, ${others.join(', ')}` : ''}. ${primary ? `${primary.replace(/\?$/, '')} online or call` : 'Call'} ${ctx.phoneDisplay}.`;
    if (meta.length > 155) meta = `${service} in ${ctx.cityFull}. Call ${ctx.phoneDisplay}.`;
    html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(t)}</title>`).replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${escapeHtml(meta)}">`);
  }
  html = html.replace('</head>', () => `${jsonLd(ctx, cfg, folder, tradeKey)}\n</head>`);
  if (ctx.brokerage) html = html.replace(/(<div class="container footer-bottom">)/, (m) => `${m}\n      <span>Brokerage: ${escapeHtml(ctx.brokerage)}</span>`);
  if (libOn) {
    // Combo navigation (NN/g): 2-3 visible links on phones plus a labeled Menu button.
    const pri = [lib.money ? ['#money', MONEY[lib.money].short || 'Request'] : null, ['#services', cfg.servicesTitle || 'Services'], ['#contact', 'Contact']].filter(Boolean)
      .map(([h, t]) => [MONEY[lib.money]?.reuse === 'pickup-order' && h === '#money' ? '#order' : MONEY[lib.money]?.reuse === 'booking' && h === '#money' ? '#booking' : h, t]);
    html = html.replace(/(<button class="nav-toggle"[^>]*>)[\s\S]*?(<\/button>)/, (m, a, b) => `<nav class="nav-priority" aria-label="Main links">${pri.map(([h, t]) => `<a href="${h}">${escapeHtml(t)}</a>`).join('')}</nav>\n      ${a.replace('aria-label="Open menu"', 'aria-label="Open full menu"')}<span class="nav-toggle-label">Menu</span>${b}`);
  }
  return html;
}

function applyFeatures(html, f) {
  const must = (re, what) => { if (!re.test(html)) throw new Error(`Feature placement: ${what} not found in template.`); };
  if (f.afterServices) {
    must(/(<section id="services"[\s\S]*?<\/section>\n)/, 'services section');
    html = html.replace(/(<section id="services"[\s\S]*?<\/section>\n)/, (m) => m + f.afterServices);
  }
  if (f.beforeContact) {
    must(/\n[ \t]*<section id="contact"/, 'contact section');
    html = html.replace(/\n([ \t]*<section id="contact")/, (m, g) => `${f.beforeContact}\n${g}`);
  }
  if (f.nav.length) html = html.replace('<a href="#contact">Contact</a>', () => `${f.nav.map(([h, t]) => `<a href="${h}">${t}</a>`).join('\n        ')}\n        <a href="#contact">Contact</a>`);
  if (f.heroCta) html = html.replace('<a class="btn btn-primary" href="#contact">Send a Message</a>', () => `<a class="btn btn-primary" href="${f.heroCta[0]}">${f.heroCta[1]}</a>`);
  if (f.topBanner) html = html.replace('<main id="top">', () => `<main id="top">${f.topBanner}`);
  if (f.afterHero) html = html.replace(/(<section class="hero"[\s\S]*?<\/section>\n)/, (m) => m + f.afterHero);
  if (f.orderAssets) html = html.replace('</head>', '  <link rel="stylesheet" href="order/order.css">\n</head>');
  if (f.bodyClass) html = html.replace(/<body>/, `<body class="${f.bodyClass}">`);
  if (f.bodyEnd) html = html.replace(/<\/body>(?![\s\S]*<\/body>)/, () => `${f.bodyEnd}\n</body>`);
  return html;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const { values } = parseArgs({
    options: {
      name: { type: 'string' }, trade: { type: 'string' }, city: { type: 'string' }, phone: { type: 'string' },
      primary: { type: 'string' }, accent: { type: 'string' }, areas: { type: 'string' }, email: { type: 'string' },
      'pay-url': { type: 'string' },
      'no-claim': { type: 'boolean' },
      'zelle-phone': { type: 'string' }, 'zelle-email': { type: 'string' }, 'zelle-amount': { type: 'string' },
      licensed: { type: 'boolean', default: false }, years: { type: 'string' }, hours: { type: 'string' },
      chat: { type: 'boolean', default: false },
      theme: { type: 'string' }, features: { type: 'string' }, 'map-center': { type: 'string' }, 'map-area': { type: 'string' },
      'booking-url': { type: 'string' }, 'menu-file': { type: 'string' }, 'reviews-file': { type: 'string' }, 'faq-file': { type: 'string' },
      'before-after': { type: 'string' },
      'free-estimates': { type: 'boolean', default: false }, 'hours-json': { type: 'string' }, address: { type: 'string' }, cuisine: { type: 'string' },
      'site-url': { type: 'string' }, 'faq-schema': { type: 'boolean', default: false }, 'faq-bank': { type: 'boolean', default: false },
      money: { type: 'string' }, 'money-endpoint': { type: 'string' }, 'money-link': { type: 'string' }, zips: { type: 'string' },
      text: { type: 'boolean', default: false }, 'license-no': { type: 'string' }, insured: { type: 'boolean', default: false }, certs: { type: 'string' },
      'schedule-file': { type: 'string' }, 'listings-file': { type: 'string' }, brokerage: { type: 'string' },
      emergency: { type: 'string' }, badges: { type: 'string' }, checklist: { type: 'string' }, 'steps-file': { type: 'string' },
      'pricing-file': { type: 'string' }, 'team-file': { type: 'string' }, 'order-endpoint': { type: 'string' }, 'order-url': { type: 'string' },
      'allow-feature': { type: 'string' }, 'allow-reason': { type: 'string' }, reason: { type: 'string' },
      notify: { type: 'string' }, 'notify-endpoint': { type: 'string' }, 'booking-provider': { type: 'string' },
      'pay-label': { type: 'string' }, 'pay-context': { type: 'string' }, 'pay-demo': { type: 'boolean', default: false },
      palette: { type: 'string' }, fonts: { type: 'string' }, layout: { type: 'string' }, hero: { type: 'string' }, 'hero-img': { type: 'string' },
      tagline: { type: 'string' }, 'sample-reviews': { type: 'boolean', default: false },
      out: { type: 'string' }, 'png-dir': { type: 'string' },
      mobile: { type: 'boolean', default: false }, 'no-png': { type: 'boolean', default: false },
      list: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
  });
  if (values.help) { console.log(usage()); return; }
  if (values['faq-bank']) {
    if (!values.trade) { console.error('--faq-bank needs --trade'); process.exit(1); }
    const { folder: f } = resolveTrade(values.trade);
    console.log(JSON.stringify(faqBank(f, values.licensed).map((q) => ({ q, a: '' })), null, 2));
    console.error('Fill in the answers the owner gives you; questions with an empty "a" are skipped. Then pass --faq-file.');
    return;
  }
  if (values.list) { console.log(usage().split('Trade aliases:')[1]); return; }
  const missing = ['name', 'trade', 'city', 'phone'].filter((k) => !values[k]);
  if (missing.length) { console.error(`Missing required flag(s): ${missing.map((m) => '--' + m).join(', ')}\n${usage()}`); process.exit(1); }

  const payUrl = validatePayUrl(values['pay-url']);
  const zelle = validateZelle(values);
  const payBlock = (!payUrl && values['pay-demo'] && !zelle) ? PAY_DEMO_HTML : buildPayBlock(payUrl, zelle, payLabel(values['pay-label'], values['pay-context']));
  if ((values['pay-label'] || values['pay-context']) && !payUrl) console.warn('! --pay-label/--pay-context ignored: no --pay-url, so no pay button is rendered.');
  const years = validateYears(values.years);
  const hours = validateText('hours', values.hours, 120);
  const tagline = validateText('tagline', values.tagline, 90);

  const { folder, fallback } = resolveTrade(values.trade);
  const tradeKey = slugify(values.trade);
  { // Early spec v5 check on the raw flags, so a forbidden implicit add fails before its data checks do.
    const t0 = tradeRules(fallback ? null : tradeKey, fallback ? null : folder); if (fallback) t0.id = tradeKey;
    let ov0; try { ov0 = parseOverride(values['allow-feature'], values['allow-reason'] || values.reason); } catch (e) { console.error(`✗ ${e.message}`); process.exit(5); }
    const raw = [values.money != null && ['money', slugify(values.money), '--money'], ...(values.features ? String(values.features).split(',').map((f) => ['feature', slugify(f), '--features']) : []),
      values['menu-file'] && ['feature', 'menu', '--menu-file implied menu'], values['booking-url'] && ['feature', 'booking', '--booking-url implied booking'],
      values['order-endpoint'] && ['feature', 'pickup-order', '--order-endpoint implied pickup-order'], values['order-url'] && ['feature', 'pickup-order', '--order-url implied pickup-order'],
      values.emergency && ['feature', 'emergency', '--emergency implied emergency'], values['pricing-file'] && ['feature', 'pricing', '--pricing-file implied pricing']].filter(Boolean);
    const c0 = checkTrade(t0, raw, ov0);
    if (c0.fails.length) { console.error(`✗ ${failMessage(t0, c0.fails)}`); process.exit(5); }
  }
  const lib = libraryOptions(values, folder, tradeKey);
  const cfg = TEMPLATES[folder];
  // Spec v1 P2 / v4 A: design flags. All opt-in; without them the build is unchanged.
  const design = {
    palette: resolveDesign('palette', values.palette, tradeKey, folder),
    fonts: resolveDesign('fonts', values.fonts, tradeKey, folder),
    layout: resolveDesign('layout', values.layout, tradeKey, folder, (w) => console.warn(`! ${w}`)),
  };
  design.hero = resolveDesign('hero', values.hero, tradeKey, folder) || (design.layout ? layoutHero(design.layout) : null) || (values['hero-img'] ? 'media' : null);
  // Spec v5 trade x feature check (tools/industry-features.json). Runs before anything is written.
  const trade = tradeRules(fallback ? null : tradeKey, fallback ? null : folder);
  if (fallback) trade.id = tradeKey;
  const override = parseOverride(values['allow-feature'], values['allow-reason'] || values.reason); // validated above
  const src = (f) => (values.features && String(values.features).split(',').map(slugify).includes(f) ? '--features' : f === 'menu' && values['menu-file'] ? '--menu-file' : f === 'booking' && values['booking-url'] ? '--booking-url' : f === 'pickup-order' && (values['order-endpoint'] || values['order-url']) ? `--order-${values['order-endpoint'] ? 'endpoint' : 'url'} implied pickup-order` : values[{ emergency: 'emergency', badges: 'badges', checklist: 'checklist', pricing: 'pricing-file', team: 'team-file', process: 'steps-file' }[f]] ? `--${{ pricing: 'pricing-file', team: 'team-file', process: 'steps-file' }[f] || f}` : MONEY[lib.money]?.reuse === f ? `--money ${lib.money} implied ${f}` : 'trade default');
  const requested = new Set([...lib.features, ...(values.features ? String(values.features).split(',').map((f) => slugify(f)) : []), values['menu-file'] && 'menu', values['booking-url'] && 'booking', (values['order-endpoint'] || values['order-url']) && 'pickup-order'].filter((f) => f && f !== 'none'));
  const chk = checkTrade(trade, [['money', lib.money, values.money != null ? '--money' : 'trade default'], ...[...requested].map((f) => ['feature', f, src(f)]),
    ['layout', design.layout, values.layout ? '--layout' : null], ['hero', design.hero, values.hero ? '--hero' : '--layout default hero']], override);
  if (lib.money && values.money != null && trade.rules.money?.default && lib.money !== trade.rules.money.default && !chk.fails.length) chk.warns.push(`money "${lib.money}" overrides the trade default "${trade.rules.money.default}"`);
  chk.warns.forEach((w) => console.warn(`! ${w}`));
  if (chk.fails.length) { console.error(`✗ ${failMessage(trade, chk.fails)}`); process.exit(5); }
  const pal = design.palette ? PALETTES[design.palette] : null;
  const primary = toHex(parseHex(values.primary || pal?.primary || cfg.defaults.primary));
  const accent = toHex(parseHex(values.accent || pal?.accent || cfg.defaults.accent));
  const { cityName, cityFull, state } = parseCity(values.city);
  const slug = slugify(values.name) || 'mockup';
  const email = values.email ? values.email.trim() : null;
  const phoneDisplay = formatPhone(values.phone);
  if (phoneDigits(values.phone).length !== 10) console.warn(`! Phone "${values.phone}" is not a 10-digit US number; using it as-is.`);

  const areas = values.areas
    ? values.areas.split(',').map((s) => s.trim()).filter(Boolean)
    : [cityName];
  if (!areas.some((a) => a.toLowerCase() === cityName.toLowerCase())) areas.unshift(cityName);

  const ctx = {
    name: values.name, nameHtml: escapeHtml(values.name), phoneDisplay, tel: telHref(values.phone), email, cityName, cityFull, areas, state,
    label: (tradeKey === folder && cfg.label) || REUSED_DEFAULTS[tradeKey]?.label || tradeLabel(values.trade), payBlock, zelle,
    licensed: values.licensed, years, hours, tagline, sampleReviews: values['sample-reviews'],
  };

  const outDir = path.resolve(values.out || path.join(REPO_ROOT, 'mockups', slug));
  const pngDir = path.resolve(values['png-dir'] || path.dirname(outDir));
  const srcDir = path.join(REPO_ROOT, cfg.base || folder);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(pngDir, { recursive: true });
  fs.cpSync(srcDir, outDir, { recursive: true });

  const htmlPath = path.join(outDir, 'index.html');
  const cssPath = path.join(outDir, 'styles.css');
  let css = fs.readFileSync(cssPath, 'utf8');
  const built = buildHtml(cfg, fs.readFileSync(htmlPath, 'utf8'), ctx);
  let { html: outHtml, count: galleryCount, removed } = cfg.placeholderPhotos ? { html: built, count: 3, removed: [] } : await pruneGallery(built, css);
  // Library features (tools/library.mjs). Nothing changes when no --theme/--features and the trade is an original one.
  Object.assign(ctx, await resolveFeatureData(values, lib, ctx, outDir));
  ctx.slug = slug;
  if (ctx.bookingEmbed) ctx.bookingEmbedHtml = bookingEmbedHtml;
  const trustOn = Boolean(values['license-no'] || values.insured || values.certs || ctx.rated);
  const libOn = Boolean(lib.theme || lib.features.length || lib.money || ctx.zips || trustOn || values.text);
  if (libOn) {
    if (lib.money) ctx.moneyCta = MONEY[lib.money].reuse ? null : ['#money', MONEY[lib.money].title, MONEY[lib.money].short];
    const feat = buildFeatures(lib.features, cfg, ctx);
    if (lib.money && !MONEY[lib.money].reuse) feat.moneyHtml = buildMoney(lib.money, cfg, ctx);
    if (lib.money) feat.heroCta = ctx.moneyCta || feat.heroCta;
    feat.afterHero = (feat.afterHero || '') + (feat.moneyHtml || '');
    if (ctx.zips) feat.beforeContact = buildZip(ctx) + (feat.beforeContact || '');
    if ((lib.money && !MONEY[lib.money].reuse) || ctx.zips) {
      const callNote = `This mockup does not send messages yet. Please call ${ctx.name} at ${ctx.phoneDisplay}.`;
      let script = MONEY_SCRIPT.split('__CALL__').join(JSON.stringify(callNote));
      // Listing filters only ship on listing pages (industry audit: no real-estate code on other trades).
      if (lib.money !== 'listing-search') script = script.replace(' + listing filters', '').replace(/\n    var sels = document\.querySelectorAll\('\[data-filter\]'\);[\s\S]*?\}\); \}\);/, '');
      feat.bodyEnd = (feat.bodyEnd || '') + script;
    }
    const trust = trustItems(ctx);
    if (trust.length) outHtml = outHtml.replace(/(<div class="hero-actions">[\s\S]*?\n[ \t]*<\/div>)/, (m) => `${m}\n        <ul class="trust-row" aria-label="Facts">${trust.map((t) => `<li>${t}</li>`).join('')}</ul>`);
    outHtml = applyFeatures(outHtml, feat);
    if (feat.orderAssets) {
      fs.mkdirSync(path.join(outDir, 'order'), { recursive: true });
      for (const f of ['order.js', 'order.css']) fs.copyFileSync(path.join(REPO_ROOT, 'widgets', 'order', f), path.join(outDir, 'order', f));
    }
  }
  outHtml = applyV3(outHtml, cfg, ctx, { folder, tradeKey, lib, libOn: Boolean(lib.theme || lib.features.length || lib.money || ctx.zips || values.text) });
  if (ctx.notify) {
    // B1: forms post to the client's endpoint (Worker for sms/both); honeypot for spam; no response-time promise.
    const thanks = `We got it. ${ctx.name} will reply by phone${ctx.notify.mode === 'email' ? ' or email' : ' or text'}.`;
    let n = 0;
    outHtml = outHtml.replace(/<form\b([^>]*\bdata-endpoint="[^"]*"[^>]*)>/g, (m, attrs) => (n++, `<form${attrs} data-notify="${ctx.notify.mode}" data-thanks="${escapeHtml(thanks)}">\n          ${HONEYPOT}`));
    outHtml = outHtml.split("st.textContent = 'Sent. Thank you.';").join("st.textContent = f.getAttribute('data-thanks') || 'Sent. Thank you.';");
    if (!n) console.warn('! --notify: this build has no money form that posts to an endpoint (add --money <type>); the flag had no effect.');
  }
  let heroImg = null;
  if (values['hero-img']) {
    const src = values['hero-img'].trim();
    if (/^https:\/\//.test(src)) heroImg = src;
    else {
      const abs = path.resolve(src);
      if (!fs.existsSync(abs) || !/\.(jpe?g|png|webp|avif)$/i.test(abs)) throw new Error(`--hero-img must be a client-supplied .jpg/.png/.webp/.avif file or https URL (got "${src}")`);
      fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
      heroImg = `img/hero${path.extname(abs).toLowerCase()}`;
      fs.copyFileSync(abs, path.join(outDir, heroImg));
    }
  }
  if (design.layout) outHtml = applyLayout(outHtml, design.layout);
  if (design.hero) outHtml = applyHero(outHtml, design.hero, { ctx, schedule: ctx.schedule || null });
  if (heroImg) outHtml = outHtml.replace(/<section class="hero/, `<link rel="preload" as="image" href="${escapeHtml(heroImg)}">\n    $&`);
  if (design.fonts) {
    const links = fontLinks(design.fonts);
    const stripped = outHtml.replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\n?/g, '').replace(/[ \t]*<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>\n?/g, '');
    outHtml = stripped.replace(/([ \t]*)<link rel="stylesheet" href="styles\.css">/, `$1${links}\n$1<link rel="stylesheet" href="styles.css">`);
  }
  let chatFacts = null;
  if (values.chat) {
    chatFacts = buildChatFacts(cfg, ctx);
    if (lib.features.includes('faq')) chatFacts.faq = buildFaq(cfg, ctx);
    outHtml = addChatTags(outHtml);
    fs.mkdirSync(path.join(outDir, 'chat'), { recursive: true });
    for (const f of ['chat-widget.js', 'chat-widget.css']) fs.copyFileSync(path.join(CHAT_SRC, f), path.join(outDir, 'chat', f));
    fs.writeFileSync(path.join(outDir, 'chat-facts.json'), JSON.stringify(chatFacts, null, 2) + '\n');
  }
  if (cfg.placeholderPhotos && cfg.stock?.files.length) {
    fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
    for (const f of cfg.stock.files.slice(0, 3)) fs.copyFileSync(path.join(REPO_ROOT, 'stock', cfg.stock.key, f), path.join(outDir, 'img', `stock-${f}`));
  }
  if (removed.length) console.warn(`! Dropped ${removed.length} gallery photo(s) whose URL is gone (404)`);
  fs.writeFileSync(htmlPath, values['no-claim'] ? outHtml : addClaimBar(outHtml));
  const ctaPairs = [];
  let themeCfg = lib.theme ? { ...cfg, dark: THEMES[lib.theme].dark } : cfg;
  const palOut = design.palette ? paletteCss(design.palette, { mix, rgba, ensureContrast }) : null;
  if (palOut) themeCfg = { ...themeCfg, dark: palOut.dark };
  css = replaceAllLiteral(css, cfg.name, values.name) + buildCss(themeCfg, primary, accent, galleryCount, { cta: ctaPairs, pay: Boolean(payUrl || values['pay-demo']), zelle: Boolean(zelle), stats: factLines(ctx).length, hours: Boolean(hours) });
  if (lib.theme || lib.features.length || cfg.placeholderPhotos || lib.money || ctx.zips || ctx.textOk || ctx.licenseNo || ctx.insured || ctx.certs) {
    css += MONEY_CSS + `\n:root { --on-accent: ${pickText(accent)}; }\n${cfg.placeholderPhotos ? '.hero::before { background-image: none; }\n' : ''}${cfg.stock?.files.length ? '.gallery figure { position: relative; margin: 0; }\n.stock-cap { position: absolute; left: .5rem; bottom: .5rem; background: rgba(15,23,42,.8); color: #fff; font-size: .8rem; padding: .15rem .5rem; border-radius: 6px; }\n' : ''}${FEATURE_CSS}`;
    if (lib.theme) css += themeCss(lib.theme, primary, accent, { mix, shade });
  }
  if (palOut) {
    css += palOut.css;
    // CTA label: palette text unless --accent changed the button color; fail below 4.5:1 either way.
    if (values.accent) css += `.btn-primary, .call-bar .cb-call { color: ${pickText(accent)}; }\n:root { --on-accent: ${pickText(accent)}; }\n`;
    for (const pr of palOut.pairs) if (!(values.accent && pr[0] === 'palette CTA label')) ctaPairs.push(pr);
  }
  if (ctx.bookingEmbed?.embed) css += BOOKING_CSS;
  if (design.fonts) css += fontCss(design.fonts);
  if (design.hero) css += heroCss(design.hero, heroImg);
  fs.writeFileSync(cssPath, css);

  const lowCta = ctaPairs.filter(([, fg, bg]) => contrast(fg, bg) < 4.5);
  if (lowCta.length) {
    console.error(`✗ Contrast check failed (CTA text needs 4.5:1):\n  - ${lowCta.map(([w, fg, bg]) => `${w}: ${fg} on ${bg} = ${contrast(fg, bg).toFixed(2)}:1`).join('\n  - ')}\nPick a darker or lighter --accent / --primary.`);
    process.exit(4);
  }
  const { problems, warnings } = verify(outHtml, cfg, ctx);
  warnings.forEach((w) => console.warn(`! ${w}`));
  if (problems.length) { console.error(`✗ Verification failed:\n  - ${problems.join('\n  - ')}`); process.exit(2); }
  const claims = checkClaims(outHtml, ctx);
  if (chatFacts) checkClaims(chatFactsAsHtml(chatFacts), ctx).forEach((c) => claims.push(`chat-facts.json ${c}`));
  if (claims.length) {
    console.error(`✗ Claim check failed. The page states things that were not passed on the command line:\n  - ${claims.join('\n  - ')}\n` +
      'Fix the copy in tools/mockup.mjs (rebuildCopy), or pass the matching flag if the business told you it is true.');
    process.exit(3);
  }

  console.log(`Template: ${folder}${fallback ? `  (trade "${values.trade}" not recognized — using generic-business)` : ''}`);
  console.log(`Colors:   primary ${primary} · accent ${accent}${values.primary || values.accent ? '' : ' (template defaults)'}`);
  if (payUrl) console.log('Pay:      hero "Pay" button (Stripe Payment Link)');
  if (zelle) console.log(`Zelle:    plain text next to the call to action${zelle.amount ? ' (amount shown)' : ''}`);
  if (!payUrl && !zelle) console.log('Payments: off (no pay button, no Zelle block)');
  console.log(`Theme:    ${lib.theme || 'template default'}${lib.features.length ? ` · features ${lib.features.join(', ')}` : ''}${lib.skipped.length ? ` (skipped: ${lib.skipped.join('; ')})` : ''}`);
  if (design.palette || design.fonts || design.layout || design.hero) console.log(`Design:   palette ${design.palette || '-'} · fonts ${design.fonts || '-'} · layout ${design.layout || '-'} · hero ${design.hero || '-'}${heroImg ? ` (${heroImg})` : ''}`);
  console.log(`Chat:     ${chatFacts ? `on (chat/ + chat-facts.json: ${chatFacts.services.length} services, ${chatFacts.areas.length} area(s)${chatFacts.hours ? ', hours' : ', no hours'})` : 'off'}`);
  const optIn = [values.licensed && '--licensed', years && '--years', hours && '--hours', tagline && '--tagline', values['sample-reviews'] && '--sample-reviews'].filter(Boolean);
  console.log(`Claims:   ${optIn.length ? `opt-in ${optIn.join(', ')}` : 'facts only (name, trade, city, phone' + (email ? ', email' : '') + ')'}`);
  console.log('✓ Verified: no template placeholder names, phones, emails, or addresses remain');
  console.log('✓ Claim check: nothing asserted beyond the flags passed');

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
