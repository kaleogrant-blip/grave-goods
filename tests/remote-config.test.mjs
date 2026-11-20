import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, memPrefs, ROOT } from './helpers.mjs';
const RC = load('remote-config.js');
const shipped = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'config/config.json'), 'utf8'));
const game = () => {
  const g = base();
  let bonus = 0; // like the game: SKILL.seals.free is a getter over a captured base plus a relic bonus
  const b0 = g.SKILL.seals.free;
  Object.defineProperty(g.SKILL.seals, 'free', { configurable: true, enumerable: true, get() { return b0 + bonus; } });
  g.setBonus = n => { bonus = n; };
  return g;
};
const base = () => ({
  // the shapes and values v1.0-rc10 ships (the smoke test "config drift" checks config.json against the real game)
  SKILL: { targets: [900, 2700, 9000], ch2T1: 1200, firstReal: 600, deepMul: 1.6, long4: .5, seals: { free: 3, sack: 2, memory: 1 }, fever: { grace: 1, decay: .15 }, cap: { fame: Infinity, reward: Infinity }, mercy: { free: 2 },
    first: { tray: 6, red: .8, t3: 7500, coach: 3 }, bare: { free: 1, coach: 3 }, stakeT: [1, 1, 1, 1.05, 1.1, 1.15], untouched: 42 },
  LUCK: { press: { at: .8, w: { normal: 60, lucky: 30, tremor: 10 }, luckyMult: 2, tremorCrack: .06 }, coin: { min: 2700, p: .32, mult: 3 }, reels: { stop: [650, 1050, 1450] } },
  ECON: { gold: { sealDiv: 300, chest: 15, tomb: 5, daily: 50, fenceSalvage: 10, sieve: 5, cap: 99999999 } },
  TARGETS: [900, 2700, 9000, 14500], TARGETS_BASE: [900, 2700, 9000]
});
const mk = (over = {}) => ({ schema: 2, version: 3, ...over });
// The document an rc9b app could have cached or been served: schema 1, the old digits, the caps that rc10 switched off.
const RC9B_DOC = { schema: 1, version: 2, note: 'shipped values of the build this file was extracted from', flags: { ads: true, adMemory: true, adSeal: true }, ads: { memoryPerRun: 1, sealBonus: 1, cooldownSec: 30 },
  skill: { targets: [300, 900, 4500], ch2T1: 400, firstReal: 200, deepMul: 1.6, long4: .75, seals: { free: 3, sack: 2, memory: 1 }, fever: { grace: 1, decay: .15 }, cap: { fame: 120, reward: 1.5 }, mercy: { free: 2 }, rel2: 1.5 },
  econ: { gold: { sealDiv: 100, chest: 15, tomb: 5, daily: 50, fenceSalvage: 10, sieve: 5 } } };
const OLD_KEY = 'gg_remote_config_v1';

test('the shipped config.json validates against the schema', () => {
  const v = RC.validate(shipped()); assert.deepEqual(v.errors, []); assert.ok(v.ok);
  const f = shipped();
  assert.equal(f.flags.ads, false, 'rewarded videos are OFF in the shipped config (TestFlight) until real AdMob ids exist; a remote flag turns them on');
  assert.deepEqual(Object.keys(f.flags).sort(), ['adMemory', 'adSeal', 'ads'], 'two slips, no interstitial, no retired slips');
  assert.deepEqual(Object.keys(f.ads).sort(), ['cooldownSec', 'memoryPerRun', 'sealBonus']);
  assert.equal(f.luck, undefined, 'no luck odds in the remote document'); assert.equal(f.skill.press2, undefined);
  assert.equal(f.schema, 2, 'schema 2 is the rc10 document');
  assert.deepEqual(f.skill.targets, [900, 2700, 9000]); assert.equal(f.skill.ch2T1, 1200); assert.equal(f.skill.firstReal, 600); assert.equal(f.skill.long4, .5);
  assert.deepEqual(f.skill.first, { t3: 7500 }, 'of the first-tomb numbers only the chamber 3 target is in the document');
  assert.deepEqual(f.skill.bare, { free: 1 }); assert.deepEqual(f.skill.stakeT, [1, 1, 1, 1.05, 1.1, 1.15]); assert.equal(f.econ.gold.sealDiv, 300);
  assert.equal(f.skill.cap, undefined, 'both caps are off in rc10: they are not in the document');
});

