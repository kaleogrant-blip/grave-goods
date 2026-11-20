#!/usr/bin/env node
// Store screenshots, made from the game that is in this repository.
//
//   node scripts/store-shots.mjs                 all six frames, both stores
//   node scripts/store-shots.mjs --only 03,06    just those frames
//   node scripts/store-shots.mjs --out /tmp/x    write somewhere else (sub-folders ios/ and play/)
//
// What it does: opens game/current.html (the real game, unwrapped) in headless Chromium at a phone-sized viewport, plays to six
// seeded moments, photographs each one, and sets the photograph in the store frame (headline, one line under it, brass border).
// Output, same names and pixel sizes as before:
//   store/screenshots/NN-name.png        1290 x 2796  (App Store, 6.7-inch iPhone)
//   store/play/screenshots/NN-name.png   1080 x 2340  (Google Play phone)
// PNG, RGB, no alpha. Headlines are the captions in store/listing.md; change them there AND in FRAMES below.
//
// How the moments are reached (the same convention as the tests, tests/play.mjs): SETUP is written directly (which profile, which
// seed, which tiles are still covered), and what the picture shows is then made by real touchscreen taps: every find is uncovered
// by a tap of the pick, finds are moved on and off the tray by taps, Seal is a tap, and so is the sarcophagus-free knucklebone offer.
// Nothing on screen is drawn by this script: the numbers, the tray marks, the cards and the text are the game's own.
// The profile is a made-up one (a player some way in: 17 relics in the Collection), written into localStorage before the game boots.
//
// The fonts are the two the app bundles (www/fonts); the game's request to Google Fonts is answered from those files, so the
// frames look like the app and the script needs no network.
//
// Needs Playwright's Chromium (the same one `npm test` uses). Look at every frame after running this: a seed that looked good on one
// game build can look dull on the next. SEEDS below is the only thing to change.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = path.join(ROOT, 'game/current.html');
const FONTS = path.join(ROOT, 'www/fonts');

export const TARGETS = [
  { id: 'ios', dir: 'store/screenshots', w: 1290, h: 2796 },
  { id: 'play', dir: 'store/play/screenshots', w: 1080, h: 2340 }
];
// file name, headline (the caption in store/listing.md), the line under it
export const FRAMES = [
  { n: '01', name: 'title', head: 'Dig. Seal. Don’t fall.', sub: 'A roguelike of real relics and cracking walls.' },
  { n: '02', name: 'dig', head: 'Fever. Dynasties. Timelines.', sub: 'Match a civilization and the seal multiplies.' },
  { n: '03', name: 'seal', head: 'Fill the tray. Seal six.', sub: 'A tray holds six finds. You choose which six.' },
  { n: '04', name: 'relic', head: 'Real relics. Real history.', sub: 'Every relic is a real object, with its story.' },
  { n: '05', name: 'collection', head: 'Fill the Collection.', sub: 'Forty-eight relics from six civilizations.' },
  { n: '06', name: 'knucklebone', head: 'The odds are printed.', sub: 'Every chance is on the card before you choose.' }
];
const SEEDS = { dig: 'SHOT-23', seal: 'SHOT-6', bone: 'BONE-' };
const VIEW = { w: 390, h: 844 }; // the phone the game is photographed on (CSS pixels)

// ---- the made-up profile: past the practice wall and the first tomb, 17 relics found
const COLL = ['Eye of Horus', 'Ankh', 'Rosetta Stone', 'Mask of Tutankhamun', 'Bust of Nefertiti', 'Aegis of Athena', 'Golden Fleece', 'Athenian Owl', 'Antikythera Mechanism', 'Mjölnir', 'Lewis Chessmen', 'Oseberg Ship',
  'Jade Mask of Pakal', 'Dresden Codex', 'Standard of Ur', 'Royal Game of Ur', 'Terracotta Warrior'];
