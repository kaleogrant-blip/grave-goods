#!/usr/bin/env node
/* GRAVE GOODS / RELIC WALL headless balance simulator.
 *
 * Faithful re-implementation of the pure logic in game-snapshot.html (chamber generation with the
 * seeded RNG, dirt, finds, ores, sarcophagi, strike(), score(), fever, collapse, chests, relic
 * appetites) with every tunable lifted into a parameter object (BASE = game as shipped, TUNED = the
 * recommended numbers). No DOM, no canvas, no audio, no libraries.
 *
 *   node sim.js verify                    parity check against the real game script (vm + DOM stubs)
 *   node sim.js grid   [base|tuned] [N]   class x gear x policy table (no relic)       default N=2000
 *   node sim.js relics [base|tuned] [N]   class x gear x relic, Setter policy          default N=300
 *   node sim.js typical [base|tuned] [N]  random gear + random relic per run, per class/policy
 *   node sim.js quick  [base|tuned] [N]   one line per class (Setter, typical build)
 *   node sim.js json   <setName> <cls> <gear> <relic|-> <policy> <N>   raw JSON for one cell
 *
 * Time model: ~1.3 s per tap, 2.5 s per seal (only matters for the Grave Candle's 8 s tick).
 * Bots are described at the bottom (Greedy / Setter / Cautious). They see what a player sees:
 * exposed tiles, partially exposed finds, relic glints on 1-deep dirt, teal ore glints, x-ray
 * reveals, Medium thumps (triangulated), Compass outline, Eye/Dowser. Chest choice is blind.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const COLS = 9, ROWS = 10;

/* ------------------------------------------------------------------ data tables (from the game) */
const SHAPE_CELLS = {
  Coin: [[0, 0]], Bone: [[0, 0], [1, 0]], Shard: [[0, 0], [0, 1]],
  Tablet: [[0, 0], [1, 0], [0, 1], [1, 1]], Spear: [[0, 0], [1, 0], [2, 0], [3, 0]],
  Crown: [[0, 0], [0, 1], [1, 1], [2, 1]], Mask: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]
};
const SHAPE_POOL = ['Coin', 'Coin', 'Bone', 'Shard', 'Tablet', 'Spear', 'Crown', 'Mask']; // order matters for RNG parity
const RELIC_DB = [ // game order
  ['Eye of Horus', 0], ['Heart Scarab', 0], ['Ankh', 0], ['Rosetta Stone', 0],
  ['Aegis of Athena', 1], ['Golden Fleece', 1], ["Pandora's Jar", 1], ['Shield of Achilles', 1],
  ['Mjölnir', 2], ['Brísingamen', 2], ['Gjallarhorn', 2], ['Draupnir', 2],
  ['Jade Mask of Pakal', 3], ['Dresden Codex', 3], ['Obsidian Blade', 3], ['Quetzal Headdress', 3]
].map(([n, civ]) => ({ n, civ }));
const RARITY = {
  'Ankh': 'uncommon', 'Heart Scarab': 'uncommon', 'Obsidian Blade': 'uncommon', 'Gjallarhorn': 'uncommon',
  'Eye of Horus': 'rare', 'Aegis of Athena': 'rare', 'Draupnir': 'rare', 'Dresden Codex': 'rare', 'Quetzal Headdress': 'rare', 'Brísingamen': 'rare',
  'Golden Fleece': 'epic', 'Shield of Achilles': 'epic', 'Jade Mask of Pakal': 'epic', "Pandora's Jar": 'epic',
  'Rosetta Stone': 'legendary', 'Mjölnir': 'legendary'
};
const TIER_ORDER = ['uncommon', 'rare', 'epic', 'legendary'];
const TIER_W = { uncommon: 5, rare: 3, epic: 2, legendary: 1 };
const ORE_POOL = ['gold', 'gold', 'quick', 'lode', 'flint', 'pyrite', 'pyrite'];
const ORE_NO_PYRITE = ORE_POOL.filter(x => x !== 'pyrite');
const GEAR_IDS = ['knuckle', 'glass', 'sack', 'dowser', 'candle', 'compass'];
const CLASS_IDS = ['scholar', 'brute', 'medium'];
const RELIC_NAMES = RELIC_DB.map(r => r.n);

// appetites. `fix` = the corrected predicate when P.fixes.bones is on
function wantFn(name, R, W, P) {
  switch (name) {
    case 'Eye of Horus': return f => f.civ === 0;
    case 'Heart Scarab': return f => f.age >= 10;
    case 'Ankh': return f => f.age <= 3;
    case 'Rosetta Stone': return f => f.civ === 1;
    case 'Aegis of Athena': return f => f.civ === 1;
    case 'Golden Fleece': return f => f.name === 'Coin';
    case 'Shield of Achilles': return f => f.worth >= 6;
    case 'Mjölnir': return f => f.civ === 2;
    case 'Brísingamen': return f => f.civ === 2 && f.age >= 7;
    case 'Gjallarhorn': return f => W.crack / maxCrack(R) > .6;
    case 'Draupnir': return f => f.age % 3 === 0;
    case 'Jade Mask of Pakal': return f => f.civ === 3;
    case 'Dresden Codex': return f => f.name === 'Tablet' || f.name === 'Shard';
    case 'Obsidian Blade': return P.fixes.bones ? (f => f.name === 'Bone' || f.name === 'Bones' || f.name === 'Spear') : (f => f.name === 'Bones' || f.name === 'Spear');
    case 'Quetzal Headdress': return f => f.name === 'Mask' || f.name === 'Crown';
  }
  return () => false;
}

/* ------------------------------------------------------------------ parameters */
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]); else a[k] = b[k]; } return a; }

