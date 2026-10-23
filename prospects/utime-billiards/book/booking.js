(() => {
const API = "https://utime-api.ttawebdev.com/booking";
const app = document.getElementById("app");
const st = { svc: null, days: [], day: null, slot: null, cfg: null, resched: null };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function api(path, body) {
  const r = await fetch(API + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({ error: "Network error" })); if (!r.ok) throw Object.assign(new Error(j.error || "Error"), { status: r.status }); return j;
}
const q = new URLSearchParams(location.search);
async function start() {
  if (q.get("id") && q.get("t")) return manage(q.get("id"), q.get("t"));
  st.cfg = await api("/config"); services();
}
function services() {
  app.innerHTML = `<h2>1. Pick a service</h2><div class="opts">${st.cfg.services.map(s => `<button class="opt" data-id="${s.id}"><strong>${esc(s.name)}</strong><br><span class="muted">${s.duration} min${s.price ? " · " + esc(s.price) : ""}</span></button>`).join("")}</div>`;
  app.querySelectorAll(".opt").forEach(b => b.onclick = () => { st.svc = st.cfg.services.find(s => s.id === b.dataset.id); dates(); });
}
async function dates() {
  app.innerHTML = "Finding open times…";
  try { st.days = (await api("/slots?service=" + st.svc.id)).days; } catch (e) { app.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  st.day = st.days[0] || null; renderDates();
}
function renderDates(msg) {
  const back = st.resched ? "" : `<button class="back" id="bk">← Change service</button>`;
  if (!st.days.length) { app.innerHTML = back + `<p>No open times in the next two weeks.</p>`; wireBack(); return; }
  app.innerHTML = `${back}<h2>2. Pick a date and time</h2><p class="muted">${esc(st.svc.name)}</p><p class="err">${esc(msg || "")}</p>
  <div class="days">${st.days.map(d => `<button class="chip ${d === st.day ? "sel" : ""}" data-d="${d.date}">${esc(d.label)}</button>`).join("")}</div>
  <div class="slots">${st.day.slots.map(s => `<button class="chip" data-s="${s.start}">${esc(s.label)}</button>`).join("")}</div>`;
  wireBack();
  app.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { st.day = st.days.find(d => d.date === b.dataset.d); renderDates(); });
  app.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { st.slot = st.day.slots.find(s => s.start === b.dataset.s); st.resched ? doResched() : form(); });
}
function wireBack() { const b = document.getElementById("bk"); if (b) b.onclick = services; }
const TS_SITEKEY = "0x4AAAAAAFh5dVP0HqGzfQ4T";
function tsRender() {
  const el = document.getElementById("ts"); if (!el) return;
  if (window.turnstile) { st.tsId = turnstile.render(el, { sitekey: TS_SITEKEY, theme: "auto" }); }
  else setTimeout(tsRender, 300);
}
function form() {
  app.innerHTML = `<button class="back" id="bd">← Change time</button><h2>3. Your details</h2><p class="muted">${esc(st.svc.name)} · ${esc(st.day.label)}, ${esc(st.slot.label)}</p>
  <form id="f" novalidate><label for="n">Name</label><input id="n" name="name" autocomplete="name" required maxlength="80">
  <label for="p">Phone</label><input id="p" name="phone" type="tel" autocomplete="tel" required maxlength="25">
  <label for="e">Email</label><input id="e" name="email" type="email" autocomplete="email" required maxlength="120">
  <label for="o">Notes (optional)</label><textarea id="o" name="notes" rows="3" maxlength="500"></textarea>
  <div id="ts" class="ts"></div><p class="err" id="er"></p><button class="btn" type="submit">Confirm booking</button></form>`;
  document.getElementById("bd").onclick = () => renderDates();
  st.tsId = null; tsRender();
  document.getElementById("f").onsubmit = async ev => {
    ev.preventDefault(); const f = ev.target, er = document.getElementById("er"), btn = f.querySelector("button[type=submit]");
    const tok = window.turnstile && st.tsId != null ? turnstile.getResponse(st.tsId) : "";
    if (!tok) { er.textContent = "Please finish the quick human check above."; return; }
    btn.disabled = true; er.textContent = "";
    try {
      const r = await api("/book", { service: st.svc.id, start: st.slot.start, name: f.name.value, phone: f.phone.value, email: f.email.value, notes: f.notes.value, turnstile: tok });
      confirmed(r);
    } catch (e) { btn.disabled = false; if (window.turnstile && st.tsId != null) turnstile.reset(st.tsId); if (e.status === 409) { await dates(); renderDates(e.message); } else er.textContent = e.message; }
  };
}
function confirmed(r) {
  app.innerHTML = `<h2>You're booked ✅</h2><p><strong>${esc(r.booking.serviceName)}</strong><br>${esc(r.booking.when)}</p>
  <div class="row"><a class="btn" href="${esc(r.icsUrl)}">Add to calendar (.ics)</a><a class="btn ghost" href="${esc(r.manageUrl)}">Reschedule or cancel</a></div>
  <p class="muted" style="margin-top:16px">Save this link to change or cancel later: <br><a href="${esc(r.manageUrl)}">${esc(r.manageUrl)}</a></p>
  <p class="muted">${r.emailed ? "A confirmation email is on its way." : "Demo: the business is notified by email. Customer confirmation emails are off in this demo."}</p>`;
}
async function manage(id, t) {
  let b; try { b = (await api(`/booking?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`)).booking; } catch (e) { app.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  const ics = `${API}/ics?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`;
  app.innerHTML = `<h2>Your booking</h2><p><strong>${esc(b.serviceName)}</strong><br>${esc(b.when)}<br>Status: ${esc(b.status)}</p>
  ${b.status === "confirmed" ? `<div class="row"><a class="btn ghost" href="${ics}">Add to calendar (.ics)</a><button class="btn ghost" id="rs">Reschedule</button><button class="btn" id="cx">Cancel booking</button></div><p class="err" id="er"></p>` : `<p><a href="./">Book a new time</a></p>`}`;
  if (b.status !== "confirmed") return;
  document.getElementById("cx").onclick = async () => { if (!confirm("Cancel this booking?")) return; try { await api("/cancel", { id, t }); manage(id, t); } catch (e) { document.getElementById("er").textContent = e.message; } };
  document.getElementById("rs").onclick = async () => { st.cfg = await api("/config"); st.svc = st.cfg.services.find(s => s.id === b.service); st.resched = { id, t }; dates(); };
}
async function doResched() {
  try { await api("/reschedule", { ...st.resched, start: st.slot.start }); manage(st.resched.id, st.resched.t); }
  catch (e) { if (e.status === 409) { await dates(); renderDates(e.message); } else renderDates(e.message); }
}
start().catch(e => app.innerHTML = `<p class="err">Couldn't load booking: ${esc(e.message)}</p>`);
})();
