// "Love it? Make it yours for $400" bar shown on prospect mockups.
// The link is the $400 One-page website Stripe Payment Link (see tools/claim-link.json).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CLAIM_MARK = 'data-claim-bar';

export function claimUrl() {
  const { url } = JSON.parse(fs.readFileSync(path.join(here, 'claim-link.json'), 'utf8'));
  const u = new URL(url);
  if (u.protocol !== 'https:' || !['buy.stripe.com', 'checkout.stripe.com'].includes(u.hostname)) {
    throw new Error('claim-link.json url must be an https Stripe Payment Link');
  }
  return u.toString();
}

export function claimBarHtml(url) {
  return `<div ${CLAIM_MARK} style="position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 18px;background:rgba(17,24,39,.92);color:#fff;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:500 15px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;width:max-content;max-width:calc(100% - 24px);box-sizing:border-box;">
  <span>Love it? Make it yours for $400</span>
  <a href="${url}" rel="noopener noreferrer" style="background:#22c55e;color:#06210f;text-decoration:none;font-weight:700;padding:8px 16px;border-radius:999px;white-space:nowrap;">Get this site</a>
</div>
`;
}

/** Insert (or replace) the bar just before </body>. Idempotent. */
export function addClaimBar(html, url = claimUrl()) {
  html = html.replace(new RegExp(`<div ${CLAIM_MARK}[\\s\\S]*?</div>\\n`), '');
  if (!/<\/body>/i.test(html)) throw new Error('No </body> tag; cannot place claim bar.');
  return html.replace(/<\/body>/i, claimBarHtml(url) + '</body>');
}

// CLI: node tools/claim-bar.mjs prospects/*/index.html
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const url = claimUrl();
  let n = 0;
  for (const f of process.argv.slice(2)) {
    fs.writeFileSync(f, addClaimBar(fs.readFileSync(f, 'utf8'), url));
    n++;
  }
  console.log(`Claim bar added to ${n} file(s).`);
}
