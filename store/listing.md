# App Store listing: Grave Goods

Everything here is copy-paste ready for App Store Connect. Limits are Apple's; **(verify in the current UI)** where the form may have changed since mid-2026.

**What v1 is (keep every line below in step with this):** iPhone/iPad only (Android is planned, not in v1). Free. The only ads are optional rewarded videos the player taps (+1 Memory, +1 free seal next chamber); there is no interstitial, no banner and no tracking prompt. One purchase, Ad-free, turns those two video offers into free claims. One question on first launch asks whether to share anonymous play statistics. TestFlight builds ship with the video offers switched off. Owner placeholders are all listed in [`docs/OWNER-TODO.md`](../docs/OWNER-TODO.md).

## Assets

| What | File |
|---|---|
| App icon, 1024x1024, no alpha (App Store Connect rejects alpha) | [store/icon/app-icon-1024.png](icon/app-icon-1024.png). Original with alpha, for reference: [app-icon-1024-source.png](icon/app-icon-1024-source.png). Art source: `team/art/icon/app-icon-1024.png` |
| Screenshot 1, "Dig. Seal. Don't fall." | [screenshots/01-title.png](screenshots/01-title.png) |
| Screenshot 2, "Fever. Dynasties. Timelines." | [screenshots/02-dig.png](screenshots/02-dig.png) |
| Screenshot 3, "Seal what glows." | [screenshots/03-seal.png](screenshots/03-seal.png) |
| Screenshot 4, "Real relics. Real history." | [screenshots/04-relic.png](screenshots/04-relic.png) |
| Screenshot 5, "Fill the Collection." | [screenshots/05-collection.png](screenshots/05-collection.png) |
| Screenshot 6, "The odds are printed." | [screenshots/06-knucklebone.png](screenshots/06-knucklebone.png) |

**Screenshot order (owner ruling 6).** The store page must not lead with "Finders keepers." Frame 1 is the title screen, and the game's title screen prints that line. Until the frames are re-captured, upload them in this order: 02, 03, 04, 05, 06, 01. When they are re-captured (they are stale anyway: see below), make the first frame a dig, not the title.

The six frames are 1290x2796 (the 6.7-inch iPhone size), RGB, no alpha. Apple currently wants the largest iPhone size you have; 6.7-inch frames are scaled for smaller phones **(verify in the current UI: if it asks for 6.9-inch, 1320x2868, the art team re-renders)**. They were captured from build v1.0-rc7b on the new HUD (title screen with the Daily strip, a mid-dig with Fever and a Greece Dynasty, a seal landing on the Context Sheet, a relic card, the Collection, the knucklebone card) by `team/sprint13b/t/store.js` and `t/frames.js`. Re-run both if the screens change. LAUNCH.md also asks for a 30-second preview video (not yet made; optional for TestFlight, wanted for launch). iPad: the app is built as iPhone-and-iPad by default. Either supply iPad screenshots (13-inch) or restrict to iPhone in Xcode's "Targeted device families", which needs a one-line change in the project: ask the developer.

## Text

**Name** (30 max): `Grave Goods`

**Subtitle** (30 max): `Dig. Seal. Don't fall.`

**Tagline** (used wherever the store or a graphic wants one line under the name; proposed, owner to confirm): `Things buried with the dead. Nobody asked the dead.`
Alternates in the same voice: `Things buried with the dead. Mind the ceiling.` / `Everything here was buried on purpose.` The game's own title-screen line ("Finders keepers.") stays in the game; it is not used on the store page.

**Promotional text** (170 max, can be changed without a new build):
> Tap the dirt, find what the tomb kept, and seal it before the wall cracks. A free roguelike of real relics, printed odds and deadpan expedition notes.

**Keywords** (100 max, comma-separated, no spaces after commas; 94 used):
`roguelike,archaeology,dig,puzzle,relics,tomb,history,strategy,mining,treasure,collection,daily`

Do not put another company's game name in the keywords (for example "Balatro"). Apple rejects keywords that use someone else's trademark, and LAUNCH.md's "Balatro-like" idea belongs in social posts, not here.

**Description** (4000 max):

