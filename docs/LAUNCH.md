# Grave Goods — Launch plan (owner: Kaleo)

## Business model (decided)
- Free to play. Ads are REWARDED ONLY (player opts in): watch for +1 Memory (max 1/run), +1 seal next chamber, a Black Market reroll, a chest re-pick. Never interstitials, never between chambers unprompted.
- Premium later: "Remove ads" one-time; cosmetics (skins, hats, lamps, title scenes) and expansions (new tombs/civilizations). Never relic odds, Gold, or power. Odds stay printed everywhere.
- No loot boxes for money. This keeps the design honest and avoids EU/Apple loot-box rules.

## App Store path
1. Apple Developer Program ($99/yr) — enrol now; it takes days.
2. Wrap the single HTML file with Capacitor (iOS). Native plugins: Haptics, StatusBar, App (pause/resume), Preferences (local save mirror), AdMob (rewarded), optional Game Center for leaderboards (Daily Tomb).
3. Cloud save: today it uses the claude.ai artifact store. In the app it must move to iCloud Key-Value store (Capacitor plugin) or a small backend. Plan one sprint for this.
4. Privacy: privacy policy URL (ads SDK requires it), App Tracking Transparency prompt (AdMob), age rating 12+ (simulated gambling? No — set "Infrequent/Mild" for the coin/reels; check Apple's "simulated gambling" definition — ours has no real stakes).
5. Listing: name "Grave Goods", subtitle "Dig. Seal. Don't fall.", 6–8 screenshots per device size, a 30 s preview video, keywords (roguelike, Balatro-like, archaeology, dig, puzzle).
6. TestFlight first: 20–50 external testers for two weeks; crash-free sessions ≥ 99.5%.
7. Expect 1–2 review rejections (common: missing privacy, ATT prompt timing, login-less IAP restore button).

## Marketing
- Short vertical clips: the collapse, a 50k seal tally, a Prismatic reveal, the share card. TikTok/Reels/Shorts organic first; paid only after organic shows a hook rate.
- Discord/Reddit r/Balatro-adjacent communities respond to honest "I made a thing" posts with a seed challenge.
- Daily Tomb seed is the share loop: "Daily OCT 12 · 4,210 — beat me."
- Measure: D1/D7 retention, runs per session, % reaching Tomb 2, rewarded-ad opt-in rate, share-card saves.

## v1 readiness bar (test group runs against this)
- 3 rounds of test-group play with fixes between; final fresh-eyes critic ≥ 8/10.
- First 60 s understood by 5/6 testers without help.
- Zero P0/P1 open; crash-free 1500-action fuzz on 3 viewports; draw() < 2 ms everywhere.
- Every history line fact-checked with a source; copy proofread.
- Accessibility: colour-blind assist, reduce motion, 44 px targets, VoiceOver labels on menu buttons.

## Player data (telemetry) — needed before launch
Purpose: tune balance and ship updates from real play, not bots. Privacy-first: anonymous, no account required, disclosed in the privacy policy, opt-out in Settings, nothing personal collected.
- Events (one row each, batched, sent when online): run_start (class, gear, tool, relic, tomb, stake, seed, daily?), chamber_end (banked this chamber, target, seals used, taps, crack at end, outcome: clear/collapse/walk, fever peaks, ores used), seal (worth, fame, multipliers list), relic_found (name, finish, tomb, stake), gamble (type: press/coin/reels/jackpot/deal, odds shown, result, taken?), market_buy / shop_buy (item, price, purse), run_end (outcome, duration, xp, gold, rank), tutorial_step, settings_change, ad_offered / ad_watched (reward type), share_card (saved/copied), session (start/end, device class, app version).
- Funnels to watch: first-60-seconds completion, Tomb 1 clear rate, Tomb 2 reach rate, D1/D7 retention, runs per session, seal-count distribution (are people using all 3?), gamble take rates vs stated odds, Market spend per chamber, where runs die (tomb × chamber × stake), class/tool/relic pick and win rates, share-card rate.
- Pipeline: in-app event buffer → HTTPS endpoint (a tiny serverless function + a hosted Postgres, or a managed product like PostHog/Amplitude free tier) → weekly balance report. The sim's HUMAN policy gets recalibrated from the real distributions each month.
- Remote config: targets, LUCK/SKILL/ECON numbers and ad reward values read from a remote JSON at launch (with the shipped values as fallback), so balance updates don't need an App Store release. Version every config change and log it with the event stream.
- Feedback: an in-game "Report a wrong fact / bug" button (free text + the current seed and build), routed to the backlog.
- Cadence: weekly balance patch via remote config; monthly content update via the store; the team's sim + test group re-run on each.

## Paywall policy (owner decision, 16 Oct)
- The artifact / web build is always fully open: no purchase gates, no paid classes. "Remove the paywall."
- Any premium gate (e.g. the "Deeper Tombs" $4.99 unlock after Tomb II) lives only in the App Store build, behind remote-config `flags.premium` (default off), and is switched on only once the player base justifies it. See team/monetization/README.md.
