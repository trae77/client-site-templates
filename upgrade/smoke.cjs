// Hits a running upgrade server (Big Foot's npm run smoke pattern, plus login
// and estimates). Server must already be listening on PORT (default 4317).
//   PORT=4317 npm run upgrade:smoke
const http = require('http');

const port = process.env.PORT || 4317;
const base = `http://127.0.0.1:${port}`;

function request(method, pathname, { body, cookie, headers } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(`${base}${pathname}`, {
      method,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
        ...(cookie ? { cookie } : {}),
        accept: 'application/json',
        ...(headers || {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: data,
      }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function cookieFrom(res) {
  const raw = res.headers['set-cookie'];
  if (!raw || !raw.length) return '';
  return raw.map((line) => line.split(';')[0]).join('; ');
}

(async () => {
  const health = await request('GET', '/api/health');
  if (health.status !== 200) throw new Error(`health failed: ${health.status} ${health.body}`);
  console.log('OK /api/health', health.body);

  const locked = await request('GET', '/api/estimates');
  if (locked.status !== 401) throw new Error(`expected 401 for estimates, got ${locked.status} ${locked.body}`);
  console.log('OK /api/estimates rejected without a session', locked.status);

  const login = await request('POST', '/owner/login', {
    body: { email: process.env.OWNER_EMAIL || 'demo@example.com', password: process.env.OWNER_PASSWORD || 'demo-password' },
  });
  if (login.status !== 200) throw new Error(`login failed: ${login.status} ${login.body}`);
  const cookie = cookieFrom(login);
  if (!cookie.includes('owner_session=')) throw new Error('login did not set owner_session cookie');
  console.log('OK /owner/login', login.body);

  const created = await request('POST', '/api/estimates', {
    cookie,
    body: {
      customer_name: 'Smoke Customer',
      phone: '555-0100',
      title: 'Smoke test',
      details: 'Short description from smoke test',
      line_items: [{ description: 'Labor', amount: 80 }],
      status: 'requested',
      amount: 80,
    },
  });
  if (created.status !== 201) throw new Error(`create failed: ${created.status} ${created.body}`);
  const estimate = JSON.parse(created.body);
  console.log('OK create estimate', estimate.id);

  const updated = await request('PUT', `/api/estimates/${estimate.id}`, {
    cookie,
    body: { status: 'quoted', amount: 120 },
  });
  if (updated.status !== 200) throw new Error(`update failed: ${updated.status} ${updated.body}`);
  const updatedBody = JSON.parse(updated.body);
  if (updatedBody.status !== 'quoted' || Number(updatedBody.amount) !== 120) {
    throw new Error(`update payload unexpected: ${updated.body}`);
  }
  console.log('OK update estimate', updatedBody.status, updatedBody.amount);

  const listed = await request('GET', '/api/estimates', { cookie });
  if (listed.status !== 200) throw new Error(`list failed: ${listed.status} ${listed.body}`);
  const rows = JSON.parse(listed.body);
  if (!rows.some((row) => row.id === estimate.id)) throw new Error('created estimate missing from list');
  console.log('OK list estimates', rows.length);

  const home = await request('GET', '/', { headers: { accept: 'text/html' } });
  if (home.status !== 200) throw new Error(`public page failed: ${home.status}`);
  if (!home.body.includes('<html') && !home.body.includes('<HTML')) {
    throw new Error('public page was not HTML');
  }
  if (home.body.includes('Owner login') && home.body.includes('name="password"')) {
    throw new Error('public homepage looks like the login wall');
  }
  console.log('OK public homepage', home.status, `bytes=${home.body.length}`);
  console.log('Smoke checks passed');
})().catch((err) => {
  console.error('Smoke failed:', err.message);
  process.exit(1);
});
