// Turn a tools/mockup.mjs build into a client PREVIEW: real services from the intake, no mockup or
// placeholder wording, no forms that do not send, no tracking pixel, noindex everywhere.
import fs from 'node:fs';
import path from 'node:path';
import { privacyHtml } from '../../tools/compliance.mjs';

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\$/g, '&#36;');
}
export function joinAreas(a) {
  if (a.length <= 1) return a.join('');
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`;
}
function telHref(phone) {
  const d = phone.replace(/\D/g, '');
  return `tel:+${d.length === 10 ? '1' + d : d}`;
}
function sentence(s) { s = String(s).trim(); return /[.!?]$/.test(s) ? s : s + '.'; }

export function finishHtml(html, f, { hasPhotos = false, hasForm = false } = {}) {
  let h = html;
  const name = esc(f.name);
  const areas = joinAreas(f.areas.map(esc));
  const tel = telHref(f.phone);
  const ways = ['call', f.text ? 'text' : '', f.email ? 'email' : ''].filter(Boolean);
  const contactWays = ways.length === 3 ? 'call, text, or email' : ways.join(' or ');
  const contactCap = contactWays.charAt(0).toUpperCase() + contactWays.slice(1);

  // Dev comments and the view pixel never ship.
  h = h.replace(/<!--(?!\[if)[\s\S]*?-->\n?/g, '');
  h = h.replace(/<img src="https:\/\/api\.ttawebdev\.com\/v\.gif[^>]*>\n?/g, '');
  h = h.replace(/[ \t]*<meta name="x-[a-z]+" content="[^"]*">\n/g, '');

  // noindex (preview only; export-client.mjs removes it at go-live).
  h = h.replace(/[ \t]*<meta name="robots"[^>]*>\n?/gi, '');
  h = h.replace(/(<meta name="viewport"[^>]*>)/, '$1\n  <meta name="robots" content="noindex, nofollow">');

  // Title + description from intake facts.
  const svcNames = f.services.map((s) => s.name);
  const lead = `${svcNames.slice(0, 3).join(', ')}${svcNames.length > 3 ? ', and more' : ''}`;
  h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${name} in ${esc(f.city)}: ${esc(lead.toLowerCase())}. Serving ${areas}. Call ${esc(f.phone)}.">`);

  // Hero lead + primary button.
  h = h.replace(/(<p class="lead">)[\s\S]*?(<\/p>)/, `$1Serving ${areas}. ${contactCap} for a quote: <a href="${tel}">${esc(f.phone)}</a>.$2`);
  h = h.replace(/(<a class="btn btn-primary" href=")[^"]*(">)[^<]*(<\/a>)/, `$1#services$2See Services$3`);

  // Services: the owner's list, verbatim.
  const cards = f.services.map((s, i) => `
          <article class="card">
            <div class="card-icon" aria-hidden="true">${String(i + 1).padStart(2, '0')}</div>
            <h3>${esc(s.name)}</h3>${s.desc ? `\n            <p>${esc(sentence(s.desc))}</p>` : ''}${s.price ? `\n            <p class="price"><strong>${esc(s.price)}</strong></p>` : ''}
          </article>`).join('');
  h = h.replace(/(<section id="services"[^>]*>[\s\S]*?<div class="section-head">\s*<h2[^>]*>[^<]*<\/h2>\s*)<p>[\s\S]*?<\/p>/, `$1<p>${f.services.some((x) => x.price) ? 'Prices for common jobs. Call for an exact quote.' : 'Call for a quote; prices depend on the job.'}</p>`);
  h = h.replace(/(<section id="services"[\s\S]*?<div class="cards">)[\s\S]*?(\n\s*<\/div>\n\s*<\/div>\n\s*<\/section>)/, `$1${cards}$2`);
  if (!/<section id="services"/.test(h)) throw new Error('finish: services section not found in template output');

  // About paragraph.
  h = h.replace(/(<h2 id="about-title">[^<]*<\/h2>\s*<p>)[\s\S]*?(<\/p>)/, `$1${name} offers ${esc(joinAreas(svcNames.map((x) => x.charAt(0).toLowerCase() + x.slice(1))))} in and around ${esc(f.city.replace(/,\s*[A-Z]{2}$/, ''))}. ${contactCap} to talk about your project.$2`);

  // JSON-LD offers = intake services.
  h = h.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (m, a, json, c) => {
    try {
      const d = JSON.parse(json);
      if (d.makesOffer) d.makesOffer = f.services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.name, ...(s.desc ? { description: s.desc } : {}) } }));
      if (d.areaServed) d.areaServed = f.areas.map((x) => ({ '@type': 'City', name: x }));
      return a + JSON.stringify(d).replace(/</g, '\\u003c') + c;
    } catch { return m; }
  });

  // Gallery / before-after placeholders: removed unless the owner sent photos.
  if (!hasPhotos) {
    h = h.replace(/\n?[ \t]*<section id="(gallery|before-after|beforeafter)"[\s\S]*?<\/section>\n?/g, '\n');
    h = h.replace(/\n[ \t]*<a href="#(gallery|before-after|beforeafter)">[^<]*<\/a>/g, '');
    h = h.replace(/<a href="#(gallery|before-after|beforeafter)">[^<]*<\/a>/g, '');
  }

  // Contact: no form that does not send. Direct call / text / email instead.
  if (!hasForm) {
    h = h.replace(/\n?[ \t]*<div class="contact-card">\s*<h3>Send a message<\/h3>[\s\S]*?<\/form>(<p class="form-consent">[\s\S]*?<\/p>)?\s*<\/div>/, '');
    h = h.replace(/(<h2 id="contact-title">[^<]*<\/h2>\s*<p>)[^<]*(<\/p>)/, `$1${ways.length === 1 ? `Call ${esc(f.phone)}.` : `${contactCap}.`}$2`);
    const btns = [`<a class="btn btn-accent" href="${tel}">Call ${esc(f.phone)}</a>`];
    if (f.text) btns.push(`<a class="btn btn-ghost-dark" href="sms:${tel.slice(4)}">Text us</a>`);
    if (f.email) btns.push(`<a class="btn btn-ghost-dark" href="mailto:${esc(f.email)}">Email us</a>`);
    h = h.replace(/<p style="margin-top:1\.25rem">\s*<a class="btn btn-accent" href="tel:[^"]*">[^<]*<\/a>\s*<\/p>/, `<p class="kit-contact-actions">${btns.join(' ')}</p>`);
    h = h.replace(/(<a class="cb-alt cb-money" href=")#contact(">)Message(<\/a>)/, f.email ? `$1mailto:${esc(f.email)}$2Email$3` : `$1#contact$2Contact$3`);
  }
  h = h.replace(/(<li><strong>Service area:<\/strong> )[^<]*(<\/li>)/, `$1${areas}$2`);
  if (!f.hours) h = h.replace(/\n?[ \t]*<div>\s*<h4>Hours<\/h4>[\s\S]*?<\/div>/, '');

  // Footer: one privacy link, no "mockup / template" tag, no double periods after "Co."
  h = h.replace(/(<span><a href="privacy\.html">Privacy Policy<\/a><\/span>\s*)+/g, '<span><a href="privacy.html">Privacy Policy</a></span>\n      ');
  h = h.replace(/\n?[ \t]*<span>[^<]*(mockup|design concept|Template|customize)[^<]*<\/span>/gi, '');
  h = h.replace(/(\w)\.\. /g, '$1. ');
  h = h.replace('</head>', '  <style>html{scroll-padding-top:96px}section[id]{scroll-margin-top:96px}.kit-contact-actions{margin-top:1.25rem;display:flex;flex-wrap:wrap;gap:.75rem}.btn-ghost-dark{border:2px solid currentColor;color:var(--primary,#1f2937);background:transparent}</style>\n</head>');
  return h;
}

