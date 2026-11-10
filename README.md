# Grave Goods: app shell

Capacitor 7 wrapper around the single-file game (`game/current.html`, v1.0-rc9a). **v1 is iPhone/iPad only.** An Android project is kept in the repo and kept building, but Android is planned for after v1 and nothing public should mention it. The game file is never edited: everything native is added around it at build time and by wrapping the game's own functions at run time. Built on GitHub Actions' hosted machines because there is no Mac (Codemagic is kept as a secondary alternative); nothing here has been run in Xcode, Android Studio or on a device (see "Known gaps").

**Business model (owner rulings, 9 Nov 2026):** free game. The only ads are **opt-in rewarded videos** (AdMob): +1 Memory, +1 free seal next chamber. **No interstitial**, no banner, no tracking prompt. One purchase, `gg_adfree` ($2.99 placeholder, non-consumable). No content is gated. The earlier two-product design (full unlock + Drops) is parked, unloaded, in `www/legacy-premium/`.

**What Ad-free does, honestly.** With only opt-in videos there are no ads forced on anyone, so there is nothing to "remove". Ad-free turns the two video offers into free claims: the same slips, the same rewards, the same caps (one Memory per run, one seal banked at a time), no video, and Google's ad code never starts. That makes it a small convenience-plus-bonus purchase, and the store text says exactly that.

**What a TestFlight build does by default.** Video offers are **off** (`flags.ads` false in `config/config.json`; `FLAGS_ADS_DEFAULT: 'false'` in the workflow) until real AdMob ids exist. With them off there are no slips and no Ad-free row. Remote config or `FLAGS_ADS_DEFAULT=true` turns them on.

**Prompts, and when they appear.** (1) First launch: the app's own question, "Help improve the game: share anonymous play statistics?" (only in a build with a PostHog key). (2) First tap on a video offer, where Google requires it: Google's consent form. (3) The App Store sheet when buying. **Never** Apple's tracking prompt.

Everything only the owner can supply is in one list: [`docs/OWNER-TODO.md`](docs/OWNER-TODO.md).

```
npm install
npm run build:www     # game/current.html -> www/index.html
npm test              # about 190 tests, a few minutes, one file at a time (Playwright included; GG_REQUIRE_BROWSER=1 makes a missing browser a failure)
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
config/config.json                shipped balance values + flag defaults (host this for remote config). No luck odds: those are not remotely tunable
config/app.config.json            build-time defaults (PostHog, config URL, AdMob ids per platform); env vars override
config/products.json              the one product: gg_adfree (id, type, price, localisation, review note)
scripts/build-www.mjs             wrap fragment -> www/index.html (+ declared copy patch)
scripts/patch-ios.mjs             idempotent: entitlements, Info.plist (no tracking usage string), bundle id, deployment target 15, icon, splash, StoreKit scheme
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
www/telemetry.js                  PostHog batching, offline queue, consent gate, opt-out mirror
www/consent.js                    the first-launch analytics question and its Settings switch
www/ads.js                        opt-in rewarded videos only: two slips, caps persisted per run, Google consent (UMP), free claims for Ad-free
www/fonts/                        Cinzel and Alegreya (woff2, SIL Open Font License), bundled so the app fetches no fonts
www/payments.js                   window.Payments.go / window.ggPaymentResult over the store plugin; entitlement cache
www/adfree.js                     entitlement -> slips become free claims (and their labels); Settings "Purchases" section (Ad-free, Restore)
www/native.js                     bridge: haptics, status bar, pause, wiring of the above
www/legacy-premium/               dormant ported code of the old full-unlock + Drops design (not loaded) + README
www/index.html                    GENERATED, git-ignored
plugins/icloud-kv/                iOS: NSUbiquitousKeyValueStore plugin
plugins/storekit/                 iOS: StoreKit 2 plugin (Swift) + JS/TS shim + podspec
plugins/play-billing/             Android: Play Billing 8 plugin (Kotlin) + JS/TS shim
ios/App/...  android/...          generated by `cap add`, then patched; committed so CI starts from a known project
store/listing.md  store/review-notes.md  store/privacy-policy.md  store/play-listing.md
store/screenshots/*.png (6)  store/icon/app-icon-1024.png  store/play/{icon-512,feature-graphic-1024x500}.png  store/play/screenshots/*.png (6)
docs/OWNER-TODO.md  docs/TRACK-B.md  docs/AVAILABILITY.md  docs/ADS-UI.md  docs/GIFTING.md
tests/*.test.mjs                  build-www, telemetry, remote-config, save-adapter, ads, ad-slips, real-game-ads (events recorded from the real game), payments, store-assets, docs, ios-patch, android-patch, asc-jwt, asc-setup, workflows, smoke
```

