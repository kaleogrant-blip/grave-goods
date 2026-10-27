#!/usr/bin/env node
// Wraps the game fragment (team/current.html) into www/index.html for Capacitor.
// The game file is never edited. Everything native is added around it.
//
//   node scripts/build-www.mjs [--game game/current.html] [--out www/index.html]
//
// Env (all optional; see config/app.config.json): POSTHOG_KEY POSTHOG_HOST CONFIG_URL
//   ADMOB_APP_ID_IOS ADMOB_REWARDED_ID_IOS ADMOB_INTERSTITIAL_ID_IOS  ADMOB_APP_ID_ANDROID ADMOB_REWARDED_ID_ANDROID ADMOB_INTERSTITIAL_ID_ANDROID
//   ADMOB_TESTING  FLAGS_ADS_DEFAULT (true|false: the ads flag until remote config says otherwise)  DEV (true: enables the payments dev path)
//   CI (makes copy-patch misses fatal)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Order matters: the bridge is the first script in the document, then the libraries, then the game, then attach().
export const SUPPORT_SCRIPTS = ['save-adapter.js', 'remote-config.js', 'telemetry.js', 'ads.js', 'payments.js', 'adfree.js', 'native.js'];

// Copy fixes applied to the wrapped page only. Each must match exactly once. These keep the Settings text true once
// anonymous telemetry leaves the device (App Review checks that in-app text, the privacy policy and the labels agree).
export const COPY_PATCHES = [
  {
    id: 'play-log-copy',
    find: 'A short log of what you do in a run (seals, collapses, which cards came up), kept on this device. No name, no account, and nothing leaves the device unless you copy it and send it. Off, and nothing more is written.',
    replace: 'Anonymous play data (seals, collapses, which cards came up) helps tune the game. No name and no account. It is sent in small batches, and a copy stays on this device. Off, and nothing more is written or sent.'
  }
];

const FONT_FALLBACK_CSS = `
/* Offline fallbacks: if fonts.googleapis.com is unreachable these map the game's two families to system serifs.
   They are declared BEFORE the Google stylesheet so the real faces win whenever they load. */
@font-face{font-family:"Cinzel";font-style:normal;font-weight:700 900;src:local("Cinzel"),local("Georgia Bold"),local("Georgia"),local("Times New Roman")}
@font-face{font-family:"Alegreya";font-style:normal;font-weight:500 700;src:local("Alegreya"),local("Georgia"),local("Times New Roman")}
@font-face{font-family:"Alegreya";font-style:italic;font-weight:500;src:local("Alegreya Italic"),local("Georgia Italic"),local("Georgia")}
`;

const WRAP_CSS = `
[hidden]{display:none!important}
html{overscroll-behavior:none;-webkit-text-size-adjust:100%}
body{-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
/* Rewarded-ad buttons exist only when the ads flag is on. ads.js adds body.gg-ads; the game marks any such button data-gg-ad. */
body:not(.gg-ads) [data-gg-ad]{display:none!important}
`;

// The first script in the document. Tiny on purpose: it only says what we are running in.
const BRIDGE = `(function(){
  var C = window.Capacitor, native = false;
  try { native = !!(C && (typeof C.isNativePlatform === 'function' ? C.isNativePlatform() : true)); } catch (e) {}
  window.GG_NATIVE = { native: native, platform: native && C.getPlatform ? C.getPlatform() : 'web', flags: { ads: false }, ready: false };
})();`;

const esc = s => String(s).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));

export function loadAppConfig(env = process.env, root = ROOT) {
  const base = JSON.parse(fs.readFileSync(path.join(root, 'config/app.config.json'), 'utf8'));
  const shipped = JSON.parse(fs.readFileSync(path.join(root, 'config/config.json'), 'utf8'));
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'config/products.json'), 'utf8'));
  const pick = (a, b) => (a !== undefined && a !== '' ? a : b);
  let configUrl = pick(env.CONFIG_URL, base.configUrl) || '';
  configUrl = configUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const flagsDefault = { ...(shipped.flags || {}) };
  if (env.FLAGS_ADS_DEFAULT !== undefined && env.FLAGS_ADS_DEFAULT !== '') flagsDefault.ads = env.FLAGS_ADS_DEFAULT === 'true';
  const A = base.admob || {}, v = (k, d = '') => pick(env[k], d) || '';
  return {
    posthog: { key: pick(env.POSTHOG_KEY, base.posthog.key) || '', host: pick(env.POSTHOG_HOST, base.posthog.host) || '' },
    configUrl,
    admob: {
      appIdIos: v('ADMOB_APP_ID_IOS', A.appIdIos), rewardedIdIos: v('ADMOB_REWARDED_ID_IOS', A.rewardedIdIos), interstitialIdIos: v('ADMOB_INTERSTITIAL_ID_IOS', A.interstitialIdIos),
      appIdAndroid: v('ADMOB_APP_ID_ANDROID', A.appIdAndroid), rewardedIdAndroid: v('ADMOB_REWARDED_ID_ANDROID', A.rewardedIdAndroid), interstitialIdAndroid: v('ADMOB_INTERSTITIAL_ID_ANDROID', A.interstitialIdAndroid),
      testing: env.ADMOB_TESTING !== undefined ? env.ADMOB_TESTING !== 'false' : A.testing !== false
    },
    flagsDefault,                                   // the flags in force until (and unless) remote config says otherwise
    dev: env.DEV === 'true',                        // payments dev path: never true in a release workflow
    products: catalog.products.map(p => ({ id: p.id, kind: p.kind, usd: p.usd })),
    shippedConfigVersion: shipped.version
  };
}

