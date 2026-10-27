// Shared App Store Connect API plumbing: JWT (ES256) from the API key, and a tiny JSON:API client.
// Written from Apple's documented endpoints without access to a live account: every endpoint path is marked in the scripts that
// use it, and both scripts are dry-run by default so a wrong guess costs nothing.
import crypto from 'node:crypto';
import fs from 'node:fs';

export const API = 'https://api.appstoreconnect.apple.com';
const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** env: ISSUER_ID | APP_STORE_CONNECT_ISSUER_ID, KEY_ID | APP_STORE_CONNECT_KEY_IDENTIFIER,
 *       P8_PATH (file) | P8 | APP_STORE_CONNECT_PRIVATE_KEY (the .p8 text). Returns null when something is missing. */
export function credsFromEnv(env = process.env) {
  const issuer = env.ISSUER_ID || env.APP_STORE_CONNECT_ISSUER_ID, kid = env.KEY_ID || env.APP_STORE_CONNECT_KEY_IDENTIFIER;
  let p8 = env.P8 || env.APP_STORE_CONNECT_PRIVATE_KEY;
  if (!p8 && env.P8_PATH && fs.existsSync(env.P8_PATH)) p8 = fs.readFileSync(env.P8_PATH, 'utf8');
  if (!issuer || !kid || !p8) return null;
  return { issuer, kid, p8: p8.replace(/\\n/g, '\n') };
}

export function makeJwt({ issuer, kid, p8 }, now = Math.floor(Date.now() / 1000)) {
  const head = b64u(JSON.stringify({ alg: 'ES256', kid, typ: 'JWT' }));
  const body = b64u(JSON.stringify({ iss: issuer, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' })); // Apple allows at most 20 minutes
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + body), { key: p8, dsaEncoding: 'ieee-p1363' }); // raw r||s, as JWT ES256 requires
  return `${head}.${body}.${b64u(sig)}`;
}

export class AscError extends Error { constructor(status, method, url, body) { super(`${method} ${url} -> ${status} ${String(body).slice(0, 400)}`); this.status = status; } }

export function makeClient({ creds, fetchImpl = globalThis.fetch, base = API, log = () => {} }) {
  let token = null, at = 0;
  const jwt = () => { const t = Math.floor(Date.now() / 1000); if (!token || t - at > 600) { token = makeJwt(creds, t); at = t; } return token; };
  async function call(method, url, body) {
    const full = url.startsWith('http') ? url : base + url;
    const res = await fetchImpl(full, { method, headers: { Authorization: 'Bearer ' + jwt(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    if (!res.ok) throw new AscError(res.status, method, url, text);
    log(`${method} ${url} ${res.status}`);
    if (!text) return {};
    try { return JSON.parse(text); } catch { return { text }; }
  }
  /** GET every page of a list endpoint */
  async function all(url) {
    const out = { data: [], included: [] };
    for (let next = url, i = 0; next && i < 50; i++) {
      const r = await call('GET', next);
      out.data.push(...(r.data || [])); out.included.push(...(r.included || []));
      next = r.links && r.links.next;
    }
    return out;
  }
  return { get: u => call('GET', u), post: (u, b) => call('POST', u, b), patch: (u, b) => call('PATCH', u, b), all };
}
