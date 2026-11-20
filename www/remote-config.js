/* remote-config.js: balance and feature flags from a remote JSON, with the shipped values as the fallback.
 *
 * Fetch `https://<CONFIG_URL>/config.json` once at boot with a 2 s timeout, validate it against SCHEMA (strict: an unknown
 * key or a wrong type rejects the WHOLE document, nothing is applied), then write the allowed keys over the game's own
 * objects (SKILL and ECON are const objects, so they are mutated in place).
 *
 * LUCK IS NOT HERE, ON PURPOSE. No chance, weight or payout of any luck moment (the knucklebone, Press Your Luck, the Streak
 * Jackpot, chest reveals, tells) can be changed from a server: the schema has no "luck" section and no skill.press2, the applier
 * has no handle on the game's LUCK object, and a document that carries either is rejected whole. Odds change only with an app
 * update, which is what the store text says. There is no interstitial in v1, so its keys are gone too. The last good document is cached in
 * Preferences and applied at the next boot even when offline. Every telemetry event carries the applied version.
 *
 * SCHEMA 2 (game v1.0-rc10, the finds tray). Every Worth and target is three times the rc9b digits, and both caps are off. A document
 * written for rc9b (schema 1: targets 300 / 900 / 4,500, skill.cap) would make this build three times too easy, so it is never applied:
 *   - `schema` must be exactly 2, so a schema 1 document is rejected whole, wherever it comes from (server or cache);
 *   - the cache has a new key (gg_remote_config_v2). The rc9b cache (gg_remote_config_v1) is never read, and is deleted at first launch;
 *   - skill.cap is gone from the schema (the game ships Infinity for both), so a document that still carries it is rejected whole;
 *   - the digit-sized numbers have floors that the rc9b values fall under (targets, ch2T1, econ.gold.sealDiv), as a second lock.
 * An rc9b app that is handed a schema 2 document rejects it the same way (its schema must be 1) and plays on its shipped values.
 *
 * New in rc10 and changeable here (plain balance numbers): skill.long4, skill.stakeT, skill.first.t3, skill.bare.free.
 * New in rc10 and NOT changeable: skill.first.red (it is the red line, the same 80% of the wall's crack at which the luck rolls start,
 * LUCK.press.at), skill.first.tray (the tray size the on-screen text and How to Play state), skill.first.coach and skill.bare.coach
 * (how often a coaching line is shown, not balance). The guardian targets per tomb live in the game's TOMBS table, not in SKILL, and
 * their slips quote them in words, so they are not reachable from here either.
 */
