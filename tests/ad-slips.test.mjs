// The rewarded slips, driven through the REAL game cards and the REAL wrapper (ads.js + native.js) with the Capacitor/AdMob bridge stubbed.
// v1 keeps two slips (memory, seal). The game build in this repo (rc9a) draws only those two; rc8 also drew the retired ones (reroll,
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

async function open(flags = { ads: true }, { owner = false } = {}) {
  const prefs = new Map(owner ? [['gg_ent_v1', JSON.stringify({ v: 1, ids: ['gg_adfree'], at: Date.now() })]] : []), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route('https://us.i.posthog.com/**', r => r.fulfill({ status: 200, body: '{}' }));
  await ctx.route(CFG_URL, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify({ schema: 1, version: 21, flags, ads: { memoryPerRun: 1, sealBonus: 1, cooldownSec: 0 } }) }));
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
async function startRun(page) {
  await page.waitForTimeout(500);
  await page.locator('#title button, #overlay:not([hidden]) button').filter({ hasText: /^Dig/ }).first().click();
  await page.locator('#overlay:not([hidden]) #just').click({ timeout: 5000 });
  await page.waitForFunction(() => typeof state !== 'undefined' && state && document.getElementById('overlay').hidden, null, { timeout: 5000 });
  await page.evaluate(() => { Q.speed = 12; run.train = false; state.train = false; run.tid = 'slips-' + Math.random(); window.__plug = []; GG_TEL.length = 0; });
}
const clear = page => page.evaluate(() => { document.getElementById('overlay').hidden = true; document.getElementById('card').innerHTML = ''; });
const slip = (page, k) => page.locator(`#card [data-gg-ad="${k}"]`);
const T = (name, fn) => test(name, async t => { if (skip) return t.skip(skip); await fn(t); });

