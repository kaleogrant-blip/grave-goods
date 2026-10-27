import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './helpers.mjs';
import { wrap, splitFragment, loadAppConfig, buildWww, SUPPORT_SCRIPTS, COPY_PATCHES } from '../scripts/build-www.mjs';

const GAME = fs.readFileSync(path.join(ROOT, 'game/current.html'), 'utf8');
const CFG = loadAppConfig({}, ROOT);
const out = wrap(GAME, CFG, { strict: true }).html;
const scripts = html => [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map(m => ({ attrs: m[1], body: m[2] }));

test('wrapper is a complete HTML document', () => {
  assert.match(out, /^<!doctype html>/i);
  assert.equal((out.match(/<!doctype/gi) || []).length, 1);
  assert.equal((out.match(/<html\b/g) || []).length, 1);
  assert.equal((out.match(/<head>/g) || []).length, 1);
  assert.equal((out.match(/^<body>$/gm) || []).length, 1);
  assert.equal((out.match(/<title>/g) || []).length, 1);
  assert.match(out, /<meta charset="utf-8">/);
  const vp = /<meta name="viewport" content="([^"]+)"/.exec(out)[1];
  assert.match(vp, /viewport-fit=cover/); assert.match(vp, /user-scalable=no/); assert.match(vp, /width=device-width/);
  assert.match(out, /\[hidden\]\{display:none!important\}/);
  assert.ok(out.indexOf('<title>Grave Goods</title>') < out.indexOf('</head>'));
  assert.ok(out.indexOf('</head>') < out.indexOf('<canvas id="c">'), 'markup is in the body');
});

test('GG_NATIVE bridge is the first script; support scripts precede the game; attach() is last', () => {
  const s = scripts(out);
  assert.match(s[0].body, /window\.GG_NATIVE\s*=/);
  assert.equal(s[0].attrs.trim(), '');
  const srcs = s.filter(x => /src=/.test(x.attrs)).map(x => /src="([^"]+)"/.exec(x.attrs)[1]);
  assert.deepEqual(srcs, SUPPORT_SCRIPTS);
  const gameIdx = s.findIndex(x => x.body.includes('const Store=(()=>'));
  const lastSrc = s.map((x, i) => (/src=/.test(x.attrs) ? i : -1)).filter(i => i >= 0).pop();
  assert.ok(gameIdx > lastSrc, 'game script comes after every support script');
  assert.match(s[s.length - 1].body, /GG_NATIVE\.attach\(/);
  assert.equal(s.length, 4 + SUPPORT_SCRIPTS.length, 'bridge + config + support scripts + game + attach');
});

test('Google Fonts link is kept and the local fallbacks are declared before it', () => {
  const link = out.indexOf('fonts.googleapis.com/css2?family=Cinzel');
  const fb = out.indexOf('id="gg-font-fallback"');
  assert.ok(link > 0 && fb > 0 && fb < link);
  assert.match(out, /font-family:"Cinzel"[^}]*local\("Georgia"\)/);
  assert.match(out, /font-family:"Alegreya"[^}]*local\("Georgia"\)/);
});

test('the game script passes node --check, both in the source and in the wrapped page', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gg-build-'));
  const game = scripts(out).find(x => x.body.includes('const Store=(()=>'));
  assert.ok(game && game.body.length > 500000);
  const f = path.join(dir, 'game.js'); fs.writeFileSync(f, game.body);
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  // every other inline script must parse too
  scripts(out).filter(x => !/src=/.test(x.attrs)).forEach((x, i) => {
    const g = path.join(dir, `s${i}.js`); fs.writeFileSync(g, x.body);
    const rr = spawnSync(process.execPath, ['--check', g], { encoding: 'utf8' }); assert.equal(rr.status, 0, `inline script ${i}: ${rr.stderr}`);
  });
});

test('the game file is not modified, and its script is carried byte for byte (except declared copy patches)', () => {
  let src = scripts(GAME).pop().body;
  for (const p of COPY_PATCHES) src = src.replace(p.find, p.replace);
  assert.ok(out.includes(src), 'game script text appears unchanged in the output');
  assert.ok(!out.includes(COPY_PATCHES[0].find), 'old play-log copy is gone');
  assert.ok(out.includes(COPY_PATCHES[0].replace));
});

