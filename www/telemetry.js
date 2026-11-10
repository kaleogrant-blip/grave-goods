/* telemetry.js: batches the game's events to PostHog.
 *
 * The game emits each event on `document` as CustomEvent('gg:tel', {detail: ev}) (and keeps its own ring buffer in GG_TEL).
 * We never touch the game's buffer. Here: anonymous distinct_id (random, kept in Preferences), an offline queue that survives
 * restarts, a flush at 50 events or every 30 s, and an opt-out that mirrors the game's Settings switch (localStorage rw_tel_off).
 *
 * CONSENT COMES FIRST, everywhere in the world. Until the player has answered "yes" to the one-time question (consent.js; the answer
 * is kept in Preferences as gg_tel_consent = yes|no) this file queues nothing, sends nothing and creates no ID. Unanswered is the
 * same as "no". Saying "no" later deletes the queue and the random ID.
 * Nothing is sent unless: consent is "yes", a PostHog project key is configured, and the game's Play log switch is on.
 */
(function (root) {
  'use strict';

  var QUEUE_KEY = 'gg_tel_queue_v1';
  var ID_KEY = 'gg_distinct_id';
  var OFF_KEY = 'gg_tel_off';
  var CONSENT_KEY = 'gg_tel_consent';
  var BATCH = 50, FLUSH_MS = 30000, QUEUE_MAX = 1000, BACKOFF_MAX = 300000;

  function uuid() {
    try { if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID(); } catch (e) {}
    var h = '0123456789abcdef', s = '';
    for (var i = 0; i < 32; i++) s += h[Math.floor(Math.random() * 16)];
    return s.slice(0, 8) + '-' + s.slice(8, 12) + '-4' + s.slice(13, 16) + '-a' + s.slice(17, 20) + '-' + s.slice(20);
  }

  /* deps: { fetch, prefs:{get,set,remove}, ls:{getItem,setItem,removeItem}, now(), setInterval, clearInterval, online()->bool,
             key, host, meta:()->object (build, platform, remote_config_version), log } */
  function createTelemetry(deps) {
    var now = deps.now || Date.now;
    var queue = [], loaded = false, distinctId = null, timer = null, backoff = 0, nextTry = 0, sending = false, off = false, consent = '';
    var stats = { sent: 0, dropped: 0, failed: 0 };

    function lsOff() { try { return deps.ls.getItem('rw_tel_off') === '1'; } catch (e) { return false; } }
    function lsSetOff() { try { deps.ls.setItem('rw_tel_off', '1'); } catch (e) {} }

    async function save() { try { await deps.prefs.set(QUEUE_KEY, JSON.stringify(queue)); } catch (e) {} }

    var initP = null;
    function init() { return initP || (initP = doInit()); } // one shared promise: start() and the first ingest() may race
    async function doInit() {
      loaded = true;
      try { off = (await deps.prefs.get(OFF_KEY)) === '1'; } catch (e) {}
      if (lsOff()) { off = true; try { await deps.prefs.set(OFF_KEY, '1'); } catch (e) {} }
      else if (off) lsSetOff(); // the game's flag was lost (storage wiped, or a cloud restore dropped it): the opt-out stays on
      try { var c = await deps.prefs.get(CONSENT_KEY); consent = c === 'yes' || c === 'no' ? c : ''; } catch (e) { consent = ''; }
      if (consent !== 'yes') { await forget(); return; } // no consent: no ID is made or kept, and nothing waits in a queue
      await ensureId();
      try { var q = JSON.parse((await deps.prefs.get(QUEUE_KEY)) || '[]'); if (Array.isArray(q)) queue = q.concat(queue).slice(-QUEUE_MAX); } catch (e) {}
      if (off) await clear();
    }
    async function ensureId() {
      try { distinctId = await deps.prefs.get(ID_KEY); } catch (e) {}
      if (!distinctId) { distinctId = uuid(); try { await deps.prefs.set(ID_KEY, distinctId); } catch (e) {} }
    }
    async function forget() { distinctId = null; try { await deps.prefs.remove(ID_KEY); } catch (e) {} await clear(); }
    /* The answer to "share anonymous play statistics?". true = yes, false = no. */
    async function setConsent(v) {
      await init();
      consent = v ? 'yes' : 'no';
      try { await deps.prefs.set(CONSENT_KEY, consent); } catch (e) {}
      if (consent === 'yes') await ensureId(); else await forget();
      return consent;
    }
    function consentState() { return consent; } // 'yes' | 'no' | '' (not asked yet). Call init() first.
    function configured() { return !!deps.key; }
    async function clear() { queue = []; try { await deps.prefs.remove(QUEUE_KEY); } catch (e) {} }

    async function setOptOut(v) {
      off = !!v;
      try { if (off) await deps.prefs.set(OFF_KEY, '1'); else await deps.prefs.remove(OFF_KEY); } catch (e) {}
      if (off) await clear();
    }
    function isOptedOut() { return off || lsOff(); }

    function toPostHog(ev) {
      var meta = (deps.meta && deps.meta()) || {};
      var props = Object.assign({}, ev, meta, { distinct_id: distinctId, $lib: 'grave-goods-app', $geoip_disable: true, $process_person_profile: false });
      delete props.event; // the event name is its own field
      return { event: String(ev.event || 'unknown'), properties: props, timestamp: new Date(ev.ts_client || now()).toISOString(), uuid: uuid() };
    }

    /* Called for every gg:tel event. Returns 'queued' | 'dropped'. */
    async function ingest(ev) {
      if (!ev || typeof ev !== 'object' || !ev.event) return 'dropped';
      await init();
      // Mirror the Settings switch. The game emits settings_change{play_log:false} just BEFORE it sets rw_tel_off, so that event is not sent.
      if (ev.event === 'settings_change' && ev.key === 'play_log') {
        if (ev.value === false) { await setOptOut(true); return 'dropped'; }
        if (ev.value === true) await setOptOut(false);
      }
      if (lsOff() && !off) await setOptOut(true);
      else if (!lsOff() && off && !(ev.event === 'settings_change' && ev.key === 'play_log' && ev.value === true)) { lsSetOff(); }
      if (consent !== 'yes') { stats.dropped++; return 'dropped'; } // not asked, or said no: not queued, not sent
      if (isOptedOut()) { stats.dropped++; return 'dropped'; }
      if (!deps.key) { return 'dropped'; }          // no project key configured: do not even queue
      queue.push(toPostHog(ev));
      if (queue.length > QUEUE_MAX) queue.splice(0, queue.length - QUEUE_MAX);
      await save();
      if (queue.length >= BATCH) flush();
      return 'queued';
    }

    async function flush(force) {
      await init();
      if (consent !== 'yes') { if (queue.length) await clear(); return { sent: 0 }; }
      if (sending || !queue.length) return { sent: 0 };
      if (isOptedOut()) { await clear(); return { sent: 0 }; }
      if (!deps.key) return { sent: 0 };
      if (deps.online && !deps.online()) return { sent: 0, offline: true };
      if (!force && now() < nextTry) return { sent: 0, waiting: true };
      sending = true;
      var total = 0;
      try {
        while (queue.length) {
          var batch = queue.slice(0, BATCH);
          var res;
          try {
            res = await deps.fetch(String(deps.host).replace(/\/+$/, '') + '/batch/', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
              body: JSON.stringify({ api_key: deps.key, batch: batch })
            });
          } catch (e) { res = null; }
          if (res && res.ok) {
            queue.splice(0, batch.length); total += batch.length; stats.sent += batch.length; backoff = 0; nextTry = 0; await save();
          } else if (res && res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
            queue.splice(0, batch.length); stats.dropped += batch.length; await save(); // the server will never accept this batch: do not retry forever
          } else {
            stats.failed++;
            backoff = Math.min(BACKOFF_MAX, backoff ? backoff * 2 : 5000); nextTry = now() + backoff; break;
          }
        }
      } finally { sending = false; }
      return { sent: total };
    }

    function start() {
      if (timer) return;
      timer = deps.setInterval(function () { flush(); }, FLUSH_MS);
      init();
    }
    function stop() { if (timer) { deps.clearInterval(timer); timer = null; } }

    return { init: init, ingest: ingest, flush: flush, start: start, stop: stop, setOptOut: setOptOut, isOptedOut: isOptedOut, setConsent: setConsent, consent: consentState, configured: configured, gameLogOff: lsOff,
             size: function () { return queue.length; }, peek: function () { return queue.slice(); }, stats: stats, distinctId: function () { return distinctId; } };
  }

  var api = { createTelemetry: createTelemetry, BATCH: BATCH, FLUSH_MS: FLUSH_MS, QUEUE_KEY: QUEUE_KEY, OFF_KEY: OFF_KEY, ID_KEY: ID_KEY, CONSENT_KEY: CONSENT_KEY };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.GGTelemetry = api;
})(typeof self !== 'undefined' ? self : globalThis);
