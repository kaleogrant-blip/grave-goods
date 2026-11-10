// C-1 / X-6 / X-2, checked against the REAL game, not hand-written event shapes.
//
// Part 1 plays game/current.html (wrapped, Capacitor stubbed, rewarded videos ON) on a fresh profile through five situations and
// records every telemetry event the game itself emits: the practice wall, an abandoned run, a lost run, a won run, and a relaunch
// in the middle of a run. While it plays, every AdMob method is a logged stub, so any call at all would be seen.
// Part 2 feeds that recorded stream into a fresh copy of www/ads.js in Node with a fake plugin and checks it event by event.
// Part 3 taps the real slips, kills the page mid-run and reopens it: the caps and the earned rewards must still be there.
// Part 4 does the same as an Ad-free owner: the slip is a free claim.
//
// How the runs are ended: the practice wall is dug and sealed through the UI; the abandon goes through the real pause menu; the
// loss calls the game's own collapse() until its Memories are gone; the win calls the game's own endChamber(true) on the last
// chamber. In every case the run_end event is built and emitted by the game (showSummary / pauseAbandon / s10TrainDone).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, load, memPrefs } from './helpers.mjs';
import { buildWww } from '../scripts/build-www.mjs';
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
const overlayUp = page => page.evaluate(() => !document.getElementById('overlay').hidden);
async function digPracticeWall(page) { // a fresh profile: title -> Dig -> Just dig -> the training wall, dug and sealed
  await page.waitForTimeout(GUARD); await page.locator('#title button, #overlay:not([hidden]) button').filter({ hasText: /^Dig/ }).first().click();
  await page.waitForSelector('#overlay:not([hidden]) #just'); await page.waitForTimeout(GUARD); await page.locator('#overlay:not([hidden]) #just').click({ timeout: 15000 });
  await page.waitForFunction(() => typeof state !== 'undefined' && state && state.train && document.getElementById('overlay').hidden, null, { timeout: 5000 });
  for (let k = 0; k < 14 && !(await overlayUp(page)); k++) {
    const n = await page.evaluate(() => { Q.speed = 12; for (const f of state.finds) if (!f.banked) for (const [x, y] of f.cells) { let g = 0; while (state.dirt[y][x] > 0 && !state.over && g++ < 6) strike(x, y); } return exposedFinds().length; });
    await page.waitForTimeout(250);
    if (n > 0 && !(await overlayUp(page))) { await page.locator('#seal').click({ force: true }); await page.waitForTimeout(2500); }
  }
  await page.waitForFunction(() => /Training complete/i.test(document.getElementById('card').textContent) && !document.getElementById('overlay').hidden, null, { timeout: 15000 });
  await page.waitForTimeout(GUARD);
}
async function startRunFromCamp(page) {
  await page.waitForTimeout(GUARD); await page.locator('#mDig').click();
  await page.waitForSelector('#overlay:not([hidden]) #dig'); await page.waitForTimeout(GUARD); await page.locator('#overlay:not([hidden]) #dig').click({ timeout: 5000 });
  await page.waitForFunction(() => state && !state.train && !state.over && document.getElementById('overlay').hidden, null, { timeout: 8000 });
  await page.evaluate(() => { Q.speed = 12; });
}
// After a relaunch the game shows its title first; the run resumes when the player taps through it (the game's S11.take()).
async function resumeFromTitle(page) {
  await page.waitForTimeout(GUARD);
  await page.locator('#title button').first().click({ timeout: 8000 });
  await page.waitForFunction(() => typeof run !== 'undefined' && run && run.tid && typeof state !== 'undefined' && state && !state.over && document.getElementById('overlay').hidden, null, { timeout: 8000 });
  await page.evaluate(() => GG_NATIVE.ads.load()); await page.waitForTimeout(300);
}
const toCamp = async page => { await page.waitForTimeout(GUARD); await page.locator('#overlay:not([hidden]) #go').click(); await page.waitForSelector('#mDig', { timeout: 8000 }); };

let captured = null; // filled by the first test, read by the second

