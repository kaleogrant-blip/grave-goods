// C-1 / X-6 / X-2, checked against the REAL game, not hand-written event shapes.
//
// Part 1 plays game/current.html (wrapped, Capacitor stubbed, rewarded videos ON) on a fresh profile through five situations and
// records every telemetry event the game itself emits: the practice wall, an abandoned run, a lost run, a won run, and a relaunch
// in the middle of a run. While it plays, every AdMob method is a logged stub, so any call at all would be seen.
// Part 2 feeds that recorded stream into a fresh copy of www/ads.js in Node with a fake plugin and checks it event by event.
// Part 3 taps the real slips, kills the page mid-run and reopens it: the caps and the earned rewards must still be there.
// Part 4 does the same as an Ad-free owner: the slip is a free claim.
//
// How it is played (v1.0-rc10 rules, real touchscreen taps, helpers in tests/play.mjs): the practice wall's five finds are uncovered
// with the pick and sealed as one tray; the abandon goes through the real pause menu; the loss is a wall struck past its limit, three
// times, until the Memories are gone; the win is a full tray of six sealed in the last chamber. Setup is written directly where a
// player would need hundreds of taps (one strike of dirt left on a find, the wall one strike from its limit, the chamber's bank just
// under its target, the jump to the last chamber). In every case the run_end event is built and emitted by the game.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, load, memPrefs } from './helpers.mjs';
import { buildWww } from '../scripts/build-www.mjs';
import { tapSel, uncover, seal, collapseByTap, clearChamberBySeal, cardUp, sendVisitorAway } from './play.mjs';
const { createAds, K_CLEARED, K_CAPS } = load('ads.js');

const OUT = path.join(ROOT, 'www/index.realgame.html');
let browser = null, skip = false;
test.before(async () => {
  try { browser = await chromium.launch(); } catch (e) { if (process.env.GG_REQUIRE_BROWSER) throw e; skip = 'no Chromium available: ' + String(e.message).split('\n')[0]; }
  buildWww({ root: ROOT, out: OUT, env: { FLAGS_ADS_DEFAULT: 'true', ADMOB_TESTING: 'true' }, log: () => {} });
});
test.after(async () => { if (browser) await browser.close(); try { fs.unlinkSync(OUT); } catch {} });
const T = (name, fn) => test(name, async t => { if (skip) return t.skip(skip); await fn(t); });

const STUB = `(() => {
  const call = (op, a) => window.__kv(op, a), log = (n, a) => (window.__plug = window.__plug || []).push([n, a || {}]);
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {
    Preferences: { get: a => call('p.get', a), set: a => call('p.set', a), remove: a => call('p.remove', a) },
    Haptics: { impact: async () => {}, notification: async () => {} }, StatusBar: { hide: async () => {} }, App: { addListener: async () => ({ remove() {} }) },
    AdMob: new Proxy({}, { get: (_t, m) => async a => { if (m === 'addListener') return { remove() {} }; log('admob.' + String(m), a); window.__adlog('admob.' + String(m)); return m === 'showRewardVideoAd' ? { type: 'coin', amount: 1 } : {}; } })
  } };
  document.addEventListener('gg:tel', e => window.__tel(JSON.parse(JSON.stringify(e.detail))));
})();`;

