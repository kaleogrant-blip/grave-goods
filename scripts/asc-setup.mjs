#!/usr/bin/env node
// One-shot App Store Connect setup, meant to run inside the "ASC setup" GitHub Actions workflow (.github/workflows/asc-setup.yml).
//   (a) registers the bundle id (name "Grave Goods") with the iCloud capability if it is missing
//   (b) reports whether the App Store Connect app record exists (apps can only be created in the web UI)
//   (c) PRODUCTS=true: compares / creates the gg_adfree in-app purchase (scripts/asc-products.mjs). Dry run unless APPLY=true
//   (d) writes a plain-English summary to $GITHUB_STEP_SUMMARY (and stdout)
// Secrets (env): APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_KEY_IDENTIFIER, APP_STORE_CONNECT_PRIVATE_KEY (the .p8 text).
// Endpoints (App Store Connect API 1.x, VERIFY on the first run, nothing here has met the live API):
//   GET/POST /v1/bundleIds     GET /v1/bundleIds/{id}/bundleIdCapabilities     POST /v1/bundleIdCapabilities     GET /v1/apps?filter[bundleId]=     GET /v1/territories
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { credsFromEnv, makeClient, makeJwt, AscError } from './lib/asc.mjs';
import { readAppId } from './patch-ios.mjs';
import { run as runProducts } from './asc-products.mjs';
import { EU_CODES, EU_MEMBERS } from './lib/territories.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SECRET_NAMES = ['APP_STORE_CONNECT_ISSUER_ID', 'APP_STORE_CONNECT_KEY_IDENTIFIER', 'APP_STORE_CONNECT_PRIVATE_KEY'];
export const APP_NAME = 'Grave Goods';
export const SUGGESTED_SKU = 'gravegoods001';

export function missingSecrets(env = process.env) {
  const alias = { APP_STORE_CONNECT_ISSUER_ID: 'ISSUER_ID', APP_STORE_CONNECT_KEY_IDENTIFIER: 'KEY_ID', APP_STORE_CONNECT_PRIVATE_KEY: 'P8' };
  return SECRET_NAMES.filter(n => !(env[n] || env[alias[n]]));
}

export function newAppInstructions(bundleId) {
  return [
    'Creating the app record is only possible in the App Store Connect website (Apple has no API for it). It takes one minute:',
    '1. Open https://appstoreconnect.apple.com and sign in.',
    '2. Click Apps, then the blue + button, then New App.',
    `3. Platforms: tick iOS. Name: ${APP_NAME} (if Apple says it is taken, use e.g. "Grave Goods: Relic Wall"). Primary Language: English (U.S.).`,
    `4. Bundle ID: choose "${APP_NAME} - ${bundleId}" from the drop-down.`,
    `5. SKU: ${SUGGESTED_SKU} (any private label). User Access: Full Access.`,
    '6. Click Create. Then run this workflow again.'
  ];
}

async function bundleStep(api, bundleId) {
  const found = await api.all(`/v1/bundleIds?filter[identifier]=${encodeURIComponent(bundleId)}&limit=200`);
  let b = found.data.find(x => x.attributes && x.attributes.identifier === bundleId), created = false;
  if (!b) {
    const r = await api.post('/v1/bundleIds', { data: { type: 'bundleIds', attributes: { identifier: bundleId, name: APP_NAME, platform: 'IOS' } } });
    b = r.data; created = true;
  }
  const caps = await api.all(`/v1/bundleIds/${b.id}/bundleIdCapabilities?limit=200`);
  const have = new Set(caps.data.map(c => c.attributes && c.attributes.capabilityType));
  const rel = { bundleId: { data: { type: 'bundleIds', id: b.id } } };
  const added = [], notes = [];
  if (!have.has('ICLOUD')) {
    // ICLOUD_VERSION XCODE_6 = the current iCloud setup. The key-value store is part of the iCloud capability (there is no separate switch);
    // the app's entitlement com.apple.developer.ubiquity-kvstore-identifier is what actually uses it.
    await api.post('/v1/bundleIdCapabilities', { data: { type: 'bundleIdCapabilities', attributes: { capabilityType: 'ICLOUD', settings: [{ key: 'ICLOUD_VERSION', options: [{ key: 'XCODE_6', enabled: true }] }] }, relationships: rel } });
    added.push('iCloud (includes the key-value store)');
  }
  if (!have.has('IN_APP_PURCHASE')) {
    try { await api.post('/v1/bundleIdCapabilities', { data: { type: 'bundleIdCapabilities', attributes: { capabilityType: 'IN_APP_PURCHASE' }, relationships: rel } }); added.push('In-App Purchase'); }
    catch (e) { notes.push(`Could not switch on In-App Purchase (${String(e.message).slice(0, 160)}). Tick it by hand: developer.apple.com/account > Identifiers > ${bundleId}.`); }
  }
  return { created, added, alreadyHad: [...have].filter(Boolean), notes };
}