T('PLAY: practice wall, abandoned run, lost run, won run, relaunch mid-run. The game emits its own events; not one AdMob call, tracking request or network request happens', async () => {
  const dev = await device(); let page = await dev.launch();
  assert.equal(await page.evaluate(() => GG_NATIVE.ads.enabled() && document.body.classList.contains('gg-ads')), true, 'rewarded videos are switched ON for this test: silence is not because ads are off');

  dev.phase('practice'); await digPracticeWall(page);
  assert.equal(await page.evaluate(() => GG_NATIVE.ads.canOffer('memory')), 'training', 'no slip can be served on the practice wall');

  dev.phase('abandoned'); await page.locator('#overlay:not([hidden]) #go').click(); // "Begin chamber 1": the first real run
  await page.waitForFunction(() => state && !state.train && document.getElementById('overlay').hidden, null, { timeout: 8000 });
  await page.waitForTimeout(400);
  await page.locator('#pause').click({ force: true }); await page.waitForSelector('#pAb'); await page.waitForTimeout(GUARD);
  await page.locator('#pAb').click(); await page.waitForSelector('#pYes'); await page.waitForTimeout(GUARD); await page.locator('#pYes').click();
  await page.waitForSelector('#mDig', { timeout: 8000 });

  dev.phase('lost'); await startRunFromCamp(page);
  for (let k = 0; k < 8; k++) { // the wall falls until the Memories run out; the game shows its run summary
    if (await page.evaluate(() => !!document.querySelector('#card .runsum') && !document.getElementById('overlay').hidden)) break;
    if (await overlayUp(page)) { await page.waitForTimeout(GUARD); await page.locator('#overlay:not([hidden]) #go').click(); await page.waitForTimeout(900); continue; }
    await page.evaluate(() => { _mercy = 99; collapse(); }); await page.waitForTimeout(1600);
  }
  await page.waitForSelector('#card .runsum', { timeout: 8000 }); await page.waitForTimeout(300); await toCamp(page);

  dev.phase('won'); await startRunFromCamp(page);
  await page.evaluate(() => { state.i = CHN() - 1; endChamber(true); });
  await page.waitForSelector('#card .runsum', { timeout: 15000 }); await page.waitForTimeout(300); await toCamp(page);

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
  dev.phase('setup'); await digPracticeWall(page); await page.locator('#overlay:not([hidden]) #go').click();
  await page.waitForFunction(() => state && !state.train && document.getElementById('overlay').hidden, null, { timeout: 8000 });
  await page.evaluate(() => { Q.speed = 12; });
  const tid = await page.evaluate(() => run.tid);
  // the wall falls; the collapse card carries the real Memory slip; the player taps it and the (stubbed) video pays out
  await page.evaluate(() => { _mercy = 99; collapse(); }); await page.waitForSelector('#card #go');
  const mem = page.locator('#card [data-gg-ad="memory"]'); await mem.waitFor({ state: 'visible' });
  const l0 = await page.evaluate(() => run.lives);
  dev.phase('memory-tap'); await mem.click(); await page.waitForFunction(n => run.lives === n + 1, l0);
  assert.deepEqual(dev.admob.filter(a => a.phase === 'memory-tap').map(a => a.call), ['admob.requestConsentInfo', 'admob.initialize', 'admob.prepareRewardVideoAd', 'admob.showRewardVideoAd'], 'a tap is the only thing that starts AdMob, and it starts a rewarded video and nothing else');
  // on to a fresh wall, clear the chamber, take the seal slip on the chamber-cleared card
  await page.locator('#overlay:not([hidden]) #go').click(); await page.waitForFunction(() => document.getElementById('overlay').hidden && state && !state.over);
  await page.evaluate(() => { Q.speed = 12; endChamber(true); }); await page.waitForSelector('#card .chest');
  const seal = page.locator('#card [data-gg-ad="seal"]'); await seal.waitFor({ state: 'visible' });
  await page.evaluate(() => GG_NATIVE.remoteConfig.accept({ schema: 1, version: 50, flags: { ads: true }, ads: { memoryPerRun: 1, sealBonus: 1, cooldownSec: 0 } }, 'remote')); // no 30 s wait in a test
  dev.phase('seal-tap'); await seal.click(); await page.waitForFunction(() => GG_NATIVE.ads.pending().seal === 1);
  const capsBefore = JSON.parse(dev.prefs.get(K_CAPS));
  assert.equal(capsBefore.run, tid); assert.equal(capsBefore.memory, 1); assert.equal(capsBefore.seal, 1, 'both are in Preferences, keyed by the run id');

  dev.phase('relaunch-1'); page = await dev.launch(); // killed on the chamber-cleared card, before the next chamber
  await resumeFromTitle(page);
  const after = await page.evaluate(() => ({ tid: run.tid, lives: run.lives, xs: state.xs | 0, i: state.i, budget: skillBudget(), free: SKILL.seals.free, mem: GG_NATIVE.ads.canOffer('memory'), seal: GG_NATIVE.ads.pending().seal }));
  assert.equal(after.tid, tid, 'same run');
  assert.ok(['run_cap', 'full'].includes(after.mem), 'the Memory slip cannot be had a second time in this run after a relaunch: ' + after.mem);
  assert.equal(JSON.parse(dev.prefs.get(K_CAPS)).memory, 1, 'the persisted count still says one');
  assert.equal(after.xs, 1, 'the banked seal arrived in the chamber the game resumed into'); assert.equal(after.budget, after.free + 1); assert.equal(after.seal, 0, 'and it is no longer banked');
  assert.equal((await page.evaluate(() => GG_NATIVE.ads.offer('memory'))).ok, false);

  dev.phase('relaunch-2'); page = await dev.launch(); // and again, in the same chamber
  await resumeFromTitle(page);
  const again = await page.evaluate(() => ({ tid: run.tid, xs: state.xs | 0, i: state.i, mem: GG_NATIVE.ads.canOffer('memory') }));
  assert.equal(again.tid, tid); assert.equal(again.i, after.i);
  assert.equal(again.xs, 1, 'the same chamber rebuilt after a second relaunch still has exactly one extra seal: not lost, not doubled');
  assert.ok(['run_cap', 'full'].includes(again.mem));
  assert.equal(dev.admob.filter(a => /relaunch/.test(a.phase)).length, 0, 'relaunching never touches AdMob');
  assert.ok(!dev.admob.some(a => /nterstitial|Banner|Tracking/i.test(a.call)), 'across the whole session: ' + dev.admob.map(a => a.call));
  assert.deepEqual(dev.errors, []);
  await dev.ctx.close();
});