test('app config is injected, and </script> inside values cannot break out', () => {
  const o = wrap(GAME, { ...CFG, posthog: { key: 'phc_x</script><b>', host: 'https://h' } }).html;
  assert.ok(!o.includes('phc_x</script>'));
  assert.match(o, /window\.GG_APP_CONFIG=\{/);
  assert.match(o, /"build":"v1\.0-rc\d+[a-z]?"/);
});

test('env overrides: PostHog key, config URL (scheme stripped), AdMob', () => {
  const c = loadAppConfig({ POSTHOG_KEY: 'phc_abc', CONFIG_URL: 'https://cfg.example.com/gg/', ADMOB_REWARDED_ID_IOS: 'ca-app-pub-1/2', ADMOB_TESTING: 'false' }, ROOT);
  assert.equal(c.posthog.key, 'phc_abc'); assert.equal(c.configUrl, 'cfg.example.com/gg');
  assert.equal(c.admob.rewardedIdIos, 'ca-app-pub-1/2'); assert.equal(c.admob.testing, false);
  assert.equal(loadAppConfig({}, ROOT).admob.testing, true, 'testing mode is the default');
});

test('rejects things that are not an artifact fragment', () => {
  assert.throws(() => splitFragment('<!doctype html><title>x</title><script></script>'), /fragment/);
  assert.throws(() => splitFragment('<div>hi</div><script></script>'), /<title>/);
  assert.throws(() => splitFragment('<title>x</title><div>hi</div>'), /script/);
});

test('a copy patch whose anchor disappeared warns locally and fails the build in CI', () => {
  const changed = GAME.replace('kept on this device. No name', 'kept on this phone. No name');
  const logs = [];
  wrap(changed, CFG, { strict: false, log: m => logs.push(m) });
  assert.ok(logs.some(l => /play-log-copy/.test(l)));
  assert.throws(() => wrap(changed, CFG, { strict: true }), /play-log-copy/);
});

test('buildWww writes www/index.html from a file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gg-out-'));
  const r = buildWww({ root: ROOT, out: path.join(dir, 'index.html'), env: {}, log: () => {} });
  assert.equal(r.version, /const GAME_VERSION='([^']+)'/.exec(GAME)[1], 'the version comes from the game file');
  assert.ok(fs.statSync(path.join(dir, 'index.html')).size > 800000);
});

test('support scripts: payments.js and adfree.js are loaded before native.js; the page has no content gate and never references legacy-premium', () => {
  assert.deepEqual(SUPPORT_SCRIPTS.slice(-3), ['payments.js', 'adfree.js', 'native.js']);
  for (const f of SUPPORT_SCRIPTS) assert.ok(fs.existsSync(path.join(ROOT, 'www', f)), f);
  assert.ok(!/legacy-premium|premium\.js|gg_full|PAID_CLS/.test(out), 'nothing from the dormant monetization build is in the page');
});

test('build flags: ads flag default (shipped true, FLAGS_ADS_DEFAULT overrides), DEV off unless DEV=true, product catalog injected', () => {
  const d = loadAppConfig({}, ROOT);
  assert.equal(d.flagsDefault.ads, true); assert.equal(d.flagsDefault.adInterstitial, true); assert.equal(d.dev, false);
  assert.deepEqual(d.products, [{ id: 'gg_adfree', kind: 'nonConsumable', usd: 2.99 }]);
  assert.equal(loadAppConfig({ FLAGS_ADS_DEFAULT: 'false' }, ROOT).flagsDefault.ads, false);
  assert.equal(loadAppConfig({ FLAGS_ADS_DEFAULT: '' }, ROOT).flagsDefault.ads, true, 'empty means unset');
  assert.equal(loadAppConfig({ DEV: 'true' }, ROOT).dev, true); assert.equal(loadAppConfig({ DEV: 'yes' }, ROOT).dev, false, 'only the exact string true');
  const o = wrap(GAME, loadAppConfig({ DEV: 'true' }, ROOT)).html; assert.match(o, /"dev":true/);
  assert.match(out, /"dev":false/);
});

test('AdMob ids: per platform env overrides, interstitial included; testing stays the default', () => {
  const c = loadAppConfig({ ADMOB_APP_ID_ANDROID: 'ca-app-pub-1~1', ADMOB_REWARDED_ID_ANDROID: 'ca-app-pub-1/2', ADMOB_INTERSTITIAL_ID_ANDROID: 'ca-app-pub-1/3', ADMOB_INTERSTITIAL_ID_IOS: 'ca-app-pub-2/3' }, ROOT);
  assert.deepEqual([c.admob.appIdAndroid, c.admob.rewardedIdAndroid, c.admob.interstitialIdAndroid, c.admob.interstitialIdIos], ['ca-app-pub-1~1', 'ca-app-pub-1/2', 'ca-app-pub-1/3', 'ca-app-pub-2/3']);
  assert.equal(c.admob.testing, true);
});
