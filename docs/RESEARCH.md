# Research: what well-converting small-business one-pagers do (Oct 2026)

Short notes that shaped the template library (`tools/library.mjs`). Sources are linked; figures are those sources' claims, not ours.

## Patterns for trades and home services
- **Phone first, on mobile.** Most local-service traffic is mobile, and callers convert far better than form fills. Put a tappable `tel:` link in the header and hero, and add a **sticky bottom call bar** on phones (thumb zone, 1–2 buttons max). → `call-bar` feature.
  - [Ad Genius: 507 contractor websites analyzed](https://adgenius.com/research/contractor-website-analysis/)
  - [Pipelineon: click-to-call placement](https://pipelineon.com/blog/click-to-call-button-placement/)
  - [PCN: 2026 calls vs forms lead study](https://pcnanswers.com/calls-vs-forms-leads-study/)
- **5-second clarity.** Headline states service + city; one dominant CTA repeated down the page. → hero stays "<Trade> in <City>" with a single primary button (`Request a Quote` / `Book a Visit` when those features are on).
  - [M.Wolf Media: website conversion tips for home services](https://mwolfmedia.com/website-conversion-tips-for-home-services/)
  - [Tempesta Media: contractor website conversions](https://www.tempestamedia.com/2026/09/17/contractor-website-get-more-conversions/)
- **Short forms.** About three fields (name, phone, what you need); every extra field costs completions, and mobile completion is lower than desktop. → `quote-form` has exactly three fields, no backend.
  - [Surfside PPC: landing page UX for local services](https://surfsideppc.com/blogs/web-design/landing-page-ux-local-services-guide)
  - [Leadfire: Lost Enquiry Report 2026](https://www.leadfire.net/research/lost-enquiry-report-2026)
  - [Digital Applied: landing page statistics 2026](https://www.digitalapplied.com/blog/landing-page-statistics-2026-conversion-data-points)
- **Real proof beats badges.** Named, dated reviews and real before/after photos lift trust; generic "5-star" graphics are discounted. → reviews only from `--reviews-file` (real) or `--sample-reviews` (labeled samples); `before-after` uses the client's photos or labeled placeholders. We never invent ratings, licenses or years.
  - [Pipelineon: contractor landing page tips 2026](https://pipelineon.com/blog/contractor-landing-page-tips/)
- **Service area visible.** Visitors need to confirm you serve their town; text list first, a map is optional. → area pills always; `map` (OpenStreetMap embed) is opt-in.
- **FAQ handles objections.** A short FAQ near the end. → `faq` built only from supplied facts (+ `--faq-file`).

## Restaurants, food trucks, salons, studios, clinics
- **Menu as HTML text, not a PDF**; hours identical everywhere; clear Order / Reserve / Call buttons near the top. → `menu` (labeled sample layout unless `--menu-file`), `hours` only from `--hours`, `booking` (request form, or link out with `--booking-url`).
  - [Dirigible: restaurant website essentials](https://support.mydirigible.com/docs/guides/website-planning/restaurant-website/)
  - [Clouds Agency: menu, hours and ordering](https://www.cloudsagency.co/blog/restaurant-website-essentials-menu-hours-ordering)
  - [OpenTable: how to build a restaurant website](https://www.opentable.com/restaurant-solutions/resources/restaurant-website-creation/)
- **Link out rather than embed heavy widgets** for booking/ordering (faster, never breaks the page). → `--booking-url` renders a button, no third-party script.

## Style
- Four themes cover the common looks seen across these examples: **bold-industrial** (roofing, electrical, auto: dark header, uppercase, stripes), **clean-minimal** (HVAC, dental, photography: white, light hero, thin borders), **warm-local** (painting, pets, food trucks: cream, serif headings, rounded), **premium-dark** (salons, real estate: dark, serif, thin gold-style accents).
