# Client Site Templates

Polished, mostly-complete **HTML/CSS/JS one-pager templates** for small US businesses. Each folder is a self-contained static site — no build step. Open `index.html` locally or deploy the folder as a static site.

Built for quick customization and shipping on sold one-pager jobs.

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
| `--city` | yes | City, optionally with state (`"Thornton, CO"`). Used in the hero badge/lead, about copy, service-area pills, contact card, footer, review locations. |
| `--phone` | yes | Any format (`7205550187`, `(720) 555-0187`). Shown as `(720) 555-0187`; `tel:` links become `tel:+17205550187`. |
| `--primary` | no | Main brand hex color: hero, buttons, links. Defaults to the template's palette. |
| `--accent` | no | Highlight hex color: hero CTA button, badge, accent bars, footer links. Defaults per template. |
| `--areas` | no | Comma-separated service-area pills, e.g. `"Aurora,Denver,Parker"`. Default: the city plus built-in nearby towns (Front Range and a few big metros), otherwise "Surrounding areas". |
| `--email` | no | Email to show. Default: `<template's inbox>@<businessname>.com`, e.g. `hello@acmepressurewashing.com`. |
| `--out` | no | Output HTML folder. Default: `mockups/<slug>/`. |
| `--png-dir` | no | Where PNGs are written. Default: the parent folder of `--out`. |
| `--mobile` | no | Also render a 390px-wide mobile screenshot (2x). |
| `--no-png` | no | Build the HTML folder only. |
| `--list` / `--help` | no | Show trade aliases / all flags. |

Colors are applied by overriding each template's CSS custom properties (`--accent`, `--accent-dark`, `--bg`, `--footer-bg`, ...) in an override block appended to the copied `styles.css`. Text on the hero and buttons is set to white or dark automatically based on WCAG contrast, and link colors get darkened or lightened until they're readable.

After building, the script checks that no template placeholder name, phone, email, or address is left in the output, and it stops with an error if it finds one.

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

Attach the desktop PNG (and the mobile one if you like) to the outreach email: "Here's a free homepage mockup for <Business>." When they say yes, the matching HTML folder already has their branding. Swap in their real photos, reviews, and services, then deploy it (see **Deploy** below) as the live site.

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
