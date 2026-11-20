// The rewarded slips, driven through the REAL game cards and the REAL wrapper (ads.js + native.js) with the Capacitor/AdMob bridge stubbed.
// The game is v1.0-rc10 and is played by its rules with real touchscreen taps (tests/play.mjs): a wall falls because a real strike
// took it past its limit, a chamber clears because a real tray of six was sealed, a bare wall is left by a real last strike.
// v1 keeps two slips (memory, seal). The game build in this repo draws only those two; rc8 also drew the retired ones (reroll,
// chestpick). The wrapper must never show or serve a retired slip if an older game build draws one, and nothing may throw.
// Each live slip must: be hidden without body.gg-ads, appear (>= 44 px) with it, grant its reward only through the wrapper, and report a failure.
// An Ad-free owner sees the same slips as free claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from './helpers.mjs';
import { buildWww } from '../scripts/build-www.mjs';
import { GUARD, tapSel, sendVisitorAway, packGear, forceGear, collapseByTap, bareByTap, clearChamberBySeal, cardUp, cardText, uncover, seal, sealBtn } from './play.mjs';

const OUT = path.join(ROOT, 'www/index.slips.html'), CFG_URL = 'https://cfg.test/config.json';
let browser = null, skip = false;
test.before(async () => {
  try { browser = await chromium.launch(); } catch (e) { if (process.env.GG_REQUIRE_BROWSER) throw e; skip = 'no Chromium available: ' + String(e.message).split('\n')[0]; }
  buildWww({ root: ROOT, out: OUT, env: { CONFIG_URL: 'cfg.test', ADMOB_TESTING: 'true' }, log: () => {} });
});
test.after(async () => { if (browser) await browser.close(); try { fs.unlinkSync(OUT); } catch {} });

const STUB = `(() => {
  const call = (op, a) => window.__kv(op, a), log = (n, a) => (window.__plug = window.__plug || []).push([n, a]);
  window.__adMode = 'ok';
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {
    Preferences: { get: a => call('p.get', a), set: a => call('p.set', a), remove: a => call('p.remove', a) },
    ICloudKV: { isAvailable: () => call('i.avail', {}), get: a => call('i.get', a), set: a => call('i.set', a), remove: a => call('i.remove', a), sync: async () => {} },
    Haptics: { impact: async () => {}, notification: async () => {} }, StatusBar: { hide: async () => {} }, App: { addListener: async () => ({ remove() {} }) },
    AdMob: new Proxy({}, { get: (_t, m) => async a => { // every method exists and is logged: an interstitial or tracking call would be seen
      if (m === 'addListener') return { remove() {} };
      log('admob.' + (m === 'initialize' ? 'init' : m === 'prepareRewardVideoAd' ? 'prepare' : m === 'showRewardVideoAd' ? 'show' : m), a || {});
      if (m === 'prepareRewardVideoAd' && window.__adMode === 'nofill') throw new Error('no fill');
      return m === 'showRewardVideoAd' ? (window.__adMode === 'early' ? {} : { type: 'coin', amount: 1 }) : {};
    } })
  } };
})();`;