const BASE = {
  name: 'base',
  targets: [60, 500, 4000],            // cumulative run.banked
  maxCrack: 60,
  classes: {
    scholar: { pickDmg: 1, pickCrack: 1, hamR: 1, hamDmg: 2, hamCrack: 7, hamBig: false, skill: true, hear: false },
    brute: { pickDmg: 1, pickCrack: 2, hamR: 1, hamDmg: 3, hamCrack: 4, hamBig: true, skill: false, hear: false },
    medium: { pickDmg: 1, pickCrack: 1, hamR: 1, hamDmg: 2, hamCrack: 5, hamBig: false, skill: false, hear: true }
  },
  mediumRelicMult: 3, mediumCommonMult: 0,
  gear: {
    knuckle: { pickDmg: 2, pickCrack: 2 },
    glass: { r: 2, dmg: 3, crack: 0, uses: 3 },
    sack: { mult: 1.5, seals: 1 },
    dowser: { commonDiv: 2 },
    candle: { crackMul: 1.2, secs: 8, tick: 1 },
    compass: {}
  },
  nFinds: [11, 13, 15],                // finds.length target INCLUDING the relic and the sarcophagus
  worth: { Coin: 2, Bone: 3, Shard: 3, Tablet: 6, Spear: 7, Crown: 8, Mask: 12 },
  shapePool: SHAPE_POOL,
  ageW: 1,                             // multiplier on the +age term in findWorth
  dirt: { topRows: 2, deepChance: .15 },
  relicWorth: 12, relicWorthStep: 5,   // wall relic: 12 + tierIndex*5
  sarcChance: .55, sarcCost: 10, sarcCostAegis: 5, mimicCrack: 15,
  sarcOdds: [.25, .55, .75, .90],      // cumulative: relic, 2 ores, bones, mimic, (rest = life/25g)
  sarcRelicWorth: 20, sarcBonesWorth: 5, sarcLifeGold: 25,
  ores: { n: 1, extraChance: .4 },
  sets: {
    dynMin: 3, dynBase: 2, dynBig: 3, dynBigAt: 5, rosettaScales: false,
    tlMin: 3, tl: null,                // tl: array indexed by run length -> multiplier; null = length itself
    relicMult: 2, hoardMin: 6, hoardMult: 2, sated: 2, fever: 3, gold: 2, fleece: 1.5, gjall: 3, draupnir: 8, jade: 2,
    fameCap: 0                         // 0 = no cap on total Fame
  },
  fever: { mode: 'orig', gain: .08, combo: .04, comboCap: 999, grace: 3, decay: .15, turns: 0 },
  tremor: { p: 0, extra: 0 },          // optional: chance a strike adds `extra` crack
  chest: [['ore', 4], ['life', 2], ['gold', 3], ['relic', 1], ['dust', 1]],
  chestGold: 30,
  fixes: { ankh: false, bones: false, glassMissUse: false, quickNoRelic: false },
  secPerTap: 1.3, secPerSeal: 2.5
};

const TUNED = merge(deepClone(BASE), {
  name: 'tuned',
  // filled in by the tuning pass; see out-balance.md
});

/* ------------------------------------------------------------------ RNG */
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
let rngState = 1;
function srand(seed) { rngState = seed >>> 0 || 1; }
function srnd() { let t = rngState += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function rnd(n) { return Math.floor(srnd() * n); }
function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ------------------------------------------------------------------ core helpers */
function maxCrack(R) { return R.gear === 'candle' ? Math.round(R.P.maxCrack * R.P.gear.candle.crackMul) : R.P.maxCrack; }
function pw(R, name) { return !!R.relic && R.relic.name === name && R.relic.state !== 'dormant'; }
const poolCache = {};
function relicPool(owned) {
  const key = owned.join('|'); if (poolCache[key]) return poolCache[key];
  const pool = []; RELIC_DB.forEach(r => { const w = TIER_W[RARITY[r.n]] * (owned.includes(r.n) ? 1 : 3); for (let k = 0; k < w; k++) pool.push(r); });
  return poolCache[key] = pool;
}
function rollRelic(R) { const pool = relicPool(R.owned); return pool[rnd(pool.length)]; }

function allOpen(W, f) { const c = f.cells; for (let i = 0; i < c.length; i++) if (W.dirt[c[i][1]][c[i][0]] !== 0) return false; return true; }
function exposedFinds(W) { const out = []; for (const f of W.finds) if (!f.banked && !f.sarc && allOpen(W, f)) out.push(f); return out; }
function exposedSarcs(W) { const out = []; for (const f of W.finds) if (f.sarc && !f.banked && allOpen(W, f)) out.push(f); return out; }
function sarcAt(W, x, y) { const o = W.owner[y][x]; if (o < 0) return null; const f = W.finds[o]; return f.sarc && !f.banked && allOpen(W, f) ? f : null; }

function findWorth(R, f) {
  const P = R.P, c = R.cls; let w = f.worth;
  if (f.relic) { if (c.hear) w *= P.mediumRelicMult; }
  else {
    if (c.hear) w = Math.ceil(w * P.mediumCommonMult);
    if (R.gear === 'dowser') w = Math.ceil(w / 2);
    if (pw(R, 'Jade Mask of Pakal') && f.civ === 3) w *= P.sets.jade;
  }
  return w + Math.round(f.age * P.ageW);
}

function score(R, W, list) {
  const P = R.P, S = P.sets; let worth = 0, fame = 1, dyn = 0, tl = 0, relics = 0;
  for (let i = 0; i < list.length; i++) { worth += findWorth(R, list[i]); if (list[i].relic) relics++; }
  const q = pw(R, 'Quetzal Headdress') ? 1 : 0;
  if (pw(R, 'Rosetta Stone')) {
    if (list.length >= 3) { fame *= (S.rosettaScales && list.length >= S.dynBigAt ? S.dynBig : S.dynBase) + q; dyn++; }
  } else {
    const cnt = [0, 0, 0, 0]; for (let i = 0; i < list.length; i++) cnt[list[i].civ]++;
    for (let c = 0; c < 4; c++) { const k = cnt[c]; if (k >= S.dynMin) { fame *= (k >= S.dynBigAt ? S.dynBig : S.dynBase) + q; dyn++; } }
  }
  if (list.length >= S.tlMin) {
    const seen = new Uint8Array(15); for (let i = 0; i < list.length; i++) seen[list[i].age] = 1;
    const br = pw(R, 'Brísingamen') ? 1 : 0; let run = 0;
    for (let a = 1; a <= 14; a++) {
      if (a <= 13 && seen[a]) run++;
      else { if (run >= S.tlMin) { fame *= (S.tl ? (S.tl[Math.min(run, S.tl.length - 1)]) : run) + br; tl++; } run = 0; }
    }
  }
  if (relics) fame *= S.relicMult * relics;
  if (list.length >= S.hoardMin) fame *= S.hoardMult;
  if (R.relic && R.relic.state === 'sated') fame *= S.sated;
  const fev = W.fever >= 1; if (fev) fame *= S.fever;
  if (R.gear === 'sack') fame *= R.P.gear.sack.mult;
  if (W.goldDust) fame *= S.gold;
  if (pw(R, 'Golden Fleece')) fame *= S.fleece;
  if (pw(R, 'Gjallarhorn') && W.crack / maxCrack(R) > .8) fame *= S.gjall;
  if (pw(R, 'Draupnir')) worth += S.draupnir * list.length;
  if (S.fameCap && fame > S.fameCap) fame = S.fameCap;
  fame = Math.round(fame * 10) / 10;
  return { worth, fame, total: Math.floor(worth * fame), dyn, tl, relics, fev, n: list.length };
}

/* ------------------------------------------------------------------ chamber generation (parity with newChamber) */
function genWall(R, i) {
  const P = R.P;
  srand(hashStr(R.seed + '#' + i + '#' + (R.tries = (R.tries || 0) + 1)));
  const dirt = [], owner = [];
  for (let y = 0; y < ROWS; y++) { dirt.push([]); owner.push([]); for (let x = 0; x < COLS; x++) { dirt[y].push(y < P.dirt.topRows ? 1 : 1 + rnd(2) + (srnd() < P.dirt.deepChance ? 1 : 0)); owner[y].push(-1); } }
  const finds = [];
  function place(cellsRel, data) {
    for (let t = 0; t < 200; t++) {
      const ox = rnd(COLS), oy = rnd(ROWS);
      const cells = cellsRel.map(([dx, dy]) => [ox + dx, oy + dy]);
      if (cells.some(([x, y]) => x >= COLS || y >= ROWS || owner[y][x] !== -1)) continue;
      if (cells.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => owner[y + b] && owner[y + b][x + a] !== undefined && owner[y + b][x + a] !== -1))) continue;
      const id = finds.length; cells.forEach(([x, y]) => owner[y][x] = id);
      finds.push(Object.assign({ id, cells, banked: false }, data)); return true;
    }
    return false;
  }
  const r = rollRelic(R);
  place([[0, 0], [1, 0], [0, 1], [1, 1]], { civ: r.civ, age: 1 + rnd(13), name: r.n, worth: P.relicWorth + TIER_ORDER.indexOf(RARITY[r.n] || 'uncommon') * P.relicWorthStep, relic: true });
  let hadSarc = false;
  if (R.mr() < P.sarcChance) hadSarc = place([[0, 0], [1, 0], [0, 1], [1, 1]], { civ: rnd(4), age: 0, name: 'Sarcophagus', worth: 0, sarc: true });
  let n = 0;
  while (finds.length < P.nFinds[i] && n < 80) {
    n++; const nm = P.shapePool[rnd(P.shapePool.length)];
    place(SHAPE_CELLS[nm], { civ: rnd(4), age: 1 + rnd(13), name: nm, worth: P.worth[nm] });
  }
  if (R.gear === 'compass') { const big = finds.filter(f => !f.relic).sort((a, b) => b.cells.length - a.cells.length)[0]; big.outlined = true; big.cells.forEach(([x, y]) => dirt[y][x] = 3); }
  const ores = []; const nOre = P.ores.n + (R.mr() < P.ores.extraChance ? 1 : 0);
  for (let t = 0; t < 100 && ores.length < nOre; t++) { const x = rnd(COLS), y = Math.min(ROWS - 1, rnd(ROWS) + rnd(3)); if (owner[y][x] !== -1 || ores.some(o => o.x === x && o.y === y)) continue; dirt[y][x] = Math.max(2, dirt[y][x]); ores.push({ x, y, type: ORE_POOL[rnd(ORE_POOL.length)], taken: false }); }
  if (R.relic && R.relic.state === 'sated') R.relic.state = 'hungry';
  if (pw(R, "Pandora's Jar")) { for (let t = 0; t < 200 && ores.length < nOre + 2; t++) { const x = rnd(COLS), y = rnd(ROWS); if (owner[y][x] !== -1 || ores.some(o => o.x === x && o.y === y)) continue; dirt[y][x] = Math.max(2, dirt[y][x]); ores.push({ x, y, type: ores.length === nOre ? 'pyrite' : ORE_POOL[rnd(5)], taken: false }); } }
  const W = {
    i, dirt, owner, finds, ores, crack: 0, over: false, skillUsed: false, glassUses: 0, sealed: 0, goldDust: false, flint: 0,
    fever: 0, combo: 0, miss: 0, feverLeft: 0, feverTrig: 0, codexXray: pw(R, 'Dresden Codex'), hadSarc, clock: 0,
    maxSeal: 0, sealVals: [], taps: 0, inputs: 0, cand: null, relicGone: false, lostValue: 0, sarcOpened: 0
  };
  return W;
}