test('rc10 keys: plain balance numbers are changeable inside strict ranges; the caps are gone; the first-tomb red line, tray size and coaching counts are not changeable', () => {
  for (const ok of [mk({ skill: { long4: .6 } }), mk({ skill: { first: { t3: 6000 } } }), mk({ skill: { first: { t3: 0 } } }), mk({ skill: { bare: { free: 2 } } }), mk({ skill: { bare: { free: 0 } } }),
    mk({ skill: { stakeT: [1, 1, 1, 1.05, 1.1, 1.1] } }), mk({ skill: { stakeT: [1, 1, 1, .95, .9, .85] } }), mk({ skill: { targets: [900, 2700, 9300] } })]) assert.deepEqual(RC.validate(ok).errors, [], JSON.stringify(ok));
  const bad = [
    mk({ skill: { cap: { fame: 120, reward: 1.5 } } }), mk({ skill: { cap: { fame: 120 } } }), mk({ skill: { cap: {} } }),       // removed caps: unknown key, whole document rejected
    mk({ skill: { first: { red: .5 } } }), mk({ skill: { first: { tray: 3 } } }), mk({ skill: { first: { coach: 9 } } }), mk({ skill: { bare: { coach: 9 } } }), // not changeable
    mk({ skill: { first: { t3: -1 } } }), mk({ skill: { first: { t3: 7500.5 } } }), mk({ skill: { first: 7500 } }),
    mk({ skill: { bare: { free: 4 } } }), mk({ skill: { bare: { free: -1 } } }), mk({ skill: { bare: { free: 1.5 } } }),
    mk({ skill: { stakeT: [1, 1, 1, 1.05, 1.1] } }), mk({ skill: { stakeT: [1, 1, 1, 1.05, 1.1, 1.6] } }), mk({ skill: { stakeT: [1, 1, 1, 1.05, 1.1, .5] } }), mk({ skill: { stakeT: [.9, 1, 1, 1.05, 1.1, 1.15] } }),
    mk({ skill: { stakeT: [1, 1, 1, '1.05', 1.1, 1.15] } }), mk({ skill: { stakeT: 1.1 } }), mk({ skill: { long4: 0 } }), mk({ skill: { long4: 2.5 } }),
    mk({ skill: { guard: { per: .01 } } }), mk({ skill: { tombs: [] } })
  ];
  for (const b of bad) assert.equal(RC.validate(b).ok, false, JSON.stringify(b));
  for (const k of ['cap', 'press2', 'guard']) assert.equal(RC.SCHEMA.skill[k], undefined, k + ' is not in the schema');
  assert.deepEqual(Object.keys(RC.SCHEMA.skill.first), ['t3']); assert.deepEqual(Object.keys(RC.SCHEMA.skill.bare), ['free']);
  // applied to the game's objects: the game holds SKILL.first and SKILL.bare by reference (FT, BARE), so they are written in place
  const g = game(), first = g.SKILL.first, bare = g.SKILL.bare, stakeT = g.SKILL.stakeT, ap = RC.createApplier(g);
  const done = ap.apply(mk({ skill: { long4: .6, first: { t3: 6000 }, bare: { free: 2 }, stakeT: [1, 1, 1, 1.05, 1.1, 1.1] } }));
  assert.deepEqual(done.sort(), ['skill.bare.free', 'skill.first.t3', 'skill.long4', 'skill.stakeT']);
  assert.equal(g.SKILL.first, first); assert.equal(g.SKILL.bare, bare); assert.equal(g.SKILL.stakeT, stakeT, 'same objects, changed in place');
  assert.deepEqual(first, { tray: 6, red: .8, t3: 6000, coach: 3 }); assert.deepEqual(bare, { free: 2, coach: 3 }); assert.deepEqual(stakeT, [1, 1, 1, 1.05, 1.1, 1.1]); assert.equal(g.SKILL.long4, .6);
  assert.deepEqual(g.SKILL.cap, { fame: Infinity, reward: Infinity }, 'the caps stay off: nothing can reach them');
  ap.apply(mk({})); assert.deepEqual(first, { tray: 6, red: .8, t3: 7500, coach: 3 }); assert.deepEqual(bare, { free: 1, coach: 3 }); assert.deepEqual(stakeT, [1, 1, 1, 1.05, 1.1, 1.15]); assert.equal(g.SKILL.long4, .5);
  // even an unvalidated document cannot switch a cap back on or move the red line
  const d2 = ap.apply({ schema: 2, version: 9, skill: { cap: { fame: 120, reward: 1.5 }, first: { red: .1, tray: 1, coach: 0 }, bare: { coach: 0 } } });
  assert.deepEqual(d2, []); assert.deepEqual(g.SKILL.cap, { fame: Infinity, reward: Infinity }); assert.deepEqual(first, { tray: 6, red: .8, t3: 7500, coach: 3 }); assert.deepEqual(bare, { free: 1, coach: 3 });
});

