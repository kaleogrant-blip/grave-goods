// Playwright smoke test of the built www/index.html with the Capacitor bridge stubbed.
// Needs a Chromium that matches playwright (PLAYWRIGHT_BROWSERS_PATH). Without one the tests are skipped, unless GG_REQUIRE_BROWSER=1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from './helpers.mjs';
import { buildWww } from '../scripts/build-www.mjs';
import { configFromGame } from '../scripts/extract-config.mjs';

const PLAIN = path.join(ROOT, 'www/index.html');
const WIRED = path.join(ROOT, 'www/index.smoke.html'); // built with a PostHog key + config URL, for the telemetry and remote-config tests
const POSTHOG = 'https://us.i.posthog.com/batch/', CFG_URL = 'https://cfg.test/config.json';

let browser = null, skip = false;
test.before(async () => {
  try { browser = await chromium.launch(); } catch (e) {
    if (process.env.GG_REQUIRE_BROWSER) throw e;
    skip = 'no Chromium available: ' + String(e.message).split('\n')[0];
  }
  buildWww({ root: ROOT, out: PLAIN, env: {}, log: () => {} });
  buildWww({ root: ROOT, out: WIRED, env: { POSTHOG_KEY: 'phc_smoke', CONFIG_URL: 'cfg.test', ADMOB_TESTING: 'true' }, log: () => {} });
});
test.after(async () => { if (browser) await browser.close(); try { fs.unlinkSync(WIRED); } catch {} });

// ---- bridge stub: Capacitor + plugins, with Preferences and iCloud state living in Node so it survives across pages/contexts.
const STUB = `(() => {
  const call = (op, a) => window.__kv(op, a);
  const log = (n, a) => (window.__plug = window.__plug || []).push([n, a]);
  const listeners = {};
  const store = {
    canMakePayments: async () => ({ allowed: true }), products: a => call('s.products', a), purchase: a => call('s.purchase', a), restore: () => call('s.restore', {}), entitlements: () => call('s.ents', {}),
    addListener: async (n, cb) => { (window.__storeL = window.__storeL || {})[n] = cb; return { remove() {} }; }
  };
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => window.__PLATFORM || 'ios', Plugins: {
    [window.__PLATFORM === 'android' ? 'PlayBilling' : 'StoreKit']: store,
    Preferences: { get: a => call('p.get', a), set: a => call('p.set', a), remove: a => call('p.remove', a) },
    ICloudKV: { isAvailable: () => call('i.avail', {}), get: a => call('i.get', a), set: a => call('i.set', a), remove: a => call('i.remove', a), sync: async () => {} },
    Haptics: { impact: async a => log('impact', a), notification: async a => log('notification', a) },
    StatusBar: { hide: async () => log('statusbar.hide', {}) },
    App: { addListener: async (n, cb) => { listeners[n] = cb; log('app.listen', n); return { remove() {} }; } },
    AdMob: { initialize: async () => log('admob.init', {}), trackingAuthorizationStatus: async () => ({ status: 'notDetermined' }), requestTrackingAuthorization: async () => (log('att', {}), { status: 'authorized' }),
      prepareInterstitial: async a => log('admob.prepareInterstitial', a), showInterstitial: async () => log('admob.showInterstitial', {}),
      prepareRewardVideoAd: async a => log('admob.prepare', a), showRewardVideoAd: async () => ({ type: 'coin', amount: 1 }), addListener: async () => ({ remove() {} }) }
  } };
  window.__fireApp = (n, p) => listeners[n] && listeners[n](p);
})();`;

function newKV() {
  const prefs = new Map(), icloud = new Map(), store = { owned: new Set(), price: '2,99 €', next: 'success', calls: [] };
  return { prefs, icloud, store, fn: (_src, op, a) => {
    if (op[0] === 's') store.calls.push(op);
    switch (op) {
      case 's.products': return { products: [{ id: 'gg_adfree', displayName: 'Ad-free', description: 'x', displayPrice: store.price, price: '2.99', currencyCode: 'EUR', type: 'nonConsumable', isFamilyShareable: false }], invalid: [] };
      case 's.purchase': if (store.next === 'cancel') return { status: 'cancelled', productId: a.id }; store.owned.add(a.id); return { status: 'success', productId: a.id };
      case 's.restore': case 's.ents': return { productIds: [...store.owned] };
      case 'p.get': return { value: prefs.has(a.key) ? prefs.get(a.key) : null };
      case 'p.set': prefs.set(a.key, a.value); return;
      case 'p.remove': prefs.delete(a.key); return;
      case 'i.avail': return { available: true };
      case 'i.get': return { value: icloud.has(a.key) ? icloud.get(a.key) : null };
      case 'i.set': icloud.set(a.key, a.value); return;
      case 'i.remove': icloud.delete(a.key); return;
    }
  } };
}

