import test from 'node:test';
import assert from 'node:assert/strict';
import { load, memPrefs, memLS } from './helpers.mjs';
const { createPayments, CACHE_KEY, DEFAULT_PRODUCT } = load('payments.js');

const PRODUCTS = [{ id: 'gg_adfree', kind: 'nonConsumable', usd: 2.99 }];

// A fake store plugin with the contract shape (see plugins/storekit/src/index.d.ts).
function fakeStore({ owned = [], price = '2,99 €', purchase = 'success', fail = null } = {}) {
  const s = { owned: new Set(owned), calls: [], listeners: {}, price, purchase, fail };
  s.plugin = {
    products: async a => (s.calls.push(['products', a]), { products: a.ids.filter(i => i === 'gg_adfree').map(id => ({ id, displayName: 'Ad-free', displayPrice: s.price, price: '2.99', currencyCode: 'EUR', type: 'nonConsumable' })), invalid: [] }),
    purchase: async a => { s.calls.push(['purchase', a]); if (s.fail) throw Object.assign(new Error('boom'), { code: s.fail }); if (s.purchase === 'success') s.owned.add(a.id); return { status: s.purchase, productId: a.id }; },
    restore: async () => (s.calls.push(['restore']), { productIds: [...s.owned] }),
    entitlements: async () => (s.calls.push(['entitlements']), { productIds: [...s.owned] }),
    addListener: async (n, cb) => { s.listeners[n] = cb; return { remove() {} }; }
  };
  return s;
}
function rig({ store = fakeStore(), prefs = memPrefs(), dev = false, ls = memLS(), noPlugin = false } = {}) {
  const events = [], toasts = [], results = [];
  const p = createPayments({ plugin: noPlugin ? null : store.plugin, prefs, products: PRODUCTS, dev, ls, emit: (n, d) => events.push([n, d]), toast: m => toasts.push(m), now: () => 1234, onResult: r => results.push(r) });
  return { p, store, prefs, events, toasts, results, ls };
}

test('contract: Payments.go(action, product) resolves with the object passed to ggPaymentResult, default product is gg_adfree', async () => {
  const r = rig(); await r.p.init();
  const seen = []; const g = globalThis.ggPaymentResult; globalThis.ggPaymentResult = x => seen.push(x);
  try {
    const out = await r.p.go('buy');
    assert.deepEqual(out, { product: 'gg_adfree', ok: true, restored: false });
    assert.deepEqual(seen, [out], 'window.ggPaymentResult({product, ok, restored}) is called exactly once');
    assert.equal(r.p.last, 'buy'); assert.equal(DEFAULT_PRODUCT, 'gg_adfree');
  } finally { globalThis.ggPaymentResult = g; }
});

test('entitlement cache: empty before, written to Preferences after a purchase, replaced (not merged) by the store on every refresh', async () => {
  const r = rig(); await r.p.init();
  assert.equal(r.p.adFree(), false);
  await r.p.go('buy');
  assert.equal(r.p.adFree(), true);
  const c = JSON.parse(await r.prefs.get(CACHE_KEY)); assert.equal(c.v, 1); assert.deepEqual(c.ids, ['gg_adfree']);
  r.store.owned.clear(); // refund
  assert.equal(await r.p.refresh(), true);
  assert.equal(r.p.adFree(), false, 'a refund disappears at the next refresh');
  assert.deepEqual(JSON.parse(await r.prefs.get(CACHE_KEY)).ids, []);
});

test('launch: cache answers instantly and offline; the store is asked on every launch and wins', async () => {
  const prefs = memPrefs({ [CACHE_KEY]: JSON.stringify({ v: 1, ids: ['gg_adfree'], at: 1 }) });
  const offline = fakeStore(); offline.plugin.entitlements = async () => { throw new Error('offline'); };
  const a = rig({ store: offline, prefs }); await a.p.init();
  assert.equal(a.p.adFree(), true, 'offline: the cache stands');
  const b = rig({ store: fakeStore({ owned: [] }), prefs }); await b.p.init();
  assert.equal(b.p.adFree(), false, 'online: the store says not owned (refunded), so the cache is replaced');
  assert.ok(b.store.calls.some(c => c[0] === 'entitlements'), 'entitlements() read at launch');
  const c = rig({ store: fakeStore({ owned: ['gg_adfree'] }), prefs: memPrefs() }); await c.p.init();
  assert.equal(c.p.adFree(), true, 'reinstall: no cache, the store restores it silently');
});

test('a corrupt or foreign cache is ignored; unknown product ids are never trusted', async () => {
  const a = rig({ prefs: memPrefs({ [CACHE_KEY]: '{not json' }), store: fakeStore() }); await a.p.init(); assert.equal(a.p.adFree(), false);
  const b = rig({ prefs: memPrefs({ [CACHE_KEY]: JSON.stringify({ v: 1, ids: ['gg_full', 'gg_drop_petasos'] }) }), noPlugin: true }); await b.p.init();
  assert.equal(b.p.owned('gg_full'), false); assert.equal(b.p.adFree(), false);
  const r = rig(); await r.p.init();
  const out = await r.p.go('buy', 'gg_full'); assert.equal(out.ok, false); assert.equal(r.store.calls.filter(c => c[0] === 'purchase').length, 0);
});

