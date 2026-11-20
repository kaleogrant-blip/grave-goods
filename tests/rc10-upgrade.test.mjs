// The upgrade from v1.0-rc9b to v1.0-rc10 through the app shell: the same phone updating the app, and two phones on one Apple ID
// (iCloud) that are not on the same build. Both games are REAL: rc10 is game/current.html, rc9b is work/sprint15b/build.html
// (md5 6fd8da9d, the build that was game/current.html until sprint 17). Each is wrapped by scripts/build-www.mjs with the shell in
// this repo, Capacitor stubbed, Preferences per device and one shared iCloud key-value store. The rc9b profile is made by playing
// rc9b with real taps (tests/play.mjs); a few profile values a test cannot earn in seconds are written by rc9b's own save functions.
//
// What is checked:
//   A. Same phone, app updated: the game's own upgrade runs once (open dig closed, purse paid, old bests set aside, one note), the new
//      save keys go to Preferences and iCloud like every other key (with the first change after the upgrade), and the rewarded-ad caps that
//      belonged to the closed rc9b dig (a banked seal, an owed Memory) do not leak into the first rc10 run.
//   B. An rc9b cloud copy arriving on a fresh rc10 install goes through that upgrade exactly once, and not again at the next launch.
//   C. An rc10 cloud copy arriving on a phone that still runs rc9b: nothing is corrupted. What happens is asserted line by line below.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { ROOT } from './helpers.mjs';
import { buildWww } from '../scripts/build-www.mjs';
import { GUARD, tapSel, uncover, seal, sendVisitorAway } from './play.mjs';

const RC9B_SRC = path.join(ROOT, 'work/sprint15b/build.html');
const NEW = path.join(ROOT, 'www/index.up10.html'), OLD = path.join(ROOT, 'www/index.up9b.html');
let browser = null, skip = false;
test.before(async () => {
  try { browser = await chromium.launch(); } catch (e) { if (process.env.GG_REQUIRE_BROWSER) throw e; skip = 'no Chromium available: ' + String(e.message).split('\n')[0]; }
  buildWww({ root: ROOT, out: NEW, env: { FLAGS_ADS_DEFAULT: 'true', ADMOB_TESTING: 'true' }, log: () => {} });
  buildWww({ root: ROOT, game: RC9B_SRC, out: OLD, env: { FLAGS_ADS_DEFAULT: 'true', ADMOB_TESTING: 'true' }, log: () => {} });
});
test.after(async () => { if (browser) await browser.close(); for (const f of [NEW, OLD]) try { fs.unlinkSync(f); } catch {} });
const T = (name, fn) => test(name, async t => { if (skip) return t.skip(skip); await fn(t); });

