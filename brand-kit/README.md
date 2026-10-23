# TTA Web Dev — Pro Logo & Brand Kit Toolkit
Price (unchanged): **$350**, or **$250 with a website**. Scope: **3 concepts + 2 revision rounds**. Free tools only (Inkscape, Figma free, Google Fonts, Chrome/Playwright, Python + Pillow).

## Workflow
1. **Intake:** send `intake-questionnaire.pdf` (or the `.md`/`.html`), then hold a 20-minute call. Confirm the scope line is checked.
2. **Moodboard:** competitor scan (the logos of the 2–4 competitors from intake) plus 10–20 references in an Excalidraw/Figma board. Pull the palette direction (Coolors/Adobe Color, free).
3. **AI ideas (rough only):** generate 15–20 rough directions, then pick 3 distinct ones. Never ship AI output: it looks generic and can't be copyrighted.
4. **Hand redraw:** rebuild each of the 3 in Inkscape or Figma as clean vectors using Google Fonts (OFL). Make knockouts with compound paths (`fill-rule="evenodd"` / Path ▸ Difference), not white shapes.
5. **3 concepts on mockups:** show each on a sign, truck, card and phone (use the guidelines "Applications" page or the Hcti/image tools). Run the design half of `qa-checklist.md` first.
6. **2 revision rounds** on the chosen concept. More rounds are quoted separately.
7. **Masters:** save 4 files in `clients/<slug>/master/`: `primary.svg`, `horizontal.svg`, `stacked.svg`, `icon.svg` (square). Colors go in as `fill="#RRGGBB"`.
8. **Export + guidelines + templates:** fill in a `brand.json` (copy `guidelines-template/brand.sample.json`), then run `make-kit.sh` (below).
9. **QA:** complete `qa-checklist.md` (USPTO, reverse image, WCAG, fonts, files).
10. **Deliver:** send the ZIP plus a signed `rights-transfer.md`, after payment in full.

## Tools
| File | What it does |
|---|---|
| `make-kit.sh MASTER BRAND.json OUT [--name --title --phone --email --web]` | Does everything below and zips the delivery folder |
| `export.py MASTER SLUG --out OUT` | Installs Inkscape via apt if missing. Builds 4 layouts × full-color/black/white × SVG (text outlined) + PDF + transparent PNG (500/1000/2000px; icon 256/512/1024), a favicon set (.ico 16/32/48, 16, 32, 180, 512, svg) and a ZIP |
| `guidelines-template/render.py BRAND.json [--out PDF]` | Fills `template.html` (`{{BUSINESS_NAME}}`, `{{C1}}`, `{{HEADING_FONT}}`…) and prints a 12-page landscape PDF with headless Chrome (falls back to `npx playwright pdf`). Auto-computes RGB/CMYK and the WCAG contrast table |
| `templates/render_templates.py BRAND.json [...]` | Business card PDF (3.75×2.25in = 3.5×2 + 0.125in bleed, front/back, 0.25in safe zone), `email-signature.html` (table/inline, swap `LOGO_URL` for a hosted PNG), social PNGs: profile 800×800, FB cover 851×315, LinkedIn 1584×396 + 1128×191 |
| `intake-questionnaire.md/.html/.pdf` | Client intake |
| `qa-checklist.md` | Pre-delivery QA |
| `rights-transfer.md` | Plain-English ownership transfer + font license table (not legal advice) |

### Example (the sample TTA mark)
```bash
./make-kit.sh sample/master guidelines-template/brand.sample.json sample/out \
  --name "William Pollak" --title Owner --email wpollak@ttawebdev.com --web ttawebdev.com
```
Output: `sample/out/tta-web-dev-brand-kit/` (logos/, favicon/, guidelines/, templates/, fonts/, legal/) + `tta-web-dev-brand-kit.zip`.

Requirements: `inkscape` (auto-installed), `python3` + Pillow, Google Chrome/Chromium or `npx playwright`, `zip`. Business card note: tell the printer the PDF includes 0.125in bleed and trims to 3.5×2in. For press-exact CMYK, open the PDF in Inkscape/Scribus and convert, or let the printer convert.