/* ------------------------------------------------------------------ actions (strike / sarc / ores / seal / collapse) */
function toolSpec(R, W, tool) { // geometry + cost of a tool right now, or null if unavailable
  const P = R.P, c = R.cls;
  if (tool === 'pick') {
    const kn = R.gear === 'knuckle'; let dmg = kn ? P.gear.knuckle.pickDmg : c.pickDmg; if (pw(R, 'Obsidian Blade')) dmg = Math.max(dmg, 2);
    let crack = kn ? P.gear.knuckle.pickCrack : c.pickCrack; const line = W.flint > 0; if (line) crack += 2;
    return { tool, r: 0, big: 0, line, dmg, crack };
  }
  if (R.gear === 'glass') { if (W.glassUses >= P.gear.glass.uses) return null; return { tool, r: P.gear.glass.r, big: 0, line: false, dmg: P.gear.glass.dmg, crack: P.gear.glass.crack, glass: true }; }
  let crack = c.hamCrack; if (pw(R, 'Shield of Achilles')) crack = Math.max(0, crack - 3);
  return { tool, r: c.hamR, big: (c.hamBig || pw(R, 'Mjölnir')) ? 1 : 0, line: false, dmg: c.hamDmg, crack };
}

function advance(R, W, secs) {
  W.clock += secs;
  if (R.gear === 'candle') { const per = R.P.gear.candle.secs; while (W.clock >= per) { W.clock -= per; if (!W.over) { W.crack += R.P.gear.candle.tick; if (W.crack >= maxCrack(R)) { W.crack = maxCrack(R); doCollapse(R, W); } } } }
}

function strike(R, W, tool, cx, cy) { // returns {hit, hear} ; handles sarcophagus tap exactly like the game
  if (W.over) return { hit: 0 };
  const sc = sarcAt(W, cx, cy); if (sc) { openSarc(R, W, sc); return { hit: 1, sarc: true }; }
  const P = R.P, t = toolSpec(R, W, tool); if (!t) return { hit: 0 };
  if (t.glass && !P.fixes.glassMissUse) W.glassUses++;           // game increments before the hit test
  if (tool === 'pick' && W.flint > 0 && !P.fixes.glassMissUse) W.flint--;
  const x0 = cx - t.r - (t.line ? 1 : 0), y0 = cy - t.r, x1 = cx + t.r + t.big + (t.line ? 1 : 0), y1 = cy + t.r + t.big;
  let hit = 0; const opened = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
    const d = W.dirt[y][x]; if (d > 0) { W.dirt[y][x] = Math.max(0, d - t.dmg); hit++; if (W.dirt[y][x] === 0) opened.push([x, y]); }
  }
  if (!hit) return { hit: 0 };
  if (P.fixes.glassMissUse) { if (t.glass) W.glassUses++; if (tool === 'pick' && W.flint > 0) W.flint--; }
  let add = t.crack; if (P.tremor.p && R.mr() < P.tremor.p) add += P.tremor.extra;
  W.crack += add;
  // ---- fever
  const F = P.fever;
  if (F.mode === 'orig') {
    const findHits = opened.filter(([x, y]) => W.owner[y][x] >= 0 && !W.finds[W.owner[y][x]].banked).length;
    if (findHits > 0 && W.fever < 1) { W.combo++; W.miss = 0; W.fever = Math.min(1, W.fever + F.gain * findHits + F.combo * W.combo); if (W.fever >= 1) W.feverTrig++; }
    else if (findHits === 0 && W.fever < 1) { W.miss++; if (W.miss >= F.grace) { W.combo = 0; W.fever = Math.max(0, W.fever - F.decay); } }
  } else {
    // fixed: fever fills on COMPLETED finds (unique), expires after F.turns strikes once triggered
    const ids = new Set(); for (const [x, y] of opened) { const o = W.owner[y][x]; if (o >= 0) { const f = W.finds[o]; if (!f.banked && !f.sarc && allOpen(W, f)) ids.add(o); } }
    const done = ids.size;
    if (W.fever >= 1) { W.feverLeft--; if (W.feverLeft <= 0) { W.fever = 0; W.combo = 0; W.miss = 0; } }
    else if (done > 0) { W.combo = Math.min(F.comboCap, W.combo + 1); W.miss = 0; W.fever = Math.min(1, W.fever + F.gain * done + F.combo * W.combo); if (W.fever >= 1) { W.feverTrig++; W.feverLeft = F.turns; } }
    else { W.miss++; if (W.miss >= F.grace) { W.combo = 0; W.fever = Math.max(0, W.fever - F.decay); } }
  }
  // ---- ores
  let oreMsg = false;
  for (const [x, y] of opened) { const o = W.ores.find(o => !o.taken && o.x === x && o.y === y); if (o) { pickupOre(R, W, o); oreMsg = true; } }
  if (oreMsg) { if (W.crack >= maxCrack(R)) { W.crack = maxCrack(R); doCollapse(R, W); } return { hit, ore: true }; }
  let hear;
  if (R.cls.hear) { hear = 99; for (const f of W.finds) if (f.relic && !f.banked) for (const [x, y] of f.cells) hear = Math.min(hear, Math.abs(x - cx) + Math.abs(y - cy)); }
  if (W.crack >= maxCrack(R)) { W.crack = maxCrack(R); doCollapse(R, W); }
  return { hit, hear };
}

