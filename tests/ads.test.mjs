import test from 'node:test';
import assert from 'node:assert/strict';
import { load, memPrefs } from './helpers.mjs';
const { createAds, GOOGLE_TEST_REWARDED_IOS, K_CLEARED, K_ATT } = load('ads.js');

function rig({ flags = { ads: true }, ad = {}, config = { rewardedIdIos: 'ca-app-pub-1/2', testing: false }, run = { tid: 'r1', lives: 1 }, state = { xs: 0 }, prefs = memPrefs(), adsCfg = {}, att = 'notDetermined' } = {}) {
  const log = [], events = [];
  let t = 1e6;
  const admob = {
    initialize: async o => log.push(['init', o]),
    trackingAuthorizationStatus: async () => ({ status: att }),
    requestTrackingAuthorization: async () => { log.push(['att']); att = 'authorized'; return {}; }, // the real plugin resolves with no payload
    prepareRewardVideoAd: async o => log.push(['prepare', o]),
    showRewardVideoAd: async () => (log.push(['show']), ad.fail ? Promise.reject(new Error('no fill')) : ad.dismissed ? {} : { type: 'coin', amount: 1 }),
    addListener: async () => ({ remove() {} }), ...ad.override
  };
  const body = { on: null };
  const ads = createAds({
    admob: ad.noPlugin ? null : admob, prefs, config, flags: () => flags, adsCfg: () => adsCfg, now: () => t,
    env: () => ({ run, state }), emit: (n, d) => events.push([n, d]), dispatch: (n, d) => events.push(['dispatch:' + n, d]), setActive: v => (body.on = v), paintLives: () => {}
  });
  return { ads, log, events, run, state, prefs, body, tick: ms => (t += ms) };
}

test('flag off (the default): not enabled, offers refused, AdMob never touched, ATT never asked', async () => {
  const r = rig({ flags: { ads: false } });
  assert.equal(r.ads.enabled(), false);
  r.ads.refresh(); assert.equal(r.body.on, false, 'body.gg-ads absent -> [data-gg-ad] stays hidden by CSS');
  assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'off' });
  await r.prefs.set(K_CLEARED, '1'); await r.ads.onEvent({ event: 'run_end', outcome: 'won' });
  assert.deepEqual(r.log, []); assert.equal(await r.prefs.get(K_ATT), null);
  assert.equal(rig({ flags: {} }).ads.enabled(), false);
});

test('flag on but no AdMob unit id and not testing: still off', () => {
  assert.equal(rig({ config: { rewardedIdIos: '', testing: false } }).ads.enabled(), false);
  assert.equal(rig({ config: { rewardedIdIos: '', testing: true } }).ads.enabled(), true, 'testing falls back to Google\'s sample unit');
});

test('ATT is asked only after the first tomb clear, only once, only with ads on', async () => {
  const r = rig();
  await r.ads.onEvent({ event: 'run_end', outcome: 'abandoned' }); await r.ads.onEvent({ event: 'run_end', outcome: 'dead' });
  await r.ads.onEvent({ event: 'seal' }); await r.ads.onEvent({ event: 'run_end', outcome: 'won', provisional: true });
  assert.ok(!r.log.some(l => l[0] === 'att'), 'no prompt before a clear');
  await r.ads.onEvent({ event: 'run_end', outcome: 'won' });
  assert.equal(r.log.filter(l => l[0] === 'att').length, 1);
  await r.ads.onEvent({ event: 'run_end', outcome: 'won' }); await r.ads.onEvent({ event: 'run_end', outcome: 'dead' });
  assert.equal(r.log.filter(l => l[0] === 'att').length, 1, 'never twice');
  assert.equal(await r.prefs.get(K_ATT), '1'); assert.equal(r.ads.att(), 'authorized');
});

