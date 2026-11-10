/* ads.js: opt-in rewarded videos, and nothing else. v1 has no interstitial, no banner, no tracking prompt.
 *
 * On only when flags.ads is true (shipped default: false; remote config or FLAGS_ADS_DEFAULT turns it on) AND the build has an
 * AdMob rewarded unit id (or testing mode is on). With the flag off: AdMob is never initialised and body lacks .gg-ads, so the
 * wrapper CSS hides every element marked [data-gg-ad]. AdMob is initialised lazily, the first time a player taps a slip.
 *
 * Slips (the game draws them as <button data-gg-ad="memory|seal">):
 *   memory   +1 Memory (run.lives, max 3), at most ads.memoryPerRun (default 1) per run
 *   seal     +1 free seal in the NEXT chamber (state.xs, the game's own extra-seal counter), at most ads.sealBonus banked at a time
 * Any other kind (older game builds drew "reroll" and "chestpick") is refused with 'unknown_kind' and never touches AdMob.
 *
 * Ad-free (gg_adfree): adfree.js adds flags().adFree = true. The owner keeps both slips, but a tap is a free claim: same reward,
 * same caps, no video, AdMob never initialised.
 *
 * Game events: anything with training:true is ignored. "First tomb cleared" (gg_first_tomb_clear) is written only by a real,
 * final run_end with outcome 'won'. Nothing is shown or requested in response to any run ending.
 *
 * Tracking: the app never asks for App Tracking Transparency and requests non-personalised ads (npa) only.
 * Consent (UK and US-state forms): the AdMob plugin's UMP calls run before the first initialise, when the plugin has them.
 *
 * Caps survive a relaunch: they live in Preferences (gg_ad_caps_v1) keyed by the run id (run.tid, which the game's resume keeps).
 *   - the per-run Memory count is restored, so a relaunch does not hand out a second one;
 *   - a banked seal is restored and arrives exactly once, in the chamber after the one it was earned in; once it has landed, every
 *     wall of that chamber carries it (a collapse builds a new wall; a resume restores the same wall) and it is never added twice;
 *   - a Memory that was granted after the game's last autosave is given back on resume (the saved run does not contain it).
 */