```
The wall hides the hoard. You have a hammer, a pick, three seals and a ceiling that is thinking about it.

GRAVE GOODS is a free roguelike about digging up the dead's belongings and getting out with the good ones. Every chamber is a wall of dirt and stone. Strike it, uncover finds, and SEAL what glows to bank it. Push too far and the wall cracks, and what you hadn't sealed is gone.

HOW A RUN GOES
- Hammer the wall. Bigger tools open more tiles and cost more crack.
- Finds combine. Match a civilization, build a timeline, complete a set, and the seal multiplies.
- Seal early and be safe, or hold on for a bigger tally and risk the collapse.
- Each chamber asks for a target. Clear it and the tomb goes deeper.
- Fever builds as you dig well. The fourth full Fever of a run spins the Streak Jackpot wheel.

REAL RELICS, REAL HISTORY
- 48 relics from Egypt, Greece, the Norse world, the Maya, Mesopotamia and China.
- Every object comes with a line of real history and where the real thing is today.
- Some of what you dig up is a fake. The game says so, and tells you why.

CHOOSE WHO GOES IN
- Six raiders out of myth, each with a different way of digging.
- Seven tombs, each with its own light, weather and rules.
- A Daily Tomb: the same tomb, raider, kit and seed for everyone that day. Beat your own number.
- Rivals from the myths turn up with offers. The dead drive a bargain.

LUCK, WITH THE NUMBERS SHOWN
- After a big seal you may throw the knucklebone. It stakes that seal's points: one face in four pays triple, the other three take the seal back. The chance of each face is printed on the card, and the throw can be switched off in Settings.
- Chest reels are a reveal: the chest is decided before they spin. The wheel is a free spin after a Fever streak.
- Gold is earned by playing. It cannot be bought with real money.

MADE TO PICK UP AND PUT DOWN
- One-thumb play. Pauses automatically when you switch apps.
- Color-blind assist, reduced motion, large touch targets.

Free to play. No account, no sign-up.
Optional videos: on two cards you can choose to watch a short video for a small bonus (one extra Memory, or one extra seal in the next chamber). Nothing plays unless you tap it. One purchase, Ad-free, gives you those same bonuses without the videos.
On first launch the game asks once whether you want to share anonymous play statistics. Either answer is fine, and you can change it in Settings.
```

**What changed in this text and why (C-6), so nobody puts the old lines back:**

| Old line | Now | Why |
|---|---|---|
| "A Daily Tomb with the same seed for everyone. Beat your own number, or a friend's." | "the same tomb, raider, kit and seed for everyone that day. Beat your own number." | The fixed tomb, class and kit arrive with the game sprint that follows rc8 (owner ruling 7). **Do not submit this line with a game build where the Daily still uses each player's own tomb and kit**: check the game's release notes for the Daily fix first. "A friend's" is gone because the app has no way to compare two players (no leaderboard, no friends list). |
| "Nothing is hidden and nothing is rigged against you." | removed | An absolute we cannot stand behind in a game with a staged reveal. What is true and checkable is said instead: the chances are printed, and the chest is decided before the reels spin. |
| "HONEST ODDS" / "Chances are printed wherever luck is involved" | "LUCK, WITH THE NUMBERS SHOWN" and the three moments described | The knucklebone stakes the seal's points, not Gold; the old text implied all luck used Gold. The chest card still says "now and then" for some outcomes in rc8 (C-5), so "wherever" was too strong; the listing now names the knucklebone, whose faces are printed. |
| "Four full Fevers spin the Streak Jackpot." | "The fourth full Fever of a run spins the Streak Jackpot wheel." | Matches the rule in the game. |
| "Your progress follows your Apple ID through iCloud." | removed | The iCloud plugin has never been compiled or run on a device. Put a line back only after a tester has seen a save cross two devices; until then say nothing. |
| "VoiceOver labels" (never in this description, but in LAUNCH.md and the press kit) | not claimed anywhere | Nobody has used the app with VoiceOver. The buttons have `aria-label`s; that is not the same as a tested VoiceOver experience. |
| "every line fact-checked" (LAUNCH.md, posts) | not claimed anywhere | Four history lines were found wrong in review. Say "a line of real history" and fix errors as they are reported. |
| "a short ad can appear between runs" | removed | There is no interstitial in v1 (owner ruling 1). |

**Odds only change with an app update.** The chances of the knucklebone, Press Your Luck and the Streak Jackpot are not in the remote config and cannot be changed from a server (`www/remote-config.js` rejects any document that tries; test: `tests/remote-config.test.mjs`). The game sprint that follows rc8 removes the staged near-miss on the reels (owner ruling 3). Do not describe a build that still has the near-miss as having "no near-miss".

