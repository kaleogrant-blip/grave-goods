# Grave Goods — Launch plan (owner: Kaleo)

## Business model (decided)
- Free to play. Ads are REWARDED ONLY (player opts in), and in v1 there are exactly two offers: watch for +1 Memory (max 1 per run), or +1 seal in the next chamber. No interstitial in v1 (owner ruling, 9 Nov 2026; the app has no code that can show one). Never between chambers unprompted, never on the practice wall. The Market reroll and chest re-pick videos are cut.
- No tracking: the app does not show Apple's tracking prompt and asks for non-personalised ads only.
- One purchase in v1: "Ad-free" (one-time). Because the only ads are opt-in, it does not "remove" anything forced; it gives the two video bonuses as free claims, same limits, no video. No content is gated. Price to be revisited with TestFlight numbers.
- Later, maybe: cosmetics (skins, hats, lamps, title scenes) and expansions (new tombs/civilizations). Never relic odds, Gold, or power.
- Luck odds are fixed in the app and change only with an app update. They are not in the remote config.
- No loot boxes for money. This keeps the design honest and avoids EU/Apple loot-box rules.

## App Store path
1. Apple Developer Program ($99/yr) — enrol now; it takes days.
2. Wrap the single HTML file with Capacitor (iOS). Native plugins: Haptics, StatusBar, App (pause/resume), Preferences (local save mirror), AdMob (rewarded only), optional Game Center for leaderboards (Daily Tomb) later. **v1 is iPhone/iPad only. Android comes after v1** and is not mentioned in any public text until then.
3. Cloud save: today it uses the claude.ai artifact store. In the app it must move to iCloud Key-Value store (Capacitor plugin) or a small backend. Plan one sprint for this.
4. Privacy: privacy policy URL (ads SDK requires it). No App Tracking Transparency prompt (rewarded-only, non-personalised ads, so none is needed). A one-time question on first launch asks whether to share anonymous play statistics; nothing is sent and no ID exists before a yes. Fonts are bundled, so the app makes no network request at start. Age rating (owner ruling, 10 Nov): the knucklebone triple-or-nothing wager stays, so the answer is "yes, infrequent simulated gambling", stated honestly; expect 13+ from Apple and R18+ in Australia. The chest reveal is an oracle-bone reading from rc9b (no reels, no wheel); public store text does not describe it yet.
5. Listing: name "Grave Goods", subtitle "Dig. Seal. Don't fall.", 6–8 screenshots per device size, a 30 s preview video, keywords (roguelike, archaeology, dig, puzzle; never another game's name). The store page does not lead with "Finders keepers."
6. **People on TestFlight before submission. No exceptions.** 20–50 external testers for two weeks; crash-free sessions ≥ 99.5%. Every tester so far has been a bot. Nothing goes to App Review until humans have played a TestFlight build and one round of their fixes is in. TestFlight builds ship with the video offers switched off until real AdMob ids exist.
7. Expect 1–2 review rejections (common: missing privacy details, store notes that do not match the build, login-less IAP restore button, an IAP the reviewer cannot find).
8. The owner's checklist of everything only he can supply (AdMob ids, support address, a developer website with `app-ads.txt` at its root): `grave-goods/docs/OWNER-TODO.md`.

## Marketing
- Short vertical clips: the collapse, a 50k seal tally, a Prismatic reveal, the share card. TikTok/Reels/Shorts organic first; paid only after organic shows a hook rate.
- No "is out" post until a store link exists (owner ruling 8). Before that, a "playtesters wanted" post is fine if its first paragraph says the game was designed by Kaleo and built with Claude.
- Roguelike communities respond to honest "I made a thing" posts with a seed challenge. Say how it was made; do not imply it was hand-coded.
- Daily Tomb seed is the share loop once the Daily is the same tomb, raider and kit for everyone (owner ruling 7): "Daily OCT 12 · 4,210 — beat me." There is no in-app way to compare scores yet, so store text does not promise one.
- Measure: D1/D7 retention, runs per session, % reaching Tomb 2, rewarded-ad opt-in rate, share-card saves.

## v1 readiness bar (test group runs against this)
- 3 rounds of test-group play with fixes between; final fresh-eyes critic ≥ 8/10.
- First 60 s understood by 5/6 testers without help.
- Zero P0/P1 open; crash-free 1500-action fuzz on 3 viewports; draw() < 2 ms everywhere.
- History lines checked against a source, with a named owner and a review date for the lines that go stale; errors found by review fixed before release. (Do not claim "every line fact-checked" in public: four lines were found wrong in November.)
- Accessibility: colour-blind assist, reduce motion, 44 px targets. VoiceOver has not been tested by anyone; do not claim it until it has.
- Real people have played on TestFlight (see App Store path, 6).

## Player data (telemetry) — needed before launch
Purpose: tune balance and ship updates from real play, not bots. Privacy-first: anonymous, no account required, disclosed in the privacy policy, **off until the player says yes** to a one-time question on first launch (asked of everyone, everywhere), changeable in Settings, nothing personal collected.
- Events (one row each, batched, sent when online): run_start (class, gear, tool, relic, tomb, stake, seed, daily?), chamber_end (banked this chamber, target, seals used, taps, crack at end, outcome: clear/collapse/walk, fever peaks, ores used), seal (worth, fame, multipliers list), relic_found (name, finish, tomb, stake), gamble (type: press/coin/reels/jackpot/deal, odds shown, result, taken?), market_buy / shop_buy (item, price, purse), run_end (outcome, duration, xp, gold, rank), tutorial_step, settings_change, ad_offered / ad_watched (reward type), share_card (saved/copied), session (start/end, device class, app version).
- Funnels to watch: first-60-seconds completion, Tomb 1 clear rate, Tomb 2 reach rate, D1/D7 retention, runs per session, seal-count distribution (are people using all 3?), gamble take rates vs stated odds, Market spend per chamber, where runs die (tomb × chamber × stake), class/tool/relic pick and win rates, share-card rate.
- Pipeline: in-app event buffer → HTTPS endpoint (a tiny serverless function + a hosted Postgres, or a managed product like PostHog/Amplitude free tier) → weekly balance report. The sim's HUMAN policy gets recalibrated from the real distributions each month.
- Remote config: targets, SKILL/ECON numbers and the rewarded-offer switches and caps read from a remote JSON at launch (with the shipped values as fallback), so balance updates don't need an App Store release. **LUCK is excluded**: the knucklebone chance, Press Your Luck weights and jackpot cannot be changed from a server, so "odds only change with an update" is true. Version every config change and log it with the event stream.
- Feedback: an in-game "Report a wrong fact / bug" button (free text + the current seed and build), routed to the backlog.
- Cadence: weekly balance patch via remote config; monthly content update via the store; the team's sim + test group re-run on each.

## Paywall policy (owner decision, 16 Oct)
- The artifact / web build is always fully open: no purchase gates, no paid classes. "Remove the paywall."
- v1 has no premium gate of any kind (owner ruling 2, 9 Nov: stay free + rewarded videos + Ad-free; no content gate; revisit with TestFlight numbers). The old "Deeper Tombs" unlock is parked and unloaded. See team/monetization/README.md for its history.