const PROFILE = `try{if(!localStorage.getItem('rw_rc10')){const S=(k,v)=>localStorage.setItem(k,v);S('rw_train','1');S('rw_rc10','1');S('rw_first','1');S('rw_mercy','2');
  S('rw_best',JSON.stringify({runs:23,wins:4,best:14310,depth:3}));S('rw_coll',${JSON.stringify(JSON.stringify(COLL))});}}catch(e){}`;

const FONT_FILES = [['Cinzel', 'normal', 700, 'cinzel-latin-700-normal'], ['Cinzel', 'normal', 900, 'cinzel-latin-900-normal'], ['Alegreya', 'normal', 500, 'alegreya-latin-500-normal'], ['Alegreya', 'normal', 700, 'alegreya-latin-700-normal'], ['Alegreya', 'italic', 500, 'alegreya-latin-500-italic']];
const fontCss = base => FONT_FILES.map(([fam, style, weight, file]) => `@font-face{font-family:"${fam}";font-style:${style};font-weight:${weight};font-display:block;src:url("${base}${file}.woff2") format("woff2")}`).join('\n');
const fontData = () => FONT_FILES.map(([fam, style, weight, file]) => `@font-face{font-family:"${fam}";font-style:${style};font-weight:${weight};src:url(data:font/woff2;base64,${fs.readFileSync(path.join(FONTS, file + '.woff2')).toString('base64')}) format("woff2")}`).join('\n');

async function openGame(browser, dsf) {
  const ctx = await browser.newContext({ viewport: { width: VIEW.w, height: VIEW.h }, deviceScaleFactor: dsf, hasTouch: true, isMobile: false, reducedMotion: 'no-preference' });
  await ctx.addInitScript(PROFILE);
  await ctx.addInitScript('try{navigator.vibrate=()=>true}catch(e){}');
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: fontCss('https://fonts.gstatic.com/gg/') }));
  await page.route(/fonts\.gstatic\.com\/gg\//, r => { const f = path.join(FONTS, path.basename(new URL(r.request().url()).pathname)); return fs.existsSync(f) ? r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
  await page.route('file://' + GAME, r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: fs.readFileSync(GAME) })); // the fragment declares no charset; the app's wrapper page does
  await page.goto('file://' + GAME);
  await page.waitForFunction(() => typeof newChamber === 'function' && typeof S11 === 'object');
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
// Start a seeded dig without the menus (the statements the Dig button runs). o: cls, tomb, stake, gear, chamber
async function startDigQuiet(page, seed, o = {}) {
  await page.evaluate(([seed, o]) => {
    try { if (_title) _title.done(); } catch (e) {}
    const k = o.cls || 'scholar'; cls = CLASSES[k]; gear = GEAR.find(g => g.id === (o.gear || 'knuckle')) || GEAR[0]; relic = null;
    PROG.sel = { tomb: o.tomb || 1, stake: 1, tool: 'standard' };
    statsStart(k); TARGETS.length = 3; run = newRun(seed); run.train = false; document.getElementById('overlay').hidden = true;
    try { if (typeof _kit2 === 'object' && _kit2) _kit2.tool = 'standard'; if (typeof kitRunInit === 'function') kitRunInit(); } catch (e) {}
    s10RunStart({ fresh: false, g: gear, tl: 'standard', k, st: 1, tb: PROG.sel.tomb, daily: false });
    SETTINGS.confirm = false; newChamber(o.chamber || 0);
  }, [seed, o]);
}
async function startDig(page, seed, o = {}) {
  await startDigQuiet(page, seed, o);
  await page.waitForTimeout(900);
  for (let k = 0; k < 3; k++) { const no = page.locator('#overlay:not([hidden]) #rvno'); if (!(await no.count())) break; await page.waitForTimeout(1200); await no.tap().catch(() => {}); await page.waitForTimeout(600); } // a visitor at the door: sent away
  await page.locator('#pick').tap(); await page.waitForTimeout(150);
}
const cellXY = (page, x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('c'), r = c.getBoundingClientRect(); return { x: r.left + (x + .5) * cell, y: r.top + (y + TOP + .5) * cell }; }, [x, y]);
async function tapCell(page, x, y, wait = 260) {
  const p = await cellXY(page, x, y);
  for (let k = 0; k < 4; k++) { // the score sheet opens over the top rows for a moment: shut it as a player would
    if (await page.evaluate(p => { const e = document.elementFromPoint(p.x, p.y); return !!e && e.id === 'c'; }, p)) break;
    if (await page.locator('#strip:visible').count() && await page.evaluate(() => document.getElementById('strip').getAttribute('aria-expanded') === 'true')) await page.locator('#strip').tap().catch(() => {});
    await page.waitForTimeout(500);
  }
  await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(wait);
}
// Uncover finds by real taps of the pick. Setup: each chosen find keeps one covered tile, one strike deep. pick(f) chooses.
async function uncover(page, ids) {
  for (const id of ids) {
    const c = await page.evaluate(id => { const f = state.finds[id]; if (!f || f.banked) return null; try { luckSlipHide(); } catch (e) {} f.cells.forEach(([x, y], j) => { state.dirt[y][x] = j === 0 ? 1 : 0; }); ui(); draw(); return f.cells[0]; }, id);
    if (c) await tapCell(page, c[0], c[1]);
  }
}
const plain = (page, filter) => page.evaluate(src => { const ok = new Function('f', 'return ' + src); return state.finds.filter(f => !f.sarc && !f.banked && ok(f)).map(f => f.id); }, filter || 'true');
const settle = async (page, ms = 900) => { await page.waitForTimeout(ms); await page.evaluate(() => { try { const t = document.getElementById('uitoast'); if (t) t.hidden = true; } catch (e) {} }); await page.waitForTimeout(120); };

