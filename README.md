# Client Site Templates

Polished, mostly-complete **HTML/CSS/JS one-pager templates** for small US businesses. Each folder is a self-contained static site — no build step. Open `index.html` locally or deploy the folder as a static site.

Built for quick customization and shipping on sold one-pager jobs.

## Product ladder

A prospect starts with a static one-pager and can step up. These are the only two steps. **Pricing is not set** — this repo and Big Foot (`trae77/bigfootConstruction`) do not list a dollar price for either tier, so none is shown here.

1. **One-pager** — the static templates and the mockup generator (`npm run mockup`). Public homepage, no login. This is what GitHub Pages serves.
2. **Owner login + estimates** — the optional Node addon in [`upgrade/`](./upgrade/). The one-pager stays the public homepage. A logged-in owner can create, list, and update estimates. This needs a Node host. **GitHub Pages is static and will not run the Express addon.** Do not turn the Pages site into a login wall.

## Owner login and estimates

The addon is reusable for any template or generated mockup. It does not rewrite the HTML into a framework. Express serves the folder you pass with `--site`, plus `/owner/login` and `/owner/estimates`.

Modeled on the private Big Foot app (`server/server.cjs`, `server/init.cjs`):

- SQLite file (`upgrade/data.db`, gitignored), created on startup.
- Owner password stored as a bcrypt hash (bcryptjs, cost 10 — same as Big Foot client signup). Demo login comes from env, with local defaults below. Big Foot's owner check compares the env password in memory and returns a bearer token; this addon uses an HttpOnly `owner_session` cookie backed by a `sessions` table (the cookie form of Big Foot's `tokens` table) so the estimates page works in a browser.
- Estimate fields follow Big Foot's `estimates` row where it already fits: `amount` (total), `details`, `phone`, `title`, and status `requested | reviewed | quoted | approved | scheduled | won | lost`. `customer_name` stands in for Big Foot's `clients.name`. Optional `line_items` are stored as JSON. No Stripe, projects board, or client portal.

### Turn it on

From the repo root, for any template or mockup folder that contains `index.html`:

```bash
npm install
npm run upgrade:init
npm run upgrade -- --site plumbing
# or a generated mockup / prospect folder:
npm run upgrade -- --site prospects/rj-plumbing
```

Open `http://127.0.0.1:4317/` for the public one-pager and `http://127.0.0.1:4317/owner/login` for the owner. The static files in the folder are unchanged, so the GitHub Pages copy of a prospect site stays a normal homepage.

Local demo login when `OWNER_EMAIL` and `OWNER_PASSWORD` are unset (or copied from the example):

- Email: `demo@example.com`
- Password: `demo-password`

Copy [`upgrade/.env.example`](./upgrade/.env.example) to `upgrade/.env` to override them. `NODE_ENV=production` refuses the demo password. Delete `upgrade/data.db` and start again if you change the owner email or password after the first seed. Never commit `.env` or `data.db`.

With the server already running, `npm run upgrade:smoke` checks health, that estimates reject a logged-out caller, login, create, update, list, and that `/` is still the static HTML.

## Templates

| Folder | Niche | Example business name |
|--------|--------|------------------------|
| [`pressure-washing/`](./pressure-washing/) | Exterior cleaning / soft wash | Summit Pressure Pros |
| [`landscaping/`](./landscaping/) | Lawn care / landscaping | Greenhaven Lawn & Landscape |
| [`plumbing/`](./plumbing/) | Plumber / trades | Ridge Line Plumbing |
| [`cleaning-service/`](./cleaning-service/) | Residential + commercial cleaning | BrightNest Cleaning Co. |
| [`restaurant/`](./restaurant/) | Pizza / local restaurant | Nonna's Wood-Fired Pizza |
| [`auto-detailing/`](./auto-detailing/) | Auto detailing shop | MirrorFinish Auto Detail |
| [`handyman/`](./handyman/) | Handyman / home improvement | SteadyHands Home Repair |
| [`generic-business/`](./generic-business/) | Fallback small-business one-pager | Northstar Local Co. |

Every template includes:

- Sticky header + mobile hamburger nav
- Hero with primary CTA + click-to-call
- Services cards, about / service areas, gallery, 3 testimonials
- Contact block with `tel:` / `mailto:` links and a front-end form (success message via JS)
- Footer with hours, phone, and placeholder address
- Distinct color palette and hero treatment per niche