test('a document written for rc9b (schema 1, targets 300 / 900 / 4,500, the caps) is rejected whole; so is each of its old numbers inside a schema 2 document', () => {
  const v = RC.validate(RC9B_DOC); assert.equal(v.ok, false); assert.match(v.errors.join(' | '), /schema: must be 2/); assert.match(v.errors.join(' | '), /skill\.cap: unknown key/);
  // the smallest rc9b documents: nothing but the old schema number and one old value
  for (const d of [{ schema: 1, version: 2 }, { schema: 1, version: 9, skill: { targets: [300, 900, 4500] } }, { schema: 1, version: 9, flags: { ads: true } }]) assert.equal(RC.validate(d).ok, false, JSON.stringify(d));
  // second lock: with the schema number forged to 2, the old digit-sized values still fall under the floors
  for (const d of [mk({ skill: { targets: [300, 900, 4500] } }), mk({ skill: { ch2T1: 400 } }), mk({ econ: { gold: { sealDiv: 100 } } }), mk({ skill: { cap: { fame: 120, reward: 1.5 } } })]) assert.equal(RC.validate(d).ok, false, JSON.stringify(d));
});

test('v1 has no interstitial and no retired slips: a document that carries their keys is rejected whole', () => {
  for (const bad of [mk({ ads: { interstitialEvery: 3 } }), mk({ ads: { interstitialMinGapSec: 240 } }), mk({ flags: { adInterstitial: false } }), mk({ flags: { adInterstitial: true } }), mk({ flags: { adReroll: true } }), mk({ flags: { adChestPick: true } })]) {
    const v = RC.validate(bad); assert.equal(v.ok, false, JSON.stringify(bad)); assert.match(v.errors.join(' '), /unknown key/);
  }
  assert.ok(RC.validate(mk({ flags: { ads: true, adMemory: false, adSeal: true }, ads: { memoryPerRun: 1, sealBonus: 1, cooldownSec: 60 } })).ok);
});

test('luck odds are NOT remotely tunable: knucklebone chance, Press Your Luck weights, jackpot, tells and the Stake 2 shift are all rejected, and LUCK is never written', () => {
  const docs = [mk({ luck: { coin: { p: .5 } } }), mk({ luck: { coin: { mult: 2 } } }), mk({ luck: { press: { w: { normal: 1, lucky: 1, tremor: 98 } } } }), mk({ luck: { press: { at: .5 } } }),
    mk({ luck: { jackpot: { at: 1, gold: 0 } } }), mk({ luck: { near: { pct: .3 } } }), mk({ luck: { tell: { chance: 1 } } }), mk({ luck: {} }), mk({ skill: { press2: { lucky: -30, tremor: 30 } } })];
  for (const d of docs) { const v = RC.validate(d); assert.equal(v.ok, false, JSON.stringify(d)); assert.match(v.errors.join(' '), /unknown key/); }
  assert.equal(RC.SCHEMA.luck, undefined); assert.equal(RC.SCHEMA.skill.press2, undefined);
  // even handed an unvalidated document and the game's LUCK object, the applier has no path to it
  const g = game(); g.SKILL.press2 = { lucky: -2, tremor: 2 }; const before = JSON.stringify(g.LUCK), ap = RC.createApplier(g);
  const done = ap.apply(mk({ luck: { coin: { p: .95, mult: 6 }, press: { w: { normal: 0, lucky: 0, tremor: 100 } } }, skill: { press2: { lucky: 9, tremor: 9 } } }));
  assert.equal(JSON.stringify(g.LUCK), before, 'LUCK untouched'); assert.deepEqual(g.SKILL.press2, { lucky: -2, tremor: 2 }); assert.deepEqual(done, []);
  assert.ok(!ap.paths().some(p => /^luck\.|press2/.test(p)));
});

