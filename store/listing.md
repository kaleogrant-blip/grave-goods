# App Store listing: Grave Goods

Everything here is copy-paste ready for App Store Connect. Limits are Apple's; **(verify in the current UI)** where the form may have changed since mid-2026.

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

The six frames are 1290x2796 (the 6.7-inch iPhone size), RGB, no alpha. Apple currently wants the largest iPhone size you have; 6.7-inch frames are scaled for smaller phones **(verify in the current UI: if it asks for 6.9-inch, 1320x2868, the art team re-renders)**. They were captured from build v1.0-rc7b on the new HUD (title screen with the Daily strip, a mid-dig with Fever and a Greece Dynasty, a seal landing on the Context Sheet, a relic card, the Collection, the knucklebone card) by `team/sprint13b/t/store.js` and `t/frames.js`. Re-run both if the screens change. LAUNCH.md also asks for a 30-second preview video (not yet made; optional for TestFlight, wanted for launch). iPad: the app is built as iPhone-and-iPad by default. Either supply iPad screenshots (13-inch) or restrict to iPhone in Xcode's "Targeted device families", which needs a one-line change in the project: ask the developer.

## Text

**Name** (30 max): `Grave Goods`

**Subtitle** (30 max): `Dig. Seal. Don't fall.`

**Promotional text** (170 max, can be changed without a new build):
> Tap the dirt, find what the tomb kept, and seal it before the wall cracks. A free roguelike of real relics, honest odds and deadpan expedition notes.

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
- Fever builds as you dig well. Four full Fevers spin the Streak Jackpot.

REAL RELICS, REAL HISTORY
- 48 relics from Egypt, Greece, the Norse world, the Maya, Mesopotamia and China.
- Every object comes with a line of real history and where the real thing is today.
- Some of what you dig up is a fake. The game says so, and tells you why.

CHOOSE WHO GOES IN
- Six raiders out of myth, each with a different way of digging.
- Seven tombs, each with its own light, weather and rules.
- A Daily Tomb with the same seed for everyone. Beat your own number, or a friend's.
- Rivals from the myths turn up with offers. The dead drive a bargain.

HONEST ODDS
- Chances are printed wherever luck is involved. Nothing is hidden and nothing is rigged against you.
- Gold is earned by playing. It cannot be bought with real money. The only purchase is an optional Ad-free upgrade.

MADE TO PICK UP AND PUT DOWN
- One-thumb play. Pauses automatically when you switch apps.
- Color-blind assist, reduced motion, large touch targets.
- Your progress follows your Apple ID through iCloud.