test('a clear that happened while ads were off prompts at the end of the next run once ads are on', async () => {
  const prefs = memPrefs({ [K_CLEARED]: '1' }); const r = rig({ prefs });
  await r.ads.onEvent({ event: 'run_end', outcome: 'dead' }); assert.equal(r.log.filter(l => l[0] === 'att').length, 1);
});

test('ATT already decided in iOS settings: not prompted again, but marked done', async () => {
  const r = rig({ att: 'denied', prefs: memPrefs({ [K_CLEARED]: '1' }) });
  await r.ads.onEvent({ event: 'run_end', outcome: 'dead' }); assert.ok(!r.log.some(l => l[0] === 'att')); assert.equal(r.ads.att(), 'denied');
});

test('memory ad: +1 Memory, at most once per run, never above 3, telemetry offered/watched', async () => {
  const r = rig({ run: { tid: 'r1', lives: 1 } });
  assert.deepEqual(await r.ads.offer('memory'), { ok: true, reason: '' }); assert.equal(r.run.lives, 2);
  assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'run_cap' }); assert.equal(r.run.lives, 2);
  assert.deepEqual(r.events.filter(e => e[0].startsWith('ad_')).map(e => e[0]), ['ad_offered', 'ad_watched']);
  r.run.tid = 'r2'; assert.equal((await r.ads.offer('memory')).ok, true, 'a new run gets its own allowance'); assert.equal(r.run.lives, 3);
  r.run.tid = 'r3'; assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'full' }); assert.equal(r.run.lives, 3);
});

test('no reward if the ad is dismissed early or fails to load', async () => {
  const a = rig({ ad: { dismissed: true } }); assert.deepEqual(await a.ads.offer('memory'), { ok: false, reason: 'closed_early' }); assert.equal(a.run.lives, 1);
  const b = rig({ ad: { fail: true } }); assert.deepEqual(await b.ads.offer('memory'), { ok: false, reason: 'no_fill' }); assert.equal(b.run.lives, 1);
  assert.ok(!b.events.some(e => e[0] === 'ad_watched'));
});

test('seal ad: +1 free seal arrives in the NEXT chamber (state.xs), once', async () => {
  const r = rig(); assert.equal((await r.ads.offer('seal')).ok, true);
  assert.equal(r.state.xs, 0, 'not this chamber');
  const next = { xs: 0 }; assert.equal(r.ads.onNewChamber(next), true); assert.equal(next.xs, 1);
  const after = { xs: 0 }; assert.equal(r.ads.onNewChamber(after), false); assert.equal(after.xs, 0);
  assert.equal(r.ads.onNewChamber({ xs: 0, train: true }), false, 'training chambers are not charged for seals');
});

test('reroll / chest re-pick: reward is announced for the game to apply', async () => {
  const r = rig(); assert.equal((await r.ads.offer('reroll')).ok, true);
  assert.ok(r.events.some(e => e[0] === 'dispatch:gg:ad-reward' && e[1].kind === 'reroll'));
  assert.deepEqual(await r.ads.offer('bogus'), { ok: false, reason: 'unknown_kind' });
});

test('per-kind remote flags and the cooldown are honoured', async () => {
  const r = rig({ flags: { ads: true, adMemory: false } }); assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'off' });
  const c = rig({ adsCfg: { cooldownSec: 30 } }); assert.equal((await c.ads.offer('reroll')).ok, true);
  assert.deepEqual(await c.ads.offer('reroll'), { ok: false, reason: 'cooldown' }); c.tick(31000); assert.equal((await c.ads.offer('reroll')).ok, true);
  const z = rig({ adsCfg: { memoryPerRun: 0 } }); assert.equal((await z.ads.offer('memory')).reason, 'run_cap');
});

test('test mode uses Google\'s sample unit', async () => {
  const r = rig({ config: { rewardedIdIos: '', testing: true } }); await r.ads.offer('reroll');
  assert.equal(r.log.find(l => l[0] === 'prepare')[1].adId, GOOGLE_TEST_REWARDED_IOS);
});