T('RELAUNCH right after a rewarded Memory, before the game saves again: the Memory the player earned is still there', async () => {
  const dev = await device(); let page = await dev.launch();
  await digPracticeWall(page); await page.locator('#overlay:not([hidden]) #go').click();
  await page.waitForFunction(() => state && !state.train && document.getElementById('overlay').hidden, null, { timeout: 8000 });
  // make the autosave hold 1 Memory, so the slip takes the run from 1 to 2 and the cap of 3 cannot hide a lost reward
  await page.evaluate(() => { Q.speed = 12; run.lives = 1; newChamber(0); });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rw_resume')).run.lives); assert.equal(saved, 1);
  await page.waitForTimeout(30);
  assert.deepEqual(await page.evaluate(async () => { const r = await GG_NATIVE.ads.offer('memory'); return [r.ok, run.lives]; }), [true, 2]);
  page = await dev.launch();
  await resumeFromTitle(page);
  assert.deepEqual(await page.evaluate(() => [run.lives, GG_NATIVE.ads.canOffer('memory')]), [2, 'run_cap'], 'the saved run had 1; the earned Memory is back, and the slip is still used up');
  page = await dev.launch();
  await resumeFromTitle(page);
  assert.equal(await page.evaluate(() => run.lives), 2, 'a second relaunch does not stack another one');
  assert.deepEqual(dev.errors, []); await dev.ctx.close();
});

T('AD-FREE owner in the real game: the slip is a free claim (no video, AdMob never started), under the same cap, and the cap survives a relaunch', async () => {
  const dev = await device({ owner: true }); let page = await dev.launch();
  assert.deepEqual(await page.evaluate(() => [GG_NATIVE.ads.owner(), document.body.classList.contains('gg-ads'), document.body.classList.contains('gg-adfree')]), [true, true, true]);
  await digPracticeWall(page); await page.locator('#overlay:not([hidden]) #go').click();
  await page.waitForFunction(() => state && !state.train && document.getElementById('overlay').hidden, null, { timeout: 8000 });
  const tid = await page.evaluate(() => { Q.speed = 12; return run.tid; });
  await page.evaluate(() => { _mercy = 99; collapse(); }); await page.waitForSelector('#card #go');
  const mem = page.locator('#card [data-gg-ad="memory"]'); await mem.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#card [data-gg-ad="memory"] .as-t b').textContent === 'Claim · +1 Memory');
  const l0 = await page.evaluate(() => run.lives);
  await mem.click(); await page.waitForFunction(n => run.lives === n + 1, l0);
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
