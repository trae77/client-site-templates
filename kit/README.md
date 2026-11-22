# One-command client site kit

Turn a paid client's intake answers into a **noindex preview site** that has already passed the TTA pre-ship gate. Built for the 48-hour go-live: intake in, gated preview out, owner review, then export.

```
npm ci                                   # first time only (Playwright + axe-core)
npm run kit -- path/to/client.intake.json
```

Try it with the fictional sample:

```
npm run kit -- kit/samples/juniper-ridge-painting.intake.json
```

Output goes to `kit/out/<client-slug>/` (gitignored):

- `site/`: the deployable static folder (index + privacy, `robots.txt` Disallow, `_headers` X-Robots-Tag, `<meta name="robots" content="noindex, nofollow">` on every page)
- `GATE-REPORT.md` and `gate-results.json`: pass/fail and counts for each gate, with report paths
- `kit-build.json`: plan, price cross-check, warnings. `facts.json`: the public facts used (no private fields)

Exit code: `0` all gates pass, `1` a gate failed (see the report), `2` the intake is missing required answers or a tool is missing.

## Input

A JSON file whose keys are the field names on the paid-client intake form (`/workspace/ops/intake/intake-form.md`, live form `ttawebdev.com/intake/`). The kit refuses to build if a required answer is missing.

| Key | Required | Used for |
|---|---|---|
| `public-name` | yes | Business name, exactly as it should appear |
| `public-phone` | yes | Call buttons, call bar, footer |
| `service-area` | yes | Comma list of cities; first one is the home city unless `city` is set |
| `services-list` | yes | One service per line or array item: `Name \| short description \| price` |
| `services` | no | Purchased TTA services, e.g. `["lead-engine"]`. Recorded in `kit-build.json` only; never shown on the site |
| `trade` (or `gbp-category`) | no | Template choice (`node tools/mockup.mjs --list`); unknown falls back to generic-business |
| `city` | no | e.g. `Lakewood, CO` |
| `public-email` | no | Email button and footer |
| `address` | no | Shown only if it is a real street address (not "service-area only, hide address") |
| `hours_mode`, `hours` | no | `hide` and `use-google` leave hours off; otherwise `hours` is shown verbatim |
| `prices` | no | Contains "show" to print the third `services-list` column. Otherwise "Call for a quote." Prices are never invented |
| `colors` | no | First two hex codes become primary and accent |
| `text_ok` | no | `true` if the public phone takes texts (adds Text buttons) |
| `photos` | no | `[{ "file": "photos/kitchen.jpg", "alt": "Kitchen cabinets after painting" }]` (paths relative to the intake file). Without photos, the gallery is removed instead of showing placeholders |
| `faq` | no | `[{ "q": "...", "a": "..." }]` from the owner only |
| `form-endpoint` | no | https Formspree/Web3Forms/client-Worker URL. Without it, the site has no forms (call/text/email buttons only), so nothing pretends to send |
| `tagline` | no | 90 characters or fewer |

Private fields (`contact-*`, `legal-name`, `lead-email`, `approver`) are never published. The build stops if one leaks into a page.

## What runs

1. **Build** with `tools/mockup.mjs` (facts only, `--no-claim`, `--no-track`, call bar), then `kit/lib/finish.mjs` turns it into a client preview: the owner's services verbatim (also in JSON-LD), no mockup, sample, or placeholder wording, no non-sending forms, one privacy link, a privacy page that matches how the site works, and `scroll-margin` so sticky headers don't cover anchor targets.
2. **Serve** on `127.0.0.1` (a `/sitemap.xml` is generated for the gates).
3. **Gates**, in order:
   1. Ship guard: `/workspace/ops/gates/ship-guard.sh <repo> <base>` (the base is `origin/main` if it shares history with HEAD, else `origin/base/templates-full`; override with `--base`)
   2. Copy proofread: `/workspace/ops/gates/proofread-gate.mjs` (plus a Gemini pass when `GEMINI_API_KEY` is set) **and** `kit/gates/copy-check.mjs` on the rendered text: dev/placeholder text, any `$` amount or TTA plan name not in the intake, every intake service shown verbatim, AI filler, claims the owner did not supply, repeated sentences, doubled words or punctuation, and codespell typos
   3. axe WCAG 2.2 AA (`kit/gates/axe.mjs`) at 1280×800 and 390×844, every page
   4. `/workspace/ops/gates/ux-gate.mjs` (contrast on pixels, sticky chrome, anchors, scroll, overflow, tap targets, axe) at 1280×800 and 390×844, every page
   5. Lychee: `/workspace/ops/qa/lychee-check.sh` for outgoing links plus an offline `lychee --include-fragments` pass for internal links and `#` anchors

Options: `--out DIR`, `--base REF`, `--skip-gates` (build only), `--only proofread,axe,ux,lychee,ship-guard`, `--keep-serving` (keep the local preview up to look at it).

For the Gemini proofread pass, load the key into the environment the same way the gates README says (never print it): `set -a; source /workspace/ops/secrets/routine-env.sh; set +a; npm run kit -- <intake.json>`.

## Prices

The four locked monthly plans are Starter $199, Visibility $399, Lead Engine $599, Growth Engine $899 (`kit/lib/plans.mjs`). Each run cross-checks them against `/workspace/ops/locked-facts.md` and stops on a mismatch; it warns (does not edit) if `/workspace/products/PRICE-SHEET.md` disagrees. Plan prices are TTA records only and never appear on a client site; the copy check fails any page that shows a `$` amount the client did not supply.

## After the preview passes

1. Send the owner the preview for review (host the `site/` folder on a TTA preview host, never the client's live domain).
2. When they approve, `npm run export-client -- --site kit/out/<slug>/site --site-url https://<client-domain>` removes noindex, sets canonical/sitemap, and runs the pre-launch scan (it flags 555 numbers and example.com, so it only passes on real facts).
3. Deploy per `docs/DEPLOY-CLOUDFLARE-PAGES.md` on the client's own account.

Nothing in the kit deploys, sends, or charges anything.

## Tests

```
npm run test:kit
```
