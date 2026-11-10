// www/ads.js: opt-in rewarded videos only. No interstitial, no tracking prompt, caps that survive a relaunch, free claims for Ad-free owners.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, memPrefs, ROOT } from './helpers.mjs';
const { createAds, GOOGLE_TEST, GOOGLE_TEST_REWARDED_IOS, K_CLEARED, K_CAPS, KINDS } = load('ads.js');
const { createAdFree } = load('adfree.js');

// A fake AdMob plugin that has EVERY method the real one has, including the ones v1 must never call.
export function fakeAdmob(log, ad = {}) {
  return {
    initialize: async o => log.push(['init', o]),
    trackingAuthorizationStatus: async () => (log.push(['attStatus']), { status: 'notDetermined' }),
    requestTrackingAuthorization: async () => { log.push(['att']); return {}; },
    prepareInterstitial: async o => log.push(['prepareInterstitial', o]), showInterstitial: async () => log.push(['showInterstitial']),
    prepareRewardInterstitialAd: async o => log.push(['prepareRewardInterstitialAd', o]), showRewardInterstitialAd: async () => log.push(['showRewardInterstitialAd']),
    showBanner: async o => log.push(['showBanner', o]),
    prepareRewardVideoAd: async o => { log.push(['prepare', o]); if (ad.fail) throw new Error('no fill'); },
    showRewardVideoAd: async () => (log.push(['show']), ad.dismissed ? {} : { type: 'coin', amount: 1 }),
    addListener: async () => ({ remove() {} }), ...ad.override
  };
}
const FORBIDDEN = /interstitial|banner|^att/i;

function rig({ flags = { ads: true }, ad = {}, config = { rewardedIdIos: 'ca-app-pub-1/2', testing: false }, run = { tid: 'r1', lives: 1 }, state = { i: 0, xs: 0 }, prefs = memPrefs(), adsCfg = {}, platform = 'ios', resumeSnap = null, clock = { t: 1e6 } } = {}) {
  const log = [], events = [];
  const world = { run, state, flags, adsCfg };
  const body = { on: null, owner: null };
  const ads = createAds({
    admob: ad.noPlugin ? null : fakeAdmob(log, ad), prefs, config, platform, resumeSnap, flags: () => world.flags, adsCfg: () => world.adsCfg, now: () => clock.t,
    env: () => ({ run: world.run, state: world.state }), emit: (n, d) => events.push([n, d]), dispatch: (n, d) => events.push(['dispatch:' + n, d]),
    setActive: (v, o) => { body.on = v; body.owner = o; }, paintLives: () => {}
  });
  return { ads, log, events, world, prefs, body, clock, tick: ms => (clock.t += ms), caps: async () => JSON.parse((await prefs.get(K_CAPS)) || 'null') };
}

test('v1 has exactly two slips, and the source never names an interstitial, banner or tracking API', () => {
  assert.deepEqual(Object.keys(KINDS), ['memory', 'seal']);
  const src = fs.readFileSync(path.join(ROOT, 'www/ads.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'www/native.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const api of ['prepareInterstitial', 'showInterstitial', 'RewardInterstitial', 'showBanner', 'requestTrackingAuthorization', 'trackingAuthorizationStatus'])
    assert.ok(!code.includes(api), `${api} must not appear in the ad code`);
  assert.deepEqual(GOOGLE_TEST, { ios: { rewarded: GOOGLE_TEST_REWARDED_IOS }, android: { rewarded: 'ca-app-pub-3940256099942544/5224354917' } }, 'only rewarded sample units');
});

test('flag off (the shipped default): not enabled, offers refused, AdMob never touched', async () => {
  const r = rig({ flags: { ads: false } });
  assert.equal(r.ads.enabled(), false);
  r.ads.refresh(); assert.equal(r.body.on, false, 'body.gg-ads absent -> [data-gg-ad] stays hidden by CSS');
  assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'off' });
  await r.ads.onEvent({ event: 'run_end', outcome: 'won' });
  assert.deepEqual(r.log, []);
  assert.equal(rig({ flags: {} }).ads.enabled(), false);
});

test('flag on but no AdMob unit id and not testing: still off', () => {
  assert.equal(rig({ config: { rewardedIdIos: '', testing: false } }).ads.enabled(), false);
  assert.equal(rig({ config: { rewardedIdIos: '', testing: true } }).ads.enabled(), true, 'testing falls back to Google\'s sample unit');
  assert.deepEqual(rig({ platform: 'android', config: { testing: true } }).ads.unitIds(), { rewarded: GOOGLE_TEST.android.rewarded });
});