function pickupOre(R, W, o) {
  o.taken = true;
  if (o.type === 'pyrite') { R.banked += 1; R.S.pyrite++; return; }
  if (R.pouch.length >= 3) { o.taken = false; R.S.oreLost++; return; }
  R.pouch.push(o.type); R.S.oreGot++;
}

function openSarc(R, W, f) {
  const P = R.P, S = R.S; const cost = pw(R, 'Aegis of Athena') ? P.sarcCostAegis : P.sarcCost;
  if (W.crack + cost >= maxCrack(R)) return false;
  W.crack += cost; f.banked = true; W.sarcOpened++;
  const r = R.mr(), O = P.sarcOdds; let out;
  if (r < O[0]) {
    const rr = rollRelic(R); const id = W.finds.length;
    W.finds.push({ id, cells: f.cells, banked: false, civ: rr.civ, age: 1 + rnd(13), name: rr.n, worth: P.sarcRelicWorth, relic: true, fromSarc: true });
    f.cells.forEach(([x, y]) => W.owner[y][x] = id); out = 'relic';
  } else if (r < O[1]) {
    for (let k = 0; k < 2; k++) { const t = ORE_NO_PYRITE[rnd(5)]; if (R.pouch.length < 3) { R.pouch.push(t); S.oreGot++; } }
    out = 'ore';
  } else if (r < O[2]) {
    const id = W.finds.length; W.finds.push({ id, cells: f.cells, banked: false, civ: f.civ, age: 1 + rnd(13), name: 'Bones', worth: P.sarcBonesWorth });
    f.cells.forEach(([x, y]) => W.owner[y][x] = id); out = 'bones';
  } else if (r < O[3]) {
    if (pw(R, 'Aegis of Athena')) out = 'mimicBlocked'; else { W.crack = Math.min(maxCrack(R), W.crack + P.mimicCrack); out = 'mimic'; }
  } else { if (R.lives < 3) R.lives++; else R.banked += P.sarcLifeGold; out = 'life'; }
  S.sarcOut[out] = (S.sarcOut[out] || 0) + 1;
  if (W.crack >= maxCrack(R)) { W.crack = maxCrack(R); if (out === 'mimic') S.mimicCollapse++; doCollapse(R, W); }
  return true;
}

function lodePlan(R, W, cx, cy, apply) { // returns number of finds that became newly exposed (apply=true mutates)
  const owner = apply ? W.owner : W.owner.map(r => r.slice());
  const cellsOf = new Map(); W.finds.forEach(f => { if (!f.banked) cellsOf.set(f.id, f.cells.map(c => c.slice())); });
  const before = new Set(exposedFinds(W).map(f => f.id));
  const order = W.finds.filter(f => !f.banked).sort((a, b) => (Math.abs(a.cells[0][0] - cx) + Math.abs(a.cells[0][1] - cy)) - (Math.abs(b.cells[0][0] - cx) + Math.abs(b.cells[0][1] - cy)));
  for (const f of order) {
    const cells = cellsOf.get(f.id); const fx = cells[0][0], fy = cells[0][1]; const dx = Math.sign(cx - fx), dy = Math.sign(cy - fy);
    for (const [mx, my] of [[dx, 0], [0, dy]]) {
      if (!mx && !my) continue; const nc = cells.map(([x, y]) => [x + mx, y + my]);
      if (nc.every(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < ROWS && (owner[y][x] === -1 || owner[y][x] === f.id) && !W.ores.some(o => !o.taken && o.x === x && o.y === y))) {
        cells.forEach(([x, y]) => owner[y][x] = -1); nc.forEach(([x, y]) => owner[y][x] = f.id); cellsOf.set(f.id, nc); break;
      }
    }
  }
  let gain = 0;
  for (const f of order) { if (f.sarc) continue; const nc = cellsOf.get(f.id); if (!before.has(f.id) && nc.every(([x, y]) => W.dirt[y][x] === 0)) gain++; }
  if (apply) order.forEach(f => f.cells = cellsOf.get(f.id));
  return gain;
}

function doSeal(R, W, ex, s, S, i) {
  ex.forEach(f => f.banked = true); W.sealed++; W.goldDust = false;
  if (W.fever >= 1) S.sealFever[i]++;
  W.fever = 0; W.combo = 0; W.miss = 0; W.feverLeft = 0;
  R.banked += s.total; W.maxSeal = Math.max(W.maxSeal, s.total); W.sealVals.push(s.total);
  S.seals[i]++; S.sealVals[i].push(s.total); S.sealN[i] += ex.length;
  if (s.dyn) S.sealDyn[i]++; if (s.tl) S.sealTl[i]++;
  const rel = ex.filter(f => f.relic); if (rel.length) { S.relicSealed += rel.length; R.relicsThisRun += rel.length; W.relicGone = true; }
}

function doCollapse(R, W) {
  if (W.over) return; W.over = true; W.collapsed = true;
  const lost = exposedFinds(W); W.lostValue = lost.length ? score(R, W, lost).total : 0;
  R.S.relicLost += lost.filter(f => f.relic).length; R.S.lostValue += W.lostValue;
  R.pouch = [];
}