const STUB = `(() => {
  const call = (op, a) => window.__kv(op, a);
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {
    Preferences: { get: a => call('p.get', a), set: a => call('p.set', a), remove: a => call('p.remove', a) },
    ICloudKV: { isAvailable: () => call('i.avail', {}), get: a => call('i.get', a), set: a => call('i.set', a), remove: a => call('i.remove', a), sync: async () => {} },
    Haptics: { impact: async () => {}, notification: async () => {} }, StatusBar: { hide: async () => {} }, App: { addListener: async () => ({ remove() {} }) },
    AdMob: new Proxy({}, { get: (_t, m) => async a => { if (m === 'addListener') return { remove() {} }; return m === 'showRewardVideoAd' ? { type: 'coin', amount: 1 } : {}; } })
  } };
})();`;
// A phone: its own localStorage (browser context) and Preferences (Map). `icloud` is the Apple ID's store, shared between phones.
async function phone(icloud) {
  const prefs = new Map();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const ph = { ctx, prefs, icloud, errors: [] };
  await ctx.exposeBinding('__kv', (_s, op, a) => { switch (op) {
    case 'p.get': return { value: prefs.has(a.key) ? prefs.get(a.key) : null }; case 'p.set': prefs.set(a.key, a.value); return; case 'p.remove': prefs.delete(a.key); return;
    case 'i.avail': return { available: true }; case 'i.get': return { value: icloud.has(a.key) ? icloud.get(a.key) : null }; case 'i.set': icloud.set(a.key, a.value); return; case 'i.remove': icloud.delete(a.key); return; default: return { value: null }; } });
  await ctx.addInitScript(STUB);
  ph.launch = async file => { // open the app (or open it again). The game saves on pagehide, as it does when iOS closes it.
    if (ph.page) { await ph.page.evaluate(() => window.dispatchEvent(new Event('pagehide'))).catch(() => {}); await ph.page.waitForTimeout(300); await ph.page.close(); }
    const page = ph.page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') ph.errors.push(m.text()); });
    page.on('pageerror', e => ph.errors.push('pageerror: ' + e.message));
    await page.goto('file://' + file);
    await page.waitForFunction(() => window.GG_NATIVE && GG_NATIVE.ready, null, { timeout: 25000 });
    await page.waitForFunction(() => Store.status().mode === 'cloud', null, { timeout: 25000 });
    await page.waitForTimeout(400);
    return page;
  };
  return ph;
}
// The save as it sits in iCloud right now (null while a write is half way).
function cloud(icloud) {
  try { const m = JSON.parse(icloud.get('gg_save_v1_meta')); let s = ''; for (let i = 0; i < m.n; i++) s += icloud.get('gg_save_v1_c' + i); if (Buffer.byteLength(s) !== m.bytes) return null; return JSON.parse(s); } catch { return null; }
}
async function cloudHas(icloud, pred, what) {
  for (let i = 0; i < 150; i++) { const d = cloud(icloud); if (d && pred(d.keys, d)) return d; await new Promise(r => setTimeout(r, 200)); }
  assert.fail('the save never reached iCloud: ' + what + '. Keys there: ' + Object.keys((cloud(icloud) || { keys: {} }).keys).join(' '));
}
const ls = (page, k) => page.evaluate(k => localStorage.getItem(k), k);
const profile = page => page.evaluate(() => ({ ver: GAME_VERSION, gold: _gold, coll: loadColl().slice().sort(), xp: PROG.rank.xp, tombs: JSON.stringify(PROG.tombs.c), rm: !!SETTINGS.rm, best: bestGet().best | 0, runs: ST.runs | 0 }));