test('restore: owned -> ok + restored; not owned -> nothing to restore; the cache is refreshed from the answer', async () => {
  const r = rig({ store: fakeStore({ owned: ['gg_adfree'] }) }); await r.p.init(); r.p.ggPaymentResult = r.p.ggPaymentResult;
  const out = await r.p.go('restore'); assert.deepEqual(out, { product: 'gg_adfree', ok: true, restored: true });
  assert.ok(r.events.some(([n, d]) => n === 'unlock_result' && d.result === 'restored'));
  const e = rig({ store: fakeStore() }); await e.p.init();
  const none = await e.p.go('restore'); assert.equal(none.ok, false);
  assert.ok(e.events.some(([n, d]) => n === 'unlock_result' && d.result === 'nothing_to_restore'));
  assert.ok(e.toasts.includes('Nothing to restore'));
});

test('cancelled, pending (Ask to Buy) and errors do not unlock; errors toast', async () => {
  for (const [mode, expect] of [['cancelled', { cancelled: true }], ['pending', { pending: true }]]) {
    const r = rig({ store: fakeStore({ purchase: mode }) }); await r.p.init();
    const out = await r.p.go('buy'); assert.equal(out.ok, false); assert.equal(r.p.adFree(), false);
    for (const [k, v] of Object.entries(expect)) assert.equal(out[k], v);
  }
  const f = rig({ store: fakeStore({ fail: 'PURCHASE_FAILED' }) }); await f.p.init();
  const out = await f.p.go('buy'); assert.equal(out.ok, false); assert.equal(out.error, 'PURCHASE_FAILED'); assert.ok(f.toasts.some(t => /did not answer/.test(t)));
});

test('a transactionUpdate (Ask to Buy approved, promo code redeemed, refund) re-reads the store', async () => {
  const r = rig(); await r.p.init();
  let changes = 0; r.p.onChange(() => changes++);
  r.store.owned.add('gg_adfree'); await r.store.listeners.transactionUpdate({ productId: 'gg_adfree', revoked: false });
  await new Promise(x => setTimeout(x, 10));
  assert.equal(r.p.adFree(), true); assert.ok(changes >= 1);
});

test('prices are the store\'s localized strings, never built here; no price until StoreKit answers', async () => {
  const r = rig({ store: fakeStore({ price: '¥480' }) });
  assert.equal(r.p.price('gg_adfree'), '');
  await r.p.init(); await new Promise(x => setTimeout(x, 10));
  assert.equal(r.p.price('gg_adfree'), '¥480'); assert.equal(r.p.productInfo('gg_adfree').currencyCode, 'EUR');
});

test('telemetry: unlock_prompt_shown and unlock_result carry the product and the localized price', async () => {
  const r = rig(); await r.p.init(); await new Promise(x => setTimeout(x, 10));
  r.p.promptShown('settings');
  await r.p.go('buy');
  r.p.declined('settings');
  const names = r.events.map(e => e[0]);
  assert.deepEqual(names.filter(n => n.startsWith('unlock')), ['unlock_prompt_shown', 'unlock_result', 'unlock_result']);
  assert.deepEqual(r.events[0][1], { where: 'settings', product: 'gg_adfree', price: '2,99 €' });
  assert.deepEqual(r.events[1][1], { result: 'purchased', product: 'gg_adfree', price: '2,99 €' });
  assert.equal(r.events[2][1].result, 'declined');
});

test('dev path exists only with the DEV build flag', async () => {
  const ls = memLS({ rw_devadfree: '1' });
  const prod = rig({ dev: false, ls, noPlugin: true }); await prod.p.init();
  assert.equal(prod.p.adFree(), false, 'rw_devadfree is ignored in a production build');
  const out = await prod.p.go('buy'); assert.equal(out.ok, false); assert.ok(prod.toasts.includes('Purchases work in the app'));
  const dev = rig({ dev: true, ls, noPlugin: true }); await dev.p.init();
  assert.equal(dev.p.adFree(), true, 'DEV=true and rw_devadfree=1');
  const clean = rig({ dev: true, noPlugin: true }); await clean.p.init();
  assert.equal(clean.p.adFree(), false, 'DEV=true alone grants nothing');
  const buy = await clean.p.go('buy'); assert.equal(buy.ok, false, 'no store and no dev switch: no purchase');
  globalThis.DEV_ADFREE = true; try { assert.equal(rig({ dev: true, noPlugin: true }).p.adFree(), true); assert.equal(rig({ dev: false, noPlugin: true }).p.adFree(), false); } finally { delete globalThis.DEV_ADFREE; }
});

test('no store plugin (web / artifact): nothing to buy, no UI hooks, no crash', async () => {
  const r = rig({ noPlugin: true }); await r.p.init();
  assert.equal(r.p.available(), false); assert.equal(r.p.hasStore(), false);
  const out = await r.p.go('restore'); assert.equal(out.ok, false);
});

test('concurrent taps: a second go() while one is in flight does nothing', async () => {
  const store = fakeStore(); let release; store.plugin.purchase = () => new Promise(res => { release = () => { store.owned.add('gg_adfree'); res({ status: 'success' }); }; });
  const r = rig({ store }); await r.p.init();
  const a = r.p.go('buy'); const b = await r.p.go('buy'); assert.equal(b.busy, true);
  await new Promise(x => setTimeout(x, 5)); release(); assert.equal((await a).ok, true);
});
