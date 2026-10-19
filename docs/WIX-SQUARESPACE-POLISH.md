# Wix / Squarespace polish audit (spec v4 B4)

A fixed-scope service for clients who already have a Wix or Squarespace site and want it to look and convert better, without a rebuild. Apply the same rules as our own templates, inside the client's builder. Recent Upwork posts asked for exactly this ("make it look more aesthetic", "modernize a Wix page", "finish a half-built Squarespace site"); see specs/spec-v4.md Part B.

**Deliverable:** before/after screenshots at 390 px and 1280 px, plus a one-page change list. Work in the client's account as a contributor; never ask for their password by email.

## Checklist
1. **Above the fold:** the H1 says the service and the city. One primary button and a tap-to-call number visible on a phone without scrolling (5-second test).
2. **Mobile nav:** 2–3 visible priority links plus a labelled "Menu" button (not an icon alone). Add a sticky call/book bar if the builder supports it.
3. **Contrast:** check brand colors against the palette table in specs/spec-v4.md A1; buttons and body text at least 4.5:1 (use any WCAG contrast checker).
4. **Fonts:** at most 2 families; pick one of our 10 pairings (`industrial`, `utility`, `craft`, `bistro`, `street`, `atelier`, `power`, `care`, `estate`, `gallery`; see the README Design system section). Both builders offer Google Fonts; confirm the pair is available on the client's plan or theme.
5. **Section order:** reorder to the matching layout in `tools/design.mjs` `LAYOUTS` (e.g. `trade-lead`, `salon-book`, `rest-order`, `care-visit`).
6. **Restaurants:** the menu is HTML text, not a PDF.
7. **Booking:** native Wix Bookings / Squarespace Scheduling, or an embed from an allowed provider (Calendly, Square, TidyCal, Fresha) with a "new tab" link fallback. One clear "Book" button.
8. **Forms:** send a test submission; set the notification email to the owner's inbox; turn on the builder's spam protection.
9. **SEO basics:** page title and meta description per page (service + city + business name), alt text on every image, business type set in the builder's SEO/business panel. Check whether the builder already outputs LocalBusiness markup; if not, add JSON-LD through a code-injection block. Squarespace code injection depends on the plan, so check the client's plan first. Use the most specific schema.org type; no self-made ratings.
10. **Images:** compress; replace stock with the client's own photos where possible; log any stock photo and its licence.
11. **Speed:** remove unused apps, pop-ups and embeds; aim for under 3 s on mobile (run Lighthouse or PageSpeed Insights before and after).
12. **Trust, facts only:** real reviews only (link to the Google Business Profile); licence/brokerage lines only when the client gives the numbers. No invented years, awards, prices or response times.

## Out of scope (quote separately)
New pages, e-commerce setup, migrations off the builder (see docs/DEPLOY-CLOUDFLARE-PAGES.md for moving a site to our templates on Cloudflare Pages), paid apps or plan upgrades (the client buys those themselves).
