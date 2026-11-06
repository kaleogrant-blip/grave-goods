// Static checks of the GitHub Actions workflows and the docs that describe them (no YAML library, no network).
// Real validation happens on GitHub; these catch someone deleting a flag or a secret name by accident.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers.mjs';

const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const wf = n => rd(`.github/workflows/${n}.yml`);
const FOUR = ['APP_STORE_CONNECT_ISSUER_ID', 'APP_STORE_CONNECT_KEY_IDENTIFIER', 'APP_STORE_CONNECT_PRIVATE_KEY', 'APPLE_TEAM_ID'];

test('ios-testflight: triggers, runner, timeout, build steps', () => {
  const y = wf('ios-testflight');
  for (const s of ['workflow_dispatch:', "tags: ['ios-v*']", 'runs-on: macos-15', 'timeout-minutes: 60', 'node-version: 22', 'npm ci', 'npm run build:www', 'npx cap sync ios', 'pod install']) assert.ok(y.includes(s), s);
  for (const s of ['FLAGS_PREMIUM_DEFAULT: \'false\'', 'ADMOB_TESTING: \'true\'', 'DEV: \'false\'']) assert.ok(y.includes(s), s);
});

test('ios-testflight: xcodebuild archive and export use API-key auth', () => {
  const y = wf('ios-testflight');
  for (const s of ['-workspace ios/App/App.xcworkspace', '-scheme App', '-configuration Release', '-destination generic/platform=iOS', '-archivePath build/App.xcarchive archive', '-exportArchive', 'CODE_SIGN_STYLE=Automatic', 'DEVELOPMENT_TEAM="$APPLE_TEAM_ID"', 'CURRENT_PROJECT_VERSION="$BUILD_NUMBER"', 'MARKETING_VERSION="$MARKETING_VERSION"', '<key>method</key><string>app-store-connect</string>', '<key>destination</key><string>upload</string>', '<key>signingStyle</key><string>automatic</string>', 'github.run_number', "require('./package.json').version"]) assert.ok(y.includes(s), s);
  assert.equal((y.match(/-allowProvisioningUpdates \\\n/g) || []).length, 2, 'archive and export');
  assert.equal((y.match(/-authenticationKeyPath "\$KEY_PATH"/g) || []).length, 2);
  assert.equal((y.match(/-authenticationKeyID "\$APP_STORE_CONNECT_KEY_IDENTIFIER"/g) || []).length, 2);
  assert.equal((y.match(/-authenticationKeyIssuerID "\$APP_STORE_CONNECT_ISSUER_ID"/g) || []).length, 2);
});

test('ios-testflight: all four secrets are wired and checked up front', () => {
  const y = wf('ios-testflight');
  for (const n of FOUR) { assert.ok(y.includes(`secrets.${n}`), n); assert.ok(y.includes(n)); }
  assert.ok(y.indexOf('Check the secrets (fail fast)') < y.indexOf('actions/checkout'), 'secret check comes first');
  assert.ok(!/echo[^\n]*\$APP_STORE_CONNECT_PRIVATE_KEY/.test(y.replace(/printf[^\n]*/g, '')), 'never echo the key');
});

test('asc-setup, ci, android workflows', () => {
  const a = wf('asc-setup');
  assert.ok(a.includes('workflow_dispatch') && /products:/.test(a) && /apply:/.test(a) && /runs-on: ubuntu-/.test(a) && a.includes('scripts/asc-setup.mjs'));
  for (const n of FOUR.slice(0, 3)) assert.ok(a.includes(`secrets.${n}`));
  const c = wf('ci');
  assert.ok(c.includes('npx playwright install --with-deps chromium') && c.includes("GG_REQUIRE_BROWSER: '1'") && c.includes('npm ci') && c.includes('npm test') && /\bpush:/.test(c) && c.includes('pull_request:'));
  const d = wf('android-internal');
  for (const s of ['workflow_dispatch', 'setup-java', 'setup-android', 'bundleRelease', 'assembleDebug', 'ANDROID_KEYSTORE_BASE64', 'KEYSTORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD', 'upload-artifact']) assert.ok(d.includes(s), s);
});

test('docs name the four secrets and the Team ID path; codemagic is marked secondary', () => {
  for (const f of ['README.md', 'docs/TRACK-B.md']) { const t = rd(f); for (const n of FOUR) assert.ok(t.includes(n), `${f} lacks ${n}`); }
  assert.match(rd('docs/TRACK-B.md'), /Membership details/);
  assert.match(rd('codemagic.yaml'), /SECONDARY/);
  assert.match(rd('README.md'), /secondary/i);
});

test('EU decision is recorded', () => {
  const t = rd('docs/AVAILABILITY.md');
  assert.match(t, /not a trader/i);
  for (const c of ['Germany', 'France', 'Ireland', 'Sweden', 'Malta']) assert.ok(t.includes(c), c);
  assert.match(rd('store/listing.md'), /Digital Services Act/);
});