// The score sheet slides open over the top of the wall after a find and shuts again on its own. Wait for that to finish, then put it
// where the picture wants it (a tap on its handle, as a player would), so no frame catches it half way.
async function sheet(page, open) {
  await page.waitForTimeout(4200);
  for (let k = 0; k < 3; k++) {
    const is = await page.evaluate(() => document.getElementById('strip').getAttribute('aria-expanded') === 'true');
    if (is === open) break;
    await page.locator('#strip').tap().catch(() => {}); await page.waitForTimeout(1100);
  }
  await page.waitForTimeout(900);
}
// ---- the six moments. Each returns when the screen is ready to be photographed.
const MOMENTS = {
  async title(page) { await page.waitForTimeout(2600); },

  // mid-dig: four Egyptian finds and a relic loose, Fever lit, the wall cracked about a third
  async dig(page) {
    await startDig(page, SEEDS.dig, { cls: 'scholar' });
    const info = await page.evaluate(() => state.finds.map(f => ({ id: f.id, civ: f.civ, relic: !!f.relic, sarc: !!f.sarc, age: f.age })));
    const egypt = info.filter(f => !f.sarc && f.civ === 0).map(f => f.id).slice(0, 5);
    await uncover(page, egypt);
    const low = await page.evaluate(() => state.finds.filter(f => !f.sarc && !f.banked && !f.relic && f.cells.some(([x, y]) => state.dirt[y][x] > 0) && f.cells.every(([x, y]) => y >= 4)).map(f => f.id));
    await uncover(page, low.slice(0, 3)); // three more in the lower rows, which the open score sheet does not cover
    await page.evaluate(() => { state.crack = Math.round(maxCrack() * .36); ui(); draw(); }); // setup: a wall that has been worked on
    await sheet(page, true); await settle(page, 300);
  },

  // the tray: eight loose finds, six ringed on the tray, one of them chosen by hand
  async seal(page) {
    await startDig(page, SEEDS.seal, { cls: 'scholar' });
    const ids = (await plain(page, '!f.relic')).slice(0, 8);
    await uncover(page, ids);
    const off = await page.evaluate(() => { const L = trayList(), ex = exposedFinds(); const out = ex.filter(f => L.indexOf(f) < 0)[0]; return out ? out.cells[0] : null; });
    if (off) await tapCell(page, off[0], off[1]); // a tap puts a left-out find on the tray; the least valuable of the six steps off
    await page.evaluate(() => { state.crack = Math.round(maxCrack() * .52); ui(); draw(); });
    await sheet(page, false); await settle(page, 300);
  },

  // a relic's page in the Codex
  async relic(page) {
    await page.evaluate(() => { try { if (_title) _title.done(); } catch (e) {} showEntry('Antikythera Mechanism', () => {}); });
    await settle(page, 1200);
  },

  async collection(page) {
    await page.evaluate(() => { try { if (_title) _title.done(); } catch (e) {} window.showCollection(() => {}); });
    await settle(page, 900);
    await page.evaluate(() => { document.getElementById('overlay').scrollTop = 372; }); // past the header, so the first rows of relics are in the picture
    await settle(page, 500);
  },

  // the knucklebone offer after a big seal: a real tray of six (a relic among them), sealed by a tap, in the guardian chamber,
  // on a wall where that tray is worth enough for the bone to be offered (the game offers it from 2,700)
  async knucklebone(page) {
    let seed = null;
    for (let k = 0; k < 120 && !seed; k++) { // SEEDS.bone is a prefix: the first seed whose guardian wall holds such a tray is used (the same one every time, for the same game build)
      await startDigQuiet(page, SEEDS.bone + k, { cls: 'scholar', chamber: 2, gear: 'knuckle' });
      if (await page.evaluate(() => { const top = state.finds.filter(f => !f.sarc).sort((a, b) => findWorth(b) - findWorth(a)).slice(0, 6); return !state.tell && score(top).total >= LUCK.coin.min * 1.1 && score(top).total < TARGETS[2] * .6; })) seed = SEEDS.bone + k;
    }
    if (!seed) throw new Error('no seed gives a tray worth the knucklebone offer');
    await page.evaluate(() => { try { S15.hold = true; S11.clear(); } catch (e) {} }); await page.reload(); await page.waitForFunction(() => typeof newChamber === 'function' && typeof S11 === 'object'); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(900);
    await startDig(page, seed, { cls: 'scholar', chamber: 2, gear: 'knuckle' });
    const pick = await page.evaluate(() => { const top = state.finds.filter(f => !f.sarc).sort((a, b) => findWorth(b) - findWorth(a)).slice(0, 6); return { ids: top.map(f => f.id), total: score(top).total, min: LUCK.coin.min }; });
    if (pick.total < pick.min) throw new Error(`seed ${seed}: the best tray is worth ${pick.total}, under the ${pick.min} the knucklebone needs. Pick another seed in SEEDS.bone.`);
    await uncover(page, pick.ids);
    await page.evaluate(() => { state.crack = Math.round(maxCrack() * .44); Q.speed = 3; ui(); draw(); });
    await page.locator('#seal').tap();
    for (let k = 0; k < 30 && !(await page.locator('#lkp #lkyes').count()); k++) { // a relic card may come first: read and closed, as a player would
      const go = page.locator('#overlay:not([hidden]) #go:visible'); if (await go.count()) { await page.waitForTimeout(1300); await go.first().tap().catch(() => {}); }
      await page.waitForTimeout(700);
    }
    await page.waitForSelector('#lkp #lkyes', { timeout: 10000 });
    await settle(page, 5200); // the score sheet has shut by now
  }
};

