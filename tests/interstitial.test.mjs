import test from 'node:test';
import assert from 'node:assert/strict';
import { load, memPrefs } from './helpers.mjs';
const { createAds, K_CLEARED, K_RUNS, K_LAST, GOOGLE_TEST } = load('ads.js');
const { createAdFree } = load('adfree.js');

function rig({ flags = { ads: true }, config = { rewardedIdIos: 'ca-app-pub-1/2', interstitialId: 'ca-app-pub-1/3', testing: false }, prefs = memPrefs({ [K_CLEARED]: '1' }), adsCfg = {}, platform = 'ios', admob = {}, noInter = false } = {}) {
  const log = [], events = []; let t = 1_000_000;
  const am = {
    initialize: async o => log.push(['init', o]),
    trackingAuthorizationStatus: async () => ({ status: 'notDetermined' }), requestTrackingAuthorization: async () => (log.push(['att']), {}),
    prepareInterstitial: async o => { log.push(['prepareInterstitial', o]); if (admob.fail) throw new Error('no fill'); },
    showInterstitial: async () => log.push(['showInterstitial']),
    prepareRewardVideoAd: async () => {}, showRewardVideoAd: async () => ({ type: 'c', amount: 1 }), addListener: async () => ({ remove() {} }), ...admob.extra
  };
  if (noInter) { delete am.prepareInterstitial; delete am.showInterstitial; }
  const state = { flags, adsCfg };
  const ads = createAds({ admob: am, prefs, config, platform, flags: () => state.flags, adsCfg: () => state.adsCfg, now: () => t, env: () => ({}), emit: (n, d) => events.push([n, d]), dispatch: () => {}, setActive: () => {}, paintLives: () => {} });
  const shown = () => log.filter(l => l[0] === 'showInterstitial').length;
  const end = async (o = {}) => ads.onEvent({ event: 'run_end', outcome: 'dead', ...o });
  return { ads, log, events, prefs, state, shown, end, tick: ms => (t += ms), now: () => t };
}

test('every 2nd finished run, not the 1st: run 1 no, run 2 yes, run 3 no, run 4 blocked by the gap, run 5 yes once the gap has passed', async () => {
  const r = rig();
  await r.end(); assert.equal(r.shown(), 0, 'run 1');
  await r.end(); assert.equal(r.shown(), 1, 'run 2'); assert.equal(await r.prefs.get(K_RUNS), '0');
  r.tick(60_000); await r.end(); assert.equal(r.shown(), 1, 'run 3: only one run since the last ad');
  r.tick(60_000); await r.end(); assert.equal(r.shown(), 1, 'run 4: two runs since but only 2 min after the last ad');
  r.tick(70_000); await r.end(); assert.equal(r.shown(), 2, 'run 5: 3 min 10 s after the last ad');
  assert.deepEqual(r.events.filter(e => e[0] === 'ad_interstitial_shown').length, 2);
});

test('never within 180 s of the last one, whatever the run count', async () => {
  const r = rig({ prefs: memPrefs({ [K_CLEARED]: '1', [K_RUNS]: '9', [K_LAST]: String(1_000_000 - 179_000) }) });
  await r.end(); assert.equal(r.shown(), 0);
  r.tick(2_000); await r.end(); assert.equal(r.shown(), 1);
});

test('never before the first tomb clear, and the run that makes the first clear gets none', async () => {
  const r = rig({ prefs: memPrefs() });
  for (let i = 0; i < 4; i++) await r.end(); assert.equal(r.shown(), 0, 'four lost runs, no clear yet');
  await r.end({ outcome: 'won' }); assert.equal(r.shown(), 0, 'the clearing run itself: ATT first, no ad');
  assert.equal(await r.prefs.get(K_CLEARED), '1');
  await r.end(); assert.equal(r.shown(), 1, 'the next summary may show one (runs counted all along)');
});

test('only on a finished run: provisional run_end and other events never trigger one', async () => {
  const r = rig({ prefs: memPrefs({ [K_CLEARED]: '1', [K_RUNS]: '5' }) });
  await r.ads.onEvent({ event: 'run_end', provisional: true, outcome: 'dead' }); await r.ads.onEvent({ event: 'chamber_end' }); await r.ads.onEvent({ event: 'seal' });
  assert.equal(r.shown(), 0); assert.equal(await r.prefs.get(K_RUNS), '5');
  assert.equal(r.log.length, 0, 'AdMob not even initialised');
});