/* ------------------------------------------------------------------ run / chamber flow */
function newRunCtx(P, clsKey, gearId, relicName, seed, S) {
  return {
    P, cls: P.classes[clsKey], clsKey, gear: gearId, relic: relicName ? { name: relicName, state: 'hungry' } : null,
    owned: relicName ? [relicName] : [], banked: 0, pouch: [], lives: 3, scarabUsed: false, seed, tries: 0,
    mr: mulberry(hashStr('m' + seed)), br: mulberry(hashStr('b' + seed)), S, relicsThisRun: 0
  };
}

function newStats() {
  const z = () => [0, 0, 0], a = () => [[], [], []];
  return {
    runs: 0, wins: 0, reach: z(), clearRun: z(), wallAtt: z(), wallClear: z(), wallTaps: z(), wallInputs: z(), wallSecs: z(),
    feverTrig: z(), sealFever: z(), seals: z(), sealN: z(), sealDyn: z(), sealTl: z(), sealVals: a(), maxSealWall: a(),
    sarcWalls: z(), sarcExposed: z(), sarcOpened: z(), sarcOut: {}, mimicCollapse: 0, relicSealed: 0, relicLost: 0, relicChest: 0,
    collapses: z(), softlock: z(), lostValue: 0, finalBank: [], bigSeal3: 0, runMaxSeal: [], pyrite: 0, oreGot: 0, oreLost: 0, oreUsed: {},
    wallBank: a(), livesLeft: 0, feedCount: 0, wallsCh3: 0, wall3over50k: 0, wall3over20k: 0, wallFound: z(), fandLost: 0
  };
}

function playRun(P, clsKey, gearId, relicName, polName, seed, S) {
  const R = newRunCtx(P, clsKey, gearId, relicName, seed, S);
  S.runs++; let i = 0, runMax = 0;
  while (true) {
    S.reach[i]++;
    const res = playWall(R, i, polName, S);
    runMax = Math.max(runMax, res.maxSeal);
    if (res.clear) {
      S.clearRun[i]++;
      if (R.relic && R.relic.state === 'hungry') { if (P.fixes.ankh) { if (pw(R, 'Ankh') && R.lives < 3) R.lives++; } R.relic.state = 'dormant'; }
      if (!P.fixes.ankh && pw(R, 'Ankh') && R.lives < 3) R.lives++;
      if (i === 2) { S.wins++; break; }
      chest(R);
      i++;
    } else {
      if (pw(R, 'Heart Scarab') && !R.scarabUsed) R.scarabUsed = true; else R.lives--;
      if (R.relic && R.relic.state === 'hungry') R.relic.state = 'dormant';
      if (R.lives <= 0) break;
    }
  }
  S.finalBank.push(R.banked); S.runMaxSeal.push(runMax); S.livesLeft += Math.max(0, R.lives);
  return R;
}

function chest(R) {
  const P = R.P, pool = []; P.chest.forEach(([k, w]) => { for (let j = 0; j < w; j++) pool.push(k); });
  // game: pool[rnd(len)] x3 drawn with srnd, player picks blind
  const picks = [pool[rnd(pool.length)], pool[rnd(pool.length)], pool[rnd(pool.length)]];
  const t = picks[Math.floor(R.br() * 3)];
  if (t === 'ore') { const o = ORE_NO_PYRITE[rnd(5)]; if (R.pouch.length < 3) R.pouch.push(o); }
  else if (t === 'life') { if (R.lives < 3) R.lives++; else R.banked += 25; }
  else if (t === 'gold') R.banked += P.chestGold;
  else if (t === 'relic') R.S.relicChest++;
}

/* ------------------------------------------------------------------ bots */
const POLICIES = {
  // seal rules: each returns true if the bot should seal right now (win / forced-by-danger handled in the loop)
  greedy: { name: 'Greedy', tools: 'hammer', margin: 0, sealAt: .85, sarcCrackFrac: 1.0, cheapSeal: false, setAware: false, flint: false, lode: false, goldMin: 40 },
  setter: { name: 'Setter', tools: 'both', margin: 1, sealAt: 2, sarcCrackFrac: .90, setAware: true, flint: true, lode: true, goldMin: 0 },
  cautious: { name: 'Cautious', tools: 'both', margin: 4, sealAt: .45, sarcCrackFrac: .62, cheapSeal: true, setAware: false, flint: true, lode: false, goldMin: 0 }
};

function isKnown(R, W, f, dowse) {
  if (f.banked || f.sarc) return false;
  if (f.xr || f.outlined) return true;
  let any1 = false;
  for (const [x, y] of f.cells) { const d = W.dirt[y][x]; if (d === 0) return true; if (d === 1) any1 = true; }
  if (f.relic && (dowse || any1)) return true;
  return false;
}

function planStrike(R, W, pol) {
  const P = R.P; const dowse = R.gear === 'dowser' || pw(R, 'Eye of Horus');
  const ex = exposedFinds(W);
  const layerW = new Float32Array(COLS * ROWS);
  const U = R.cls.hear ? 0.8 : 1.0; // value of one unexplored dirt layer
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (W.dirt[y][x] > 0) layerW[y * COLS + x] = U;
  // known, not-yet-exposed finds
  const known = W.finds.filter(f => !f.banked && !f.sarc && !allOpen(W, f) && isKnown(R, W, f, dowse));
  if (known.length) {
    let vals;
    if (pol.setAware) {
      const poolList = ex.concat(known); const base = score(R, W, poolList).total;
      vals = known.map(f => base - score(R, W, poolList.filter(g => g !== f)).total);
    } else vals = known.map(f => findWorth(R, f) * (f.relic ? 2 : 1));
    known.forEach((f, k) => {
      const v = Math.max(2, vals[k]); let layers = 0; for (const [x, y] of f.cells) layers += W.dirt[y][x];
      const lw = v / Math.max(1, layers); for (const [x, y] of f.cells) if (W.dirt[y][x] > 0) layerW[y * COLS + x] = Math.max(lw, 0.01) + 0.0;
    });
  }
  // visible ores (teal glint at depth <= 2) are worth a few layers
  if (R.pouch.length < 3) for (const o of W.ores) if (!o.taken && o.type !== 'pyrite' && W.dirt[o.y][o.x] > 0 && W.dirt[o.y][o.x] <= 2) layerW[o.y * COLS + o.x] += 2.5;
  // Medium: triangulated relic posterior
  if (R.cls.hear && W.cand && !W.relicGone && !known.some(f => f.relic)) {
    let m = 0; const hits = new Float32Array(COLS * ROWS);
    for (let oy = 0; oy < ROWS - 1; oy++) for (let ox = 0; ox < COLS - 1; ox++) if (W.cand[oy * (COLS - 1) + ox]) { m++; hits[oy * COLS + ox]++; hits[oy * COLS + ox + 1]++; hits[(oy + 1) * COLS + ox]++; hits[(oy + 1) * COLS + ox + 1]++; }
    if (m > 0) { const relicVal = (P.relicWorth * P.mediumRelicMult + 20) * 2.2; for (let k = 0; k < hits.length; k++) if (layerW[k] > 0) layerW[k] += relicVal * (hits[k] / m) / 4; }
  }
  const tools = [];
  const ham = toolSpec(R, W, 'hammer'), pick = toolSpec(R, W, 'pick');
  if (pol.tools === 'hammer') { if (ham) tools.push(ham); else tools.push(pick); } else { if (ham) tools.push(ham); tools.push(pick); }
  let best = null, bestU = 1e-9;
  for (const t of tools) {
    for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) {
      const x0 = cx - t.r - (t.line ? 1 : 0), y0 = cy - t.r, x1 = cx + t.r + t.big + (t.line ? 1 : 0), y1 = cy + t.r + t.big;
      let u = 0;
      for (let y = Math.max(0, y0); y <= Math.min(ROWS - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(COLS - 1, x1); x++) {
        const d = W.dirt[y][x]; if (d > 0) u += layerW[y * COLS + x] * Math.min(t.dmg, d);
      }
      if (u <= 0) continue;
      u = u / (t.crack + 0.6) * (1 + (R.br() - .5) * .04);
      if (u > bestU) { bestU = u; best = { tool: t.tool, cx, cy, crack: t.crack, u }; }
    }
  }
  return best;
}

