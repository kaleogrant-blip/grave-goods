/* payments.js: the in-app purchase layer (v1 sells exactly one thing: gg_adfree, which removes ads).
 *
 * The contract (kept from the monetization build so any UI written against it keeps working):
 *   window.Payments.go(action, product)   action 'buy' | 'restore'; product defaults to 'gg_adfree'
 *   window.ggPaymentResult({product, ok, restored})   the single place a result lands (the native layer in the old build called it,
 *                                                     here payments.js calls it after the store has answered)
 *   Payments.adFree()                     true when the entitlement cache says gg_adfree is owned
 *
 * Truth and cache. The store (StoreKit 2 on iOS, Play Billing on Android) is the truth: entitlements() is read on every launch and
 * after every purchase / restore / transaction update, and the answer REPLACES the cache in Preferences (key gg_ent_v1), so a refund
 * disappears at the next launch. The cache only exists so adFree() is correct instantly at boot and offline. Nothing is ever
 * written to the game's own Store: the entitlement is device/account state and never travels in the cloud save.
 *
 * Prices come from the store (localized display string). This file never builds a price string itself.
 *
 * Dev path: with the build flag DEV=true (GG_APP_CONFIG.dev) localStorage 'rw_devadfree'='1' or window.DEV_ADFREE=true makes adFree()
 * true and lets go('buy') succeed without a store. In a production build that code path does not exist.
 */