// ---- rc9b, played: a new profile digs the practice wall, starts its first run, seals once (rc9b: one seal takes everything loose),
// leaves two finds loose and 17 Gold in the purse. Vault, wallet Gold, rank, a cleared tomb, a setting and best scores are written by rc9b's own functions.
async function playRc9b(ph) {
  const page = await ph.launch(OLD);
  assert.equal(await page.evaluate(() => GAME_VERSION), 'v1.0-rc9b');
  await page.waitForTimeout(GUARD); await tapSel(page, '#title button.tl-dig');
  await page.waitForSelector('#overlay:not([hidden]) #just'); await page.waitForTimeout(GUARD); await tapSel(page, '#overlay:not([hidden]) #just');
  await page.waitForFunction(() => state && state.train && document.getElementById('overlay').hidden, null, { timeout: 5000 });
  await uncover(page, 5); await seal(page);
  await page.waitForFunction(() => /Training complete/i.test(document.getElementById('card').textContent) && !document.getElementById('overlay').hidden, null, { timeout: 15000 });
  await page.waitForTimeout(GUARD); await tapSel(page, '#overlay:not([hidden]) #go');
  await page.waitForFunction(() => state && !state.train && !state.over && run && run.tid, null, { timeout: 8000 }); await sendVisitorAway(page);
  await page.waitForFunction(() => document.getElementById('overlay').hidden, null, { timeout: 8000 });
  await page.evaluate(() => { TARGETS[state.i] = 999999; document.getElementById('target').textContent = TARGETS[state.i]; }); // setup: the dig has to stay open
  await uncover(page, 7); await seal(page);
  assert.deepEqual(await page.evaluate(() => [state.sealed, exposedFinds().length]), [1, 0], 'rc9b: one seal took all seven finds (the old rule)');
  await page.evaluate(() => {
    saveColl(['Ankh', 'Heart Scarab']); ecoWalletEarn(140); PROG.rank.xp = xpAt(7) + 5; PROG.rank.r = rankFor(PROG.rank.xp); progSaveRank(); PROG.tombs.c['1.1'] = 2; progSaveTombs(); setSet('rm', true);
    const B = bestGet(); B.wins = 2; B.best = 6100; B.runs = 3; bestPut(B); ST.best = 6100; ST.wins = 2; ST.hist.push({ b: 5700, w: 1, d: 0, c: 'scholar' }); stSave(); run.gold = 17; ui();
  });
  await uncover(page, 2); await page.waitForTimeout(900); // two finds left loose; the game's own 600 ms save writes the dig
  const before = await profile(page), tid = await page.evaluate(() => run.tid), bs = await page.evaluate(() => ST.bs | 0);
  const rec = JSON.parse(await ls(page, 'rw_resume')); assert.equal(rec.v, 1, 'rc9b writes saved-dig record version 1'); assert.equal(rec.tid, tid); assert.equal(rec.run.gold, 17);
  await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); Store.flush(); });
  await cloudHas(ph.icloud, k => k.rw_resume && JSON.parse(k.rw_resume).run.gold === 17 && /Heart Scarab/.test(k.rw_coll || '') && /6100/.test(k.rw_best || ''), 'the rc9b profile with its open dig');
  assert.ok(before.gold >= 140 && bs > 0, JSON.stringify(before)); assert.deepEqual(ph.errors, [], 'rc9b ran clean in the shell');
  return { before, tid, bs };
}
// What the game's rc10 upgrade must have done to that profile, read from the running rc10 game.
async function assertUpgraded(page, old, label) {
  const a = await profile(page);
  assert.equal(a.ver, 'v1.0-rc10', label);
  assert.equal(await ls(page, 'rw_rc10'), '1', label + ': the upgrade flag is set'); assert.equal(await ls(page, 'rw_resume'), null, label + ': the rc9b dig is closed');
  assert.equal(a.gold, old.before.gold + 17, label + ': wallet + the open dig\'s purse of 17, paid once');
  assert.deepEqual(a.coll, old.before.coll); assert.equal(a.xp, old.before.xp); assert.equal(a.tombs, old.before.tombs); assert.equal(a.rm, true); assert.equal(a.runs, old.before.runs);
  assert.equal(a.best, 0, label + ': new bests start from zero');
  const set = JSON.parse(await ls(page, 'rw_rc9')); assert.equal(set.best, 6100, label + ': the old best haul is set aside'); assert.equal(set.bs, old.bs);
  return { a, t: set.t };
}
async function readNoteOnce(page) { // the title's Dig button shows the one-time note first; "Carry on" puts it away for good
  await page.waitForTimeout(GUARD); await tapSel(page, '#title button.tl-dig');
  await page.waitForSelector('#overlay:not([hidden]) #card #go', { timeout: 8000 });
  const t = await page.evaluate(() => document.getElementById('card').textContent);
  assert.match(t, /The rules of the dig changed/); assert.match(t, /tray of six/); assert.match(t, /Your open dig was closed/); assert.match(t, /purse of 17 Gold is in your wallet/);
  await page.waitForTimeout(GUARD); await tapSel(page, '#card #go'); await page.waitForTimeout(600);
  assert.equal(await ls(page, 'rw_rc10note'), null, 'the note is put away');
}