// One "device": localStorage lives in the browser context, Preferences in this Map. open() again on the same device is a relaunch.
async function device({ owner = false } = {}) {
  const prefs = new Map(owner ? [['gg_ent_v1', JSON.stringify({ v: 1, ids: ['gg_adfree'], at: Date.now() })]] : []);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const dev = { ctx, prefs, events: [], admob: [], net: [], errors: [], mark: 'boot', marks: [] };
  await ctx.exposeBinding('__kv', (_s, op, a) => { switch (op) { case 'p.get': return { value: prefs.has(a.key) ? prefs.get(a.key) : null }; case 'p.set': prefs.set(a.key, a.value); return; case 'p.remove': prefs.delete(a.key); return; default: return { value: null }; } });
  await ctx.exposeFunction('__tel', e => dev.events.push({ phase: dev.mark, ev: e }));
  await ctx.exposeFunction('__adlog', m => dev.admob.push({ phase: dev.mark, call: m }));
  await ctx.addInitScript(STUB);
  dev.launch = async () => {
    if (dev.page) await dev.page.close();
    const page = dev.page = await ctx.newPage();
    page.on('request', q => { if (!/^(file|data|blob|about):/.test(q.url())) dev.net.push(q.url()); });
    page.on('console', m => { if (m.type() === 'error') dev.errors.push(m.text()); });
    page.on('pageerror', e => dev.errors.push('pageerror: ' + e.message));
    await page.goto('file://' + OUT);
    await page.waitForFunction(() => window.GG_NATIVE && GG_NATIVE.ready && GG_NATIVE.payments && GG_NATIVE.payments.ready, null, { timeout: 25000 });
    await page.evaluate(() => GG_NATIVE.ads.load());
    await page.waitForTimeout(500);
    return page;
  };
  dev.phase = name => { dev.mark = name; dev.marks.push(name); };
  return dev;
}
const GUARD = 1100; // the game ignores taps for a moment after a card opens
const wallUp = async page => { await page.waitForFunction(() => state && !state.train && !state.over && run && run.tid, null, { timeout: 8000 }); await sendVisitorAway(page); await page.waitForFunction(() => document.getElementById('overlay').hidden, null, { timeout: 8000 }); await page.evaluate(() => { Q.speed = 6; }); await page.waitForTimeout(400); };
async function digPracticeWall(page) { // a fresh profile: title -> Dig -> Just dig -> the training wall: five finds uncovered with the pick, sealed as one tray
  await page.waitForTimeout(GUARD); await tapSel(page, '#title button.tl-dig');
  await page.waitForSelector('#overlay:not([hidden]) #just'); await page.waitForTimeout(GUARD); await tapSel(page, '#overlay:not([hidden]) #just');
  await page.waitForFunction(() => typeof state !== 'undefined' && state && state.train && document.getElementById('overlay').hidden, null, { timeout: 5000 });
  await uncover(page, 5); await seal(page);
  await page.waitForFunction(() => /Training complete/i.test(document.getElementById('card').textContent) && !document.getElementById('overlay').hidden, null, { timeout: 15000 });
  await page.waitForTimeout(GUARD);
}
const beginChamber1 = async page => { await tapSel(page, '#overlay:not([hidden]) #go'); await wallUp(page); }; // "Begin chamber 1" on the Training complete card: the first real run
async function startRunFromCamp(page) {
  await page.waitForTimeout(GUARD); await tapSel(page, '#mDig');
  await page.waitForSelector('#overlay:not([hidden]) #dig'); await page.waitForTimeout(GUARD);
  const safe = page.locator('#overlay:not([hidden]) .kitgear [data-id="knuckle"]:visible, #overlay:not([hidden]) .kitgear [data-id="compass"]:visible, #overlay:not([hidden]) .kitgear [data-id="dowser"]:visible');
  if (await safe.count()) await safe.first().tap(); // of the three pieces on offer, one that changes no rule this test leans on (not the Sack, the Candle or the Glass Hammer)
  await tapSel(page, '#overlay:not([hidden]) #dig'); await wallUp(page);
  await page.evaluate(() => { if (['sack', 'candle', 'glass'].includes(gear.id)) { gear = GEAR[0]; ui(); } }); // setup, only when none of the three was on offer
}
// A new profile's first two collapses cost no Memory. Setup: they have been used, so a falling wall costs what it says.
const spendMercy = page => page.evaluate(() => { Store.set('rw_mercy', String(SKILL.mercy.free)); _mercy = null; });
// "Dig a different wall" on the collapse card
const digOn = async page => { await tapSel(page, '#overlay:not([hidden]) #go'); await wallUp(page); };
// After a relaunch the game shows its title first; the run resumes when the player taps through it (the game's S11.take()).
async function resumeFromTitle(page) {
  await page.waitForTimeout(GUARD);
  await tapSel(page, '#title button.tl-dig');
  await page.waitForFunction(() => typeof run !== 'undefined' && run && run.tid && typeof state !== 'undefined' && state && !state.over && document.getElementById('overlay').hidden, null, { timeout: 8000 });
  await page.evaluate(() => GG_NATIVE.ads.load()); await page.waitForTimeout(300);
}
const toCamp = async page => { await page.waitForTimeout(GUARD); await tapSel(page, '#overlay:not([hidden]) #go'); await page.waitForSelector('#mDig', { timeout: 8000 }); };

let captured = null; // filled by the first test, read by the second

