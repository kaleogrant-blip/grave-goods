/* save-adapter.js: the third save backend.
 *
 * The game's Store keeps every rw_* key in localStorage and mirrors one snapshot document to `window.claude`
 * (use('user') + use('db') -> doc(path).get/set/delete). Inside the app we do not edit the game: we install a
 * `window.claude` look-alike whose "db" is Capacitor Preferences (local mirror, survives WebView storage eviction)
 * plus the iCloud key-value store (follows the Apple ID). The game's own reconcile logic (newer copy wins,
 * brand-new device adopts the cloud copy, errors by code) then runs unchanged.
 *
 * Backend choice at boot:  window.Capacitor -> native (this file)  |  else window.claude -> artifact db  |  else localStorage only.
 */
(function (root) {
  'use strict';

  var SNAP_KEY = 'gg_save_v1';              // Preferences: the whole snapshot as one JSON string
  var META_KEY = 'gg_save_v1_meta';          // iCloud: { v, updatedAt, n, bytes }
  var CHUNK_KEY = function (i) { return 'gg_save_v1_c' + i; };
  var CHUNK_CHARS = 100000;                  // iCloud KVS: 1 MB total, 1 MB per value. Stay far below.
  var MAX_BYTES = 900000;                    // refuse to write more than this to iCloud (game then keeps progress local)
  var ID_KEY = 'gg_install_id';
  // Device-local or privacy-sensitive-and-bulky keys that never go in the synced snapshot.
  var NOT_SYNCED = { rw_ua: 1, rw_tel: 1, rw_tel_open: 1 };

  function selectBackend(env) {
    env = env || {};
    var C = env.Capacitor;
    if (C) {
      var native = true;
      try { if (typeof C.isNativePlatform === 'function') native = !!C.isNativePlatform(); } catch (e) {}
      if (native) return 'native';
    }
    if (env.claude && typeof env.claude.use === 'function') return 'artifact';
    return 'local';
  }

  function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
  function utf8Len(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) n += 1; else if (c < 0x800) n += 2;
      else if (c >= 0xd800 && c < 0xdc00) { n += 4; i++; } else n += 3;
    }
    return n;
  }
  function validSnap(d) {
    return !!(d && typeof d === 'object' && d.keys && typeof d.keys === 'object' && !Array.isArray(d.keys) && isFinite(Number(d.updatedAt)));
  }
  function parse(s) { try { var d = JSON.parse(s); return validSnap(d) ? d : null; } catch (e) { return null; } }
  function pub(d) { // what is allowed to leave the device
    var keys = {};
    Object.keys(d.keys).forEach(function (k) { if (!NOT_SYNCED[k] && typeof d.keys[k] === 'string') keys[k] = d.keys[k]; });
    return { v: 1, updatedAt: Number(d.updatedAt) || 0, keys: keys };
  }
  function randomId() {
    var a = '';
    try { var u = new Uint8Array(16); (root.crypto || {}).getRandomValues(u); for (var i = 0; i < u.length; i++) a += ('0' + u[i].toString(16)).slice(-2); } catch (e) {}
    return a || (Date.now().toString(16) + Math.random().toString(16).slice(2));
  }

  /* prefs: { get(key)->Promise<string|null>, set(key,val), remove(key) }
     icloud: { available()->Promise<bool>, get, set, remove, sync() } or null */
  function createStore(prefs, icloud) {
    async function icloudOn() { try { return !!(icloud && await icloud.available()); } catch (e) { return false; } }

    async function readPrefs() { try { return parse(await prefs.get(SNAP_KEY)); } catch (e) { return null; } }

    async function readCloud() {
      if (!(await icloudOn())) return null;
      try {
        try { await icloud.sync(); } catch (e) {}
        var meta; try { meta = JSON.parse(await icloud.get(META_KEY)); } catch (e) { return null; }
        if (!meta || meta.v !== 1 || !(meta.n >= 1) || meta.n > 50) return null;
        var s = '';
        for (var i = 0; i < meta.n; i++) {
          var part = await icloud.get(CHUNK_KEY(i));
          if (typeof part !== 'string') return null;      // chunks still arriving from iCloud: treat as "not there yet"
          s += part;
        }
        if (utf8Len(s) !== meta.bytes) return null;       // torn write (meta and chunks from different saves)
        return parse(s);
      } catch (e) { return null; }
    }

    async function writeCloud(d, s) {
      if (!(await icloudOn())) return false;
      var bytes = utf8Len(s);
      if (bytes > MAX_BYTES) throw err('quota_exceeded', 'save is ' + bytes + ' bytes');
      var oldN = 0;
      try { var om = JSON.parse(await icloud.get(META_KEY)); oldN = om && om.n | 0; } catch (e) {}
      var n = Math.max(1, Math.ceil(s.length / CHUNK_CHARS));
      for (var i = 0; i < n; i++) await icloud.set(CHUNK_KEY(i), s.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS));
      await icloud.set(META_KEY, JSON.stringify({ v: 1, updatedAt: d.updatedAt, n: n, bytes: bytes })); // meta last: readers never see a half save
      for (var j = n; j < oldN; j++) await icloud.remove(CHUNK_KEY(j));
      try { await icloud.sync(); } catch (e) {}
      return true;
    }

    // newer updatedAt wins; a tie prefers the local mirror
    async function read() {
      var p = await readPrefs(), c = await readCloud();
      if (p && c) {
        if (Number(c.updatedAt) > Number(p.updatedAt)) { try { await prefs.set(SNAP_KEY, JSON.stringify(c)); } catch (e) {} return c; }
        return p;
      }
      if (c) { try { await prefs.set(SNAP_KEY, JSON.stringify(c)); } catch (e) {} return c; }
      return p;
    }

    async function write(snap) {
      if (!validSnap(snap)) throw err('invalid_argument', 'snapshot shape');
      var d = pub(snap), s = JSON.stringify(d);
      try { await prefs.set(SNAP_KEY, s); } catch (e) { throw err('unavailable', 'preferences write failed'); }
      try { await writeCloud(d, s); } catch (e) { if (e && e.code) throw e; throw err('unavailable', 'icloud write failed'); }
    }

    async function erase() {
      try { await prefs.remove(SNAP_KEY); } catch (e) {}
      if (await icloudOn()) {
        try {
          var om = JSON.parse(await icloud.get(META_KEY)), n = om && om.n | 0;
          await icloud.remove(META_KEY);
          for (var i = 0; i < n; i++) await icloud.remove(CHUNK_KEY(i));
          await icloud.sync();
        } catch (e) { try { await icloud.remove(META_KEY); } catch (e2) {} }
      }
    }

    return { read: read, write: write, erase: erase, readPrefs: readPrefs, readCloud: readCloud, icloudOn: icloudOn };
  }

  /* First native launch: if neither Preferences nor iCloud has a save but localStorage does, import it.
     Returns 'imported' | 'has-save' | 'nothing'. A save in either place always wins over localStorage. */
  async function migrateIfNeeded(store, ls, now) {
    var have = await store.read();
    if (have) return 'has-save';
    var keys = {}, n = 0;
    try {
      for (var i = 0; i < ls.length; i++) {
        var k = ls.key(i);
        if (k && k.indexOf('rw_') === 0 && !NOT_SYNCED[k]) { var v = ls.getItem(k); if (typeof v === 'string') { keys[k] = v; n++; } }
      }
    } catch (e) {}
    if (!n) return 'nothing';
    var ua = 0; try { ua = Number(ls.getItem('rw_ua')) || 0; } catch (e) {}
    if (!ua) { ua = (now || Date.now)(); try { ls.setItem('rw_ua', String(ua)); } catch (e) {} } // local and imported copy share one timestamp, so the game sees them as the same save
    await store.write({ v: 1, updatedAt: ua, keys: keys });
    return 'imported';
  }

  /* A window.claude look-alike, just enough for the game's Store (and a null for every capability it cannot do). */
  function createClaudeShim(store, ls, opts) {
    opts = opts || {};
    var prefs = opts.prefs;
    var ready = (async function () { try { await migrateIfNeeded(store, ls, opts.now); } catch (e) {} })();
    var lastMigration = ready;
    var idP = null;
    function installId() {
      if (!idP) idP = (async function () {
        try { var v = await prefs.get(ID_KEY); if (v) return v; } catch (e) {}
        var id = randomId(); try { await prefs.set(ID_KEY, id); } catch (e) {}
        return id;
      })();
      return idP;
    }
    function ref() {
      return {
        get: async function () {
          await ready;
          var d = await store.read();
          return { exists: !!d, data: function () { return d; } };
        },
        set: async function (snap) { await ready; await store.write(snap); },
        delete: async function () { await ready; await store.erase(); }
      };
    }
    return {
      __native: true,
      use: async function (name) {
        if (name === 'user') return { id: installId };
        if (name === 'db') return { doc: function () { return ref(); } };
        return null; // 'downloads' and anything else: the game already copes with null
      },
      _ready: lastMigration
    };
  }

  var api = {
    SNAP_KEY: SNAP_KEY, META_KEY: META_KEY, NOT_SYNCED: NOT_SYNCED, MAX_BYTES: MAX_BYTES,
    selectBackend: selectBackend, createStore: createStore, migrateIfNeeded: migrateIfNeeded, createClaudeShim: createClaudeShim,
    utf8Len: utf8Len
  };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GGSave = api;
})(typeof self !== 'undefined' ? self : globalThis);
