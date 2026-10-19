// Template library for tools/mockup.mjs: extra categories, style themes, and opt-in
// feature sections. Everything here is placeholder or built from command-line values.
// Copy must pass the facts-only claim check in mockup.mjs (CLAIM_RULES): no years,
// licenses, ratings, reviews, hours, "free", "emergency", "professional", "team", etc.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// Categories. Each one builds on the generic-business HTML (`base`) and swaps in
// its own services, default theme, default features, and labels. Photos are CSS
// placeholders (no stock images), so nothing is off-topic or unlicensed.
// ---------------------------------------------------------------------------
export const CATEGORIES = {
  roofing: {
    label: 'roofing', theme: 'bold-industrial', defaults: { primary: '#7c2d12', accent: '#f59e0b' },
    features: ['call-bar', 'quote-form', 'before-after', 'map', 'faq'],
    services: [['Roof Repair', 'Leaks, flashing, and damaged shingles.'], ['Roof Replacement', 'Tear-off and new roofing.'], ['Roof Inspections', 'A look at the roof before you decide.'], ['Gutters', 'Gutter installs, repairs, and cleaning.']],
    aliases: ['roofing', 'roofer', 'roofers', 'roof', 'roof-repair', 'gutters', 'metal-roofing'],
  },
  hvac: {
    label: 'heating & cooling', theme: 'clean-minimal', defaults: { primary: '#1d4ed8', accent: '#ef4444' },
    features: ['call-bar', 'quote-form', 'map', 'faq'],
    services: [['Heating Repair', 'Furnaces, heat pumps, and boilers.'], ['AC Repair', 'Central air and mini-split systems.'], ['System Installs', 'New heating and cooling equipment.'], ['Maintenance Visits', 'Seasonal tune-ups and filter changes.']],
    aliases: ['hvac', 'heating', 'cooling', 'air-conditioning', 'ac-repair', 'furnace', 'heating-and-cooling'],
  },
  electrician: {
    label: 'electrical services', theme: 'bold-industrial', defaults: { primary: '#1e293b', accent: '#facc15' },
    features: ['call-bar', 'quote-form', 'map', 'faq'],
    services: [['Wiring & Repairs', 'Outlets, switches, and troubleshooting.'], ['Panels & Breakers', 'Panel upgrades and breaker work.'], ['Lighting', 'Indoor, outdoor, and recessed lighting.'], ['EV Chargers', 'Home charger installs.']],
    aliases: ['electrician', 'electricians', 'electrical', 'electric', 'electrical-contractor'],
  },
  painting: {
    label: 'painting', theme: 'warm-local', defaults: { primary: '#0f766e', accent: '#f97316' },
    features: ['call-bar', 'quote-form', 'before-after', 'faq'],
    services: [['Interior Painting', 'Walls, ceilings, and rooms.'], ['Exterior Painting', 'Siding, trim, and doors.'], ['Cabinets & Trim', 'Cabinet refinishing and trim work.'], ['Drywall Repair', 'Patches and prep before paint.']],
    aliases: ['painting', 'painter', 'painters', 'house-painting', 'interior-painting', 'exterior-painting'],
  },
  'auto-repair': {
    label: 'auto repair', theme: 'bold-industrial', defaults: { primary: '#991b1b', accent: '#fbbf24' },
    features: ['call-bar', 'quote-form', 'map', 'faq'],
    services: [['Brakes', 'Pads, rotors, and brake checks.'], ['Oil Changes', 'Oil, filters, and fluids.'], ['Diagnostics', 'Check-engine lights and warning codes.'], ['Tires & Alignment', 'Tire service and wheel alignment.']],
    aliases: ['auto-repair', 'mechanic', 'auto-mechanic', 'car-repair', 'auto-shop', 'garage', 'auto-service'],
  },
  'salon-barber': {
    label: 'salon & barber', theme: 'premium-dark', defaults: { primary: '#6b21a8', accent: '#f0abfc' },
    features: ['call-bar', 'booking', 'map', 'faq'], ask: 'to book a visit', servicesNote: 'Sample service list for this mockup. The list and prices can be matched to exactly what {name} offers.',
    services: [['Haircuts', 'Cuts for all hair types.'], ['Color', 'Color, highlights, and touch-ups.'], ['Beard & Shave', 'Beard trims and shaves.'], ['Styling', 'Blowouts and event styling.']],
    aliases: ['salon-barber', 'salon', 'barber', 'barbershop', 'barber-shop', 'hair-salon', 'beauty-salon', 'nail-salon', 'spa'],
  },
  fitness: {
    label: 'fitness', theme: 'bold-industrial', defaults: { primary: '#111827', accent: '#22c55e' },
    features: ['call-bar', 'booking', 'map', 'faq'], ask: 'to ask about classes or training',
    services: [['Personal Training', 'One-on-one sessions.'], ['Group Classes', 'Classes in a group setting.'], ['Open Gym', 'Access to the gym floor.'], ['Intro Session', 'A first visit to get started.']],
    aliases: ['fitness', 'gym', 'personal-trainer', 'personal-training', 'crossfit', 'yoga', 'pilates', 'studio'],
  },
  'pet-services': {
    label: 'pet care', theme: 'warm-local', defaults: { primary: '#0e7490', accent: '#f472b6' },
    features: ['call-bar', 'booking', 'map', 'faq'], ask: 'to ask about your pet',
    services: [['Grooming', 'Baths, trims, and nail care.'], ['Dog Walking', 'Walks while you are away.'], ['Pet Sitting', 'Visits and care at home.'], ['Training', 'Basic manners and obedience.']],
    aliases: ['pet-services', 'pet', 'pets', 'pet-grooming', 'grooming', 'groomer', 'dog-walking', 'pet-sitting', 'dog-training', 'boarding'],
  },
  'dental-medical': {
    label: 'dental & medical care', theme: 'clean-minimal', defaults: { primary: '#0369a1', accent: '#14b8a6' },
    features: ['call-bar', 'booking', 'map', 'faq'], ask: 'to request a visit', addressLabel: 'Location',
    services: [['Checkups', 'Routine visits and exams.'], ['Cleanings', 'Routine dental cleanings.'], ['New Patients', 'Getting started with a first visit.'], ['Other Services', 'Ask about anything not listed here.']],
    aliases: ['dental-medical', 'dental', 'dentist', 'dental-office', 'medical', 'clinic', 'doctor', 'chiropractor', 'physical-therapy', 'orthodontist'],
  },
  'real-estate': {
    label: 'real estate', theme: 'premium-dark', defaults: { primary: '#1e3a8a', accent: '#d4a017' },
    features: ['call-bar', 'quote-form', 'map', 'faq'], ask: 'to talk about buying or selling', servicesNote: 'Typical services shown for this mockup. The list can be matched to exactly what {name} offers.',
    services: [['Buying a Home', 'Help finding and buying a home.'], ['Selling a Home', 'Listing and selling your home.'], ['Home Value', 'Ask what your home might sell for.'], ['Relocation', 'Moving into or out of the area.']],
    aliases: ['real-estate', 'realtor', 'realty', 'real-estate-agent', 'realestate', 'broker', 'property-management'],
  },
  photography: {
    label: 'photography', theme: 'clean-minimal', defaults: { primary: '#18181b', accent: '#e11d48' },
    features: ['booking', 'faq'], ask: 'to check a date',
    services: [['Portraits', 'Individual and family portraits.'], ['Events', 'Parties, celebrations, and gatherings.'], ['Weddings', 'Wedding day photography.'], ['Headshots', 'Headshots for work and profiles.']],
    aliases: ['photography', 'photographer', 'photo', 'photos', 'wedding-photography', 'portrait-photography', 'videography'],
  },
};

