# Grave Goods: iOS and Android app shell

Capacitor 7 wrapper (iOS and Android) around the single-file game (`game/current.html`, v1.0-rc7). The game file is never edited: everything native is added around it at build time and by wrapping the game's own functions at run time. Built on GitHub Actions' hosted machines because there is no Mac (Codemagic is kept as a secondary alternative); nothing here has been run in Xcode, Android Studio or on a device (see "Known gaps").

**Business model (owner decision):** free game, ads ON in v1 (AdMob rewarded + one interstitial rule), one purchase `gg_adfree` ($2.99 placeholder, non-consumable) that removes all ads. No content is gated. The earlier two-product design (full unlock + Drops) is parked, unloaded, in `www/legacy-premium/`.

```
npm install
npm run build:www     # game/current.html -> www/index.html
npm test              # 145 tests, a few minutes, one file at a time (Playwright smoke included; GG_REQUIRE_BROWSER=1 makes a missing browser a failure)
npx cap sync ios && node scripts/patch-ios.mjs
npx cap sync android && node scripts/patch-android.mjs
```

## Owner's steps (GitHub Actions, no Mac)

Full click-by-click version with the Team ID lookup: [`docs/TRACK-B.md`](docs/TRACK-B.md), Part A.

1. **Add four repository secrets**: github.com/kaleogrant-blip/grave-goods > **Settings** > **Secrets and variables** > **Actions** > **New repository secret**, once each for `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_IDENTIFIER`, `APP_STORE_CONNECT_PRIVATE_KEY` (the whole `.p8` text) and `APPLE_TEAM_ID` (developer.apple.com/account > **Membership details** > **Team ID**). The Apple key is made in App Store Connect > Users and Access > Integrations > App Store Connect API > Team Keys > **+**, role **Admin**.
2. **Actions** tab > **ASC setup** > **Run workflow**: registers the bundle ID `com.gravegoods.app` with iCloud and reports whether the app record exists (read the run's summary).
3. **Create the app record** in App Store Connect (website only): Apps > **+** > New App, choose the bundle ID that step 2 registered. Run **ASC setup** again to confirm. (This comes after step 2 because the Bundle ID drop-down lists only registered IDs.)
4. Optional: run **ASC setup** with `products` ticked (dry run), then `products` + `apply` to create the `gg_adfree` purchase.
5. In App Store Connect > Pricing and Availability untick the 27 EU countries ([`docs/AVAILABILITY.md`](docs/AVAILABILITY.md); EU excluded at launch, owner is not a DSA "trader").
6. **Actions** > **iOS TestFlight** > **Run workflow** (or push a tag `ios-v1`). The build lands in TestFlight 10 to 30 minutes after the job succeeds.

Workflows: `ci.yml` (tests on every push and PR), `asc-setup.yml`, `ios-testflight.yml`, `android-internal.yml`.

To take a new game build: `cp ../team/current.html game/current.html`, then `node scripts/extract-config.mjs` if any balance number moved (the smoke test fails if `config/config.json` drifts from the game), then `npm test`.

## File tree

```
package.json  capacitor.config.ts  codemagic.yaml (secondary CI)  release_notes.json  README.md
.github/workflows/                ci, asc-setup, ios-testflight, android-internal (primary CI)
game/current.html                 the game, a copy of team/current.html (artifact fragment). Never edited here
config/config.json                shipped balance values + flag defaults, version 1 (host this for remote config)
config/app.config.json            build-time defaults (PostHog, config URL, AdMob ids per platform); env vars override
config/products.json              the one product: gg_adfree (id, type, price, localisation, review note)
scripts/build-www.mjs             wrap fragment -> www/index.html (+ declared copy patch)
scripts/patch-ios.mjs             idempotent: entitlements, Info.plist, bundle id, deployment target 15, icon, splash, StoreKit scheme
scripts/patch-android.mjs         idempotent: manifest (AdMob id, AD_ID), strings, gradle (billing), icons, splash
scripts/png-flatten.mjs           minimal PNG re-encoder (icon must have no alpha)
scripts/extract-config.mjs        dump the game's shipped SKILL/LUCK/ECON into config/config.json
scripts/gen-storekit.mjs          products.json -> ios/App/GraveGoods.storekit (Xcode/local testing; --check mode)
scripts/asc-products.mjs          create/verify the IAP in App Store Connect (dry run by default, --apply)
scripts/asc-setup.mjs            bundle id + iCloud, app-record check, optional purchase, plain-English job summary (run by asc-setup.yml)
scripts/lib/territories.mjs       the 27 EU territory codes (EU is excluded from availability)
scripts/asc-promo-codes.mjs       Apple offer codes for gifts (dry run by default; see docs/GIFTING.md)
scripts/lib/asc.mjs               App Store Connect API client (JWT)
www/save-adapter.js               third save backend (Preferences + iCloud on iOS) as a window.claude look-alike
www/remote-config.js              fetch (2 s) / validate (strict) / apply / cache
www/telemetry.js                  PostHog batching, offline queue, opt-out mirror
www/ads.js                        rewarded + interstitial ads, caps, consent (UMP), ATT (iOS), reward appliers
www/payments.js                   window.Payments.go / window.ggPaymentResult over the store plugin; entitlement cache
www/adfree.js                     entitlement -> ads off; Settings "Purchases" section (Remove ads, Restore)
www/native.js                     bridge: haptics, status bar, pause, wiring of the above
www/legacy-premium/               dormant ported code of the old full-unlock + Drops design (not loaded) + README
www/index.html                    GENERATED, git-ignored
plugins/icloud-kv/                iOS: NSUbiquitousKeyValueStore plugin
plugins/storekit/                 iOS: StoreKit 2 plugin (Swift) + JS/TS shim + podspec
plugins/play-billing/             Android: Play Billing 8 plugin (Kotlin) + JS/TS shim
ios/App/...  android/...          generated by `cap add`, then patched; committed so CI starts from a known project
store/listing.md  store/review-notes.md  store/privacy-policy.md  store/play-listing.md
store/screenshots/*.png (6)  store/icon/app-icon-1024.png  store/play/{icon-512,feature-graphic-1024x500}.png  store/play/screenshots/*.png (6)
docs/TRACK-B.md  docs/AVAILABILITY.md  docs/ADS-UI.md  docs/GIFTING.md
tests/*.test.mjs                  build-www, telemetry, remote-config, save-adapter, ads, interstitial, payments, store-assets, ios-patch, android-patch, asc-jwt, asc-setup, workflows, smoke
```

## Architecture

**Page assembly.** `build-www.mjs` splits the fragment (`<title>`, `<link>`, `<style>` go to the head; the rest to the body) and emits: doctype, charset, viewport (`viewport-fit=cover`, `user-scalable=no`), `[hidden]{display:none!important}`, offline font fallbacks declared before the Google Fonts link, then scripts in this order: (1) a 6-line inline bridge setting `window.GG_NATIVE`, (2) `window.GG_APP_CONFIG` (build, PostHog, config URL, AdMob), (3) the five support scripts, (4) the game script, (5) a last inline script calling `GG_NATIVE.attach(...)` with handles to the game's top-level `const`s (`SKILL`, `LUCK`, `ECON`, `TARGETS_BASE`, `Store`, ...). Top-level `const` is reachable from a later classic script by bare name, which is why no game edit is needed.

**Save.** The game's `Store` keeps `rw_*` in localStorage and mirrors one snapshot to `window.claude` (`use('user')`, `use('db').doc().get/set/delete`). Backend choice at boot (`GGSave.selectBackend`): `window.Capacitor` native -> install a `window.claude` look-alike backed by Preferences (local mirror, survives WebView eviction) and iCloud key-value store (follows the Apple ID); else real `window.claude` -> artifact db; else localStorage only. The game's own reconcile logic (newer copy wins, a new device adopts the cloud copy, quota errors keep progress local) runs unchanged. iCloud values are chunked (100k chars, meta written last, byte-count verified) under Apple's 1 MB limit. `rw_tel`, `rw_tel_open`, `rw_ua` are never synced. Migration: first native launch with nothing in Preferences or iCloud imports localStorage (a save found in either place always wins). Cross-device changes arrive on the next launch, not live.

**Haptics and lifecycle.** Wrapped game functions: `sealGo` (medium impact), `collapse` (error notification + heavy), `luckJackpot` (success), `beep` below 100 Hz (heavy thud), and `hap` (the game's existing vibrate calls, mapped to light/medium). Named events suppress the generic ones so one event is one buzz. Settings > Haptics is honoured. Status bar hidden at boot and on resume. App going inactive calls the game's `pauseOpen()` (it waits for a seal in flight) and flushes telemetry. Verified with a real run in the smoke test: a real Seal gives `MEDIUM`, a real collapse gives `ERROR` then `HEAVY`.

**Telemetry.** The game already emits `gg:tel` events. `telemetry.js` listens, adds `distinct_id` (random, in Preferences), `app_build`, `platform`, `remote_config_version`, `remote_config_source`, `$geoip_disable`, `$process_person_profile:false`, and queues in Preferences (cap 1000). Flush at 50 events or every 30 s, on pause and on page hide; network failure or 5xx backs off (5 s doubling to 5 min), 4xx drops the batch. Opt-out mirrors the game's Settings > Play log (`rw_tel_off`): queue wiped, nothing sent, and the flag is re-asserted if storage is wiped or a cloud restore drops it. With no `POSTHOG_KEY` nothing is queued. The game's own local ring buffer is untouched.

**Remote config.** On boot: apply the cached last-good document, then fetch `https://<CONFIG_URL>/config.json` with a 2 s timeout. The schema is strict: an unknown key, wrong type, out-of-range number or non-monotonic `skill.targets` rejects the whole document (nothing is applied, state records why). Valid documents are applied on top of the shipped baseline each time (so a key removed later reverts) by mutating the game's `SKILL`, `LUCK`, `ECON` in place. Two game quirks handled: `SKILL.seals.free` is a getter (relic bonus on a captured base), so it is shifted not assigned; `TARGETS` is the game's live per-chamber state, so only `TARGETS_BASE` is kept in step. Changeable: `skill.{targets, ch2T1, firstReal, deepMul, long4, seals, fever, press2, cap, mercy, rel2}`, `luck.{press, near, coin, jackpot, tell}`, `econ.gold.*`, `flags.*`, `ads.*`. Values the game copies at load beyond these are not reachable.

**Ads.** On by default (`flags.ads` true in the shipped config and as the build default) and needs an AdMob unit id (or testing mode). Off means: AdMob never initialised, ATT never asked, `body.gg-ads` absent so CSS hides any `[data-gg-ad]`. Rewarded: `GG_NATIVE.ads.offer(kind)`; memory ad `run.lives+1` (max 3, `ads.memoryPerRun`), seal ad `state.xs+1`, reroll and chest re-pick fire `gg:ad-reward` for the game. Interstitial: only on a run summary, every `ads.interstitialEvery` (2) finished runs, never within `ads.interstitialMinGapSec` (180) of the last one, never before the first tomb clear of a fresh profile; both are remote-config keys, and `flags.adInterstitial` switches it off. Consent: Google UMP where required; ATT on iOS once, after the first clear. Google test unit ids are used while `ADMOB_TESTING` is true. The exact UI the game needs is in `docs/ADS-UI.md`.

**Purchases and ad-free.** The store is the truth. `plugins/storekit` (iOS, StoreKit 2) and `plugins/play-billing` (Android, Billing 8) share one contract: `canMakePayments`, `products`, `purchase`, `restore`, `entitlements`, event `transactionUpdate`. `payments.js` caches the entitlement in Preferences (`gg_ent_v1`), replaces it on every refresh (so a refund heals at the next launch), never writes it into the game's cloud save, and exposes the contract the game was written against: `window.Payments.go(action, product)` and `window.ggPaymentResult({product, ok, restored})`. `adfree.js` forces every ad flag off when the product is owned, regardless of remote config, and draws the Settings "Purchases" section by wrapping `showSettings` (no game edit): "Remove ads - price", "Restore purchases", or "Ad-free · purchased". Ads stay off until the cache has been read, so an owner never sees a flash of ads. A dev path that fakes ownership exists only when the build flag `DEV=true` (never in a release workflow; the release workflow fails if DEV is not false).

**Android.** Capacitor Android generated and patched by `patch-android.mjs`. Same web bundle. Save = Preferences plus Android Auto Backup (no live cross-device sync). Billing and AdMob as above.

**CI.** Primary: GitHub Actions (`.github/workflows/`). `ci.yml` runs `npm ci` and `GG_REQUIRE_BROWSER=1 npm test` (Playwright Chromium) on every push and PR. `asc-setup.yml` (Ubuntu) runs `scripts/asc-setup.mjs` with the App Store Connect key: registers the bundle ID with iCloud, reports the app record, optionally creates `gg_adfree`, writes a plain-English job summary. `ios-testflight.yml` (macos-15, 60 min, on manual run or an `ios-v*` tag) picks Xcode 26, then `npm ci`, `build:www`, `cap sync ios`, `patch-ios`, `pod install`, `xcodebuild archive` and `xcodebuild -exportArchive` (ExportOptions `app-store-connect`, `destination: upload`) with automatic signing through `-allowProvisioningUpdates` and the API key, so the build goes straight to TestFlight; build number = run number, version from `package.json`; Google test ads only. It fails fast naming any empty secret. `android-internal.yml` builds a signed `.aab` when the four keystore secrets exist, else an unsigned debug `.apk`, as a run artifact (Java 21: Capacitor 7 needs it). **Secondary:** `codemagic.yaml` (three workflows, same steps via Codemagic's tools) is kept but is not exercised and has not been updated for Xcode 26.

## Known gaps (honest list)

1. **Never built or run.** Neither the Swift plugins (iCloud, StoreKit) nor the Kotlin Play Billing plugin has been compiled; `pod install`, the pbxproj/gradle patches and `codemagic.yaml` are checked by reading and by node tests only. The first GitHub Actions run of each workflow is the first compile. Expect fix-ups. Specific doubts: Play Billing 8 callback shapes, StoreKit 2 `priceFormatStyle.currencyCode`, Codemagic field names for release notes and Play publishing, AdMob 7.2.0 method names (checked against the package typings; no ad has ever been requested).
2. **Capacitor 7, not 8.** Capacitor 7 targets Android API 35. Play may require target 36 for new apps by the time you publish; moving to Capacitor 8 (which defaults to Swift Package Manager) is a separate job.
3. **The game has no ad buttons.** The ad machinery works against a stub, but nothing in the UI calls it. The Design seat builds them from `docs/ADS-UI.md` (buttons with `data-gg-ad`, `gg:ad-reward` listeners). The interstitial needs no UI.
4. **App Store Connect API request bodies are unverified** (`asc-setup.mjs`, `asc-products.mjs`, `asc-promo-codes.mjs`; marked VERIFY). Logic is tested against an in-memory fake. If Apple rejects a call, do it in the web UI (TRACK-B, GIFTING.md).
5. **Android save** is local plus Google's Auto Backup only. iOS has live iCloud key-value sync; Android has no equivalent.
6. **Settings copy was untrue once data leaves the device**, so `build-www` rewrites the "Play log" sentence in the built page only. Proper fix is in the game.
7. **Share-card "Save image"** uses a capability that is null in the app. Native share needs `@capacitor/share` and a game hook.
8. **Google Fonts is still fetched at start.** It tells Google the player's IP; the privacy policy says so. Bundling Cinzel and Alegreya removes it.
9. **Store screenshots are from rc4**; refresh before review. iPhone only; iPad undecided. The Play feature graphic is a plain draft.
10. **CORS.** The page origin is `capacitor://localhost` (iOS) or `https://localhost` (Android); the remote config host must send `Access-Control-Allow-Origin: *`.
11. **Dormant premium code.** `www/legacy-premium/` is unloaded. If cosmetics ever come back, read its README first (ownership persistence caveat).

## What is still manual (one page)

**Owner supplies**

| Item | Where it goes |
|---|---|
| Final Bundle ID (placeholder `com.gravegoods.app`) | `capacitor.config.ts` `appId` (and `codemagic.yaml` `BUNDLE_ID` if used); Apple registration is done by ASC setup |
| App ID with iCloud capability ticked | done by the ASC setup workflow (TRACK-B A3) |
| App Store Connect app record | App Store Connect website (TRACK-B A4) |
| `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_IDENTIFIER`, `APP_STORE_CONNECT_PRIVATE_KEY` (.p8 text, key role Admin), `APPLE_TEAM_ID` | GitHub repository secrets (TRACK-B A1, A2) |
| `CERTIFICATE_PRIVATE_KEY` (Codemagic only) | `gg_secrets` (step 4) |
| The GitHub repo (public, done) | github.com/kaleogrant-blip/grave-goods |
| Codemagic account and `gg_secrets` group (only if you use the secondary CI) | step 5 |
| `POSTHOG_KEY` (`phc_...`), `POSTHOG_HOST` (optional) | GitHub secrets (step 8) |
| A public HTTPS place for `config.json`, with CORS `*`; its host as `CONFIG_URL` (optional GitHub secret) | step 9 |
| Developer or company name, contact email, postal address if required, effective date, retention period; a public URL for the privacy policy | `store/privacy-policy.md` placeholders; App Store Connect |
| Support URL, marketing URL (optional), copyright line | `store/listing.md` |
| TestFlight testers' emails or a public link | step 7 |
| `ADMOB_APP_ID_IOS`, `ADMOB_REWARDED_ID_IOS`, `ADMOB_INTERSTITIAL_ID_IOS` (AdMob iOS app + 2 units) | `gg_secrets` (step 10) |
| `ADMOB_APP_ID_ANDROID`, `ADMOB_REWARDED_ID_ANDROID`, `ADMOB_INTERSTITIAL_ID_ANDROID` (AdMob Android app + 2 units) | `gg_secrets` (step 10) |
| A website for `app-ads.txt` (needs a domain you control) | step 10 |
| Paid Apps agreement, bank and tax forms (Apple) | App Store Connect > Business (step 11) |
| App Store Connect API key with App Manager or Admin role for the IAP and offer-code scripts | step 3 |
| Google Play Console developer account ($25 once) and the app record | step 12 |
| Android upload keystore: `ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` (all four or an unsigned debug apk is built) | GitHub secrets (step 12) |
| Google Cloud service account JSON with Play Console access: `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` | `gg_secrets` (step 12) |
| Price tier decision for `gg_adfree` (placeholder $2.99) | `config/products.json`, both stores |
| `ADMOB_TESTING` (set per workflow, not a secret) | `.github/workflows/*.yml` (and `codemagic.yaml`) |

**Owner decides**
- Final price of Ad-free. Ads are ON in v1 (decided), so answer Yes to the IDFA question at review.
- iPhone only or iPad too.
- Bundle fonts (known gap 6) or keep Google Fonts.
- Whether the 6-frame screenshots and the icon are final.

**Developer (next sprint)** ad buttons and listeners per `docs/ADS-UI.md` (gap 3); fix the Play log copy in the game (gap 4); native share (gap 5); first-build fix-ups after the first GitHub Actions run; the 30 s preview video; crash-free-sessions tracking (TestFlight reports it in App Store Connect, no code needed).

**Each balance release** edit `config.json`, bump `version`, commit to the config repo. Each store release: copy the new game build in, `npm test`, push.
