// asc-setup against an in-memory fake of App Store Connect. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run, missingSecrets, SECRET_NAMES } from '../scripts/asc-setup.mjs';
import { EU_MEMBERS } from '../scripts/lib/territories.mjs';

const p8 = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const ENV = { APP_STORE_CONNECT_ISSUER_ID: 'iss', APP_STORE_CONNECT_KEY_IDENTIFIER: 'KID1234567', APP_STORE_CONNECT_PRIVATE_KEY: p8 };
const BID = 'com.gravegoods.app';
const TERRITORIES = [...EU_MEMBERS.map(m => m.code), 'USA', 'GBR', 'JPN', 'CAN'];

function fake({ bundle = false, caps = [], app = false, status = 200 } = {}) {
  const st = { bundle, caps: [...caps], app, calls: [] };
  const res = (code, body) => ({ ok: code < 400, status: code, text: async () => JSON.stringify(body) });
  const fetchImpl = async (url, opt = {}) => {
    const u = new URL(url), m = opt.method || 'GET', p = u.pathname; st.calls.push(`${m} ${p}${u.search}`);
    assert.match(opt.headers.Authorization, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    if (status !== 200) return res(status, { errors: [{ title: 'nope' }] });
    if (p === '/v1/apps' && u.searchParams.get('filter[bundleId]')) return res(200, { data: st.app ? [{ id: '999', attributes: { name: 'Grave Goods' } }] : [] });
    if (p === '/v1/apps') return res(200, { data: [] });
    if (p === '/v1/bundleIds' && m === 'GET') return res(200, { data: st.bundle ? [{ id: 'B1', attributes: { identifier: BID } }] : [] });
    if (p === '/v1/bundleIds' && m === 'POST') { st.bundle = true; return res(201, { data: { id: 'B1', attributes: JSON.parse(opt.body).data.attributes } }); }
    if (p === '/v1/bundleIds/B1/bundleIdCapabilities') return res(200, { data: st.caps.map(c => ({ attributes: { capabilityType: c } })) });
    if (p === '/v1/bundleIdCapabilities') { const a = JSON.parse(opt.body).data.attributes; st.caps.push(a.capabilityType); st.lastCap = a; return res(201, { data: {} }); }
    if (p === '/v1/territories') return res(200, { data: TERRITORIES.map(id => ({ id })) });
    if (/inAppPurchasesV2$/.test(p)) return res(200, { data: [] });
    return res(404, { errors: [{ title: 'unexpected ' + m + ' ' + p }] });
  };
  return { st, fetchImpl };
}
const go = (f, env = {}) => { const out = []; const sp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ggs-')), 'summary.md'); return run({ env: { ...ENV, ...env }, fetchImpl: f.fetchImpl, log: l => out.push(l), summaryPath: sp }).then(s => ({ s, out: out.join('\n'), file: fs.readFileSync(sp, 'utf8') })); };

test('missing secrets fail up front, naming them and never calling Apple', async () => {
  const f = fake(); const { s, out } = await go(f, { APP_STORE_CONNECT_PRIVATE_KEY: '' });
  assert.equal(s.ok, false); assert.match(out, /APP_STORE_CONNECT_PRIVATE_KEY/); assert.equal(f.st.calls.length, 0);
  assert.deepEqual(missingSecrets({}), SECRET_NAMES);
});

test('fresh account: registers the bundle id with iCloud, says the app record is missing, prints the instructions', async () => {
  const f = fake(); const { s, out, file } = await go(f);
  assert.equal(s.ok, true);
  assert.ok(f.st.caps.includes('ICLOUD'));
  assert.equal(f.st.lastCap.capabilityType, 'IN_APP_PURCHASE');
  assert.match(out, /Registered the bundle ID `com\.gravegoods\.app` named "Grave Goods"/);
  assert.match(out, /Apps, then the blue \+ button, then New App/);
  assert.match(out, /Grave Goods - com\.gravegoods\.app/);
  assert.ok(file.includes('Grave Goods - com.gravegoods.app'));
});

test('everything present: nothing is created, no POSTs', async () => {
  const f = fake({ bundle: true, caps: ['ICLOUD', 'IN_APP_PURCHASE'], app: true }); const { s, out } = await go(f);
  assert.equal(s.ok, true); assert.ok(!f.st.calls.some(c => c.startsWith('POST')));
  assert.match(out, /already registered/); assert.match(out, /Found: "Grave Goods"/);
  assert.match(out, /Nothing\. Run the "iOS TestFlight" workflow/);
});

test('products=true without apply is a dry run and never writes', async () => {
  const f = fake({ bundle: true, caps: ['ICLOUD', 'IN_APP_PURCHASE'], app: true }); const { out } = await go(f, { PRODUCTS: 'true' });
  assert.match(out, /Dry run: \d+ change\(s\) would be made/); assert.match(out, /create gg_adfree/);
  assert.ok(!f.st.calls.some(c => c.startsWith('POST') || c.startsWith('PATCH')));
});

test('products=true with no app record fails with a clear reason', async () => {
  const f = fake({ bundle: true, caps: ['ICLOUD'] }); const { s, out } = await go(f, { PRODUCTS: 'true' });
  assert.equal(s.ok, false); assert.match(out, /only be created once the app record exists/);
});

test('Apple rejecting the key is explained in plain words', async () => {
  const { s, out } = await go(fake({ status: 401 }));
  assert.equal(s.ok, false); assert.match(out, /Apple refused the key \(HTTP 401\)/);
});

test('territory list: 27 EU members, listed once each, excluded from the tick list', async () => {
  assert.equal(EU_MEMBERS.length, 27); assert.equal(new Set(EU_MEMBERS.map(m => m.code)).size, 27);
  const { out } = await go(fake({ bundle: true, caps: ['ICLOUD', 'IN_APP_PURCHASE'], app: true }));
  assert.match(out, /Storefronts to tick \(4\)/); assert.match(out, /EU storefronts to leave unticked \(27\)/);
});
