/* Pickup ordering widget (static, no payments). Reads #order-data JSON:
 * { site, name, phone, email?, endpoint?, orderUrl?, sample?, menu: [{ section, items: [{ id?, name, desc?, price?, options?: [{ name, required?, multi?, choices: [{ label, price? }] }] }] }] }
 * Cart lives in localStorage. Submit: POST JSON to endpoint (https form service), else mailto email.
 * Nothing is charged: the customer pays at pickup. */
(function () {
  'use strict';
  var dataEl = document.getElementById('order-data');
  var root = document.getElementById('order-app');
  if (!dataEl || !root) return;
  var D = JSON.parse(dataEl.textContent);
  var KEY = 'pickup-cart:' + (D.site || location.pathname);
  var money = function (n) { return '$' + n.toFixed(2); };
  var num = function (p) { var m = String(p == null ? '' : p).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
  var el = function (tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') e.textContent = attrs[k]; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  };
  var items = {};
  D.menu.forEach(function (s, si) { s.items.forEach(function (it, ii) { it.id = it.id || ('i' + si + '-' + ii); items[it.id] = it; }); });
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { cart = []; }
  cart = cart.filter(function (l) { return items[l.id]; });
  var save = function () { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} render(); };
  var unitPrice = function (l) {
    var p = num(items[l.id].price); if (p == null) return null;
    (l.opts || []).forEach(function (o) { var c = num(o.price); if (c) p += c; });
    return p;
  };
  var live = el('p', { class: 'order-live', 'aria-live': 'polite', role: 'status' });

  // ----- menu -----
  var menuWrap = el('div', { class: 'order-menu' });
  D.menu.forEach(function (s) {
    var sec = el('div', { class: 'panel order-section' }, [el('h3', { text: s.section })]);
    s.items.forEach(function (it) {
      sec.appendChild(el('div', { class: 'order-item' }, [
        el('div', {}, [el('strong', { text: it.name }), it.desc ? el('p', { text: it.desc }) : null]),
        el('div', { class: 'order-item-act' }, [
          it.price ? el('span', { class: 'menu-price', text: it.price }) : null,
          el('button', { type: 'button', class: 'btn btn-accent order-add', 'data-id': it.id, 'aria-label': 'Add ' + it.name, text: 'Add', onclick: function () { addItem(it); } }),
        ]),
      ]));
    });
    menuWrap.appendChild(sec);
  });

  // ----- options dialog -----
  var dlg = el('dialog', { class: 'order-dialog', 'aria-labelledby': 'order-dlg-title' });
  document.body.appendChild(dlg);
  function addItem(it) {
    if (!it.options || !it.options.length) { pushLine(it, []); return; }
    dlg.innerHTML = '';
    var form = el('form', { method: 'dialog' });
    form.appendChild(el('h3', { id: 'order-dlg-title', text: it.name }));
    it.options.forEach(function (o, oi) {
      var fs = el('fieldset', {}, [el('legend', { text: o.name + (o.required ? ' (required)' : '') })]);
      o.choices.forEach(function (c, ci) {
        var id = 'opt-' + oi + '-' + ci;
        var input = el('input', { type: o.multi ? 'checkbox' : 'radio', name: 'o' + oi, id: id, value: String(ci) });
        if (!o.multi && o.required && ci === 0) input.checked = true;
        fs.appendChild(el('label', { for: id, class: 'order-choice' }, [input, document.createTextNode(' ' + c.label + (c.price ? ' (+' + c.price.replace(/^\+/, '') + ')' : ''))]));
      });
      form.appendChild(fs);
    });
    var err = el('p', { class: 'order-error', role: 'alert' });
    form.appendChild(err);
    form.appendChild(el('div', { class: 'order-dialog-actions' }, [
      el('button', { type: 'button', class: 'btn btn-ghost-dark', text: 'Cancel', onclick: function () { dlg.close(); } }),
      el('button', { type: 'submit', class: 'btn btn-accent order-confirm', text: 'Add to order' }),
    ]));
    form.addEventListener('submit', function (e) {
      var opts = []; var missing = null;
      it.options.forEach(function (o, oi) {
        var picked = [].slice.call(form.querySelectorAll('input[name="o' + oi + '"]:checked'));
        if (o.required && !picked.length) missing = o.name;
        picked.forEach(function (p) { var c = o.choices[+p.value]; opts.push({ group: o.name, label: c.label, price: c.price || null }); });
      });
      if (missing) { e.preventDefault(); err.textContent = 'Choose ' + missing + '.'; return; }
      pushLine(it, opts);
    });
    dlg.appendChild(form);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    var first = form.querySelector('input'); if (first) first.focus();
  }
  function pushLine(it, opts) {
    var sig = it.id + '|' + JSON.stringify(opts);
    var ex = cart.filter(function (l) { return l.sig === sig; })[0];
    if (ex) ex.qty++; else cart.push({ id: it.id, sig: sig, qty: 1, opts: opts });
    live.textContent = it.name + ' added to your order.';
    save();
  }

  // ----- cart / summary -----
  var cartPanel = el('div', { class: 'panel order-cart', id: 'order-cart', tabindex: '-1' });
  var list = el('ul', { class: 'order-lines' });
  var totalEl = el('p', { class: 'order-total' });
  var today = new Date();
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
  var date = el('input', { type: 'date', id: 'order-date', min: iso, value: iso, required: '' });
  var time = el('input', { type: 'time', id: 'order-time', step: '900', required: '' });
  var nameIn = el('input', { type: 'text', id: 'order-name', autocomplete: 'name', required: '' });
  var phoneIn = el('input', { type: 'tel', id: 'order-phone', autocomplete: 'tel', required: '' });
  var notes = el('textarea', { id: 'order-notes', rows: '2' });
  var summary = el('div', { class: 'order-summary', hidden: '' });
  var msg = el('p', { class: 'order-msg', role: 'status', 'aria-live': 'polite' });
  var lbl = function (f, t) { return el('label', { for: f, text: t }); };
  var form = el('form', { class: 'lib-form order-form', novalidate: '' }, [
    lbl('order-date', 'Pickup date'), date, lbl('order-time', 'Pickup time'), time,
    lbl('order-name', 'Name'), nameIn, lbl('order-phone', 'Phone'), phoneIn, lbl('order-notes', 'Notes (optional)'), notes,
    el('button', { type: 'submit', class: 'btn btn-accent order-review', text: 'Review order' }),
  ]);
  cartPanel.appendChild(el('h3', { text: 'Your order' }));
  cartPanel.appendChild(list); cartPanel.appendChild(totalEl);
  cartPanel.appendChild(el('p', { class: 'lib-note', text: 'Pay at pickup. No payment is taken on this page.' }));
  cartPanel.appendChild(form); cartPanel.appendChild(summary); cartPanel.appendChild(msg);

  function lineText(l) {
    var it = items[l.id];
    return l.qty + ' × ' + it.name + (l.opts.length ? ' (' + l.opts.map(function (o) { return o.label; }).join(', ') + ')' : '');
  }
  function total() {
    var t = 0, known = true;
    cart.forEach(function (l) { var u = unitPrice(l); if (u == null) known = false; else t += u * l.qty; });
    return known ? t : null;
  }
  var bar = el('a', { class: 'order-bar', href: '#order-cart' });
  document.body.appendChild(bar);
  function render() {
    list.innerHTML = '';
    if (!cart.length) list.appendChild(el('li', { class: 'lib-note', text: 'Nothing added yet.' }));
    cart.forEach(function (l, i) {
      var u = unitPrice(l);
      list.appendChild(el('li', { class: 'order-line' }, [
        el('span', { text: lineText(l) + (u != null ? ' · ' + money(u * l.qty) : '') }),
        el('span', { class: 'order-qty' }, [
          el('button', { type: 'button', 'aria-label': 'Remove one ' + items[l.id].name, text: '−', onclick: function () { l.qty--; if (!l.qty) cart.splice(i, 1); live.textContent = items[l.id].name + ' removed.'; save(); } }),
          el('button', { type: 'button', 'aria-label': 'Add one more ' + items[l.id].name, text: '+', onclick: function () { l.qty++; save(); } }),
        ]),
      ]));
    });
    var t = total();
    var count = cart.reduce(function (a, l) { return a + l.qty; }, 0);
    totalEl.textContent = cart.length ? (t != null ? 'Estimated total: ' + money(t) + ' (pay at pickup)' : 'Total confirmed at pickup') : '';
    bar.textContent = 'View order · ' + count + ' item' + (count === 1 ? '' : 's') + (t != null && count ? ' · ' + money(t) : '');
    bar.hidden = !count;
    document.body.classList.toggle('has-order-bar', count > 0);
    summary.hidden = true;
  }

  function orderText() {
    var t = total();
    return ['Pickup order for ' + D.name, '', cart.map(lineText).join('\n'), '',
      t != null ? 'Estimated total: ' + money(t) + ' (pay at pickup)' : 'Total: confirm at pickup',
      'Pickup: ' + date.value + ' ' + time.value, 'Name: ' + nameIn.value, 'Phone: ' + phoneIn.value,
      notes.value ? 'Notes: ' + notes.value : ''].join('\n').trim();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.textContent = '';
    var problem = !cart.length ? 'Add at least one item.' : !date.value || !time.value ? 'Choose a pickup date and time.' : !nameIn.value || !phoneIn.value ? 'Enter your name and phone.' : '';
    if (!problem && new Date(date.value + 'T' + time.value) < new Date()) problem = 'Choose a pickup time later than now.';
    if (problem) { msg.textContent = problem; return; }
    summary.innerHTML = '';
    summary.appendChild(el('h4', { text: 'Order summary' }));
    summary.appendChild(el('pre', { class: 'order-pre', text: orderText() }));
    var send = el('button', { type: 'button', class: 'btn btn-accent order-send', text: D.endpoint ? 'Send order' : D.email ? 'Email this order' : 'Call to place order' });
    send.addEventListener('click', submit);
    summary.appendChild(send);
    summary.hidden = false;
    summary.querySelector('h4').setAttribute('tabindex', '-1'); summary.querySelector('h4').focus();
  });
  function submit() {
    var text = orderText();
    if (D.endpoint) {
      msg.textContent = 'Sending…';
      fetch(D.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ _subject: 'Pickup order', order: text, name: nameIn.value, phone: phoneIn.value, pickup: date.value + ' ' + time.value }) })
        .then(function (r) { if (!r.ok) throw 0; msg.textContent = 'Order sent. Pay at pickup. Call ' + D.phone + ' with any changes.'; cart = []; save(); })
        .catch(function () { msg.textContent = 'Could not send the order. Please call ' + D.phone + '.'; });
    } else if (D.email) {
      location.href = 'mailto:' + D.email + '?subject=' + encodeURIComponent('Pickup order') + '&body=' + encodeURIComponent(text);
      msg.textContent = 'Your email app should open with the order filled in. Pay at pickup.';
    } else {
      msg.textContent = 'This mockup does not send orders yet. Please call ' + D.phone + '.';
    }
  }

  var grid = el('div', { class: 'order-grid' }, [menuWrap, cartPanel]);
  root.appendChild(grid);
  root.appendChild(live);
  render();
})();
