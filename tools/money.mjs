// "Money features" (spec v1 P1): one conversion section per trade, placed right after the hero.
// All are static (work on GitHub Pages). Submit: --money-endpoint (https form service, JSON POST),
// else a pre-filled email to --email, else "please call". --money-link adds a link-out button.
// No prices are shown or invented; no payments are taken.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** type -> { title, intro, submit, fields(cfg, ctx), static, note? }. Field: [id, label, kind, options?] */
const svc = (cfg) => cfg.services.map(([t]) => t);
export const MONEY = {
  'quote-form': { short: 'Get a quote', title: 'Request a Quote', submit: 'Request a quote', static: true,
    fields: () => [['name', 'Name', 'text'], ['phone', 'Phone', 'tel'], ['details', 'What do you need?', 'textarea']] },
  'emergency-request': { short: 'Get help', title: 'Need Help Now?', intro: (c) => `To reach ${c.nameHtml} right away, call <a href="${c.tel}">${esc(c.phoneDisplay)}</a>. Or send the details below.`, submit: 'Send request', static: true, photo: true,
    fields: (cfg) => [['name', 'Name', 'text'], ['phone', 'Phone', 'tel'], ['problem', 'What is going on?', 'select', svc(cfg)], ['urgency', 'How soon?', 'radio', ['As soon as possible', 'This week', 'Flexible']], ['details', 'Details', 'textarea']] },
  'inspection-request': { short: 'Inspection', title: 'Request a Roof Inspection', submit: 'Request inspection', static: true, photo: true,
    fields: () => [['name', 'Name', 'text'], ['phone', 'Phone', 'tel'], ['address', 'Property address', 'text'], ['roof', 'Roof type', 'select', ['Asphalt shingle', 'Metal', 'Tile', 'Flat / low slope', 'Not sure']], ['issue', 'What prompted this?', 'radio', ['Leak', 'Storm damage', 'Age / wear', 'Buying or selling', 'Other']]] },
  'instant-quote': { short: 'Get a quote', title: 'Get a Quote', intro: (c) => `Answer a few questions and ${c.nameHtml} follows up with a quote. No price is shown here.`, submit: 'Request my quote', static: true,
    fields: (cfg, ctx) => quoteFields(ctx.tradeKey, cfg) },
  'job-list': { short: 'Job list', title: 'Your Job List', intro: () => 'Tick everything on your list and send it in one go.', submit: 'Send my list', static: true, photo: true,
    fields: (cfg) => [['jobs', 'Jobs', 'checks', [...svc(cfg), 'Something else']], ['when', 'Preferred day', 'date'], ['name', 'Name', 'text'], ['phone', 'Phone', 'tel'], ['details', 'Details', 'textarea']] },
  'service-request': { short: 'Service', title: 'Request Service', submit: 'Request service', static: true,
    fields: (cfg) => [['vehicle', 'Year, make and model', 'text'], ['mileage', 'Mileage', 'text'], ['services', 'Services', 'checks', [...svc(cfg), 'Not sure']], ['dropoff', 'Preferred drop-off date', 'date'], ['name', 'Name', 'text'], ['phone', 'Phone', 'tel']] },
  'package-picker': { short: 'Packages', title: 'Choose a Package', intro: (c) => `Pick what fits and ${c.nameHtml} confirms the details and price with you.`, submit: 'Request this package', static: true, cards: true,
    fields: (cfg, ctx) => [['package', 'Package', 'radio', svc(cfg)], ...(ctx.tradeKey && /detail/.test(ctx.tradeKey) ? [['size', 'Vehicle size', 'select', ['Car', 'SUV / crossover', 'Truck / van']]] : [['date', 'Date you have in mind', 'date']]), ['name', 'Name', 'text'], ['phone', 'Phone', 'tel'], ['notes', 'Notes', 'textarea']] },
  'class-schedule': { short: 'Try a class', title: 'Try a Class', submit: 'Request a spot', static: true, schedule: true,
    fields: (cfg, ctx) => [['class', 'Class', 'select', ctx.schedule ? ctx.schedule.map((s) => `${s.class} · ${s.day} ${s.time}`) : svc(cfg)], ['name', 'Name', 'text'], ['phone', 'Phone', 'tel']] },
  'grooming-booking': { short: 'Book', title: 'Book a Groom', submit: 'Request a booking', static: true,
    fields: (cfg) => [['pet', 'Pet name', 'text'], ['breed', 'Breed and size', 'text'], ['service', 'Service', 'select', svc(cfg)], ['date', 'Preferred date', 'date'], ['vacc', 'My pet is up to date on vaccinations', 'checkbox'], ['name', 'Your name', 'text'], ['phone', 'Phone', 'tel']] },
  'appointment-request': { short: 'Request visit', title: 'Request a Visit', intro: () => 'Please do not include medical details in this form.', submit: 'Request a visit', static: true,
    fields: (cfg) => [['patient', 'Patient', 'radio', ['New patient', 'Current patient']], ['visit', 'Visit type', 'select', svc(cfg)], ['when', 'Preferred days and times', 'text'], ['name', 'Name', 'text'], ['phone', 'Phone', 'tel']] },
  'listing-search': { short: 'Listings', title: 'Listings', submit: 'Send request', static: true, listings: true,
    fields: () => [['want', 'I want to', 'radio', ['Request a showing', 'Ask what my home might sell for']], ['address', 'Address or listing', 'text'], ['name', 'Name', 'text'], ['phone', 'Phone', 'tel']] },
  // Existing sections reused as money features (built in library.mjs, moved after the hero):
  booking: { reuse: 'booking', static: true },
  'pickup-order': { reuse: 'pickup-order', static: true },
};