**Support URL** (required): `[SUPPORT URL]`. A page on the developer website with a contact address is enough. Use the same website that serves `app-ads.txt` (see `docs/OWNER-TODO.md`).
**Marketing URL** (optional): `[WEBSITE URL]`
**Privacy Policy URL** (required): `[HOSTED URL OF privacy-policy.md]`
**Copyright**: `[YEAR] [YOUR NAME OR COMPANY]`
**Category** (primary / secondary): Games > Puzzle / Games > Strategy. (Role Playing is also defensible.) **(verify in the current UI)**
**Price**: Free, with one in-app purchase: `gg_adfree` "Ad-free" (non-consumable, placeholder $2.99, set the final tier in App Store Connect). It gates no content. What it does: the two optional video offers (+1 Memory, +1 seal next chamber) become free claims with the same limits, so an owner never sees a video. Display name: `Ad-free`; description: `No videos: claim the video bonuses free.` (both come from `config/products.json`). Create it with the ASC setup workflow (tick products, then apply) or `node scripts/asc-products.mjs --apply`. Review notes: `store/review-notes.md`.
**What's New** (first release): `First release.`
**App Review notes** (put in the review information box): paste the block in `store/review-notes.md`. It is the single source; do not write a second version here.

## Availability and the EU (Digital Services Act)

**Decision: the owner is not a "trader" under the EU Digital Services Act, and the EU is excluded from availability at launch.** In App Store Connect > the app > Pricing and Availability, tick every country and region except the 27 EU member states. The full list, click path and what to do if you later change your mind are in [`docs/AVAILABILITY.md`](../docs/AVAILABILITY.md). Because the EU is unticked, no trader name, address or phone number is published for this app. If the EU is ever added, Apple will ask for the trader declaration first **(verify in the current UI)**.

## Age rating answers

Apple replaced the questionnaire in 2025 and may have reworded it again; answer each question truthfully **(verify in the current UI)** and treat the result as final. The rating the form produces is what counts, not this table.

| Question | Answer | Why |
|---|---|---|
| Cartoon or fantasy violence | None | Walls collapse; no characters are hurt on screen |
| Realistic violence, blood, gore, guns | None | |
| Horror / fear themes | Infrequent/Mild (or None) | Tombs, death and curses as setting, played deadpan. No scares |
| Sexual content or nudity, profanity | None | |
| Alcohol, tobacco, drug use | None | |
| **Simulated gambling** | **Infrequent/Mild** | See rationale below |
| Real-money gambling | None | No real-money bets, prizes or purchasable currency exist |
| Contests | None | The Daily Tomb is a shared seed with a personal best, no prizes |
| Unrestricted web access | No | No browser inside the app |
| User-generated content / chat / messaging | No | Players cannot see each other's text |
| Advertising | **Yes** | Rewarded video only, always started by the player. No interstitial, no banner |
| Loot boxes | None | Nothing is sold in random bundles. LAUNCH.md rules out loot boxes for money |

**Simulated gambling rationale** (keep this; Review may ask):
The game has three luck moments. (1) The knucklebone: after a big seal the player may throw it, at most once a chamber. It stakes that seal's points (not Gold): one face, 32%, pays the seal three times over; the other three faces take the seal back. Slightly worse than a fair bet, and the card prints the chance of each face. It can be switched off in Settings. (2) Chest reels: a three-reel reveal when a chest is opened. Nothing is staked and the result is decided before the reels spin. (3) The wheel: a free spin after the fourth full Fever of a run. Nothing is staked. They are occasional events inside a dig-and-bank puzzle game, not a casino game. The player can never wager real money, cannot buy Gold or any currency with real money (Gold is earned, never sold), and wins nothing of real-world value. The chances cannot be changed from a server; they change only with an app update. This paragraph describes rc8: the owner has asked for a re-dress of these moments (ruling 3), so re-read it against the build you submit. Because it is a simulated casino-style mechanic, we answer "Infrequent/Mild" rather than "None". If the form's rating comes out higher than 12+ because of this answer, take the higher rating; do not change the answer to get a lower number. The honest alternative, if you want a lower rating, is a design change (remove the slot-reel presentation), which is the Design Lead's call.

Expected result: 12+ on the older scale; on Apple's newer scale it may show as 13+ or higher **(verify in the current UI)**.