// profile: 'seasoned' = has done the practice wall and cleared a tomb (no first-tomb rules, no free collapses left); 'first' = has done the practice wall only
async function open(flags = { ads: true }, { owner = false, profile = 'seasoned' } = {}) {
  const prefs = new Map(owner ? [['gg_ent_v1', JSON.stringify({ v: 1, ids: ['gg_adfree'], at: Date.now() })]] : []), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  await ctx.addInitScript(profile => { try { if (!localStorage.getItem('rw_rc10')) { localStorage.setItem('rw_rc10', '1'); localStorage.setItem('rw_train', '1'); localStorage.setItem('rw_mercy', '2');
    if (profile === 'seasoned') localStorage.setItem('rw_best', JSON.stringify({ runs: 3, wins: 1, best: 0, depth: 3 })); } } catch (e) {} }, profile);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route('https://us.i.posthog.com/**', r => r.fulfill({ status: 200, body: '{}' }));
  await ctx.route(CFG_URL, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ schema: 2, version: 21, flags, ads: { memoryPerRun: 1, sealBonus: 1, cooldownSec: 0 } }) }));
  await ctx.exposeBinding('__kv', (_s, op, a) => {
    switch (op) { case 'p.get': return { value: prefs.has(a.key) ? prefs.get(a.key) : null }; case 'p.set': prefs.set(a.key, a.value); return; case 'p.remove': prefs.delete(a.key); return; case 'i.avail': return { available: false }; default: return { value: null }; }
  });
  await ctx.addInitScript(STUB);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)\.com|cfg\.test/.test(m.location().url || '')) errors.push(`${m.text()} @${m.location().url}`); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + OUT);
  await page.waitForFunction(() => window.GG_NATIVE && window.GG_NATIVE.ready && GG_NATIVE.rcLoaded, null, { timeout: 25000 });
  return { ctx, page, errors, prefs };
}
// A real run, started the way a player starts one: title, Dig, the kit screen, Dig. Tomb I, Stake 1.
async function startRun(page, { gear: want = 'knuckle' } = {}) {
  await page.waitForTimeout(GUARD + 200);
  await tapSel(page, '#title button.tl-dig');
  await page.waitForSelector('#overlay:not([hidden]) #dig, #mDig', { timeout: 8000 }); await page.waitForTimeout(GUARD);
  if (await page.locator('#mDig:visible').count()) { await tapSel(page, '#mDig'); await page.waitForSelector('#overlay:not([hidden]) #dig'); await page.waitForTimeout(GUARD); }
  const how = await packGear(page, want);
  await tapSel(page, '#overlay:not([hidden]) #dig');
  await page.waitForFunction(() => typeof state !== 'undefined' && state && !state.train && !state.over && run && run.tid, null, { timeout: 8000 }); await sendVisitorAway(page);
  await page.waitForFunction(() => document.getElementById('overlay').hidden, null, { timeout: 8000 });
  if (how === 'setup') await forceGear(page, want);
  assert.equal(await page.evaluate(() => gear.id), want);
  await page.waitForTimeout(500);
  await page.evaluate(() => { Q.speed = 6; window.__plug = []; GG_TEL.length = 0; });
}
// card buttons, tapped: "Dig a different wall" after a fall; a chest, "Go deeper" and "Leave the stall" after a clear
const digOn = async page => { await tapSel(page, '#card #go'); await page.waitForFunction(() => state && !state.over, null, { timeout: 8000 }); await sendVisitorAway(page); await page.waitForFunction(() => document.getElementById('overlay').hidden, null, { timeout: 8000 }); await page.waitForTimeout(400); };
async function goDeeper(page) {
  await tapSel(page, page.locator('#card .chest').nth(1)); await page.waitForSelector('#card #go:not([hidden])', { timeout: 15000 }); await page.waitForTimeout(GUARD);
  const from = await page.evaluate(() => state.i); await tapSel(page, '#card #go');
  await page.waitForSelector('#overlay:not([hidden]) #bmSkip', { timeout: 8000 }); await page.waitForTimeout(GUARD); await tapSel(page, '#bmSkip');
  await page.waitForFunction(i => state && state.i === i + 1 && !state.over, from, { timeout: 8000 }); await sendVisitorAway(page);
  await page.waitForFunction(() => document.getElementById('overlay').hidden, null, { timeout: 8000 }); await page.waitForTimeout(400);
}
const chestCard = async page => { await page.waitForSelector('#overlay:not([hidden]) #card .chest', { timeout: 20000 }); await page.waitForTimeout(GUARD); };
const slip = (page, k) => page.locator(`#card [data-gg-ad="${k}"]`);
const T = (name, fn) => test(name, async t => { if (skip) return t.skip(skip); await fn(t); });