// Existing folders that the requested category names map onto (no new copy needed).
export const REUSED = {
  landscaping: 'landscaping',
  cleaning: 'cleaning-service',
  'restaurant-foodtruck': 'restaurant',
};
export const EXTRA_ALIASES = { restaurant: ['restaurant-foodtruck', 'foodtruck', 'food-trucks'] };

/** Defaults for new category names that reuse an existing folder. Original trade names (landscaping,
 * cleaning, restaurant, ...) keep their exact old output unless --theme / --features are passed. */
export const REUSED_DEFAULTS = {
  'restaurant-foodtruck': { label: 'restaurant & food truck', theme: 'warm-local', features: ['call-bar', 'menu', 'map', 'faq'] },
};

export const FEATURES = ['call-bar', 'quote-form', 'reviews', 'map', 'before-after', 'hours', 'booking', 'menu', 'faq'];

// ---------------------------------------------------------------------------
// Themes (CSS variables + a few component overrides). Appended after the brand CSS.
// ---------------------------------------------------------------------------
const STRIPES = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M0 40L40 0H20L0 20zM40 40V20L20 40z' fill='%23ffffff' fill-opacity='.08'/%3E%3C/svg%3E\")";
const DOTS = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='3' cy='3' r='1.5' fill='%23ffffff' fill-opacity='.14'/%3E%3C/svg%3E\")";