/** Trade-specific inputs for instant-quote (details only, no numbers). */
function quoteFields(key, cfg) {
  const base = [['name', 'Name', 'text'], ['phone', 'Phone', 'tel']];
  if (/clean/.test(key)) return [['beds', 'Bedrooms', 'select', ['1', '2', '3', '4', '5 or more']], ['baths', 'Bathrooms', 'select', ['1', '2', '3', '4 or more']], ['size', 'Home size', 'select', ['Under 1,000 sq ft', '1,000–2,000 sq ft', '2,000–3,000 sq ft', 'Over 3,000 sq ft']], ['freq', 'How often?', 'radio', ['One time', 'Weekly', 'Every 2 weeks', 'Once a month']], ['extras', 'Add-ons', 'checks', ['Inside fridge', 'Inside oven', 'Windows', 'Laundry']], ...base];
  if (/pressure|wash/.test(key)) return [['surfaces', 'Surfaces', 'checks', ['House siding', 'Driveway', 'Deck or patio', 'Fence', 'Roof', 'Other']], ['size', 'Approximate size', 'select', ['Small', 'Medium', 'Large', 'Not sure']], ...base];
  if (/lawn|landscap|yard/.test(key)) return [['work', 'Work needed', 'checks', svc(cfg)], ['yard', 'Yard size', 'select', ['Small', 'Medium', 'Large', 'Not sure']], ['freq', 'How often?', 'radio', ['One time', 'Weekly', 'Every 2 weeks', 'Seasonal']], ...base];
  if (/paint/.test(key)) return [['where', 'Interior or exterior', 'radio', ['Interior', 'Exterior', 'Both']], ['rooms', 'Rooms or areas', 'select', ['1', '2–3', '4–6', '7 or more', 'Whole house']], ['extras', 'Also needed', 'checks', ['Ceilings', 'Trim', 'Cabinets', 'Drywall repair']], ...base];
  return [['work', 'Work needed', 'checks', svc(cfg)], ['details', 'Details', 'textarea'], ...base];
}