(function (root) {
  'use strict';

  var TIMEOUT_MS = 2000;
  var SCHEMA_VERSION = 2;
  var CACHE_KEY = 'gg_remote_config_v2';
  var OLD_CACHE_KEYS = ['gg_remote_config_v1'];   // written by rc9b and earlier (schema 1, old digits): never read, removed at load

  // Leaf specs: n = number (min,max), i = integer, b = boolean, ia = integer array (len, min, max).
  var N = function (min, max) { return { t: 'n', min: min, max: max }; };
  var I = function (min, max) { return { t: 'i', min: min, max: max }; };
  var B = { t: 'b' };
  var IA = function (len, min, max) { return { t: 'ia', len: len, min: min, max: max }; };
  var NA = function (len, min, max) { return { t: 'na', len: len, min: min, max: max }; };   // number array (not only integers)

  var SCHEMA = {
    schema: { t: 'const', value: SCHEMA_VERSION },
    version: I(1, 1e9),
    note: { t: 's', max: 200, optional: true },
    flags: {
      ads: B,                                   // master switch for the rewarded slips (also needs AdMob ids in the build)
      adMemory: B, adSeal: B                    // the two slips, one switch each
    },
    ads: {
      memoryPerRun: I(0, 3),                     // +1 Memory, at most this many per run
      sealBonus: I(0, 3),                        // extra free seals granted for the next chamber
      cooldownSec: I(0, 3600)                    // minimum seconds between two videos
    },
    skill: {
      targets: IA(3, 450, 1e6),                 // base per-chamber targets (shipped 900 / 2,700 / 9,000); Tomb I's second chamber is ch2T1
      ch2T1: I(450, 1e6), firstReal: I(0, 1e6), // shipped 1,200 and 600 (firstReal 0 = off)
      deepMul: N(1, 3), long4: N(.1, 2),        // long4: the Long Dark's fourth chamber, share of the deep step (shipped 0.5)
      seals: { free: I(1, 9), sack: I(1, 9), memory: I(0, 3) },
      fever: { grace: I(0, 9), decay: N(0, 1) },
      mercy: { free: I(0, 9) },
      rel2: N(1, 5),
      first: { t3: I(0, 1e6) },                 // first tomb: chamber 3 asks this (shipped 7,500; 0 or anything not below targets[2] = off). tray, red, coach: not changeable
      bare: { free: I(0, 3) },                  // bare walls a chamber that cost nothing (shipped 1). coach: not changeable
      stakeT: NA(6, .8, 1.5)                    // what each Stake does to every target (shipped 1, 1, 1, 1.05, 1.1, 1.15); Stake 1 must stay 1
    },
    econ: {
      gold: { sealDiv: I(150, 1e6), chest: I(0, 1e5), tomb: I(0, 1e5), daily: I(0, 1e5), fenceSalvage: I(0, 1e5), sieve: I(0, 1e5) } // sealDiv: banked points per 1 Gold (shipped 300)
    }
  };

  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function checkLeaf(spec, v, path, errs) {
    var t = spec.t;
    if (t === 'const') { if (v !== spec.value) errs.push(path + ': must be ' + spec.value); return; }
    if (t === 'b') { if (typeof v !== 'boolean') errs.push(path + ': expected boolean'); return; }
    if (t === 's') { if (typeof v !== 'string' || v.length > spec.max) errs.push(path + ': expected short string'); return; }
    if (t === 'n' || t === 'i') {
      if (!isNum(v)) return void errs.push(path + ': expected number');
      if (t === 'i' && Math.floor(v) !== v) return void errs.push(path + ': expected integer');
      if (v < spec.min || v > spec.max) errs.push(path + ': out of range ' + spec.min + '..' + spec.max);
      return;
    }
    if (t === 'ia') {
      if (!Array.isArray(v) || v.length !== spec.len) return void errs.push(path + ': expected array of ' + spec.len);
      v.forEach(function (x, i) {
        if (!isNum(x) || Math.floor(x) !== x || x < spec.min || x > spec.max) errs.push(path + '[' + i + ']: expected integer ' + spec.min + '..' + spec.max);
      });
      // targets must not shrink as the tomb goes on; a typo that makes chamber 3 easier than chamber 1 is rejected
      if (path === 'skill.targets' && v.length === 3 && !(v[0] <= v[1] && v[1] <= v[2])) errs.push(path + ': must be non-decreasing');
    }
    if (t === 'na') {
      if (!Array.isArray(v) || v.length !== spec.len) return void errs.push(path + ': expected array of ' + spec.len);
      v.forEach(function (x, i) { if (!isNum(x) || x < spec.min || x > spec.max) errs.push(path + '[' + i + ']: expected number ' + spec.min + '..' + spec.max); });
      // Stake 1 is the base every published target is quoted at: to move it, move skill.targets
      if (path === 'skill.stakeT' && v[0] !== 1) errs.push(path + '[0]: Stake 1 must be 1');
    }
  }
  function isLeaf(spec) { return spec && typeof spec.t === 'string' && typeof spec.t !== 'object'; }
  function walk(spec, val, path, errs) {
    if (isLeaf(spec)) return void checkLeaf(spec, val, path, errs);
    if (!val || typeof val !== 'object' || Array.isArray(val)) return void errs.push(path + ': expected object');
    Object.keys(val).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(spec, k)) errs.push((path ? path + '.' : '') + k + ': unknown key'); });
    Object.keys(spec).forEach(function (k) {
      var p = (path ? path + '.' : '') + k;
      if (!Object.prototype.hasOwnProperty.call(val, k)) { if (path === '' && (k === 'schema' || k === 'version')) errs.push(p + ': required'); return; }
      walk(spec[k], val[k], p, errs);
    });
  }
  function validate(cfg) {
    var errs = [];
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return { ok: false, errors: ['config: expected object'] };
    walk(SCHEMA, cfg, '', errs);
    return { ok: errs.length === 0, errors: errs };
  }

  // flatten {skill:{seals:{free:3}}} -> [['skill.seals.free', 3], ...]  (arrays are leaves)
  function flatten(obj, prefix, out) {
    out = out || []; prefix = prefix || '';
    Object.keys(obj).forEach(function (k) {
      var v = obj[k], p = prefix ? prefix + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out); else out.push([p, v]);
    });
    return out;
  }
  var TARGET_ROOTS = { skill: 'SKILL', econ: 'ECON' };

  /* env: { SKILL, ECON, TARGETS_BASE }. Returns the applier. The game's LUCK object is deliberately not reachable from here. */
  function createApplier(env) {
    var roots = { skill: env.SKILL, econ: env.ECON };
    function resolve(path, create) {
      var parts = path.split('.'), o = roots[parts[0]];
      if (!o) return null;
      for (var i = 1; i < parts.length - 1; i++) { o = o[parts[i]]; if (!o || typeof o !== 'object') return null; }
      return { obj: o, key: parts[parts.length - 1] };
    }
    var baseline = null;                       // the shipped values for every path the schema allows, captured once
    function paths() { return flatten(buildShape()).filter(function (p) { return /^(skill|econ)\./.test(p[0]); }).map(function (p) { return p[0]; }); }
    function buildShape() { // a config-shaped object holding every allowed leaf as 0 (used only for its path list)
      function shape(spec) { if (isLeaf(spec)) return spec.t === 'ia' || spec.t === 'na' ? [] : 0; var o = {}; Object.keys(spec).forEach(function (k) { o[k] = shape(spec[k]); }); return o; }
      return shape(SCHEMA);
    }
    var accessors = {};                       // path -> original property descriptor, for values the game computes with a getter
    function capture() {
      baseline = {}; accessors = {};
      paths().forEach(function (p) {
        var r = resolve(p); if (!r || !(r.key in r.obj)) return;
        var v = r.obj[r.key]; baseline[p] = Array.isArray(v) ? v.slice() : v;
        var d = Object.getOwnPropertyDescriptor(r.obj, r.key);
        if (d && d.get && !d.set && d.configurable) accessors[p] = d;
      });
    }
    function setVal(p, v) {
      var r = resolve(p); if (!r || !(r.key in r.obj)) return false;   // a path the game does not have is skipped, never created
      var acc = accessors[p];
      if (acc) {
        // SKILL.seals.free is a getter (the game adds the Lamassu relic bonus on top of a captured base). Keep its logic and shift it by the change.
        var delta = v - baseline[p];
        if (v === baseline[p]) Object.defineProperty(r.obj, r.key, acc);
        else Object.defineProperty(r.obj, r.key, { configurable: true, enumerable: acc.enumerable, get: function () { return acc.get.call(this) + delta; } });
        return true;
      }
      if (Array.isArray(r.obj[r.key])) { var a = r.obj[r.key]; for (var i = 0; i < v.length; i++) a[i] = v[i]; }
      else r.obj[r.key] = v;
      return true;
    }
    // The game rebuilds TARGETS[i] at every newChamber() from TARGETS_BASE[i] (and from SKILL.targets[0], SKILL.firstReal, SKILL.ch2T1),
    // and mutates TARGETS itself (training wall, deeper chambers). So only TARGETS_BASE is kept in step; TARGETS is never written here.
    function syncTargets() {
      var t = roots.skill && roots.skill.targets; if (!t) return;
      if (Array.isArray(env.TARGETS_BASE)) for (var i = 0; i < 3 && i < t.length; i++) env.TARGETS_BASE[i] = t[i];
    }
    function reset() { if (!baseline) return; Object.keys(baseline).forEach(function (p) { setVal(p, baseline[p]); }); syncTargets(); }
    /* Apply a VALIDATED config on top of the shipped baseline. Returns the list of paths written. */
    function apply(cfg) {
      if (!baseline) capture();
      reset();
      var done = [];
      var allowed = {}; paths().forEach(function (p) { allowed[p] = 1; }); // only paths the schema names: nothing else in the game is writable from here
      flatten(cfg).forEach(function (kv) { if (allowed[kv[0]] === 1 && setVal(kv[0], kv[1])) done.push(kv[0]); });
      syncTargets();
      return done;
    }
    return { apply: apply, reset: reset, capture: capture, paths: paths };
  }

  /* deps: { fetch, prefs, setTimeout, clearTimeout, AbortController, log } */
  function createRemoteConfig(deps) {
    var state = { version: 0, source: 'shipped', flags: {}, ads: {}, rejected: null };
    var applier = null, listeners = [];
    function emit() { listeners.forEach(function (f) { try { f(state); } catch (e) {} }); }

    function accept(cfg, source) {
      var v = validate(cfg);
      if (!v.ok) { state.rejected = { source: source, errors: v.errors.slice(0, 8) }; emit(); return false; }
      if (applier) applier.apply(cfg);
      state.version = cfg.version; state.source = source;
      state.flags = Object.assign({}, cfg.flags || {}); state.ads = Object.assign({}, cfg.ads || {});
      state.rejected = null; emit();
      return true;
    }

    async function load(env, url) {
      applier = createApplier(env); applier.capture();
      var cached = null;
      // A cache written by an older build (rc9b: old digits, old keys) is never read. Remove it so nothing can pick it up later.
      for (var oi = 0; oi < OLD_CACHE_KEYS.length; oi++) { try { if (deps.prefs && deps.prefs.remove) await deps.prefs.remove(OLD_CACHE_KEYS[oi]); } catch (e) {} }
      try { var raw = deps.prefs && await deps.prefs.get(CACHE_KEY); if (raw) cached = JSON.parse(raw); } catch (e) {}
      // A cached document that no longer validates (wrong schema, a key this build does not have) applies nothing and is dropped.
      if (cached && !accept(cached, 'cache')) { try { if (deps.prefs && deps.prefs.remove) await deps.prefs.remove(CACHE_KEY); } catch (e) {} }
      if (!url) return state;
      var ctl = deps.AbortController ? new deps.AbortController() : null;
      var timer = (deps.setTimeout || setTimeout)(function () { if (ctl) ctl.abort(); }, TIMEOUT_MS);
      try {
        var res = await Promise.race([
          deps.fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }),
          new Promise(function (_, rej) { (deps.setTimeout || setTimeout)(function () { rej(new Error('timeout')); }, TIMEOUT_MS + 50); })
        ]);
        if (!res.ok) throw new Error('http ' + res.status);
        var cfg = await res.json();
        if (accept(cfg, 'remote')) { try { if (deps.prefs) await deps.prefs.set(CACHE_KEY, JSON.stringify(cfg)); } catch (e) {} }
        else if (deps.log) deps.log('remote config rejected', state.rejected);
      } catch (e) { if (deps.log) deps.log('remote config unavailable: ' + (e && e.message)); }
      finally { (deps.clearTimeout || clearTimeout)(timer); }
      return state;
    }
    return { load: load, state: state, onChange: function (f) { listeners.push(f); }, accept: accept };
  }

  function configUrl(host) {
    if (!host) return '';
    host = String(host).replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return 'https://' + host + '/config.json';
  }

  var api = { SCHEMA: SCHEMA, validate: validate, flatten: flatten, createApplier: createApplier, createRemoteConfig: createRemoteConfig, configUrl: configUrl, CACHE_KEY: CACHE_KEY, OLD_CACHE_KEYS: OLD_CACHE_KEYS, SCHEMA_VERSION: SCHEMA_VERSION, TIMEOUT_MS: TIMEOUT_MS };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GGRemoteConfig = api;
})(typeof self !== 'undefined' ? self : globalThis);