function pickXrayCenter(R, W) {
  let best = null, bu = -1;
  for (let cy = 1; cy < ROWS - 1; cy++) for (let cx = 1; cx < COLS - 1; cx++) {
    let u = 0; for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) if (W.dirt[y][x] > 0) u += W.dirt[y][x] + (y >= 2 ? 1 : 0);
    u += R.br() * .5; if (u > bu) { bu = u; best = [cx, cy]; }
  }
  return best;
}

function doXray(R, W, cx, cy) {
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) { const o = W.owner[y][x]; if (o >= 0 && W.dirt[y][x] > 0) W.finds[o].xr = true; }
  if (W.codexXray) W.codexXray = false; else W.skillUsed = true;
}

function useOreIdx(R, W, k) { const t = R.pouch.splice(k, 1)[0]; R.S.oreUsed[t] = (R.S.oreUsed[t] || 0) + 1; return t; }

function playWall(R, i, polName, S) {
  const P = R.P, pol = POLICIES[polName], tgt = P.targets[i];
  const W = genWall(R, i); R.W = W;
  S.wallAtt[i]++; if (W.hadSarc) S.sarcWalls[i]++;
  if (R.cls.hear) W.cand = new Uint8Array((COLS - 1) * (ROWS - 1)).fill(1);
  let guard = 0, xrayDone = false, taps = 0, inputs = 0, secs = 0;
  const max = maxCrack(R);
  const tick = (s) => { secs += s; advance(R, W, s); };
  while (!W.over && guard++ < 700) {
    const ex = exposedFinds(W); const need = tgt - R.banked;
    let s = ex.length ? score(R, W, ex) : null;
    const canSeal = !(R.gear === 'sack' && W.sealed >= 1);
    // ---- relic feeding
    if (R.relic && R.relic.state !== 'sated') {
      const nm = R.relic.name;
      if (nm === "Pandora's Jar") {
        const k = R.pouch.findIndex(t => t !== 'pyrite');
        if (k >= 0) { useOreIdx(R, W, k); R.relic.state = 'sated'; inputs++; S.feedCount++; tick(1); continue; }
      } else {
        const want = wantFn(nm, R, W, P);
        const cands = ex.filter(f => !f.relic && !f.sarc && want(f));
        if (cands.length) {
          cands.sort((a, b) => findWorth(R, a) - findWorth(R, b)); const f = cands[0];
          f.banked = true; f.lost = true; R.relic.state = 'sated'; taps += 2; inputs += 2; S.feedCount++; tick(2.2); continue;
        }
      }
    }
    // ---- x-ray (Scholar skill and/or Dresden Codex), once the first strike has landed
    if (W.taps >= 1 && ((R.cls.skill && !W.skillUsed) || W.codexXray)) { const c = pickXrayCenter(R, W); doXray(R, W, c[0], c[1]); inputs += 2; tick(2); continue; }
    // ---- Quicksilver right after a seal (nothing exposed to lose)
    if (!ex.length && W.crack >= .5 * max && R.pouch.includes('quick')) {
      useOreIdx(R, W, R.pouch.indexOf('quick')); W.crack = Math.max(0, W.crack - Math.round(max * .25)); inputs++; tick(1); continue;
    }
    // ---- sarcophagus
    const sarcs = exposedSarcs(W);
    if (sarcs.length) {
      const cost = pw(R, 'Aegis of Athena') ? P.sarcCostAegis : P.sarcCost; const worst = pw(R, 'Aegis of Athena') ? 0 : P.mimicCrack;
      const ok = polName === 'greedy' ? (W.crack + cost < max) : (W.crack + cost + worst <= pol.sarcCrackFrac * max);
      if (ok) { const f = sarcs[0]; const [cx, cy] = f.cells[0]; const r = strike(R, W, 'pick', cx, cy); taps++; W.taps++; inputs++; tick(P.secPerTap); continue; }
    }
    // ---- plan the next strike
    let plan = planStrike(R, W, pol);
    if (plan && plan.tool === 'pick' && pol.flint && R.pouch.includes('flint') && W.flint === 0) { useOreIdx(R, W, R.pouch.indexOf('flint')); W.flint = 3; inputs++; tick(1); plan = planStrike(R, W, pol); }
    // ---- lodestone (Setter): use when a pull would complete a find
    if (pol.lode && R.pouch.includes('lode') && ex.length < 12) {
      let bestG = 0, bc = null; const opens = [];
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (W.dirt[y][x] === 0) opens.push([x, y]);
      for (let t = 0; t < Math.min(14, opens.length); t++) { const c = opens[Math.floor(R.br() * opens.length)]; const g = lodePlan(R, W, c[0], c[1], false); if (g > bestG) { bestG = g; bc = c; } }
      if (bc && bestG >= 1) { useOreIdx(R, W, R.pouch.indexOf('lode')); lodePlan(R, W, bc[0], bc[1], true); R.S.lodeGain += bestG; inputs += 2; tick(2); continue; }
    }
    // ---- seal decision
    let doIt = false;
    if (ex.length && canSeal) {
      if (s.total >= need) doIt = true;
      else if (R.pouch.includes('gold') && !W.goldDust && s.total * P.sets.gold >= need && polName !== 'greedy') { useOreIdx(R, W, R.pouch.indexOf('gold')); W.goldDust = true; inputs++; tick(1); s = score(R, W, ex); doIt = s.total >= need; }
      if (!doIt) {
        if (!plan) doIt = true;
        else if (W.crack + plan.crack + pol.margin + (P.tremor.p ? P.tremor.extra * (polName === 'greedy' ? 0 : polName === 'setter' ? .5 : 1) : 0) + (R.gear === 'candle' ? 2 : 0) >= max) doIt = true;
        else if (polName === 'greedy') { if (W.crack >= pol.sealAt * max) doIt = true; }
        else if (polName === 'setter') {
          if (P.fever.turns && W.fever >= 1 && W.feverLeft <= 1 && s.total >= 0.12 * Math.max(need, 1)) doIt = true;      // cash the fever before it lapses
          else if (R.gear === 'sack') doIt = false;                                                                           // one seal only: hold for the end
        } else if (polName === 'cautious') {
          if (R.gear !== 'sack' && (ex.length >= 2 || W.crack >= pol.sealAt * max)) doIt = true;
        }
      }
      if (doIt && R.pouch.includes('gold') && !W.goldDust && (polName === 'greedy' ? s.total >= pol.goldMin : (s.total >= 0.4 * Math.max(need, 1) || R.pouch.length === 3)) && canSeal) { useOreIdx(R, W, R.pouch.indexOf('gold')); W.goldDust = true; inputs++; tick(1); s = score(R, W, ex); }
    }
    if (doIt) {
      doSeal(R, W, ex, s, S, i); inputs++; tick(P.secPerSeal);
      if (R.banked >= tgt) { W.over = true; W.cleared = true; }
      continue;
    }
    if (!plan) { // nothing to dig, nothing to seal: the game soft-locks here
      S.softlock[i]++; W.softlock = true; doCollapse(R, W); break;
    }
    // ---- strike
    const r = strike(R, W, plan.tool, plan.cx, plan.cy);
    taps++; W.taps++; inputs++; tick(P.secPerTap);
    if (R.cls.hear && r.hear !== undefined && W.cand) {
      const h = r.hear; let any = false;
      for (let oy = 0; oy < ROWS - 1; oy++) for (let ox = 0; ox < COLS - 1; ox++) { const k = oy * (COLS - 1) + ox; if (!W.cand[k]) continue; const d = Math.min(Math.abs(plan.cx - ox) + Math.abs(plan.cy - oy), Math.abs(plan.cx - ox - 1) + Math.abs(plan.cy - oy), Math.abs(plan.cx - ox) + Math.abs(plan.cy - oy - 1), Math.abs(plan.cx - ox - 1) + Math.abs(plan.cy - oy - 1)); if (d !== h) W.cand[k] = 0; else any = true; }
      if (!any) { W.cand.fill(1); if (h >= 99) W.relicGone = true; }
    }
  }
  // ---- wall accounting
  const clear = !!W.cleared;
  if (!clear && !W.over) { W.over = true; }
  if (!clear) S.collapses[i]++;
  S.wallTaps[i] += taps; S.wallInputs[i] += inputs; S.wallSecs[i] += secs; S.feverTrig[i] += W.feverTrig; S.sarcOpened[i] += W.sarcOpened;
  if (W.hadSarc && W.finds.some(f => f.sarc)) { /* counted below */ }
  S.sarcExposed[i] += W.finds.some(f => f.sarc && (f.banked || allOpen(W, f))) ? 1 : 0;
  if (clear) S.wallClear[i]++;
  S.maxSealWall[i].push(W.maxSeal);
  if (i === 2) { S.wallsCh3++; if (W.maxSeal >= 50000) S.wall3over50k++; if (W.maxSeal >= 20000) S.wall3over20k++; }
  return { clear, maxSeal: W.maxSeal };
}