## Template library: categories, themes, features

`tools/library.mjs` adds categories, style themes and opt-in sections to `npm run mockup`. Research notes: [`docs/RESEARCH.md`](./docs/RESEARCH.md). Image licenses: [`CREDITS.md`](./CREDITS.md).

**Backward compatible.** The original trades (`pressure-washing`, `landscaping`, `plumbing`, `cleaning`, `restaurant`, `auto-detailing`, `handyman`, generic) build byte-for-byte the same HTML as before unless you pass `--theme` or `--features`. One alias moved: `--trade painting` / `painter` now uses the new `painting` category instead of `handyman`. Existing `prospects/` pages are static and were not rebuilt.

### Categories (`--trade`)

| Category | Default theme | Default features | Notes |
|---|---|---|---|
| `roofing` | bold-industrial | call-bar, quote-form, before-after, map, faq | aliases: roofer, gutters, metal-roofing |
| `hvac` | clean-minimal | call-bar, quote-form, map, faq | heating, cooling, furnace, ac-repair |
| `electrician` | bold-industrial | call-bar, quote-form, map, faq | electrical, electric |
| `landscaping` | (original template) | none | reuses `landscaping/` |
| `painting` | warm-local | call-bar, quote-form, before-after, faq | painter, house-painting |
| `cleaning` | (original template) | none | reuses `cleaning-service/` |
| `auto-repair` | bold-industrial | call-bar, quote-form, map, faq | mechanic, car-repair, auto-shop |
| `salon-barber` | premium-dark | call-bar, booking, map, faq | salon, barber, spa, nail-salon |
| `restaurant-foodtruck` | warm-local | call-bar, menu, map, faq | reuses `restaurant/`; also food-truck, foodtruck |
| `fitness` | bold-industrial | call-bar, booking, map, faq | gym, yoga, personal-training |
| `pet-services` | warm-local | call-bar, booking, map, faq | grooming, dog-walking, pet-sitting |
| `dental-medical` | clean-minimal | call-bar, booking, map, faq | dentist, clinic, chiropractor |
| `real-estate` | premium-dark | call-bar, quote-form, map, faq | realtor, realty, broker |
| `photography` | clean-minimal | booking, faq | photographer, videography |

New categories build on the `generic-business/` HTML with their own services list and CSS placeholder photos (no stock images). `map` in the defaults is skipped unless `--map-center` or `--map-area` is passed (no network call by default); `hours` is skipped unless `--hours` is passed.

### Themes (`--theme`)

`bold-industrial`, `clean-minimal`, `warm-local`, `premium-dark`, or `none`. Works on any category, including the original ones. Themes are CSS variable overrides appended to `styles.css`; `--primary` / `--accent` still set the brand colors.

### Features (`--features a,b,c` or `--features none`)

Passing `--features` replaces the category defaults.

| Feature | What it adds | Data / rules |
|---|---|---|
| `call-bar` | Sticky bottom bar on phones (≤700px): Call + the main CTA. Lifts the $200 claim bar above it. | phone from `--phone` |
| `quote-form` | 3-field quote form (name, phone, what you need). No backend: opens the visitor's email app if `--email` is set, otherwise says to call. Hero button becomes "Request a Quote". | |
| `reviews` | Reviews section with real reviews | `--reviews-file reviews.json` = `[{"name","text","source"?}]`. Without it, use `--sample-reviews` (labeled samples). Never invented. |
| `map` | Service-area map (OpenStreetMap iframe, attribution shown) | `--map-center "lat,lon"` (no network) or `--map-area "Aurora, CO"` (geocoded once at build). Default area = `--city`. |
| `before-after` | Before/after pairs | `--before-after "b1.jpg:a1.jpg,b2.jpg:a2.jpg"` copies client photos into `img/`; otherwise labeled placeholders. |
| `hours` | Schedule section | only with `--hours "TEXT"` (error otherwise) |
| `booking` | Booking request form (name, phone, service, preferred time) or a "Book online" button | `--booking-url https://…` links out (not a payment link). |
| `menu` | Menu section | `--menu-file menu.json` = `[{"section","items":[{"name","desc"?,"price"?}]}]`; otherwise a labeled "Sample Menu" layout with `$—` prices. |
| `faq` | Questions built only from supplied facts (services, areas, how to reach you, hours if given) | extra Q&A via `--faq-file faq.json` = `[{"q","a"}]`. With `--chat`, the same FAQ goes into `chat-facts.json`. |

