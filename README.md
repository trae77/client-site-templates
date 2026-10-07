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