export const THEMES = {
  'bold-industrial': { dark: false, css: `
:root { --radius: 4px; --font: 'Plus Jakarta Sans', 'Arial Black', system-ui, sans-serif; }
h1, h2, h3, .logo { text-transform: uppercase; letter-spacing: 0.02em; font-weight: 800; }
.site-header { background: #111827; border-top-width: 6px; }
.site-header .logo, .site-header .nav a:not(.nav-cta) { color: #f8fafc; }
.nav-toggle span { background: #f8fafc; }
@media (max-width: 800px) { .nav { background: #111827; } }
.hero::before { background: ${STRIPES} !important; opacity: 1 !important; }
.btn { border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
.card { border-left: 6px solid var(--brand-accent); box-shadow: none; border-radius: 4px; }
.section-head h2::after { width: 96px; height: 6px; border-radius: 0; }
` },
  'clean-minimal': { dark: false, lightHero: true, css: `
:root { --radius: 10px; --shadow: none; --bg: #ffffff; --font: 'Plus Jakarta Sans', 'Helvetica Neue', system-ui, sans-serif; }
.site-header { border-top: 0; border-bottom: 1px solid var(--border); }
.hero { color: var(--text) !important; background: linear-gradient(180deg, var(--hero-tint) 0%, #ffffff 100%) !important; }
.hero::before { display: none; }
.hero h1 { text-shadow: none !important; font-weight: 700; }
.hero-badge { color: var(--text) !important; }
.hero .btn-ghost, .hero .btn-pay { color: var(--text) !important; border-color: var(--border-strong) !important; }
.hero .zelle-pay { color: var(--text) !important; }
.card, .contact-card, .about-panel, .quote { box-shadow: none !important; border: 1px solid var(--border-strong); }
.section-head h2::after { width: 32px; height: 2px; }
section:nth-of-type(even) { background: #f8fafc; }
` },
  'warm-local': { dark: false, css: `
:root { --radius: 20px; --bg: #fdf8f1; --card: #fffdf9; --font: 'Plus Jakarta Sans', system-ui, sans-serif; }
h1, h2, h3, .logo { font-family: Georgia, 'Times New Roman', serif; font-weight: 700; letter-spacing: 0; }
.site-header { background: rgba(253, 248, 241, 0.95); }
.hero::before { background: ${DOTS} !important; opacity: 1 !important; }
.btn { border-radius: 999px; }
.card { border: 1px solid rgba(120, 72, 32, 0.12); }
.section-head h2::after { border-radius: 999px; }
` },
  'premium-dark': { dark: true, css: `
:root { --radius: 6px; --font: 'Plus Jakarta Sans', system-ui, sans-serif; }
h1, h2 { font-family: Georgia, 'Times New Roman', serif; font-weight: 500; letter-spacing: 0.01em; }
h3, .logo, .nav a { letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.92em; }
.logo { font-size: 1.05rem; }
.hero { background: linear-gradient(160deg, #05070d 0%, var(--hero-deep) 100%) !important; color: #f8fafc !important; }
.hero::before { display: none; }
.card { border: 1px solid rgba(255,255,255,0.08); box-shadow: none; }
.card-icon { background: transparent !important; border: 1px solid var(--brand-accent); color: var(--brand-accent) !important; }
.section-head h2::after { height: 1px; width: 80px; }
.btn { border-radius: 2px; letter-spacing: 0.06em; text-transform: uppercase; }
` },
};

export function themeCss(name, primary, accent, helpers) {
  const t = THEMES[name];
  if (!t) return '';
  const { mix, shade } = helpers;
  return `\n/* Theme: ${name} (tools/library.mjs) */\n:root { --hero-tint: ${mix(primary, '#ffffff', 0.9)}; --hero-deep: ${shade(primary, 0.45)}; --border-strong: rgba(15,23,42,0.14); }\n${t.css.trim()}\n`;
}