async function appStep(api, bundleId) {
  const r = await api.get(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&limit=1`);
  const a = r.data && r.data[0];
  return a ? { exists: true, id: a.id, name: a.attributes && a.attributes.name } : { exists: false };
}

async function territoryStep(api) {
  const t = await api.all('/v1/territories?limit=200');
  const ids = t.data.map(x => x.id).sort();
  const eu = ids.filter(i => EU_CODES.has(i)), tick = ids.filter(i => !EU_CODES.has(i));
  return { total: ids.length, eu, tick, euMissing: EU_MEMBERS.map(m => m.code).filter(c => !ids.includes(c)) };
}

const ICON = { ok: 'OK', changed: 'DONE', todo: 'TO DO', fail: 'PROBLEM', skip: 'SKIPPED' };

export function renderSummary(s) {
  const L = [];
  L.push('# App Store Connect setup', '');
  L.push(`Bundle ID: \`${s.bundleId}\`. ${s.apply ? 'Purchases: changes applied.' : 'Purchases (if checked): dry run only, nothing changed.'}`, '');
  L.push('| Step | Result |', '|---|---|');
  for (const x of s.sections) L.push(`| ${x.title} | ${ICON[x.status]} |`);
  L.push('');
  for (const x of s.sections) {
    L.push(`## ${x.title}: ${ICON[x.status]}`, '');
    for (const line of x.lines) L.push(line, '');
  }
  const todo = s.sections.filter(x => x.status === 'todo' || x.status === 'fail');
  L.push('## What to do next', '');
  if (!todo.length) L.push('Nothing. Run the "iOS TestFlight" workflow from the Actions tab.');
  else for (const x of todo) L.push(`- ${x.next || x.title}`);
  return L.join('\n') + '\n';
}