test('game events never start anything: no AdMob call, no tracking prompt, no interstitial, whatever ends', async () => {
  const r = rig();
  for (const ev of [{ event: 'run_end', outcome: 'won', training: true }, { event: 'run_end', outcome: 'abandoned' }, { event: 'run_end', outcome: 'dead' }, { event: 'run_end', outcome: 'won' },
    { event: 'run_end', outcome: 'dead' }, { event: 'run_end', outcome: 'dead' }, { event: 'run_end', outcome: 'won' }, { event: 'chamber_end' }, { event: 'seal' }, null]) { await r.ads.onEvent(ev); r.tick(400000); }
  assert.deepEqual(r.log, [], 'AdMob is only ever touched by a tap on a slip');
});

test('"first tomb cleared" is set only by a real, final won run: never by training, an abandon, a loss or a provisional event', async () => {
  const r = rig();
  for (const ev of [{ event: 'run_end', outcome: 'won', training: true }, { event: 'run_end', outcome: 'abandoned' }, { event: 'run_end', outcome: 'dead' }, { event: 'run_end', outcome: 'interrupted', provisional: true },
    { event: 'run_end', outcome: 'won', provisional: true }, { event: 'chamber_end', outcome: 'won' }]) await r.ads.onEvent(ev);
  assert.equal(await r.prefs.get(K_CLEARED), null); assert.equal(await r.ads.firstClear(), false);
  await r.ads.onEvent({ event: 'run_end', outcome: 'won', training: false });
  assert.equal(await r.prefs.get(K_CLEARED), '1'); assert.equal(await r.ads.firstClear(), true);
});

test('memory slip: +1 Memory, at most once per run, never above 3, telemetry offered/watched, non-personalised request', async () => {
  const r = rig({ run: { tid: 'r1', lives: 1 } });
  assert.deepEqual(await r.ads.offer('memory'), { ok: true, reason: '' }); assert.equal(r.world.run.lives, 2);
  assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'run_cap' }); assert.equal(r.world.run.lives, 2);
  assert.deepEqual(r.events.filter(e => e[0].startsWith('ad_')).map(e => e[0]), ['ad_offered', 'ad_watched']);
  assert.equal(r.log.find(l => l[0] === 'prepare')[1].npa, true, 'non-personalised ads are requested');
  assert.ok(!r.log.some(l => FORBIDDEN.test(l[0])), 'a rewarded video never involves an interstitial, a banner or a tracking prompt');
  r.world.run = { tid: 'r2', lives: 2 }; assert.equal((await r.ads.offer('memory')).ok, true, 'a new run gets its own allowance'); assert.equal(r.world.run.lives, 3);
  r.world.run = { tid: 'r3', lives: 3 }; assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'full' });
});

test('no reward if the video is dismissed early or fails to load', async () => {
  const a = rig({ ad: { dismissed: true } }); assert.deepEqual(await a.ads.offer('memory'), { ok: false, reason: 'closed_early' }); assert.equal(a.world.run.lives, 1);
  const b = rig({ ad: { fail: true } }); assert.deepEqual(await b.ads.offer('memory'), { ok: false, reason: 'no_fill' }); assert.equal(b.world.run.lives, 1);
  assert.ok(!b.events.some(e => e[0] === 'ad_watched')); assert.equal((await b.caps()), null, 'nothing was banked');
});

test('seal slip: +1 free seal arrives in the NEXT chamber (state.xs), one banked at a time, and is re-added if that chamber is rebuilt', async () => {
  const r = rig(); assert.equal((await r.ads.offer('seal')).ok, true);
  assert.equal(r.world.state.xs, 0, 'not this chamber'); assert.equal(r.ads.pending().seal, 1);
  assert.deepEqual(await r.ads.offer('seal'), { ok: false, reason: 'run_cap' }, 'one banked at a time');
  const next = { i: 1, xs: 0 }; assert.equal(r.ads.onNewChamber(next), true); assert.equal(next.xs, 1);
  assert.equal(r.ads.onNewChamber(next), false, 'the same chamber object is never stamped twice'); assert.equal(next.xs, 1);
  const rebuilt = { i: 1, xs: 0 }; assert.equal(r.ads.onNewChamber(rebuilt), true, 'a new wall in the same chamber keeps the seal, like the Market seal'); assert.equal(rebuilt.xs, 1);
  const after = { i: 2, xs: 0 }; assert.equal(r.ads.onNewChamber(after), false); assert.equal(after.xs, 0);
  assert.equal(r.ads.onNewChamber({ i: 0, xs: 0, train: true }), false, 'training chambers get nothing');
});

