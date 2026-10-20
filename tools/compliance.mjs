// Compliance pass for one-page sites (compliance audit 2026-10-19, items 2, 3, 4).
// Adds: skip link, prefers-reduced-motion, underlined body links, a footer Privacy Policy link,
// and a consent line under every form that collects contact details. privacyHtml() writes privacy.html.
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const CONSENT_LINE = `<p class="form-consent">We'll only use this to reply to your request. See our <a href="privacy.html">Privacy Policy</a>.</p>`;

export const A11Y_CSS = `
/* a11y base (ported from multipage-template src/public/base.css) */
.skip-link { position: absolute; left: -9999px; top: 0; background: #fff; color: #000; padding: .6rem 1rem; z-index: 10000; font-weight: 700; }
.skip-link:focus { left: .5rem; top: .5rem; }
main p a:not(.btn), main li a:not(.btn), main dd a:not(.btn), .lib-note a, .form-consent a, .site-footer p a, .footer-bottom a { text-decoration: underline; text-underline-offset: 2px; }
/* Body-text links use the text color (always >= 4.5:1) and are told apart by the underline, not color. */
main p a:not(.btn):not([class*="btn"]), main li a:not(.btn):not([class*="btn"]), .lib-note a { color: inherit; }
/* Number chips: text color on the tinted chip passes on every palette and theme. */
.card-icon { color: var(--text) !important; }
.form-consent a { color: inherit; }
.form-consent { font-size: .85rem; margin: .5rem 0 0; }
.sms-consent { display: flex; gap: .5rem; align-items: flex-start; font-size: .85rem; font-weight: 400; margin: .5rem 0; }
.sms-consent input { width: auto; min-height: 0; margin-top: .2rem; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
`;

// Forms that only check a ZIP or filter listings don't collect contact details.
const SKIP_FORM = /class="[^"]*\b(zip-check|m-filters|listing-filter|order-search)\b/;

export function applyCompliance(html, { privacyHref = 'privacy.html' } = {}) {
  let out = html;
  if (!/class="skip-link"/.test(out)) {
    const mainId = (out.match(/<main\b[^>]*\bid="([^"]+)"/) || [])[1];
    if (!mainId) out = out.replace(/<main\b/, '<main id="main"');
    const id = mainId || 'main';
    out = out.replace(/(<body\b[^>]*>)/, `$1\n  <a class="skip-link" href="#${id}">Skip to content</a>`);
  }
  // consent line after every contact-collecting form
  out = out.replace(/(<form\b[^>]*>)([\s\S]*?<\/form>)(?!\s*<p class="form-consent")/g, (m, open, rest) => {
    if (SKIP_FORM.test(open)) return m;
    if (!/<(input|textarea)\b(?![^>]*type="(hidden|checkbox|radio|search)")/.test(rest)) return m;
    return `${open}${rest}${CONSENT_LINE.replace('privacy.html', privacyHref)}`;
  });
  if (!/href="[^"]*privacy\.html"/.test(out.split('<footer')[1] || '')) {
    out = out.replace(/(<div class="[^"]*footer-bottom[^"]*">)/, `$1\n      <span><a href="${privacyHref}">Privacy Policy</a></span>`);
    if (!/footer-bottom/.test(out)) out = out.replace(/<\/footer>/, `  <p class="footer-privacy"><a href="${privacyHref}">Privacy Policy</a></p>\n  </footer>`);
  }
  return out;
}

/** privacy.html: plain policy for a small business lead form. Facts only; the business reviews it before launch. */
export function privacyHtml({ name, phone, email, city, css = 'styles.css', mockup = true }) {
  const n = esc(name || 'This business');
  const contact = [email && `<a href="mailto:${esc(email)}">${esc(email)}</a>`, phone && esc(phone)].filter(Boolean).join(' or ') || 'the phone number on our home page';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy · ${n}</title>
  <meta name="robots" content="noindex">
  <link rel="stylesheet" href="${css}">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <main id="main" class="container" style="max-width:46rem;padding:2rem 1rem 4rem">
    <p><a href="index.html">← Back to ${n}</a></p>
    <h1>Privacy Policy</h1>
    ${mockup ? '<p class="lib-note"><strong>Template.</strong> The business must review and edit this page before the site goes live.</p>' : ''}
    <p>This page explains what ${n}${city ? ` (${esc(city)})` : ''} collects through this website and how it is used.</p>
    <h2>What we collect</h2>
    <p>Only what you type into a form on this site, such as your name, phone number, email, address or ZIP code, and details about your request. We don't use analytics or advertising trackers on this site.</p>
    <h2>Why we collect it</h2>
    <p>To reply to your request, give you an estimate, schedule work, or follow up on a job you asked about. We don't use it for anything else.</p>
    <h2>Who we share it with</h2>
    <p>Form messages pass through the service that delivers them to us (for example, our form or email provider). We don't sell or rent your information, and we don't share it for marketing.</p>
    <h2>Text messages</h2>
    <p>We only text you if you ask us to or tick a box agreeing to it. Reply STOP to opt out at any time, or HELP for help. Message and data rates may apply.</p>
    <h2>How long we keep it</h2>
    <p>As long as needed to handle your request and keep normal business records, then we delete it.</p>
    <h2>Your choices</h2>
    <p>To see, correct, or delete what you sent us, contact ${contact}.</p>
    <h2>Third-party content</h2>
    <p>Some pages may load fonts or a map from outside providers. Those providers may see your IP address, as with any website.</p>
    <p><small>Last updated: ${mockup ? '(the business sets this date at launch)' : new Date().toISOString().slice(0, 10)}</small></p>
  </main>
</body>
</html>
`;
}
