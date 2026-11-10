import test from 'node:test';
import assert from 'node:assert/strict';
import { load, memPrefs, memLS } from './helpers.mjs';
const { createTelemetry, BATCH, FLUSH_MS, QUEUE_KEY, OFF_KEY, ID_KEY, CONSENT_KEY } = load('telemetry.js');

function rig(over = {}) {
  const prefs = over.prefs || memPrefs(), ls = over.ls || memLS();
  if (over.consent !== null && !prefs.m.has(CONSENT_KEY)) prefs.m.set(CONSENT_KEY, over.consent || 'yes'); // most tests are about a player who said yes; consent: null = never asked
  const calls = [], timers = [];
  let status = 200, online = true, t = 1_700_000_000_000;
  const fetch = async (url, init) => {
    if (status === 'throw') throw new TypeError('network');
    calls.push({ url, body: JSON.parse(init.body), init }); return { ok: status >= 200 && status < 300, status };
  };
  const fetchAll = [], fetchSpy = async (...a) => { fetchAll.push(a[0]); return fetch(...a);
  };
  const tel = createTelemetry({
    fetch: fetchSpy, prefs, ls, key: 'phc_test', host: 'https://us.i.posthog.com/', now: () => t, online: () => online,
    setInterval: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearInterval: () => {},
    meta: () => ({ app_build: 'v1.0-rc5a', remote_config_version: 7, platform: 'ios' }), ...over.deps
  });
  return { tel, prefs, ls, calls, fetchAll, timers, setStatus: s => (status = s), setOnline: v => (online = v), tick: ms => (t += ms), now: () => t };
}
const ev = (n, extra = {}) => ({ event: 'seal', event_id: 's-' + n, run_id: 'r1', session_id: 's', ts_client: 1_700_000_000_000 + n, config_version: 10, build: 'v1.0-rc5a', ...extra });

test('flushes at 50 events, in one batch, to the PostHog /batch/ endpoint', async () => {
  const r = rig();
  for (let i = 1; i < BATCH; i++) await r.tel.ingest(ev(i));
  assert.equal(r.calls.length, 0, '49 events: no request yet');
  await r.tel.ingest(ev(BATCH));
  await new Promise(res => setTimeout(res, 10));
  assert.equal(r.calls.length, 1);
  const c = r.calls[0];
  assert.equal(c.url, 'https://us.i.posthog.com/batch/');
  assert.equal(c.body.api_key, 'phc_test'); assert.equal(c.body.batch.length, 50);
  assert.equal(r.tel.size(), 0);
  assert.equal(await r.prefs.get(QUEUE_KEY), '[]');
});

test('the 30 s timer flushes whatever is queued', async () => {
  const r = rig(); r.tel.start();
  assert.equal(r.timers[0].ms, FLUSH_MS); assert.equal(FLUSH_MS, 30000);
  await r.tel.ingest(ev(1)); await r.tel.ingest(ev(2));
  assert.equal(r.calls.length, 0);
  await r.timers[0].f(); await new Promise(res => setTimeout(res, 10));
  assert.equal(r.calls.length, 1); assert.equal(r.calls[0].body.batch.length, 2);
});

test('events are anonymous, carry the config version and build, and keep the game fields', async () => {
  const r = rig(); await r.tel.ingest(ev(1, { chapter: 3 })); await r.tel.flush(true);
  const e = r.calls[0].body.batch[0], p = e.properties;
  assert.equal(e.event, 'seal');
  assert.equal(p.remote_config_version, 7); assert.equal(p.app_build, 'v1.0-rc5a'); assert.equal(p.chapter, 3); assert.equal(p.run_id, 'r1');
  assert.equal(p.$geoip_disable, true); assert.equal(p.$process_person_profile, false);
  assert.match(p.distinct_id, /^[0-9a-f-]{20,}$/);
  assert.equal(p.event, undefined, 'event name is not duplicated into properties');
  assert.equal(new Date(e.timestamp).getTime(), 1_700_000_000_001);
  assert.ok(!JSON.stringify(e).includes('@'), 'no email-like data');
});

test('distinct_id is created once, stored in Preferences, and reused after a restart', async () => {
  const r1 = rig(); await r1.tel.ingest(ev(1));
  const id = r1.tel.distinctId(); assert.equal(await r1.prefs.get('gg_distinct_id'), id);
  const r2 = rig({ prefs: r1.prefs }); await r2.tel.ingest(ev(2));
  assert.equal(r2.tel.distinctId(), id);
});

