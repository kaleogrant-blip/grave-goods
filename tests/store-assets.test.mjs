import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from './helpers.mjs';
import { render, buildStorekit } from '../scripts/gen-storekit.mjs';
import { planFor, run as runProducts, readLive } from '../scripts/asc-products.mjs';
import { run as runPromo, validate as validatePromo, parseArgs } from '../scripts/asc-promo-codes.mjs';
import { makeJwt, credsFromEnv } from '../scripts/lib/asc.mjs';

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const catalog = JSON.parse(read('config/products.json'));

test('products.json: v1 sells exactly one non-consumable, gg_adfree, with an en-US localization and a plain US price', () => {
  assert.deepEqual(catalog.products.map(p => p.id), ['gg_adfree']);
  for (const p of catalog.products) {
    assert.match(p.id, /^[a-z0-9_.]{1,100}$/); assert.equal(p.kind, 'nonConsumable');
    assert.ok(p.usd >= 0.99 && Math.round(p.usd * 100) === p.usd * 100 && /\.99$/.test(p.usd.toFixed(2)), 'a normal US price point');
    assert.ok(p.localizations.some(l => l.locale === 'en-US' && l.displayName.length <= 30 && l.description.length <= 45 * 4), 'Apple: display name <= 30 chars');
    assert.ok(p.referenceName.length <= 64);
  }
});

test('StoreKit configuration file: in sync with products.json, valid, and every product matches the catalog', () => {
  assert.equal(read('ios/App/GraveGoods.storekit'), render(ROOT), 'run: node scripts/gen-storekit.mjs');
  const sk = JSON.parse(read('ios/App/GraveGoods.storekit'));
  assert.deepEqual(sk.version, { major: 3, minor: 0 }); assert.match(sk.identifier, /^[0-9A-F-]{36}$/);
  assert.deepEqual(sk.products.map(p => p.productID), catalog.products.map(p => p.id));
  const ids = new Set();
  for (const p of sk.products) {
    assert.ok(['Consumable', 'NonConsumable', 'NonRenewingSubscription'].includes(p.type));
    assert.match(p.displayPrice, /^\d+\.\d{2}$/); assert.equal(p.displayPrice, catalog.products.find(c => c.id === p.productID).usd.toFixed(2));
    assert.match(p.internalID, /^[0-9A-F-]{36}$/); assert.ok(!ids.has(p.internalID)); ids.add(p.internalID);
    assert.ok(p.localizations.length >= 1 && p.localizations.every(l => /^[a-z]{2}_[A-Z]{2}$/.test(l.locale) && l.displayName && l.description));
  }
  assert.deepEqual(buildStorekit(catalog).products.length, 1);
});

test('the Xcode scheme uses the StoreKit file for Run (Debug) only, never for Archive (Release), and the file exists next to the project', () => {
  const x = read('ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme');
  const launch = /<LaunchAction[\s\S]*?<\/LaunchAction>/.exec(x)[0], archive = /<ArchiveAction[\s\S]*?<\/ArchiveAction>/.exec(x)[0];
  assert.match(launch, /buildConfiguration = "Debug"/); assert.match(launch, /StoreKitConfigurationFileReference identifier = "\.\.\/GraveGoods\.storekit"/);
  assert.match(archive, /buildConfiguration = "Release"/); assert.ok(!/StoreKit/.test(archive));
  assert.equal((x.match(/<StoreKitConfigurationFileReference /g) || []).length, 1, 'referenced exactly once');
  assert.ok(fs.existsSync(path.join(ROOT, 'ios/App/App.xcodeproj', '../GraveGoods.storekit')));
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.ok(!/GraveGoods\.storekit/.test(pbx), 'the test file is not a bundle resource, so it cannot ship in the release app');
  const id = /BlueprintIdentifier = "([0-9A-F]{24})"/.exec(x)[1]; assert.ok(pbx.includes(`${id} /* App */ = {`), 'scheme points at the App target');
});

test('iOS project is at 15.0 (StoreKit 2) and the Podfile carries both local plugins', () => {
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.deepEqual([...new Set(pbx.match(/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]+;/g))], ['IPHONEOS_DEPLOYMENT_TARGET = 15.0;']);
  const pod = read('ios/App/Podfile'); assert.match(pod, /platform :ios, '15\.0'/); assert.match(pod, /pod 'CapacitorStorekit', :path => '\.\.\/\.\.\/plugins\/storekit'/); assert.match(pod, /CapacitorIcloudKv/);
  assert.match(read('plugins/storekit/CapacitorStorekit.podspec'), /deployment_target = '15\.0'/);
});

