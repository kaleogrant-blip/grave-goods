#!/usr/bin/env node
// Writes ios/App/GraveGoods.storekit (Xcode's local StoreKit test configuration) from config/products.json,
// so the products tested in Xcode / the simulator are the products listed in App Store Connect.
//   node scripts/gen-storekit.mjs           write the file
//   node scripts/gen-storekit.mjs --check   exit 1 if the committed file differs (CI / tests use this)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STOREKIT_PATH = 'ios/App/GraveGoods.storekit';
const TYPE = { consumable: 'Consumable', nonConsumable: 'NonConsumable', nonRenewable: 'NonRenewingSubscription' };
const uuidOf = s => { const h = crypto.createHash('sha1').update('gravegoods:' + s).digest('hex').toUpperCase(); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`; };

export function buildStorekit(catalog) {
  return {
    identifier: uuidOf('configuration'),
    nonRenewingSubscriptions: [],
    products: catalog.products.map(p => ({
      displayPrice: p.usd.toFixed(2),
      familyShareable: !!p.familyShareable,
      internalID: uuidOf(p.id),
      localizations: p.localizations.map(l => ({ description: l.description, displayName: l.displayName, locale: l.locale.replace('-', '_') })),
      productID: p.id,
      referenceName: p.referenceName,
      type: TYPE[p.kind]
    })),
    settings: { _failTransactionsEnabled: false, _locale: 'en_US', _storefront: 'USA', _storeKitErrors: [] },
    subscriptionGroups: [],
    version: { major: 3, minor: 0 }
  };
}

export function render(root = ROOT) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'config/products.json'), 'utf8'));
  return JSON.stringify(buildStorekit(catalog), null, 2) + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(ROOT, STOREKIT_PATH), want = render();
  if (process.argv.includes('--check')) {
    const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (have !== want) { console.error(`${STOREKIT_PATH} is out of date: run  node scripts/gen-storekit.mjs`); process.exit(1); }
    console.log(`${STOREKIT_PATH} is up to date`);
  } else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, want); console.log(`wrote ${STOREKIT_PATH}`); }
}