T('PLAY: practice wall, abandoned run, lost run, won run, relaunch mid-run. The game emits its own events; not one AdMob call, tracking request or network request happens', async () => {
  const dev = await device(); let page = await dev.launch();
  assert.equal(await page.evaluate(() => GG_NATIVE.ads.enabled() && document.body.classList.contains('gg-ads')), true, 'rewarded videos are switched ON for this test: silence is not because ads are off');

  dev.phase('practice'); await digPracticeWall(page);
  assert.equal(await page.evaluate(() => GG_NATIVE.ads.canOffer('memory')), 'training', 'no slip can be served on the practice wall');

  dev.phase('abandoned'); await beginChamber1(page);
  assert.deepEqual(await page.evaluate(() => [GAME_VERSION, state.ft, TARGETS[0]]), ['v1.0-rc10', 1, 600], 'the first real wall of a new profile: first-tomb rules on, soft target 600');
  await tapSel(page, '#pause'); await page.waitForSelector('#pAb'); await page.waitForTimeout(GUARD);
  await tapSel(page, '#pAb'); await page.waitForSelector('#pYes'); await page.waitForTimeout(GUARD); await tapSel(page, '#pYes');
  await page.waitForSelector('#mDig', { timeout: 8000 });

  dev.phase('lost'); await startRunFromCamp(page); await spendMercy(page);
  for (let k = 1; k <= 3; k++) { // the wall is struck past its limit, three times: three Memories, then the run summary
    await collapseByTap(page);
    if (k < 3) { await cardUp(page); assert.equal(await page.evaluate(() => run.lives), 3 - k); await digOn(page); }
  }
  await page.waitForSelector('#overlay:not([hidden]) #card .runsum', { timeout: 15000 }); await page.waitForTimeout(300); await toCamp(page);

  dev.phase('won'); await startRunFromCamp(page);
  await page.evaluate(() => { newChamber(CHN() - 1); }); await wallUp(page); // setup: straight to the last chamber of the tomb
  assert.deepEqual(await page.evaluate(() => [state.i, TARGETS[2], state.ft]), [2, 7500, 1], 'chamber 3 of a first tomb asks 7,500 and holds the seal for a full tray');
  await clearChamberBySeal(page); // six finds uncovered by six taps, one tap on Seal
  await page.waitForSelector('#overlay:not([hidden]) #card .runsum', { timeout: 20000 }); await page.waitForTimeout(300); await toCamp(page);

  dev.phase('midrun'); await startRunFromCamp(page);
  const before = await page.evaluate(() => ({ tid: run.tid, i: state.i, resume: JSON.parse(localStorage.getItem('rw_resume')).tid }));
  assert.equal(before.resume, before.tid, 'the game autosaved the run at its chamber start');
  dev.phase('relaunch'); page = await dev.launch(); // the app is killed and opened again
  await resumeFromTitle(page);
  assert.equal(await page.evaluate(() => run.tid), before.tid, 'the game resumed the same run, with the same run id');
  await page.waitForTimeout(600);

  // ---- what the game really emitted
  const ends = dev.events.filter(x => x.ev.event === 'run_end').map(x => [x.phase, x.ev.outcome, x.ev.training === true, x.ev.provisional === true]);
  const final = ends.filter(e => !e[3]);
  assert.deepEqual(final.filter(e => e[0] !== 'relaunch'), [['practice', 'won', true, false], ['abandoned', 'abandoned', false, false], ['lost', 'dead', false, false], ['won', 'won', false, false]],
    'one final run_end per situation, and the practice wall really does report outcome "won" with training:true (the C-1 trap)');
  assert.ok(dev.events.some(x => x.phase === 'relaunch' && x.ev.event === 'run_resume'), 'the relaunch produced the game\'s run_resume');
  assert.ok(!final.some(e => e[0] === 'relaunch'), 'a resumed run is not a finished run');
  assert.ok(dev.events.every(x => x.ev.config_version === 11 && x.ev.build === 'v1.0-rc10'), 'every event carries the rc10 build and telemetry config version 11');
  // ---- and what the app did about it
  assert.deepEqual(dev.admob, [], 'no AdMob method of any kind was called in any phase: no init, no interstitial, no tracking request, no video');
  assert.deepEqual(dev.net, [], 'no network request left the device');
  assert.equal(dev.prefs.get(K_CLEARED), '1', '"first tomb cleared" is set by the end, by the real win');
  assert.ok(![...dev.prefs.keys()].some(k => /inter|att/i.test(k)), 'no interstitial or tracking state exists: ' + [...dev.prefs.keys()]);
  assert.deepEqual(dev.errors, []);
  captured = dev.events;
  await dev.ctx.close();
});