// ---------------------------------------------------------------------------
// Feature sections
// ---------------------------------------------------------------------------
export const FEATURE_CSS = `
/* Feature sections (tools/library.mjs) */
.ph-tile { display: grid; place-items: center; aspect-ratio: 4/3; border-radius: var(--radius, 12px); margin: 0; color: rgba(255,255,255,0.92); font-weight: 600; font-size: 0.95rem; text-align: center; padding: 1rem;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent)); }
.ph-tile span { background: rgba(0,0,0,0.28); padding: 0.35rem 0.75rem; border-radius: 999px; }
.feature-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); }
.ba-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 0; }
.ba-pair figure { margin: 0; position: relative; }
.ba-pair img { width: 100%; aspect-ratio: 4/3; object-fit: cover; border-radius: var(--radius, 12px); display: block; }
.ba-pair figcaption, .ba-label { position: absolute; left: 0.5rem; top: 0.5rem; background: rgba(0,0,0,0.65); color: #fff; font-size: 0.78rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px; }
.panel { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius, 12px); padding: 1.5rem; }
.panel h3 { margin-top: 0; }
.lib-form label { display: block; font-weight: 600; margin: 0.75rem 0 0.3rem; }
.lib-form input, .lib-form textarea, .lib-form select { width: 100%; box-sizing: border-box; padding: 0.7rem 0.8rem; border: 1px solid var(--border); border-radius: 8px; font: inherit; color: inherit; background: var(--bg); }
.lib-form textarea { min-height: 110px; }
.lib-form .btn { margin-top: 1rem; }
.lib-note { color: var(--muted); font-size: 0.92rem; }
.map-frame { width: 100%; height: 340px; border: 0; border-radius: var(--radius, 12px); display: block; }
.hours-text { font-size: 1.25rem; font-weight: 700; margin: 0; }
.faq details { border: 1px solid var(--border); border-radius: var(--radius, 12px); background: var(--card); padding: 1rem 1.25rem; margin-bottom: 0.75rem; }
.faq summary { font-weight: 700; cursor: pointer; }
.faq details p { margin: 0.75rem 0 0; }
.menu-section h3 { margin: 0 0 0.5rem; }
.menu-item { display: flex; justify-content: space-between; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px dashed var(--border); }
.menu-item p { margin: 0.15rem 0 0; color: var(--muted); font-size: 0.92rem; }
.menu-price { font-weight: 700; white-space: nowrap; }
.review-card { margin: 0; }
.call-bar { display: none; }
@media (max-width: 700px) {
  body.has-call-bar { padding-bottom: 72px; }
  .call-bar { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 9000; gap: 0.5rem; padding: 0.6rem 0.75rem calc(0.6rem + env(safe-area-inset-bottom)); background: rgba(15,23,42,0.96); }
  .call-bar a { flex: 1; text-align: center; padding: 0.8rem 0.5rem; border-radius: 10px; font-weight: 700; text-decoration: none; min-height: 44px; box-sizing: border-box; }
  .call-bar .cb-call { background: var(--brand-accent); color: var(--on-accent, #0f172a); }
  .call-bar .cb-alt { background: rgba(255,255,255,0.12); color: #fff; }
  body.has-call-bar [data-claim-bar] { bottom: 80px !important; }
}
`;

const section = (id, title, intro, inner) => `
    <section id="${id}" aria-labelledby="${id}-title">
      <div class="container">
        <div class="section-head">
          <h2 id="${id}-title">${title}</h2>${intro ? `\n          <p>${intro}</p>` : ''}
        </div>
        ${inner}
      </div>
    </section>
`;

/** A no-backend form: opens the visitor's email app when an email was supplied, otherwise says to call. */
function libForm(kind, fields, ctx, submit) {
  const mail = ctx.email ? ` data-mailto="${esc(ctx.email)}"` : '';
  return `<form class="lib-form" data-kind="${kind}"${mail} novalidate>
${fields.map(([id, label, type, extra = '']) => type === 'textarea'
    ? `          <label for="${kind}-${id}">${label}</label>\n          <textarea id="${kind}-${id}" name="${id}"${extra}></textarea>`
    : type === 'select'
      ? `          <label for="${kind}-${id}">${label}</label>\n          <select id="${kind}-${id}" name="${id}"><option value="">Choose one</option>${extra}<option>Other / not sure</option></select>`
      : `          <label for="${kind}-${id}">${label}</label>\n          <input id="${kind}-${id}" name="${id}" type="${type}"${extra}>`).join('\n')}
          <button class="btn btn-accent" type="submit">${submit}</button>
          <p class="lib-note" role="status" hidden></p>
        </form>`;
}