export function finishSite(dir, f, opts = {}) {
  const idx = path.join(dir, 'index.html');
  fs.writeFileSync(idx, finishHtml(fs.readFileSync(idx, 'utf8'), f, opts));
  let priv = privacyHtml({ name: f.name, phone: f.phone, email: f.email, city: f.city, mockup: false });
  if (!opts.hasForm) {
    const ways = ['call', f.text ? 'text' : '', f.email ? 'email' : ''].filter(Boolean);
    const how = ways.length === 3 ? 'call, text, or email' : ways.join(' or ');
    priv = priv
      .replace(/collects through this website and how it is used\./, 'does with the information you send when you contact us.')
      .replace(/<p>Only what you type into a form on this site[^<]*<\/p>/, `<p>This site has no forms and does not collect information on its own. When you ${how} us, we keep what you send, such as your name, phone number, email, address, and details about the job. We don't use analytics or advertising trackers on this site.</p>`)
      .replace(/<p>Form messages pass through the service that delivers them to us[^<]*?\)\./, `<p>Calls${f.text ? ', texts,' : ''} and emails pass through our phone and email providers.`)
      .replace(/We only text you if you ask us to or tick a box agreeing to it\./, 'We only text you to answer a text you sent us or when you ask us to.');
  }
  priv = priv.replace(/<p>Some pages may load fonts or a map from outside providers\. Those providers may see/, '<p>This site loads its fonts from Google Fonts. Google may see');
  priv = priv.replace(/[ \t]*<meta name="robots"[^>]*>\n?/gi, '').replace(/(<meta name="viewport"[^>]*>)/, '$1\n  <meta name="robots" content="noindex, nofollow">');
  fs.writeFileSync(path.join(dir, 'privacy.html'), priv);
  const js = path.join(dir, 'script.js');
  if (fs.existsSync(js)) fs.writeFileSync(js, fs.readFileSync(js, 'utf8').replace(/^\/\*.*customize.*\*\/\n/im, '/* Mobile nav */\n'));
  fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  fs.writeFileSync(path.join(dir, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
  fs.rmSync(path.join(dir, 'build.json'), { force: true });
}
