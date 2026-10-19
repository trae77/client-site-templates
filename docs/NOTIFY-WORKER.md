# Lead alerts by email and text (spec v4 B1)

**Default (free, included):** the form posts to the client's own Web3Forms or Formspree form and the owner gets an email per lead. Build with `--money <type> --money-endpoint https://...` (or `--notify email --notify-endpoint https://...`).

**Add-on "Text me new leads":** the owner also gets an SMS for each lead. Texting needs a paid SMS provider (for example Twilio, billed per message; check the provider's current pricing with the client) **and server code to keep the API key secret**. Our pages are static, so the form posts straight to a small **Cloudflare Worker** in the client's Cloudflare account. The Worker forwards the lead by email and text. (Web3Forms/Formspree webhooks are paid features, so posting directly to the Worker is simpler.)

```bash
npm run mockup -- --trade plumbing ... --money emergency-request \
  --notify sms --notify-endpoint https://leads.<client>.workers.dev
```
- `--notify email|sms|both` (default `email`). `sms` or `both` **without** `--notify-endpoint` stops the build (exit 1) with a message pointing here.
- Forms get a hidden honeypot field (`_gotcha`) and `data-notify="<mode>"`. The thank-you line reads "We got it. {name} will reply by phone or text." There's no response-time promise (the claim check would flag one).
- If the endpoint fails, the visitor sees the "please call" fallback with the phone number.
- No SMS *verification* of visitors: it adds friction and per-message cost. Only offer it if a client asks.

## The Worker (reference code; nothing is deployed or signed up for by this repo)
Created in the **client's** Cloudflare account, with secrets set there by the client or with them present. Workers have a free daily request allowance that is far above a small business's form volume; check Cloudflare's current Workers limits.

```js
// worker.js. Secrets: TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, OWNER_SMS (E.164, e.g. +15555550123),
// and EMAIL_ENDPOINT (the client's Web3Forms/Formspree endpoint, used to forward the email copy).
// ALLOWED_ORIGIN = the live site, e.g. https://www.clientdomain.com
export default {
  async fetch(req, env) {
    const cors = { 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type, Accept' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || req.headers.get('Origin') !== env.ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403 });
    let lead; try { lead = await req.json(); } catch { return new Response('Bad request', { status: 400, headers: cors }); }
    if (lead._gotcha) return Response.json({ ok: true }, { headers: cors });           // honeypot: drop bots quietly
    const clean = Object.fromEntries(Object.entries(lead).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, String(v).slice(0, 500)]));
    const text = `New lead: ${clean.name || ''} ${clean.phone || ''}\n${Object.entries(clean).filter(([k]) => !['name', 'phone'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('\n')}`.slice(0, 600);
    const jobs = [];
    if (env.EMAIL_ENDPOINT) jobs.push(fetch(env.EMAIL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ _subject: lead._subject || 'New website lead', ...clean }) }));
    if (env.TWILIO_SID && env.OWNER_SMS) jobs.push(fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Messages.json`, {
      method: 'POST', headers: { Authorization: 'Basic ' + btoa(`${env.TWILIO_SID}:${env.TWILIO_TOKEN}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: env.OWNER_SMS, From: env.TWILIO_FROM, Body: text }) }));
    const results = await Promise.allSettled(jobs);
    const ok = results.some((r) => r.status === 'fulfilled' && r.value.ok);
    return Response.json({ ok }, { status: ok ? 200 : 502, headers: cors });
  },
};
```
Deploy (client's account): `npx wrangler deploy`, then `npx wrangler secret put TWILIO_TOKEN` (and the rest). Test from a phone before launch, then confirm the email and text both arrive. US texting from an app number usually needs the provider's A2P 10DLC registration; budget time for it.
