// Claim bar shown on prospect mockups: two options side by side.
// 1) Own it: $500 one-time (yours from day one)   2) $0 down: $129/mo  (links in tools/claim-link.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CLAIM_MARK = 'data-claim-bar';
const END = '<!--/claim-bar-->';
const RICK = 'https://buy.stripe.com/9B6fZhcgd9xYaxK35O7ss00';

function checkUrl(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !['buy.stripe.com', 'checkout.stripe.com'].includes(u.hostname)) {
    throw new Error('claim-link.json urls must be https Stripe Payment Links');
  }
  return u.toString();
}

export function claimUrls() {
  const j = JSON.parse(fs.readFileSync(path.join(here, 'claim-link.json'), 'utf8'));
  return { own: checkUrl(j.own), monthly: checkUrl(j.monthly) };
}

export function claimBarHtml({ own, monthly }) {
  return `<div ${CLAIM_MARK} style="position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(17,24,39,.94);color:#fff;border-radius:18px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:500 15px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;width:max-content;max-width:calc(100% - 20px);box-sizing:border-box;">
  <style>[data-claim-bar] .cb-t{padding-left:6px;white-space:nowrap}[data-claim-bar] .cb-b{display:flex;flex-direction:column;justify-content:center;text-align:center;text-decoration:none;font-weight:700;padding:8px 14px;border-radius:12px;white-space:nowrap;box-sizing:border-box}[data-claim-bar] .cb-own{background:#22c55e;color:#06210f}[data-claim-bar] .cb-mo{background:#fff;color:#111827}[data-claim-bar] .cb-b small{font-weight:500;font-size:11px;opacity:.75;margin-top:2px;white-space:normal;max-width:220px}@media (max-width:600px){[data-claim-bar]{flex-wrap:wrap;justify-content:center;width:calc(100% - 20px)!important;gap:8px!important;padding:8px!important}[data-claim-bar] .cb-t{width:100%;text-align:center;padding:0;font-size:14px}[data-claim-bar] .cb-b{flex:1 1 0;min-width:0;padding:8px 8px;font-size:14px;white-space:normal}}</style>
  <span class="cb-t">Love it? Make it yours:</span>
  <a class="cb-b cb-own" href="${own}" rel="noopener noreferrer">Own it: $500 one-time<small>Yours from day one</small></a>
  <a class="cb-b cb-mo" href="${monthly}" rel="noopener noreferrer">$0 down: $129/mo<small>6-month minimum, yours after 12 months, 30-day money-back</small></a>
</div>${END}
`;
}

/** Insert (or replace) the bar just before </body>. Idempotent. Never touches Rick's $200 page. */
export function addClaimBar(html, urls = claimUrls()) {
  if (html.includes(RICK)) return html;
  if (html.includes(END)) html = html.replace(new RegExp(`<div ${CLAIM_MARK}[\\s\\S]*?${END}\\n?`), '');
  else html = html.replace(new RegExp(`<div ${CLAIM_MARK}[\\s\\S]*?</div>\\n`), '');
  if (!/<\/body>/i.test(html)) throw new Error('No </body> tag; cannot place claim bar.');
  return html.replace(/<\/body>/i, claimBarHtml(urls) + '</body>');
}

// CLI: node tools/claim-bar.mjs prospects/*/index.html
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const urls = claimUrls();
  let n = 0;
  for (const f of process.argv.slice(2)) {
    const before = fs.readFileSync(f, 'utf8');
    const after = addClaimBar(before, urls);
    if (after !== before) { fs.writeFileSync(f, after); n++; }
  }
  console.log(`Claim bar updated in ${n} file(s).`);
}
