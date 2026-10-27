# legacy-premium: dormant, not wired

Owner decision (22 Oct 2026): v1 has **one** product, `gg_adfree` (removes ads). There is **no content gate**: every tomb, class and cosmetic is free.
So the "Deeper Tombs" sheet (`gg_full`, $4.99), `PAID_CLS` and the Drops tab (eight cosmetics + the `gg_drops_launch` bundle) are **not** in the build.

`monetization-extract.js` is the code from the other session's monetization build, copied verbatim. **Nothing loads it**: `scripts/build-www.mjs` does not list it, and
`tests/build-www.test.mjs` fails if the built page mentions it. It ships inside `www/` only because Capacitor copies the whole folder (about 12 KB).

## What the Drops table was (kept for the cosmetics pass)

| Product id | Item | USD |
|---|---|---|
| gg_drop_tetradrachm | Scholar skin 1 | 2.99 |
| gg_drop_petasos | Petasos hat | 1.99 |
| gg_drop_sulphur | Sulphur lamp | 1.99 |
| gg_drop_knossos | Knossos title scene | 3.99 |
| gg_drop_hildisvini | Brute skin 2 (Hildisvini) | 2.99 |
| gg_drop_valkyrie | Valkyrie wing helm | 1.99 |
| gg_drop_aurora_green | Aurora green lamp | 1.99 |
| gg_drop_aurora_mounds | Aurora over the Mounds scene | 3.99 |
| gg_drops_launch | bundle of all eight | 12.99 |

All eight are non-consumables. In the current game (rc7) they are sold for Gold in the Shop; a cosmetics pass would move them to money.

## What a port to the current game (rc7) must solve (found while reading it)

The extract assumes the rc5a game, where the functions live inside the game file. Against rc7 you cannot edit the game, so:

- **Shop tabs.** `showShop` draws its own tab row from a constant `TABS` inside the function and `ecoShopItems(tab)` is a global. Add a "Drops" tab by wrapping `window.showShop`: call the original, add a button to `.shop-tabs`, and render your own panel into `#shBody` and `#shDet`.
- **Ownership persists only if it looks like ownership.** `ecoShopLoad` rebuilds `SHOP.own` from `skin|hat|lamp|scene` arrays and drops everything else, so the monetization build's `SHOP.own.paid` would vanish on reload. Grant by pushing real ids (`skin: 'scholar:1'`, hat `petasos`, lamp `sulphur`, scene `knossos`) into `SHOP.own.*` and call `ecoSave()`; re-apply from StoreKit after `ecoLoad()` and `ecoReset()` (a purchase must survive Reset profile).
- **Hide the Gold copies** by wrapping `ecoShopItems` to filter the eight items out of the Gold tabs when Drops are live.
- **Kit-screen buttons** (`button.kcls`, `.ks[data-s]`, `.kt[data-t]`) are wired with closures: intercept with a capture-phase document click listener (as `ads.js` does for `[data-gg-ad]`).
- **Entitlement keys** `rw_full`, `rw_devfull`, `rw_unlock_seen` were excluded from the cloud save inside `Store`. rc7's `Store.keys()` does not exclude them; keep entitlements in Preferences (as `payments.js` now does), never in `rw_*`.
- `payments.js` already speaks the same contract (`Payments.go`, `ggPaymentResult`), so the per-product `buyItem(id)` wrapper is all a Drops UI needs; add the ids to `config/products.json` and run `scripts/gen-storekit.mjs` and `scripts/asc-products.mjs`.
