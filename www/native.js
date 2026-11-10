/* native.js: the bridge between the unmodified game and Capacitor.
 *
 * Loaded BEFORE the game script (so the save shim exists when the game's Store starts), then `GG_NATIVE.attach(env)` is
 * called by the last <script> of the page, after the game has defined its globals. Nothing here edits the game file:
 * game functions are wrapped by reassigning the global (function declarations are writable properties of window).
 *
 * Capacitor plugins are read from window.Capacitor.Plugins (no bundler), so everything is feature-detected and every call is
 * wrapped in try/catch: a missing plugin means a missing feature, never a broken game.
 */
(function (root) {
  'use strict';
  var G = root.GG_NATIVE = root.GG_NATIVE || { native: false, platform: 'web', flags: { ads: false } };
  var APP = root.GG_APP_CONFIG || {};
  var C = root.Capacitor;
  var Save = root.GGSave, RC = root.GGRemoteConfig, Tel = root.GGTelemetry, Ads = root.GGAds, Pay = root.GGPayments, AdFree = root.GGAdFree, Consent = root.GGConsent;

  function plug(name) { try { return C && C.Plugins && C.Plugins[name]; } catch (e) { return null; } }
  function safe(fn) { try { var r = fn(); if (r && r.catch) r.catch(function () {}); return r; } catch (e) { return null; } }

  // ---- Preferences (native) or a localStorage stand-in (plain browser, tests)
  function makePrefs() {
    var P = G.native && plug('Preferences');
    if (P) return {
      get: async function (k) { var r = await P.get({ key: k }); return r && r.value != null ? r.value : null; },
      set: async function (k, v) { await P.set({ key: k, value: String(v) }); },
      remove: async function (k) { await P.remove({ key: k }); }
    };
    return {
      get: async function (k) { try { return localStorage.getItem('ggp_' + k); } catch (e) { return null; } },
      set: async function (k, v) { try { localStorage.setItem('ggp_' + k, String(v)); } catch (e) {} },
      remove: async function (k) { try { localStorage.removeItem('ggp_' + k); } catch (e) {} }
    };
  }
  function makeICloud() {
    var P = plug('ICloudKV');
    if (!P) return null;
    return {
      available: async function () { var r = await P.isAvailable(); return !!(r && r.available); },
      get: async function (k) { var r = await P.get({ key: k }); return r && r.value != null ? r.value : null; },
      set: async function (k, v) { await P.set({ key: k, value: v }); },
      remove: async function (k) { await P.remove({ key: k }); },
      sync: async function () { await P.sync(); }
    };
  }

  var prefs = makePrefs();
  G.prefs = prefs;

  // The game's resume record as it is on disk now, before the game script runs (the game rewrites it as it resumes).
  // ads.js compares its time with the time of a rewarded Memory to know whether the saved run already contains it.
  G.resumeSnap = (function () {
    try { var z = JSON.parse(root.localStorage.getItem('rw_resume') || 'null'); return z && z.tid ? { tid: String(z.tid), t: Number(z.t) || 0 } : null; } catch (e) { return null; }
  })();

  // ---- 1. save backend, chosen at boot
  G.backend = Save ? Save.selectBackend({ Capacitor: G.native ? C : null, claude: root.claude }) : 'local';
  if (G.backend === 'native' && Save && !root.claude) {
    var store = Save.createStore(prefs, makeICloud());
    root.claude = Save.createClaudeShim(store, root.localStorage, { prefs: prefs });
    G.saveStore = store;
  }

  // ---- 2. everything that needs the game's globals
  G.attach = function (env) {
    env = env || {};
    var web = root;

    // -- haptics
    var H = plug('Haptics'), lastFire = 0, lastNamed = 0;
    function allowed() { var s = env.settings && env.settings(); return !(s && s.haptics === false); }
    function fire(kind, named) {
      if (!H || !G.native || !allowed()) return;
      var t = Date.now();
      if (!named && t - lastFire < 40) return; // named events (seal, collapse, jackpot) are never swallowed by the generic ones
      lastFire = t; if (named) lastNamed = t;
      safe(function () {
        if (kind === 'success' || kind === 'warning' || kind === 'error') return H.notification({ type: kind.toUpperCase() });
        return H.impact({ style: kind.toUpperCase() }); // light | medium | heavy
      });
    }
    function wrap(name, after, named) {
      var orig = web[name];
      if (typeof orig !== 'function') return false;
      web[name] = function () {
        if (named) lastNamed = Date.now(); // the game's own hap() calls inside this function are then skipped (one buzz, not two)
        var r = orig.apply(this, arguments); try { after.apply(this, arguments); } catch (e) {} return r;
      };
      return true;
    }
    G.wrapped = {
      sealGo: wrap('sealGo', function () { fire('medium', true); }, true),
      collapse: wrap('collapse', function () { fire('error', true); setTimeout(function () { fire('heavy', true); }, 120); }, true),
      luckJackpot: wrap('luckJackpot', function () { fire('success', true); }, true),
      beep: wrap('beep', function (freq) { if (freq < 100 && Date.now() - lastNamed > 300) fire('heavy', false); }), // the low "thud" tones only
      hap: wrap('hap', function (p) { // every other pattern the game already asks for (vibrate has no effect on iOS)
        if (Date.now() - lastNamed < 300) return;
        var a = Array.isArray(p) ? p : [p], peak = 0, i; for (i = 0; i < a.length; i++) if (a[i] > peak) peak = a[i];
        fire(peak >= 100 ? 'medium' : 'light', false);
      })
    };

    // -- status bar, lifecycle
    var SB = plug('StatusBar'), App = plug('App');
    function hideBar() { if (SB && G.native) safe(function () { return SB.hide(); }); }
    hideBar();
    var tel; // assigned below; lifecycle handlers reference it lazily
    if (App && G.native) {
      safe(function () {
        return App.addListener('appStateChange', function (st) {
          if (st && st.isActive === false) {
            safe(function () { if (typeof web.pauseOpen === 'function') web.pauseOpen(); }); // the game's own pause (it waits for a seal in flight)
            if (tel) safe(function () { return tel.flush(true); });
          } else hideBar();
        });
      });
    }

    // -- telemetry
    var rcState = { version: APP.shippedConfigVersion || 0, source: 'shipped' };
    var rc = RC && RC.createRemoteConfig({ fetch: web.fetch && web.fetch.bind(web), prefs: prefs, AbortController: web.AbortController, log: function () { try { console.info.apply(console, ['[gg]'].concat([].slice.call(arguments))); } catch (e) {} } });
    var ph = APP.posthog || {};
    tel = Tel && Tel.createTelemetry({
      fetch: web.fetch && web.fetch.bind(web), prefs: prefs, ls: web.localStorage,
      setInterval: web.setInterval.bind(web), clearInterval: web.clearInterval.bind(web),
      online: function () { return web.navigator.onLine !== false; },
      key: ph.key, host: ph.host,
      meta: function () {
        return { app_build: APP.build, platform: G.platform, native: !!G.native,
          remote_config_version: rc && rc.state.version ? rc.state.version : (APP.shippedConfigVersion || 0), remote_config_source: rc ? rc.state.source : 'shipped' };
      }
    });
    G.telemetry = tel;

    // -- purchases (gg_adfree). The store plugin is StoreKit on iOS and PlayBilling on Android; absent on the web.
    G.flags = Object.assign({ ads: false }, APP.flagsDefault || {});
    function emitTel(n, d) { var f = web.telEmit; if (typeof f === 'function') safe(function () { return f(n, d); }); }
    var pay = Pay && Pay.createPayments({
      plugin: G.native ? (plug('StoreKit') || plug('PlayBilling')) : null, prefs: prefs, products: APP.products || [], dev: APP.dev === true,
      ls: web.localStorage, emit: emitTel, platform: G.platform,
      toast: function (m) { if (typeof web.uiToast === 'function') safe(function () { return web.uiToast(m); }); }
    });
    var adfree = AdFree && pay && AdFree.createAdFree({ payments: pay, doc: web.document, adsEnabled: function () { return !!(ads && ads.enabled()); } });
    G.payments = pay; G.adfree = adfree;
    if (pay) {
      web.Payments = pay; // the contract: window.Payments.go(action, product)
      if (typeof web.ggPaymentResult !== 'function') web.ggPaymentResult = pay.ggPaymentResult; // and window.ggPaymentResult({product, ok, restored})
    }
    function adFlags() { return adfree ? adfree.effectiveFlags(G.flags) : G.flags; } // the owner of gg_adfree gets adFree:true: slips become free claims
    var admobCfg = APP.admob || {};
    var adCfg = G.platform === 'android'
      ? { rewardedId: admobCfg.rewardedIdAndroid, testing: admobCfg.testing }
      : { rewardedIdIos: admobCfg.rewardedIdIos, testing: admobCfg.testing };

    // -- ads (opt-in rewarded videos only; no interstitial, no tracking prompt)
    var ads = Ads && Ads.createAds({
      admob: G.native ? plug('AdMob') : null, prefs: prefs, config: adCfg, platform: G.platform, resumeSnap: G.resumeSnap,
      flags: adFlags, adsCfg: function () { return (rc && rc.state.ads) || {}; },
      env: function () { return { run: env.run && env.run(), state: env.state && env.state() }; },
      emit: function (n, d) { var f = web.telEmit; if (typeof f === 'function') safe(function () { return f(n, d); }); },
      dispatch: function (n, d) { web.document.dispatchEvent(new web.CustomEvent(n, { detail: d })); },
      setActive: function (on, owner) { var cl = web.document.body.classList; cl.toggle('gg-ads', !!on); cl.toggle('gg-adfree', !!owner); if (owner && adfree) safe(function () { return adfree.watchSlips(); }); },
      paintLives: function (n) { var el = web.document.getElementById('lives'); if (el) el.textContent = '♥'.repeat(Math.max(0, n)) + '♡'.repeat(Math.max(0, 3 - n)); }
    });
    G.ads = ads;
    if (ads) {
      web.document.addEventListener('click', ads.onClick, true);
      wrap('newChamber', function () { ads.onNewChamber(env.state && env.state()); });
      safe(function () { return ads.load(); }); // read the persisted caps now; a run the game has already resumed gets its banked rewards back
    }

    // -- analytics consent: one question on first launch, a switch in Settings. Nothing is sent, and no ID exists, before a "yes".
    var consent = Consent && tel && Consent.createConsent({ telemetry: tel, doc: web.document, emit: emitTel });
    G.consent = consent;
    if (consent) { consent.wrapSettings(web); safe(function () { return consent.maybeAsk(); }); }

    if (tel) {
      web.document.addEventListener('gg:tel', function (e) {
        var ev = e && e.detail; if (!ev) return;
        safe(function () { return tel.ingest(ev); });
        if (ads) safe(function () { return ads.onEvent(ev); });
      });
      web.addEventListener('pagehide', function () { safe(function () { return tel.flush(true); }); });
      tel.start();
    }

    // -- remote config (cached copy first, then a 2 s fetch). Flags and ad values come from it too.
    if (rc) {
      rc.onChange(function (s) { G.flags = Object.assign({ ads: false }, APP.flagsDefault || {}, s.flags); if (ads) ads.refresh(); });
      var url = RC.configUrl(APP.configUrl);
      safe(function () { return rc.load({ SKILL: env.SKILL, ECON: env.ECON, TARGETS: env.TARGETS, TARGETS_BASE: env.TARGETS_BASE }, url).then(function () { G.rcLoaded = true; }); });
      G.remoteConfig = rc;
    }
    if (ads) ads.refresh();

    if (pay) {
      if (adfree) adfree.wrapSettings(web);
      pay.onChange(function () { if (ads) ads.refresh(); if (adfree) safe(function () { return adfree.paintSettings(); }); });
      safe(function () { return pay.init(); });
    }

    G.ready = true;
    try { web.document.dispatchEvent(new web.CustomEvent('gg:native-ready')); } catch (e) {}
  };
})(typeof self !== 'undefined' ? self : globalThis);
