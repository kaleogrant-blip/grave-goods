#!/usr/bin/env node
// Creates / updates the in-app purchases in App Store Connect from config/products.json. Idempotent. DRY-RUN BY DEFAULT.
//
//   node scripts/asc-products.mjs              print the plan (reads App Store Connect if credentials are set, read-only)
//   node scripts/asc-products.mjs --apply      carry the plan out
//   node scripts/asc-products.mjs --json       machine-readable plan
//
// Credentials (env): ISSUER_ID, KEY_ID, and the .p8 as P8_PATH (file) or P8 (text). The Codemagic names
//   APP_STORE_CONNECT_ISSUER_ID / _KEY_IDENTIFIER / _PRIVATE_KEY work too.
//   API key role: App Manager is enough for in-app purchases, prices and localizations (Admin also works).
//   Not covered by the API step, done once in the web UI (docs/TRACK-B.md): the Paid Apps Agreement + tax + banking forms,
//   the review screenshot for the product, and attaching the product to the app version at the first submission.
// Optional env: APP_STORE_CONNECT_APP_ID (numeric Apple ID; otherwise looked up by the bundle id in capacitor.config.ts), BASE_TERRITORY (default USA).
//
// Endpoints used (App Store Connect API 1.x / 2.x, in-app purchases v2). VERIFY against the current docs on the first --apply:
//   GET  /v1/apps?filter[bundleId]=            GET /v1/apps/{app}/inAppPurchasesV2?filter[productId]=
//   POST /v2/inAppPurchases                    PATCH /v2/inAppPurchases/{id}
//   GET  /v2/inAppPurchases/{id}/inAppPurchaseLocalizations     POST/PATCH /v1/inAppPurchaseLocalizations
//   GET  /v2/inAppPurchases/{id}/pricePoints?filter[territory]=USA
//   GET  /v2/inAppPurchases/{id}/iapPriceSchedule + /v1/inAppPurchasePriceSchedules/{id}/manualPrices     POST /v1/inAppPurchasePriceSchedules
//   GET  /v2/inAppPurchases/{id}/inAppPurchaseAvailability     POST /v1/inAppPurchaseAvailabilities     GET /v1/territories
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { credsFromEnv, makeClient } from './lib/asc.mjs';
import { readAppId } from './patch-ios.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPE = { nonConsumable: 'NON_CONSUMABLE', consumable: 'CONSUMABLE', nonRenewable: 'NON_RENEWING_SUBSCRIPTION' };

export function loadCatalog(root = ROOT) { return JSON.parse(fs.readFileSync(path.join(root, 'config/products.json'), 'utf8')); }

/** Read the live state of one product. Returns null when it does not exist. */
export async function readLive(api, appId, p, territory) {
  const found = await api.get(`/v1/apps/${appId}/inAppPurchasesV2?filter[productId]=${encodeURIComponent(p.id)}&limit=1`);
  const iap = (found.data || [])[0];
  if (!iap) return null;
  const live = { id: iap.id, attrs: iap.attributes || {}, locs: {}, price: null, hasAvailability: false };
  const locs = await api.all(`/v2/inAppPurchases/${iap.id}/inAppPurchaseLocalizations`);
  for (const l of locs.data) live.locs[l.attributes.locale] = { id: l.id, name: l.attributes.name, description: l.attributes.description };
  try {
    const sch = await api.get(`/v2/inAppPurchases/${iap.id}/iapPriceSchedule`);
    if (sch.data && sch.data.id) {
      const mp = await api.all(`/v1/inAppPurchasePriceSchedules/${sch.data.id}/manualPrices?include=inAppPurchasePricePoint&limit=50`);
      const pts = Object.fromEntries(mp.included.filter(x => x.type === 'inAppPurchasePricePoints').map(x => [x.id, x.attributes.customerPrice]));
      const cur = mp.data.find(x => !x.attributes || !x.attributes.endDate) || mp.data[0];
      const ptId = cur && cur.relationships && cur.relationships.inAppPurchasePricePoint && cur.relationships.inAppPurchasePricePoint.data && cur.relationships.inAppPurchasePricePoint.data.id;
      if (ptId && pts[ptId] !== undefined) live.price = Number(pts[ptId]);
    }
  } catch (e) { if (e.status !== 404) throw e; }
  try { const av = await api.get(`/v2/inAppPurchases/${iap.id}/inAppPurchaseAvailability`); live.hasAvailability = !!(av.data && av.data.id); } catch (e) { if (e.status !== 404) throw e; }
  return live;
}