// ---- the store frame around a photograph
function frameHtml(t, f, shot, shotW, shotH) {
  const k = t.w / 1290, px = n => Math.round(n * k) + 'px';
  return `<!doctype html><meta charset="utf-8"><style>${fontData()}
html,body{margin:0;width:${t.w}px;height:${t.h}px;overflow:hidden}
body{background:radial-gradient(120% 70% at 50% 0%,#3a2a14 0%,#1c140b 45%,#0c0906 100%);font-family:"Alegreya",Georgia,serif;position:relative}
h1{position:absolute;left:${px(60)};right:${px(60)};top:${px(96)};height:${px(120)};display:flex;align-items:center;justify-content:center;margin:0;text-align:center;font:900 ${px(96)}/1.08 "Cinzel",Georgia,serif;letter-spacing:.02em;color:#f6c84c;text-shadow:0 ${px(4)} 0 #5a3a08,0 ${px(10)} ${px(26)} rgba(0,0,0,.7);white-space:nowrap}
p{position:absolute;left:${px(70)};right:${px(70)};top:${px(246)};margin:0;text-align:center;font:italic 500 ${px(50)}/1.2 "Alegreya",Georgia,serif;color:#e9dcb8;text-shadow:0 ${px(3)} ${px(10)} rgba(0,0,0,.8)}
.fr{position:absolute;left:${Math.round((t.w - shotW) / 2 - 14 * k)}px;top:${px(388)};padding:${px(8)};background:linear-gradient(135deg,#f0c860,#a8781f 45%,#e7b84a 70%,#8a5f14);box-shadow:0 ${px(24)} ${px(70)} rgba(0,0,0,.75),0 0 0 ${px(3)} #120c05}
.fr i{display:block;padding:${px(6)};background:#0b0805}
.fr img{display:block;width:${shotW}px;height:${shotH}px}
</style><h1><span>${f.head}</span></h1><p>${f.sub}</p><div class="fr"><i><img src="data:image/png;base64,${shot.toString('base64')}"></i></div>`;
}

