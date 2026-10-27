import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './helpers.mjs';
import { patchAndroid, patchManifest, patchStrings, patchGradle, GOOGLE_TEST_APP_ID_ANDROID } from '../scripts/patch-android.mjs';
import { decode, pngSize } from '../scripts/png-flatten.mjs';

function tmpProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gg-and-'));
  fs.cpSync(path.join(ROOT, 'android'), path.join(root, 'android'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'capacitor.config.ts'), path.join(root, 'capacitor.config.ts'));
  fs.mkdirSync(path.join(root, 'assets')); fs.copyFileSync(path.join(ROOT, 'assets/app-icon-1024.png'), path.join(root, 'assets/app-icon-1024.png'));
  return root;
}
const read = (root, f) => fs.readFileSync(path.join(root, 'android', f), 'utf8');

test('patch-android: manifest gets the AdMob application id, AD_ID and network-state exactly once, on every run', () => {
  const root = tmpProject(); const log = [];
  patchAndroid({ root, env: {}, log: m => log.push(m) }); patchAndroid({ root, env: {}, log: m => log.push(m) });
  const m = read(root, 'app/src/main/AndroidManifest.xml');
  for (const k of ['com.google.android.gms.ads.APPLICATION_ID', 'com.google.android.gms.permission.AD_ID', 'android.permission.ACCESS_NETWORK_STATE']) assert.equal(m.split(k).length - 1, 1, k);
  assert.match(m, /android:value="@string\/admob_app_id"/);
  assert.match(read(root, 'app/src/main/res/values/strings.xml'), new RegExp(`<string name="admob_app_id">${GOOGLE_TEST_APP_ID_ANDROID.replace('~', '~')}</string>`));
  assert.ok(log.some(l => /AndroidManifest 0 change/.test(l)), 'second run changes nothing');
});

test('patch-android: AdMob id from env, package id kept in step, mismatched BUNDLE_ID refused', () => {
  const root = tmpProject();
  patchAndroid({ root, env: { ADMOB_APP_ID_ANDROID: 'ca-app-pub-1111~2222' }, log: () => {} });
  const s = read(root, 'app/src/main/res/values/strings.xml'); assert.match(s, /admob_app_id">ca-app-pub-1111~2222</); assert.match(s, /package_name">com\.gravegoods\.app</);
  assert.throws(() => patchAndroid({ root, env: { BUNDLE_ID: 'com.other.app' }, log: () => {} }), /must match/);
  assert.match(read(root, 'app/build.gradle'), /applicationId "com\.gravegoods\.app"/);
});

test('patch-android: versionCode from CI, release signed only when a keystore is supplied, no secret in the file', () => {
  const root = tmpProject(); patchAndroid({ root, env: {}, log: () => {} }); patchAndroid({ root, env: {}, log: () => {} });
  const g = read(root, 'app/build.gradle');
  assert.match(g, /versionCode \(System\.getenv\("VERSION_CODE"\) \?: System\.getenv\("BUILD_NUMBER"\) \?: "1"\)\.toInteger\(\)/);
  assert.equal(g.split('signingConfigs {').length - 1, 1, 'one signingConfigs block after two runs');
  assert.match(g, /if \(System\.getenv\("KEYSTORE_PATH"\)\) \{ signingConfig signingConfigs\.release \}/);
  for (const k of ['KEYSTORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD']) assert.match(g, new RegExp(`System\\.getenv\\("${k}"\\)`));
  assert.ok(!/storePassword ["'][^S]/.test(g));
  const { gradle } = patchGradle(g, 'com.gravegoods.app'); assert.equal(gradle, g, 'pure and idempotent');
  assert.equal((g.match(/\{/g) || []).length, (g.match(/\}/g) || []).length, 'braces balance');
});

test('patch-android: launcher icons are real PNGs of the right sizes (no Capacitor logo), launch images keep their size and are the game colour', () => {
  const root = tmpProject(); patchAndroid({ root, env: {}, log: () => {} });
  const res = path.join(root, 'android/app/src/main/res');
  const expect = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
  for (const [d, [legacy, fg]] of Object.entries(expect)) {
    const a = fs.readFileSync(path.join(res, `mipmap-${d}/ic_launcher.png`)), f = fs.readFileSync(path.join(res, `mipmap-${d}/ic_launcher_foreground.png`));
    assert.deepEqual(pngSize(a), { w: legacy, h: legacy }); assert.deepEqual(pngSize(f), { w: fg, h: fg });
    assert.equal(decode(a).ct, 6); assert.ok(a.equals(fs.readFileSync(path.join(res, `mipmap-${d}/ic_launcher_round.png`))));
    const fdec = decode(f); assert.equal(fdec.pixels[3], 0, 'foreground corner is transparent (safe-zone padding)');
    const centre = (Math.floor(fg / 2) * fg + Math.floor(fg / 2)) * 4; assert.ok(fdec.pixels[centre + 3] > 0, 'art in the middle');
  }
  assert.match(fs.readFileSync(path.join(res, 'values/ic_launcher_background.xml'), 'utf8'), /#17161b/);
  const sp = path.join(res, 'drawable-port-hdpi/splash.png'), d = decode(fs.readFileSync(sp));
  assert.deepEqual([d.w, d.h], [480, 800]); assert.deepEqual([...d.pixels.subarray(0, 3)], [23, 22, 27]);
});

test('patch-android: pure helpers are safe on already-patched text', () => {
  const a = patchManifest('<manifest><application></application></manifest>'); assert.equal(a.changed, 3); assert.equal(patchManifest(a.xml).changed, 0);
  const s = patchStrings('<resources></resources>', 'ca-app-pub-1~2', 'com.x.y'); assert.equal(patchStrings(s.xml, 'ca-app-pub-1~2', 'com.x.y').changed, 0);
});

test('the committed android project is already patched and the plugins are linked (what cap sync produces)', () => {
  const settings = fs.readFileSync(path.join(ROOT, 'android/capacitor.settings.gradle'), 'utf8');
  assert.match(settings, /capacitor-play-billing/); assert.match(settings, /capacitor-community-admob/);
  assert.ok(!/capacitor-storekit/.test(settings), 'the iOS-only plugin is not linked on Android');
  const plugins = fs.readFileSync(path.join(ROOT, 'android/app/src/main/assets/capacitor.plugins.json'), 'utf8');
  assert.match(plugins, /com\.gravegoods\.playbilling\.PlayBillingPlugin/);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/patch-android.mjs')], { cwd: ROOT, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /AndroidManifest 0 change/);
});
