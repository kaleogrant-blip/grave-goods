#!/usr/bin/env node
// Writes config/config.json from the values the game actually ships (SKILL / LUCK / ECON), restricted to the keys the
// remote-config schema allows. Run it after a balance change:  node scripts/extract-config.mjs [--version N]
// tests/smoke.test.mjs fails if config/config.json drifts from the game, so a forgotten re-run is caught.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { buildWww } from './build-www.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const RC = require(path.join(ROOT, 'www/remote-config.js'));

export function shapeFromSchema(schema, read, prefix = '') {
  const out = {};
  for (const [k, spec] of Object.entries(schema)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof spec.t === 'string') continue;
    out[k] = shapeFromSchema(spec, read, p);
  }
  return out;
}

export async function dumpShipped(htmlPath) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto('file://' + htmlPath);
    await page.waitForFunction(() => window.GG_NATIVE && window.GG_NATIVE.ready);
    return await page.evaluate(() => ({ SKILL: JSON.parse(JSON.stringify(SKILL)), LUCK: JSON.parse(JSON.stringify(LUCK)), ECON: JSON.parse(JSON.stringify(ECON)) }));
  } finally { await browser.close(); }
}

// Build the config object: for every allowed skill/luck/econ leaf, copy the game's value when it exists.
export function configFromGame(game, version) {
  const roots = { skill: game.SKILL, luck: game.LUCK, econ: game.ECON };
  const out = { schema: 1, version, note: 'shipped values of the build this file was extracted from', flags: { ads: true, adMemory: true, adSeal: true, adReroll: true, adChestPick: true, adInterstitial: true }, ads: { memoryPerRun: 1, sealBonus: 1, cooldownSec: 30, interstitialEvery: 2, interstitialMinGapSec: 180 } };
  const walk = (spec, src, dst) => {
    for (const [k, s] of Object.entries(spec)) {
      if (typeof s.t === 'string') { if (src && src[k] !== undefined) dst[k] = Array.isArray(src[k]) ? src[k].slice(0, s.len || src[k].length) : src[k]; }
      else { const d = {}; walk(s, src && src[k], d); if (Object.keys(d).length) dst[k] = d; }
    }
  };
  for (const r of ['skill', 'luck', 'econ']) { out[r] = {}; walk(RC.SCHEMA[r], roots[r], out[r]); }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const vi = process.argv.indexOf('--version');
  let version = vi > 0 ? Number(process.argv[vi + 1]) : undefined;
  const target = path.join(ROOT, 'config/config.json');
  if (!version) { try { version = JSON.parse(fs.readFileSync(target, 'utf8')).version || 1; } catch { version = 1; } }
  const { out } = buildWww({ root: ROOT, out: path.join(ROOT, 'www/index.html') });
  const cfg = configFromGame(await dumpShipped(out), version);
  const v = RC.validate(cfg);
  if (!v.ok) { console.error('extracted config does not validate:\n' + v.errors.join('\n')); process.exit(1); }
  fs.writeFileSync(target, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`extract-config: wrote config/config.json (version ${version}, ${RC.flatten(cfg).length} values)`);
}
