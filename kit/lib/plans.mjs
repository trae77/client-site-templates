// Locked TTA monthly plan prices (William, locked-facts.md). The kit records the client's plan in
// build.json for TTA's own records. These prices never appear on a client's site.
import fs from 'node:fs';

export const PLANS = {
  starter: { label: 'Starter', price: 199 },
  visibility: { label: 'Visibility', price: 399 },
  'lead-engine': { label: 'Lead Engine', price: 599 },
  growth: { label: 'Growth Engine', price: 899 },
};
export const LOCKED_PRICES = [199, 399, 599, 899];
export const LOCKED_FACTS = '/workspace/ops/locked-facts.md';
export const PRICE_SHEET = '/workspace/products/PRICE-SHEET.md';

/** Cross-check PLANS against the locked-facts file and the price sheet. Never edits either file. */
export function crossCheckPlans({ lockedFacts = LOCKED_FACTS, priceSheet = PRICE_SHEET } = {}) {
  const out = { ok: true, lockedFacts: 'missing', priceSheet: 'missing', notes: [] };
  if (fs.existsSync(lockedFacts)) {
    const t = fs.readFileSync(lockedFacts, 'utf8');
    const miss = Object.values(PLANS).filter((p) => !t.includes(`${p.label} $${p.price}`));
    out.lockedFacts = miss.length ? 'mismatch' : 'match';
    if (miss.length) { out.ok = false; out.notes.push(`locked-facts.md does not list: ${miss.map((p) => `${p.label} $${p.price}`).join(', ')}`); }
  } else out.notes.push(`${lockedFacts} not found; using the built-in locked prices`);
  if (fs.existsSync(priceSheet)) {
    const t = fs.readFileSync(priceSheet, 'utf8');
    const miss = Object.values(PLANS).filter((p) => !new RegExp(`${p.label}[^\\n|]*\\|?\\s*\\$${p.price}/mo`).test(t));
    out.priceSheet = miss.length ? 'stale' : 'match';
    if (miss.length) out.notes.push(`PRICE-SHEET.md still shows other prices for: ${miss.map((p) => p.label).join(', ')} (locked: ${Object.values(PLANS).map((p) => `${p.label} $${p.price}`).join(', ')}). Not edited; flag for William.`);
  }
  return out;
}