T('REPLAY: the recorded stream fed into www/ads.js. Nothing fires on training or abandon (or on anything else); "first tomb cleared" flips exactly at the real win', async () => {
  assert.ok(captured && captured.length > 20, 'the PLAY test recorded the game\'s events (' + (captured ? captured.length : 0) + ')');
  const log = [], prefs = memPrefs();
  const admob = new Proxy({}, { get: (_t, m) => async () => { log.push(String(m)); return {}; } });
  const ads = createAds({ admob, prefs, platform: 'ios', config: { rewardedIdIos: 'ca-app-pub-1/2', testing: false }, flags: () => ({ ads: true, adMemory: true, adSeal: true }),
    adsCfg: () => ({ memoryPerRun: 1, sealBonus: 1, cooldownSec: 30 }), env: () => ({ run: { tid: 'x', lives: 2 }, state: {} }), emit() {}, dispatch() {}, setActive() {} });
  assert.equal(ads.enabled(), true);
  const flips = [];
  for (const { phase, ev } of captured) {
    const was = await prefs.get(K_CLEARED);
    await ads.onEvent(ev);
    assert.deepEqual(log, [], `after ${phase}/${ev.event}${ev.outcome ? ':' + ev.outcome : ''}: the plugin must be untouched`);
    if ((await prefs.get(K_CLEARED)) !== was) flips.push([phase, ev.event, ev.outcome, ev.training === true]);
    if (phase === 'practice' || phase === 'abandoned' || phase === 'lost') assert.equal(await prefs.get(K_CLEARED), null, `no clear recorded during "${phase}" (${ev.event})`);
  }
  assert.deepEqual(flips, [['won', 'run_end', 'won', false]], 'exactly one event sets it: the real, non-training win');
  assert.deepEqual([...prefs.m.keys()], [K_CLEARED], 'and that flag is the only thing the whole stream wrote');
});