T('ads off (flag false): the game writes the slips but body lacks .gg-ads, so every one is display:none', async () => {
  const r = await open({ ads: false }); const page = r.page; await startRun(page);
  assert.equal(await page.evaluate(() => document.body.classList.contains('gg-ads')), false);
  await collapseByTap(page); await cardUp(page);
  const i = await page.evaluate(() => [...document.querySelectorAll('[data-gg-ad]')].map(b => getComputedStyle(b).display));
  assert.deepEqual(i, ['none'], 'the memory slip exists in the card and is hidden');
  assert.deepEqual(await page.evaluate(() => (window.__plug || []).map(p => p[0])), []);
  await digOn(page); await clearChamberBySeal(page); await chestCard(page);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-gg-ad]')].map(b => b.dataset.ggAd + ':' + getComputedStyle(b).display).sort()), ['seal:none'], 'the game draws one slip on the chamber-cleared card, and it is hidden');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('ads on: +1 Memory on the collapse card (44 px, label, reward only via the wrapper, once per run)', async () => {
  const r = await open(); const page = r.page; await startRun(page);
  await collapseByTap(page); await cardUp(page);
  assert.match(await cardText(page), /The wall collapsed/);
  const b = slip(page, 'memory'); await b.waitFor({ state: 'visible' });
  assert.ok((await b.boundingBox()).height >= 44); assert.match(await b.textContent(), /Watch a short video · \+1 Memory/); assert.equal(await b.getAttribute('aria-label'), 'Watch a short video to get one extra Memory');
  assert.equal(await page.evaluate(() => run.lives), 2);
  await b.tap(); await page.waitForFunction(() => run.lives === 3);
  assert.match(await page.locator('#card h2 small').textContent(), /3 Memories left/); assert.equal(await page.evaluate(() => document.getElementById('lives').textContent), '♥♥♥');
  assert.equal(await b.isHidden(), true, 'used: the slip is gone');
  const ev = await page.evaluate(() => GG_TEL.filter(e => /^ad_/.test(e.event)).map(e => e.event + ':' + e.reward));
  assert.deepEqual(ev, ['ad_offered:memory', 'ad_watched:memory']);
  // once per run: the next wall falls too, and its card has no slip to tap
  await digOn(page); await collapseByTap(page); await cardUp(page);
  assert.equal(await page.evaluate(() => run.lives), 2); assert.equal(await slip(page, 'memory').isVisible(), false, 'the second collapse card of the run shows no Memory slip');
  assert.equal(await page.evaluate(() => GG_NATIVE.ads.canOffer('memory')), 'run_cap');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('ads on: +1 free seal next chamber on the chamber-cleared card', async () => {
  const r = await open(); const page = r.page; await startRun(page);
  await clearChamberBySeal(page); await chestCard(page);
  const b = slip(page, 'seal'); await b.waitFor({ state: 'visible' }); assert.ok((await b.boundingBox()).height >= 44);
  assert.match(await b.textContent(), /Watch a short video · \+1 free seal next chamber/);
  await b.tap(); await page.waitForFunction(() => GG_NATIVE.ads.pending().seal === 1);
  assert.equal(await page.evaluate(() => state.xs | 0), 0, 'nothing changes in the chamber it was earned in');
  await goDeeper(page);
  assert.deepEqual(await page.evaluate(() => [state.i, state.xs, skillBudget(), SKILL.seals.free]), [1, 1, 4, 3], 'the next chamber starts with one extra free seal: four, not three');
  // the tray rule is untouched by it: a seal still takes six finds at most, and the fourth seal of the chamber costs no Memory
  await page.evaluate(() => { TARGETS[state.i] = 9e6; ui(); }); // setup: keep the chamber open for four seals
  const plain = await page.evaluate(() => state.finds.filter(f => !f.sarc && !f.relic && !f.banked).length); assert.ok(plain >= 10, 'the wall has enough plain finds for the test: ' + plain);
  for (let n = 1; n <= 4; n++) {
    await uncover(page, n === 1 ? 7 : 1); const sb = await sealBtn(page); // seven loose the first time: six go on the tray, one waits. After that, small trays.
    assert.deepEqual([sb.tray, sb.loose], n === 1 ? [6, 7] : n === 2 ? [2, 2] : [1, 1], 'a tray holds six at most: ' + JSON.stringify(sb)); assert.match(sb.text, new RegExp('Seal ' + n + '/4'), sb.text);
    const lives = await page.evaluate(() => run.lives); await seal(page);
    assert.deepEqual(await page.evaluate(() => [state.sealed, run.lives, exposedFinds().length]), [n, lives, n === 1 ? 1 : 0], `seal ${n}: the tray is banked, no Memory spent`);
  }
  assert.equal(await page.evaluate(() => skillPaid()), true, 'the fifth seal would be the paid one');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('ads on, Looter\'s Sack packed: the Sack seals twice a chamber and no more, so the +1 seal slip is not shown on the chamber-cleared card and a forced tap is refused with no video', async () => {
  const r = await open(); const page = r.page; await startRun(page, { gear: 'sack' });
  await clearChamberBySeal(page); await chestCard(page);
  assert.equal(await slip(page, 'seal').count(), 0, 'from v1.0-rc10a the game does not write the seal slip into the card for a Sack carrier');
  // the wrapper keeps its own guard as a backstop, for any game build that still draws the slip
  assert.equal(await page.evaluate(() => GG_NATIVE.ads.canOffer('seal')), 'not_applicable');
  assert.deepEqual(await page.evaluate(() => GG_NATIVE.ads.offer('seal')), { ok: false, reason: 'not_applicable' });
  assert.deepEqual(await page.evaluate(() => window.__plug.map(p => p[0])), [], 'no AdMob call');
  await goDeeper(page);
  assert.deepEqual(await page.evaluate(() => [state.xs | 0, skillBudget(), SKILL.seals.sack]), [0, 2, 2], 'the next chamber has the Sack\'s two seals');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('retired slips: this game build draws neither; if an older build\'s chestpick or reroll slip is on a card it stays hidden, a forced tap is refused, nothing throws', async () => {
  const r = await open(); const page = r.page; await startRun(page);
  await clearChamberBySeal(page); await chestCard(page);
  await tapSel(page, page.locator('#card .chest').nth(1));
  await page.waitForFunction(() => [...document.querySelectorAll('.chest')].every(c => c.disabled), null, { timeout: 8000 });
  await page.waitForSelector('#card #go:not([hidden])', { timeout: 15000 }); await page.waitForTimeout(GUARD);
  const kinds = () => page.evaluate(() => [...document.querySelectorAll('#card [data-gg-ad]')].map(b => b.dataset.ggAd).sort());
  assert.deepEqual(await kinds(), ['seal'], 'the chamber-cleared card has the seal slip and no chest re-pick slip');
  assert.equal(await slip(page, 'seal').isVisible(), true);
  // an older game build (rc8) wrote these two into its cards; put the same markup on this card
  await page.evaluate(() => { for (const k of ['chestpick', 'reroll']) document.querySelector('#card .body').insertAdjacentHTML('beforeend', '<button type="button" class="adslip" data-gg-ad="' + k + '"><span class="as-t"><i>Sponsor slip</i><b>Watch a short video · old</b></span></button>'); });
  assert.deepEqual(await page.evaluate(() => ['chestpick', 'reroll'].map(k => getComputedStyle(document.querySelector('#card [data-gg-ad="' + k + '"]')).display)), ['none', 'none']);
  assert.deepEqual(await page.evaluate(() => [GG_NATIVE.ads.canOffer('chestpick'), GG_NATIVE.ads.canOffer('reroll')]), ['unknown_kind', 'unknown_kind']);
  assert.deepEqual(await page.evaluate(() => Promise.all([GG_NATIVE.ads.offer('chestpick'), GG_NATIVE.ads.offer('reroll')])), [{ ok: false, reason: 'unknown_kind' }, { ok: false, reason: 'unknown_kind' }]);
  await tapSel(page, '#card #go'); await page.waitForSelector('#overlay:not([hidden]) #bmRe', { timeout: 8000 }); // "Go deeper" opens the Black Market
  assert.deepEqual(await kinds(), [], 'the Black Market card has no video slip');
  assert.equal(await page.locator('#bmRe').isVisible(), true, 'the Market and its own paid reroll are untouched');
  assert.deepEqual(await page.evaluate(() => window.__plug.map(p => p[0])), [], 'no AdMob call came out of any of it');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('Ad-free owner on the real cards: the same slips read "Claim", a tap grants the reward with no video and no AdMob, once per run', async () => {
  const r = await open({ ads: true }, { owner: true }); const page = r.page;
  await page.waitForFunction(() => GG_NATIVE.payments.ready && GG_NATIVE.ads.owner());
  await startRun(page);
  assert.deepEqual(await page.evaluate(() => [document.body.classList.contains('gg-ads'), document.body.classList.contains('gg-adfree')]), [true, true]);
  await collapseByTap(page); await cardUp(page);
  const b = slip(page, 'memory'); await b.waitFor({ state: 'visible' }); assert.ok((await b.boundingBox()).height >= 44);
  await page.waitForFunction(() => /^Claim/.test(document.querySelector('#card [data-gg-ad="memory"] .as-t b').textContent));
  assert.equal(await b.locator('.as-t b').textContent(), 'Claim · +1 Memory'); assert.equal(await b.locator('.as-t i').textContent(), 'Ad-free: no video');
  assert.equal(await b.getAttribute('aria-label'), 'Ad-free claim, no video: get one extra Memory');
  assert.ok(!/video ·|Watch/.test(await b.textContent()), 'an owner is never told to watch anything');
  assert.equal(await page.evaluate(() => run.lives), 2);
  await b.tap(); await page.waitForFunction(() => run.lives === 3);
  assert.equal(await b.isHidden(), true, 'used: the slip is gone');
  assert.deepEqual(await page.evaluate(() => GG_TEL.filter(e => /^ad_/.test(e.event)).map(e => e.event + ':' + e.reward)), ['ad_free_claim:memory']);
  // the seal slip on the chamber-cleared card
  await digOn(page); await clearChamberBySeal(page); await chestCard(page);
  const s = slip(page, 'seal'); await s.waitFor({ state: 'visible' });
  await page.waitForFunction(() => /^Claim/.test(document.querySelector('#card [data-gg-ad="seal"] .as-t b').textContent));
  await s.tap(); await page.waitForFunction(() => GG_NATIVE.ads.pending().seal === 1);
  await goDeeper(page);
  assert.deepEqual(await page.evaluate(() => [state.i, state.xs | 0, skillBudget()]), [1, 1, 4]);
  assert.deepEqual(await page.evaluate(() => window.__plug.map(p => p[0])), [], 'AdMob was never initialised, no video was prepared or shown');
  assert.equal(JSON.parse(r.prefs.get('gg_ad_caps_v1')).memory, 1, 'the claim counts against the same persisted cap');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('ads on: a failed video toasts, emits ad_failed with the reward, grants nothing and leaves the slip usable', async () => {
  const r = await open(); const page = r.page; await startRun(page);
  await collapseByTap(page); await cardUp(page); await page.evaluate(() => { window.__adMode = 'nofill'; });
  const b = slip(page, 'memory'); await b.tap(); await page.waitForFunction(() => GG_TEL.some(e => e.event === 'ad_failed'));
  assert.deepEqual(await page.evaluate(() => GG_TEL.filter(e => e.event === 'ad_failed').map(e => e.reward + ':' + e.reason)), ['memory:no_fill']);
  assert.equal(await page.evaluate(() => run.lives), 2); assert.equal(await b.isDisabled(), false);
  assert.match(await page.locator('#uitoast').textContent(), /No video is ready/);
  assert.deepEqual(r.errors, []); await r.ctx.close();
});