## Privacy labels (App Store Connect > App Privacy)

Answer "Yes, we collect data" and add:

Tracking: **No**. The app does not track: it never shows Apple's tracking prompt, never reads the advertising identifier, and asks AdMob for non-personalised ads only.

### Table 1: what the app itself collects (only from players who answered "Yes" to the first-launch question)

| Data type | Collected | Linked to the player's identity | Used to track | Purpose |
|---|---|---|---|---|
| Usage Data > Product Interaction (seals, collapses, relics found, settings changes, tutorial steps, whether a video offer was tapped, purchase started/completed) | Yes | No | No | Analytics |
| Diagnostics > Other Diagnostic Data (the game's own error events) | Yes | No | No | Analytics, App Functionality |
| Identifiers > Device ID (a random ID the app makes when the player says Yes; not the advertising ID, not the vendor ID; deleted if they later say No) | Yes | No | No | Analytics |
| Other Data (the device's time-zone offset from UTC, app version, iOS or Android) | Yes | No | No | Analytics |

Everything else (contact info, health, financial, precise location, contacts, photos, search history, browsing history, sensitive info, user content): **not collected**. Purchases: the app sends "Ad-free purchase started / completed" as a product-interaction event; it never sees payment details. If you prefer to be cautious, also declare **Purchases > Purchase History, not linked, Analytics**; over-disclosing costs nothing.

Apple's labels describe what the app *may* collect, so declare Table 1 even though each player can decline. Apple's definition of "linked" is broad **(verify in the current UI)**; there are no accounts and the random ID is never combined with anything that names a person, so "not linked" is accurate. iCloud saves are stored in the player's own iCloud and are not data we receive.

### Table 2: what Google's AdMob SDK collects (add this for any build where the video offers can be switched on)

Take the rows from Google's own data-disclosure page for the Google Mobile Ads SDK on the day you fill the form **(verify in the current UI)**; this is the shape to expect for a rewarded-only, non-personalised, no-tracking-prompt integration:

| Data type | Linked | Tracking | Purpose |
|---|---|---|---|
| Location > Coarse Location (derived from the IP address) | as Google states | **No** | Third-Party Advertising, Analytics |
| Usage Data > Advertising Data, Product Interaction (video shown, watched, tapped) | as Google states | **No** | Third-Party Advertising, Analytics |
| Diagnostics > Crash Data, Performance Data | No | No | App Functionality, Analytics |
| Identifiers > Device ID (a device or SDK-instance identifier; **not** the advertising identifier, which the app never unlocks) | as Google states | **No** | Third-Party Advertising, Analytics |

Why "Tracking: No" is the honest answer here, and what would make it wrong: Apple counts as tracking the linking of data from this app with other companies' data for targeted advertising. The app never calls App Tracking Transparency (the Info.plist has no tracking usage string, `tests/ios-patch.test.mjs`), so the advertising identifier is unavailable to Google, and every video is requested with the non-personalised flag (`npa`, `tests/ads.test.mjs`). It becomes wrong if anyone (a) adds the tracking prompt, (b) creates an "IDFA explainer" message in AdMob's Privacy & messaging, which makes Google's own SDK show Apple's prompt, or (c) removes the `npa` flag. Do none of those without changing this table and the policy first.

### The AdMob code is inside the app from day one

The AdMob SDK is linked into the app even while the video offers are switched off (it is never started and shows nothing; in TestFlight builds they are off by default). Apple's checks look at what is linked, not at what is switched on. So for any build you submit for **App Review**, declare Table 2 as well as Table 1. If you want a first release with no ad SDK at all, ask the developer to build without the plugin: `npm uninstall @capacitor-community/admob`, re-run the sync, and everything else keeps working (ads.js sees no plugin; Ad-free owners' claims still work).

## Export compliance and other quick answers

- Advertising identifier: if a form asks whether the app uses the IDFA, the truthful answer is that the app contains Google's ad SDK but never requests the permission that would let anything read the IDFA **(verify in the current UI; App Store Connect has moved this question more than once)**.
- Uses encryption: only standard HTTPS. `ITSAppUsesNonExemptEncryption` is already set to `false` in Info.plist, so the per-build question is skipped.
- Content rights: all art is generated in code by the team; all relic descriptions are original text. Confirm no third-party assets before ticking "I have the rights".