T('RELAUNCH with rewards in hand: the once-per-run Memory cap is not reset, the banked seal is not lost, and neither can be taken twice', async () => {
  const dev = await device(); let page = await dev.launch();
  dev.phase('setup'); await digPracticeWall(page); await beginChamber1(page); await spendMercy(page);
  const tid = await page.evaluate(() => run.tid);
  // the wall falls to a real strike; the collapse card carries the real Memory slip; the player taps it and the (stubbed) video pays out
  await collapseByTap(page); await cardUp(page);
  const mem = page.locator('#card [data-gg-ad="memory"]'); await mem.waitFor({ state: 'visible' });
  const l0 = await page.evaluate(() => run.lives); assert.equal(l0, 2);
  dev.phase('memory-tap'); await mem.tap(); await page.waitForFunction(n => run.lives === n + 1, l0);
  assert.deepEqual(dev.admob.filter(a => a.phase === 'memory-tap').map(a => a.call), ['admob.requestConsentInfo', 'admob.initialize', 'admob.prepareRewardVideoAd', 'admob.showRewardVideoAd'], 'a tap is the only thing that starts AdMob, and it starts a rewarded video and nothing else');
  // on to a fresh wall, clear the chamber, take the seal slip on the chamber-cleared card
  await digOn(page);
  await clearChamberBySeal(page); await page.waitForSelector('#overlay:not([hidden]) #card .chest', { timeout: 20000 }); await page.waitForTimeout(GUARD);
  const seal = page.locator('#card [data-gg-ad="seal"]'); await seal.waitFor({ state: 'visible' });
  await page.evaluate(() => GG_NATIVE.remoteConfig.accept({ schema: 2, version: 50, flags: { ads: true }, ads: { memoryPerRun: 1, sealBonus: 1, cooldownSec: 0 } }, 'remote')); // no 30 s wait in a test
  dev.phase('seal-tap'); await seal.tap(); await page.waitForFunction(() => GG_NATIVE.ads.pending().seal === 1);
  const capsBefore = JSON.parse(dev.prefs.get(K_CAPS));
  assert.equal(capsBefore.run, tid); assert.equal(capsBefore.memory, 1); assert.equal(capsBefore.seal, 1, 'both are in Preferences, keyed by the run id');

  const snap = () => page.evaluate(() => ({ tid: run.tid, lives: run.lives, xs: state.xs | 0, i: state.i, budget: skillBudget(), free: SKILL.seals.free, mem: GG_NATIVE.ads.canOffer('memory'), sealCan: GG_NATIVE.ads.canOffer('seal'), seal: GG_NATIVE.ads.pending().seal }));
  const disk = () => page.evaluate(() => { const z = JSON.parse(localStorage.getItem('rw_resume')); return { i: z.i, xs: z.w ? z.w.xs | 0 : null, adxs: z.w ? z.w.adxs | 0 : null, lives: z.run.lives }; });
  const earnedIn = await page.evaluate(() => state.i), livesNow = l0 + 1;

  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('rw_resume')).v), 2, 'the saved-dig record is version 2 (rc10)');
  // 1. killed on the chamber-cleared card. The game resumes the SAME chamber from its record made before the clear.
  dev.phase('relaunch-1'); page = await dev.launch(); await resumeFromTitle(page);
  const r1 = await snap();
  assert.equal(r1.tid, tid, 'same run'); assert.equal(r1.i, earnedIn, 'the game resumed the chamber the seal was earned in');
  assert.equal(r1.xs, 0, 'the banked seal is NOT spent on the chamber it was earned in'); assert.equal(r1.budget, r1.free);
  assert.equal(r1.seal, 1, 'it is still banked'); assert.equal(r1.sealCan, 'run_cap', 'and a second one cannot be banked from the same card after a relaunch');
  assert.ok(['run_cap', 'full'].includes(r1.mem), 'the Memory slip cannot be had a second time in this run after a relaunch: ' + r1.mem);
  assert.equal(r1.lives, livesNow, 'the rewarded Memory is there once: no more, no less');
  assert.equal(JSON.parse(dev.prefs.get(K_CAPS)).memory, 1, 'the persisted count still says one');
  assert.equal((await page.evaluate(() => GG_NATIVE.ads.offer('memory'))).ok, false);

  // 2. on to the NEXT chamber: the seal lands there, once. Then the app dies before the game's next save (it saves within 600 ms).
  // (Setup, not taps: the kill has to land in the same instant the chamber is built, which no tap can time.)
  await page.evaluate(() => { newChamber(state.i + 1); S15.hold = true; }); // S15.hold stops the game saving again: a hard kill
  const n2 = await snap(), d2 = await disk();
  assert.equal(n2.i, earnedIn + 1); assert.equal(n2.xs, 1, 'exactly one extra seal in the next chamber'); assert.equal(n2.budget, n2.free + 1); assert.equal(n2.seal, 0, 'no longer banked');
  assert.deepEqual([d2.i, d2.xs, d2.adxs], [earnedIn + 1, 0, 0], 'the record on disk is the game\'s chamber-start save, written before the seal was added');
  dev.phase('relaunch-2'); page = await dev.launch(); await resumeFromTitle(page);
  const r2 = await snap();
  assert.equal(r2.i, earnedIn + 1); assert.equal(r2.xs, 1, 'the saved wall did not have the seal; it is put back, once'); assert.equal(r2.budget, r2.free + 1); assert.equal(r2.seal, 0);
  assert.equal(r2.lives, livesNow);

  // 3. this time the game saves the wall with the seal in it (its own 600 ms save, then the app is closed normally), twice over.
  await page.evaluate(() => ui()); await page.waitForTimeout(900);
  assert.deepEqual((({ i, xs, adxs }) => [i, xs, adxs])(await disk()), [earnedIn + 1, 1, 1], 'the game saved the seal and its mark with the wall');
  for (const ph of ['relaunch-3', 'relaunch-4']) {
    dev.phase(ph); page = await dev.launch(); await resumeFromTitle(page);
    const r = await snap();
    assert.equal(r.i, earnedIn + 1); assert.equal(r.xs, 1, ph + ': the same wall resumed with exactly one extra seal: not lost, not applied again'); assert.equal(r.budget, r.free + 1);
    assert.equal(r.seal, 0); assert.equal(r.lives, livesNow, ph + ': still exactly one rewarded Memory'); assert.ok(['run_cap', 'full'].includes(r.mem));
    await page.evaluate(() => ui()); await page.waitForTimeout(800);
  }
  // 4. a collapse builds a new wall in this chamber: it keeps the seal; the chamber after it does not
  assert.equal(await page.evaluate(() => { newChamber(state.i); return state.xs | 0; }), 1);
  assert.equal(await page.evaluate(() => { newChamber(state.i + 1); ui(); return state.xs | 0; }), 0);
  assert.equal(dev.admob.filter(a => /relaunch/.test(a.phase)).length, 0, 'relaunching never touches AdMob');
  assert.ok(!dev.admob.some(a => /nterstitial|Banner|Tracking/i.test(a.call)), 'across the whole session: ' + dev.admob.map(a => a.call));
  assert.deepEqual(dev.errors, []);
  await dev.ctx.close();
});