async function open({ file = PLAIN, viewport = { width: 390, height: 844 }, kv = newKV(), stub = true, routes = {}, ctx: existing, platform = 'ios' } = {}) {
  const ctx = existing || await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [], posts = [];
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.route(POSTHOG, async r => { posts.push(JSON.parse(r.request().postData())); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' }); });
  await ctx.route(CFG_URL, r => routes.config ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(routes.config), headers: { 'access-control-allow-origin': '*' } }) : r.abort());
  if (stub) { await ctx.exposeBinding('__kv', kv.fn); await ctx.addInitScript(`window.__PLATFORM = ${JSON.stringify(platform)};`); await ctx.addInitScript(STUB); }
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)\.com|cfg\.test/.test(m.location().url || '')) errors.push(`${m.text()} @${m.location().url}`); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + file);
  await page.waitForFunction(() => window.GG_NATIVE && window.GG_NATIVE.ready, null, { timeout: 25000 });
  return { ctx, page, errors, posts, kv };
}
const T = (name, fn) => test(name, async t => { if (skip) return t.skip(skip); await fn(t); });

for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
  T(`boots at ${vp.width}x${vp.height} with the bridge stubbed: zero console errors (blocked font fetch aside), no horizontal scroll`, async () => {
    const r = await open({ viewport: vp });
    await r.page.waitForTimeout(1200);
    const info = await r.page.evaluate(() => ({ native: GG_NATIVE.native, platform: GG_NATIVE.platform, backend: GG_NATIVE.backend, shim: !!(window.claude && window.claude.__native),
      sw: document.documentElement.scrollWidth, iw: innerWidth, canvas: !!document.getElementById('c'), dig: [...document.querySelectorAll('button')].some(b => /^Dig/.test(b.textContent.trim())),
      wrapped: GG_NATIVE.wrapped, storeMode: Store.status().mode }));
    assert.deepEqual(r.errors, []);
    assert.equal(info.native, true); assert.equal(info.platform, 'ios'); assert.equal(info.backend, 'native'); assert.ok(info.shim);
    assert.ok(info.canvas && info.dig, 'title screen with the Dig button rendered');
    assert.ok(info.sw <= info.iw, `scrollWidth ${info.sw} <= ${info.iw}`);
    assert.deepEqual(Object.values(info.wrapped), [true, true, true, true, true], 'every hook found its game function: ' + JSON.stringify(info.wrapped));
    assert.ok(['cloud', 'connecting'].includes(info.storeMode), 'the game Store connected to the native backend, got ' + info.storeMode);
    await r.ctx.close();
  });
}

T('plain browser (no Capacitor): boots, localStorage-only, no errors', async () => {
  const r = await open({ stub: false });
  const i = await r.page.evaluate(() => ({ n: GG_NATIVE.native, be: GG_NATIVE.backend, claude: typeof window.claude, mode: Store.status().mode }));
  assert.deepEqual(i, { n: false, be: 'local', claude: 'undefined', mode: 'local' }); assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('artifact backend is kept when window.claude exists and there is no Capacitor', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.claude = { use: async () => null }; });
  const r = await open({ stub: false, ctx });
  assert.equal(await r.page.evaluate(() => GG_NATIVE.backend), 'artifact'); assert.equal(await r.page.evaluate(() => window.claude.__native), undefined); assert.deepEqual(r.errors, []); await ctx.close();
});