test('accepts a partial document', () => {
  assert.ok(RC.validate(mk({ econ: { gold: { chest: 20 } } })).ok);
  assert.ok(RC.validate(mk()).ok);
});

test('rejects unknown keys at any depth', () => {
  for (const bad of [mk({ hax: 1 }), mk({ skill: { gravity: 9 } }), mk({ skill: { seals: { free: 3, rigged: true } } }), mk({ econ: { gold: { cap: 1 } } }), mk({ flags: { ads: false, trackEverything: true } })]) {
    const v = RC.validate(bad); assert.equal(v.ok, false, JSON.stringify(bad)); assert.match(v.errors.join(' '), /unknown key/);
  }
});

test('rejects bad types, ranges and shapes', () => {
  const bad = [
    mk({ skill: { deepMul: '1.6' } }), mk({ skill: { seals: { free: 2.5 } } }), mk({ skill: { targets: [900, 2700] } }), mk({ skill: { targets: [2700, 900, 9000] } }),
    mk({ skill: { targets: [900, 'x', 9000] } }), mk({ skill: { fever: { decay: 1.5 } } }), mk({ skill: { fever: { decay: NaN } } }), mk({ flags: { ads: 'yes' } }), mk({ flags: [] }),
    mk({ econ: { gold: { sealDiv: 0 } } }), mk({ econ: { gold: { chest: -1 } } }), mk({ version: '3' }), mk({ version: 0 }), mk({ schema: 1 }), mk({ schema: 3 }), mk({ schema: '2' }),
    { version: 3 }, { schema: 2 }, null, [], 'x', 5
  ];
  for (const b of bad) assert.equal(RC.validate(b).ok, false, JSON.stringify(b));
});

test('applies allowed keys over the shipped values; everything else is left alone', () => {
  const g = game(), ap = RC.createApplier(g);
  const done = ap.apply(mk({ skill: { targets: [1000, 3000, 9900], seals: { free: 4 } }, econ: { gold: { chest: 25 } } }));
  assert.deepEqual(g.SKILL.targets, [1000, 3000, 9900]); assert.equal(g.SKILL.seals.free, 4); assert.equal(g.SKILL.seals.sack, 2);
  assert.equal(g.LUCK.coin.p, .32); assert.equal(g.LUCK.coin.mult, 3); assert.equal(g.ECON.gold.chest, 25); assert.equal(g.ECON.gold.cap, 99999999);
  assert.equal(g.SKILL.untouched, 42); assert.deepEqual(g.LUCK.reels.stop, [650, 1050, 1450]);
  assert.ok(done.includes('skill.targets'));
  assert.deepEqual(g.TARGETS, [900, 2700, 9000, 14500], 'TARGETS is the game\'s live per-chamber state: never written');
  assert.deepEqual(g.TARGETS_BASE, [1000, 3000, 9900]);
});

test('getter-backed values (SKILL.seals.free) keep their game logic and shift by the configured change; reset restores the getter', () => {
  const g = game(), ap = RC.createApplier(g);
  ap.apply(mk({ skill: { seals: { free: 4 } } })); assert.equal(g.SKILL.seals.free, 4);
  g.setBonus(1); assert.equal(g.SKILL.seals.free, 5, 'relic bonus still stacks on top');
  ap.apply(mk({})); assert.equal(g.SKILL.seals.free, 4, 'back to the shipped base 3 + the live bonus 1');
  g.setBonus(0); assert.equal(g.SKILL.seals.free, 3);
});