test('remote config: ads.interstitialEvery and interstitialMinGapSec are read live; flags.adInterstitial and flags.ads switch it off', async () => {
  const r = rig({ adsCfg: { interstitialEvery: 3, interstitialMinGapSec: 10 } });
  await r.end(); await r.end(); assert.equal(r.shown(), 0, 'every 3');
  await r.end(); assert.equal(r.shown(), 1);
  r.state.adsCfg = { interstitialEvery: 1, interstitialMinGapSec: 0 }; await r.end(); assert.equal(r.shown(), 2, 'every 1, no gap');
  r.state.flags = { ads: true, adInterstitial: false }; await r.end(); await r.end(); assert.equal(r.shown(), 2, 'switched off remotely');
  r.state.flags = { ads: false }; await r.end(); assert.equal(r.shown(), 2);
  assert.equal(rig({ flags: { ads: false } }).ads.interstitialOn(), false);
});

test('ad-free: adfree.js turns every ad flag off, so nothing initialises, prompts or shows', async () => {
  const owned = { v: true };
  const pay = { ready: true, adFree: () => owned.v };
  const af = createAdFree({ payments: pay });
  assert.deepEqual(af.effectiveFlags({ ads: true, adInterstitial: true, adMemory: true, adSeal: true, ui: 1 }), { ads: false, adInterstitial: false, adMemory: false, adSeal: false, ui: 1 });
  const base = { ads: true, adInterstitial: true };
  const r = rig({ prefs: memPrefs({ [K_CLEARED]: '1', [K_RUNS]: '9' }) });
  r.state.flags = af.effectiveFlags(base);
  await r.end(); assert.equal(r.log.length, 0, 'AdMob untouched, ATT not asked');
  assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'off' });
  owned.v = false; r.state.flags = af.effectiveFlags(base); await r.end(); assert.equal(r.shown(), 1, 'and it is back if the entitlement is refunded');
  // before the entitlement cache is read, ads stay off
  assert.equal(createAdFree({ payments: { ready: false, adFree: () => false } }).effectiveFlags(base).ads, false);
});

test('no fill: the counters stay so the next finished run tries again; the failure is reported', async () => {
  const r = rig({ admob: { fail: true } });
  await r.end(); await r.end(); assert.equal(r.shown(), 0);
  assert.equal(await r.prefs.get(K_RUNS), '2'); assert.equal(await r.prefs.get(K_LAST), null);
  assert.ok(r.events.some(e => e[0] === 'ad_interstitial_failed'));
});

test('a build without the interstitial method (old plugin) simply has no interstitial', async () => {
  const r = rig({ noInter: true, prefs: memPrefs({ [K_CLEARED]: '1', [K_RUNS]: '9' }) });
  assert.equal(r.ads.interstitialOn(), false); await r.end(); assert.ok(!r.log.some(l => /Interstitial/.test(l[0])), 'no interstitial call (the ATT prompt is a separate, unrelated rule)');
});

test('unit ids: platform decides; explicit ids win; test mode uses Google\'s sample units', async () => {
  const a = rig({ platform: 'android', config: { rewardedId: 'ca-app-pub-9/1', interstitialId: 'ca-app-pub-9/2', testing: false } });
  assert.deepEqual(a.ads.unitIds(), { rewarded: 'ca-app-pub-9/1', interstitial: 'ca-app-pub-9/2' });
  const t = rig({ platform: 'android', config: { testing: true } });
  assert.deepEqual(t.ads.unitIds(), { rewarded: GOOGLE_TEST.android.rewarded, interstitial: GOOGLE_TEST.android.interstitial });
  const i = rig({ platform: 'ios', config: { testing: true } });
  assert.deepEqual(i.ads.unitIds(), { rewarded: GOOGLE_TEST.ios.rewarded, interstitial: GOOGLE_TEST.ios.interstitial });
  await t.end(); await t.end(); const p = t.log.find(l => l[0] === 'prepareInterstitial'); assert.equal(p[1].adId, GOOGLE_TEST.android.interstitial); assert.equal(p[1].isTesting, true);
  assert.equal(rig({ config: { rewardedIdIos: 'x', interstitialId: '', testing: false } }).ads.interstitialOn(), false, 'no interstitial unit id and not testing: off');
});

test('ATT is iOS only; Android never asks; consent (UMP) form runs before the first initialise when required', async () => {
  const a = rig({ platform: 'android' }); await a.end({ outcome: 'won' }); await a.end();
  assert.ok(!a.log.some(l => l[0] === 'att'), 'no ATT on Android');
  const calls = [];
  const c = rig({ admob: { extra: { requestConsentInfo: async () => (calls.push('info'), { status: 'REQUIRED', isConsentFormAvailable: true }), showConsentForm: async () => (calls.push('form'), { status: 'OBTAINED' }) } } });
  await c.end(); await c.end(); assert.deepEqual(calls, ['info', 'form']);
  assert.ok(c.log.findIndex(l => l[0] === 'init') >= 0, 'AdMob still initialises');
  const f = rig({ admob: { extra: { requestConsentInfo: async () => { throw new Error('network'); } } } }); await f.end(); await f.end(); assert.equal(f.shown(), 1, 'a failed consent request never blocks the game');
});