/** Which money feature each category gets by default (only for library categories / new names). */
export const MONEY_DEFAULTS = {
  roofing: 'inspection-request', hvac: 'emergency-request', electrician: 'emergency-request', plumbing: 'emergency-request',
  cleaning: 'instant-quote', 'pressure-washing': 'instant-quote', landscaping: 'instant-quote', painting: 'instant-quote',
  handyman: 'job-list', 'auto-repair': 'service-request', 'auto-detailing': 'package-picker', photography: 'package-picker',
  fitness: 'class-schedule', 'pet-services': 'grooming-booking', 'dental-medical': 'appointment-request', 'real-estate': 'listing-search',
  'salon-barber': 'booking', tattoo: 'booking', daycare: 'booking', 'restaurant-foodtruck': 'pickup-order', 'restaurant-ordering': 'pickup-order',
  concrete: 'instant-quote', fencing: 'instant-quote', 'pest-control': 'quote-form', moving: 'quote-form', 'tree-service': 'quote-form',
  'law-accounting': 'quote-form', church: null,
};

function field([id, label, kind, opts], i) {
  const fid = `m-${id}`;
  const req = ['name', 'phone'].includes(id) ? ' required' : '';
  const auto = id === 'name' ? ' autocomplete="name"' : id === 'phone' ? ' autocomplete="tel"' : '';
  if (kind === 'textarea') return `<label for="${fid}">${label}</label><textarea id="${fid}" name="${id}" rows="3"></textarea>`;
  if (kind === 'select') return `<label for="${fid}">${label}</label><select id="${fid}" name="${id}"><option value="">Choose one</option>${opts.map((o) => `<option>${esc(o)}</option>`).join('')}</select>`;
  if (kind === 'radio' || kind === 'checks') {
    const t = kind === 'radio' ? 'radio' : 'checkbox';
    return `<fieldset class="m-group"><legend>${label}</legend>${opts.map((o, j) => `<label class="m-choice" for="${fid}-${j}"><input type="${t}" id="${fid}-${j}" name="${id}" value="${esc(o)}"> ${esc(o)}</label>`).join('')}</fieldset>`;
  }
  if (kind === 'checkbox') return `<label class="m-choice" for="${fid}"><input type="checkbox" id="${fid}" name="${id}" value="yes"> ${label}</label>`;
  return `<label for="${fid}">${label}</label><input id="${fid}" name="${id}" type="${kind}"${auto}${req}>`;
}

