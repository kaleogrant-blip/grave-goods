// Offline check of the App Store Connect JWT: ES256, kid/iss/aud as Apple documents, lifetime within Apple's 20-minute cap.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { makeJwt, credsFromEnv } from '../scripts/lib/asc.mjs';

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const p8 = privateKey.export({ type: 'pkcs8', format: 'pem' });
const creds = { issuer: '57246542-96fe-1a63-e053-0824d011072a', kid: 'ABC123DEFG', p8 };
const b64uJson = s => JSON.parse(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));

test('JWT has three parts and the header Apple requires', () => {
  const [h, , sig] = makeJwt(creds, 1_700_000_000).split('.');
  assert.deepEqual(b64uJson(h), { alg: 'ES256', kid: 'ABC123DEFG', typ: 'JWT' });
  assert.equal(Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64').length, 64, 'raw r||s signature, 64 bytes');
});

test('JWT claims: iss, aud appstoreconnect-v1, exp at most 20 minutes after iat', () => {
  const now = 1_700_000_000;
  const [, b] = makeJwt(creds, now).split('.');
  const c = b64uJson(b);
  assert.equal(c.iss, creds.issuer);
  assert.equal(c.aud, 'appstoreconnect-v1');
  assert.equal(c.iat, now);
  assert.ok(c.exp > c.iat && c.exp - c.iat <= 20 * 60, `lifetime ${c.exp - c.iat}s`);
});

test('JWT signature verifies with the public key (ieee-p1363)', () => {
  const [h, b, sig] = makeJwt(creds).split('.');
  const ok = crypto.verify('sha256', Buffer.from(h + '.' + b), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
  assert.equal(ok, true);
  const bad = crypto.verify('sha256', Buffer.from(h + '.' + b + 'x'), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
  assert.equal(bad, false);
});

test('credsFromEnv reads the three secret names and tolerates a .p8 pasted with literal \\n', () => {
  const env = { APP_STORE_CONNECT_ISSUER_ID: 'iss', APP_STORE_CONNECT_KEY_IDENTIFIER: 'kid', APP_STORE_CONNECT_PRIVATE_KEY: p8.replace(/\n/g, '\\n') };
  const c = credsFromEnv(env);
  assert.equal(c.p8, p8);
  assert.doesNotThrow(() => makeJwt(c));
  assert.equal(credsFromEnv({ ...env, APP_STORE_CONNECT_KEY_IDENTIFIER: '' }), null);
});
