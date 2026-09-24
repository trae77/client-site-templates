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