test('nothing is offered on the practice wall', async () => {
  const r = rig({ run: { tid: 't', lives: 1, train: true }, state: { i: 0, xs: 0, train: true } });
  await r.ads.load();
  assert.equal(r.ads.canOffer('memory'), 'training'); assert.deepEqual(await r.ads.offer('seal'), { ok: false, reason: 'training' }); assert.deepEqual(r.log, []);
});

test('retired slips (reroll, chestpick) from an older game build: refused cleanly, no AdMob call, no reward event, no throw', async () => {
  const r = rig();
  for (const k of ['reroll', 'chestpick', 'bogus', '', null, undefined]) {
    assert.equal(r.ads.canOffer(k), 'unknown_kind'); assert.deepEqual(await r.ads.offer(k), { ok: false, reason: 'unknown_kind' }); assert.equal(r.ads.kindOn(k), false);
  }
  r.ads.onClick({ target: { closest: () => ({ getAttribute: () => 'reroll' }) }, preventDefault() {} });
  await new Promise(res => setTimeout(res, 5));
  assert.deepEqual(r.log, []); assert.deepEqual(r.events, []);
});

test('per-kind remote flags and the cooldown between two videos are honoured', async () => {
  const r = rig({ flags: { ads: true, adMemory: false } }); assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'off' }); assert.equal((await r.ads.offer('seal')).ok, true);
  const c = rig({ adsCfg: { cooldownSec: 30 } }); assert.equal((await c.ads.offer('seal')).ok, true);
  assert.deepEqual(await c.ads.offer('memory'), { ok: false, reason: 'cooldown' }); c.tick(31000); assert.equal((await c.ads.offer('memory')).ok, true);
  const z = rig({ adsCfg: { memoryPerRun: 0 } }); assert.equal((await z.ads.offer('memory')).reason, 'run_cap');
});

test('test mode uses Google\'s sample unit; consent (UMP) form runs before the first initialise when required and never blocks', async () => {
  const r = rig({ config: { rewardedIdIos: '', testing: true } }); await r.ads.offer('seal');
  assert.equal(r.log.find(l => l[0] === 'prepare')[1].adId, GOOGLE_TEST_REWARDED_IOS);
  const calls = [];
  const c = rig({ ad: { override: { requestConsentInfo: async () => (calls.push('info'), { status: 'REQUIRED', isConsentFormAvailable: true }), showConsentForm: async () => (calls.push('form'), { status: 'OBTAINED' }) } } });
  assert.equal((await c.ads.offer('seal')).ok, true); assert.deepEqual(calls, ['info', 'form']);
  assert.ok(c.log.findIndex(l => l[0] === 'init') < c.log.findIndex(l => l[0] === 'prepare'));
  const f = rig({ ad: { override: { requestConsentInfo: async () => { throw new Error('network'); } } } }); assert.equal((await f.ads.offer('seal')).ok, true, 'a failed consent request never blocks the game');
});

// ---- X-2: caps live in Preferences, keyed by the run id
test('relaunch: the once-per-run Memory cap is not reset', async () => {
  const prefs = memPrefs(), run = { tid: 'runA', lives: 1 };
  const a = rig({ prefs, run }); assert.equal((await a.ads.offer('memory')).ok, true);
  assert.deepEqual({ run: (await a.caps()).run, memory: (await a.caps()).memory }, { run: 'runA', memory: 1 });
  // the app is killed; the run resumes with the same id (the game's resume record keeps run.tid). The save was written after the grant.
  const b = rig({ prefs, run: { tid: 'runA', lives: 2 }, resumeSnap: { tid: 'runA', t: 2e6 } });
  assert.deepEqual(await b.ads.offer('memory'), { ok: false, reason: 'run_cap' }, 'no second Memory after a relaunch');
  assert.equal(b.world.run.lives, 2); assert.deepEqual(b.log, []);
  const c = rig({ prefs, run: { tid: 'runB', lives: 1 } }); assert.equal((await c.ads.offer('memory')).ok, true, 'a different run is a different allowance');
});

test('relaunch: a seal earned before the app closed still arrives in the next chamber, exactly once', async () => {
  const prefs = memPrefs();
  const a = rig({ prefs, run: { tid: 'runA', lives: 2 }, state: { i: 0, xs: 0 } }); assert.equal((await a.ads.offer('seal')).ok, true);
  const b = rig({ prefs, run: { tid: 'runA', lives: 2 }, state: null }); await b.ads.load();
  assert.equal(b.ads.pending().seal, 1, 'still banked'); assert.deepEqual(await b.ads.offer('seal'), { ok: false, reason: 'run_cap' }, 'and still capped');
  const st = { i: 1, xs: 0 }; assert.equal(b.ads.onNewChamber(st), true); assert.equal(st.xs, 1);
  const c = rig({ prefs, run: { tid: 'runA', lives: 2 }, state: null }); await c.ads.load();
  const later = { i: 2, xs: 0 }; assert.equal(c.ads.onNewChamber(later), false, 'it does not follow the run into later chambers'); assert.equal(later.xs, 0);
});

