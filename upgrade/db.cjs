// SQLite helpers for the owner-login + estimates upgrade.
// Schema is a slim cut of Big Foot (trae77/bigfootConstruction server/init.cjs
// and server/server.cjs): one owner instead of the client portal, estimates
// keep amount/details/status/phone, and sessions are the cookie form of the
// tokens table. Password hashes use bcryptjs cost 10, same as Big Foot signup.
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const STATUSES = ['requested', 'reviewed', 'quoted', 'approved', 'scheduled', 'won', 'lost'];
const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo-password';
const BCRYPT_ROUNDS = 10;

function defaultDbPath() {
  return path.join(__dirname, 'data.db');
}

function openDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');
  });
  return db;
}

function runSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function allSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

async function migrate(db) {
  await runSql(db, `CREATE TABLE IF NOT EXISTS owners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now'))
  )`);

  await runSql(db, `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY(owner_id) REFERENCES owners(id)
  )`);

  await runSql(db, `CREATE TABLE IF NOT EXISTS estimates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    phone TEXT,
    title TEXT,
    details TEXT,
    line_items TEXT,
    status TEXT NOT NULL DEFAULT 'requested',
    amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  )`);
}

function ownerCredentials() {
  const email = (process.env.OWNER_EMAIL || DEMO_EMAIL).trim();
  const password = process.env.OWNER_PASSWORD || DEMO_PASSWORD;
  const usingDemo = !process.env.OWNER_EMAIL || !process.env.OWNER_PASSWORD || password === DEMO_PASSWORD;
  return { email, password, usingDemo };
}

function assertProductionCredentials() {
  const { usingDemo } = ownerCredentials();
  if (process.env.NODE_ENV === 'production' && usingDemo) {
    throw new Error('Refusing to start in production with the demo owner password. Set OWNER_EMAIL and OWNER_PASSWORD.');
  }
}

// Seed the owner only when the table is empty so a restarted server does not
// reset a hash. Delete upgrade/data.db to pick up a new OWNER_EMAIL / OWNER_PASSWORD.
async function ensureOwner(db) {
  assertProductionCredentials();
  const existing = await getSql(db, 'SELECT id FROM owners LIMIT 1');
  if (existing) return { seeded: false };
  const { email, password } = ownerCredentials();
  const password_hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  await runSql(db, 'INSERT INTO owners (email, password_hash) VALUES (?, ?)', [email, password_hash]);
  return { seeded: true, email };
}

module.exports = {
  STATUSES,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  BCRYPT_ROUNDS,
  defaultDbPath,
  openDatabase,
  runSql,
  allSql,
  getSql,
  migrate,
  ownerCredentials,
  ensureOwner,
};
