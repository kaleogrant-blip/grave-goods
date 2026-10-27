#!/usr/bin/env node
// Idempotent post-`cap add/sync android` patches to the generated android/ project (CI runs it every build).
//   node scripts/patch-android.mjs
// Env: BUNDLE_ID (must equal appId in capacitor.config.ts)  ADMOB_APP_ID_ANDROID (default: Google's public test app id)
//      VERSION_CODE | BUILD_NUMBER, VERSION_NAME  (read by Gradle at build time, not here)
//      KEYSTORE_PATH KEYSTORE_PASSWORD KEY_ALIAS KEY_PASSWORD  (read by Gradle; release is signed only when KEYSTORE_PATH is set)
// What it does, and why:
//   AndroidManifest  AdMob application id meta-data (the AdMob SDK crashes at start without it), AD_ID + network-state permissions
//   strings.xml      admob_app_id, package_name
//   app/build.gradle applicationId, versionCode from CI, signing config from env (no secret in the repo)
//   launcher icons   legacy + round + adaptive foreground made from assets/app-icon-1024.png; solid game-colour launch image
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toRGBA, scaleRGBA, encodeRGBA, padCentered, solidPng, pngSize } from './png-flatten.mjs';
import { readAppId } from './patch-ios.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GOOGLE_TEST_APP_ID_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
const BG = '#17161b';

export function patchManifest(xml, admobAppId = '@string/admob_app_id') {
  let n = 0;
  const add = (cond, fn) => { if (!cond) { xml = fn(xml); n++; } };
  add(xml.includes('com.google.android.gms.ads.APPLICATION_ID'), x => x.replace('</application>', `    <meta-data\n            android:name="com.google.android.gms.ads.APPLICATION_ID"\n            android:value="${admobAppId}" />\n    </application>`));
  add(xml.includes('com.google.android.gms.permission.AD_ID'), x => x.replace('</manifest>', '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />\n</manifest>'));
  add(xml.includes('android.permission.ACCESS_NETWORK_STATE'), x => x.replace('</manifest>', '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n</manifest>'));
  return { xml, changed: n };
}

export function patchStrings(xml, admobAppId, packageId) {
  let n = 0;
  const setStr = (name, val) => {
    const re = new RegExp(`(<string name="${name}">)[^<]*(</string>)`);
    if (re.test(xml)) { const before = xml; xml = xml.replace(re, `$1${val}$2`); if (before !== xml) n++; }
    else { xml = xml.replace('</resources>', `    <string name="${name}">${val}</string>\n</resources>`); n++; }
  };
  setStr('admob_app_id', admobAppId); setStr('package_name', packageId); setStr('custom_url_scheme', packageId);
  return { xml, changed: n };
}

const MARK = '// gg-patch';
export function patchGradle(g, appId) {
  let n = 0;
  const before = g;
  g = g.replace(/applicationId "[^"]*"/, `applicationId "${appId}"`);
  g = g.replace(/versionCode [^\n]*/, `versionCode (System.getenv("VERSION_CODE") ?: System.getenv("BUILD_NUMBER") ?: "1").toInteger() ${MARK}`);
  g = g.replace(/versionName [^\n]*/, `versionName (System.getenv("VERSION_NAME") ?: "1.0") ${MARK}`);
  if (!g.includes(`${MARK}:signing`)) {
    g = g.replace(/(\n\s*)buildTypes \{/, `$1signingConfigs { ${MARK}:signing
        release {
            if (System.getenv("KEYSTORE_PATH")) {
                storeFile file(System.getenv("KEYSTORE_PATH"))
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }
    buildTypes {`);
    g = g.replace(/(release \{\n)(\s*)(minifyEnabled false)/, `$1$2$3\n$2if (System.getenv("KEYSTORE_PATH")) { signingConfig signingConfigs.release } ${MARK}:use`);
  }
  if (g !== before) n = 1;
  return { gradle: g, changed: n };
}

const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
export function writeIcons(res, iconPng) {
  const src = toRGBA(iconPng); let files = 0;
  for (const [d, k] of Object.entries(DENS)) {
    const dir = path.join(res, `mipmap-${d}`); if (!fs.existsSync(dir)) continue;
    const legacy = encodeRGBA(scaleRGBA(src, Math.round(48 * k), Math.round(48 * k)));
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), legacy); fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), legacy);
    const fg = Math.round(108 * k);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), encodeRGBA(padCentered(src, fg, Math.round(fg * 66 / 108))));
    files += 3;
  }
  const bg = path.join(res, 'values/ic_launcher_background.xml');
  fs.writeFileSync(bg, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
  return files;
}
export function writeSplash(res) {
  let n = 0;
  for (const d of fs.readdirSync(res).filter(d => /^drawable/.test(d))) {
    const f = path.join(res, d, 'splash.png'); if (!fs.existsSync(f)) continue;
    const { w, h } = pngSize(fs.readFileSync(f)); fs.writeFileSync(f, solidPng(w, h, [23, 22, 27])); n++;
  }
  return n;
}

export function patchAndroid({ root = ROOT, env = process.env, log = console.log } = {}) {
  const dir = path.join(root, 'android');
  if (!fs.existsSync(dir)) throw new Error('android/ not found: run `npx cap add android` first');
  const appId = readAppId(root), bundle = env.BUNDLE_ID || appId;
  if (bundle !== appId) throw new Error(`BUNDLE_ID (${bundle}) differs from appId in capacitor.config.ts (${appId}): change both, they must match`);
  const admob = env.ADMOB_APP_ID_ANDROID || GOOGLE_TEST_APP_ID_ANDROID;
  const res = path.join(dir, 'app/src/main/res'), out = {};

  const mp = path.join(dir, 'app/src/main/AndroidManifest.xml'), m = patchManifest(fs.readFileSync(mp, 'utf8'));
  fs.writeFileSync(mp, m.xml); out.manifest = m.changed; log(`patch-android: AndroidManifest ${m.changed} change(s)`);

  const sp = path.join(res, 'values/strings.xml'), s = patchStrings(fs.readFileSync(sp, 'utf8'), admob, appId);
  fs.writeFileSync(sp, s.xml); out.strings = s.changed; log(`patch-android: strings.xml ${s.changed} change(s), AdMob app id ${admob === GOOGLE_TEST_APP_ID_ANDROID ? '(Google test id)' : '(yours)'}`);

  const gp = path.join(dir, 'app/build.gradle'), g = patchGradle(fs.readFileSync(gp, 'utf8'), appId);
  fs.writeFileSync(gp, g.gradle); out.gradle = g.changed; log(`patch-android: app/build.gradle applicationId ${appId}, versionCode from CI, signing from env`);

  out.icons = writeIcons(res, fs.readFileSync(path.join(root, 'assets/app-icon-1024.png'))); log(`patch-android: ${out.icons} launcher icon files written`);
  out.splash = writeSplash(res); log(`patch-android: ${out.splash} launch images replaced with solid ${BG}`);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { patchAndroid(); } catch (e) { console.error('patch-android FAILED: ' + e.message); process.exit(1); }
}