test('relaunch: the game resumes its chamber BEFORE the shell attaches; the banked seal is added to that live chamber once the caps are read', async () => {
  const prefs = memPrefs();
  const a = rig({ prefs, run: { tid: 'runA', lives: 2 } }); await a.ads.offer('seal');
  const live = { i: 1, xs: 0 };
  const b = rig({ prefs, run: { tid: 'runA', lives: 2 }, state: live });
  assert.equal(b.ads.onNewChamber(live), false, 'caps not read yet'); await b.ads.load();
  assert.equal(live.xs, 1); b.ads.onNewChamber(live); assert.equal(live.xs, 1, 'once');
});

test('relaunch: a Memory granted after the game\'s last autosave is given back on resume, and only until an autosave contains it', async () => {
  const prefs = memPrefs(), clock = { t: 5000 };
  const a = rig({ prefs, clock, run: { tid: 'runA', lives: 1 } }); assert.equal((await a.ads.offer('memory')).ok, true); // granted at t=5000
  // killed on the same card: the resume record on disk is older (t=4000), so the resumed run has lives 1 again
  clock.t = 9000;
  const b = rig({ prefs, clock, run: { tid: 'runA', lives: 1 }, resumeSnap: { tid: 'runA', t: 4000 } }); await b.ads.load();
  assert.equal(b.world.run.lives, 2, 'the earned Memory is back'); assert.equal(b.ads.canOffer('memory'), 'run_cap', 'and the cap still stands');
  // killed again before any autosave. On disk is the save the game rewrote while resuming (t=8990, just before the Memory was given back)
  clock.t = 12000;
  const c = rig({ prefs, clock, run: { tid: 'runA', lives: 1 }, resumeSnap: { tid: 'runA', t: 8990 } }); await c.ads.load();
  assert.equal(c.world.run.lives, 2, 'given back again: the base is always the saved run, so it never stacks');
  // this time the game autosaves (t=15000) with the Memory in the run, then the app is killed
  clock.t = 20000;
  const d = rig({ prefs, clock, run: { tid: 'runA', lives: 2 }, resumeSnap: { tid: 'runA', t: 15000 } }); await d.ads.load();
  assert.equal(d.world.run.lives, 2, 'the save already contains it: nothing is added'); assert.equal((await d.caps()).owed, 0);
  const e = rig({ prefs, clock, run: { tid: 'runA', lives: 1 }, resumeSnap: { tid: 'runA', t: 100 } }); await e.ads.load();
  assert.equal(e.world.run.lives, 1, 'settled for good: an old-looking save cannot bring it back');
  assert.equal(e.ads.canOffer('memory'), 'run_cap');
});

test('relaunch: never above 3 Memories, nothing for another run, nothing without a resume record, and a corrupt record is an empty one', async () => {
  const mk = async (over, snap) => { const prefs = memPrefs({ [K_CAPS]: JSON.stringify({ v: 1, run: 'runA', memory: 1, owed: 1, owedAt: 5000, seal: 0, sealAt: null, sealN: 0, ...over }) }); const r = rig({ prefs, run: { tid: 'runA', lives: 3 }, resumeSnap: snap }); await r.ads.load(); return r; };
  assert.equal((await mk({}, { tid: 'runA', t: 1 })).world.run.lives, 3, 'capped at 3');
  const other = rig({ prefs: memPrefs({ [K_CAPS]: JSON.stringify({ v: 1, run: 'runA', memory: 1, owed: 1, owedAt: 5000, seal: 1 }) }), run: { tid: 'runB', lives: 1 }, resumeSnap: { tid: 'runA', t: 1 } }); await other.ads.load();
  assert.equal(other.world.run.lives, 1); assert.equal(other.ads.onNewChamber({ i: 0, xs: 0 }), false, 'a banked seal does not cross into another run');
  const nosnap = rig({ prefs: memPrefs({ [K_CAPS]: JSON.stringify({ v: 1, run: 'runA', memory: 1, owed: 1, owedAt: 5000 }) }), run: { tid: 'runA', lives: 1 } }); await nosnap.ads.load();
  assert.equal(nosnap.world.run.lives, 1);
  const bad = rig({ prefs: memPrefs({ [K_CAPS]: '{not json' }) }); await bad.ads.load(); assert.equal((await bad.ads.offer('memory')).ok, true);
  const huge = rig({ prefs: memPrefs({ [K_CAPS]: JSON.stringify({ v: 1, run: 'r1', memory: 0, owed: 99, owedAt: 9e15, seal: 99, sealN: 99, sealAt: 0 }) }), run: { tid: 'r1', lives: 1 }, state: { i: 0, xs: 0 }, resumeSnap: { tid: 'r1', t: 1 } }); await huge.ads.load();
  assert.equal(huge.world.run.lives, 3); assert.ok(huge.world.state.xs <= 6, 'a tampered record is clamped');
});