Free to play. No account, no sign-up.
```

Ads are ON in v1, so add before the last line: "Optional rewarded videos can give a small bonus, and a short ad can appear between runs. One purchase removes every ad for good."

**Support URL** (required): `[SUPPORT URL]`. A GitHub Pages page with the contact email is enough.
**Marketing URL** (optional): `[WEBSITE URL]`
**Privacy Policy URL** (required): `[HOSTED URL OF privacy-policy.md]`
**Copyright**: `[YEAR] [YOUR NAME OR COMPANY]`
**Category** (primary / secondary): Games > Puzzle / Games > Strategy. (Role Playing is also defensible.) **(verify in the current UI)**
**Price**: Free, with one in-app purchase: `gg_adfree` "Ad-free" (non-consumable, placeholder $2.99, set the final tier in App Store Connect). It removes all ads and unlocks nothing else. Display name: `Ad-free`; description: `Removes every ad, for good. The whole game is free either way.` Create it with `node scripts/asc-products.mjs --apply`. Review notes: `store/review-notes.md`.
**What's New** (first release): `First release.`
**App Review notes** (put in the review information box): "No sign-in needed. The game has coin-flip, chest-reel and wheel moments; they use only earned in-game Gold, odds are printed on screen, and nothing can be bought with real money. Anonymous play statistics can be switched off in Settings > Play log."

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
| Advertising | **Yes** (v1 ships with ads) | Rewarded video (player-initiated) and an occasional interstitial between finished runs |
| Loot boxes | None | Nothing is sold in random bundles. LAUNCH.md rules out loot boxes for money |

**Simulated gambling rationale** (keep this; Review may ask):
The game has three luck moments: an optional coin flip on a big seal (which can be switched off in Settings), a three-reel reveal when a chest is opened (the result is already decided before the reels spin), and a wheel after a full Fever streak. They are occasional events inside a dig-and-bank puzzle game, not a casino game. The player can never wager real money, cannot buy Gold or any currency with real money (Gold is earned, never sold), and wins nothing of real-world value. Odds are printed on screen next to every gamble, and the coin flip pays slightly less than a fair bet (32% heads, pays triple). Because it is a simulated casino-style mechanic, we answer "Infrequent/Mild" rather than "None". If the form's rating comes out higher than 12+ because of this answer, take the higher rating; do not change the answer to get a lower number. The honest alternative, if you want a lower rating, is a design change (remove the slot-reel presentation), which is the Design Lead's call.

Expected result: 12+ on the older scale; on Apple's newer scale it may show as 13+ or higher **(verify in the current UI)**.

## Privacy labels (App Store Connect > App Privacy)

Answer "Yes, we collect data" and add:

### Version 1, ads off (anonymous play statistics only)

| Data type | Collected | Linked to the player's identity | Used to track | Purpose |
|---|---|---|---|---|
| Usage Data > Product Interaction (seals, collapses, relics found, settings changes, tutorial steps) | Yes | No | No | Analytics |
| Diagnostics > Other Diagnostic Data (the game's own error events) | Yes | No | No | Analytics, App Functionality |
| Identifiers > Device ID (a random ID the app makes for itself on first launch; not the advertising ID, not the vendor ID) | Yes | No | No | Analytics |

Everything else (contact info, health, financial, location, contacts, photos, search history, browsing history, purchases, sensitive info, user content): **not collected**.

Tracking: **No**, the app does not track.

Notes for the form: the random ID never leaves the app combined with anything that names a person, and there are no accounts, so "not linked" is accurate. If you would rather be cautious, choose "linked"; over-disclosing costs nothing and Apple does not penalise it. Apple's definition of "linked" is broad (it includes a device-level ID) **(verify in the current UI)**. iCloud saves are stored in the player's own iCloud and are not data we receive. The play statistics can be switched off by the player in Settings > Play log, and the privacy policy says so.

### Version with ads on (this is v1: use this table; the ads-off table above is for reference only)

Add, in addition to the table above (Google's own guidance lists these for the AdMob SDK: check it at the time **(verify in the current UI)**):

| Data type | Linked | Tracking | Purpose |
|---|---|---|---|
| Identifiers > Device ID (the advertising identifier) | Yes (as Google states) | **Yes**, if the player allows tracking | Third-Party Advertising |
| Usage Data > Advertising Data | Yes | Yes | Third-Party Advertising |
| Usage Data > Product Interaction (ad interactions) | Yes | Yes | Third-Party Advertising |
| Diagnostics > Crash Data, Performance Data | No | No | App Functionality |
| Location > Coarse Location | Yes | Yes | Third-Party Advertising |

Tracking becomes **Yes**; the app's tracking prompt (App Tracking Transparency) is already built to appear once, after the first tomb clear, and only when ads are on.

### An important decision: the AdMob code is inside the app from day one

The AdMob SDK is linked into the app even while ads are off (it never starts, never asks for tracking, and shows nothing). Apple's static checks and App Store Connect's "Does this app use the Advertising Identifier (IDFA)?" question look at what is linked, not at what is switched on. So for any build you submit for **App Review**, answer the IDFA question truthfully (Yes, to serve ads). TestFlight builds do not ask. If you want a clean "no ads, no tracking" first release, ask the developer to build without the AdMob plugin: `npm uninstall @capacitor-community/admob`, re-run the sync, and everything else keeps working (ads.js sees no plugin and stays off).

## IDFA / export compliance quick answers

- Uses encryption: only standard HTTPS. `ITSAppUsesNonExemptEncryption` is already set to `false` in Info.plist, so the per-build question is skipped.
- Content rights: all art is generated in code by the team; all relic descriptions are original text. Confirm no third-party assets before ticking "I have the rights".