/** Pure: desired catalog + live state (null = not read / does not exist) -> ordered list of steps. */
export function planFor(catalog, liveById = {}, territory = 'USA') {
  const steps = [];
  for (const p of catalog.products) {
    const live = liveById[p.id];
    if (!live) {
      steps.push({ op: 'create', product: p.id, text: `create ${p.id} (${p.kind}, "${p.referenceName}")` });
      for (const l of p.localizations) steps.push({ op: 'localization', product: p.id, locale: l.locale, text: `add localization ${l.locale} "${l.displayName}"` });
      steps.push({ op: 'price', product: p.id, text: `set ${territory} base price ${p.usd.toFixed(2)} (price point resolved at apply)` });
      steps.push({ op: 'availability', product: p.id, text: 'make available in all territories' });
      continue;
    }
    const want = { name: p.referenceName, reviewNote: p.reviewNote || null, familySharable: !!p.familyShareable };
    const have = { name: live.attrs.name, reviewNote: live.attrs.reviewNote || null, familySharable: !!live.attrs.familySharable };
    const diff = Object.keys(want).filter(k => want[k] !== have[k]);
    steps.push(diff.length ? { op: 'update', product: p.id, fields: diff, text: `update ${p.id}: ${diff.join(', ')}` } : { op: 'noop', product: p.id, text: `${p.id} exists, attributes match` });
    for (const l of p.localizations) {
      const lv = live.locs[l.locale];
      if (!lv) steps.push({ op: 'localization', product: p.id, locale: l.locale, text: `add localization ${l.locale} "${l.displayName}"` });
      else if (lv.name !== l.displayName || lv.description !== l.description) steps.push({ op: 'localization-update', product: p.id, locale: l.locale, localizationId: lv.id, text: `update localization ${l.locale}` });
      else steps.push({ op: 'noop', product: p.id, text: `localization ${l.locale} matches` });
    }
    if (live.price === null || Math.abs(live.price - p.usd) > 0.0001) steps.push({ op: 'price', product: p.id, text: `set ${territory} base price ${live.price === null ? 'none' : live.price.toFixed(2)} -> ${p.usd.toFixed(2)}` });
    else steps.push({ op: 'noop', product: p.id, text: `${territory} price ${p.usd.toFixed(2)} matches` });
    steps.push(live.hasAvailability ? { op: 'noop', product: p.id, text: 'availability set' } : { op: 'availability', product: p.id, text: 'make available in all territories' });
  }
  return steps;
}

