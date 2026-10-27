/* ads.js: rewarded ads plus ONE interstitial. Off unless flags.ads is true (remote config) AND the build has an AdMob rewarded unit id
 * (or testing mode is on). With the flag off: AdMob is never initialised, ATT is never asked, and body lacks .gg-ads,
 * so the wrapper CSS hides every element marked [data-gg-ad]. The game has no ad buttons today; when the Design seat adds
 * them they only need the attribute:  <button data-gg-ad="memory|seal|reroll|chestpick">.  Clicks are handled here.
 *
 * Rewards:  memory     +1 Memory (run.lives, max 3), at most ads.memoryPerRun (default 1) per run
 *           seal       +1 free seal in the NEXT chamber (state.xs, the game's own extra-seal counter), via newChamber()
 *           reroll     fires 'gg:ad-reward' {kind:'reroll'}; the Black Market must listen (it is a closure, not reachable from here)
 *           chestpick  fires 'gg:ad-reward' {kind:'chestpick'}; the chest screen must listen
 * Interstitial: at most once per `ads.interstitialEvery` finished runs (default 2), never closer than `ads.interstitialMinGapSec`
 *           (default 180 s) to the previous one, only on the run summary screen (the run_end event fires from showSummary), and never
 *           before the first tomb clear of the profile: the run that makes the first clear never shows one. flags.adInterstitial can
 *           switch it off remotely. Counters live in Preferences so they survive restarts.
 * ATT (iOS only): asked once, only when ads are on, and only after the first tomb clear (a run_end with outcome 'won').
 * Consent (EU/UK/US-state forms): the AdMob plugin's UMP calls run before the first initialise, when the plugin has them.
 * Everything here is switched off by the ad-free purchase: adfree.js makes flags().ads false, so enabled() is false.
 */