T('ads off (flag false): the game writes the slips but body lacks .gg-ads, so every one is display:none', async () => {
  const r = await open({ ads: false }); const page = r.page; await startRun(page);
  assert.equal(await page.evaluate(() => document.body.classList.contains('gg-ads')), false);
  await page.evaluate(() => { _mercy = 99; run.lives = 3; collapse(); }); await page.waitForSelector('#card #go');
  const i = await page.evaluate(() => [...document.querySelectorAll('[data-gg-ad]')].map(b => getComputedStyle(b).display));
  assert.deepEqual(i, ['none'], 'the memory slip exists in the card and is hidden');
  assert.deepEqual(await page.evaluate(() => (window.__plug || []).map(p => p[0])), []);
  await clear(page); await page.evaluate(() => { newChamber(0); endChamber(true); }); await page.waitForSelector('#card .chest');
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-gg-ad]')].map(b => b.dataset.ggAd + ':' + getComputedStyle(b).display).sort()), ['seal:none'], 'rc9a draws one slip on the chamber-cleared card, and it is hidden');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('ads on: +1 Memory on the collapse card (44 px, label, reward only via the wrapper, once per run)', async () => {
  const r = await open(); const page = r.page; await startRun(page);
  await page.evaluate(() => { _mercy = 99; run.lives = 3; collapse(); }); await page.waitForSelector('#card #go');
  const b = slip(page, 'memory'); await b.waitFor({ state: 'visible' });
  assert.ok((await b.boundingBox()).height >= 44); assert.match(await b.textContent(), /Watch a short video · \+1 Memory/); assert.equal(await b.getAttribute('aria-label'), 'Watch a short video to get one extra Memory');
  assert.equal(await page.evaluate(() => run.lives), 2);
  await b.click(); await page.waitForFunction(() => run.lives === 3);
  assert.match(await page.locator('#card h2 small').textContent(), /3 Memories left/); assert.equal(await page.evaluate(() => document.getElementById('lives').textContent), '♥♥♥');
  assert.equal(await b.isHidden(), true, 'used: the slip is gone');
  const ev = await page.evaluate(() => GG_TEL.filter(e => /^ad_/.test(e.event)).map(e => e.event + ':' + e.reward));
  assert.deepEqual(ev, ['ad_offered:memory', 'ad_watched:memory']);
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('ads on: +1 free seal next chamber on the chamber-cleared card', async () => {
  const r = await open(); const page = r.page; await startRun(page);
  await page.evaluate(() => { run.lives = 2; endChamber(true); }); await page.waitForSelector('#card .chest');
  const b = slip(page, 'seal'); await b.waitFor({ state: 'visible' }); assert.ok((await b.boundingBox()).height >= 44);
  await b.click(); await page.waitForFunction(() => GG_NATIVE.ads.pending().seal === 1);
  assert.equal(await page.evaluate(() => { newChamber(1); return state.xs; }), 1, 'the next chamber starts with one extra seal');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('retired slips: this game build (rc9a) draws neither; if an older build\'s chestpick or reroll slip is on a card it stays hidden, a forced tap is refused, nothing throws', async () => {
  const r = await open(); const page = r.page; await startRun(page);
  await page.evaluate(() => { run.lives = 2; endChamber(true); }); await page.waitForSelector('#card .chest');
  await page.waitForTimeout(900); // the game ignores taps for a moment after a card opens
  await page.locator('#card .chest').nth(1).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.chest')].every(c => c.disabled), null, { timeout: 8000 });
  await page.waitForTimeout(800);
  const kinds = () => page.evaluate(() => [...document.querySelectorAll('#card [data-gg-ad]')].map(b => b.dataset.ggAd).sort());
  assert.deepEqual(await kinds(), ['seal'], 'the chamber-cleared card has the seal slip and no chest re-pick slip');
  assert.equal(await slip(page, 'seal').isVisible(), true);
  // an older game build (rc8) wrote these two into its cards; put the same markup on this card
  await page.evaluate(() => { for (const k of ['chestpick', 'reroll']) document.querySelector('#card .body').insertAdjacentHTML('beforeend', '<button type="button" class="adslip" data-gg-ad="' + k + '"><span class="as-t"><i>Sponsor slip</i><b>Watch a short video · old</b></span></button>'); });
  assert.deepEqual(await page.evaluate(() => ['chestpick', 'reroll'].map(k => getComputedStyle(document.querySelector('#card [data-gg-ad="' + k + '"]')).display)), ['none', 'none']);
  assert.deepEqual(await page.evaluate(() => [GG_NATIVE.ads.canOffer('chestpick'), GG_NATIVE.ads.canOffer('reroll')]), ['unknown_kind', 'unknown_kind']);
  assert.deepEqual(await page.evaluate(() => Promise.all([GG_NATIVE.ads.offer('chestpick'), GG_NATIVE.ads.offer('reroll')])), [{ ok: false, reason: 'unknown_kind' }, { ok: false, reason: 'unknown_kind' }]);
  await page.evaluate(() => { run.gold = 200; ecoMarket(0, () => { document.getElementById('overlay').hidden = true; }); }); await page.waitForSelector('#bmRe');
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
  await page.evaluate(() => { _mercy = 99; run.lives = 3; collapse(); }); await page.waitForSelector('#card #go');
  const b = slip(page, 'memory'); await b.waitFor({ state: 'visible' }); assert.ok((await b.boundingBox()).height >= 44);
  await page.waitForFunction(() => /^Claim/.test(document.querySelector('#card [data-gg-ad="memory"] .as-t b').textContent));
  assert.equal(await b.locator('.as-t b').textContent(), 'Claim · +1 Memory'); assert.equal(await b.locator('.as-t i').textContent(), 'Ad-free: no video');
  assert.equal(await b.getAttribute('aria-label'), 'Ad-free claim, no video: get one extra Memory');
  assert.ok(!/video ·|Watch/.test(await b.textContent()), 'an owner is never told to watch anything');
  assert.equal(await page.evaluate(() => run.lives), 2);
  await b.click(); await page.waitForFunction(() => run.lives === 3);
  assert.equal(await b.isHidden(), true, 'used: the slip is gone');
  assert.deepEqual(await page.evaluate(() => GG_TEL.filter(e => /^ad_/.test(e.event)).map(e => e.event + ':' + e.reward)), ['ad_free_claim:memory']);
  // the seal slip on the chamber-cleared card
  await clear(page); await page.evaluate(() => { newChamber(0); endChamber(true); }); await page.waitForSelector('#card .chest');
  const s = slip(page, 'seal'); await s.waitFor({ state: 'visible' });
  await page.waitForFunction(() => /^Claim/.test(document.querySelector('#card [data-gg-ad="seal"] .as-t b').textContent));
  await s.click(); await page.waitForFunction(() => GG_NATIVE.ads.pending().seal === 1);
  assert.equal(await page.evaluate(() => { newChamber(1); return state.xs; }), 1);
  assert.deepEqual(await page.evaluate(() => window.__plug.map(p => p[0])), [], 'AdMob was never initialised, no video was prepared or shown');
  assert.equal(JSON.parse(r.prefs.get('gg_ad_caps_v1')).memory, 1, 'the claim counts against the same persisted cap');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('ads on: a failed video toasts, emits ad_failed with the reward, grants nothing and leaves the slip usable', async () => {
  const r = await open(); const page = r.page; await startRun(page);
  await page.evaluate(() => { _mercy = 99; run.lives = 3; collapse(); window.__adMode = 'nofill'; }); await page.waitForSelector('#card #go');
  const b = slip(page, 'memory'); await b.click(); await page.waitForFunction(() => GG_TEL.some(e => e.event === 'ad_failed'));
  assert.deepEqual(await page.evaluate(() => GG_TEL.filter(e => e.event === 'ad_failed').map(e => e.reward + ':' + e.reason)), ['memory:no_fill']);
  assert.equal(await page.evaluate(() => run.lives), 2); assert.equal(await b.isDisabled(), false);
  assert.match(await page.locator('#uitoast').textContent(), /No video is ready/);
  assert.deepEqual(r.errors, []); await r.ctx.close();
});