T('save: progress goes to Preferences and iCloud, and a fresh install restores it from iCloud', async () => {
  const kv = newKV();
  const a = await open({ kv });
  await a.page.waitForFunction(() => Store.status().mode === 'cloud', null, { timeout: 25000 }); // the game treats writes made before its first reconcile as a fresh device
  await a.page.evaluate(() => { Store.set('rw_gold', '7777'); Store.set('rw_tel', '[]'); });
  for (let i = 0; i < 100 && !(kv.prefs.has('gg_save_v1') && kv.prefs.get('gg_save_v1').includes('7777') && kv.icloud.has('gg_save_v1_meta')); i++) await new Promise(r => setTimeout(r, 200)); // debounce is 1 s; a loaded machine takes longer
  assert.ok(kv.prefs.has('gg_save_v1'), 'Preferences mirror written');
  const mirror = JSON.parse(kv.prefs.get('gg_save_v1'));
  assert.equal(mirror.keys.rw_gold, '7777'); assert.ok(!('rw_tel' in mirror.keys), 'telemetry buffer is not synced');
  assert.ok(kv.icloud.has('gg_save_v1_meta'), 'iCloud written');
  assert.deepEqual(a.errors, []); await a.ctx.close();
  // new phone: empty localStorage and empty Preferences, same Apple ID (iCloud)
  kv.prefs.delete('gg_save_v1');
  const b = await open({ kv });
  await b.page.waitForFunction(() => Store.get('rw_gold') === '7777', null, { timeout: 25000 });
  assert.equal(await b.page.evaluate(() => Store.status().mode), 'cloud');
  assert.deepEqual(b.errors, []); await b.ctx.close();
});

T('save migration: an existing localStorage profile is imported on first native launch', async () => {
  const kv = newKV();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('seeded')) { localStorage.setItem('seeded', '1'); localStorage.setItem('rw_gold', '321'); localStorage.setItem('rw_ua', '5000'); } });
  const r = await open({ kv, ctx });
  await r.page.waitForFunction(() => Store.status().mode === 'cloud', null, { timeout: 25000 });
  assert.equal(JSON.parse(kv.prefs.get('gg_save_v1')).keys.rw_gold, '321'); assert.ok(kv.icloud.has('gg_save_v1_meta'));
  assert.equal(await r.page.evaluate(() => Store.get('rw_gold')), '321', 'and the local value is untouched');
  assert.deepEqual(r.errors, []); await ctx.close();
});

