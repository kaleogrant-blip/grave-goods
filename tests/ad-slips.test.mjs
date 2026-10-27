// The four rewarded-ad slips the game (v1.0-rc7a) draws, driven through the REAL wrapper (ads.js + native.js) with the Capacitor/AdMob bridge stubbed.
// Each offer must: be hidden without body.gg-ads, appear (>= 44 px) with it, grant its reward only through the wrapper, and report a failure.
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
    AdMob: { initialize: async () => log('admob.init', {}), trackingAuthorizationStatus: async () => ({ status: 'authorized' }), requestTrackingAuthorization: async () => ({}),
      prepareInterstitial: async () => {}, showInterstitial: async () => {},
      prepareRewardVideoAd: async a => { log('admob.prepare', a); if (window.__adMode === 'nofill') throw new Error('no fill'); },
      showRewardVideoAd: async () => (log('admob.show', {}), window.__adMode === 'early' ? {} : { type: 'coin', amount: 1 }), addListener: async () => ({ remove() {} }) }
  } };
})();`;

async function open(flags = { ads: true }) {
  const prefs = new Map(), ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
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
  return { ctx, page, errors };
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
  await clear(page); await page.evaluate(() => { newChamber(0); endChamber(true); }); await page.waitForSelector('#card .chest');
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-gg-ad]')].map(b => b.dataset.ggAd + ':' + getComputedStyle(b).display).sort()), ['chestpick:none', 'seal:none']);
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
  assert.equal(await slip(page, 'chestpick').isHidden(), true, 'the re-pick slip waits for a first chest');
  await b.click(); await page.waitForFunction(() => GG_NATIVE.ads.pending().seal === 1);
  assert.equal(await page.evaluate(() => { newChamber(1); return state.xs; }), 1, 'the next chamber starts with one extra seal');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('ads on: chest re-pick reopens exactly the two unchosen chests, once', async () => {
  const r = await open(); const page = r.page; await startRun(page);
  await page.evaluate(() => { run.lives = 2; endChamber(true); }); await page.waitForSelector('#card .chest');
  await page.waitForTimeout(900); // the game ignores taps for a moment after a card opens
  await page.locator('#card .chest').nth(1).click();
  const b = slip(page, 'chestpick'); await b.waitFor({ state: 'visible', timeout: 8000 });
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.chest')].map(c => c.disabled)), [true, true, true]);
  await b.click(); await page.waitForFunction(() => document.querySelectorAll('.chest.adre').length === 2);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('.chest')].map(c => c.disabled)), [false, true, false]);
  await page.locator('#card .chest').nth(2).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.chest')].every(c => c.disabled));
  assert.match(await page.locator('#reveal').textContent(), /You also opened/); assert.equal(await b.isHidden(), true);
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('ads on: Black Market reroll beside the paid one, free, price unchanged', async () => {
  const r = await open(); const page = r.page; await startRun(page);
  await page.evaluate(() => { run.lives = 2; run.gold = 200; ecoMarket(0, () => { document.getElementById('overlay').hidden = true; }); }); await page.waitForSelector('#bmRe');
  const b = slip(page, 'reroll'); await b.waitFor({ state: 'visible' }); assert.ok((await b.boundingBox()).height >= 44);
  const before = await page.evaluate(() => ({ purse: ecoPurse(), re: document.getElementById('bmRe').textContent, say: document.getElementById('bmSay').textContent }));
  await b.click(); await page.waitForFunction(s => document.getElementById('bmSay').textContent !== s, before.say);
  assert.deepEqual(await page.evaluate(() => ({ purse: ecoPurse(), re: document.getElementById('bmRe').textContent })), { purse: before.purse, re: before.re });
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
