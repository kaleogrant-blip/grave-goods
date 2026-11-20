// v1.0-rc10's new rules against the app shell, on the REAL game with real touchscreen taps (tests/play.mjs).
//   1. The first-tomb seal guard and the rewarded "+1 free seal": the bonus adds a seal to the budget and nothing else.
//   2. The bare-wall rule and the rewarded Memory: the second bare wall of a chamber costs a Memory through the collapse card, the
//      Memory slip is on that card, once per run, and the cap and the bare-wall count both survive a relaunch (saved-dig record v2).
//   3. Telemetry: every event carries build v1.0-rc10 and config_version 11, the shapes the shell forwards are unchanged, and a dig
//      that is closed and resumed does not reach the analytics queue as a finished run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from './helpers.mjs';
import { buildWww } from '../scripts/build-www.mjs';
import { GUARD, tapSel, uncover, seal, sealBtn, collapseByTap, bareByTap, cardUp, cardText, sendVisitorAway } from './play.mjs';

const OUT = path.join(ROOT, 'www/index.rc10rules.html'), POSTHOG = 'https://us.i.posthog.com/batch/';
let browser = null, skip = false;
test.before(async () => {
  try { browser = await chromium.launch(); } catch (e) { if (process.env.GG_REQUIRE_BROWSER) throw e; skip = 'no Chromium available: ' + String(e.message).split('\n')[0]; }
  buildWww({ root: ROOT, out: OUT, env: { FLAGS_ADS_DEFAULT: 'true', ADMOB_TESTING: 'true', POSTHOG_KEY: 'phc_rc10' }, log: () => {} });
});
test.after(async () => { if (browser) await browser.close(); try { fs.unlinkSync(OUT); } catch {} });
const T = (name, fn) => test(name, async t => { if (skip) return t.skip(skip); await fn(t); });