Data flags (`--reviews-file`, `--map-center`, `--map-area`, `--before-after`, `--menu-file`, `--booking-url`, `--faq-file`) switch their feature on automatically. All supplied text is treated like other passed values in the claim check; everything else must still pass it. The $200 claim bar, `--chat`, `--pay-url` and Zelle flags work unchanged. No hosting language is added.

### Batch 2: more categories, themes and features

**Categories:** `concrete`, `fencing`, `pest-control`, `moving`, `tree-service`, `tattoo`, `daycare`, `law-accounting`, `church` (new, built on `generic-business/`), plus `restaurant-ordering` (reuses `restaurant/` with `pickup-order` on by default). `plumbing`, `handyman` and `pressure-washing` keep their original templates and exact default output; pass `--theme` / `--features` for the new look (see their samples). Alias move: `--trade tree-service` now builds the `tree-service` category instead of `landscaping`.

| Category | Default theme | Default features |
|---|---|---|
| `concrete` | bold-industrial | call-bar, quote-form, process, before-after, map, faq |
| `fencing` | earthy-organic | call-bar, quote-form, process, before-after, map, faq |
| `pest-control` | modern-bold-color | call-bar, quote-form, process, map, faq |
| `moving` | coastal-fresh | call-bar, quote-form, process, map, faq |
| `tree-service` | earthy-organic | call-bar, quote-form, before-after, map, faq |
| `tattoo` | premium-dark | call-bar, booking, map, faq |
| `daycare` | coastal-fresh | call-bar, booking, process, map, faq |
| `law-accounting` | clean-minimal | quote-form, process, faq |
| `church` | warm-local | map, faq (service times only via `--hours`) |
| `restaurant-ordering` | modern-bold-color | call-bar, pickup-order, map, faq |

**Themes:** `coastal-fresh` (sea blue/teal, wave pattern), `earthy-organic` (sand/olive, serif, leaf pattern), `modern-bold-color` (white, big type, hard-shadow cards). Body text on the theme backgrounds checks at 12.8:1 or higher, and muted text at 6.5:1 or higher (WCAG AA).

**Features** (all opt-in; every one that shows text needs data you pass, and that text is shown verbatim):

| Feature | Flag | Notes |
|---|---|---|
| `emergency` | `--emergency "TEXT"` | Red banner above the hero with a call link. Only the business's own wording; 24/7 is never added. |
| `badges` | `--badges "A,B,C"` | Trust strip under the hero (license numbers, memberships the business gave you). |
| `process` | `--steps-file steps.json` (optional) | "How It Works" steps `[{title,text?}]`; without a file, generic steps labeled as typical. |
| `checklist` | `--checklist "A,B,C"` | "What's Included" list. |
| `pricing` | `--pricing-file pricing.json` | `[{name,price?,details?:[]}]`. No prices are ever invented. |
| `team` | `--team-file team.json` | `[{name,role?,bio?,photo?}]`; `photo` is a local file (relative to the JSON) copied into `img/`. |
| `pickup-order` | `--menu-file`, `--email` / `--order-endpoint` / `--order-url` | See below. |

#### Pickup ordering (`pickup-order`)

A static, client-side order flow (`widgets/order/order.js` + `order.css`, copied into `<out>/order/`). It works on GitHub Pages with no backend and takes **no payments**. The page says "Pay at pickup. No payment is taken on this page."

- Menu from `--menu-file` (required). Items can carry options: `"options": [{ "name": "Size", "required": true, "multi": false, "choices": [{ "label": "Large", "price": "+$2.00" }] }]`. A file shaped `{ "sample": true, "menu": [...] }` labels the section "Sample Menu". See `tools/sample-data/menu-sample.json`.
- Cart with + / − per line, saved in `localStorage` (per site), plus a sticky "View order" bar on phones.
- Pickup date and time pickers (15-minute steps, no past times), name, phone and notes, then an order summary with the estimated total.
- Sending: `--order-endpoint https://formspree.io/f/…` (JSON POST to a free form service, https only), otherwise a pre-filled email to `--email`, otherwise "please call". `--order-url https://…` adds a link-out button to Square, Toast and similar. Stripe and other payment links are rejected.
- Accessibility: options appear in a native `<dialog>` (Escape closes it) with fieldset/legend, buttons have labels, there is an aria-live status, and tap targets are 44px.