(function (root) {
  'use strict';

  var CACHE_KEY = 'gg_ent_v1';
  var DEFAULT_PRODUCT = 'gg_adfree';

  /* deps: { plugin, prefs, products:[{id,usd,kind}], dev, ls, emit(name,data), toast(msg), now(), platform, onResult(r) } */
  function createPayments(deps) {
    var known = (deps.products || []).map(function (p) { return p.id; });
    var owned = {}, info = {}, listeners = [], ready = false, last = '', loadedProducts = false, busy = false;
    var plugin = deps.plugin || null;

    function say(m) { try { deps.toast && deps.toast(m); } catch (e) {} }
    function emit(n, d) { try { deps.emit && deps.emit(n, d); } catch (e) {} }
    function changed() { listeners.forEach(function (f) { try { f(api); } catch (e) {} }); }
    function devOn() {
      if (!deps.dev) return false;
      try { if (root.DEV_ADFREE === true) return true; var v = deps.ls && deps.ls.getItem('rw_devadfree'); return v === '1'; } catch (e) { return false; }
    }

    function setOwned(ids) {
      var next = {};
      (ids || []).forEach(function (id) { if (known.indexOf(id) >= 0) next[id] = true; });
      var a = Object.keys(owned).sort().join(), b = Object.keys(next).sort().join();
      owned = next;
      return a !== b;
    }
    async function saveCache() {
      try { if (deps.prefs) await deps.prefs.set(CACHE_KEY, JSON.stringify({ v: 1, ids: Object.keys(owned), at: (deps.now || Date.now)() })); } catch (e) {}
    }
    async function loadCache() {
      try {
        var raw = deps.prefs && await deps.prefs.get(CACHE_KEY);
        if (!raw) return;
        var c = JSON.parse(raw);
        if (c && c.v === 1 && Array.isArray(c.ids)) setOwned(c.ids);
      } catch (e) { /* a corrupt cache is an empty cache; the store answers next */ }
    }

    /* Ask the store what is owned right now. On success the answer replaces the cache; on failure the cache stands. */
    async function refresh() {
      if (!plugin || typeof plugin.entitlements !== 'function') return false;
      try {
        var r = await plugin.entitlements();
        var ch = setOwned(r && r.productIds);
        await saveCache();
        if (ch) changed();
        return true;
      } catch (e) { return false; }
    }

    async function loadProducts() {
      if (!plugin || typeof plugin.products !== 'function') return info;
      try {
        var r = await plugin.products({ ids: known.slice() });
        (r && r.products || []).forEach(function (p) { info[p.id] = { displayPrice: p.displayPrice || '', price: p.price || '', currencyCode: p.currencyCode || '' }; });
        loadedProducts = true; changed();
      } catch (e) { /* offline or not approved yet: the UI shows no price and the purchase still tries */ }
      return info;
    }

    async function init() {
      await loadCache();
      ready = true; changed(); // the cache is enough to answer adFree() correctly; the store confirms below
      if (plugin) {
        try { if (plugin.addListener) await plugin.addListener('transactionUpdate', function () { refresh().then(function () { changed(); }); }); } catch (e) {}
        await refresh();
        loadProducts(); // not awaited: a slow store never delays the game
      }
      return api;
    }

    function result(r) {
      try { if (typeof root.ggPaymentResult === 'function') root.ggPaymentResult(r); else api.ggPaymentResult(r); } catch (e) {}
    }

    /* Payments.go: the one entry point the UI calls. Resolves with the same object it passes to ggPaymentResult. */
    async function go(action, product) {
      product = product || DEFAULT_PRODUCT;
      last = action;
      var out = { product: product, ok: false, restored: action === 'restore' };
      if (known.indexOf(product) < 0) { result(out); return out; }
      if (busy) return Object.assign(out, { busy: true });
      busy = true;
      try {
        if (!plugin) {
          if (devOn() && action === 'buy') { setOwned(Object.keys(owned).concat([product])); await saveCache(); out.ok = true; changed(); }
          else say('Purchases work in the app');
        } else if (action === 'restore') {
          var rr = await plugin.restore();
          setOwned(rr && rr.productIds); await saveCache(); changed();
          out.ok = !!owned[product];
        } else {
          var p = await plugin.purchase({ id: product });
          if (p && p.status === 'success') {
            await refresh(); // the store's list is the truth...
            if (!owned[product]) { setOwned(Object.keys(owned).concat([product])); await saveCache(); changed(); } // ...but the plugin only says success for a verified purchase, so trust it if the list lags
            out.ok = true;
          }
          else if (p && p.status === 'pending') out.pending = true;
          else out.cancelled = true;
        }
      } catch (e) {
        out.error = (e && e.code) || 'error';
        if (!(e && (e.code === 'cancelled' || e.code === 'USER_CANCELED'))) say('The store did not answer. Try again.');
      } finally { busy = false; }
      result(out);
      return out;
    }

    /* The default landing place for a result. A UI may wrap window.ggPaymentResult; the original is this. */
    function ggPaymentResult(r) {
      if (!r || known.indexOf(r.product) < 0) return;
      var price = priceOf(r.product);
      if (r.ok) {
        emit('unlock_result', { result: r.restored ? 'restored' : 'purchased', product: r.product, price: price });
        say(r.restored ? 'Purchase restored. Ads are off.' : 'Thank you. Ads are off.');
      } else if (r.pending) {
        emit('unlock_result', { result: 'pending', product: r.product, price: price });
        say('Waiting for approval. Ads go off when it clears.');
      } else if (r.error) {
        emit('unlock_result', { result: 'failed', product: r.product, price: price, error: String(r.error) });
      } else {
        emit('unlock_result', { result: r.restored ? 'nothing_to_restore' : 'cancelled', product: r.product, price: price });
        say(r.restored ? 'Nothing to restore' : 'Purchase cancelled');
      }
      try { deps.onResult && deps.onResult(r); } catch (e) {}
    }

    function priceOf(id) { return (info[id] && info[id].displayPrice) || ''; }

    var api = {
      CACHE_KEY: CACHE_KEY, DEFAULT_PRODUCT: DEFAULT_PRODUCT,
      init: init, refresh: refresh, loadProducts: loadProducts, go: go, ggPaymentResult: ggPaymentResult,
      buy: function (p) { return go('buy', p); }, restore: function (p) { return go('restore', p); },
      owned: function (id) { return !!owned[id]; },
      adFree: function () { return !!owned[DEFAULT_PRODUCT] || devOn(); },
      price: priceOf, productInfo: function (id) { return info[id] || null; },
      available: function () { return !!plugin || devOn(); }, // can a purchase be attempted here at all?
      hasStore: function () { return !!plugin; },
      onChange: function (f) { listeners.push(f); },
      promptShown: function (where) { emit('unlock_prompt_shown', { where: where, product: DEFAULT_PRODUCT, price: priceOf(DEFAULT_PRODUCT) }); },
      declined: function (where) { emit('unlock_result', { result: 'declined', where: where, product: DEFAULT_PRODUCT, price: priceOf(DEFAULT_PRODUCT) }); },
      get last() { return last; }, get ready() { return ready; }, get productsLoaded() { return loadedProducts; }
    };
    return api;
  }

  var api = { createPayments: createPayments, CACHE_KEY: CACHE_KEY, DEFAULT_PRODUCT: DEFAULT_PRODUCT };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GGPayments = api;
})(typeof self !== 'undefined' ? self : globalThis);