const STUB = `(() => {
  const call = (op, a) => window.__kv(op, a);
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {
    Preferences: { get: a => call('p.get', a), set: a => call('p.set', a), remove: a => call('p.remove', a) },
    Haptics: { impact: async () => {}, notification: async () => {} }, StatusBar: { hide: async () => {} }, App: { addListener: async () => ({ remove() {} }) },
    AdMob: new Proxy({}, { get: (_t, m) => async a => { if (m === 'addListener') return { remove() {} }; window.__adlog(String(m)); return m === 'showRewardVideoAd' ? { type: 'coin', amount: 1 } : {}; } })
  } };
})();`;
// One device: localStorage in the browser context, Preferences in a Map. launch() again is "the app was closed and opened again".
async function device() {
  const prefs = new Map([['gg_tel_consent', 'yes']]);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const dev = { ctx, prefs, admob: [], posts: [], errors: [] };
  await ctx.exposeBinding('__kv', (_s, op, a) => { switch (op) { case 'p.get': return { value: prefs.has(a.key) ? prefs.get(a.key) : null }; case 'p.set': prefs.set(a.key, a.value); return; case 'p.remove': prefs.delete(a.key); return; default: return { value: null }; } });
  await ctx.exposeFunction('__adlog', m => dev.admob.push(m));
  await ctx.route(POSTHOG, async r => { dev.posts.push(JSON.parse(r.request().postData())); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' }); });
  await ctx.addInitScript(STUB);
  dev.launch = async () => {
    if (dev.page) await dev.page.close();
    const page = dev.page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') dev.errors.push(m.text()); });
    page.on('pageerror', e => dev.errors.push('pageerror: ' + e.message));
    await page.goto('file://' + OUT);
    await page.waitForFunction(() => window.GG_NATIVE && GG_NATIVE.ready && GG_NATIVE.payments && GG_NATIVE.payments.ready, null, { timeout: 25000 });
    await page.evaluate(() => GG_NATIVE.ads.load());
    await page.evaluate(() => GG_NATIVE.remoteConfig.accept({ schema: 2, version: 50, flags: { ads: true }, ads: { memoryPerRun: 1, sealBonus: 1, cooldownSec: 0 } }, 'remote')); // no 30 s wait between two slips in a test
    await page.waitForTimeout(500);
    return page;
  };
  dev.sent = async () => { await dev.page.evaluate(() => GG_NATIVE.telemetry.flush(true)); await dev.page.waitForTimeout(300); return dev.posts.flatMap(p => p.batch); };
  return dev;
}
const wallUp = async page => { await page.waitForFunction(() => state && !state.train && !state.over && run && run.tid, null, { timeout: 8000 }); await sendVisitorAway(page); await page.waitForFunction(() => document.getElementById('overlay').hidden, null, { timeout: 8000 }); await page.evaluate(() => { Q.speed = 6; }); await page.waitForTimeout(400); };
// A brand-new profile: title, Dig, Just dig, the practice wall (five finds, one tray), "Begin chamber 1".
async function firstRun(page) {
  await page.waitForTimeout(GUARD); await tapSel(page, '#title button.tl-dig');
  await page.waitForSelector('#overlay:not([hidden]) #just'); await page.waitForTimeout(GUARD); await tapSel(page, '#overlay:not([hidden]) #just');
  await page.waitForFunction(() => state && state.train && document.getElementById('overlay').hidden, null, { timeout: 5000 });
  await uncover(page, 5); await seal(page);
  await page.waitForFunction(() => /Training complete/i.test(document.getElementById('card').textContent) && !document.getElementById('overlay').hidden, null, { timeout: 15000 });
  await page.waitForTimeout(GUARD); await tapSel(page, '#overlay:not([hidden]) #go'); await wallUp(page);
}
const digOn = async page => { await tapSel(page, '#overlay:not([hidden]) #go'); await wallUp(page); };
const resumeFromTitle = async page => { await page.waitForTimeout(GUARD); await tapSel(page, '#title button.tl-dig');
  await page.waitForFunction(() => run && run.tid && state && !state.over && document.getElementById('overlay').hidden, null, { timeout: 8000 }); await page.evaluate(() => GG_NATIVE.ads.load()); await page.waitForTimeout(400); };
const toast = page => page.evaluate(() => { const t = document.getElementById('uitoast'); return t ? t.textContent : ''; });

T('first tomb + the rewarded seal: the Seal button is held until the tray is full (and let go in the red); the bonus seal makes the next chamber Seal 1/4 and changes nothing else about the guard or the tray', async () => {
  const dev = await device(); const page = await dev.launch(); await firstRun(page);
  assert.deepEqual(await page.evaluate(() => [state.ft, TARGETS[0], SKILL.first.tray, skillBudget()]), [1, 600, 6, 3], 'a new profile on Tomb I, Stake 1: first-tomb rules, three free seals');
  // three finds loose: the tap on Seal is refused and nothing is banked
  await uncover(page, 3); let sb = await sealBtn(page);
  assert.equal(sb.held, true); assert.match(sb.text, /Tray 3\/6/); assert.match(sb.text, /fill it/);
  await tapSel(page, '#seal'); await page.waitForTimeout(700);
  assert.deepEqual(await page.evaluate(() => [state.sealed | 0, chBank(), exposedFinds().length]), [0, 0, 3], 'refused: no seal was spent');
  assert.match(await toast(page), /full tray|tray/i);
  // six loose: the seal goes through, and clears the chamber (setup: the bank is put one point under the target)
  await uncover(page, 3); sb = await sealBtn(page); assert.equal(sb.held, false); assert.match(sb.text, /Seal 1\/3/); assert.match(sb.text, /Tray 6\/6/);
  await page.evaluate(() => { state.bankedThisChamber = TARGETS[state.i] - 1; state.sealsHere = 1; ui(); });
  await seal(page);
  await page.waitForSelector('#overlay:not([hidden]) #card .chest', { timeout: 20000 }); await page.waitForTimeout(GUARD);
  // the chamber-cleared card: the seal slip, tapped once
  const slip = page.locator('#card [data-gg-ad="seal"]'); await slip.waitFor({ state: 'visible' }); await slip.tap();
  await page.waitForFunction(() => GG_NATIVE.ads.pending().seal === 1);
  assert.deepEqual(dev.admob.filter(m => /Reward|initialize/.test(m)), ['initialize', 'prepareRewardVideoAd', 'showRewardVideoAd']);
  await tapSel(page, page.locator('#card .chest').nth(1)); await page.waitForSelector('#card #go:not([hidden])', { timeout: 15000 }); await page.waitForTimeout(GUARD);
  await tapSel(page, '#card #go'); await page.waitForSelector('#overlay:not([hidden]) #bmSkip', { timeout: 8000 }); await page.waitForTimeout(GUARD); await tapSel(page, '#bmSkip');
  await page.waitForFunction(() => state && state.i === 1 && !state.over, null, { timeout: 8000 }); await wallUp(page);
  assert.equal(await page.evaluate(() => gear.id), 'knuckle', '"Just dig" packs the Brass Knuckle Pick');
  assert.deepEqual(await page.evaluate(() => [state.i, state.ft, state.xs | 0, skillBudget(), TARGETS[1]]), [1, 1, 1, 4, 1200], 'chamber 2 of the first tomb: still under the first-tomb rules, four seals, target 1,200');
  // the guard still holds with the bonus in hand
  await uncover(page, 4); sb = await sealBtn(page); assert.equal(sb.held, true); assert.match(sb.text, /Tray 4\/6/);
  await tapSel(page, '#seal'); await page.waitForTimeout(700); assert.equal(await page.evaluate(() => state.sealed | 0), 0, 'four finds: still refused');
  // and it lets go in the red (80% of the wall's crack), as the game says it does. Setup: the crack.
  await page.evaluate(() => { state.crack = Math.ceil(maxCrack() * SKILL.first.red); ui(); draw(); });
  sb = await sealBtn(page); assert.equal(sb.held, false, 'in the red the seal is let go'); assert.match(sb.text, /Seal 1\/4/);
  await page.evaluate(() => { TARGETS[state.i] = 9e6; }); // setup: keep the chamber open
  await seal(page);
  assert.deepEqual(await page.evaluate(() => [state.sealed, exposedFinds().length, run.lives]), [1, 0, 3], 'a tray of four was sealed in the red; no Memory spent');
  assert.deepEqual(dev.errors, []); await dev.ctx.close();
});

T('bare wall + the rewarded Memory: the first bare wall of a chamber is free (no slip at three Memories); the second costs a Memory through the collapse card, which carries the Memory slip; once per run; cap and count survive a relaunch', async () => {
  const dev = await device(); let page = await dev.launch(); await firstRun(page);
  await page.evaluate(() => { Store.set('rw_mercy', String(SKILL.mercy.free)); _mercy = null; }); // setup: the new profile's two free collapses are used up, so the bare-wall Memory is really charged
  const tid = await page.evaluate(() => run.tid);
  const look = () => page.evaluate(() => ({ lives: run.lives, bx: (run.bx || {})[state.i] | 0, slip: [...document.querySelectorAll('#card [data-gg-ad="memory"]')].filter(b => !b.hidden && getComputedStyle(b).display !== 'none').length, can: GG_NATIVE.ads.canOffer('memory') }));
  // 1. the first bare wall
  await bareByTap(page); await cardUp(page);
  assert.match(await cardText(page), /The wall was bare.*the first bare wall of a chamber costs nothing/);
  assert.deepEqual(await look(), { lives: 3, bx: 1, slip: 0, can: 'full' }, 'free: three Memories, so there is nothing to offer');
  await digOn(page);
  // 2. the second: a Memory, through the collapse card, with the slip
  await bareByTap(page); await cardUp(page);
  assert.match(await cardText(page), /The wall was bare.*a second bare wall costs a Memory/);
  assert.deepEqual(await look(), { lives: 2, bx: 2, slip: 1, can: '' });
  const slip = page.locator('#card [data-gg-ad="memory"]'); assert.ok((await slip.boundingBox()).height >= 44);
  await slip.tap(); await page.waitForFunction(() => run.lives === 3);
  assert.match(await page.locator('#card h2 small').textContent(), /3 Memories left/);
  assert.deepEqual(await look(), { lives: 3, bx: 2, slip: 0, can: 'run_cap' });
  assert.equal(JSON.parse(dev.prefs.get('gg_ad_caps_v1')).memory, 1);
  await digOn(page);
  // 3. the third: a Memory again, and no slip this time
  await bareByTap(page); await cardUp(page);
  assert.deepEqual(await look(), { lives: 2, bx: 3, slip: 0, can: 'run_cap' }, 'the slip is once per run, however many bare walls there are');
  // 4. the app is closed on that card and opened again
  const disk = await page.evaluate(() => { const z = JSON.parse(localStorage.getItem('rw_resume')); return [z.v, z.tid, z.run.lives, z.run.bx[z.i]]; });
  assert.deepEqual(disk, [2, tid, 2, 3], 'the version 2 record holds the run after the charge, and the bare-wall count');
  page = await dev.launch(); await resumeFromTitle(page);
  assert.deepEqual(await page.evaluate(() => [run.tid, run.lives, (run.bx || {})[state.i] | 0, GG_NATIVE.ads.canOffer('memory'), GG_NATIVE.ads.pending().memory]), [tid, 2, 3, 'run_cap', 1], 'same run, same Memories (the rewarded one neither lost nor doubled), same count, slip still used');
  assert.equal((await page.evaluate(() => GG_NATIVE.ads.offer('memory'))).reason, 'run_cap');
  // 5. and the next bare wall after the relaunch is charged, not free
  await page.evaluate(() => { Q.speed = 6; }); await bareByTap(page); await cardUp(page);
  assert.deepEqual(await look(), { lives: 1, bx: 4, slip: 0, can: 'run_cap' });
  assert.equal(dev.admob.filter(m => m === 'showRewardVideoAd').length, 1, 'one video in the whole session');
  assert.deepEqual(dev.errors, []); await dev.ctx.close();
});

T('telemetry through the shell: rc10 events carry build v1.0-rc10 and config_version 11 with the same shapes; a dig closed and resumed is not sent as a finished run', async () => {
  const dev = await device(); let page = await dev.launch(); await firstRun(page);
  const tid = await page.evaluate(() => run.tid);
  await uncover(page, 7); await page.evaluate(() => { TARGETS[state.i] = 9e6; }); await seal(page); // a tray of six from seven loose finds
  await page.evaluate(() => { Store.set('rw_mercy', String(SKILL.mercy.free)); _mercy = null; });
  await collapseByTap(page); await cardUp(page); await digOn(page);
  let evs = await dev.sent();
  assert.ok(evs.length > 5, 'events reached the analytics endpoint: ' + evs.length);
  for (const e of evs) { assert.equal(e.properties.build, 'v1.0-rc10', e.event); assert.equal(e.properties.config_version, 11, e.event + ' carries the game\'s telemetry config version'); assert.equal(e.properties.app_build, 'v1.0-rc10'); assert.equal(e.properties.remote_config_version, 50); }
  const KNOWN = ['run_start', 'run_end', 'run_resume', 'run_continue', 'chamber_start', 'chamber_end', 'seal', 'tutorial_step', 'settings_change', 'coach_shown', 'crt_auto_off', 'relic_found', 'gamble_resolve', 'fourth_seal_offer', 'fourth_seal_resolve',
    'market_open', 'market_buy', 'ore_use', 'share_card', 'shop_buy', 'audio_recover', 'error', 'ad_offered', 'ad_watched', 'ad_failed', 'ad_free_claim', 'consent_analytics', 'unlock_prompt_shown', 'unlock_result'];
  assert.deepEqual([...new Set(evs.map(e => e.event))].filter(n => !KNOWN.includes(n)), [], 'rc10 adds no event name the shell has not seen (it emits none for a crumble, a tray pick, a held seal or a bare wall)');
  const s = evs.find(e => e.event === 'seal' && e.properties.run_id === tid); assert.ok(s, 'the seal event');
  assert.equal(s.properties.finds, 6, 'a seal reports the tray, six finds, not the seven that lay loose'); assert.ok(s.properties.total > 0 && s.properties.total % 1 === 0 && typeof s.properties.fame === 'number' && typeof s.properties.worth === 'number' && s.properties.paid === false);
  const ce = evs.find(e => e.event === 'chamber_end' && e.properties.run_id === tid); assert.ok(ce, 'the collapse sent a chamber_end');
  // the app is closed mid-dig and opened again; the run resumes
  const before = evs.length;
  page = await dev.launch(); await resumeFromTitle(page); assert.equal(await page.evaluate(() => run.tid), tid);
  evs = await dev.sent(); const after = evs.slice(before).filter(e => e.properties.run_id === tid);
  assert.ok(after.some(e => e.event === 'run_resume'), 'run_resume was sent');
  assert.deepEqual(evs.filter(e => e.event === 'run_end' && e.properties.run_id === tid && !e.properties.provisional), [], 'no final run_end for a run that is still being played reaches the analytics queue');
  // Known game-side bug, reported in work/sprint17/LOG.md and not asserted here: the game's OWN play log (GG_TEL) now keeps a final
  // "interrupted" run_end for this resumed run, because its boot check still looks for saved-dig record version 1 (game line 10225).
  assert.deepEqual(dev.errors, []); await dev.ctx.close();
});