export async function makeShots({ only = null, out = null, log = console.log } = {}) {
  const browser = await chromium.launch(); const made = [];
  try {
    for (const t of TARGETS) {
      const k = t.w / 1290, shotW = Math.round(1040 * k), dsf = shotW / VIEW.w, shotH = Math.round(VIEW.h * dsf);
      const dir = out ? path.join(out, t.id) : path.join(ROOT, t.dir); fs.mkdirSync(dir, { recursive: true });
      for (const f of FRAMES) {
        if (only && !only.includes(f.n) && !only.includes(f.name)) continue;
        const g = await openGame(browser, dsf);
        await MOMENTS[f.name](g.page);
        if (g.errors.length) throw new Error(f.name + ': page error: ' + g.errors[0]);
        const shot = await g.page.screenshot({ type: 'png' }); await g.ctx.close();
        const c = await browser.newContext({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: 1 }); const p = await c.newPage();
        await p.setContent(frameHtml(t, f, shot, shotW, shotH)); await p.evaluate(() => document.fonts.ready);
        await p.evaluate(() => { const h = document.querySelector('h1'), s = h.firstChild; let px = parseFloat(getComputedStyle(h).fontSize); while (s.getBoundingClientRect().width > h.clientWidth && px > 20) { px -= 2; h.style.fontSize = px + 'px'; } }); // a long headline is set smaller until it fits on one line
        await p.waitForTimeout(200);
        const file = path.join(dir, `${f.n}-${f.name}.png`);
        await p.screenshot({ path: file, type: 'png', omitBackground: false, clip: { x: 0, y: 0, width: t.w, height: t.h } }); await c.close();
        made.push(file); log(`${path.relative(ROOT, file)}  ${t.w}x${t.h}`);
      }
    }
  } finally { await browser.close(); }
  return made;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
  const only = arg('--only') ? arg('--only').split(',') : null;
  makeShots({ only, out: arg('--out') }).then(m => console.log(`${m.length} frames written. Look at each one before it goes to a store.`)).catch(e => { console.error(e); process.exit(1); });
}
