#!/usr/bin/env node
// Wraps the game fragment (team/current.html) into www/index.html for Capacitor.
// The game file is never edited. Everything native is added around it.
//
//   node scripts/build-www.mjs [--game game/current.html] [--out www/index.html]
//
// Env (all optional; see config/app.config.json): POSTHOG_KEY POSTHOG_HOST CONFIG_URL
//   ADMOB_APP_ID_IOS ADMOB_REWARDED_ID_IOS  ADMOB_APP_ID_ANDROID ADMOB_REWARDED_ID_ANDROID   (v1 has rewarded videos only: no interstitial unit)
//   ADMOB_TESTING  FLAGS_ADS_DEFAULT (true|false: the rewarded-offers flag until remote config says otherwise; shipped default false)  DEV (true: enables the payments dev path)
//   CI (makes copy-patch misses fatal)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Order matters: the bridge is the first script in the document, then the libraries, then the game, then attach().
export const SUPPORT_SCRIPTS = ['save-adapter.js', 'remote-config.js', 'telemetry.js', 'consent.js', 'ads.js', 'payments.js', 'adfree.js', 'native.js'];

// Copy fixes applied to the wrapped page only. Each must match exactly once. These keep the Settings text true once
// anonymous telemetry leaves the device (App Review checks that in-app text, the privacy policy and the labels agree).
export const COPY_PATCHES = [
  {
    id: 'play-log-copy',
    find: 'A short log of what you do in a run (seals, collapses, which cards came up), kept on this device. No name, no account, and nothing leaves the device unless you copy it and send it. Off, and nothing more is written.',
    replace: 'A short log of what you do in a run (seals, collapses, which cards came up), kept on this device. No name, no account. It leaves the device only if you said yes to "Share play statistics" (Settings, Privacy). Off, and nothing more is written or sent.'
  }
];

// The game's two typefaces, bundled (www/fonts, SIL Open Font License). The app makes no network request for fonts:
// the game's own <link> to Google Fonts is removed from the built page (GOOGLE_FONTS_LINK below).
export const FONT_FILES = [
  ['Cinzel', 'normal', 700, 'cinzel-latin-700-normal'], ['Cinzel', 'normal', 900, 'cinzel-latin-900-normal'],
  ['Alegreya', 'normal', 500, 'alegreya-latin-500-normal'], ['Alegreya', 'normal', 700, 'alegreya-latin-700-normal'], ['Alegreya', 'italic', 500, 'alegreya-latin-500-italic']
];
const RANGE = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'
};
export const fontFileNames = () => FONT_FILES.flatMap(f => ['latin', 'latin-ext'].map(sub => f[3].replace('-latin-', `-${sub}-`) + '.woff2'));
const FONT_CSS = '\n/* Bundled faces. font-display:swap, with system serifs behind them in the game\'s own font stacks. */\n' +
  FONT_FILES.flatMap(([fam, style, weight, file]) => ['latin-ext', 'latin'].map(sub =>
    `@font-face{font-family:"${fam}";font-style:${style};font-weight:${weight};font-display:swap;src:url("fonts/${file.replace('-latin-', `-${sub}-`)}.woff2") format("woff2");unicode-range:${RANGE[sub]}}`)).join('\n') + '\n';
export const GOOGLE_FONTS_LINK = /^<link\b[^>]*\bhref=["']https?:\/\/fonts\.(googleapis|gstatic)\.com[^>]*>$/i;

const WRAP_CSS = `
[hidden]{display:none!important}
html{overscroll-behavior:none;-webkit-text-size-adjust:100%}
body{-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
/* Rewarded-ad buttons exist only when the ads flag is on. ads.js adds body.gg-ads; the game marks any such button data-gg-ad. */
body:not(.gg-ads) [data-gg-ad]{display:none!important}
/* v1 has two slips, memory and seal. A game build that still draws the retired ones never shows them. */
[data-gg-ad="reroll"],[data-gg-ad="chestpick"]{display:none!important}
/* The one-time analytics question (consent.js). Two equal buttons; nothing pre-selected. */
#ggConsent{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));background:rgba(10,9,12,.82)}
#ggConsent .ggc-card{max-width:420px;width:100%;box-sizing:border-box;background:#211f26;color:#efe6d2;border:1px solid #6b5a3a;border-radius:10px;padding:20px 18px;font-family:"Alegreya",Georgia,serif;box-shadow:0 10px 40px rgba(0,0,0,.6)}
#ggConsent .ggc-q{margin:0 0 10px;font:700 19px/1.3 "Alegreya",Georgia,serif}
#ggConsent .ggc-d{margin:0 0 18px;font-size:15px;line-height:1.45;color:#cfc4ab}
#ggConsent .ggc-row{display:flex;gap:12px}
#ggConsent button{flex:1 1 0;min-height:48px;border-radius:8px;border:1px solid #8a744a;background:#2e2b34;color:#efe6d2;font:700 16px "Alegreya",Georgia,serif;cursor:pointer}
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
      appIdIos: v('ADMOB_APP_ID_IOS', A.appIdIos), rewardedIdIos: v('ADMOB_REWARDED_ID_IOS', A.rewardedIdIos),
      appIdAndroid: v('ADMOB_APP_ID_ANDROID', A.appIdAndroid), rewardedIdAndroid: v('ADMOB_REWARDED_ID_ANDROID', A.rewardedIdAndroid),
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
  const { title, head: head0, body: body0 } = splitFragment(gameSrc);
  const head = head0.filter(h => !GOOGLE_FONTS_LINK.test(h)); // fonts are bundled: the page must not call Google at start
  if (/fonts\.(googleapis|gstatic)\.com/.test(head.join('\n') + body0)) {
    const msg = 'the game still references Google Fonts somewhere build-www does not strip. Update GOOGLE_FONTS_LINK in scripts/build-www.mjs.';
    if (strict) throw new Error(msg);
    log('WARNING: ' + msg);
  }
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
<style id="gg-fonts">${FONT_CSS}</style>
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
