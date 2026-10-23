# Logo QA Checklist (run before showing concepts AND before final delivery)
Client: ________  Concept/version: ________  Checked by/date: ________

## Design tests
- [ ] **16px favicon test:** open `favicon/favicon-16.png` and a 32px browser tab. The icon is still recognizable (no hairlines or tiny text). If not, simplify the icon.
- [ ] **One-color test:** black version on white works, with no meaning lost from gradients or color alone.
- [ ] **Reversed test:** white version on black AND on the brand primary color is clean, with knockouts transparent (compound paths, not white shapes).
- [ ] **Legibility:** the name reads at 120px wide on screen and 1.25in in print, and from about 50ft on a sign mockup (view at 10% zoom). No letters merge (rn/m, cl/d).
- [ ] **Distinctiveness:** side by side with the 2–4 competitors from intake it doesn't look like theirs, and it isn't a generic stock/AI cliché (swoosh, globe, generic house roof) unless reworked.
- [ ] **Vector hygiene:** all text is outlined, there are no embedded rasters, node counts are reasonable, there are no stray points or open paths, and it's not a raw auto-trace or raw AI output (hand redraw done).
- [ ] **Scale/mockups:** checked on sign, truck, card and phone mockups, plus embroidery if the client needs it (shapes ≥1mm, no fine gradients).

## Clearance (not legal advice; tell the client to see an attorney for a full clearance)
- [ ] **USPTO name search:** go to https://tmsearch.uspto.gov. Search the business name (and close spellings or sound-alikes) in the wordmark field and filter to **Live** marks. Note any hits in related goods/services classes (e.g., Class 37 construction/repair, 42 web/design, 35 business services, 44 landscaping…).
- [ ] **USPTO design-code search:** look up codes for the logo's shapes in the USPTO **Design Search Code Manual** (https://tmdesigncodes.uspto.gov). Examples: 07.01 buildings/houses, 06.01 mountains, 26.01 circles, 26.11 rectangles, 27.03 letters forming shapes. Search by code (`DC:` field) together with the class, filter to Live, and scan images for lookalikes.
- [ ] Record results (date, queries, notable hits) in the project folder.
- [ ] **Reverse image search:** upload the PNG to Google Lens (lens.google.com) and TinEye (tineye.com), and also Bing Visual Search. No near-identical existing logos found.
- [ ] Quick web/Google Business search for the same name in the service area.

## Color & type
- [ ] **WCAG AA contrast:** run every intended text/background pair (the guidelines PDF auto-computes these on the Contrast page, or use https://webaim.org/resources/contrastchecker/). Normal text ≥ **4.5:1**, large text (24px+, or 19px+ bold) and icons/UI ≥ **3:1**. Mark failing pairs "don't use for text."
- [ ] CMYK values listed, and the print proof requested for big runs (truck wraps, signs).
- [ ] **Google Fonts license:** each font's page at fonts.google.com shows its license (About/License tab). Confirm **SIL Open Font License (OFL)** or Apache 2.0, both fine for commercial use and logos. Record the font name + license URL in rights-transfer.md. No paid or "personal use only" fonts (dafont etc.).

## File completeness (export.py output)
- [ ] 4 layouts (primary, horizontal, stacked, icon) × 3 colorways (full-color, black, white)
- [ ] Each with SVG + PDF + transparent PNG (500/1000/2000px; icon 256/512/1024)
- [ ] favicon/: favicon.ico (16/32/48), favicon-16, favicon-32, apple-touch-icon-180, icon-512, favicon.svg
- [ ] guidelines/ brand guidelines PDF (12 pages) with the correct name, colors and fonts
- [ ] templates/: business-card-print.pdf (3.75×2.25in incl. 0.125in bleed, 2 pages), email-signature.html, social profile 800×800, FB cover 851×315, LinkedIn covers 1584×396 & 1128×191
- [ ] legal/ signed rights transfer + font list
- [ ] Open the ZIP on another device and spot-check that files open
- [ ] Spelling of business name, phone, email and website checked twice