export const FORM_SCRIPT = `
  <script>
  /* Library forms: no backend. With an email on the page, open a pre-filled email; otherwise ask to call. */
  document.querySelectorAll('.lib-form').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var lines = [];
      f.querySelectorAll('input, textarea, select').forEach(function (el) {
        var l = f.querySelector('label[for="' + el.id + '"]');
        if (el.value) lines.push((l ? l.textContent : el.name) + ': ' + el.value);
      });
      var note = f.querySelector('.lib-note');
      var to = f.getAttribute('data-mailto');
      if (to) {
        location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(f.getAttribute('data-kind') === 'booking' ? 'Booking request' : 'Quote request') + '&body=' + encodeURIComponent(lines.join('\\n'));
        note.textContent = 'Your email app should open with these details filled in.';
      } else {
        note.textContent = note.getAttribute('data-call') || 'This mockup form does not send messages yet. Please call.';
      }
      note.hidden = false;
    });
  });
  </script>`;

/** Parse "lat,lon" */
export function parseCenter(raw) {
  const m = String(raw).trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) throw new Error('--map-center must be "lat,lon", e.g. "39.7294,-104.8319".');
  return [Number(m[1]), Number(m[2])];
}

/** Free OpenStreetMap geocoding (Nominatim). Used only when --map-center is not given. */
export async function geocode(q) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'client-site-templates mockup generator (static site builder)' }, signal: AbortSignal.timeout(10000) });
  const j = await res.json();
  if (!j[0]) throw new Error(`Map: could not find "${q}". Pass --map-center "lat,lon".`);
  return [Number(j[0].lat), Number(j[0].lon)];
}

/**
 * Build the HTML for each enabled feature. Returns { afterServices, beforeContact, bodyEnd, nav, heroCta, bodyClass }.
 * ctx: name/nameHtml/phoneDisplay/tel/email/areas/hours + feature data from flags.
 */