## Architecture

**Page assembly.** `build-www.mjs` splits the fragment (`<title>`, `<link>`, `<style>` go to the head; the rest to the body) and emits: doctype, charset, viewport (`viewport-fit=cover`, `user-scalable=no`), `[hidden]{display:none!important}`, `@font-face` rules for the bundled fonts (the game's own Google Fonts `<link>` is removed from the built page; a CI build fails if any other Google Fonts reference appears), then scripts in this order: (1) a 6-line inline bridge setting `window.GG_NATIVE`, (2) `window.GG_APP_CONFIG` (build, PostHog, config URL, AdMob), (3) the support scripts, (4) the game script, (5) a last inline script calling `GG_NATIVE.attach(...)` with handles to the game's top-level `const`s (`SKILL`, `LUCK`, `ECON`, `TARGETS_BASE`, `Store`, ...). Top-level `const` is reachable from a later classic script by bare name, which is why no game edit is needed.

**Save.** The game's `Store` keeps `rw_*` in localStorage and mirrors one snapshot to `window.claude` (`use('user')`, `use('db').doc().get/set/delete`). Backend choice at boot (`GGSave.selectBackend`): `window.Capacitor` native -> install a `window.claude` look-alike backed by Preferences (local mirror, survives WebView eviction) and iCloud key-value store (follows the Apple ID); else real `window.claude` -> artifact db; else localStorage only. The game's own reconcile logic (newer copy wins, a new device adopts the cloud copy, quota errors keep progress local) runs unchanged. iCloud values are chunked (100k chars, meta written last, byte-count verified) under Apple's 1 MB limit. `rw_tel`, `rw_tel_open`, `rw_ua` are never synced. Migration: first native launch with nothing in Preferences or iCloud imports localStorage (a save found in either place always wins). Cross-device changes arrive on the next launch, not live.

**Haptics and lifecycle.** Wrapped game functions: `sealGo` (medium impact), `collapse` (error notification + heavy), `luckJackpot` (success), `beep` below 100 Hz (heavy thud), and `hap` (the game's existing vibrate calls, mapped to light/medium). Named events suppress the generic ones so one event is one buzz. Settings > Haptics is honoured. Status bar hidden at boot and on resume. App going inactive calls the game's `pauseOpen()` (it waits for a seal in flight) and flushes telemetry. Verified with a real run in the smoke test: a real Seal gives `MEDIUM`, a real collapse gives `ERROR` then `HEAVY`.

**Telemetry and consent.** The game already emits `gg:tel` events. Nothing leaves the device, and no ID exists, until the player answers **Yes** to the first-launch question (`consent.js`: "Help improve the game: share anonymous play statistics?", two equal buttons, shown to everyone in every country, answer kept in Preferences as `gg_tel_consent`). Unanswered counts as no. After a yes, `telemetry.js` creates `distinct_id` (random, in Preferences), adds `app_build`, `platform`, `remote_config_version`, `remote_config_source`, `$geoip_disable`, `$process_person_profile:false`, and queues in Preferences (cap 1000). Flush at 50 events or every 30 s, on pause and on page hide; network failure or 5xx backs off (5 s doubling to 5 min), 4xx drops the batch. Changing the answer to no (Settings > Privacy > "Share play statistics", drawn by `consent.js`) wipes the queue and deletes the ID. The game's own Settings > Play log (`rw_tel_off`) is a second, independent switch for the on-device log: sending needs both on. With no `POSTHOG_KEY` nothing is asked, queued or sent. The game's local ring buffer is untouched. Tested with a stubbed fetch and by watching every request the page makes (`tests/telemetry.test.mjs`, `tests/smoke.test.mjs`): before a yes, zero calls.

**Remote config.** On boot: apply the cached last-good document, then fetch `https://<CONFIG_URL>/config.json` with a 2 s timeout. The schema is strict: an unknown key, wrong type, out-of-range number or non-monotonic `skill.targets` rejects the whole document (nothing is applied, state records why). Valid documents are applied on top of the shipped baseline each time (so a key removed later reverts) by mutating the game's `SKILL`, `LUCK`, `ECON` in place. Two game quirks handled: `SKILL.seals.free` is a getter (relic bonus on a captured base), so it is shifted not assigned; `TARGETS` is the game's live per-chamber state, so only `TARGETS_BASE` is kept in step. Changeable: `skill.{targets, ch2T1, firstReal, deepMul, long4, seals, fever, cap, mercy, rel2}`, `econ.gold.*`, `flags.{ads, adMemory, adSeal}`, `ads.{memoryPerRun, sealBonus, cooldownSec}`. **Not changeable, on purpose: any luck odds.** The knucklebone chance and payout, the Press Your Luck weights (including the Stake 2 shift, `skill.press2`), the Streak Jackpot, chest reveals and tells are not in the schema, the applier has no handle on the game's `LUCK` object, and a document that carries a `luck` section is rejected whole. Odds change only with an app update, which is what the store text says. The config fetch is a plain file download with no identifier; it happens before the consent answer because the game needs it either way, and the privacy policy says so.

**Ads.** Off by default (`flags.ads` false in the shipped config and as the build default) and needs an AdMob rewarded unit id (or testing mode). Off means: AdMob never initialised, `body.gg-ads` absent so CSS hides any `[data-gg-ad]`. On: two slips, `GG_NATIVE.ads.offer('memory')` (`run.lives+1`, max 3, `ads.memoryPerRun` per run) and `offer('seal')` (`state.xs+1` in the next chamber). AdMob is initialised lazily on the first tap, after Google's UMP consent form where Google requires one; every video is requested non-personalised (`npa`). **No interstitial or banner API is called anywhere, and App Tracking Transparency is never requested** (the Info.plist has no tracking usage string). Game events with `training:true` are ignored; "first tomb cleared" is written only by a real, final `run_end` with outcome `won`, and no run ending shows or requests anything. Caps live in Preferences (`gg_ad_caps_v1`) keyed by `run.tid`, so a relaunch neither resets the once-per-run Memory nor loses a banked seal; a Memory granted after the game's last save is given back on resume, once (the shell snapshots the game's `rw_resume` record before the game boots and compares times). A banked seal lands in the chamber after the one it was earned in and is never applied twice to a wall the game resumes. The retired `reroll` and `chestpick` kinds are refused as `unknown_kind` and hidden by CSS, whether or not the game build still draws them. Details and the exact UI contract: `docs/ADS-UI.md`.

**Purchases and Ad-free.** The store is the truth. `plugins/storekit` (iOS, StoreKit 2) and `plugins/play-billing` (Android, Billing 8) share one contract: `canMakePayments`, `products`, `purchase`, `restore`, `entitlements`, event `transactionUpdate`. `payments.js` caches the entitlement in Preferences (`gg_ent_v1`), replaces it on every refresh (so a refund heals at the next launch), never writes it into the game's cloud save, and exposes the contract the game was written against: `window.Payments.go(action, product)` and `window.ggPaymentResult({product, ok, restored})`. `adfree.js` marks the owner (`flags().adFree`), which makes every slip a free claim in `ads.js` (same caps, no video, no AdMob), relabels the game's slips for owners ("Claim · +1 Memory"), and draws the Settings "Purchases" section by wrapping `showSettings` (no game edit): "Ad-free · price", "Restore purchases", or "Ad-free · purchased". Nothing is offered until the entitlement cache has been read, so an owner never sees a video slip at boot. If offers are off for everyone the claims are off too and the purchase row is hidden. A dev path that fakes ownership exists only when the build flag `DEV=true` (never in a release workflow; the release workflow fails if DEV is not false).

**Android (planned, not in v1).** Capacitor Android generated and patched by `patch-android.mjs`. Same web bundle. Save = Preferences plus Android Auto Backup (no live cross-device sync). Billing and AdMob as above.

**CI.** Primary: GitHub Actions (`.github/workflows/`). `ci.yml` runs `npm ci` and `GG_REQUIRE_BROWSER=1 npm test` (Playwright Chromium) on every push and PR. `asc-setup.yml` (Ubuntu) runs `scripts/asc-setup.mjs` with the App Store Connect key: registers the bundle ID with iCloud, reports the app record, optionally creates `gg_adfree`, writes a plain-English job summary. `ios-testflight.yml` (macos-15, 60 min, on manual run or an `ios-v*` tag) picks Xcode 26, then `npm ci`, `build:www`, `cap sync ios`, `patch-ios`, `pod install`, `xcodebuild archive` and `xcodebuild -exportArchive` (ExportOptions `app-store-connect`, `destination: upload`) with automatic signing through `-allowProvisioningUpdates` and the API key, so the build goes straight to TestFlight; build number = run number, version from `package.json`; video offers off by default, and Google test ads only if they are switched on. It fails fast naming any empty secret. `android-internal.yml` builds a signed `.aab` when the four keystore secrets exist, else an unsigned debug `.apk`, as a run artifact (Java 21: Capacitor 7 needs it). **Secondary:** `codemagic.yaml` (three workflows, same steps via Codemagic's tools) is kept but is not exercised and has not been updated for Xcode 26.

## Known gaps (honest list)

1. **Never built or run.** Neither the Swift plugins (iCloud, StoreKit) nor the Kotlin Play Billing plugin has been compiled; `pod install`, the pbxproj/gradle patches and `codemagic.yaml` are checked by reading and by node tests only. The first GitHub Actions run of each workflow is the first compile. Expect fix-ups. Specific doubts: Play Billing 8 callback shapes, StoreKit 2 `priceFormatStyle.currencyCode`, Codemagic field names for release notes and Play publishing, AdMob 7.2.0 method names (checked against the package typings; no ad has ever been requested).
2. **Capacitor 7, not 8.** Capacitor 7 targets Android API 35. Play may require target 36 for new apps by the time you publish; moving to Capacitor 8 (which defaults to Swift Package Manager) is a separate job.
3. **No ad has ever been requested from Google.** The two slips exist in the game (rc9a draws `memory` and `seal` only; a retired slip from an older build would be hidden and refused) and are tested against a stubbed plugin and the real game cards, but AdMob's real SDK has never run. For an Ad-free owner the shell rewrites the slip words in place; the cleaner fix is for the game to write them (`docs/ADS-UI.md` section 4).
4. **App Store Connect API request bodies are unverified** (`asc-setup.mjs`, `asc-products.mjs`, `asc-promo-codes.mjs`; marked VERIFY). Logic is tested against an in-memory fake. If Apple rejects a call, do it in the web UI (TRACK-B, GIFTING.md).
5. **iCloud sync is designed, not tested.** The iCloud key-value plugin has never been compiled or run on a device, so no public text claims cloud saves (`store/listing.md`). Android (planned) would be local plus Google's Auto Backup only.
6. **Two analytics switches.** The game's Settings > Play log controls the on-device log; the shell's Settings > Privacy > Share play statistics controls sending. `build-www` rewrites the game's Play log sentence in the built page so it points at the second switch. Proper fix is one switch, in the game. Also: the first-launch question is drawn by the shell in its own plain style, over the title screen; it has not been seen on a phone.
7. **Share-card "Save image"** uses a capability that is null in the app. Native share needs `@capacitor/share` and a game hook.
8. **Fonts are bundled** (Latin and Latin Extended subsets of Cinzel 700/900 and Alegreya 500/700/500 italic, the exact faces the game asked Google for). Characters outside those subsets fall back to the system serif, as they did before whenever Google was unreachable.
8a. **No tracking usage string in Info.plist.** v1 never asks for tracking, so the key was removed. The AdMob plugin's binary still contains Apple's tracking API (unused). Not verified against a real upload: if App Store Connect ever emails about a missing purpose string, re-adding the key is one line in `scripts/patch-ios.mjs` and shows no prompt by itself.
8b. **Rewards and the game's resume (rc9a).** The game now saves the live wall on every change and resumes the same wall. The shell keeps to that: a banked seal lands once, in the chamber after the one it was earned in, and is tracked on the chamber in two fields the game saves with the wall (`adxs`, `adxsT`), so a resumed wall is never given it twice and never loses it. A rewarded Memory is given back on resume only when the game's saved run predates the grant; `tests/real-game-ads.test.mjs` relaunches three times after a grant, with and without a save in between, and the run ends with exactly one extra Memory each way.
9. **Store screenshots are stale** (rc4/rc7b); refresh before review, and do not lead with the title screen (its tagline is "Finders keepers."; owner ruling 6). iPhone only; iPad undecided.
10. **CORS.** The page origin is `capacitor://localhost` (iOS) or `https://localhost` (Android); the remote config host must send `Access-Control-Allow-Origin: *`.
11. **Dormant premium code.** `www/legacy-premium/` is unloaded. If cosmetics ever come back, read its README first (ownership persistence caveat).

## What is still manual

**Owner supplies:** the single checklist is [`docs/OWNER-TODO.md`](docs/OWNER-TODO.md) (Apple keys, AdMob ids, support address, developer website with `app-ads.txt` at its root, privacy policy blanks, PostHog key, price). Nothing in this repo may contain a personal email address or a secret: the repo is public.

**Owner decides**
- Final price of Ad-free, given what it now does (free claims of two small bonuses).
- The store tagline (proposal in `store/listing.md`).
- iPhone only or iPad too.
- When to switch video offers on (they are off in TestFlight builds).

**Developer (next sprint)** remove the two retired slips and write the owner labels in the game (`docs/ADS-UI.md`); one analytics switch in the game (gap 6); native share (gap 7); first-build fix-ups after the first GitHub Actions run; the 30 s preview video; crash-free-sessions tracking (TestFlight reports it in App Store Connect, no code needed).

**Each balance release** edit `config.json`, bump `version`, commit to the config repo. Each store release: copy the new game build in, `npm test`, push.