export function buildMoney(type, cfg, ctx) {
  const m = MONEY[type];
  const name = ctx.nameHtml;
  const phone = esc(ctx.phoneDisplay);
  const attrs = [ctx.moneyEndpoint && `data-endpoint="${esc(ctx.moneyEndpoint)}"`, ctx.email && `data-mailto="${esc(ctx.email)}"`].filter(Boolean).join(' ');
  let extra = '';
  if (m.schedule && ctx.schedule) {
    extra = `<div class="m-schedule" role="table" aria-label="Class schedule">${ctx.schedule.map((s) => `<div class="m-slot panel" role="row"><strong role="cell">${esc(s.class)}</strong><span role="cell">${esc(s.day)} ${esc(s.time)}</span></div>`).join('')}</div>`;
  }
  if (m.listings && ctx.listings) {
    const areas = [...new Set(ctx.listings.map((l) => l.area).filter(Boolean))];
    extra = `<div class="m-filters"><label for="m-f-area">Area</label><select id="m-f-area" data-filter="area"><option value="">All areas</option>${areas.map((a) => `<option>${esc(a)}</option>`).join('')}</select>
          <label for="m-f-beds">Bedrooms</label><select id="m-f-beds" data-filter="beds"><option value="">Any</option><option value="2">2 or more</option><option value="3">3 or more</option><option value="4">4 or more</option></select></div>
        <div class="feature-grid m-listings">${ctx.listings.map((l) => `<div class="panel m-listing" data-area="${esc(l.area || '')}" data-beds="${Number(l.beds) || 0}"><h3>${esc(l.title)}</h3>${l.price ? `<p class="price">${esc(l.price)}</p>` : ''}<p>${[l.beds && `${esc(l.beds)} bd`, l.baths && `${esc(l.baths)} ba`, l.area && esc(l.area)].filter(Boolean).join(' · ')}</p><p class="lib-note">${esc(ctx.brokerage)}</p>${l.url ? `<a href="${esc(l.url)}" rel="noopener noreferrer">Details</a>` : ''}</div>`).join('')}
        </div>`;
  }
  if (m.cards) {
    extra = `<div class="feature-grid">${cfg.services.map(([t, d]) => `<div class="panel"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div>`;
  }
  const photo = m.photo ? (ctx.textOk
    ? `<p class="lib-note">Photos help. <a href="sms:${ctx.tel.replace('tel:', '')}?&amp;body=${encodeURIComponent(`Photo for ${ctx.name}`)}">Text a photo to ${phone}</a>.</p>`
    : '<p class="lib-note">Have photos? Mention it in your message.</p>') : '';
  const link = ctx.moneyLink ? `<p><a class="btn btn-accent" href="${esc(ctx.moneyLink)}" rel="noopener noreferrer">Continue on ${name}'s booking or ordering page</a></p>` : '';
  const intro = m.intro ? m.intro(ctx) : `Send the details, or call <a href="${ctx.tel}">${phone}</a>.`;
  return `
    <section id="money" class="money" aria-labelledby="money-title">
      <div class="container">
        <div class="section-head">
          <h2 id="money-title">${m.title}</h2>
          <p>${intro}</p>
        </div>
        ${extra}${link}
        <div class="panel money-panel">
        <form class="lib-form money-form" data-kind="${type}" ${attrs} novalidate>
          ${m.fields(cfg, ctx).map(field).join('\n          ')}
          <button class="btn btn-primary m-submit" type="submit">${m.submit}</button>
          <p class="lib-note m-status" role="status" aria-live="polite" hidden></p>
        </form>${photo}
        </div>
      </div>
    </section>
`;
}

export const MONEY_CSS = `
/* Money features + trust row + ZIP check (tools/money.mjs) */
.money { background: var(--card); }
.money-panel { max-width: 720px; margin: 1.25rem auto 0; }
.m-group { border: 1px solid var(--border); border-radius: 10px; margin: 0.75rem 0 0; padding: 0.5rem 0.9rem 0.75rem; }
.m-group legend { font-weight: 600; padding: 0 0.3rem; }
.m-choice { display: inline-flex !important; align-items: center; gap: 0.4rem; min-height: 44px; margin: 0 1rem 0 0 !important; font-weight: 500 !important; }
.m-choice input { width: auto !important; }
.m-schedule { display: grid; gap: 0.6rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); }
.m-slot { display: flex; justify-content: space-between; gap: 0.5rem; padding: 0.9rem 1rem; }
.m-filters { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; align-items: center; margin-bottom: 1rem; }
.m-filters select { padding: 0.5rem; border-radius: 8px; }
.trust-row { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; margin: 1.1rem 0 0; padding: 0; list-style: none; font-weight: 600; font-size: 0.95rem; }
.trust-row li::before { content: "✓ "; }
.zip-check { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: end; }
.zip-check input { padding: 0.7rem; border: 1px solid var(--border); border-radius: 8px; font: inherit; min-width: 0; flex: 1 1 180px; }
.zip-result { font-weight: 700; min-height: 1.5em; }
@media (max-width: 700px) {
  .call-bar a { min-height: 48px; display: flex; align-items: center; justify-content: center; }
  body.has-order-bar [data-claim-bar] { display: none !important; }
}
`;

export const MONEY_SCRIPT = `
  <script>
  /* Money form + ZIP check + listing filters. No backend; nothing is charged. */
  (function () {
    document.querySelectorAll('.money-form').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var st = f.querySelector('.m-status'); st.hidden = false;
        var nm = f.querySelector('[name=name]'), ph = f.querySelector('[name=phone]');
        if ((nm && !nm.value.trim()) || (ph && !ph.value.trim())) { st.textContent = 'Please add your name and phone.'; return; }
        var data = {}, lines = [];
        new FormData(f).forEach(function (v, k) { if (!v) return; data[k] = data[k] ? data[k] + ', ' + v : v; });
        Object.keys(data).forEach(function (k) { var el = f.querySelector('[name="' + k + '"]'); var lab = el && (el.closest('fieldset') ? el.closest('fieldset').querySelector('legend') : f.querySelector('label[for="' + el.id + '"]')); lines.push((lab ? lab.textContent.trim() : k) + ': ' + data[k]); });
        var ep = f.getAttribute('data-endpoint'), to = f.getAttribute('data-mailto');
        if (ep) {
          st.textContent = 'Sending…';
          fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.assign({ _subject: f.getAttribute('data-kind') }, data)) })
            .then(function (r) { if (!r.ok) throw 0; st.textContent = 'Sent. Thank you.'; f.reset(); })
            .catch(function () { st.textContent = __CALL__; });
        } else if (to) {
          location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(f.getAttribute('data-kind')) + '&body=' + encodeURIComponent(lines.join('\\n'));
          st.textContent = 'Your email app should open with these details filled in.';
        } else { st.textContent = __CALL__; }
      });
    });
    var zf = document.querySelector('.zip-check');
    if (zf) zf.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = zf.querySelector('input').value.trim().toLowerCase(), out = document.querySelector('.zip-result');
      var list = JSON.parse(zf.getAttribute('data-areas'));
      if (!v) { out.textContent = 'Enter a ZIP code or town.'; return; }
      var hit = list.filter(function (a) { return a.toLowerCase() === v || (v.length > 2 && isNaN(v) && a.toLowerCase().indexOf(v) === 0); })[0];
      out.textContent = hit ? 'Yes, ' + hit + ' is in the service area.' : v + ' is not on the list. Call to ask.';
    });
    var sels = document.querySelectorAll('[data-filter]');
    sels.forEach(function (s) { s.addEventListener('change', function () {
      var area = document.querySelector('[data-filter=area]').value, beds = +document.querySelector('[data-filter=beds]').value || 0;
      document.querySelectorAll('.m-listing').forEach(function (c) { c.hidden = (area && c.getAttribute('data-area') !== area) || +c.getAttribute('data-beds') < beds; });
    }); });
  })();
  </script>`;

export function buildZip(ctx) {
  const list = [...ctx.zips, ...ctx.areas];
  return `
    <section id="zip" aria-labelledby="zip-title">
      <div class="container">
        <div class="section-head"><h2 id="zip-title">Do You Serve My Area?</h2><p>Type your ZIP code or town.</p></div>
        <div class="panel" style="max-width:640px;margin:0 auto">
          <form class="zip-check" data-areas="${esc(JSON.stringify(list))}" novalidate>
            <div style="flex:1 1 180px"><label for="zip-in">ZIP code or town</label><input id="zip-in" inputmode="text" autocomplete="postal-code"></div>
            <button class="btn btn-accent" type="submit">Check</button>
          </form>
          <p class="zip-result" role="status" aria-live="polite"></p>
          <p class="lib-note">Listed: ${list.map(esc).join(', ')}.</p>
        </div>
      </div>
    </section>
`;
}

/** Trust row: only facts passed on the command line. */
export function trustItems(ctx) {
  const out = [];
  const rated = (ctx.reviews || []).filter((r) => Number(r.rating) > 0);
  if (rated.length) out.push(`${(rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length).toFixed(1)} average rating from ${rated.length} review${rated.length > 1 ? 's' : ''}`);
  if (ctx.licensed) out.push('Licensed &amp; insured');
  if (ctx.licenseNo) out.push(`License ${esc(ctx.licenseNo)}`);
  if (ctx.insured && !ctx.licensed) out.push('Insured');
  if (ctx.years) out.push(`${ctx.years} years in business`);
  for (const c of ctx.certs || []) out.push(esc(c));
  return out;
}