// Split the artifact fragment into head parts (title, link, meta, style at the top) and the body (everything else).
export function splitFragment(src) {
  let rest = src.replace(/^﻿/, '').trimStart();
  if (/^<!doctype|^<html|^<head|^<body/i.test(rest)) throw new Error('current.html must be an artifact fragment (no doctype/html/head/body)');
  if (!/^<title>/i.test(rest)) throw new Error('current.html must start with <title>');
  const head = [];
  let title = '';
  for (;;) {
    let m;
    if ((m = /^<title>([\s\S]*?)<\/title>\s*/i.exec(rest))) { title = m[1].trim(); rest = rest.slice(m[0].length); continue; }
    if ((m = /^<(link|meta)\b[^>]*>\s*/i.exec(rest))) { head.push(m[0].trim()); rest = rest.slice(m[0].length); continue; }
    if ((m = /^<style\b[^>]*>[\s\S]*?<\/style>\s*/i.exec(rest))) { head.push(m[0].trim()); rest = rest.slice(m[0].length); continue; }
    break;
  }
  if (!/<script\b/i.test(rest)) throw new Error('no <script> found in current.html');
  return { title, head, body: rest };
}

export function wrap(gameSrc, appConfig, { strict = false, log = () => {} } = {}) {
  const { title, head, body: body0 } = splitFragment(gameSrc);
  let body = body0;
  for (const p of COPY_PATCHES) {
    const n = body.split(p.find).length - 1;
    if (n !== 1) {
      const msg = `copy patch "${p.id}" matched ${n} times (expected 1). The game text changed: update COPY_PATCHES in scripts/build-www.mjs.`;
      if (strict) throw new Error(msg);
      log('WARNING: ' + msg);
    } else body = body.replace(p.find, () => p.replace);
  }
  const ver = (/const GAME_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(body) || [])[1] || 'unknown';
  const cfg = Object.assign({ build: ver }, appConfig);
  const supports = SUPPORT_SCRIPTS.map(f => `<script src="${f}"></script>`).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="format-detection" content="telephone=no">
<meta name="theme-color" content="#17161b">
<script>${BRIDGE}</script>
<title>${title}</title>
<style id="gg-font-fallback">${FONT_FALLBACK_CSS}</style>
${head.join('\n')}
<style id="gg-wrap">${WRAP_CSS}</style>
</head>
<body>
<script>window.GG_APP_CONFIG=${esc(JSON.stringify(cfg))};</script>
${supports}
${body.trimEnd()}
<script>
/* Runs right after the game script, in the same global scope. Bare names reach the game's top-level const/let. */
(function(){
  function g(f){try{return f()}catch(e){return undefined}}
  window.GG_NATIVE.attach({
    SKILL: g(function(){return SKILL}), LUCK: g(function(){return LUCK}), ECON: g(function(){return ECON}),
    TARGETS: g(function(){return TARGETS}), TARGETS_BASE: g(function(){return TARGETS_BASE}),
    TELCFG: g(function(){return TELCFG}), S10: g(function(){return S10}),
    settings: function(){return g(function(){return SETTINGS})},
    run: function(){return g(function(){return run})},
    state: function(){return g(function(){return state})},
    store: g(function(){return Store})
  });
})();
</script>
</body>
</html>
`;
  return { html, title, version: ver };
}

export function buildWww({ game, out, root = ROOT, env = process.env, log = console.log } = {}) {
  game = path.resolve(root, game || env.GG_GAME || 'game/current.html');
  out = path.resolve(root, out || 'www/index.html');
  const src = fs.readFileSync(game, 'utf8');
  const res = wrap(src, loadAppConfig(env, root), { strict: !!env.CI, log });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, res.html);
  log(`build-www: ${path.relative(root, game)} (${res.version}, ${(src.length / 1024).toFixed(0)} KB) -> ${path.relative(root, out)} (${(res.html.length / 1024).toFixed(0)} KB)`);
  return { ...res, out };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), arg = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : undefined; };
  try { buildWww({ game: arg('game'), out: arg('out') }); } catch (e) { console.error('build-www FAILED: ' + e.message); process.exit(1); }
}
