#!/usr/bin/env node
// Gift codes for the ad-free purchase: Apple "offer codes" for in-app purchases, made through the App Store Connect API.
// DRY-RUN BY DEFAULT.
//
// IMPORTANT, what is and is not possible (checked 22 Oct 2026):
//   * The old in-app-purchase PROMO CODES (100 per product per 6 months) were retired by Apple on 26 Mar 2026: they can no longer be
//     created. Their replacement is OFFER CODES, which work for non-consumables too: a free offer, a batch of one-time-use codes
//     (500 to 25,000 per batch, expiry required, at most 6 months), redeemable in the App Store app, by redemption URL, or in an app that
//     supports offer-code redemption. Needs iOS 16.3+ for in-app redemption, any iOS for the URL and the App Store app.
//   * Apple documents API endpoints for in-app-purchase offer codes (inAppPurchaseOfferCodes, inAppPurchaseOfferCodeOneTimeUseCodes and
//     its /values endpoint). This script is written from those endpoint names. The request schemas could not be read in the environment
//     it was written in, so the body shapes are marked VERIFY below. If a call is rejected, do the same thing in the web UI
//     (docs/GIFTING.md has the click path). The UI path is the verified one.
//   * Offer codes are the ONLY way to give the unlock away free that Apple allows. A code typed into the game that grants the
//     entitlement would break App Review guideline 3.1.1 and is deliberately not built.
//
//   node scripts/asc-promo-codes.mjs --count 100 --expires 2027-03-31 [--name friends-oct] [--apply]
// Credentials and API key role: as scripts/asc-products.mjs (App Manager, or Marketing, can create offer codes).
// The product must be Approved/Ready for Distribution and the app Ready for Distribution first (Apple's rule for production codes).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { credsFromEnv, makeClient } from './lib/asc.mjs';
import { readAppId } from './patch-ios.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PRODUCT = 'gg_adfree';
export const LIMITS = { minBatch: 500, maxBatch: 25000, maxMonths: 6 };

export function parseArgs(argv) {
  const a = n => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : undefined; };
  return { count: Number(a('count') || 500), expires: a('expires'), name: a('name') || 'friends', apply: argv.includes('--apply'), out: a('out') };
}

/** Pure validation of the owner's request against Apple's documented limits. Returns a list of problems. */
export function validate({ count, expires, name }, today = new Date()) {
  const bad = [];
  if (!Number.isInteger(count) || count < LIMITS.minBatch || count > LIMITS.maxBatch) bad.push(`--count must be ${LIMITS.minBatch} to ${LIMITS.maxBatch} (Apple's batch size for one-time-use codes); for 20 friends make a Custom code in the web UI instead (docs/GIFTING.md)`);
  if (!expires || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) bad.push('--expires YYYY-MM-DD is required');
  else {
    const d = new Date(expires + 'T00:00:00Z'), max = new Date(today); max.setUTCMonth(max.getUTCMonth() + LIMITS.maxMonths);
    if (!(d > today)) bad.push('--expires must be in the future'); else if (d > max) bad.push(`--expires is more than ${LIMITS.maxMonths} months away (Apple's maximum)`);
  }
  if (!/^[A-Za-z0-9 _-]{3,40}$/.test(name)) bad.push('--name: 3 to 40 letters, digits, spaces, - or _');
  return bad;
}

export function plan(args) {
  return [
    { op: 'offer', text: `create a FREE offer "${args.name}" on ${PRODUCT}, all territories, all customer eligibilities` },
    { op: 'codes', text: `generate ${args.count} one-time-use codes, expiring ${args.expires}` },
    { op: 'values', text: `download the code list to ${args.out || `gg-offer-codes-${args.name}.csv`} (keep it private: each line is one free copy)` }
  ];
}

export async function applyPlan(api, appId, args, log) {
  const iap = await api.get(`/v1/apps/${appId}/inAppPurchasesV2?filter[productId]=${PRODUCT}&limit=1`);
  const id = iap.data && iap.data[0] && iap.data[0].id;
  if (!id) throw new Error(`${PRODUCT} not found in App Store Connect: run scripts/asc-products.mjs --apply first`);
  const terr = await api.all('/v1/territories?limit=200');
  log('creating the free offer ...');
  // VERIFY: body shape (relationship names, how a free price is expressed)
  const offer = await api.post('/v1/inAppPurchaseOfferCodes', {
    data: { type: 'inAppPurchaseOfferCodes', attributes: { name: args.name, customerEligibilities: ['NON_SPENDER', 'ACTIVE_SPENDER', 'CHURNED_SPENDER'] },
      relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id } }, prices: { data: terr.data.map((t, i) => ({ type: 'inAppPurchaseOfferPrices', id: '${p' + i + '}' })) } } },
    included: terr.data.map((t, i) => ({ type: 'inAppPurchaseOfferPrices', id: '${p' + i + '}', relationships: { territory: { data: { type: 'territories', id: t.id } } } }))
  });
  log('generating the codes ...');
  const batch = await api.post('/v1/inAppPurchaseOfferCodeOneTimeUseCodes', { data: { type: 'inAppPurchaseOfferCodeOneTimeUseCodes', attributes: { numberOfCodes: args.count, expirationDate: args.expires }, relationships: { offerCode: { data: { type: 'inAppPurchaseOfferCodes', id: offer.data.id } } } } });
  log('fetching the code list (codes can take a few minutes to appear) ...');
  const vals = await api.get(`/v1/inAppPurchaseOfferCodeOneTimeUseCodes/${batch.data.id}/values`);
  return vals.text || JSON.stringify(vals);
}

export async function run({ env = process.env, argv = process.argv.slice(2), root = ROOT, log = console.log, fetchImpl, today = new Date() } = {}) {
  const args = parseArgs(argv), bad = validate(args, today);
  if (bad.length) { bad.forEach(b => log('  ! ' + b)); throw new Error('invalid request'); }
  const steps = plan(args);
  log(`asc-promo-codes: ${args.apply ? 'APPLYING' : 'dry run, nothing changed'}`);
  steps.forEach(s => log('  + ' + s.text));
  if (!args.apply) { log('Add --apply to do it. Apple retired the old promo codes on 26 Mar 2026; this makes offer codes, their replacement.'); return { steps, applied: false }; }
  const creds = credsFromEnv(env); if (!creds) throw new Error('--apply needs ISSUER_ID, KEY_ID and P8_PATH (or the APP_STORE_CONNECT_* names)');
  const api = makeClient({ creds, fetchImpl });
  let appId = env.APP_STORE_CONNECT_APP_ID;
  if (!appId) { const r = await api.get(`/v1/apps?filter[bundleId]=${encodeURIComponent(env.BUNDLE_ID || readAppId(root))}&limit=1`); appId = r.data && r.data[0] && r.data[0].id; }
  const csv = await applyPlan(api, appId, args, log);
  const out = args.out || path.join(root, `gg-offer-codes-${args.name.replace(/\s+/g, '-')}.csv`);
  fs.writeFileSync(out, csv); log(`wrote ${out}`);
  return { steps, applied: true, out };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(e => { console.error('asc-promo-codes FAILED: ' + e.message); process.exit(1); });
}