(function (root) {
  'use strict';

  var KINDS = { memory: 'adMemory', seal: 'adSeal' };
  var GOOGLE_TEST_REWARDED_IOS = 'ca-app-pub-3940256099942544/1712485313'; // Google's public sample units; only used when testing is true
  var GOOGLE_TEST = {
    ios: { rewarded: 'ca-app-pub-3940256099942544/1712485313' },
    android: { rewarded: 'ca-app-pub-3940256099942544/5224354917' }
  };
  var K_CLEARED = 'gg_first_tomb_clear', K_CAPS = 'gg_ad_caps_v1';

  function blank(runId) { return { v: 1, run: runId || '', memory: 0, owed: 0, owedAt: 0, seal: 0, sealFrom: null, sealAt: null, sealN: 0 }; }

  /* deps: { admob, prefs, flags():{ads,adMemory,adSeal,adFree}, adsCfg():{memoryPerRun,sealBonus,cooldownSec}, config:{rewardedId|rewardedIdIos, testing},
             platform, env():{run,state}, emit(name,data), dispatch(name,detail), setActive(on, owner), paintLives(n), now(),
             resumeSnap: {tid,t}|null  the game's resume record as it was on disk BEFORE this launch touched it } */
  function createAds(deps) {
    var now = deps.now || Date.now;
    var inited = false, lastOffer = 0, busy = false;
    var caps = blank(''), loaded = false, loadP = null, restored = false;

    function flags() { return (deps.flags && deps.flags()) || {}; }
    function platform() { return deps.platform === 'android' ? 'android' : 'ios'; }
    function cfgv() { return deps.config || {}; }
    function adsCfg() { return (deps.adsCfg && deps.adsCfg()) || {}; }
    function env() { return (deps.env && deps.env()) || {}; }
    function unitId() { return cfgv().rewardedId || cfgv().rewardedIdIos || (cfgv().testing ? GOOGLE_TEST[platform()].rewarded : ''); }
    function owner() { return flags().adFree === true; }
    function enabled() { return flags().ads === true && (owner() || (!!deps.admob && !!unitId())); }
    function kindOn(kind) { return !!KINDS[kind] && enabled() && flags()[KINDS[kind]] !== false; }
    function refresh() { try { deps.setActive && deps.setActive(enabled(), enabled() && owner()); } catch (e) {} }

    async function cleared() { try { return (await deps.prefs.get(K_CLEARED)) === '1'; } catch (e) { return false; } }

    // ---- caps: one small record in Preferences, keyed by the run id
    function runKey() { var e = env(); return (e.run && (e.run.tid || 'run')) || ''; }
    function persist() { try { var p = deps.prefs.set(K_CAPS, JSON.stringify(caps)); if (p && p.catch) p.catch(function () {}); return p; } catch (e) { return null; } }
    /* The caps record belongs to one run. A different live run starts a clean record (a banked seal does not cross runs). */
    function forRun() {
      var k = runKey();
      if (k && caps.run !== k) { caps = blank(k); restored = true; }
      return caps;
    }
    function load() { return loadP || (loadP = doLoad()); }
    async function doLoad() {
      try {
        var raw = await deps.prefs.get(K_CAPS), c = raw ? JSON.parse(raw) : null;
        if (c && c.v === 1 && typeof c.run === 'string') {
          caps = blank(c.run);
          caps.memory = Math.max(0, c.memory | 0); caps.owed = Math.max(0, Math.min(3, c.owed | 0)); caps.owedAt = Number(c.owedAt) || 0;
          caps.seal = Math.max(0, Math.min(3, c.seal | 0)); caps.sealN = Math.max(0, Math.min(3, c.sealN | 0));
          caps.sealAt = typeof c.sealAt === 'number' && isFinite(c.sealAt) ? c.sealAt : null;
          caps.sealFrom = typeof c.sealFrom === 'number' && isFinite(c.sealFrom) ? c.sealFrom : null;
        }
      } catch (e) { caps = blank(''); } // a corrupt record is an empty record
      loaded = true;
      reconcile();
      return caps;
    }
    /* Once per launch, when the resumed run is the one the record belongs to: give back what the saved run does not contain. */
    function reconcile() {
      if (!loaded || restored) return;
      var e = env();
      if (!e.run || !e.run.tid) return;           // no live run yet (title or menu; the game resumes after the title): try again at the next chamber or offer
      restored = true;
      if (caps.run !== runKey()) return;          // another run: forRun() resets the record when it is next used
      var snap = deps.resumeSnap || null, dirty = false;
      if (caps.owed > 0) {
        if (snap && snap.tid === caps.run && Number(snap.t) < caps.owedAt) {
          // the game's autosave predates the grant, so the resumed run is missing that Memory
          var give = Math.min(caps.owed, Math.max(0, 3 - (e.run.lives | 0)));
          if (give > 0) { e.run.lives = (e.run.lives | 0) + give; try { deps.paintLives && deps.paintLives(e.run.lives); } catch (x) {} }
          caps.owedAt = Math.max(now(), Number(snap.t) + 1); dirty = true; // still unsaved as of now; a later autosave settles it
        } else { caps.owed = 0; caps.owedAt = 0; dirty = true; } // saved with the run (or the run is not resumable): nothing owed
      }
      if (e.state) dirty = stamp(e.state, true) || dirty; // the game rebuilt the chamber before this file was attached
      if (dirty) persist();
    }
    /* Make a chamber carry exactly the seal bonus it is owed. Safe to call any number of times for the same chamber: it never adds twice.
     *
     * A banked seal belongs to the chamber AFTER the one it was earned in (caps.sealFrom), so resuming the chamber whose cleared card
     * offered it does not spend it. Once it has landed in chamber i (caps.sealAt, caps.sealN) every wall of chamber i carries it.
     *
     * The game (rc9a on) saves the live wall, state.xs included, and on resume builds the chamber and then lays the saved wall over it,
     * which overwrites state.xs after newChamber has returned. So the bonus is tracked on the chamber itself, in two plain fields the
     * game saves with the wall: adxs (how many of its seals are ours) and adxsT (what state.xs was right after we added them). If both
     * still agree with state.xs the bonus is already in; if the saved wall predates the bonus, state.xs no longer matches and it is put back. */
    function stamp(state, built) {
      if (!state || state.train) return false;
      var i = state.i | 0, dirty = false;
      if (built) { // only a chamber the game has just built may move the books; a repaint or an event may see a stale chamber
        if (caps.sealN && caps.sealAt !== i) { caps.sealN = 0; caps.sealAt = null; dirty = true; } // the run has moved on
        if (caps.seal > 0 && (caps.sealFrom == null || i > caps.sealFrom)) {                       // a later chamber than the one it was earned in
          caps.sealN = (caps.sealAt === i ? caps.sealN : 0) + caps.seal; caps.sealAt = i; caps.seal = 0; caps.sealFrom = null; dirty = true;
        }
      }
      var n = caps.sealAt === i ? caps.sealN : 0, added = false;
      if (n > 0 && !(state.adxs === n && (state.xs | 0) === state.adxsT)) {
        state.xs = (state.xs | 0) + n; state.adxs = n; state.adxsT = state.xs; added = true;
      }
      if (dirty) persist();
      return added;
    }

    /* Google's User Messaging Platform: shows the consent form where the law needs one (UK, some US states). */
    async function consent() {
      var a = deps.admob;
      if (!a || typeof a.requestConsentInfo !== 'function') return '';
      var info = await a.requestConsentInfo({});
      if (info && info.status === 'REQUIRED' && info.isConsentFormAvailable && typeof a.showConsentForm === 'function') info = await a.showConsentForm();
      return info && info.status || '';
    }

    async function init() {
      if (inited || !enabled() || !deps.admob) return inited;
      try { await consent(); } catch (e) {} // a failed consent request never blocks the game; ads are requested non-personalised either way
      try { await deps.admob.initialize({ initializeForTesting: !!cfgv().testing }); inited = true; } catch (e) { inited = false; }
      return inited;
    }

    /* Every game telemetry event passes through here. Training events are ignored; nothing is ever shown from here. */
    async function onEvent(ev) {
      if (!ev || ev.training === true) return;
      if (ev.event === 'run_end' && !ev.provisional && ev.outcome === 'won') { try { await deps.prefs.set(K_CLEARED, '1'); } catch (e) {} }
    }

    function training() { var e = env(); return !!((e.run && e.run.train) || (e.state && e.state.train)); }

    function canOffer(kind) {
      if (!KINDS[kind]) return 'unknown_kind';
      if (!kindOn(kind)) return 'off';
      if (!loaded) return 'not_ready';
      if (training()) return 'training';
      var cfg = adsCfg(), e = env(), c = forRun();
      var cd = (cfg.cooldownSec == null ? 0 : cfg.cooldownSec) * 1000;
      if (!owner() && lastOffer && now() - lastOffer < cd) return 'cooldown'; // the pause is between two videos; a free claim has none
      if (kind === 'memory') {
        var max = cfg.memoryPerRun == null ? 1 : cfg.memoryPerRun;
        if (!e.run || c.memory >= max) return 'run_cap';
        if (e.run.lives >= 3) return 'full';
      }
      if (kind === 'seal') { var sb = cfg.sealBonus == null ? 1 : cfg.sealBonus; if (!e.run || !sb || c.seal >= sb) return 'run_cap'; }
      return '';
    }

    function grant(kind) {
      var e = env(), cfg = adsCfg(), c = forRun();
      if (kind === 'memory') {
        if (!e.run || e.run.lives >= 3) return false;
        e.run.lives++; c.memory++; c.owed = Math.min(3, c.owed + 1); c.owedAt = now(); persist();
        try { deps.dispatch && deps.dispatch('gg:ad-reward', { kind: kind, applied: true }); } catch (x) {}
        if (deps.paintLives) deps.paintLives(e.run.lives);
        return true;
      }
      if (kind === 'seal') { // banked for the chamber after this one
        c.seal += (cfg.sealBonus == null ? 1 : cfg.sealBonus) || 1; c.sealFrom = e.state && typeof e.state.i === 'number' ? e.state.i | 0 : null; persist(); return true;
      }
      return false;
    }

    /* The player tapped a slip. Always opt-in; never called by anything else. */
    async function offer(kind) {
      if (!KINDS[kind]) return { ok: false, reason: 'unknown_kind' };
      await load(); reconcile();
      var why = canOffer(kind);
      if (why) return { ok: false, reason: why };
      if (busy) return { ok: false, reason: 'busy' };
      busy = true;
      try {
        if (owner()) { // Ad-free: the same reward under the same caps, with no video and no AdMob
          var got = grant(kind);
          if (deps.emit) deps.emit('ad_free_claim', { reward: kind, applied: got });
          return { ok: got, reason: got ? '' : 'not_applicable', free: true };
        }
        lastOffer = now();
        if (!(await init())) return { ok: false, reason: 'init_failed' };
        if (deps.emit) deps.emit('ad_offered', { reward: kind });
        var rewarded = false, off = [];
        try {
          if (deps.admob.addListener) {
            var h = await deps.admob.addListener('onRewardedVideoAdReward', function () { rewarded = true; });
            if (h && h.remove) off.push(h);
          }
          await deps.admob.prepareRewardVideoAd({ adId: unitId(), isTesting: !!cfgv().testing, npa: true });
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
      if (!loaded) { // the record is still being read (first moments after launch): stamp this chamber as soon as it is
        load().then(function () { if (state && !state.train && caps.run === runKey()) stamp(state, true); });
        return false;
      }
      reconcile();
      if (!state || state.train) return false;
      forRun();
      return stamp(state, true);
    }
    /* Cheap re-check, called after the game repaints and on its events: puts the bonus back if a resumed wall overwrote it. */
    function sync(state) {
      if (!loaded || !state || state.train || caps.run !== runKey()) return false;
      return stamp(state, false);
    }

    function onClick(ev) {
      var t = ev && ev.target && ev.target.closest ? ev.target.closest('[data-gg-ad]') : null;
      if (!t) return;
      ev.preventDefault && ev.preventDefault();
      offer(t.getAttribute('data-gg-ad'));
    }

    return { enabled: enabled, kindOn: kindOn, owner: owner, consent: consent, unitIds: function () { return { rewarded: unitId() }; }, offer: offer, onEvent: onEvent,
             onNewChamber: onNewChamber, sync: sync, onClick: onClick, refresh: refresh, canOffer: canOffer, load: load, firstClear: cleared,
             pending: function () { return { seal: caps.seal, memory: caps.memory, run: caps.run, adFree: owner() }; } };
  }

  var api = { createAds: createAds, KINDS: KINDS, K_CLEARED: K_CLEARED, K_CAPS: K_CAPS, GOOGLE_TEST_REWARDED_IOS: GOOGLE_TEST_REWARDED_IOS, GOOGLE_TEST: GOOGLE_TEST };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GGAds = api;
})(typeof self !== 'undefined' ? self : globalThis);
