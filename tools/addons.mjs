// Spec v4 Part B add-ons. All opt-in; nothing changes without the flags.
// B1 --notify / --notify-endpoint · B2 --booking-provider (embed allow-list + link fallback) · B3 --pay-label/--pay-context/--pay-demo

/** B2: booking providers and the only hosts each may embed/link. */
export const BOOKING_HOSTS = {
  calendly: ['calendly.com'],
  square: ['squareup.com', 'square.site', 'book.squareup.com', 'app.squareup.com'],
  tidycal: ['tidycal.com'],
  fresha: ['fresha.com'],
};
BOOKING_HOSTS.link = [...new Set(Object.values(BOOKING_HOSTS).flat())];
const hostOk = (host, list) => list.some((h) => host === h || host.endsWith('.' + h));

export function validateBooking(provider, rawUrl) {
  if (!BOOKING_HOSTS[provider]) throw new Error(`--booking-provider must be one of: ${Object.keys(BOOKING_HOSTS).join(', ')}`);
  if (!rawUrl) throw new Error('--booking-provider needs --booking-url (the client\'s own booking page).');
  const u = new URL(rawUrl);
  const host = u.hostname.toLowerCase();
  if (!hostOk(host, BOOKING_HOSTS[provider])) throw new Error(`--booking-url host "${host}" is not allowed for --booking-provider ${provider} (allowed: ${BOOKING_HOSTS[provider].join(', ')}).`);
  return { provider, url: u.toString(), embed: provider !== 'link' };
}

/** Booking panel: lazy iframe (created on click) + an always-visible new-tab link. */
export function bookingEmbedHtml({ url, embed, provider }, phone, esc) {
  const link = `<a class="btn btn-accent" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open booking in a new tab</a>`;
  if (!embed) return `<div class="panel"><p>Pick a time online, or call ${phone}.</p><p>${link}</p></div>`;
  const label = { calendly: 'Calendly', square: 'Square', tidycal: 'TidyCal', fresha: 'Fresha' }[provider];
  return `<div class="panel booking-embed" data-booking-src="${esc(url)}"><p>Pick a time online, or call ${phone}.</p><p><button class="btn btn-primary" type="button" data-booking-load>Show booking calendar</button> ${link}</p><div class="booking-frame" hidden></div><noscript><p>${link}</p></noscript></div>
<script>document.querySelectorAll('[data-booking-load]').forEach(function(b){b.addEventListener('click',function(){var w=b.closest('.booking-embed'),f=w.querySelector('.booking-frame');if(!f.firstChild){var i=document.createElement('iframe');i.src=w.getAttribute('data-booking-src');i.title=${JSON.stringify(`Booking calendar (${label})`)};i.loading='lazy';i.referrerPolicy='strict-origin-when-cross-origin';f.appendChild(i);}f.hidden=false;b.hidden=true;});});</script>`;
}
export const BOOKING_CSS = `.booking-frame iframe { width: 100%; min-height: 680px; border: 0; border-radius: 12px; background: #fff; }\n`;

/** B1: --notify email|sms|both. sms/both must have a Worker endpoint (the build fails otherwise). */
export function validateNotify(notify, endpoint, httpsOnly, smsAddon = false) {
  if (notify == null && endpoint == null) return null;
  const mode = notify || 'email';
  if (!['email', 'sms', 'both'].includes(mode)) throw new Error('--notify must be email, sms or both.');
  if (mode !== 'email' && !endpoint) throw new Error(`--notify ${mode} needs --notify-endpoint <https URL of the client's Cloudflare Worker>. Texting leads needs server code to hold the SMS key; see docs/NOTIFY-WORKER.md. Build stopped.`);
  if (mode !== 'email' && !smsAddon) throw new Error(`--notify ${mode} is the paid SMS add-on and is not built for clients by default (TCPA / 10DLC). Pass --sms-addon only after the client has paid and their 10DLC brand + campaign are approved (docs/NOTIFY-WORKER.md). Build stopped.`);
  return { mode, endpoint: endpoint ? httpsOnly('notify-endpoint', endpoint) : null };
}
export const HONEYPOT = '<div hidden aria-hidden="true"><label>Leave this empty <input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></label></div>';

/** B3: pay button label. Never an amount. */
export const PAY_CONTEXT_LABEL = { deposit: 'Pay Deposit', invoice: 'Pay Invoice', package: 'Book & Pay' };
export function payLabel(label, context) {
  if (context && !PAY_CONTEXT_LABEL[context]) throw new Error('--pay-context must be deposit, invoice or package.');
  const l = label != null ? String(label).trim() : (context ? PAY_CONTEXT_LABEL[context] : 'Pay');
  if (!l || l.length > 30) throw new Error('--pay-label must be 1-30 characters.');
  if (/[\d$€£¥]|usd|dollars?/i.test(l)) throw new Error('--pay-label rejected: no amounts or prices on the page. The amount lives in the Stripe Payment Link.');
  return l;
}
export const PAY_DEMO_HTML = '<div class="pay-options"><button class="btn btn-pay" type="button" disabled aria-disabled="true">Payment button (demo, not active)</button></div>';

/** SMS consent (TCPA): unchecked by default, never required to submit, STOP/HELP wording. */
export const SMS_CONSENT_HTML = (name) => `<label class="sms-consent"><input type="checkbox" name="sms_consent" value="yes"> <span>Text me about this request. By checking this box I agree to get text messages from ${name} about my request. Msg &amp; data rates may apply. Msg frequency varies. Reply STOP to opt out, HELP for help. Consent is not required to submit this form.</span></label>`;