export function buildFeatures(features, cfg, ctx) {
  const on = (f) => features.includes(f);
  const phone = esc(ctx.phoneDisplay);
  const name = ctx.nameHtml;
  const callNote = `This mockup form does not send messages yet. Please call ${name} at ${phone}.`;
  const after = []; const before = []; const nav = [];
  let heroCta = null;
  const serviceOpts = cfg.services.map(([t]) => `<option>${esc(t)}</option>`).join('');

  if (on('menu')) {
    const menu = ctx.menu || (cfg.menu || [['Mains', 3], ['Sides', 2], ['Drinks', 2]]).map(([s, n]) => ({
      section: s, items: Array.from({ length: n }, (_, i) => ({ name: `Menu item ${i + 1}`, desc: 'Short description goes here.', price: '$—' })),
    }));
    const intro = ctx.menu ? '' : `Sample menu layout. ${name}'s real items and prices go here.`;
    after.push(section('menu', ctx.menu ? 'Menu' : 'Sample Menu', intro, `<div class="feature-grid">${menu.map((s) => `
          <div class="panel menu-section">
            <h3>${esc(s.section)}</h3>${(s.items || []).map((it) => `
            <div class="menu-item"><div><strong>${esc(it.name)}</strong>${it.desc ? `<p>${esc(it.desc)}</p>` : ''}</div>${it.price ? `<span class="menu-price">${esc(it.price)}</span>` : ''}</div>`).join('')}
          </div>`).join('')}
        </div>`));
    nav.push(['#menu', 'Menu']);
  }

  if (on('booking')) {
    const inner = ctx.bookingUrl
      ? `<div class="panel"><p>Pick a time online, or call ${phone}.</p><p><a class="btn btn-accent" href="${esc(ctx.bookingUrl)}" rel="noopener noreferrer">Book online</a></p></div>`
      : `<div class="feature-grid"><div class="panel">
        ${libForm('booking', [['name', 'Name', 'text', ' autocomplete="name"'], ['phone', 'Phone', 'tel', ' autocomplete="tel"'], ['service', 'Service', 'select', serviceOpts], ['when', 'Preferred day and time', 'text', ' placeholder="e.g. a weekday morning"']], ctx, 'Request a booking')}
        </div></div>`;
    after.push(section('booking', 'Book a Visit', `Send a booking request, or call ${phone}.`, inner));
    nav.push(['#booking', 'Book']);
    heroCta = ['#booking', 'Book a Visit'];
  }

  if (on('before-after')) {
    const pairs = ctx.baPairs && ctx.baPairs.length ? ctx.baPairs.map(([b, a], i) => `
          <div class="ba-pair">
            <figure><img src="${esc(b)}" alt="Before photo ${i + 1}" width="800" height="600"><figcaption>Before</figcaption></figure>
            <figure><img src="${esc(a)}" alt="After photo ${i + 1}" width="800" height="600"><figcaption>After</figcaption></figure>
          </div>`).join('')
      : [1, 2].map((i) => `
          <div class="ba-pair">
            <div class="ph-tile" style="filter:saturate(.35)" role="img" aria-label="Before photo placeholder ${i}"><span>Before</span></div>
            <div class="ph-tile" role="img" aria-label="After photo placeholder ${i}"><span>After</span></div>
          </div>`).join('');
    before.push(section('before-after', 'Before &amp; After', ctx.baPairs && ctx.baPairs.length ? '' : `Placeholders. ${name}'s own before and after photos go here.`, `<div class="feature-grid">${pairs}
        </div>`));
  }

  if (on('reviews') && ctx.reviews) {
    before.push(section('reviews', 'Reviews', '', `<div class="testimonials">${ctx.reviews.map((r) => `
        <blockquote class="quote review-card">
          <p>“${esc(r.text)}”</p>
          <footer>— ${esc(r.name)}${r.source ? `, ${esc(r.source)}` : ''}</footer>
        </blockquote>`).join('')}
        </div>`));
    nav.push(['#reviews', 'Reviews']);
  }

  if (on('quote-form')) {
    before.push(section('quote', 'Request a Quote', `Send a few details, or call ${phone}.`, `<div class="feature-grid"><div class="panel">
        ${libForm('quote', [['name', 'Name', 'text', ' autocomplete="name"'], ['phone', 'Phone', 'tel', ' autocomplete="tel"'], ['details', 'What do you need?', 'textarea']], ctx, 'Request a quote')}
        </div></div>`));
    heroCta = heroCta || ['#quote', 'Request a Quote'];
  }

  if (on('hours') && ctx.hours) {
    before.push(section('hours', 'Schedule', '', `<div class="panel"><p class="hours-text">${esc(ctx.hours)}</p></div>`));
  }

  if (on('map') && ctx.mapCenter) {
    const [lat, lon] = ctx.mapCenter;
    const d = 0.12;
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${(lon - d * 1.4).toFixed(4)}%2C${(lat - d).toFixed(4)}%2C${(lon + d * 1.4).toFixed(4)}%2C${(lat + d).toFixed(4)}&amp;layer=mapnik&amp;marker=${lat}%2C${lon}`;
    const area = esc(ctx.mapArea);
    before.push(section('map', 'Service Area', `Map centered on ${area}. Areas: ${ctx.areas.map(esc).join(', ')}.`, `<iframe class="map-frame" title="Map of ${area}" src="${src}" loading="lazy" referrerpolicy="no-referrer"></iframe>
        <p class="lib-note">Map data © <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors.</p>`));
  }

  if (on('faq')) {
    const faq = buildFaq(cfg, ctx);
    before.push(section('faq', 'Questions', '', `<div class="faq">${faq.map((f) => `
          <details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}
        </div>`));
    nav.push(['#faq', 'FAQ']);
  }

  const bodyEnd = (on('quote-form') || (on('booking') && !ctx.bookingUrl) ? FORM_SCRIPT.replace("note.getAttribute('data-call') || ", `${JSON.stringify(callNote.replace(/&amp;/g, '&'))} || `) : '')
    + (on('call-bar') ? `\n  <div class="call-bar" role="region" aria-label="Contact shortcuts">\n    <a class="cb-call" href="${ctx.tel}">Call ${phone}</a>\n    <a class="cb-alt" href="${heroCta ? heroCta[0] : '#contact'}">${heroCta ? heroCta[1] : 'Message'}</a>\n  </div>` : '');
  return { afterServices: after.join(''), beforeContact: before.join(''), bodyEnd, nav, heroCta, bodyClass: on('call-bar') ? 'has-call-bar' : '' };
}

/** FAQ built only from supplied facts (plus any --faq-file entries). */
export function buildFaq(cfg, ctx) {
  const out = [];
  const contact = `Call ${ctx.phoneDisplay}${ctx.email ? ` or email ${ctx.email}` : ''}.`;
  out.push({ q: 'What services do you offer?', a: `${cfg.services.map(([t]) => t).join(', ')}. ${contact.replace(/\.$/, '')} to ask about anything else.` });
  out.push({ q: 'Which areas do you serve?', a: `${ctx.areas.join(', ')}.` });
  out.push({ q: cfg.ask === 'to book a visit' || cfg.ask === 'to request a visit' ? 'How do I book?' : 'How do I get a quote?', a: contact });
  if (ctx.hours) out.push({ q: 'When are you open?', a: ctx.hours });
  return [...out, ...(ctx.faqExtra || [])];
}
