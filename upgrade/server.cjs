// Owner login + estimates addon.
// Serves a static one-pager folder (template or mockup) AND /owner + /api routes.
// The public homepage stays the static index.html. GitHub Pages does not run this.
//
//   npm run upgrade -- --site prospects/rj-plumbing
//   npm run upgrade -- --site plumbing
//
// Auth: bcryptjs password hash (cost 10, same as Big Foot client signup) and an
// HttpOnly session cookie whose token is stored in SQLite (Big Foot stores client
// tokens in a tokens table and owner tokens in memory as Bearer tokens; this
// upgrade uses a cookie because the one-pager step-up is a browser page).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbTools = require('./db.cjs');

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1];
}

function resolveSite(raw) {
  if (!raw) {
    console.error('Missing --site <folder>. Example: npm run upgrade -- --site plumbing');
    process.exit(1);
  }
  const site = path.resolve(process.cwd(), raw);
  if (!fs.existsSync(site) || !fs.statSync(site).isDirectory()) {
    console.error('Site folder not found:', site);
    process.exit(1);
  }
  if (!fs.existsSync(path.join(site, 'index.html'))) {
    console.error('Site folder has no index.html:', site);
    process.exit(1);
  }
  return site;
}

function readCookies(req) {
  const out = {};
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function setSessionCookie(res, token) {
  const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `owner_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=1209600${secure}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'owner_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function parseLineItems(input) {
  if (input == null || input === '') return null;
  if (Array.isArray(input)) {
    return input.map((item) => ({
      description: String(item.description || item.name || '').trim(),
      amount: Number(item.amount || 0),
    })).filter((item) => item.description);
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('[')) {
      return parseLineItems(JSON.parse(trimmed));
    }
    return trimmed.split('\n').map((line) => {
      const [description, amount] = line.split('|');
      return {
        description: String(description || '').trim(),
        amount: Number(String(amount || '').trim() || 0),
      };
    }).filter((item) => item.description);
  }
  throw new Error('line_items must be an array or text');
}

function normalizeEstimate(body) {
  const name = String(body.customer_name || '').trim();
  if (!name) {
    const err = new Error('customer_name is required');
    err.status = 400;
    throw err;
  }
  const status = String(body.status || 'requested').trim();
  if (!dbTools.STATUSES.includes(status)) {
    const err = new Error('Invalid estimate status');
    err.status = 400;
    throw err;
  }
  const amount = body.amount === '' || body.amount == null ? 0 : Number(body.amount);
  if (!Number.isFinite(amount)) {
    const err = new Error('amount must be a number');
    err.status = 400;
    throw err;
  }
  let lineItems = null;
  if (body.line_items != null && body.line_items !== '') {
    const items = parseLineItems(body.line_items);
    lineItems = items && items.length ? JSON.stringify(items) : null;
  }
  return {
    customer_name: name,
    phone: String(body.phone || '').trim(),
    title: String(body.title || '').trim(),
    details: String(body.details || '').trim(),
    line_items: lineItems,
    status,
    amount,
  };
}

function pageShell(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; font-family: system-ui, sans-serif; background: #f4f6f8; color: #14202e; }
    main { width: min(880px, calc(100% - 2rem)); margin: 2rem auto; }
    h1 { font-size: 1.6rem; margin: 0 0 0.35rem; }
    p.lead { margin: 0 0 1.25rem; color: #445; }
    form, .card { background: #fff; border: 1px solid #d5dde6; border-radius: 12px; padding: 1rem 1.1rem; margin: 0 0 1rem; }
    label { display: block; font-size: 0.85rem; font-weight: 650; margin: 0.7rem 0 0.25rem; }
    input, textarea, select { width: 100%; box-sizing: border-box; font: inherit; padding: 0.45rem 0.55rem; border: 1px solid #c5d0dc; border-radius: 8px; }
    textarea { min-height: 4.5rem; }
    button, .btn { font: inherit; background: #1d4e89; color: #fff; border: 0; border-radius: 8px; padding: 0.5rem 0.85rem; cursor: pointer; text-decoration: none; display: inline-block; }
    .row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: end; }
    .row > * { flex: 1; min-width: 140px; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { text-align: left; padding: 0.55rem 0.45rem; border-bottom: 1px solid #e4ebf2; vertical-align: top; font-size: 0.92rem; }
    .muted { color: #5c6b7a; font-size: 0.85rem; }
    .error { background: #fee2e2; color: #7f1d1d; padding: 0.6rem 0.75rem; border-radius: 8px; }
    .top { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
  </style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}

function loginPage(error) {
  const alert = error ? `<p class="error">${esc(error)}</p>` : '';
  return pageShell('Owner login', `
    <h1>Owner login</h1>
    <p class="lead">Estimates are for the site owner. The public one-pager stays on the homepage.</p>
    ${alert}
    <form method="post" action="/owner/login">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="username" required>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <p><button type="submit">Sign in</button></p>
    </form>
    <p class="muted"><a href="/">Back to the public site</a></p>
  `);
}

function estimatesPage(rows) {
  const statusOptions = (current) => dbTools.STATUSES.map((status) => (
    `<option value="${esc(status)}"${status === current ? ' selected' : ''}>${esc(status)}</option>`
  )).join('');

  const list = rows.length ? `<table>
    <thead><tr><th>Customer</th><th>Work</th><th>Status / total</th></tr></thead>
    <tbody>
      ${rows.map((row) => {
        let items = [];
        try { items = row.line_items ? JSON.parse(row.line_items) : []; } catch { items = []; }
        const itemText = items.map((item) => `${item.description} (${Number(item.amount).toFixed(2)})`).join(', ');
        return `<tr>
          <td><strong>${esc(row.customer_name)}</strong><br><span class="muted">${esc(row.phone || '')}</span></td>
          <td>${esc(row.title || '')}<br><span class="muted">${esc(row.details || '')}</span>${itemText ? `<br><span class="muted">${esc(itemText)}</span>` : ''}</td>
          <td>
            <form method="post" action="/owner/estimates/${row.id}">
              <label>Status</label>
              <select name="status">${statusOptions(row.status)}</select>
              <label>Total</label>
              <input name="amount" inputmode="decimal" value="${esc(row.amount)}">
              <input type="hidden" name="customer_name" value="${esc(row.customer_name)}">
              <input type="hidden" name="phone" value="${esc(row.phone || '')}">
              <input type="hidden" name="title" value="${esc(row.title || '')}">
              <input type="hidden" name="details" value="${esc(row.details || '')}">
              <input type="hidden" name="line_items" value="${esc(row.line_items || '')}">
              <p><button type="submit">Update</button></p>
            </form>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>` : '<p class="muted">No estimates yet.</p>';

  return pageShell('Estimates', `
    <div class="top">
      <h1>Estimates</h1>
      <form method="post" action="/owner/logout"><button type="submit">Log out</button></form>
    </div>
    <p class="lead">Create and update estimates for this site. Status values match the Big Foot owner estimate lifecycle.</p>
    <form method="post" action="/owner/estimates">
      <h2>New estimate</h2>
      <div class="row">
        <div><label for="customer_name">Customer name</label><input id="customer_name" name="customer_name" required></div>
        <div><label for="phone">Phone</label><input id="phone" name="phone"></div>
      </div>
      <label for="title">Short title</label>
      <input id="title" name="title" placeholder="Water heater replacement">
      <label for="details">Description</label>
      <textarea id="details" name="details"></textarea>
      <label for="line_items">Line items (one per line: description | amount)</label>
      <textarea id="line_items" name="line_items" placeholder="Labor | 180&#10;Parts | 45"></textarea>
      <div class="row">
        <div>
          <label for="status">Status</label>
          <select id="status" name="status">${statusOptions('requested')}</select>
        </div>
        <div><label for="amount">Total</label><input id="amount" name="amount" inputmode="decimal" value="0"></div>
      </div>
      <p><button type="submit">Save estimate</button></p>
    </form>
    <h2>Saved</h2>
    ${list}
    <p class="muted"><a href="/">Public one-pager</a></p>
  `);
}

async function main() {
  const site = resolveSite(argValue('--site') || process.env.UPGRADE_SITE);
  const dbPath = process.env.UPGRADE_DB
    ? path.resolve(process.cwd(), process.env.UPGRADE_DB)
    : dbTools.defaultDbPath();
  const db = dbTools.openDatabase(dbPath);
  await dbTools.migrate(db);
  const seeded = await dbTools.ensureOwner(db);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  async function ownerFromRequest(req) {
    const token = readCookies(req).owner_session;
    if (!token) return null;
    return dbTools.getSql(
      db,
      `SELECT owners.id, owners.email FROM sessions
       JOIN owners ON owners.id = sessions.owner_id
       WHERE sessions.token = ?`,
      [token]
    );
  }

  function requireOwner(handler) {
    return async (req, res) => {
      try {
        const owner = await ownerFromRequest(req);
        if (!owner) return res.status(401).json({ error: 'Owner authorization required' });
        req.owner = owner;
        return handler(req, res);
      } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
      }
    };
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'client-site-upgrade', site });
  });

  app.get('/owner/login', async (req, res) => {
    const owner = await ownerFromRequest(req);
    if (owner) return res.redirect(302, '/owner/estimates');
    res.type('html').send(loginPage(''));
  });

  app.post('/owner/login', async (req, res) => {
    try {
      const email = String(req.body.email || '').trim();
      const password = String(req.body.password || '');
      const wantsJson = (req.headers.accept || '').includes('application/json')
        || (req.headers['content-type'] || '').includes('application/json');
      const owner = await dbTools.getSql(db, 'SELECT * FROM owners WHERE email = ?', [email]);
      const ok = owner && password && bcrypt.compareSync(password, owner.password_hash);
      if (!ok) {
        if (wantsJson) return res.status(401).json({ error: 'Invalid staff credentials' });
        return res.status(401).type('html').send(loginPage('Invalid staff credentials'));
      }
      const token = crypto.randomBytes(32).toString('hex');
      await dbTools.runSql(db, 'INSERT INTO sessions (token, owner_id) VALUES (?, ?)', [token, owner.id]);
      setSessionCookie(res, token);
      if (wantsJson) return res.json({ ok: true, email: owner.email });
      return res.redirect(302, '/owner/estimates');
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/owner/logout', async (req, res) => {
    const token = readCookies(req).owner_session;
    if (token) await dbTools.runSql(db, 'DELETE FROM sessions WHERE token = ?', [token]);
    clearSessionCookie(res);
    const wantsJson = (req.headers['content-type'] || '').includes('application/json');
    if (wantsJson) return res.json({ ok: true });
    return res.redirect(302, '/owner/login');
  });

  app.get('/owner/estimates', async (req, res) => {
    const owner = await ownerFromRequest(req);
    if (!owner) return res.redirect(302, '/owner/login');
    const rows = await dbTools.allSql(db, 'SELECT * FROM estimates ORDER BY id DESC');
    res.type('html').send(estimatesPage(rows));
  });

  app.post('/owner/estimates', async (req, res) => {
    const owner = await ownerFromRequest(req);
    if (!owner) return res.redirect(302, '/owner/login');
    try {
      const fields = normalizeEstimate(req.body);
      await dbTools.runSql(
        db,
        `INSERT INTO estimates (customer_name, phone, title, details, line_items, status, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [fields.customer_name, fields.phone, fields.title, fields.details, fields.line_items, fields.status, fields.amount]
      );
      res.redirect(302, '/owner/estimates');
    } catch (err) {
      res.status(err.status || 500).type('html').send(pageShell('Estimate error', `<p class="error">${esc(err.message)}</p><p><a href="/owner/estimates">Back</a></p>`));
    }
  });

  app.post('/owner/estimates/:id', async (req, res) => {
    const owner = await ownerFromRequest(req);
    if (!owner) return res.redirect(302, '/owner/login');
    try {
      const fields = normalizeEstimate(req.body);
      const existing = await dbTools.getSql(db, 'SELECT id FROM estimates WHERE id = ?', [req.params.id]);
      if (!existing) return res.status(404).type('html').send(pageShell('Not found', '<p>Estimate not found.</p>'));
      await dbTools.runSql(
        db,
        `UPDATE estimates
         SET customer_name=?, phone=?, title=?, details=?, line_items=?, status=?, amount=?, updated_at=datetime('now')
         WHERE id=?`,
        [fields.customer_name, fields.phone, fields.title, fields.details, fields.line_items, fields.status, fields.amount, req.params.id]
      );
      res.redirect(302, '/owner/estimates');
    } catch (err) {
      res.status(err.status || 500).type('html').send(pageShell('Estimate error', `<p class="error">${esc(err.message)}</p>`));
    }
  });

  app.get('/api/estimates', requireOwner(async (_req, res) => {
    const rows = await dbTools.allSql(db, 'SELECT * FROM estimates ORDER BY id DESC');
    res.json(rows.map(presentEstimate));
  }));

  app.post('/api/estimates', requireOwner(async (req, res) => {
    const fields = normalizeEstimate(req.body || {});
    const created = await dbTools.runSql(
      db,
      `INSERT INTO estimates (customer_name, phone, title, details, line_items, status, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fields.customer_name, fields.phone, fields.title, fields.details, fields.line_items, fields.status, fields.amount]
    );
    const row = await dbTools.getSql(db, 'SELECT * FROM estimates WHERE id = ?', [created.id]);
    res.status(201).json(presentEstimate(row));
  }));

  app.put('/api/estimates/:id', requireOwner(async (req, res) => {
    const existing = await dbTools.getSql(db, 'SELECT * FROM estimates WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Estimate not found' });
    let existingItems = null;
    try { existingItems = existing.line_items ? JSON.parse(existing.line_items) : null; } catch { existingItems = null; }
    const merged = normalizeEstimate({
      customer_name: req.body.customer_name !== undefined ? req.body.customer_name : existing.customer_name,
      phone: req.body.phone !== undefined ? req.body.phone : existing.phone,
      title: req.body.title !== undefined ? req.body.title : existing.title,
      details: req.body.details !== undefined ? req.body.details : existing.details,
      line_items: req.body.line_items !== undefined ? req.body.line_items : existingItems,
      status: req.body.status !== undefined ? req.body.status : existing.status,
      amount: req.body.amount !== undefined ? req.body.amount : existing.amount,
    });
    await dbTools.runSql(
      db,
      `UPDATE estimates
       SET customer_name=?, phone=?, title=?, details=?, line_items=?, status=?, amount=?, updated_at=datetime('now')
       WHERE id=?`,
      [merged.customer_name, merged.phone, merged.title, merged.details, merged.line_items, merged.status, merged.amount, req.params.id]
    );
    const row = await dbTools.getSql(db, 'SELECT * FROM estimates WHERE id = ?', [req.params.id]);
    res.json(presentEstimate(row));
  }));

  // Public one-pager. Registered after owner/API routes so those are not swallowed.
  app.use(express.static(site, { index: 'index.html', fallthrough: true }));

  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  });

  const port = Number(process.env.PORT) || 4317;
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`Upgrade listening on http://127.0.0.1:${port}`);
    console.log(`Public site: ${site}`);
    console.log(`Database: ${dbPath}`);
    if (seeded.seeded) console.log(`Seeded owner ${seeded.email}`);
  });

  function shutdown() {
    server.close(() => {
      db.close(() => process.exit(0));
    });
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

function presentEstimate(row) {
  let line_items = [];
  try { line_items = row.line_items ? JSON.parse(row.line_items) : []; } catch { line_items = []; }
  return {
    id: row.id,
    customer_name: row.customer_name,
    phone: row.phone,
    title: row.title,
    details: row.details,
    line_items,
    status: row.status,
    amount: row.amount,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