test('offline: events stay queued (and persisted), nothing is sent, then they go when back online', async () => {
  const r = rig(); r.setOnline(false);
  for (let i = 1; i <= 60; i++) await r.tel.ingest(ev(i));
  await r.tel.flush(true);
  assert.equal(r.calls.length, 0); assert.equal(r.tel.size(), 60);
  assert.equal(JSON.parse(await r.prefs.get(QUEUE_KEY)).length, 60);
  // app killed and relaunched while offline
  const r2 = rig({ prefs: r.prefs }); await r2.tel.init(); assert.equal(r2.tel.size(), 60);
  await r2.tel.flush(true);
  assert.equal(r2.calls.length, 2, '60 events go as 50 + 10');
  assert.deepEqual(r2.calls.map(c => c.body.batch.length), [50, 10]); assert.equal(r2.tel.size(), 0);
});

test('network failure and 5xx keep the queue and back off; 4xx drops the batch', async () => {
  const r = rig(); await r.tel.ingest(ev(1)); await r.tel.ingest(ev(2));
  r.setStatus('throw'); await r.tel.flush(true);
  assert.equal(r.tel.size(), 2);
  r.setStatus(200); const w = await r.tel.flush(); assert.ok(w.waiting, 'inside the backoff window nothing is attempted'); assert.equal(r.calls.length, 0);
  r.tick(6000); await r.tel.flush(); assert.equal(r.calls.length, 1); assert.equal(r.tel.size(), 0);
  r.setStatus(503); await r.tel.ingest(ev(3)); await r.tel.flush(true); assert.equal(r.tel.size(), 1);
  r.setStatus(400); await r.tel.flush(true); assert.equal(r.tel.size(), 0, 'a rejected batch is not retried forever');
});

test('queue is capped at 1000 events (oldest dropped)', async () => {
  const r = rig(); r.setOnline(false);
  for (let i = 1; i <= 1100; i++) await r.tel.ingest(ev(i));
  assert.equal(r.tel.size(), 1000);
  assert.equal(r.tel.peek()[0].properties.event_id, 's-101');
});

test('opt-out (game flag rw_tel_off=1): nothing queued, nothing sent, queue wiped, mirrored into Preferences', async () => {
  const r = rig(); await r.tel.ingest(ev(1)); assert.equal(r.tel.size(), 1);
  r.ls.setItem('rw_tel_off', '1');
  assert.equal(await r.tel.ingest(ev(2)), 'dropped');
  assert.equal(r.tel.size(), 0, 'the queue is wiped the moment the opt-out is seen');
  await r.tel.flush(true);
  assert.equal(r.calls.length, 0, 'opted-out player: the old queue is discarded, not sent');
  assert.equal(r.tel.size(), 0); assert.equal(await r.prefs.get(OFF_KEY), '1'); assert.equal(await r.prefs.get(QUEUE_KEY), null);
});

test('the Settings toggle: the settings_change(false) event is itself never sent', async () => {
  const r = rig(); await r.tel.ingest(ev(1));
  // the game emits settings_change BEFORE it sets the localStorage flag
  assert.equal(await r.tel.ingest({ ...ev(2), event: 'settings_change', key: 'play_log', value: false }), 'dropped');
  await r.tel.flush(true); assert.equal(r.calls.length, 0);
  r.ls.setItem('rw_tel_off', '1');
  // switching back on
  r.ls.removeItem('rw_tel_off');
  assert.equal(await r.tel.ingest({ ...ev(3), event: 'settings_change', key: 'play_log', value: true }), 'queued');
  assert.equal(await r.prefs.get(OFF_KEY), null);
  await r.tel.flush(true); assert.equal(r.calls.length, 1);
});

test('opt-out survives a lost localStorage flag (cleared storage, cloud restore): it is re-asserted, not forgotten', async () => {
  const prefs = memPrefs({ [OFF_KEY]: '1' }), ls = memLS();
  const r = rig({ prefs, ls });
  assert.equal(await r.tel.ingest(ev(1)), 'dropped');
  assert.equal(ls.getItem('rw_tel_off'), '1', 'the game flag is restored so Settings shows Off');
  await r.tel.flush(true); assert.equal(r.calls.length, 0);
});

