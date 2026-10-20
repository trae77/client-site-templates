# Deploying a client one-pager to Cloudflare Pages

This guide takes one finished one-pager folder (for example `prospects/<slug>/` once the client has said yes, or a fresh `tools/mockup.mjs` build with the client's real facts) and puts it live on the client's own domain on **Cloudflare Pages**.

**Why Cloudflare Pages and not GitHub Pages:** GitHub Pages is for our demos and mockups only. GitHub's terms say Pages is not meant for running an online business or e-commerce site ([GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)). Cloudflare Pages has no such restriction in its docs or plan limits; the Free plan allows 500 builds a month, 100 custom domains per project, 20,000 files and 25 MiB per file ([Pages limits](https://developers.cloudflare.com/pages/platform/limits/)). That is plenty for a static one-pager, and it is fine for commercial client sites. (Re-read Cloudflare's current terms if a client's use is unusual.)

**Not for this guide:** sites with online ordering, a customer portal or an owner dashboard (the `multipage-template` server build) need a Node server and a database. Those go on **Render** (see `trae77/multipage-template` README → Deploy). Never take card numbers on any of our pages; payments go through the client's own Stripe Payment Link or Square/Toast page.

Sources (all checked 2026-10-19): [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) · [GitHub integration](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/) · [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) · [Limits](https://developers.cloudflare.com/pages/platform/limits/).

---

## 0. Before you start: who owns what
- The **client** owns the domain registrar account and the **Cloudflare account**. Ask them to create it (free) and add you as a member. Don't create it in your own name.
- You need: the client's approved copy and facts (name, phone, email, hours, service areas, licence numbers only if they gave them), their form endpoint, and their domain.
- Hand credentials over through the client's password manager, never by email.

## 1. Make a clean, deploy-ready folder
Mockups carry things that must not go live: the "Love it? Make it yours for $400" claim bar (RJ Plumbing: $200), "Sample" labels, demo banners, placeholder text and 555 phone numbers.

```bash
npm run export-client -- --site prospects/<slug> --site-url https://www.clientdomain.com
```

`tools/export-client.mjs` copies the folder to `dist-client/<slug>/` (the source is not touched), then:
- removes the claim bar, `.sample-tag` labels, demo banners and any `noindex`;
- writes `robots.txt` that allows indexing, plus `sitemap.xml`;
- sets `<link rel="canonical">`, `og:url` and the LocalBusiness JSON-LD `url` to `--site-url`;
- scans for leftovers that need real facts: sample/mockup/placeholder wording, `(555)` numbers, `example.com`, forms that don't send yet. Any finding **stops the export (exit 2)**. Fix it in the source, or rebuild with `tools/mockup.mjs` using the client's real facts and no `--sample-*` flags, then export again. `--force` writes the folder anyway, for a private preview only.

`dist-client/` is git-ignored.

## 2a. Deploy by Direct Upload (simplest for one-pagers)
Direct Upload sends a folder of prebuilt files. Note: **a Direct Upload project can't be switched to Git integration later**; you'd create a new project ([docs](https://developers.cloudflare.com/pages/get-started/direct-upload/)).

**With Wrangler (CLI):**
```bash
npx wrangler login                          # opens the browser; log in to the CLIENT's Cloudflare account
npx wrangler pages project create           # asks for a project name and production branch (e.g. main)
npx wrangler pages deploy dist-client/<slug> # production deploy -> https://<project>.pages.dev
npx wrangler pages deploy dist-client/<slug> --branch=preview   # optional preview -> https://preview.<project>.pages.dev
```
Wrangler takes a folder (not a zip), up to 20,000 files, 25 MiB each.

**With drag and drop:** Cloudflare dashboard → **Workers & Pages** → **Create application** → **Get started** → **Drag and drop your files** → name the project → drop the folder (or a zip of it; up to 1,000 files) → **Deploy site**. Later updates: project → **Create a new deployment**.

## 2b. Deploy from Git (automatic deploys on every push)
Use this when the client site lives in its own repo (put the exported folder's files at the repo root).
1. Dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Install the **Cloudflare Workers and Pages** GitHub App and give it **only the client's repo** (Cloudflare recommends limiting repository access).
3. Build settings for a plain static site: framework preset **None**, build command **empty**, build output directory **`/`** (or the subfolder holding `index.html`).
4. **Save and Deploy**. The production branch is the first branch you push; change it in **Settings → Builds → Branch control**. Pull requests get their own preview URLs.
5. To push a commit without deploying, start the commit message with `[CF-Pages-Skip]` (or `[skip ci]`).

([GitHub integration docs](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/))

Check `https://<project>.pages.dev` on a phone before touching DNS.

## 3. Custom domain and DNS
Always start in the Pages project: **Workers & Pages → project → Custom domains → Set up a domain**, enter the domain, **Continue**. Adding a CNAME by hand without this step makes the domain fail with a **522 error** ([docs](https://developers.cloudflare.com/pages/configuration/custom-domains/)).

- **Apex domain** (`clientdomain.com`): the domain must be a **zone on the same Cloudflare account**, with the registrar's **nameservers changed to the two Cloudflare nameservers** shown in the dashboard. Cloudflare then creates the record itself.
- **Subdomain** (`www.clientdomain.com`): can stay at the current DNS host. Add `CNAME www → <project>.pages.dev` there, after setting up the domain in Pages. If the zone is already on Cloudflare, the record is added for you.
- Pick **one canonical host** (we use `www` in `--site-url` examples) and redirect the other to it (a Cloudflare Redirect Rule on the zone).
- Redirect `<project>.pages.dev` to the custom domain with an account-level **Bulk Redirect**, so search engines only see one site.
- **Don't point DNS away and back.** If the record is changed to point elsewhere, the custom domain goes inactive and visitors see errors until it re-validates. Use a redirect or origin rule for temporary changes instead.

## 4. HTTPS
Cloudflare issues and renews the certificate for the custom domain automatically once the domain is active; there is nothing to upload. Two things block it:
- **CAA records**: if the domain has CAA records, they must allow Cloudflare's CAs. Add `issue` and `issuewild` records for `letsencrypt.org`, `pki.goog; cansignhttpexchanges=yes` and `ssl.com` ([docs](https://developers.cloudflare.com/pages/configuration/custom-domains/#caa-records)).
- A domain still pointing at the old host: wait until the domain shows **Active** in Custom domains, then test `https://` and `http://` (http should redirect).

## 5. Form endpoints
Our pages never run server code. Contact/quote forms post to a form service in the **client's** name:
- **Web3Forms** (free tier includes hCaptcha) or **Formspree**: create the form with the client's inbox, then set the endpoint (rebuild with `--money-endpoint` / `--order-endpoint`, or replace the form `action`).
- "Text me new leads" (SMS) needs a small Cloudflare Worker plus a paid SMS provider in the client's name; that's an add-on, not the default.
- Submit a real test from a phone and confirm it lands in the client's inbox (and isn't in spam) **before** launch.
- Booking and payment links (`--booking-url`, `--pay-url`) must point to the **client's** Calendly/Square/Stripe accounts, never ours. Keep Stripe in test mode until the client confirms.

## 6. Go-live checklist (spec v4 B5)
Tick every line before telling the client it's live.

**Content (the export tool catches most of this, but read the page anyway)**
- [ ] **Claim bar removed**: no "$200", "$400", "Make it yours", "Get this site".
- [ ] **Demo labels removed**: no "Sample", "mockup", "design concept", "placeholder", "goes here", demo banners.
- [ ] **Real facts only**: client approved the name, phone, email, address, hours and service areas. No invented years, licences, reviews, ratings, prices or response times. Grep for `Sample`, `555-01`, `(555)` and `example.com`.
- [ ] Reviews are real and attributable (or the section is off); link to the Google Business Profile.
- [ ] Every photo is the client's own or listed with its licence in CREDITS.md.

**Hosting**
- [ ] Pages project created in the **client's** Cloudflare account; `*.pages.dev` works on a phone.
- [ ] Custom domain added in **Custom domains** first, then DNS (apex: nameservers on Cloudflare; www: CNAME → `<project>.pages.dev`).
- [ ] CAA records allow letsencrypt.org, pki.goog and ssl.com (if the domain has CAA records).
- [ ] HTTPS works; http → https; apex ↔ www go to one canonical host; `*.pages.dev` redirects to the custom domain (Bulk Redirects).

**Forms, booking, payments**
- [ ] Form endpoint is the client's own Web3Forms/Formspree key and inbox; test submission from a phone arrived.
- [ ] Booking URL and pay link are the client's accounts; test booking done; Stripe in test mode until the client confirms.

**SEO**
- [ ] **Robots indexing on**: no `noindex` meta; `robots.txt` says `Allow: /` and lists the sitemap.
- [ ] **Schema site-url set**: `<link rel="canonical">`, `og:url` and JSON-LD `"url"` use the live domain (`--site-url`). JSON-LD passes Google's [Rich Results Test](https://search.google.com/test/rich-results).
- [ ] `sitemap.xml` submitted in Google Search Console; Google Business Profile website link updated.

**Quality**
- [ ] Contrast check passed at build; tap targets ≥ 48 px; Lighthouse mobile run saved.
- [ ] Checked at 390 px and 1440 px.

**Replacing an existing site**
- [ ] Lowered the old DNS TTL a day before; mapped old URLs to new ones with a `_redirects` file (up to 2,000 static rules); kept the old host until DNS propagated.
- [ ] Don't flip DNS back and forth (see §3).

**Handover**
- [ ] Client owns the registrar and the Cloudflare account; you're a member, not the owner. Credentials shared via their password manager.