Sample data for demos lives in `tools/sample-data/` (`menu-sample.json`, `pricing-sample.json`, `team-sample.json`). Everything in it is labeled as a placeholder.

### Samples

One per category in [`samples/<category>/`](./samples/), regenerated with `bash tools/build-samples.sh`. Live (after push): `https://trae77.github.io/client-site-templates/samples/<category>/`.

```bash
npm run mockup -- --name "Acme Roofing" --trade roofing --city "Aurora, CO" --phone 7205550100 \
  --theme bold-industrial --map-center "39.7294,-104.8319" --out samples/roofing --no-png
npm run mockup -- --name "Fade Room" --trade salon-barber --city "Denver, CO" --phone 7205550100 \
  --features call-bar,booking,faq --booking-url https://calendly.com/example
```

## Browse locally

```bash
git clone https://github.com/trae77/client-site-templates.git
cd client-site-templates

# Option A — open a template file directly
open pressure-washing/index.html   # macOS
# xdg-open pressure-washing/index.html  # Linux

# Option B — simple static server (recommended)
python3 -m http.server 8080
# then visit http://localhost:8080/
```

The root [`index.html`](./index.html) links to every template for easy browsing (works well on GitHub Pages).

## How to swap branding

1. **Name & copy** — Search/replace the example company name (e.g. `Summit Pressure Pros`) in `index.html`. HTML comments mark customize spots.
2. **Phone & email** — Update visible text and `tel:` / `mailto:` hrefs.
3. **Address & hours** — Footer and contact card.
4. **Colors** — Edit CSS variables at the top of `styles.css` (`--accent`, `--accent-dark`, `--bg`, etc.).
5. **Images** — Replace Unsplash/Picsum URLs in the hero and gallery with client photos (keep similar aspect ratios).
6. **Services / testimonials** — Edit card titles, blurbs, and review quotes to match the real business.
7. **Form** — Front-end only by default (`preventDefault` + success message). Wire to Formspree, Netlify Forms, or your backend when ready.

## Quick mockups

Generate a personalized homepage mockup (HTML folder + full-page PNG) for a prospect in one command. Handy for "free homepage mockup" outreach.

**Facts only by default.** The generated page states only what you pass on the command line: business name, trade, city, phone, and email (if you pass one). The template's marketing copy is replaced with neutral wording. By default the page has no "licensed and insured", no years in business, no business hours, no reviews or star ratings, no 24/7 / emergency / same-day promises, no free-estimate offers, and no street address. Each real fact can be added with its own flag (see **Opt-in facts** below). **The default output is safe to send to a real prospect:** it makes no claim about their business that they didn't give you.

### Prerequisites (one time)

- Node.js 18+
- From the repo root:

```bash
npm install
npx playwright install chromium
```