test('no project key configured: nothing is queued or sent', async () => {
  const r = rig({ deps: { key: '' } });
  assert.equal(await r.tel.ingest(ev(1)), 'dropped'); await r.tel.flush(true);
  assert.equal(r.calls.length, 0); assert.equal(r.tel.size(), 0);
});

test('garbage input never throws', async () => {
  const r = rig();
  for (const x of [null, undefined, 5, 'x', {}, { event: '' }]) assert.equal(await r.tel.ingest(x), 'dropped');
});

// ---- consent first (C-7): nothing leaves the device and no ID exists until the player says yes, wherever they are
test('before the question is answered: no network call, no queue, no persistent ID, however much is played and flushed', async () => {
  const r = rig({ consent: null }); r.tel.start();
  for (let i = 1; i <= 120; i++) assert.equal(await r.tel.ingest(ev(i)), 'dropped');
  await r.tel.flush(true); await r.timers[0].f(); await new Promise(res => setTimeout(res, 10));
  assert.deepEqual(r.fetchAll, [], 'fetch was never called');
  assert.equal(r.tel.size(), 0); assert.equal(r.tel.distinctId(), null); assert.equal(r.tel.consent(), '');
  assert.deepEqual([...r.prefs.m.keys()], [], 'nothing at all was written to Preferences: no ID, no queue');
});

test('"No thanks": the same silence, and the answer is remembered across a restart', async () => {
  const r = rig({ consent: null }); assert.equal(await r.tel.setConsent(false), 'no');
  for (let i = 1; i <= 60; i++) await r.tel.ingest(ev(i));
  await r.tel.flush(true);
  assert.deepEqual(r.fetchAll, []); assert.equal(await r.prefs.get(ID_KEY), null); assert.equal(await r.prefs.get(QUEUE_KEY), null);
  const r2 = rig({ prefs: r.prefs, consent: null }); await r2.tel.init(); assert.equal(r2.tel.consent(), 'no'); assert.equal(r2.tel.distinctId(), null);
});

test('"Yes": the ID is created at that moment and only events from then on are sent', async () => {
  const r = rig({ consent: null }); await r.tel.ingest(ev(1)); await r.tel.ingest(ev(2));
  assert.equal(await r.tel.setConsent(true), 'yes');
  const id = r.tel.distinctId(); assert.match(id, /^[0-9a-f-]{20,}$/); assert.equal(await r.prefs.get(ID_KEY), id);
  assert.equal(await r.tel.ingest(ev(3)), 'queued'); await r.tel.flush(true);
  assert.equal(r.calls.length, 1); assert.deepEqual(r.calls[0].body.batch.map(e => e.properties.event_id), ['s-3'], 'what happened before the yes was never kept');
});

test('changing the answer to no later: the queue and the random ID are deleted, and a new yes makes a NEW id', async () => {
  const r = rig(); await r.tel.ingest(ev(1)); const id = r.tel.distinctId(); assert.ok(id); assert.equal(r.tel.size(), 1);
  await r.tel.setConsent(false);
  assert.equal(r.tel.size(), 0); assert.equal(await r.prefs.get(ID_KEY), null); assert.equal(await r.prefs.get(QUEUE_KEY), null); assert.equal(r.tel.distinctId(), null);
  await r.tel.ingest(ev(2)); await r.tel.flush(true); assert.deepEqual(r.fetchAll, []);
  await r.tel.setConsent(true); assert.notEqual(r.tel.distinctId(), id, 'the old ID is gone for good');
});

test('an ID or queue left by an older build is wiped at launch when there is no yes on record', async () => {
  const prefs = memPrefs({ [ID_KEY]: 'old-id', [QUEUE_KEY]: JSON.stringify([{ event: 'seal', properties: {} }]) });
  const r = rig({ prefs, consent: null }); await r.tel.init(); await r.tel.flush(true);
  assert.equal(await prefs.get(ID_KEY), null); assert.equal(await prefs.get(QUEUE_KEY), null); assert.deepEqual(r.fetchAll, []);
});

test('consent yes but the game\'s Play log is off: still nothing is sent (both must be on)', async () => {
  const r = rig({ ls: memLS({ rw_tel_off: '1' }) }); await r.tel.ingest(ev(1)); await r.tel.flush(true);
  assert.deepEqual(r.fetchAll, []); assert.equal(r.tel.gameLogOff(), true); assert.equal(r.tel.configured(), true);
});