// ---- the one JS contract, three implementations (TypeScript typings, Swift, Kotlin) and its only caller (payments.js)
const CONTRACT = ['canMakePayments', 'products', 'purchase', 'restore', 'entitlements'];
test('plugin contract: typings, Swift, Kotlin, shims and payments.js agree on method and event names', () => {
  const dts = read('plugins/storekit/src/index.d.ts'), dts2 = read('plugins/play-billing/src/index.d.ts');
  for (const d of [dts, dts2]) { CONTRACT.forEach(m => assert.match(d, new RegExp(`\\b${m}\\(`))); assert.match(d, /'transactionUpdate'/); }
  const swift = read('plugins/storekit/ios/Sources/StoreKitPlugin/StoreKitPlugin.swift');
  assert.deepEqual([...swift.matchAll(/CAPPluginMethod\(name: "(\w+)"/g)].map(m => m[1]), CONTRACT);
  assert.deepEqual([...swift.matchAll(/@objc func (\w+)\(_ call: CAPPluginCall\)/g)].map(m => m[1]), CONTRACT);
  assert.match(swift, /jsName = "StoreKit"/); assert.match(swift, /notifyListeners\("transactionUpdate"/);
  const kt = read('plugins/play-billing/android/src/main/java/com/gravegoods/playbilling/PlayBillingPlugin.kt');
  assert.deepEqual([...kt.matchAll(/@PluginMethod\s+fun (\w+)\(/g)].map(m => m[1]).sort(), [...CONTRACT].sort());
  assert.match(kt, /@CapacitorPlugin\(name = "PlayBilling"\)/); assert.match(kt, /notifyListeners\("transactionUpdate"/);
  for (const f of ['plugins/storekit/src/index.js', 'plugins/play-billing/src/index.js']) CONTRACT.forEach(m => assert.match(read(f), new RegExp(`async ${m}\\(`)));
  const used = new Set([...read('www/payments.js').matchAll(/plugin\.(\w+)/g)].map(m => m[1])); used.delete('addListener');
  for (const m of used) assert.ok(CONTRACT.includes(m), `payments.js calls plugin.${m}, which is not in the contract`);
  assert.match(read('www/native.js'), /plug\('StoreKit'\) \|\| plug\('PlayBilling'\)/);
});

test('StoreKit 2 rules, checked by reading: verified only, finish(), updates listener from load(), AppStore.sync, currentEntitlements, revocation skipped', () => {
  const s = read('plugins/storekit/ios/Sources/StoreKitPlugin/StoreKitPlugin.swift');
  assert.match(s, /Transaction\.updates/); assert.match(s, /override public func load\(\)[\s\S]*Transaction\.updates/);
  assert.equal((s.match(/\.finish\(\)/g) || []).length, 2, 'finish() after a purchase and after an update');
  assert.match(s, /case \.unverified/); assert.match(s, /try await AppStore\.sync\(\)/); assert.match(s, /Transaction\.currentEntitlements/); assert.match(s, /revocationDate == nil/);
  assert.match(s, /\.userCancelled/); assert.match(s, /\.pending/); assert.match(s, /@available\(iOS 15\.0, \*\)/);
  const open = (s.match(/\{/g) || []).length, close = (s.match(/\}/g) || []).length; assert.equal(open, close, 'braces balance');
});

test('Play Billing rules, checked by reading: library 8+, pending purchases enabled, acknowledge, INAPP, refunds absent from the list', () => {
  const g = read('plugins/play-billing/android/build.gradle'); const v = /billingVersion = '(\d+)\./.exec(g);
  assert.ok(v && Number(v[1]) >= 8, 'Billing Library 8+ (Play requires it for new apps and updates from 31 Aug 2026)');
  const k = read('plugins/play-billing/android/src/main/java/com/gravegoods/playbilling/PlayBillingPlugin.kt');
  assert.match(k, /enableOneTimeProducts/); assert.match(k, /acknowledgePurchase/); assert.match(k, /ProductType\.INAPP/); assert.match(k, /PurchaseState\.PURCHASED/);
  assert.match(k, /queryPurchasesAsync/); assert.match(k, /ITEM_ALREADY_OWNED/); assert.match(k, /USER_CANCELED/); assert.match(k, /PurchaseState\.PENDING/);
  assert.equal((k.match(/\{/g) || []).length, (k.match(/\}/g) || []).length, 'braces balance');
  const pkg = JSON.parse(read('plugins/play-billing/package.json')); assert.equal(pkg.capacitor.android.src, 'android');
  assert.equal(JSON.parse(read('plugins/storekit/package.json')).capacitor.ios.src, 'ios');
  const deps = JSON.parse(read('package.json')).dependencies; assert.equal(deps['capacitor-storekit'], 'file:plugins/storekit'); assert.equal(deps['capacitor-play-billing'], 'file:plugins/play-billing'); assert.ok(deps['@capacitor/android']);
});

// ---- App Store Connect scripts
test('asc-products: dry-run plan is offline-safe, lists the four first-time steps, changes nothing without --apply', async () => {
  const logs = [];
  const r = await runProducts({ env: {}, argv: [], log: m => logs.push(m), fetchImpl: () => { throw new Error('no network in a dry run without credentials'); } });
  assert.equal(r.mode, 'offline'); assert.deepEqual(r.todo.map(s => s.op), ['create', 'localization', 'price', 'availability']);
  assert.match(logs.join('\n'), /dry run, nothing changed/); assert.match(logs.join('\n'), /base price 2\.99/);
  await assert.rejects(() => runProducts({ env: {}, argv: ['--apply'], log: () => {} }), /needs credentials/);
});

test('asc-products: planFor is idempotent against matching live state and finds drift', () => {
  const p = catalog.products[0], l = p.localizations[0];
  const live = { 'gg_adfree': { id: 'iap1', attrs: { name: p.referenceName, reviewNote: p.reviewNote, familySharable: false }, locs: { [l.locale]: { id: 'loc1', name: l.displayName, description: l.description } }, price: p.usd, hasAvailability: true } };
  assert.equal(planFor(catalog, live).filter(s => s.op !== 'noop').length, 0, 'nothing to do');
  const drift = structuredClone(live); drift.gg_adfree.price = 1.99; drift.gg_adfree.locs['en-US'].description = 'old'; drift.gg_adfree.attrs.name = 'Old';
  assert.deepEqual(planFor(catalog, drift).filter(s => s.op !== 'noop').map(s => s.op), ['update', 'localization-update', 'price']);
});

// A small in-memory App Store Connect that implements exactly the endpoints the script uses, to prove create -> second run is a no-op.
function fakeAsc() {
  const st = { iaps: [], locs: [], schedules: [], avail: [], calls: [] };
  const terr = ['USA', 'CAN', 'GBR'].map(id => ({ id, type: 'territories' }));
  const points = [1.99, 2.99, 3.99].map((p, i) => ({ id: 'pp' + i, type: 'inAppPurchasePricePoints', attributes: { customerPrice: p.toFixed(2) } }));
  const j = (data, extra = {}) => ({ ok: true, status: 200, text: async () => JSON.stringify({ data, ...extra }) });
  const nf = () => ({ ok: false, status: 404, text: async () => '{"errors":[]}' });
  const fetchImpl = async (url, o) => {
    const u = url.replace('https://api.appstoreconnect.apple.com', ''), m = o.method, body = o.body ? JSON.parse(o.body) : null; st.calls.push(m + ' ' + u);
    assert.match(o.headers.Authorization, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    let g;
    if (m === 'GET' && u.startsWith('/v1/apps?filter[bundleId]')) return j([{ id: 'app1', type: 'apps' }]);
    if (m === 'GET' && (g = /^\/v1\/apps\/app1\/inAppPurchasesV2\?filter\[productId\]=(\w+)/.exec(u))) return j(st.iaps.filter(i => i.attributes.productId === g[1]));
    if (m === 'POST' && u === '/v2/inAppPurchases') { const i = { id: 'iap' + (st.iaps.length + 1), type: 'inAppPurchases', attributes: { ...body.data.attributes } }; st.iaps.push(i); return j(i); }
    if (m === 'PATCH' && (g = /^\/v2\/inAppPurchases\/(\w+)$/.exec(u))) { Object.assign(st.iaps.find(i => i.id === g[1]).attributes, body.data.attributes); return j({}); }
    if (m === 'GET' && (g = /^\/v2\/inAppPurchases\/(\w+)\/inAppPurchaseLocalizations/.exec(u))) return j(st.locs.filter(l => l.iap === g[1]).map(l => ({ id: l.id, attributes: l.attributes })));
    if (m === 'POST' && u === '/v1/inAppPurchaseLocalizations') { st.locs.push({ id: 'loc' + (st.locs.length + 1), iap: body.data.relationships.inAppPurchaseV2.data.id, attributes: body.data.attributes }); return j({}); }
    if (m === 'PATCH' && (g = /^\/v1\/inAppPurchaseLocalizations\/(\w+)$/.exec(u))) { Object.assign(st.locs.find(l => l.id === g[1]).attributes, body.data.attributes); return j({}); }
    if (m === 'GET' && /\/pricePoints\?filter\[territory\]=USA/.test(u)) return j(points);
    if (m === 'POST' && u === '/v1/inAppPurchasePriceSchedules') { const iap = body.data.relationships.inAppPurchase.data.id; st.schedules = st.schedules.filter(s => s.iap !== iap); st.schedules.push({ id: 'sch' + iap, iap, point: body.included[0].relationships.inAppPurchasePricePoint.data.id }); return j({}); }
    if (m === 'GET' && (g = /^\/v2\/inAppPurchases\/(\w+)\/iapPriceSchedule$/.exec(u))) { const s = st.schedules.find(x => x.iap === g[1]); return s ? j({ id: s.id }) : nf(); }
    if (m === 'GET' && (g = /^\/v1\/inAppPurchasePriceSchedules\/(\w+)\/manualPrices/.exec(u))) { const s = st.schedules.find(x => x.id === g[1]); return j([{ id: 'mp', attributes: {}, relationships: { inAppPurchasePricePoint: { data: { id: s.point } } } }], { included: points }); }
    if (m === 'GET' && u.startsWith('/v1/territories')) return j(terr);
    if (m === 'POST' && u === '/v1/inAppPurchaseAvailabilities') { st.avail.push(body.data.relationships.inAppPurchase.data.id); assert.equal(body.data.relationships.availableTerritories.data.length, 3); return j({}); }
    if (m === 'GET' && (g = /^\/v2\/inAppPurchases\/(\w+)\/inAppPurchaseAvailability$/.exec(u))) return st.avail.includes(g[1]) ? j({ id: 'av' }) : nf();
    throw new Error('fake ASC: unhandled ' + m + ' ' + u);
  };
  return { st, fetchImpl };
}
test('asc-products --apply against a fake App Store Connect: creates everything, the 2nd run is a no-op, price drift is corrected', async () => {
  const k = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }); const p8 = k.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const env = { ISSUER_ID: 'iss', KEY_ID: 'KID1234567', P8: p8 }; const f = fakeAsc(); const logs = [];
  const first = await runProducts({ env, argv: ['--apply'], log: m => logs.push(m), fetchImpl: f.fetchImpl });
  assert.deepEqual(first.todo.map(s => s.op), ['create', 'localization', 'price', 'availability']);
  assert.equal(f.st.iaps.length, 1); assert.equal(f.st.iaps[0].attributes.productId, 'gg_adfree'); assert.equal(f.st.iaps[0].attributes.inAppPurchaseType, 'NON_CONSUMABLE');
  assert.equal(f.st.schedules[0].point, 'pp1', 'the 2.99 price point'); assert.ok(logs.some(l => /\[4\/4\]/.test(l)), 'progress is printed per step');
  const posts = f.st.calls.filter(c => c.startsWith('POST')).length;
  const second = await runProducts({ env, argv: ['--apply'], log: () => {}, fetchImpl: f.fetchImpl });
  assert.equal(second.todo.length, 0, 'idempotent'); assert.equal(f.st.calls.filter(c => c.startsWith('POST')).length, posts, 'no writes on the second run');
  f.st.schedules[0].point = 'pp0'; f.st.locs[0].attributes.description = 'stale';
  const third = await runProducts({ env, argv: ['--apply'], log: () => {}, fetchImpl: f.fetchImpl });
  assert.deepEqual(third.todo.map(s => s.op), ['localization-update', 'price']); assert.equal(f.st.schedules[0].point, 'pp1');
  const dry = await runProducts({ env, argv: [], log: () => {}, fetchImpl: f.fetchImpl }); assert.equal(dry.todo.length, 0);
});

test('JWT: ES256, three parts, kid/iss/aud/exp correct, and the signature verifies with the public key', () => {
  const k = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }); const p8 = k.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const t = makeJwt({ issuer: 'issuer-uuid', kid: 'ABC123DEFG', p8 }, 1_700_000_000); const [h, b, s] = t.split('.');
  const dec = x => JSON.parse(Buffer.from(x, 'base64url').toString());
  assert.deepEqual(dec(h), { alg: 'ES256', kid: 'ABC123DEFG', typ: 'JWT' }); assert.deepEqual(dec(b), { iss: 'issuer-uuid', iat: 1_700_000_000, exp: 1_700_000_900, aud: 'appstoreconnect-v1' });
  assert.equal(Buffer.from(s, 'base64url').length, 64, 'raw r||s signature');
  assert.ok(crypto.verify('sha256', Buffer.from(h + '.' + b), { key: k.publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')));
  assert.equal(credsFromEnv({}), null); assert.equal(credsFromEnv({ ISSUER_ID: 'a', KEY_ID: 'b' }), null);
  assert.deepEqual(Object.keys(credsFromEnv({ APP_STORE_CONNECT_ISSUER_ID: 'a', APP_STORE_CONNECT_KEY_IDENTIFIER: 'b', APP_STORE_CONNECT_PRIVATE_KEY: 'c' })), ['issuer', 'kid', 'p8']);
});

test('asc-promo-codes: dry run by default; enforces Apple\'s offer-code limits; says plainly that old promo codes are retired', async () => {
  const logs = []; const r = await runPromo({ env: {}, argv: ['--count', '500', '--expires', '2026-12-31', '--name', 'friends'], log: m => logs.push(m), today: new Date('2026-10-22T00:00:00Z') });
  assert.equal(r.applied, false); assert.match(logs.join('\n'), /FREE offer/); assert.match(logs.join('\n'), /retired/);
  const today = new Date('2026-10-22T00:00:00Z');
  assert.equal(validatePromo({ count: 500, expires: '2027-03-31', name: 'ok name' }, today).length, 0);
  assert.ok(validatePromo({ count: 20, expires: '2027-03-31', name: 'ok name' }, today)[0].includes('500 to 25000'));
  assert.ok(validatePromo({ count: 500, expires: '2027-05-01', name: 'ok name' }, today).some(e => /6 months/.test(e)));
  assert.ok(validatePromo({ count: 500, expires: '2026-10-01', name: 'ok name' }, today).some(e => /future/.test(e)));
  assert.ok(validatePromo({ count: 500, expires: '2027-01-01', name: '!' }, today).length === 1);
  await assert.rejects(() => runPromo({ env: {}, argv: ['--count', '500', '--expires', '2027-01-01', '--apply'], log: () => {}, today }), /needs ISSUER_ID/);
  assert.equal(parseArgs(['--count', '1000']).count, 1000);
});

test('no content gate in the build: no gg_full, no Drops, no Deeper Tombs sheet, and the legacy folder is not loaded by anything', () => {
  const build = read('scripts/build-www.mjs'); assert.ok(!/legacy-premium/.test(build) && !/premium\.js/.test(build));
  for (const f of ['www/payments.js', 'www/adfree.js', 'www/native.js']) { const t = read(f); assert.ok(!/gg_full|PAID_CLS|showUnlock|Deeper Tombs|gg_drop/.test(t.replace(/^\s*\/\*[\s\S]*?\*\//, '')), f + ' has no content gate'); }
  assert.ok(!/gg_full|gg_drop/.test(read('config/products.json')));
  assert.ok(fs.existsSync(path.join(ROOT, 'www/legacy-premium/README.md')) && /dormant, not wired/.test(read('www/legacy-premium/README.md')));
  assert.ok(fs.existsSync(path.join(ROOT, 'www/legacy-premium/monetization-extract.js')));
});
