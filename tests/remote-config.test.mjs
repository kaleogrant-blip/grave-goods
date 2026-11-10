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
  SKILL: { targets: [300, 900, 4500], ch2T1: 500, firstReal: 200, deepMul: 1.6, long4: .75, seals: { free: 3, sack: 2, memory: 1 }, fever: { grace: 1, decay: .15 }, cap: { fame: 120, reward: 1.5 }, mercy: { free: 2 }, untouched: 42 },
  LUCK: { press: { at: .8, w: { normal: 60, lucky: 30, tremor: 10 }, luckyMult: 2, tremorCrack: .06 }, coin: { min: 2500, p: .32, mult: 3 }, reels: { stop: [650, 1050, 1450] } },
  ECON: { gold: { sealDiv: 100, chest: 15, tomb: 5, daily: 50, fenceSalvage: 10, sieve: 5, cap: 99999999 } },
  TARGETS: [300, 900, 4500, 9000], TARGETS_BASE: [300, 900, 4500]
});
const mk = (over = {}) => ({ schema: 1, version: 2, ...over });

test('the shipped config.json validates against the schema', () => {
  const v = RC.validate(shipped()); assert.deepEqual(v.errors, []); assert.ok(v.ok);
  const f = shipped();
  assert.equal(f.flags.ads, false, 'rewarded videos are OFF in the shipped config (TestFlight) until real AdMob ids exist; a remote flag turns them on');
  assert.deepEqual(Object.keys(f.flags).sort(), ['adMemory', 'adSeal', 'ads'], 'two slips, no interstitial, no retired slips');
  assert.deepEqual(Object.keys(f.ads).sort(), ['cooldownSec', 'memoryPerRun', 'sealBonus']);
  assert.equal(f.luck, undefined, 'no luck odds in the remote document'); assert.equal(f.skill.press2, undefined);
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
    mk({ skill: { deepMul: '1.6' } }), mk({ skill: { seals: { free: 2.5 } } }), mk({ skill: { targets: [1, 2] } }), mk({ skill: { targets: [900, 300, 4500] } }),
    mk({ skill: { targets: [300, 'x', 4500] } }), mk({ skill: { fever: { decay: 1.5 } } }), mk({ skill: { fever: { decay: NaN } } }), mk({ flags: { ads: 'yes' } }), mk({ flags: [] }),
    mk({ econ: { gold: { sealDiv: 0 } } }), mk({ econ: { gold: { chest: -1 } } }), mk({ version: '3' }), mk({ version: 0 }), mk({ schema: 2 }),
    { version: 3 }, { schema: 1 }, null, [], 'x', 5
  ];
  for (const b of bad) assert.equal(RC.validate(b).ok, false, JSON.stringify(b));
});

test('applies allowed keys over the shipped values; everything else is left alone', () => {
  const g = game(), ap = RC.createApplier(g);
  const done = ap.apply(mk({ skill: { targets: [350, 1000, 5000], seals: { free: 4 } }, econ: { gold: { chest: 25 } } }));
  assert.deepEqual(g.SKILL.targets, [350, 1000, 5000]); assert.equal(g.SKILL.seals.free, 4); assert.equal(g.SKILL.seals.sack, 2);
  assert.equal(g.LUCK.coin.p, .32); assert.equal(g.LUCK.coin.mult, 3); assert.equal(g.ECON.gold.chest, 25); assert.equal(g.ECON.gold.cap, 99999999);
  assert.equal(g.SKILL.untouched, 42); assert.deepEqual(g.LUCK.reels.stop, [650, 1050, 1450]);
  assert.ok(done.includes('skill.targets'));
  assert.deepEqual(g.TARGETS, [300, 900, 4500, 9000], 'TARGETS is the game\'s live per-chamber state: never written');
  assert.deepEqual(g.TARGETS_BASE, [350, 1000, 5000]);
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
  ap.apply(mk({ econ: { gold: { chest: 99 } }, skill: { targets: [400, 1000, 5000] } }));
  ap.apply(mk({ skill: { deepMul: 1.7 } }));
  assert.equal(g.ECON.gold.chest, 15); assert.deepEqual(g.SKILL.targets, [300, 900, 4500]); assert.deepEqual(g.TARGETS_BASE, [300, 900, 4500]); assert.equal(g.SKILL.deepMul, 1.7);
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