/* ------------------------------------------------------------------ batch runner & stats */
function runBatch(P, clsKey, gearId, relicName, polName, n, seedBase, randomBuild) {
  const S = newStats();
  for (let k = 0; k < n; k++) {
    let g = gearId, rel = relicName;
    if (randomBuild) { const q = mulberry(hashStr('bld' + seedBase + k)); g = GEAR_IDS[Math.floor(q() * 6)]; const ri = Math.floor(q() * 17); rel = ri === 16 ? null : RELIC_NAMES[ri]; if (randomBuild === 'gear') rel = null; if (randomBuild === 'relic') g = gearId; }
    const R = playRun(P, clsKey, g, rel, polName, 's' + seedBase + '_' + k, S);
    S.relicAcq = (S.relicAcq || 0);
  }
  return S;
}
function pct(a, p) { if (!a.length) return 0; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(p * b.length))]; }
function mergeStats(a, b) {
  for (const k in b) {
    const v = b[k];
    if (typeof v === 'number') a[k] = (a[k] || 0) + v;
    else if (Array.isArray(v)) { if (Array.isArray(v[0])) v.forEach((x, j) => a[k][j] = a[k][j].concat(x)); else if (typeof v[0] === 'number' || v.length === 0) { if (k === 'finalBank' || k === 'runMaxSeal') a[k] = a[k].concat(v); else v.forEach((x, j) => a[k][j] += x); } }
    else if (v && typeof v === 'object') { for (const q in v) a[k][q] = (a[k][q] || 0) + v[q]; }
  }
  return a;
}
function summarize(S) {
  const f = (x, d) => d ? x / d : 0; const out = { runs: S.runs, win: f(S.wins, S.runs) };
  out.ch = [0, 1, 2].map(i => ({
    reach: f(S.reach[i], S.runs),
    clearRun: f(S.clearRun[i], S.reach[i]),                 // reached chamber -> eventually cleared it
    clearWall: f(S.wallClear[i], S.wallAtt[i]),            // single wall clears
    walls: f(S.wallAtt[i], S.reach[i]),                    // walls dug per run that reached it
    taps: f(S.wallTaps[i], S.wallAtt[i]), inputs: f(S.wallInputs[i], S.wallAtt[i]), secs: f(S.wallSecs[i], S.wallAtt[i]),
    fever: f(S.feverTrig[i], S.wallAtt[i]), feverSealShare: f(S.sealFever[i], S.seals[i]),
    seals: f(S.seals[i], S.wallAtt[i]), sealMed: pct(S.sealVals[i], .5), sealP95: pct(S.sealVals[i], .95), maxSealMed: pct(S.maxSealWall[i], .5), maxSealP95: pct(S.maxSealWall[i], .95),
    sarcExposed: f(S.sarcExposed[i], S.wallAtt[i]), sarcOpened: f(S.sarcOpened[i], S.wallAtt[i]), sarcWalls: f(S.sarcWalls[i], S.wallAtt[i]),
    collapse: f(S.collapses[i], S.wallAtt[i]), softlock: f(S.softlock[i], S.wallAtt[i])
  }));
  const so = S.sarcOut, st = Object.values(so).reduce((x, y) => x + y, 0);
  out.sarc = { opened: st, out: Object.fromEntries(Object.entries(so).map(([k, v]) => [k, f(v, st)])) };
  out.relicSealedPerRun = f(S.relicSealed, S.runs); out.relicChestPerRun = f(S.relicChest, S.runs); out.relicLostPerRun = f(S.relicLost, S.runs);
  out.finalBankMed = pct(S.finalBank, .5); out.finalBankP95 = pct(S.finalBank, .95);
  out.ch3over50k = f(S.wall3over50k, S.wallsCh3); out.ch3over20k = f(S.wall3over20k, S.wallsCh3); out.ch3walls = S.wallsCh3;
  out.livesLeft = f(S.livesLeft, S.runs);
  out.oreUsed = S.oreUsed; out.oreGot = f(S.oreGot, S.runs); out.oreLost = f(S.oreLost, S.runs);
  return out;
}