T('haptics: wrapped game hooks fire Capacitor Haptics, respect the Settings switch', async () => {
  const r = await open();
  const plug = () => r.page.evaluate(() => window.__plug.filter(p => /impact|notification/.test(p[0])).map(p => p[0] + ':' + (p[1].style || p[1].type)));
  await r.page.evaluate(() => { window.hap([120, 40, 120]); });
  assert.deepEqual(await plug(), ['impact:MEDIUM']);
  await r.page.waitForTimeout(60);
  await r.page.evaluate(() => { window.hap([20]); });
  assert.deepEqual((await plug()).slice(-1), ['impact:LIGHT']);
  await r.page.waitForTimeout(60);
  await r.page.evaluate(() => { window.luckJackpot = window.luckJackpot; }); // wrapper exists; calling the real wheel needs a run, covered by the wrap flags above
  await r.page.evaluate(() => { SETTINGS.haptics = false; window.hap([300]); });
  assert.equal((await plug()).length, 2, 'haptics off in Settings: nothing fires');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('lifecycle: StatusBar hidden at boot; backgrounding calls the game pause; Preferences carries the install id', async () => {
  const r = await open();
  assert.ok(await r.page.evaluate(() => window.__plug.some(p => p[0] === 'statusbar.hide')));
  assert.ok(await r.page.evaluate(() => window.__plug.some(p => p[0] === 'app.listen' && p[1] === 'appStateChange')));
  await r.page.evaluate(() => { window.__paused = 0; window.pauseOpen = () => { window.__paused++; }; window.__fireApp('appStateChange', { isActive: false }); });
  assert.equal(await r.page.evaluate(() => window.__paused), 1);
  await r.page.evaluate(() => window.__fireApp('appStateChange', { isActive: true }));
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('config drift: config/config.json equals the values the game ships', async () => {
  const r = await open();
  const game = await r.page.evaluate(() => ({ SKILL: JSON.parse(JSON.stringify(SKILL)), LUCK: JSON.parse(JSON.stringify(LUCK)), ECON: JSON.parse(JSON.stringify(ECON)) }));
  const shipped = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/config.json'), 'utf8'));
  assert.deepEqual(configFromGame(game, shipped.version), { ...shipped, note: configFromGame(game, 1).note }, 'run: node scripts/extract-config.mjs  (and bump version when you publish it)');
  await r.ctx.close();
});

T('remote config: fetched, applied to the live game objects, version stamped on telemetry; PostHog gets the batch', async () => {
  const cfg = { schema: 1, version: 9, econ: { gold: { chest: 21 } }, skill: { targets: [310, 910, 4510] }, flags: { ads: false } };
  const r = await open({ file: WIRED, routes: { config: cfg } });
  await r.page.waitForFunction(() => GG_NATIVE.rcLoaded, null, { timeout: 20000 });
  const live = await r.page.evaluate(() => ({ chest: ECON.gold.chest, t: SKILL.targets.slice(), BASE: TARGETS_BASE.slice(), v: GG_NATIVE.remoteConfig.state.version }));
  assert.deepEqual(live, { chest: 21, t: [310, 910, 4510], BASE: [310, 910, 4510], v: 9 });
  await r.page.evaluate(() => { telEmit('tutorial_step', { step: 'smoke' }); });
  await r.page.waitForTimeout(100);
  await r.page.evaluate(() => GG_NATIVE.telemetry.flush(true));
  await r.page.waitForTimeout(300);
  const evs = r.posts.flatMap(p => p.batch), e = evs.find(x => x.event === 'tutorial_step');
  assert.ok(e, 'tutorial_step reached PostHog'); assert.equal(r.posts[0].api_key, 'phc_smoke');
  assert.equal(e.properties.remote_config_version, 9); assert.equal(e.properties.step, 'smoke'); assert.equal(e.properties.app_build, /const GAME_VERSION='([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'game/current.html'), 'utf8'))[1]); assert.equal(e.properties.native, true);
  assert.ok(await r.page.evaluate(() => GG_TEL.length > 0), 'the game still keeps its own buffer');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('remote config: an invalid document changes nothing', async () => {
  const r = await open({ file: WIRED, routes: { config: { schema: 1, version: 10, econ: { gold: { chest: 500 } }, hax: true } } });
  await r.page.waitForTimeout(800);
  assert.deepEqual(await r.page.evaluate(() => ({ chest: ECON.gold.chest, v: GG_NATIVE.remoteConfig.state.version, rej: !!GG_NATIVE.remoteConfig.state.rejected })), { chest: 15, v: 0, rej: true });
  await r.ctx.close();
});

T('remote config unreachable: the shipped values stand and the game runs', async () => {
  const r = await open({ file: WIRED });
  await r.page.waitForTimeout(2600);
  assert.equal(await r.page.evaluate(() => ECON.gold.chest), 15); assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('telemetry opt-out in the game Settings stops uploads', async () => {
  const r = await open({ file: WIRED, routes: { config: { schema: 1, version: 2 } } });
  await r.page.evaluate(() => { telEmit('settings_change', { key: 'play_log', value: false }); localStorage.setItem('rw_tel_off', '1'); });
  await r.page.waitForTimeout(100);
  await r.page.evaluate(() => { telEmit('tutorial_step', { step: 'after_opt_out' }); return GG_NATIVE.telemetry.flush(true); });
  await r.page.waitForTimeout(300);
  assert.equal(r.posts.flatMap(p => p.batch).length, 0, 'nothing was posted');
  assert.equal(r.kv.prefs.get('gg_tel_off'), '1'); await r.ctx.close();
});

T('ads are off by default: no .gg-ads, [data-gg-ad] buttons are hidden, AdMob and ATT untouched', async () => {
  const r = await open({ file: WIRED, routes: { config: { schema: 1, version: 3, flags: { ads: false } } } });
  await r.page.waitForFunction(() => GG_NATIVE.rcLoaded);
  const res = await r.page.evaluate(() => {
    const b = document.createElement('button'); b.setAttribute('data-gg-ad', 'memory'); b.textContent = 'Watch'; document.body.appendChild(b);
    return { cls: document.body.classList.contains('gg-ads'), disp: getComputedStyle(b).display, enabled: GG_NATIVE.ads.enabled(), plug: window.__plug.map(p => p[0]).filter(n => /admob|att/.test(n)) };
  });
  assert.deepEqual(res, { cls: false, disp: 'none', enabled: false, plug: [] }); await r.ctx.close();
});

T('ads on via remote flag: buttons appear, a tap grants +1 Memory (max once per run), ATT waits for the first clear', async () => {
  const r = await open({ file: WIRED, routes: { config: { schema: 1, version: 4, flags: { ads: true }, ads: { memoryPerRun: 1, sealBonus: 1, cooldownSec: 0 } } } });
  await r.page.waitForFunction(() => GG_NATIVE.rcLoaded && GG_NATIVE.ads.enabled());
  const out = await r.page.evaluate(async () => {
    const b = document.createElement('button'); b.setAttribute('data-gg-ad', 'memory'); document.body.appendChild(b);
    const shown = getComputedStyle(b).display !== 'none' && document.body.classList.contains('gg-ads');
    run.lives = 1; run.tid = 'smoke-run';
    const a = await GG_NATIVE.ads.offer('memory'), c = await GG_NATIVE.ads.offer('memory');
    return { shown, a, c, lives: run.lives, att: window.__plug.filter(p => p[0] === 'att').length };
  });
  assert.equal(out.shown, true); assert.equal(out.a.ok, true); assert.equal(out.c.reason, 'run_cap'); assert.equal(out.lives, 2); assert.equal(out.att, 0, 'no ATT prompt before a tomb clear');
  await r.page.evaluate(() => telEmit('run_end', { outcome: 'won' }));
  await r.page.waitForFunction(() => window.__plug.some(p => p[0] === 'att'));
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('real run: Dig -> Just dig -> a real Seal fires the medium impact; a real collapse fires error + heavy; no console errors', async () => {
  const r = await open(); const page = r.page;
  await page.waitForTimeout(600);
  await page.locator('#title button, #overlay:not([hidden]) button').filter({ hasText: /^Dig/ }).first().click();
  await page.locator('#overlay:not([hidden]) #just').click({ timeout: 5000 });
  await page.waitForFunction(() => typeof state !== 'undefined' && state && document.getElementById('overlay').hidden, null, { timeout: 5000 });
  await page.evaluate(() => { for (let y = 0; y < 14 && !exposedFinds().length; y++) for (let x = 0; x < 9 && !exposedFinds().length; x++) strike(x, y); window.__plug = []; });
  assert.ok(await page.evaluate(() => exposedFinds().length > 0), 'dug up something');
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__plug = []; });
  await page.locator('#seal').click({ force: true }); await page.waitForTimeout(500);
  assert.ok(await page.evaluate(() => state.sealed >= 1), 'the seal landed');
  const h = () => page.evaluate(() => window.__plug.filter(p => /impact|notification/.test(p[0])).map(p => p[0] + ':' + (p[1].style || p[1].type)));
  assert.deepEqual(await h(), ['impact:MEDIUM']);
  await page.evaluate(() => { window.__plug = []; collapse(); }); await page.waitForTimeout(500);
  assert.deepEqual(await h(), ['notification:ERROR', 'impact:HEAVY']);
  assert.deepEqual(r.errors, []); await r.ctx.close();
});


// ================= v1 monetization: ads ON, one interstitial, ONE purchase (gg_adfree), no content gate =================
const DEVHTML = path.join(ROOT, 'www/index.dev.html');
const plug = (page, re) => page.evaluate(src => window.__plug.filter(p => new RegExp(src).test(p[0])), re.source);
const openSettings = async page => { await page.evaluate(() => window.showSettings(window.showMenu)); await page.waitForSelector('.pg-set', { timeout: 5000 }); };
const waitStore = page => page.waitForFunction(() => GG_NATIVE.payments && GG_NATIVE.payments.ready && GG_NATIVE.payments.productsLoaded, null, { timeout: 15000 });

T('ads are ON by default in the shipped build (test ids), and nothing in the game is content-gated', async () => {
  const r = await open();
  const i = await r.page.evaluate(() => ({ en: GG_NATIVE.ads.enabled(), cls: document.body.classList.contains('gg-ads'), ids: GG_NATIVE.ads.unitIds(), inter: GG_NATIVE.ads.interstitialOn(), flags: GG_NATIVE.flags,
    gate: ['fullOk', 'showUnlock', 'PAID_CLS', 'dropItems', 'ecoDropBuy'].filter(n => typeof window[n] !== 'undefined'), tomb3: typeof tombOpen === 'function' ? (() => { PROG.tombs.c['2.1'] = 1; return tombOpen(3); })() : null, mystic: CLASSES.mystic ? classOk('mystic') : 'n/a' }));
  assert.equal(i.en, true); assert.equal(i.cls, true); assert.equal(i.inter, true); assert.equal(i.flags.adInterstitial, true);
  assert.equal(i.ids.rewarded, 'ca-app-pub-3940256099942544/1712485313'); assert.equal(i.ids.interstitial, 'ca-app-pub-3940256099942544/4411468910');
  assert.deepEqual(i.gate, [], 'no paywall globals exist'); assert.equal(i.tomb3, true, 'Tomb III opens on progress alone: no purchase needed');
  assert.ok(!fs.readFileSync(PLAIN, 'utf8').includes('Deeper Tombs'));
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('interstitial: only on a run summary, never before the first clear, every 2nd run, never within 180 s; test unit id', async () => {
  const kv = newKV(); const r = await open({ kv }); const page = r.page;
  const finish = async (outcome = 'dead') => { await page.evaluate(o => telEmit('run_end', { outcome: o }), outcome); await page.waitForTimeout(150); };
  for (let i = 0; i < 3; i++) await finish();
  assert.equal((await plug(page, /Interstitial/)).length, 0, 'three lost runs and no clear yet: nothing');
  await finish('won'); assert.equal((await plug(page, /Interstitial/)).length, 0, 'the clearing run itself shows nothing');
  await finish();
  const calls = await plug(page, /Interstitial/);
  assert.deepEqual(calls.map(c => c[0]), ['admob.prepareInterstitial', 'admob.showInterstitial'], 'now one interstitial');
  assert.equal(calls[0][1].adId, 'ca-app-pub-3940256099942544/4411468910'); assert.equal(calls[0][1].isTesting, true);
  await finish(); await finish(); await finish();
  assert.equal((await plug(page, /showInterstitial/)).length, 1, 'three more runs inside the 3 minute gap: still one');
  assert.ok(kv.prefs.get('gg_inter_last') && kv.prefs.get('gg_first_tomb_clear') === '1', 'counters live in Preferences');
  kv.prefs.set('gg_inter_last', String(Date.now() - 181000)); // the gap has passed (the last ad was 181 s ago)
  await finish(); assert.equal((await plug(page, /showInterstitial/)).length, 2, 'after the gap, the next summary may show another');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('interstitial caps come from remote config (every 3, gap 0) and a remote switch turns it off', async () => {
  const kv = newKV(); kv.prefs.set('gg_first_tomb_clear', '1');
  const r = await open({ file: WIRED, kv, routes: { config: { schema: 1, version: 6, ads: { interstitialEvery: 3, interstitialMinGapSec: 0 } } } });
  await r.page.waitForFunction(() => GG_NATIVE.rcLoaded);
  const finish = async () => { await r.page.evaluate(() => telEmit('run_end', { outcome: 'dead' })); await r.page.waitForTimeout(120); };
  await finish(); await finish(); assert.equal((await plug(r.page, /showInterstitial/)).length, 0); await finish(); assert.equal((await plug(r.page, /showInterstitial/)).length, 1);
  await r.page.evaluate(() => GG_NATIVE.remoteConfig.accept({ schema: 1, version: 7, flags: { adInterstitial: false } }, 'remote'));
  for (let i = 0; i < 4; i++) await finish(); assert.equal((await plug(r.page, /showInterstitial/)).length, 1, 'switched off remotely');
  await r.ctx.close();
});

T('Settings (iOS): Remove ads shows the StoreKit price, Restore purchases is there; buying turns every ad off and reads "Ad-free · purchased"', async () => {
  const kv = newKV(); kv.prefs.set('gg_first_tomb_clear', '1'); kv.prefs.set('gg_inter_runs', '9');
  const r = await open({ kv }); const page = r.page; await waitStore(page);
  await openSettings(page);
  assert.equal(await page.locator('#ggRemoveAds').textContent(), 'Remove ads · 2,99 €', 'localized price comes from the store, not from us');
  assert.equal(await page.locator('#ggRestore').textContent(), 'Restore purchases');
  assert.ok(await page.evaluate(() => GG_TEL.some(e => e.event === 'unlock_prompt_shown' && e.where === 'settings' && e.price === '2,99 €' && e.product === 'gg_adfree')));
  await page.locator('#ggRemoveAds').dispatchEvent('click');
  await page.waitForSelector('#ggAdfreeBadge', { timeout: 5000 });
  assert.equal(await page.locator('#ggAdfreeBadge').textContent(), 'Ad-free · purchased'); assert.equal(await page.locator('#ggRemoveAds').count(), 0);
  const st = await page.evaluate(() => ({ en: GG_NATIVE.ads.enabled(), cls: document.body.classList.contains('gg-ads'), inter: GG_NATIVE.ads.interstitialOn(), free: Payments.adFree(), res: GG_TEL.filter(e => e.event === 'unlock_result').map(e => [e.result, e.price]) }));
  assert.deepEqual(st, { en: false, cls: false, inter: false, free: true, res: [['purchased', '2,99 €']] });
  assert.equal(JSON.parse(kv.prefs.get('gg_ent_v1')).ids[0], 'gg_adfree', 'entitlement cache in Preferences');
  await page.evaluate(() => telEmit('run_end', { outcome: 'dead' })); await page.waitForTimeout(150);
  assert.equal((await plug(page, /Interstitial|admob.init/)).length, 0, 'owner: no interstitial and AdMob never initialised');
  assert.ok(!kv.icloud.has('gg_ent_v1') && !String(kv.prefs.get('gg_save_v1') || '').includes('gg_adfree'), 'the entitlement never travels in the cloud save');
  assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('relaunch: the store (not the cache) is the truth. Reinstall restores silently; a refund heals at the next launch; offline keeps the cache', async () => {
  const kv = newKV(); kv.store.owned.add('gg_adfree');
  const a = await open({ kv }); await a.page.waitForFunction(() => Payments.adFree()); // no cache yet, StoreKit says owned
  assert.equal(await a.page.evaluate(() => GG_NATIVE.ads.enabled()), false); assert.ok(kv.prefs.get('gg_ent_v1').includes('gg_adfree')); await a.ctx.close();
  kv.store.owned.clear(); // refunded
  const b = await open({ kv }); await b.page.waitForFunction(() => Payments.ready); await b.page.waitForFunction(() => !Payments.adFree(), null, { timeout: 5000 });
  assert.equal(await b.page.evaluate(() => GG_NATIVE.ads.enabled()), true, 'refund: ads are back'); assert.ok(!kv.prefs.get('gg_ent_v1').includes('gg_adfree')); await b.ctx.close();
});

T('Restore purchases: finds the purchase on a fresh device; says so when there is nothing; the button is in Settings', async () => {
  const kv = newKV(); const r = await open({ kv }); await waitStore(r.page); await openSettings(r.page);
  await r.page.locator('#ggRestore').dispatchEvent('click'); await r.page.waitForFunction(() => GG_TEL.some(e => e.event === 'unlock_result' && e.result === 'nothing_to_restore'));
  assert.equal(await r.page.evaluate(() => Payments.adFree()), false);
  kv.store.owned.add('gg_adfree'); await r.page.locator('#ggRestore').dispatchEvent('click');
  await r.page.waitForSelector('#ggAdfreeBadge'); assert.ok(await r.page.evaluate(() => GG_TEL.some(e => e.event === 'unlock_result' && e.result === 'restored')));
  await r.ctx.close();
});

T('cancelling the purchase sheet changes nothing', async () => {
  const kv = newKV(); kv.store.next = 'cancel'; const r = await open({ kv }); await waitStore(r.page); await openSettings(r.page);
  await r.page.locator('#ggRemoveAds').dispatchEvent('click'); await r.page.waitForFunction(() => GG_TEL.some(e => e.event === 'unlock_result' && e.result === 'cancelled'));
  assert.equal(await r.page.evaluate(() => Payments.adFree()), false); assert.equal(await r.page.locator('#ggRemoveAds').count(), 1); await r.ctx.close();
});

T('contract surface: window.Payments.go, window.ggPaymentResult exist; a flag-off build shows no purchase UI at all', async () => {
  const r = await open({ file: WIRED, routes: { config: { schema: 1, version: 8, flags: { ads: false } } } }); const page = r.page;
  await page.waitForFunction(() => GG_NATIVE.rcLoaded); await waitStore(page);
  assert.deepEqual(await page.evaluate(() => [typeof Payments.go, typeof window.ggPaymentResult, Payments.last]), ['function', 'function', '']);
  await openSettings(page);
  assert.equal(await page.locator('#ggRemoveAds').count(), 0, 'ads off: nothing to remove, no Remove ads row');
  assert.equal(await page.locator('#ggRestore').count(), 1, 'Restore purchases stays: the store requires it wherever a purchase can exist');
  await r.ctx.close();
  const web = await open({ stub: false }); await web.page.evaluate(() => window.showSettings(window.showMenu)); await web.page.waitForSelector('.pg-set');
  assert.equal(await web.page.locator('#ggPurchases').count(), 0, 'plain web: no purchase section'); assert.equal(await web.page.evaluate(() => Payments.available()), false); await web.ctx.close();
});

T('dev path: rw_devadfree works only in a DEV=true build', async () => {
  buildWww({ root: ROOT, out: DEVHTML, env: { DEV: 'true' }, log: () => {} });
  try {
    const mk = async file => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); await ctx.addInitScript(() => localStorage.setItem('rw_devadfree', '1')); const r = await open({ file, stub: false, ctx }); return r; };
    const dev = await mk(DEVHTML); assert.equal(await dev.page.evaluate(() => Payments.adFree()), true); assert.equal(await dev.page.evaluate(() => GG_NATIVE.adfree.effectiveFlags(GG_NATIVE.flags).ads), false); await dev.ctx.close();
    const prod = await mk(PLAIN); assert.equal(await prod.page.evaluate(() => Payments.adFree()), false); assert.equal(await prod.page.evaluate(() => GG_NATIVE.adfree.effectiveFlags(GG_NATIVE.flags).ads), true, 'a release build ignores the dev switch'); await prod.ctx.close();
  } finally { try { fs.unlinkSync(DEVHTML); } catch {} }
});

T('Android: PlayBilling plugin, Android sample ad units, no ATT; the same purchase flow', async () => {
  const kv = newKV(); kv.prefs.set('gg_first_tomb_clear', '1');
  const r = await open({ kv, platform: 'android' }); const page = r.page; await waitStore(page);
  const i = await page.evaluate(() => ({ p: GG_NATIVE.platform, ids: GG_NATIVE.ads.unitIds(), store: !!Capacitor.Plugins.PlayBilling && !Capacitor.Plugins.StoreKit }));
  assert.deepEqual(i, { p: 'android', ids: { rewarded: 'ca-app-pub-3940256099942544/5224354917', interstitial: 'ca-app-pub-3940256099942544/1033173712' }, store: true });
  await page.evaluate(() => telEmit('run_end', { outcome: 'dead' })); await page.evaluate(() => telEmit('run_end', { outcome: 'dead' })); await page.waitForTimeout(200);
  assert.equal((await plug(page, /^att$/)).length, 0, 'no ATT on Android'); assert.equal((await plug(page, /showInterstitial/)).length, 1);
  assert.equal((await plug(page, /prepareInterstitial/))[0][1].adId, 'ca-app-pub-3940256099942544/1033173712');
  await openSettings(page); assert.equal(await page.locator('#ggRemoveAds').textContent(), 'Remove ads · 2,99 €');
  await page.locator('#ggRemoveAds').dispatchEvent('click'); await page.waitForSelector('#ggAdfreeBadge');
  assert.equal(await page.evaluate(() => GG_NATIVE.ads.enabled()), false); assert.deepEqual(r.errors, []); await r.ctx.close();
});

T('screenshot at 390x844 for the record', async () => {
  const r = await open(); await r.page.waitForTimeout(1500);
  fs.mkdirSync(path.join(ROOT, 'test-results'), { recursive: true });
  await r.page.screenshot({ path: path.join(ROOT, 'test-results/boot-390x844.png') });
  await r.ctx.close();
});