T('A. same phone, app updated from rc9b to rc10: the upgrade runs once; rw_rc10 / rw_rc9 / rw_rc10note sync like every other key; the closed dig\'s banked seal and owed Memory do not reach the first rc10 run', async () => {
  const icloud = new Map(), ph = await phone(icloud); const old = await playRc9b(ph);
  // the rc9b run had rewards in hand when the app was updated: the Memory slip used (and not yet in a save), a seal banked for the next chamber
  ph.prefs.set('gg_ad_caps_v1', JSON.stringify({ v: 1, run: old.tid, memory: 1, owed: 1, owedAt: Date.now() + 5000, seal: 1, sealFrom: 0, sealAt: null, sealN: 0 }));
  let page = await ph.launch(NEW);
  const up = await assertUpgraded(page, old, 'first launch of rc10');
  assert.deepEqual(JSON.parse(await ls(page, 'rw_rc10note')), { v: 1, dig: { ch: 1, gold: 17 } });
  assert.equal(await page.evaluate(() => GG_NATIVE.resumeSnap && GG_NATIVE.resumeSnap.tid), old.tid, 'the shell saw the rc9b record before the game closed it');
  // The game does its upgrade while it loads, and (by its own rule) what it does while loading is not a player change, so nothing is
  // sent yet: iCloud still holds the rc9b copy. The first real change sends the upgraded profile. Here that is the note being put away.
  await page.waitForTimeout(1600);
  assert.ok(!('rw_rc10' in cloud(icloud).keys), 'not sent before the first change (if the app were deleted now, a reinstall would adopt the rc9b copy and upgrade it once: test B)');
  await readNoteOnce(page);
  // the new keys travel: the Preferences mirror and iCloud both carry them, and the closed dig is gone from both
  const d = await cloudHas(icloud, k => k.rw_rc10 === '1' && !!k.rw_rc9 && !k.rw_rc10note && !k.rw_resume, 'rw_rc10 and rw_rc9, the note put away, the old dig gone');
  assert.equal(JSON.parse(d.keys.rw_rc9).best, 6100); assert.equal(Number(d.keys.rw_gold), up.a.gold);
  const mirror = JSON.parse(ph.prefs.get('gg_save_v1')).keys; for (const k of ['rw_rc10', 'rw_rc9']) assert.ok(k in mirror, k + ' is in the Preferences mirror'); assert.ok(!('rw_resume' in mirror));
  // a new rc10 run: three Memories, three seals, nothing carried over from the rc9b run's ad rewards
  await page.waitForSelector('#overlay:not([hidden]) #dig, #mDig', { timeout: 8000 }); await page.waitForTimeout(GUARD);
  if (await page.locator('#mDig:visible').count()) { await tapSel(page, '#mDig'); await page.waitForSelector('#overlay:not([hidden]) #dig'); await page.waitForTimeout(GUARD); }
  await tapSel(page, '#overlay:not([hidden]) #dig');
  await page.waitForFunction(() => state && !state.train && !state.over && run && run.tid, null, { timeout: 8000 }); await sendVisitorAway(page);
  await page.evaluate(() => GG_NATIVE.ads.load()); await page.evaluate(() => { newChamber(1); ui(); }); await sendVisitorAway(page); // setup: on to chamber 2, where a banked seal would land
  const r = await page.evaluate(() => ({ newRun: run.tid, lives: run.lives, xs: state.xs | 0, free: SKILL.seals.free, extra: state.adxs | 0, pending: GG_NATIVE.ads.pending(), v: JSON.parse(localStorage.getItem('rw_resume')).v }));
  assert.notEqual(r.newRun, old.tid); assert.equal(r.lives, 3, 'no Memory handed back from the old run'); assert.equal(r.xs, 0, 'no extra seal from the old run'); assert.equal(r.extra, 0);
  assert.deepEqual(r.pending, { seal: 0, memory: 0, run: r.newRun, adFree: false }, 'the caps record starts clean for the new run'); assert.equal(r.v, 2);
  // relaunch: no second upgrade, no second note
  page = await ph.launch(NEW);
  assert.equal(JSON.parse(await ls(page, 'rw_rc9')).t, up.t, 'the set-aside scores were not written again'); assert.equal(await ls(page, 'rw_rc10note'), null);
  assert.equal((await profile(page)).gold, up.a.gold, 'the purse was paid once');
  assert.deepEqual(ph.errors, []); await ph.ctx.close();
});