/* ------------------------------------------------------------------ parameter sets by name */
function getSet(name) { return name === 'tuned' ? TUNED : name === 'base' ? BASE : (() => { try { return merge(deepClone(BASE), JSON.parse(name)); } catch (e) { throw new Error('unknown set ' + name); } })(); }

/* ------------------------------------------------------------------ worker pool */
function runJobs(jobs, nWorkers) {
  return new Promise(resolve => {
    const results = new Array(jobs.length); let next = 0, done = 0;
    const workers = [];
    const feed = (w) => { if (next >= jobs.length) { w.terminate(); return; } const id = next++; w.postMessage({ id, job: jobs[id] }); };
    for (let k = 0; k < Math.min(nWorkers, jobs.length); k++) {
      const w = new Worker(__filename, { workerData: { worker: true } }); workers.push(w);
      w.on('message', m => { results[m.id] = m.S; done++; if (process.env.SIM_PROGRESS) process.stderr.write(`\r${done}/${jobs.length}`); if (done === jobs.length) { if (process.env.SIM_PROGRESS) process.stderr.write('\n'); resolve(results); } feed(w); });
      feed(w);
    }
  });
}
if (!isMainThread && workerData && workerData.worker) {
  parentPort.on('message', ({ id, job }) => {
    const P = getSet(job.set); if (job.over) merge(P, job.over);
    const S = runBatch(P, job.cls, job.gear, job.relic, job.pol, job.n, job.seed || 0, job.random);
    parentPort.postMessage({ id, S });
  });
}

/* ------------------------------------------------------------------ CLI */
const f1 = x => (x * 100).toFixed(0) + '%', n0 = x => Math.round(x).toLocaleString('en-US'), d1 = x => x.toFixed(1);
async function main() {
  const [cmd, a1, a2, a3, a4, a5, a6] = process.argv.slice(2);
  const nW = Math.max(1, require('os').cpus().length);
  if (cmd === 'verify') return require('./sim-verify.js');
  if (cmd === 'json') { const P = getSet(a1); const S = runBatch(P, a2, a3, a4 === '-' ? null : a4, a5, +a6 || 500, 7); console.log(JSON.stringify(summarize(S), null, 1)); return; }
  const set = a1 || 'base'; const P = getSet(set);
  if (cmd === 'quick' || cmd === 'typical') {
    const N = +a2 || 1500; const jobs = [];
    for (const c of CLASS_IDS) for (const pol of ['greedy', 'setter', 'cautious']) jobs.push({ set, cls: c, gear: null, relic: null, pol, n: N, seed: 11, random: 'both' });
    const res = await runJobs(jobs, nW);
    console.log(`set=${set}  typical build (random gear, random relic or none)  N=${N}/cell`);
    jobs.forEach((j, k) => { const o = summarize(res[k]); console.log(`${j.cls.padEnd(8)} ${j.pol.padEnd(9)} win ${f1(o.win).padStart(4)}  ch1 ${f1(o.ch[0].clearRun)} ch2 ${f1(o.ch[1].clearRun)} ch3|reach ${f1(o.ch[2].clearRun)}  taps ${o.ch.map(c => d1(c.taps)).join('/')}  fever ${o.ch.map(c => d1(c.fever)).join('/')}  medSeal ${o.ch.map(c => n0(c.sealMed)).join('/')}`); });
    return;
  }
  if (cmd === 'grid') {
    const N = +a2 || 2000; const jobs = [];
    for (const c of CLASS_IDS) for (const g of GEAR_IDS) for (const pol of ['greedy', 'setter', 'cautious']) jobs.push({ set, cls: c, gear: g, relic: null, pol, n: N, seed: 3 });
    const res = await runJobs(jobs, nW);
    fs.writeFileSync(path.join(__dirname, `grid-${set}.json`), JSON.stringify(jobs.map((j, k) => ({ j, o: summarize(res[k]) }))));
    console.log(`set=${set} N=${N}`); console.log('class gear policy | win | clear/run ch1 ch2 ch3 | wall-clear ch1 ch2 ch3 | taps/wall ch1 ch2 ch3 | fever/wall | sealMed ch1 ch2 ch3 | sealP95 ch1 ch2 ch3');
    jobs.forEach((j, k) => { const o = summarize(res[k]); console.log([j.cls, j.gear, j.pol, f1(o.win), o.ch.map(c => f1(c.clearRun)).join(' '), '|', o.ch.map(c => f1(c.clearWall)).join(' '), '|', o.ch.map(c => d1(c.taps)).join(' '), '|', o.ch.map(c => d1(c.fever)).join(' '), '|', o.ch.map(c => n0(c.sealMed)).join(' '), '|', o.ch.map(c => n0(c.sealP95)).join(' ')].join('  ')); });
    return;
  }
  if (cmd === 'relics') {
    const N = +a2 || 300; const jobs = []; const pol = a3 || 'setter';
    for (const c of CLASS_IDS) for (const g of GEAR_IDS) for (const r of [null, ...RELIC_NAMES]) jobs.push({ set, cls: c, gear: g, relic: r, pol, n: N, seed: 5 });
    const res = await runJobs(jobs, nW);
    const rows = jobs.map((j, k) => ({ j, o: summarize(res[k]) }));
    fs.writeFileSync(path.join(__dirname, `relics-${set}.json`), JSON.stringify(rows));
    rows.sort((x, y) => y.o.win - x.o.win);
    console.log(`set=${set} N=${N} pol=${pol}  top 25 / bottom 10 builds by run win rate`);
    const line = ({ j, o }) => `${j.cls.padEnd(7)} ${j.gear.padEnd(8)} ${(j.relic || '-').padEnd(20)} win ${f1(o.win).padStart(4)} ch3|reach ${f1(o.ch[2].clearRun).padStart(4)} ch3 medSeal ${n0(o.ch[2].sealMed).padStart(7)} p95 ${n0(o.ch[2].sealP95).padStart(8)} P(seal>=50k) ${f1(o.ch3over50k)}`;
    rows.slice(0, 25).forEach(r => console.log(line(r))); console.log('...'); rows.slice(-10).forEach(r => console.log(line(r)));
    return;
  }
  console.log('usage: node sim.js verify | grid | relics | typical | quick | json');
}
if (isMainThread && require.main === module) main();
module.exports = { BASE, TUNED, getSet, runBatch, summarize, playRun, newStats, genWall, newRunCtx, score, findWorth, strike, srand, srnd, rnd, hashStr, mulberry, toolSpec, exposedFinds, GEAR_IDS, CLASS_IDS, RELIC_NAMES, merge, deepClone, openSarc, maxCrack, COLS, ROWS };