test('a later config reverts keys it no longer sets (always applied on top of the shipped values)', () => {
  const g = game(), ap = RC.createApplier(g);
  ap.apply(mk({ econ: { gold: { chest: 99 } }, skill: { targets: [1000, 3000, 9900] } }));
  ap.apply(mk({ skill: { deepMul: 1.7 } }));
  assert.equal(g.ECON.gold.chest, 15); assert.deepEqual(g.SKILL.targets, [900, 2700, 9000]); assert.deepEqual(g.TARGETS_BASE, [900, 2700, 9000]); assert.equal(g.SKILL.deepMul, 1.7);
});

test('paths the game does not have are skipped, never invented', () => {
  const g = game(); delete g.SKILL.rel2; const ap = RC.createApplier(g);
  const done = ap.apply(mk({ skill: { rel2: 2 } })); assert.equal(g.SKILL.rel2, undefined); assert.ok(!done.includes('skill.rel2'));
});

const resp = (body, ok = true, status = 200) => async () => ({ ok, status, json: async () => body });
function load2(fetch, prefs = memPrefs(), g = game()) {
  const rc = RC.createRemoteConfig({ fetch, prefs, AbortController, log: () => {} });
  return { rc, g, prefs, run: () => rc.load(g, 'https://cfg.example.com/config.json') };
}

test('remote config is fetched, applied, cached, and its version is exposed', async () => {
  const r = load2(resp(mk({ version: 5, flags: { ads: true }, econ: { gold: { chest: 30 } } })));
  const s = await r.run();
  assert.equal(s.version, 5); assert.equal(s.source, 'remote'); assert.equal(r.g.ECON.gold.chest, 30); assert.equal(s.flags.ads, true);
  assert.equal(JSON.parse(await r.prefs.get(RC.CACHE_KEY)).version, 5);
});

test('an invalid remote document applies NOTHING and is not cached', async () => {
  const r = load2(resp(mk({ version: 6, econ: { gold: { chest: 30 } }, skill: { evil: 1 } })));
  const s = await r.run();
  assert.equal(r.g.ECON.gold.chest, 15); assert.equal(s.version, 0); assert.ok(s.rejected && s.rejected.errors.length);
  assert.equal(await r.prefs.get(RC.CACHE_KEY), null);
});

test('a 2 s timeout falls back to the shipped values', async () => {
  const hang = (url, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(new Error('aborted'))));
  const r = load2(hang); const t0 = Date.now(); const s = await r.run(); const dt = Date.now() - t0;
  assert.ok(dt >= 1900 && dt < 2600, 'took ' + dt + ' ms'); assert.equal(s.version, 0); assert.equal(r.g.ECON.gold.chest, 15);
});

test('HTTP errors and network errors fall back; the cached document is used offline', async () => {
  const prefs = memPrefs({ [RC.CACHE_KEY]: JSON.stringify(mk({ version: 4, econ: { gold: { chest: 18 } } })) });
  for (const f of [resp({}, false, 500), async () => { throw new TypeError('offline'); }]) {
    const r = load2(f, prefs); const s = await r.run();
    assert.equal(s.version, 4); assert.equal(s.source, 'cache'); assert.equal(r.g.ECON.gold.chest, 18);
  }
});

test('a corrupt cache is ignored', async () => {
  const r = load2(async () => { throw new Error('x'); }, memPrefs({ [RC.CACHE_KEY]: '{not json' })); const s = await r.run();
  assert.equal(s.version, 0); assert.equal(r.g.ECON.gold.chest, 15);
});

test('no CONFIG_URL: only the cache is used and no request is made', async () => {
  let n = 0; const rc = RC.createRemoteConfig({ fetch: async () => { n++; return { ok: true, json: async () => mk() }; }, prefs: memPrefs(), AbortController });
  await rc.load(game(), ''); assert.equal(n, 0);
  assert.equal(RC.configUrl(''), ''); assert.equal(RC.configUrl('cfg.example.com/gg/'), 'https://cfg.example.com/gg/config.json'); assert.equal(RC.configUrl('https://a.b'), 'https://a.b/config.json');
});

