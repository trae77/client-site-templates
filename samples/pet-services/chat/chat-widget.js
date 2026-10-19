/*! Zero-cost chat widget for client-site-templates. No dependencies, no API key.
 * Answers ONLY from the per-site facts file (default: chat-facts.json next to the page).
 * Usage: <link rel="stylesheet" href="chat/chat-widget.css">
 *        <script src="chat/chat-widget.js" data-facts="chat-facts.json" defer></script>
 * Optional LLM hook (off by default; nothing is called unless you set it):
 *   window.ChatWidgetConfig = { answerHook: async (question, facts) => "text" | null };
 *   or { endpoint: "https://your-server/chat" }  // POST {question, facts} -> {answer}
 * A hook answer of null/empty falls back to the built-in facts-only rules. */
(function () {
  'use strict';
  var cfg = window.ChatWidgetConfig || {};
  var me = document.currentScript;
  var factsUrl = cfg.factsUrl || (me && me.getAttribute('data-facts')) || 'chat-facts.json';
  var F = null, uid = 'cw' + Math.random().toString(36).slice(2, 7);
  var STOP = 'a an and are can could do does for from have how i in is it me my of on or our please the there this to we what when where which who will with would you your yours about any get do'.split(' ');
  var GENERIC = 'service services install installs installation installations repair repairs work job jobs other more much new home'.split(' ');

  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function stem(w) { return w.length > 4 && /s$/.test(w) && !/ss$/.test(w) ? w.replace(/(ies)$/, 'y').replace(/s$/, '') : w; }
  function toks(s) { return norm(s).split(' ').filter(function (w) { return w && STOP.indexOf(w) < 0; }).map(stem); }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function callLine() {
    if (F.phone) return 'Please call ' + F.name + ' at ' + F.phone + '.';
    if (F.email) return 'Please email ' + F.name + ' at ' + F.email + '.';
    return 'Please contact ' + F.name + ' directly.';
  }
  function list(a) { return a.length < 3 ? a.join(' and ') : a.slice(0, -1).join(', ') + ', and ' + a[a.length - 1]; }
  function svcName(s) { return typeof s === 'string' ? s : s.name; }

  function bestFaq(q) {
    var qt = toks(q), best = null, top = 0;
    (F.faq || []).forEach(function (f) {
      var ft = toks(f.q); if (!ft.length || !qt.length) return;
      var hit = ft.filter(function (w) { return qt.indexOf(w) >= 0; }).length;
      var score = hit / Math.max(ft.length, qt.length);
      if (score > top) { top = score; best = f; }
    });
    return top >= 0.5 ? best : null;
  }
  function matchServices(q) {
    var qt = toks(q).filter(function (w) { return GENERIC.indexOf(w) < 0; });
    return (F.services || []).filter(function (s) {
      var st = toks(svcName(s) + ' ' + (s.keywords || []).join(' ')).filter(function (w) { return GENERIC.indexOf(w) < 0; });
      return st.some(function (w) { return qt.indexOf(w) >= 0; });
    });
  }

  /* Facts-only rules. Never invents prices, hours, promises, or claims. */
  function answer(q) {
    var n = norm(q), faq = bestFaq(q);
    if (faq) return faq.a;
    if (/\b(price|prices|pricing|cost|costs|how much|charge|charges|rate|rates|fee|fees|quote|quotes|estimate|estimates|cheap|expensive)\b/.test(n))
      return 'I can\'t give prices here. ' + callLine();
    if (/\b(hour|hours|open|opening|close|closed|closing|weekend|weekends|saturday|sunday|today|tonight|available|availability|emergency|24 7)\b/.test(n))
      return F.hours ? F.name + ' lists these hours: ' + F.hours + '. For anything else, ' + callLine().charAt(0).toLowerCase() + callLine().slice(1)
                     : 'Hours aren\'t listed here. ' + callLine();
    if (/\b(area|areas|serve|serving|service area|where|located|location|near|travel|come to|town|towns|city|county)\b/.test(n))
      return (F.areas && F.areas.length ? F.name + ' serves ' + list(F.areas) + '. ' : '') + 'To confirm your address, ' + callLine().charAt(0).toLowerCase() + callLine().slice(1);
    var hits = matchServices(q);
    if (hits.length) return F.name + ' lists ' + list(hits.map(svcName)) + ' among its services. For details on your job, ' + callLine().charAt(0).toLowerCase() + callLine().slice(1);
    if (/\b(services|offer|what do you do|what can you do|kind of work)\b/.test(n) && F.services && F.services.length)
      return F.name + ' lists: ' + list(F.services.map(svcName)) + '. ' + callLine();
    if (/\b(phone|number|call|email|contact|reach|text)\b/.test(n))
      return [F.phone && 'Phone: ' + F.phone, F.email && 'Email: ' + F.email].filter(Boolean).join(' · ') || callLine();
    if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(n))
      return 'Hi! Ask about ' + F.name + '\'s services or service area, or leave your details below.';
    return 'I don\'t have that information. ' + callLine();
  }

  function build() {
    var root = el('div', { class: 'cw', 'data-open': 'false' });
    var btn = el('button', { class: 'cw-bubble', type: 'button', 'aria-expanded': 'false', 'aria-controls': uid, 'aria-label': 'Open chat: questions for ' + F.name });
    btn.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></svg>';
    var panel = el('div', { class: 'cw-panel', id: uid, role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': uid + 't', hidden: '' });
    var head = el('div', { class: 'cw-head' });
    head.appendChild(el('h2', { id: uid + 't' }, F.name));
    var x = el('button', { class: 'cw-x', type: 'button', 'aria-label': 'Close chat' }, '\u00d7');
    head.appendChild(x);
    var note = el('p', { class: 'cw-note' }, 'Automated answers from this page only. ' + (F.phone ? 'For anything else call ' + F.phone + '.' : ''));
    var log = el('div', { class: 'cw-log', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    var form = el('form', { class: 'cw-ask' });
    var inp = el('input', { type: 'text', id: uid + 'q', autocomplete: 'off', placeholder: 'Ask a question', 'aria-label': 'Your question', maxlength: '300' });
    form.appendChild(inp); form.appendChild(el('button', { type: 'submit' }, 'Send'));
    var leadBtn = el('button', { class: 'cw-leadbtn', type: 'button', 'aria-expanded': 'false', 'aria-controls': uid + 'l' }, 'Leave your contact details');
    var lead = el('form', { class: 'cw-lead', id: uid + 'l', hidden: '' });
    [['n', 'Name', 'text', 'name'], ['p', 'Phone', 'tel', 'tel'], ['e', 'Email', 'email', 'email']].forEach(function (f) {
      var id = uid + f[0]; lead.appendChild(el('label', { for: id }, f[1]));
      lead.appendChild(el('input', { id: id, type: f[2], autocomplete: f[3] }));
    });
    lead.appendChild(el('label', { for: uid + 'm' }, 'What do you need? (optional)'));
    lead.appendChild(el('textarea', { id: uid + 'm', rows: '2' }));
    var err = el('p', { class: 'cw-err', role: 'alert' });
    lead.appendChild(err);
    lead.appendChild(el('button', { type: 'submit' }, F.email ? 'Open email to send' : 'Show phone number'));
    lead.appendChild(el('p', { class: 'cw-fine' }, F.email ? 'Nothing is sent from this page. Your email app opens with the message filled in, and it is only sent when you press Send there.' : 'Nothing is sent from this page. Call to share your details.'));
    var out = el('div', { class: 'cw-out', 'aria-live': 'polite' });
    lead.appendChild(out);
    [head, note, log, form, leadBtn, lead].forEach(function (c) { panel.appendChild(c); });
    root.appendChild(panel); root.appendChild(btn);
    document.body.appendChild(root);

    function say(who, text) { var m = el('p', { class: 'cw-msg cw-' + who }, text); log.appendChild(m); log.scrollTop = log.scrollHeight; }
    function open(v) {
      root.setAttribute('data-open', String(v)); btn.setAttribute('aria-expanded', String(v));
      btn.setAttribute('aria-label', (v ? 'Close' : 'Open') + ' chat: questions for ' + F.name);
      if (v) { panel.hidden = false; if (!log.childNodes.length) say('bot', 'Hi! Ask about ' + F.name + '\'s services or service area.'); inp.focus(); }
      else { panel.hidden = true; btn.focus(); }
    }
    btn.addEventListener('click', function () { open(panel.hidden); });
    x.addEventListener('click', function () { open(false); });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); open(false); } });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var q = inp.value.trim(); if (!q) return; inp.value = ''; say('me', q);
      respond(q).then(function (a) { say('bot', a); });
    });
    leadBtn.addEventListener('click', function () {
      lead.hidden = !lead.hidden; leadBtn.setAttribute('aria-expanded', String(!lead.hidden));
      if (!lead.hidden) document.getElementById(uid + 'n').focus();
    });
    lead.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (k) { return document.getElementById(uid + k).value.trim(); };
      var name = v('n'), ph = v('p'), em = v('e'), msg = v('m');
      out.textContent = '';
      if (!name || (!ph && !em)) { err.textContent = 'Please add your name and a phone or email.'; return; }
      err.textContent = '';
      if (F.email) {
        var body = 'Name: ' + name + '\nPhone: ' + (ph || '-') + '\nEmail: ' + (em || '-') + '\n\n' + (msg || '');
        var href = 'mailto:' + F.email + '?subject=' + encodeURIComponent('Website inquiry from ' + name) + '&body=' + encodeURIComponent(body);
        var a = el('a', { href: href, class: 'cw-cta' }, 'Open my email app');
        out.appendChild(el('p', null, 'Not sent yet. Opening your email app now. Press Send there to deliver it. If nothing opens, use this link:'));
        out.appendChild(a);
        try { window.location.href = href; } catch (_) {}
      } else if (F.phone) {
        out.appendChild(el('p', null, 'Nothing was sent. Please call and mention your name:'));
        out.appendChild(el('a', { href: 'tel:' + F.phone.replace(/[^\d+]/g, ''), class: 'cw-cta' }, 'Call ' + F.phone));
      }
    });
  }

  function respond(q) {
    var fallback = function () { return answer(q); };
    var hook = cfg.answerHook || (cfg.endpoint && function (question, facts) {
      return fetch(cfg.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question, facts: facts }) })
        .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { return j && j.answer; });
    });
    if (typeof hook !== 'function') return Promise.resolve(answer(q));
    return Promise.resolve().then(function () { return hook(q, F); })
      .then(function (a) { return a && String(a).trim() ? String(a) : fallback(); }, fallback);
  }

  function start(facts) { F = facts; if (!F || !F.name) return; F.services = F.services || []; F.areas = F.areas || []; build(); }
  window.ChatWidget = { answer: function (q) { return answer(q); } };
  var inline = document.getElementById('chat-facts');
  if (cfg.facts) start(cfg.facts);
  else if (inline) start(JSON.parse(inline.textContent));
  else fetch(factsUrl).then(function (r) { return r.json(); }).then(start).catch(function () {});
})();
