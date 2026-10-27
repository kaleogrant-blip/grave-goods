/* remote-config.js: balance and feature flags from a remote JSON, with the shipped values as the fallback.
 *
 * Fetch `https://<CONFIG_URL>/config.json` once at boot with a 2 s timeout, validate it against SCHEMA (strict: an unknown
 * key or a wrong type rejects the WHOLE document, nothing is applied), then write the allowed keys over the game's own
 * objects (SKILL, LUCK, ECON are const objects, so they are mutated in place). The last good document is cached in
 * Preferences and applied at the next boot even when offline. Every telemetry event carries the applied version.
 */
(function (root) {
  'use strict';

  var TIMEOUT_MS = 2000;
  var CACHE_KEY = 'gg_remote_config_v1';

  // Leaf specs: n = number (min,max), i = integer, b = boolean, ia = integer array (len, min, max).
  var N = function (min, max) { return { t: 'n', min: min, max: max }; };
  var I = function (min, max) { return { t: 'i', min: min, max: max }; };
  var B = { t: 'b' };
  var IA = function (len, min, max) { return { t: 'ia', len: len, min: min, max: max }; };

  var SCHEMA = {
    schema: { t: 'const', value: 1 },
    version: I(1, 1e9),
    note: { t: 's', max: 200, optional: true },
    flags: {
      ads: B,                                   // master switch for rewarded ads (also needs AdMob ids in the build)
      adMemory: B, adSeal: B, adReroll: B, adChestPick: B,
      adInterstitial: B                          // the one interstitial, on the run summary screen only
    },
    ads: {
      memoryPerRun: I(0, 3),                     // +1 Memory, at most this many per run
      sealBonus: I(0, 3),                        // extra free seals granted for the next chamber
      cooldownSec: I(0, 3600),                   // minimum seconds between two ad offers
      interstitialEvery: I(1, 20),               // an interstitial at most once per this many finished runs
      interstitialMinGapSec: I(0, 86400)         // and never closer together than this
    },
    skill: {
      targets: IA(3, 50, 1e7),                  // Tomb I per-chamber targets
      ch2T1: I(50, 1e7), firstReal: I(0, 1e7),
      deepMul: N(1, 3), long4: N(.1, 2),
      seals: { free: I(1, 9), sack: I(1, 9), memory: I(0, 3) },
      fever: { grace: I(0, 9), decay: N(0, 1) },
      press2: { lucky: I(-30, 30), tremor: I(-30, 30) },
      cap: { fame: I(1, 1e6), reward: N(1, 10) },
      mercy: { free: I(0, 9) },
      rel2: N(1, 5)
    },
    luck: {
      press: { at: N(.3, 1), w: { normal: N(0, 1000), lucky: N(0, 1000), tremor: N(0, 1000) }, luckyMult: N(1, 10), tremorCrack: N(0, .5) },
      near: { pct: N(0, .5) },
      coin: { min: I(0, 1e7), p: N(.05, .95), mult: I(2, 6) },
      jackpot: { at: I(1, 20), gold: I(0, 1e5) },
      tell: { chance: N(0, 1) }
    },
    econ: {
      gold: { sealDiv: I(1, 1e6), chest: I(0, 1e5), tomb: I(0, 1e5), daily: I(0, 1e5), fenceSalvage: I(0, 1e5), sieve: I(0, 1e5) }
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
  var TARGET_ROOTS = { skill: 'SKILL', luck: 'LUCK', econ: 'ECON' };

  /* env: { SKILL, LUCK, ECON, TARGETS_BASE }. Returns the applier. */
  function createApplier(env) {
    var roots = { skill: env.SKILL, luck: env.LUCK, econ: env.ECON };
    function resolve(path, create) {
      var parts = path.split('.'), o = roots[parts[0]];
      if (!o) return null;
      for (var i = 1; i < parts.length - 1; i++) { o = o[parts[i]]; if (!o || typeof o !== 'object') return null; }
      return { obj: o, key: parts[parts.length - 1] };
    }
    var baseline = null;                       // the shipped values for every path the schema allows, captured once
    function paths() { return flatten(buildShape()).filter(function (p) { return /^(skill|luck|econ)\./.test(p[0]); }).map(function (p) { return p[0]; }); }
    function buildShape() { // a config-shaped object holding every allowed leaf as 0 (used only for its path list)
      function shape(spec) { if (isLeaf(spec)) return spec.t === 'ia' ? [] : 0; var o = {}; Object.keys(spec).forEach(function (k) { o[k] = shape(spec[k]); }); return o; }
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
      flatten(cfg).forEach(function (kv) { if (/^(skill|luck|econ)\./.test(kv[0]) && setVal(kv[0], kv[1])) done.push(kv[0]); });
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
      try { var raw = deps.prefs && await deps.prefs.get(CACHE_KEY); if (raw) cached = JSON.parse(raw); } catch (e) {}
      if (cached) accept(cached, 'cache');
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

  var api = { SCHEMA: SCHEMA, validate: validate, flatten: flatten, createApplier: createApplier, createRemoteConfig: createRemoteConfig, configUrl: configUrl, CACHE_KEY: CACHE_KEY, TIMEOUT_MS: TIMEOUT_MS };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GGRemoteConfig = api;
})(typeof self !== 'undefined' ? self : globalThis);