(function (root) {
  'use strict';

  var KINDS = { memory: 'adMemory', seal: 'adSeal', reroll: 'adReroll', chestpick: 'adChestPick' };
  var GOOGLE_TEST_REWARDED_IOS = 'ca-app-pub-3940256099942544/1712485313'; // Google's public sample units; only used when testing is true
  var GOOGLE_TEST = {
    ios: { rewarded: 'ca-app-pub-3940256099942544/1712485313', interstitial: 'ca-app-pub-3940256099942544/4411468910' },
    android: { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' }
  };
  var K_CLEARED = 'gg_first_tomb_clear', K_ATT = 'gg_att_asked', K_RUNS = 'gg_inter_runs', K_LAST = 'gg_inter_last';

  /* deps: { admob, prefs, flags():{...}, adsCfg():{memoryPerRun,sealBonus,cooldownSec}, config:{rewardedIdIos, testing},
             env():{run,state}, emit(name,data), dispatch(name,detail), setActive(bool), now() } */
  function createAds(deps) {
    var now = deps.now || Date.now;
    var inited = false, att = 'unknown', lastOffer = 0, busy = false, interBusy = false;
    var memoryRuns = {}, pendingSeal = 0;

    function flags() { return (deps.flags && deps.flags()) || {}; }
    function platform() { return deps.platform === 'android' ? 'android' : 'ios'; }
    function cfgv() { return deps.config || {}; }
    function unitId() { return cfgv().rewardedId || cfgv().rewardedIdIos || (cfgv().testing ? GOOGLE_TEST[platform()].rewarded : ''); }
    function interstitialUnitId() { return cfgv().interstitialId || (cfgv().testing ? GOOGLE_TEST[platform()].interstitial : ''); }
    function enabled() { return flags().ads === true && !!deps.admob && !!unitId(); }
    function kindOn(kind) { return enabled() && flags()[KINDS[kind]] !== false; }
    function interstitialOn() { return enabled() && flags().adInterstitial !== false && !!interstitialUnitId() && typeof deps.admob.prepareInterstitial === 'function'; }
    function refresh() { try { deps.setActive && deps.setActive(enabled()); } catch (e) {} }

    async function cleared() { try { return (await deps.prefs.get(K_CLEARED)) === '1'; } catch (e) { return false; } }
    async function asked() { try { return (await deps.prefs.get(K_ATT)) === '1'; } catch (e) { return false; } }

    /* Google's User Messaging Platform: shows the consent form where the law needs one (EEA, UK, some US states). */
    async function consent() {
      var a = deps.admob;
      if (!a || typeof a.requestConsentInfo !== 'function') return '';
      var info = await a.requestConsentInfo({});
      if (info && info.status === 'REQUIRED' && info.isConsentFormAvailable && typeof a.showConsentForm === 'function') info = await a.showConsentForm();
      return info && info.status || '';
    }

    async function init() {
      if (inited || !enabled()) return inited;
      try { await consent(); } catch (e) {} // a failed consent request never blocks the game; AdMob itself withholds personalised ads without it
      try { await deps.admob.initialize({ initializeForTesting: !!(deps.config && deps.config.testing) }); inited = true; } catch (e) { inited = false; }
      return inited;
    }

    /* ATT: only when ads are on, only after the first tomb clear, only once per install. Returns the status or ''. */
    async function maybeAskTracking() {
      if (!enabled() || platform() !== 'ios') return ''; // App Tracking Transparency is an iOS thing
      if (!(await cleared()) || (await asked())) return '';
      try {
        var cur = deps.admob.trackingAuthorizationStatus ? (await deps.admob.trackingAuthorizationStatus()).status : 'notDetermined';
        if (cur === 'notDetermined') {
          await deps.admob.requestTrackingAuthorization(); // resolves with no payload: ask again for the answer
          att = deps.admob.trackingAuthorizationStatus ? (await deps.admob.trackingAuthorizationStatus()).status : 'unknown';
        } else att = cur;
      } catch (e) { att = 'error'; }
      try { await deps.prefs.set(K_ATT, '1'); } catch (e) {}
      return att;
    }

    /* every game telemetry event passes through here */
    async function onEvent(ev) {
      if (!ev || ev.event !== 'run_end' || ev.provisional) return;
      var wasCleared = await cleared(); // the state BEFORE this run: the run that makes the first clear gets no interstitial
      if (ev.outcome === 'won') { try { await deps.prefs.set(K_CLEARED, '1'); } catch (e) {} }
      await maybeAskTracking(); // runs at the end of any run after the first clear, never mid-run
      await onRunFinished(wasCleared);
    }

    async function num(k) { try { return Number(await deps.prefs.get(k)) || 0; } catch (e) { return 0; } }

    /* A run just ended and its summary is on screen. Counts it, and shows the interstitial when every rule allows. */
    async function onRunFinished(wasCleared) {
      var runs = (await num(K_RUNS)) + 1;
      try { await deps.prefs.set(K_RUNS, String(runs)); } catch (e) {}
      var cfg = (deps.adsCfg && deps.adsCfg()) || {};
      var every = cfg.interstitialEvery == null ? 2 : cfg.interstitialEvery, gap = (cfg.interstitialMinGapSec == null ? 180 : cfg.interstitialMinGapSec) * 1000;
      if (!interstitialOn()) return { shown: false, reason: 'off' };
      if (!wasCleared) return { shown: false, reason: 'before_first_clear' };
      if (runs < every) return { shown: false, reason: 'every' };
      var last = await num(K_LAST);
      if (last && now() - last < gap) return { shown: false, reason: 'gap' };
      return showInterstitial();
    }

    async function showInterstitial() {
      if (interBusy || busy) return { shown: false, reason: 'busy' };
      interBusy = true;
      try {
        if (!(await init())) return { shown: false, reason: 'init_failed' };
        try {
          await deps.admob.prepareInterstitial({ adId: interstitialUnitId(), isTesting: !!cfgv().testing });
          await deps.admob.showInterstitial(); // resolves once the ad is on screen; the gap is measured from here
        } catch (e) {
          if (deps.emit) deps.emit('ad_interstitial_failed', {});
          return { shown: false, reason: 'no_fill' }; // counters stay: the next finished run tries again
        }
        try { await deps.prefs.set(K_LAST, String(now())); await deps.prefs.set(K_RUNS, '0'); } catch (e) {}
        if (deps.emit) deps.emit('ad_interstitial_shown', {});
        return { shown: true, reason: '' };
      } finally { interBusy = false; }
    }

    function runKey() { var e = (deps.env && deps.env()) || {}; return e.run && (e.run.tid || 'run'); }

    function canOffer(kind) {
      if (!KINDS[kind]) return 'unknown_kind';
      if (!kindOn(kind)) return 'off';
      var cfg = (deps.adsCfg && deps.adsCfg()) || {};
      var cd = (cfg.cooldownSec == null ? 0 : cfg.cooldownSec) * 1000;
      if (lastOffer && now() - lastOffer < cd) return 'cooldown';
      var e = (deps.env && deps.env()) || {};
      if (kind === 'memory') {
        var max = cfg.memoryPerRun == null ? 1 : cfg.memoryPerRun;
        if (!e.run || (memoryRuns[runKey()] | 0) >= max) return 'run_cap';
        if (e.run.lives >= 3) return 'full';
      }
      if (kind === 'seal') { var sb = cfg.sealBonus == null ? 1 : cfg.sealBonus; if (!sb || pendingSeal >= sb) return 'run_cap'; }
      return '';
    }

    function grant(kind) {
      var e = (deps.env && deps.env()) || {}, cfg = (deps.adsCfg && deps.adsCfg()) || {};
      if (kind === 'memory') {
        if (!e.run || e.run.lives >= 3) return false;
        e.run.lives++; memoryRuns[runKey()] = (memoryRuns[runKey()] | 0) + 1;
        try { deps.dispatch && deps.dispatch('gg:ad-reward', { kind: kind, applied: true }); } catch (x) {}
        if (deps.paintLives) deps.paintLives(e.run.lives);
        return true;
      }
      if (kind === 'seal') { pendingSeal += (cfg.sealBonus == null ? 1 : cfg.sealBonus) || 1; return true; }
      try { deps.dispatch && deps.dispatch('gg:ad-reward', { kind: kind, applied: false }); } catch (x) {}
      return true; // the listener in the game applies it
    }

    /* The player tapped an ad button. Always opt-in; never called by anything else. */
    async function offer(kind) {
      var why = canOffer(kind);
      if (why) return { ok: false, reason: why };
      if (busy) return { ok: false, reason: 'busy' };
      busy = true; lastOffer = now();
      try {
        if (!(await init())) return { ok: false, reason: 'init_failed' };
        if (deps.emit) deps.emit('ad_offered', { reward: kind });
        var rewarded = false, off = [];
        try {
          if (deps.admob.addListener) {
            var h = await deps.admob.addListener('onRewardedVideoAdReward', function () { rewarded = true; });
            if (h && h.remove) off.push(h);
          }
          await deps.admob.prepareRewardVideoAd({ adId: unitId(), isTesting: !!(deps.config && deps.config.testing) });
          var item = await deps.admob.showRewardVideoAd();
          if (item && (item.amount > 0 || item.type)) rewarded = true;
        } catch (e) { return { ok: false, reason: 'no_fill' }; }
        finally { off.forEach(function (h) { try { h.remove(); } catch (e) {} }); }
        if (!rewarded) return { ok: false, reason: 'closed_early' };
        var applied = grant(kind);
        if (deps.emit) deps.emit('ad_watched', { reward: kind, applied: applied });
        return { ok: applied, reason: applied ? '' : 'not_applicable' };
      } finally { busy = false; }
    }

    /* wrap target for the game's newChamber(i): call after the original has built `state` */
    function onNewChamber(state) {
      if (pendingSeal > 0 && state && !state.train) { state.xs = (state.xs | 0) + pendingSeal; pendingSeal = 0; return true; }
      return false;
    }

    function onClick(ev) {
      var t = ev && ev.target && ev.target.closest ? ev.target.closest('[data-gg-ad]') : null;
      if (!t) return;
      ev.preventDefault && ev.preventDefault();
      offer(t.getAttribute('data-gg-ad'));
    }

    return { enabled: enabled, kindOn: kindOn, interstitialOn: interstitialOn, onRunFinished: onRunFinished, consent: consent, unitIds: function () { return { rewarded: unitId(), interstitial: interstitialUnitId() }; }, offer: offer, onEvent: onEvent, onNewChamber: onNewChamber, onClick: onClick, refresh: refresh,
             maybeAskTracking: maybeAskTracking, canOffer: canOffer, pending: function () { return { seal: pendingSeal, memoryRuns: memoryRuns }; }, att: function () { return att; } };
  }

  var api = { createAds: createAds, KINDS: KINDS, K_CLEARED: K_CLEARED, K_ATT: K_ATT, K_RUNS: K_RUNS, K_LAST: K_LAST, GOOGLE_TEST_REWARDED_IOS: GOOGLE_TEST_REWARDED_IOS, GOOGLE_TEST: GOOGLE_TEST };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GGAds = api;
})(typeof self !== 'undefined' ? self : globalThis);