// The rewarded Memory against rc9a's save-on-every-change. Whatever the timing of the kill, the run ends up with exactly one more Memory.
for (const [name, kill] of [
  ['the app dies the instant the Memory is granted (no save contains it)', () => { S15.hold = true; }],
  ['the app is closed normally (the game saves on pagehide, with the Memory in the run)', () => { window.dispatchEvent(new Event('pagehide')); S15.hold = true; }]
]) {
  T(`RELAUNCH after a rewarded Memory, ${name}: relaunch, relaunch again, and again: exactly +1 in total`, async () => {
    const dev = await device(); let page = await dev.launch();
    await digPracticeWall(page); await beginChamber1(page);
    // setup: make the save hold 1 Memory, so the slip takes the run from 1 to 2 and the cap of 3 cannot hide a lost or doubled reward
    await page.evaluate(() => { Q.speed = 12; run.lives = 1; newChamber(0); ui(); }); await page.waitForTimeout(900);
    const lives = () => page.evaluate(() => run.lives), onDisk = () => page.evaluate(() => JSON.parse(localStorage.getItem('rw_resume')).run.lives);
    assert.equal(await onDisk(), 1);
    const got = await page.evaluate(async k => { const r = await GG_NATIVE.ads.offer('memory'); (0, eval)('(' + k + ')')(); return [r.ok, run.lives]; }, kill.toString());
    assert.deepEqual(got, [true, 2]);
    const saved = await onDisk(); assert.equal(saved, name.startsWith('the app dies') ? 1 : 2, 'what the game had saved when the app went away');
    for (const n of [1, 2, 3]) {
      page = await dev.launch(); await resumeFromTitle(page);
      assert.equal(await lives(), 2, `relaunch ${n}: saved Memories + exactly one rewarded Memory`);
      assert.equal(await page.evaluate(() => GG_NATIVE.ads.canOffer('memory')), 'run_cap', `relaunch ${n}: the slip is still used up`);
      if (n === 2) await page.evaluate(() => { S15.hold = true; }); // the second relaunch is also killed hard, before any later save
      else { await page.evaluate(() => ui()); await page.waitForTimeout(800); }
    }
    assert.equal(await onDisk(), 2, 'and the game\'s own save agrees');
    assert.equal(JSON.parse(dev.prefs.get(K_CAPS)).memory, 1);
    assert.deepEqual(dev.errors, []); await dev.ctx.close();
  });
}

T('AD-FREE owner in the real game: the slip is a free claim (no video, AdMob never started), under the same cap, and the cap survives a relaunch', async () => {
  const dev = await device({ owner: true }); let page = await dev.launch();
  assert.deepEqual(await page.evaluate(() => [GG_NATIVE.ads.owner(), document.body.classList.contains('gg-ads'), document.body.classList.contains('gg-adfree')]), [true, true, true]);
  await digPracticeWall(page); await beginChamber1(page); await spendMercy(page);
  const tid = await page.evaluate(() => run.tid);
  await collapseByTap(page); await cardUp(page);
  const mem = page.locator('#card [data-gg-ad="memory"]'); await mem.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#card [data-gg-ad="memory"] .as-t b').textContent === 'Claim · +1 Memory');
  const l0 = await page.evaluate(() => run.lives);
  await mem.tap(); await page.waitForFunction(n => run.lives === n + 1, l0);
  assert.ok(dev.events.some(x => x.ev.event === 'ad_free_claim' && x.ev.reward === 'memory'));
  assert.ok(!dev.events.some(x => x.ev.event === 'ad_offered' || x.ev.event === 'ad_watched'), 'no video was offered or watched');
  page = await dev.launch();
  await resumeFromTitle(page);
  assert.equal(await page.evaluate(() => run.tid), tid);
  assert.ok(['run_cap', 'full'].includes(await page.evaluate(() => GG_NATIVE.ads.canOffer('memory'))), 'an owner cannot claim twice in one run by relaunching either');
  assert.deepEqual(dev.admob, [], 'AdMob was never called for the owner');
  assert.deepEqual(dev.net, []); assert.deepEqual(dev.errors, []);
  await dev.ctx.close();
});