// ---- upgrade from rc9b: what an older build left behind must never be applied to this one
const untouched = g => { assert.deepEqual(g.SKILL.targets, [900, 2700, 9000]); assert.deepEqual(g.TARGETS_BASE, [900, 2700, 9000]); assert.equal(g.SKILL.ch2T1, 1200); assert.equal(g.SKILL.firstReal, 600); assert.equal(g.SKILL.long4, .5);
  assert.deepEqual(g.SKILL.cap, { fame: Infinity, reward: Infinity }); assert.equal(g.ECON.gold.sealDiv, 300); assert.deepEqual(g.SKILL.first, { tray: 6, red: .8, t3: 7500, coach: 3 }); };

test('first launch of rc10 over rc9b: the last-good config rc9b cached (old key, old targets 300 / 900 / 4,500, old caps) is never applied, offline or online, and is deleted', async () => {
  // offline: nothing but the old cache to go on
  let r = load2(async () => { throw new TypeError('offline'); }, memPrefs({ [OLD_KEY]: JSON.stringify(RC9B_DOC) })); let s = await r.run();
  untouched(r.g); assert.equal(s.version, 0); assert.equal(s.source, 'shipped'); assert.deepEqual(s.flags, {}, 'not even its flags: rc9b\'s "ads on" does not carry over');
  assert.equal(await r.prefs.get(OLD_KEY), null, 'the rc9b cache is deleted'); assert.equal(await r.prefs.get(RC.CACHE_KEY), null);
  // no config URL at all (the default build): same
  r = load2(null, memPrefs({ [OLD_KEY]: JSON.stringify(RC9B_DOC) })); const rc = RC.createRemoteConfig({ fetch: null, prefs: r.prefs, AbortController }); s = await rc.load(r.g, '');
  untouched(r.g); assert.equal(s.version, 0); assert.equal(await r.prefs.get(OLD_KEY), null);
  // online, and the server answers with a fresh schema 2 document: that one is applied and cached under the new key
  r = load2(resp(mk({ version: 7, skill: { targets: [900, 2700, 9300] } })), memPrefs({ [OLD_KEY]: JSON.stringify(RC9B_DOC) })); s = await r.run();
  assert.equal(s.version, 7); assert.deepEqual(r.g.SKILL.targets, [900, 2700, 9300]); assert.equal(await r.prefs.get(OLD_KEY), null); assert.equal(JSON.parse(await r.prefs.get(RC.CACHE_KEY)).version, 7);
  assert.notEqual(RC.CACHE_KEY, OLD_KEY); assert.ok(RC.OLD_CACHE_KEYS.includes(OLD_KEY));
});

test('an rc9b document under the NEW cache key (or still served by the config host) is rejected whole, applies nothing, and a bad cache entry is dropped', async () => {
  for (const doc of [RC9B_DOC, { schema: 1, version: 9, skill: { targets: [300, 900, 4500] } }, { ...RC9B_DOC, schema: 2 }]) {
    const r = load2(async () => { throw new TypeError('offline'); }, memPrefs({ [RC.CACHE_KEY]: JSON.stringify(doc) })); const s = await r.run();
    untouched(r.g); assert.equal(s.version, 0); assert.equal(s.source, 'shipped'); assert.deepEqual(s.flags, {}); assert.ok(s.rejected && s.rejected.source === 'cache');
    assert.equal(await r.prefs.get(RC.CACHE_KEY), null, 'a cached document that does not validate is removed');
    const live = load2(resp(doc)); const s2 = await live.run();
    untouched(live.g); assert.equal(s2.version, 0); assert.ok(s2.rejected && s2.rejected.source === 'remote'); assert.equal(await live.prefs.get(RC.CACHE_KEY), null, 'and never cached');
  }
  // a good cache survives a server that still serves the rc9b file
  const good = mk({ version: 8, econ: { gold: { chest: 18 } } });
  const r = load2(resp(RC9B_DOC), memPrefs({ [RC.CACHE_KEY]: JSON.stringify(good) })); const s = await r.run();
  assert.equal(r.g.ECON.gold.chest, 18); untouched(r.g); assert.equal(JSON.parse(await r.prefs.get(RC.CACHE_KEY)).version, 8); assert.ok(s.rejected && s.rejected.source === 'remote');
});