export async function applyStep(api, appId, catalog, step, ctx, territory = 'USA') {
  const p = catalog.products.find(x => x.id === step.product);
  const ref = () => ({ data: { type: 'inAppPurchases', id: ctx.ids[p.id] } });
  switch (step.op) {
    case 'create': {
      const r = await api.post('/v2/inAppPurchases', { data: { type: 'inAppPurchases', attributes: { name: p.referenceName, productId: p.id, inAppPurchaseType: TYPE[p.kind], reviewNote: p.reviewNote || undefined, familySharable: !!p.familyShareable }, relationships: { app: { data: { type: 'apps', id: appId } } } } });
      ctx.ids[p.id] = r.data.id; return;
    }
    case 'update': await api.patch(`/v2/inAppPurchases/${ctx.ids[p.id]}`, { data: { type: 'inAppPurchases', id: ctx.ids[p.id], attributes: { name: p.referenceName, reviewNote: p.reviewNote || null, familySharable: !!p.familyShareable } } }); return;
    case 'localization': {
      const l = p.localizations.find(x => x.locale === step.locale);
      await api.post('/v1/inAppPurchaseLocalizations', { data: { type: 'inAppPurchaseLocalizations', attributes: { locale: l.locale, name: l.displayName, description: l.description }, relationships: { inAppPurchaseV2: ref() } } }); return;
    }
    case 'localization-update': {
      const l = p.localizations.find(x => x.locale === step.locale);
      await api.patch(`/v1/inAppPurchaseLocalizations/${step.localizationId}`, { data: { type: 'inAppPurchaseLocalizations', id: step.localizationId, attributes: { name: l.displayName, description: l.description } } }); return;
    }
    case 'price': {
      const pts = await api.all(`/v2/inAppPurchases/${ctx.ids[p.id]}/pricePoints?filter[territory]=${territory}&limit=200`);
      const pt = pts.data.find(x => Math.abs(Number(x.attributes.customerPrice) - p.usd) < 0.0001);
      if (!pt) throw new Error(`no ${territory} price point for ${p.usd.toFixed(2)} on ${p.id}: pick a price Apple offers`);
      await api.post('/v1/inAppPurchasePriceSchedules', {
        data: { type: 'inAppPurchasePriceSchedules', relationships: { inAppPurchase: ref(), baseTerritory: { data: { type: 'territories', id: territory } }, manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${price1}' }] } } },
        included: [{ type: 'inAppPurchasePrices', id: '${price1}', attributes: { startDate: null }, relationships: { inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: pt.id } } } }]
      }); return;
    }
    case 'availability': {
      const terr = await api.all('/v1/territories?limit=200');
      await api.post('/v1/inAppPurchaseAvailabilities', { data: { type: 'inAppPurchaseAvailabilities', attributes: { availableInNewTerritories: true }, relationships: { inAppPurchase: ref(), availableTerritories: { data: terr.data.map(t => ({ type: 'territories', id: t.id })) } } } }); return;
    }
    default: return;
  }
}

export async function run({ env = process.env, argv = process.argv.slice(2), root = ROOT, log = console.log, fetchImpl } = {}) {
  const apply = argv.includes('--apply'), asJson = argv.includes('--json');
  const catalog = loadCatalog(root), territory = env.BASE_TERRITORY || 'USA';
  const creds = credsFromEnv(env);
  const liveById = {}; let appId = env.APP_STORE_CONNECT_APP_ID || null, api = null, mode = 'offline';
  if (creds) {
    api = makeClient({ creds, fetchImpl });
    if (!appId) { const bundle = env.BUNDLE_ID || readAppId(root); const r = await api.get(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundle)}&limit=1`); appId = r.data && r.data[0] && r.data[0].id; if (!appId) throw new Error(`no app with bundle id ${bundle} in App Store Connect: create the app record first (docs/TRACK-B.md step 2)`); }
    for (const p of catalog.products) { log(`reading ${p.id} ...`); const l = await readLive(api, appId, p, territory); if (l) liveById[p.id] = l; }
    mode = 'live';
  } else if (apply) throw new Error('--apply needs credentials: set ISSUER_ID, KEY_ID and P8_PATH (or the APP_STORE_CONNECT_* names)');
  const steps = planFor(catalog, liveById, territory);
  const todo = steps.filter(s => s.op !== 'noop');
  if (asJson) log(JSON.stringify({ mode, apply, steps }, null, 2));
  else {
    log(`asc-products: ${mode === 'live' ? 'compared with App Store Connect' : 'OFFLINE plan (no credentials: assuming nothing exists yet)'} - ${apply ? 'APPLYING' : 'dry run, nothing changed'}`);
    steps.forEach(s => log(`  ${s.op === 'noop' ? '=' : '+'} ${s.text}`));
    log(`${todo.length} change(s) to make.`);
  }
  if (apply && todo.length) {
    const ctx = { ids: Object.fromEntries(Object.entries(liveById).map(([k, v]) => [k, v.id])) };
    let i = 0;
    for (const s of todo) { i++; log(`[${i}/${todo.length}] ${s.text}`); await applyStep(api, appId, catalog, s, ctx, territory); }
    log('done. Next, in the web UI: upload the review screenshot, then submit the product with the app version (docs/TRACK-B.md).');
  }
  return { mode, steps, todo };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(e => { console.error('asc-products FAILED: ' + e.message); process.exit(1); });
}