export async function run({ env = process.env, log = console.log, fetchImpl, summaryPath = env.GITHUB_STEP_SUMMARY, root = ROOT } = {}) {
  const wantProducts = env.PRODUCTS === 'true', apply = env.APPLY === 'true';
  const bundleId = env.BUNDLE_ID || readAppId(root);
  const s = { bundleId, apply, sections: [], ok: true };
  const add = (title, status, lines, next) => { s.sections.push({ title, status, lines, next }); if (status === 'fail') s.ok = false; };
  const finish = () => {
    const md = renderSummary(s);
    log(md);
    if (summaryPath) { try { fs.appendFileSync(summaryPath, md); } catch (e) { log('could not write the job summary: ' + e.message); } }
    return s;
  };

  const missing = missingSecrets(env);
  if (missing.length) {
    add('Secrets', 'fail', [`These repository secrets are empty or missing: ${missing.map(n => '`' + n + '`').join(', ')}.`, 'Add them under Settings > Secrets and variables > Actions > New repository secret (docs/TRACK-B.md, step A2), then run this workflow again.'], `Add the missing secret(s): ${missing.join(', ')}`);
    return finish();
  }
  const creds = credsFromEnv(env);
  try { makeJwt(creds); } catch (e) {
    add('Secrets', 'fail', ['The .p8 text in `APP_STORE_CONNECT_PRIVATE_KEY` could not be read as a key. Paste the whole file, including the BEGIN PRIVATE KEY and END PRIVATE KEY lines.', `(${e.message.split('\n')[0]})`], 'Re-enter APP_STORE_CONNECT_PRIVATE_KEY with the full .p8 text');
    return finish();
  }
  const api = makeClient({ creds, fetchImpl });

  try { await api.get('/v1/apps?limit=1'); add('Apple sign-in', 'ok', ['Apple accepted the key.']); }
  catch (e) {
    const auth = e instanceof AscError && (e.status === 401 || e.status === 403);
    add('Apple sign-in', 'fail', [auth ? 'Apple refused the key (HTTP ' + e.status + '). The Issuer ID, the Key ID and the .p8 must all come from the same key, and the key must still be active. A Team key needs the Admin role for the TestFlight workflow.' : 'Could not reach App Store Connect: ' + e.message], 'Check the three App Store Connect secrets against Users and Access > Integrations');
    return finish();
  }

  try {
    const b = await bundleStep(api, bundleId);
    const lines = [];
    lines.push(b.created ? `Registered the bundle ID \`${bundleId}\` named "${APP_NAME}".` : `The bundle ID \`${bundleId}\` was already registered.`);
    lines.push(b.added.length ? `Switched on: ${b.added.join(', ')}.` : 'iCloud and In-App Purchase were already on.');
    add('Bundle ID and iCloud', b.created || b.added.length ? 'changed' : 'ok', [...lines, ...b.notes]);
  } catch (e) {
    add('Bundle ID and iCloud', 'fail', ['Apple refused the request: ' + e.message, 'Most likely the key role is too low. Make a new key with the Admin role (docs/TRACK-B.md, step A1), or register the ID by hand: developer.apple.com/account > Certificates, Identifiers & Profiles > Identifiers > + > App IDs > App, tick iCloud.'], 'Fix the bundle ID step (see its message above)');
  }

  let app = { exists: false };
  try {
    app = await appStep(api, bundleId);
    if (app.exists) add('App Store Connect app record', 'ok', [`Found: "${app.name}" (Apple ID ${app.id}).`]);
    else add('App Store Connect app record', 'todo', [`There is no app with bundle ID \`${bundleId}\` yet.`, ...newAppInstructions(bundleId)], 'Create the app record in App Store Connect, then re-run this workflow');
  } catch (e) { add('App Store Connect app record', 'fail', ['Could not look for the app: ' + e.message]); }

  if (wantProducts) {
    if (!app.exists) add('Ad-free purchase (gg_adfree)', 'fail', ['Skipped: the purchase can only be created once the app record exists.'], 'Create the app record, then run again with products ticked');
    else {
      const out = [];
      try {
        const r = await runProducts({ env: { ...env, BUNDLE_ID: bundleId, APP_STORE_CONNECT_APP_ID: app.id }, argv: apply ? ['--apply'] : [], root, log: l => out.push(l), fetchImpl });
        const text = ['```', ...out, '```'];
        if (!r.todo.length) add('Ad-free purchase (gg_adfree)', 'ok', ['Already set up as config/products.json describes.', ...text]);
        else if (apply) add('Ad-free purchase (gg_adfree)', 'changed', ['Applied the changes below.', 'Still by hand in the website: the review screenshot, and attaching the purchase to the first app version you submit (docs/TRACK-B.md step 11).', ...text]);
        else add('Ad-free purchase (gg_adfree)', 'todo', [`Dry run: ${r.todo.length} change(s) would be made. Nothing was changed.`, ...text], 'Run this workflow again with products and apply both ticked to create the purchase');
      } catch (e) { add('Ad-free purchase (gg_adfree)', 'fail', ['Failed: ' + e.message, ...(out.length ? ['```', ...out, '```'] : [])], 'Read the purchase error above (or create gg_adfree by hand, docs/TRACK-B.md step 11)'); }
    }
  } else add('Ad-free purchase (gg_adfree)', 'skip', ['Not requested. Tick "products" when running the workflow to check or create it.']);

  try {
    const t = await territoryStep(api);
    add('Where the app can be sold', 'ok', [`Apple offers ${t.total} storefronts; ${t.eu.length} of them are EU members, which are left out at launch (docs/AVAILABILITY.md).`, `<details><summary>Storefronts to tick (${t.tick.length})</summary>\n\n${t.tick.join(' ')}\n\n</details>`, `<details><summary>EU storefronts to leave unticked (${t.eu.length})</summary>\n\n${t.eu.join(' ')}\n\n</details>`, ...(t.euMissing.length ? [`Note: Apple did not list these EU codes: ${t.euMissing.join(' ')}.`] : [])]);
  } catch (e) { add('Where the app can be sold', 'skip', ['Could not read the storefront list (' + e.message.slice(0, 120) + '). docs/AVAILABILITY.md has the EU list.']); }

  return finish();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().then(s => { process.exitCode = s.ok ? 0 : 1; }).catch(e => { console.error('asc-setup FAILED: ' + e.message); process.exit(1); });
}