If Playwright's Chromium can't be installed, the script falls back to a system Chrome/Chromium (set `CHROME_PATH` if it's somewhere unusual).

### Command

```bash
npm run mockup -- --name "Acme Pressure Washing" --trade pressure-washing --city "Aurora, CO" --phone "(303) 555-0142" --primary "#0b5394" --accent "#f1c232" --mobile
```

| Flag | Required | What it does |
|------|----------|--------------|
| `--name` | yes | Business name, exactly as it should appear (header, hero, about, footer, image alts, `<title>`, meta). |
| `--trade` | yes | Picks the template (aliases below). Unknown trades fall back to `generic-business`. |
| `--city` | yes | City, optionally with state (`"Thornton, CO"`). Used in the headline, hero badge/lead, about copy, service-area pill, contact card, and footer. |
| `--phone` | yes | Any format (`7205550187`, `(720) 555-0187`). Shown as `(720) 555-0187`; `tel:` links become `tel:+17205550187`. |
| `--primary` | no | Main brand hex color: hero, buttons, links. Defaults to the template's palette. |
| `--accent` | no | Highlight hex color: hero CTA button, badge, accent bars, footer links. Defaults per template. |
| `--areas` | no | Comma-separated service-area pills, e.g. `"Aurora,Denver,Parker"`. Default: just the `--city` (no nearby towns are guessed). |
| `--email` | no | Email to show in the about copy, contact card, and footer. Default: **no email on the page**. None is invented. |
| `--licensed` | no | Shows "Licensed & insured" in the hero badge, about copy, and a stat. Pass it only if the business is. |
| `--years` | no | Whole number of years in business (1–150), e.g. `--years 12`. Shows "12 years in business" in the hero badge, about copy, and a stat. |
| `--hours` | no | Business hours shown verbatim in the contact card and a footer column, e.g. `--hours "Mon-Fri 8-5"` (max 120 chars). Default: no hours anywhere. |
| `--tagline` | no | Headline to use instead of the neutral `<Trade> in <City>` (max 90 chars). Shown verbatim in the hero, `<title>`, and footer. |
| `--sample-reviews` | no | Adds a reviews section headed **Sample Reviews** ("Sample reviews: your real customer reviews go here."). Every card is signed "Sample customer", with no stars or ratings. Default: no reviews section and no Reviews nav link. |
| `--pay-url` | no | Optional **Pay** button in the hero, next to the existing call to action. Create a Payment Link (or hosted checkout link) in Stripe and pass that https URL here. Only Stripe's buy and checkout hosts are accepted; anything else, including `http` and `javascript:` links, is rejected. Omitted = no pay button and no payment URL in the HTML. This is a normal link, not Stripe.js, not a Checkout Session API, and not a server route. No dollar amount is invented. |
| `--zelle-phone` | no | Optional Zelle phone, shown as plain text a customer can type into their bank app. Not a payment link and not a form that sends money. No default number. |
| `--zelle-email` | no | Optional Zelle email, same plain-text treatment. Phone, email, or both are enough. Independent of `--pay-url`. |
| `--zelle-amount` | no | Optional dollar amount to display with Zelle (`150` or `$150.00`). Shown only when passed. Ignored-as-error if you pass an amount without a phone or email. No amount is invented. |
| `--out` | no | Output HTML folder. Default: `mockups/<slug>/`. |
| `--png-dir` | no | Where PNGs are written. Default: the parent folder of `--out`. |
| `--mobile` | no | Also render a 390px-wide mobile screenshot (2x). |
| `--no-png` | no | Build the HTML folder only. |
| `--list` / `--help` | no | Show trade aliases / all flags. |

Colors are applied by overriding each template's CSS custom properties (`--accent`, `--accent-dark`, `--bg`, `--footer-bg`, ...) in an override block appended to the copied `styles.css`. Text on the hero and buttons is set to white or dark automatically based on WCAG contrast, and link colors get darkened or lightened until they're readable.

### Opt-in facts

Only add these when the business has told you they're true (their Google profile, their site, or the owner). The trade, tagline, and hours text you pass is shown exactly as written.

```bash
# Default: facts only. Safe to send.
npm run mockup -- --name "Acme Plumbing" --trade plumbing --city "Aurora, CO" --phone "(303) 555-0142" \
  --email "office@acmeplumbing.com"

# With facts the business supplied, plus clearly labeled sample reviews
npm run mockup -- --name "Acme Plumbing" --trade plumbing --city "Aurora, CO" --phone "(303) 555-0142" \
  --licensed --years 12 --hours "Mon-Fri 8-5" --sample-reviews
```

What the default page contains:

- **Headline:** `<Trade> in <City>` (e.g. "Plumbing in Aurora, CO"), or your `--tagline`.
- **Services:** four plain service cards for the template, introduced as "Typical services shown for this mockup", with no promises in the descriptions.
- **About:** "<Name> serves customers in <City>. Call <phone> (or email <email>) to talk about your project." The stat row appears only with `--licensed` and/or `--years`.
- **Photos:** stock photos labeled "Sample photos for this mockup".
- **Contact:** phone, email (if passed), service area (the city), and hours (only with `--hours`). The demo form's thank-you note says it doesn't send messages yet.

### Optional Stripe and Zelle

GitHub Pages has no server, so neither option calls Stripe or moves money. Both stay completely off unless you pass them. The static templates and published prospect pages do not include a pay button, a payment URL, or a Zelle contact.

```bash
# Stripe only — button href is the URL you pass
npm run mockup -- --name "Acme Plumbing" --trade plumbing --city "Aurora, CO" --phone "(303) 555-0142" \
  --pay-url "https://<your-stripe-payment-link>"

# Zelle only — plain text, no payment URL
npm run mockup -- --name "Acme Plumbing" --trade plumbing --city "Aurora, CO" --phone "(303) 555-0142" \
  --zelle-email "pay@acmeplumbing.com" --zelle-amount 150
```

Create the Payment Link in Stripe, then pass it to `--pay-url`. The generator places one **Pay** link inside the hero actions, beside the existing call to action. Zelle, when a phone and/or email is passed, is plain text in that same spot (with `--zelle-amount` only if you supply one). You can pass both, either, or neither.


After building, the script runs two checks and stops with an error (no PNG) if either fails:

1. **Placeholders:** no template placeholder name, phone, email, or address is left in the output.
2. **Claims:** it scans the page text (including alt text, `<title>`, and meta description) for claims nobody supplied. Those are licensed / insured / bonded, certified, warranty / guarantee, years in business or "since / founded", family or locally owned, job or customer counts ("500+"), stars and ratings, reviews, "#1 / best / top-rated / award", BBB, business hours, 24/7 / emergency / same-day, response-time promises, free estimates or pricing promises, "trusted / reliable / professional"-style quality claims, crews and team size, and street addresses. Text you passed yourself (name, city, trade, email, areas, tagline, hours, Zelle details) is skipped. `--licensed`, `--years`, `--hours`, and `--sample-reviews` each allow only their own pattern. With `--sample-reviews` the check also requires the "Sample" heading and the generic "Sample customer" attribution.

### Optional chat widget (`--chat`)

A zero-cost "ask a question" bubble for any one-pager. Source: [`widgets/chat/`](./widgets/chat/) (`chat-widget.js` + `chat-widget.css`, no dependencies, ~14 KB unminified, ~5 KB gzipped). It answers in the browser by keyword + FAQ matching against a per-site `chat-facts.json`, so it works on GitHub Pages with **no API key, no paid service, and no network calls** other than loading that JSON from the same site. Off unless `--chat` is passed.

```bash
npm run mockup -- --name "Acme Plumbing" --trade plumbing --city "Aurora, CO" \
  --phone "(303) 555-0142" --email "office@acmeplumbing.com" --chat
```

`--chat` copies the widget to `<out>/chat/`, adds one `<link>` and one `<script>` tag, and writes `<out>/chat-facts.json` from **only** what you passed: name, trade, city / `--areas`, phone, `--email`, `--hours` (only if given), and the service cards shown on the page. The facts file goes through the same claim check as the page.

Behavior: it answers only from the facts. Prices always get "Please call <phone>". Hours get "Please call" unless `hours` is set. Weak matches and unknown questions get "Please call <phone>" (or email if there is no phone). It never invents prices, promises, hours, or claims.

Lead capture: name + phone/email (+ optional note). There is no backend. Submitting builds a `mailto:` to the business email with the details prefilled and tells the visitor nothing is sent until they press Send in their mail app. With no email in the facts, it shows a `tel:` link instead.

Accessibility: labeled bubble (`aria-expanded`), dialog panel, `aria-live` replies, focus moves to the question box on open and back to the bubble on close, Escape closes, 44px targets, 16px inputs on mobile, `prefers-reduced-motion` respected.

**Add it to an existing page by hand** (do not regenerate the page): copy `widgets/chat/chat-widget.js` and `.css` into `<site>/chat/`, add `<link rel="stylesheet" href="chat/chat-widget.css">` in `<head>` and `<script src="chat/chat-widget.js" data-facts="chat-facts.json" defer></script>` before `</body>`, and write `<site>/chat-facts.json`. See `prospects/rj-plumbing/`.

**Editing `chat-facts.json`** (only put in what the business has told you is true):

```json
{
  "name": "Acme Plumbing",
  "trade": "plumbing",
  "phone": "(303) 555-0142",
  "email": "office@acmeplumbing.com",
  "hours": "Mon-Fri 8-5",
  "areas": ["Aurora, CO", "Parker"],
  "services": [
    { "name": "Water Heaters", "keywords": ["tankless", "hot water"] },
    "Drain Cleaning"
  ],
  "faq": [
    { "q": "Do you work on commercial buildings?", "a": "Yes, call (303) 555-0142 to set it up." }
  ]
}
```

`name` and `phone` (or `email`) are required. `email`, `hours`, and `faq` are optional. Omit `hours` when unknown. A service is a string or `{ name, keywords }`. Keywords help matching and are never shown. FAQ entries are checked first. A question matches when at least half of the FAQ question's meaningful words appear in it. The `a` text is shown verbatim, so write only what the owner confirmed.

**Optional LLM hook (off by default, not wired to anything):** before the widget script, set

```html
<script>
  window.ChatWidgetConfig = {
    // Either a function...
    answerHook: async (question, facts) => null, // return a string, or null to use the built-in rules
    // ...or a POST endpoint you host: receives {question, facts}, returns {answer}
    // endpoint: "https://your-server.example/chat"
  };
</script>
```

If the hook throws or returns nothing, the built-in facts-only rules answer. Keep any API key on your server, never in the page. `ChatWidgetConfig.facts` (an object) or a `<script type="application/json" id="chat-facts">` block can replace the JSON file.

Demo (fake data): [`widgets/chat/demo/`](./widgets/chat/demo/). Built with `npm run mockup -- --name "Example Plumbing Co (Demo)" --trade plumbing --city "Springfield, IL" --phone "(555) 010-0199" --email demo@example.com --chat --no-png --no-claim --out widgets/chat/demo`, plus a demo banner.

### Trade aliases

| Template | Accepted `--trade` values |
|----------|---------------------------|
| `pressure-washing` | pressure-washing, pressure-wash, pressure, power-washing, power-wash, soft-wash, exterior-cleaning, window-washing |
| `landscaping` | landscaping, landscape, landscaper, lawn, lawn-care, lawncare, lawn-service, mowing, yard, yard-care, tree-service, snow-removal |
| `plumbing` | plumbing, plumber, drain, water-heater |
| `cleaning-service` | cleaning-service, cleaning, cleaner, house-cleaning, maid, janitorial, commercial-cleaning, carpet-cleaning |
| `restaurant` | restaurant, pizza, pizzeria, cafe, coffee, bakery, food, food-truck, diner, bar, catering |
| `auto-detailing` | auto-detailing, detailing, detail, car-detailing, mobile-detailing, car-wash, ceramic-coating |
| `handyman` | handyman, home-repair, repair, home-improvement, remodeling, painting, painter, carpentry, drywall |
| `generic-business` | generic, business, other, **and anything not recognized** (roofing, HVAC, electrician, ...) |

Matching ignores case and spaces (`"Lawn Care"` works the same as `lawn-care`), and multi-word trades match on a keyword (`"mobile car detailing"` → `auto-detailing`).

### Outputs

```
mockups/                       # gitignored
  acme-pressure-washing/       # deployable static site (index.html, styles.css, script.js)
  acme-pressure-washing-desktop.png   # 1440px-wide full-page screenshot
  acme-pressure-washing-mobile.png    # with --mobile
```

The script prints the HTML folder and PNG paths when it finishes. Gallery photos whose URLs are dead (404) and random Picsum placeholders are left out automatically, so the mockup never shows a broken tile.

### Tip for Sales

Attach the desktop PNG (and the mobile one if you like) to the outreach email: "Here's a free homepage mockup for <Business>." When they say yes, the matching HTML folder already has their branding. Swap in their real photos, reviews, services, and any facts they confirm (license, years, hours), then deploy it (see **Deploy** below) as the live site.

## Deploy

Each template folder is deployable on its own, or host the whole repo and deep-link into folders.

### Netlify

1. Drag-and-drop a template folder onto [Netlify Drop](https://app.netlify.com/drop), **or**
2. Connect this repo → set **Publish directory** to one template folder (e.g. `pressure-washing`), or `/` for the gallery index.

### Vercel

```bash
cd pressure-washing   # or another template
npx vercel
```

Or import the GitHub repo in the Vercel dashboard and set the root directory to the template you want.

### GitHub Pages

1. Repo **Settings → Pages → Source**: Deploy from branch `main`, folder `/` (root).
2. Site gallery: `https://trae77.github.io/client-site-templates/`
3. Single template: `https://trae77.github.io/client-site-templates/pressure-washing/`

For a client-facing single site, either deploy only that folder to Netlify/Vercel, or use a separate repo / Pages project with just that template.

## Note for William (repo owner)

These are starter kits for sold one-pager deliverables: clone a niche folder, swap branding/photos, connect a form backend if needed, and deploy. Keep client pricing and private notes out of the public HTML. Prefer client-owned domains and hosting accounts when handing off.

## License

Templates are provided as-is for use on client projects. Placeholder images are from Unsplash / Picsum — replace with licensed client photos before commercial launch when required by those services’ terms.