T('B. an rc9b cloud copy arrives on a fresh rc10 install: it goes through the game\'s upgrade exactly once (dig closed, purse paid once, old bests set aside, one note), and the upgraded copy with the new keys goes back to iCloud', async () => {
  const icloud = new Map(), oldPhone = await phone(icloud); const old = await playRc9b(oldPhone); await oldPhone.ctx.close();
  const cloudBefore = cloud(icloud); assert.ok(!('rw_rc10' in cloudBefore.keys) && JSON.parse(cloudBefore.keys.rw_resume).v === 1, 'iCloud holds a pure rc9b copy with a version 1 dig');
  const ph = await phone(icloud); let page = await ph.launch(NEW); // new phone: empty localStorage, empty Preferences, same Apple ID
  await page.waitForFunction(() => localStorage.getItem('rw_rc10') === '1' && /Heart Scarab/.test(localStorage.getItem('rw_coll') || ''), null, { timeout: 25000 });
  const up = await assertUpgraded(page, old, 'cloud copy adopted');
  assert.deepEqual(JSON.parse(await ls(page, 'rw_rc10note')), { v: 1, dig: { ch: 1, gold: 17 } });
  assert.equal(await page.evaluate(() => !!S11.peekResume()), false, 'no dig is offered from the old wall');
  await readNoteOnce(page);
  const d = await cloudHas(icloud, k => k.rw_rc10 === '1' && !!k.rw_rc9 && !k.rw_rc10note && !k.rw_resume, 'the upgraded copy');
  assert.equal(Number(d.keys.rw_gold), up.a.gold); assert.equal(JSON.parse(d.keys.rw_best).best, 0);
  // next launch, and a launch after the Preferences mirror is lost (iCloud only): never upgraded again
  for (const wipe of [false, true]) {
    if (wipe) ph.prefs.delete('gg_save_v1');
    page = await ph.launch(NEW);
    assert.equal(JSON.parse(await ls(page, 'rw_rc9')).t, up.t, 'not upgraded twice'); assert.equal(await ls(page, 'rw_rc10note'), null, 'no second note'); assert.equal((await profile(page)).gold, up.a.gold, 'purse not paid twice');
  }
  assert.deepEqual(ph.errors, []); await ph.ctx.close();
});