// ---- Ad-free: the slips stay, the video goes
function owned(v = true, ready = true) { const o = { v }; return { o, af: createAdFree({ payments: { ready, adFree: () => o.v } }) }; }

test('Ad-free: effectiveFlags marks the owner; before the entitlement cache is read every ad flag is off; a remote config cannot fake ownership', () => {
  const { af, o } = owned();
  assert.deepEqual(af.effectiveFlags({ ads: true, adMemory: true, adSeal: true, ui: 1 }), { ads: true, adMemory: true, adSeal: true, ui: 1, adFree: true });
  o.v = false; assert.deepEqual(af.effectiveFlags({ ads: true, adMemory: true, adFree: true }), { ads: true, adMemory: true }, 'adFree comes from the store only');
  assert.deepEqual(owned(false, false).af.effectiveFlags({ ads: true, adMemory: true, adSeal: true }), { ads: false, adMemory: false, adSeal: false });
  assert.deepEqual(createAdFree({ payments: null }).effectiveFlags({ ads: true }), { ads: true });
});

test('Ad-free owner: a tap is a free claim. Same reward, same caps, no video, AdMob never initialised, no cooldown', async () => {
  const { af, o } = owned(); const base = { ads: true, adMemory: true, adSeal: true };
  const r = rig({ run: { tid: 'r1', lives: 1 }, adsCfg: { cooldownSec: 30 } }); r.world.flags = af.effectiveFlags(base);
  assert.equal(r.ads.enabled(), true); assert.equal(r.ads.owner(), true); r.ads.refresh(); assert.deepEqual(r.body, { on: true, owner: true }, 'the slips stay on screen for the owner');
  assert.deepEqual(await r.ads.offer('memory'), { ok: true, reason: '', free: true }); assert.equal(r.world.run.lives, 2);
  assert.deepEqual(await r.ads.offer('seal'), { ok: true, reason: '', free: true }, 'no 30 s wait between two free claims');
  assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'run_cap' }, 'the per-run cap is the same as for a video');
  assert.deepEqual(await r.ads.offer('seal'), { ok: false, reason: 'run_cap' });
  const st = { i: 1, xs: 0 }; r.ads.onNewChamber(st); assert.equal(st.xs, 1);
  assert.deepEqual(r.log, [], 'no AdMob call of any kind');
  assert.deepEqual(r.events.filter(e => /^ad_/.test(e[0])).map(e => e[0] + ':' + e[1].reward), ['ad_free_claim:memory', 'ad_free_claim:seal']);
  // a refund: back to videos, and the cap that was used stays used
  o.v = false; r.world.flags = af.effectiveFlags(base); r.ads.refresh(); assert.deepEqual(r.body, { on: true, owner: false });
  assert.deepEqual(await r.ads.offer('memory'), { ok: false, reason: 'run_cap' });
});

test('Ad-free owner: works with no AdMob plugin and no unit id; off when rewarded offers are off for everyone; caps survive a relaunch too', async () => {
  const { af } = owned(); const prefs = memPrefs();
  const r = rig({ prefs, ad: { noPlugin: true }, config: { rewardedIdIos: '', testing: false } }); r.world.flags = af.effectiveFlags({ ads: true });
  assert.equal((await r.ads.offer('memory')).ok, true);
  const again = rig({ prefs, ad: { noPlugin: true }, config: {}, run: { tid: 'r1', lives: 2 }, resumeSnap: { tid: 'r1', t: 9e9 } }); again.world.flags = af.effectiveFlags({ ads: true });
  assert.deepEqual(await again.ads.offer('memory'), { ok: false, reason: 'run_cap' });
  const off = rig(); off.world.flags = af.effectiveFlags({ ads: false }); assert.equal(off.ads.enabled(), false); assert.deepEqual(await off.ads.offer('memory'), { ok: false, reason: 'off' });
  const kind = rig(); kind.world.flags = af.effectiveFlags({ ads: true, adSeal: false }); assert.deepEqual(await kind.ads.offer('seal'), { ok: false, reason: 'off' });
});