T('C. an rc10 cloud copy arrives on a phone still running rc9b: no error and nothing corrupted. rc9b keeps the keys it does not know, drops the rc10 dig it cannot read, and the profile it sends back is not upgraded a second time by rc10', async () => {
  const icloud = new Map(), oldPhone = await phone(icloud); const old = await playRc9b(oldPhone);
  // the other phone has rc10: it adopts and upgrades the copy, then starts an rc10 dig and leaves it open
  const ph = await phone(icloud); let page = await ph.launch(NEW);
  await page.waitForFunction(() => localStorage.getItem('rw_rc10') === '1' && /Heart Scarab/.test(localStorage.getItem('rw_coll') || ''), null, { timeout: 25000 });
  const up = await assertUpgraded(page, old, 'rc10 phone'); await readNoteOnce(page);
  await page.waitForSelector('#overlay:not([hidden]) #dig, #mDig', { timeout: 8000 }); await page.waitForTimeout(GUARD);
  if (await page.locator('#mDig:visible').count()) { await tapSel(page, '#mDig'); await page.waitForSelector('#overlay:not([hidden]) #dig'); await page.waitForTimeout(GUARD); }
  await tapSel(page, '#overlay:not([hidden]) #dig');
  await page.waitForFunction(() => state && !state.train && !state.over && run && run.tid, null, { timeout: 8000 }); await sendVisitorAway(page);
  await uncover(page, 2); await page.evaluate(() => { run.gold = 9; ui(); }); await page.waitForTimeout(900);
  await page.evaluate(() => { ecoWalletEarn(1); window.dispatchEvent(new Event('pagehide')); Store.flush(); }); // a profile change, so the game sends the save (the dig record rides along)
  const gold10 = up.a.gold + 1;
  await cloudHas(icloud, k => k.rw_rc10 === '1' && Number(k.rw_gold) === gold10 && k.rw_resume && JSON.parse(k.rw_resume).v === 2 && JSON.parse(k.rw_resume).run.gold === 9, 'the rc10 copy with a version 2 dig');
  // ---- the rc9b phone opens the app: the cloud copy is newer, so rc9b adopts it
  const op = await oldPhone.launch(OLD);
  await op.waitForFunction(g => String(_gold) === String(g) && localStorage.getItem('rw_rc10') === '1', gold10, { timeout: 25000 });
  const o = await profile(op);
  assert.equal(o.ver, 'v1.0-rc9b'); assert.equal(o.gold, gold10, 'Gold as rc10 left it'); assert.deepEqual(o.coll, up.a.coll, 'Vault intact'); assert.equal(o.xp, up.a.xp); assert.equal(o.tombs, up.a.tombs); assert.equal(o.rm, true);
  assert.equal(o.best, 0, 'rc9b shows the rc10 best (zero, new bests restarted); the old-rule scores sit in rw_rc9, which rc9b cannot show');
  assert.ok(JSON.parse(await ls(op, 'rw_rc9')).best === 6100, 'rw_rc9 is kept as an unknown key'); 
  assert.equal(await op.evaluate(() => !!S11.peekResume()), false, 'rc9b does not resume a version 2 dig');
  assert.equal(await ls(op, 'rw_resume'), null, 'it drops the record instead (the 9 Gold in that dig\'s purse is lost on this phone)');
  await op.waitForTimeout(GUARD); await tapSel(op, '#title button.tl-dig'); await op.waitForSelector('#overlay:not([hidden]) #dig, #mDig', { timeout: 8000 }); // the title leads to the kit or the menu, not into a broken wall
  assert.deepEqual(oldPhone.errors, [], 'rc9b raised no error on the rc10 copy');
  // rc9b then changes the profile and sends it back
  await op.evaluate(() => { ecoWalletEarn(5); window.dispatchEvent(new Event('pagehide')); Store.flush(); });
  const back = await cloudHas(icloud, k => Number(k.rw_gold) === gold10 + 5, 'the copy rc9b sent back');
  assert.equal(back.keys.rw_rc10, '1', 'rc9b carried the upgrade flag back'); assert.equal(JSON.parse(back.keys.rw_rc9).t, up.t, 'and the set-aside scores, untouched'); assert.ok(!('rw_resume' in back.keys), 'the copy it sends has no dig');
  // ---- and the rc10 phone opens again: it takes rc9b's newer copy, and does NOT upgrade it a second time
  page = await ph.launch(NEW);
  await page.waitForFunction(g => String(_gold) === String(g), gold10 + 5, { timeout: 25000 });
  const n = await profile(page);
  assert.equal(n.ver, 'v1.0-rc10'); assert.deepEqual(n.coll, up.a.coll); assert.equal(n.xp, up.a.xp); assert.equal(n.best, 0);
  assert.equal(JSON.parse(await ls(page, 'rw_rc9')).t, up.t, 'no second upgrade'); assert.equal(await ls(page, 'rw_rc10note'), null, 'no second note');
  assert.equal(await page.evaluate(() => !!S11.peekResume()), false, 'the rc10 dig that was open is gone: the rc9b phone\'s copy, which won, had dropped it');
  assert.deepEqual(ph.errors, []); await oldPhone.ctx.close(); await ph.ctx.close();
});
