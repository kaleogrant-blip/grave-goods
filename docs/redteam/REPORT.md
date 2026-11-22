# Grave Goods v1.0-rc8: red-team report

Build: `team/current.html` (v1.0-rc8), app shell `grave-goods/` (www build of the same rc8), store and marketing material as of 9 Nov 2026.
Evidence: `redteam/shots/` (screenshots), `redteam/t/` (scripts, play logs `log-*.jsonl`, end-of-session saves `save-*.json`).

## How this was tested, and what was not

**Observed** means I saw it on screen or in the game's own output while driving the real UI with touchscreen taps (Playwright, headless Chromium, 390x844 and 360x640). **Inferred** means I reasoned from code, numbers or policy text. Each finding says which.

- **Play time:** about 115 minutes of sessions, roughly 90 of them active play.
  - Four fresh profiles: `coldA`, `coldB` (360x640), `loseC`, `coldG`.
  - One seasoned profile (rank 26, all six classes, 2,500 Gold): `seasD`, `seasE`, `seasF`.
  - About 25 minutes hand-driven: first five minutes cold, pause, settings, every camp screen, a shop purchase, the Daily, close-and-resume, a deliberate five-collapse loss, and the ad slips shown with `body.gg-ads`.
- **The bot:** the play sessions used a simple tap bot (`t/bot.js`) that reads only what a player can see (open tiles, the HUD, the cards). It digs next to half-uncovered finds, otherwise at random, and seals when the hand meets the target or the wall passes about 72% crack. It does not understand Dynasties, Timelines, relic feeding, ores or tools. Treat it as a careless player, not a good one.
- **Bot limits:** two sessions lost minutes because the bot did not scroll a card (chest card at 360x640, a long Black Market card). Both are noted where they also point at a real layout problem.
- **Not tested:** a real phone (performance, touch feel, notch, heat, battery), sound and music, haptics, a real ad from AdMob, a real purchase or restore, iCloud sync, VoiceOver, Android at all, landscape. The native app has never been compiled (the team's own README says so), so nothing native is tested by anyone.
- **Accuracy checks:** six relic claims checked on the web today (sources at the end). The other entries I read were checked against my own knowledge and are marked that way.

---

## Executive summary: the five things most likely to sink the launch

**1. There is no app yet, and no person has played it.**
- The Capacitor project has never been built, on iOS or Android. No ad has ever been requested, no purchase made, no device touched (`grave-goods/README.md`, "Known gaps" 1).
- AdMob IDs, the PostHog key, the config URL and the bundle ID are still placeholders, and `admob.testing` is `true` (`config/app.config.json`, `capacitor.config.ts`).
- Every "tester" in all three test rounds was a bot (`testgroup/r3/DISCUSSION.md`, evidence caveat). The launch plan's own bar of 20 to 50 TestFlight testers for two weeks has not started.
- The privacy policy, landing page, support address and `app-ads.txt` are placeholders.

"Ready for the App Store" is not accurate: this is a finished web prototype with an untested wrapper.

**2. The ad timing is wrong in code, and the App Review notes describe behaviour the build does not have.**
- The training wall ends with a `run_end` event whose outcome is `won`. The ad module treats any `won` as the first tomb clear.
- I fed the game's real events into the shipped `www/ads.js` with a fake ad plugin (`t/adtest.js`). The tracking-permission prompt fires right after the 12-second practice wall.
- A full-screen ad fires at the end of the first real run, including a run abandoned after 6 seconds, on top of the camp menu.
- The review notes promise "never in the first tomb of a new player" and "after the player's first completed tomb". A reviewer will see otherwise within two minutes.

**3. Stake 1 has no decisions in it, and the two things that should cost you are free.**
- A careless bot on fresh profiles cleared Tomb I on all four runs it finished (`coldA` 2 of 2, `coldG` 2 of 2).
- It found 11 and 12 of the 48 relics in 13 and 10 minutes, and made a 9,788 single seal against a 4,500 target.
- Losing on purpose took five full collapses without sealing.
- A wall that collapses with nothing uncovered costs no Memory and hands you a fresh wall at zero crack.
- Force-quitting the app mid-chamber does the same thing at any crack level (observed, `shots/x-resume-*.png`).

"Seal before the wall comes down" is the hook on the store page; in the build, the wall coming down is usually a free reroll.

**4. The casino layer creates rating and ad-policy risk that the plan underrates.**
- The build has a three-reel chest reveal, a jackpot wheel, a triple-or-nothing throw with a red "Yes · throw" button, press-your-luck odds on the tool buttons, and a near-miss counter in Stats.
- A setting (`LUCK.reels.tease`) dresses 30% of bad chest results as two stars and a miss.
- The listing answers simulated gambling "Infrequent/Mild", but the throw is offered on every seal of 2,500 or more and the reels spin after every chamber.
- Answering honestly on Google's questionnaire is likely to produce an adults-only rating in some regions (inferred; see C-3).
- The store copy says "nothing is rigged against you" beside a deliberate near-miss effect and remotely tunable odds.

**5. The money does not work at any scale this launch can reach.**
- With stated assumptions (section 3), lifetime revenue is about 5 to 6 cents per install.
- Two thousand installs pays about $110 against a $99 Apple fee. $1,000 a month needs roughly 18,000 new installs a month, organically, with the EU switched off on iOS.
- Three of the four rewarded offers are worth almost nothing to the player (a video to save 1 Gold on a reroll). The plan therefore leans on the interstitial, which is the part most likely to cost day-1 retention.

---

## 1. Game designer

*Voice: someone who has shipped roguelikes and wants to know what the player is deciding.*

| ID | Sev | What I saw | Repro / evidence | Why it matters | Fix (cost) |
|---|---|---|---|---|---|
| D-1 | P0 | **A bare-wall collapse is free and gives a fresh wall.** The collapse card says "3 Memories left · a bare wall costs nothing" and "Sealed finds stay sealed". Seal what you have, keep hammering, and the wall resets to 0% crack with new finds. Observed. | `log-coldA.jsonl` t=205s; hand run on the seasoned profile | The crack meter is the game's only clock. If running it out after a seal costs nothing, the correct play is always dig everything, seal once, collapse on purpose. | A collapse always costs something: a Memory, or the next wall starts at 40% crack, or the chamber's remaining free seals. Run it through the sim first. (M) |
| D-2 | P0 | **One rule beats Stake 1.** "Dig until about 75% crack, seal once" won 4 of 4 finished runs on fresh profiles and 2 of 2 on the seasoned one (Mystic on Tomb III). My hand-driven run cleared Tomb I in 4:07. The bot never fed a relic, used an ore on purpose or read a Dynasty. Observed. | `save-coldA.json` (`wins:2`, `bs:9788`, 11 relics), `save-coldG.json`, `save-seasD.json` | The team reads this as "casual players hit a wall at chamber 3 unless they hold". I read it the other way: holding is the only strategy and it needs no understanding. Their tester Kai said every clear is the same shape in round 3 and it was not followed up. | Make the three seals matter: escalate targets within a chamber so one seal cannot clear it, or pay a bonus for three ordered seals. Then retune. (L) |
| D-3 | P1 | **Scoring overshoots so far that rewards are capped.** Seals of 4,284 and 9,788 against a 4,500 target; a summary reads "Paid 7,649 of 13,142 banked (a wall pays at most 1.5× its target)". Observed. | `log-coldA.jsonl` t=721s | A cap on pay is a patch over multipliers too large for the targets. It tells the player their best moment did not count. | Lower the multiplier stack or raise targets faster; drop the cap. (M) |
| D-4 | P1 | **Relics rain.** 10 relics sealed in one Mystic run; a Legendary (Rosetta Stone) in a fresh profile's first tomb. The Vault was full in the seasoned session's second run, after which every relic find stops the dig with a "Vault full" card. Observed. | `save-coldA.json`, `shots/bot-seasD-028.png` | The Collection is the long-term goal on the title screen. At this rate it is mostly done in an evening. The team logged the Vault card as a P3 nit; at this drop rate it is a constant interruption. | Cut relic rolls to about one per tomb at Stake 1. Auto-skip relics already owned. (S to M) |
| D-5 | P1 | **Losing is nearly impossible, so winning is not felt.** Two free collapses per profile, then three Memories, then a rewarded ad for one more. A deliberate loss took five collapses and about seven minutes. Observed. | `shots/seas-17-collapse-*.png` | A roguelike's replay pull comes from runs that could have gone the other way. | Mercy once, not twice; and see D-1. (S) |
| D-6 | P1 | **Dug-out wall dead end.** Two fresh sessions ended chamber 3 on a fully dug wall (2,494 and 4,185 of 4,500) with only an unopened sarcophagus left and the message "Nothing left to dig there. Try elsewhere." Observed. The team knows the dug-out case (T88) and parked it. | `shots/bot-loseC-end.png`, `shots/bot-coldB-end.png` | The real exits (open the sarcophagus, walk away for a Memory, or hammer bare tiles into a free collapse) are not signposted. | When no dirt is left, say so and name the exits on the hint bar. (S) |
| D-7 | P2 | **The game teaches opposite lessons.** Wall slips say "Hold your finds: a bigger seal pays more than three small ones". A collapse diary line says "Lesson, written in dust: seal early, seal often." Observed. | hand run, collapse on day 4 | The one strategic idea the team spent three sprints teaching is contradicted by flavour text. | Rewrite the diary line. (S) |
| D-8 | P2 | **Dead or trap items.** Sieve (Pyrite pays 5 Gold, about one ore in 13), Lamp Oil ("it only helps you see"), Reliquary and Ledger Book (10% less worth for a meta bonus). The Lucky Knucklebone turns the throw from −4% to +20% expected value (0.40 × 3), so "always throw" becomes correct. Inferred from the data tables. | `GEAR_X`, `PROG_DATA.gear` | Thirteen items, of which about five are real choices. | Cut Sieve and Lamp Oil. Set the Lucky Knucklebone to 0.36. (S) |
| D-9 | P2 | **The first Black Market sells nothing you can afford.** Purse 0 to 3 Gold against tags of 2, 4, 6, 22 and 40. Observed on most fresh runs. Team knows (T91) and left it. | `log-smoke.jsonl`, `shots/seas-14-market-ads.png` | The first shop teaches that Gold does not matter. | Start the purse at 6, or price the first stall to it. (S) |
| D-10 | P2 | **The Daily is not a shared challenge.** It is dug "in the tomb you last cleared" with your own class and kit, can be replayed all day on the same walls, and has no leaderboard. Observed on the kit screen. Team logged it as P3 (T90). | `shots/seas-04-daily.png` | It is the only retention hook with a clock on it, and the store copy sells it as "the same seed for everyone" (C-6). | Fix tomb, class and kit for the Daily; one scored attempt. (M) |
| D-11 | P2 | **Luck layers mostly add noise.** Tells, press-your-luck rolls, the knucklebone, reels, the wheel, three rivals, Fortune, Blight. Only the knucklebone and the rival deals ask for a decision. Inferred from play and tables. | How-to-play cards; `LUCK` | Luck the player cannot answer is variance on a game that is already too easy. | Keep the knucklebone and rivals. Drop the wheel. (M) |
| D-12 | P3 | **Hour 10 and hour 30.** Rank 6 (fourth class) needs 3,700 XP, about 9 wins. Rank 16 (sixth class) needs about 24,000 XP. Rank 30 is 73,500 XP, about 180 wins at Stake 1. Inferred from `xpAt()` and observed XP per win (410 to 640). | console output | There is 15 to 20 hours of unlocking. Unlocks on top of a solved loop are a grind. I could not play Stakes 4 to 6 enough to judge them. | None until the core is fixed. |

One thing that is good: the six classes change how the wall is dug in visible ways, and the tools are a real axis.

---

## 2. First-time player / UX

*Voice: someone who downloaded it on a bus and has ninety seconds of patience.*

| ID | Sev | What I saw | Repro / evidence | Why it matters | Fix (cost) |
|---|---|---|---|---|---|
| U-1 | P1 | **"Just dig" lies on some installs.** The card says "Scholar, Brass Knuckle Pick, no relic." In 3 of 31 fresh installs the run started with a different item (Glass Hammer, Dowser's Charm, Cursed Compass). The two scripted cases had the Knuckle Pick fourth in the shuffled shelf, which shows only three, so the default fell to the first item; if that is the cause it would hit about one install in six (inferred). Observed. | `t/gear3.js` output, `shots/x-justdig-mismatch-3.png`, `shots/x-gear-changed-0.png` | The first promise the game makes is broken at random. A new player with the Grave Candle gets a wall that cracks by itself every 8 seconds and no idea why. | Force the Knuckle Pick for a first run. (S) |
| U-2 | P1 | **A slow-device warning covers the tool bar during the first taps.** "CRT glass switched off: this device was running slowly…" sits over Hammer, X-ray and Seal for several seconds on the training wall. Observed (headless is slow; a mid-range Android will be too). | `shots/cold-03-wall.png` | The first thing a new player reads is that their phone is not good enough. | Switch it off silently. (S) |
| U-3 | P1 | **Word load.** Relic cards run 136 to 202 words and open mid-dig, up to ten times a run early on. First Black Market: 225 words. First win summary: 342. Kit screen: 325 words over 2,015 px. How to play: 12 cards, 1,036 words. Ledger: 2,362. Measured from the cards' own text. | word counts in `log-coldA.jsonl`, `log-seasD.jsonl` | The writing is good and nobody on a phone will read it at that moment. The team's critic asked for "calmer cards"; the relic card was not on their list. | First find: a two-line toast with the effect; full entry stays in the Collection. (M) |
| U-4 | P1 | **Vocabulary before meaning.** In the first three minutes: Worth, Fame, Seal, Memories (first mention is "All three Memories are still yours"), Fever, crack, Dynasty, Timeline, Hoard, appetite, Sated, tells, Pouch. The training wall teaches tap and seal only. Observed. | `shots/cold-07.png` | The player can win without any of it (D-2), which is the only reason this is not P0. | Teach one multiplier on the practice wall. (M) |
| U-5 | P2 | **Numbers on finds do not add up to the hand.** Coin "9" and Shard "2" uncovered, hand shows 24. The badge is not the find's worth, and nothing says what it is. Observed. | `shots/cold-05.png` | The first arithmetic the player tries fails. | Label the badge, or show worth. (S) |
| U-6 | P2 | **Camp has thirteen entries, five of them books.** Vault, Collection, Codex, Ledger and Stats overlap. Seed controls sit second from top on a first-time menu. Observed. | `shots/man-07-abandoned.png` | A menu this wide reads as homework. | Merge Vault into Collection and Stats into Ledger. (M) |
| U-7 | P2 | **With ads on, "Go deeper" is sandwiched between two ad buttons.** At 360x640 it is below the fold with no scroll hint, and the first thing reached when scrolling is an ad slip. Observed. | `shots/seas-13-chest-after.png`, `shots/bot-coldB-fold-007.png` | Mis-taps onto ads, and a card that looks finished with no way forward. | Order: result, Go deeper, then one slip. (S) |
| U-8 | P2 | **Tally text piles up.** The big seal number draws over "FEVER ×2 · 5 strikes" and "HALFWAY". Observed. | `shots/x-resume-1-before.png`, `shots/bot-coldA-051.png` | The reward moment is the frame people will screenshot. | Clear the wall banners while the tally runs. (S) |
| U-9 | P2 | **Closing the app during a seal tally loses the seal.** I reloaded while a chamber-clearing 232 was counting up; the resumed run had 0 banked and the target had gone from 200 to 300. Observed. | `shots/x-resume-1-before.png`, `x-resume-2-after.png` | A phone call during the best moment of a run deletes it. | Save when the seal is committed. (S) |
| U-10 | P2 | **Backing out of the Daily leaves the Daily seed armed.** I opened the Daily kit, tapped Back, later tapped Dig: the run was the Daily ("DAILY · NOV 9 · new best 1,602" on the summary). Observed. | `shots/seas-17-collapse-3.png` | Wrong tomb, wrong stake, and the Daily best overwritten by accident. | Reset the seed on Back. (S) |
| U-11 | P3 | **Small things.** The seventh tomb tab reads "7" beside I to VI. Stats says "Rows are the five tombs" over seven rows. The collapse card prints "1632" and "worth 1542" without separators (the team marked this fixed). Double-tapping Buy in the Shop buys and then un-equips. About still says "v1.0-rc8" and "working title Relic Wall". | `shots/seas-07-stats-grid.png`, `seas-01-kit.png`, `seas-17-collapse-2.png` | Polish a reviewer will catch. | (S each) |

What works: the first 20 seconds (red square, "Tap the dirt.", a 30-point wall) teach tap and seal without a tutorial. Keep that.

---

## 3. Market and retention analyst

*Voice: someone who has to forecast this and is not allowed to hope.*

**Who it is for.** Adults 25 to 45 who like museum labels and a dry joke, and who play roguelikes on a phone. That is a real but small audience. It is also the audience least tolerant of full-screen ads and most alert to anything that smells machine-made.

**Comparables (internal only).**
- Balatro: the stated inspiration; premium, no ads.
- Luck Be a Landlord and Peglin: luck-forward roguelikes, premium.
- Dome Keeper and Wall World: digging under time pressure, premium.
- SteamWorld Dig and the Pokémon Diamond/Pearl Underground wall: the dig itself.
- Curious Expedition: colonial-expedition satire done with care.
- Diggy's Adventure: free archaeology digger with heavy monetisation.
- Vampire Survivors on mobile: free, rewarded ads only.

Games for this audience are paid or rewarded-only. Free with interstitials sits with hyper-casual titles this game does not resemble.

**The pitch against the game.** The store page sells a tense bank-or-bust loop. The build is a relaxed dig where the wall falling is usually free (D-1). The history is the honest selling point, and it is the second block of the description.

| ID | Sev | What I saw | Evidence | Why it matters | Fix (cost) |
|---|---|---|---|---|---|
| M-1 | P0 | **Day-1 risk: a tracking prompt at about 40 seconds and a full-screen ad at the end of the first real run** (see C-1). Tested against the shipped ad module with a fake plugin. | `t/adtest.js` | New players meet a permission dialog and an ad before they have a reason to stay. | Fix C-1. No interstitial in the first session. (S) |
| M-2 | P1 | **Day-7 risk: the game is solved and collected quickly.** One rule wins (D-2); a quarter of the Collection in 13 minutes (D-4); the Daily is not comparable between players (D-10). Observed. | section 1 | Nothing asks the player back on day 3. | Section 1 fixes; a real Daily. (L) |
| M-3 | P1 | **Three of four rewarded offers are worthless.** "Watch a short video · one free reroll" beside "Reroll · 1 ◆". The second-chest offer appears after the other chests are shown, usually 15 Gold. "+1 seal next chamber" in a game where one seal wins. Only "+1 Memory" matters, and Memories are rarely short. Observed. | `shots/seas-15-market-ads-bottom.png`, `seas-13-chest-after.png` | Opt-in will be low, so revenue rests on the interstitial. | One continue per run at the death card; double Gold on the summary. (M) |
| M-4 | P1 | **The launch plan and the build disagree, and the marketing launches before the product.** `LAUNCH.md` still says "REWARDED ONLY… Never interstitials". The launch post reads "Grave Goods is out… iPhone and Android: coming soon" and links a browser build with no ads, no purchase and no analytics. | `team/LAUNCH.md`, `marketing/social/POSTS.md` | The one burst of attention a small game gets is spent on a free, unmonetised web page on someone else's domain. | Hold all posts until store links exist. (S) |
| M-5 | P1 | **The Reddit post presents the game as hand-made over "a long time".** The in-game About says "Designed by Kaleo. Built with Claude." | `POSTS.md` Reddit draft | Roguelike communities are hostile to undisclosed AI-built games. Being found out in the comments is worse than saying it in the post. | Say it in the first paragraph. (S) |
| M-6 | P2 | **No `app-ads.txt` plan that works.** The file is a placeholder, and a GitHub Pages project site serves it under a sub-path, not the domain root AdMob reads. Inferred. | `marketing/site/app-ads.txt` | AdMob limits serving for apps without a verified file. | Buy a domain; serve the file at its root. (S) |
| M-7 | P2 | **EU off on iOS, undecided on Play.** | `docs/AVAILABILITY.md` | Removes a meaningful share of likely iOS revenue (my estimate: a fifth to a quarter for this genre). | Owner's call; cost it in the forecast. |

**Does free-with-ads earn anything?** Assumptions:
- Retention: D1 30%, D7 8%, D30 2% (generous for an organic indie puzzle game, before M-1).
- Play per install over its life: about 60 minutes, so about 12 runs (observed run length 4 to 7 minutes).
- Interstitials: about 5 per install at a blended $4 eCPM.
- Rewarded: 1 view per install at $10 eCPM (see M-3).
- Ad-free purchase: 1% of installs at $2.99, 85% kept.

Per install: 5 × $0.004 + 1 × $0.010 + 0.01 × $2.54 = **about $0.055**.

| Installs | Revenue |
|---|---|
| 2,000 (a good organic launch month for a solo game) | about $110 |
| 10,000 | about $550 |
| 18,000 a month, every month | about $1,000 a month |

- Break-even on the $99 Apple fee alone is about 1,800 installs.
- Paid acquisition is out: an install costs $1 to $3 and returns 5 cents.
- If retention halves because of M-1, halve every row.
- The same audience asked for $2.99 to $4.99 pays more at 2,000 installs than this model does at 20,000.

The owner rejected an up-front price in October for fear of killing reach. The arithmetic says reach without a price earns almost nothing.

---

## 4. Exploit and economy hunter

*Voice: someone who will do the cheapest thing that works.*

| ID | Sev | What I did | Evidence | Why it matters | Fix (cost) |
|---|---|---|---|---|---|
| X-1 | P1 | **Force-quit to dodge any collapse.** At 54% wall, reloaded the page: "Dig interrupted — resumed at chamber 1. 0 banked, 3 Memories. The wall is a fresh one." New wall, zero crack, no Memory lost. Works every chamber, no limit. Observed. The team logged it as P3 (T100). | `shots/x-resume-1-before.png`, `x-resume-2-after.png`; `S11.take` in the build | On a phone this is swipe-up-and-reopen. It removes the only penalty in the game. I rate it P1 because it needs no tools and players find it by accident. | Save crack, dirt and Memories with the autosave, or charge a Memory on resume past 50% crack. (M) |
| X-2 | P1 | **Rewarded-ad caps live in memory.** The "+1 Memory, once per run" cap resets when the app restarts and the run resumes: the second offer is refused (`run_cap`), the third after a simulated relaunch is granted. The "+1 seal next chamber" reward is lost if the app closes before the next chamber. Tested against the shipped module with a fake plugin. | `t/adtest.js` output | Unlimited Memories for anyone who relaunches; and a player who watched a video and got nothing will leave a one-star review. | Persist both in Preferences keyed by run id. (S) |
| X-3 | P2 | **Daily reward follows the device clock, both ways.** With today's reward claimed, setting the date to tomorrow or to yesterday shows "+50 ◆ for a clear" again. The payout uses the same check (`SHOP.dy !== date`). Observed on the title strip; payout path read in code. | `t/clock.js` output | 50 Gold per clear roughly doubles a run's Gold. Low value. | Refuse any date not later than the latest claimed. (S) |
| X-4 | P2 | **Seeds.** A typed seed replays the same walls. XP drops to 25% after the first clear of that seed; the rule (`s12PracMult`) scales only XP, so Gold looks unaffected, and failed attempts stay at full XP. Any seed that buries a Legendary in chamber 1 can be shared. Inferred from code, not farmed by hand. | build, `rw_s12` | Collection completion by seed list. | Apply the practice rule to Gold and relic entry too. (S) |
| X-5 | P3 | **Save editing.** A profile with 99,999,999,999 Gold and rank XP 1e12 loads without complaint (Gold clamps to 99,999,999). An edited resume record with 99 Memories is accepted into the run and throws `RangeError: Invalid count value` in `newChamber`; the game recovers to the menu. Negative records print "-1 RUNS · -1 TOMBS CLEARED". No script injection through any stored string in eight hostile profiles. Observed. | `t/corrupt.js` output, `shots/x-corrupt-*.png` | Single-player with no leaderboard, so cheating only hurts the cheater. No profile was corrupted beyond use. | Clamp `lives` to 0..3 and validate the resume record. (S) |
| X-6 | P3 | **Abandon pays.** Abandoning awards XP for what was banked and ends the run without a summary. With C-1 it also triggers the interstitial on the menu. Observed. | `t/adtest.js` | Minor. | Leave, once C-1 is fixed. |

Not found: no softlock that survives a scroll, no crash in play, no way to mint Gold or XP without clearing chambers. Zero page errors in the play sessions.

---

## 5. Platform and compliance reviewer

*Voice: someone reading the submission the way a reviewer would. Policy wording changes; anything marked "verify" or "inferred" needs checking against the live policy on the day.*

| ID | Sev | Finding | Evidence | Rule at risk | Fix (cost) |
|---|---|---|---|---|---|
| C-1 | P0 | **Tracking prompt and first interstitial fire far earlier than the review notes state.** Training-wall completion emits `run_end {outcome:'won', training:true}`. `ads.js` sets "first tomb cleared" on any `won`, asks for tracking permission on that same event, and shows the interstitial on the next `run_end` of any kind, including an abandon. There is no last-shown time on first use, so the three-minute gap does not apply. | `t/adtest.js`: `after run_end won (training) -> ["ATT PROMPT"]`, `after run_end abandoned -> [...,"INTERSTITIAL SHOWN"]`; `store/review-notes.md` | Apple 2.3.1 (the notes misdescribe the app) and the common rejection for prompt timing; Google's rule against unexpected full-screen ads. | In `onEvent`, ignore events with `training` true; count only `won` and `dead`; add a test that feeds real game events. (S) |
| C-2 | P0 | **Nothing native has been compiled or run; submission material is placeholders.** Bundle ID, AdMob IDs (test mode on), PostHog key, config URL, privacy-policy fields, support address, copyright line. | `README.md` Known gaps 1; `config/app.config.json`; `store/privacy-policy.md` | Apple 2.1 (completeness); both stores require a live privacy policy and working purchase and restore. | Build, install on a phone, buy and restore in the sandbox, see one test ad, fill every bracket. (L) |
| C-3 | P1 | **Simulated gambling is understated.** The listing calls it "Infrequent/Mild" and "occasional". In play: reels after every chamber, the throw offered on every seal of 2,500 or more, odds on the tool buttons in the red zone, a wheel, a near-miss counter. | `store/listing.md`; `shots/bot-coldA-022.png`, `bot-coldA-051.png` | Apple's age-rating answers must be accurate. On Google Play, the planned answer ("yes, simulated casino-style elements") is likely to produce an adults-only rating where regulators treat simulated gambling that way (Australia since late 2024; PEGI since 2020). Inferred; verify by running the questionnaire. | Accept an adult rating and say so in the plan, or re-skin (no reels, no wheel) and answer "none" truthfully. (M) |
| C-4 | P1 | **"Honest odds" claim against a built-in near-miss.** `LUCK.reels.tease: .3` shows 30% of bones or mimic chest results as two stars and a miss. Odds for the throw, press-your-luck and the wheel are remote-config values. The chest card shows what the unpicked chests held, then offers a video to open one. | build `LUCK`; `config/config.json`; `shots/seas-13-chest-after.png` | Store copy "Nothing is hidden and nothing is rigged against you" (2.3.1). A staged near-miss is the textbook manipulative slot-machine device. | Remove the tease. Take odds out of remote config. (S) |
| C-5 | P1 | **Rewarded chest pick and the "loot boxes: none" answer.** A random-reward chest re-rolled by watching an ad is not a paid loot box under Apple 3.1.1 as I read it. Odds are given only in words ("now and then a relic"). Inferred. | `listing.md` age-rating table; chest card | Low risk today, but "none" will be read next to three chests and a "watch to open another" button. | Print the chest odds as numbers on the card. (S) |
| C-6 | P1 | **Listing and marketing overclaims.** (a) "A Daily Tomb with the same seed for everyone. Beat… a friend's": tomb, class and kit differ per player. (b) "VoiceOver labels on menu buttons": the team's own table says "Unverified". (c) "Your progress follows your Apple ID through iCloud": never run. (d) Luck moments "use only earned in-game Gold": the throw stakes the seal's points. (e) The Play listing omits the interstitial the iOS text discloses. (f) "the team fact-checked each line with a source": their round-3 table says partly. | `store/listing.md`, `store/play-listing.md`, `marketing/copy/COPY.md` | Apple 2.3.1, Google's metadata policy. | Edit the six lines. (S) |
| C-7 | P1 | **Analytics on by default with a persistent random ID, sent before any consent.** The ad consent form covers ads only. The policy calls the data "anonymous". | `www/telemetry.js`; `privacy-policy.md` | Fine in the US with accurate labels. In the UK (which stays switched on) a stored identifier used for analytics generally needs opt-in. Inferred; needs someone qualified, as the policy's own header says. | Ask once on first launch, or default off outside the US. (S) |
| C-8 | P2 | **Privacy labels are careful; three gaps.** The policy covers "iPhone and iPad" only though Android ships. Google Fonts is fetched at start. Time-zone offset is collected and not on the label table. | `privacy-policy.md`; `README.md` gaps 6 and 8 | Label accuracy on both stores. | Bundle the two fonts; add Android to the policy. (S) |
| C-9 | P2 | **Android blockers.** New personal Play accounts need a closed test with 12 testers for 14 days. The owner has no Android device. Capacitor 7 targets API 35 and Play raises the minimum each August (verify whether 36 is now required). | `play-listing.md`; README gap 2 | Android cannot ship with iOS. | Drop Android from v1 and say so. (S) |
| C-10 | P2 | **Purchase surface.** "Remove ads" and "Restore purchases" exist only in Settings. | `www/adfree.js` | Meets the rule, but a player just shown an interstitial has no nearby way to pay to stop it. | Add "Remove ads" to the run summary after an ad. (S) |
| C-11 | P2 | **Cultural-heritage content (see section 6).** No store rule is clearly broken. The exposure is public reaction and a reviewer's discretion. | section 6 | Reputational. | Section 6 fixes. (S to M) |

---

## 6. Accuracy and sensitivity reader

*Voice: a museum-trained reader. The history writing is the best thing in the product; that is why the misses matter.*

### Spot-check of relic entries and class notes

| Entry | Verdict | Note |
|---|---|---|
| Rosetta Stone | **Wrong on one point** | "Egypt has formally asked for its return." The British Museum states it has received no formal request from the Egyptian government; the calls have come from Egyptian archaeologists and petitions. Checked on the web. |
| Lamassu of Khorsabad | **Out of date** | "Oriental Institute Museum, Chicago." Renamed in April 2023 to the Institute for the Study of Ancient Cultures. Checked on the web. |
| Jade Mask of Pakal | **Needless hedge** | "stolen at Christmas in the mid-1980s (sources say 1984 or 1985)". The museum theft was on 25 December 1985. Checked on the web. |
| Lewis Chessmen | **Misleading wording** | "found in 1831… on the Isle of Lewis, then under Norse rule" reads as Norse rule in 1831. Own knowledge. |
| Gjermundbu Helmet | Correct | Gunnar Gjermundbo, 29 March 1943, one of two reconstructable. Checked on the web. |
| Dragon of the Ishtar Gate | Correct | Pergamon reopening on 4 June 2027 confirmed by the museum. Checked on the web. Dated facts like this will go stale; give them an owner. |
| Gjallarhorn (Royal Horns of Norway) | Plausible | The horns exist; I did not confirm "Bergen, about 1310". |
| Mask of Warka; Mask of Tutankhamun; Code of Hammurabi; Antikythera Mechanism | Correct (own knowledge) | Dates, finders and locations match. |
| Jade Burial Suit of Liu Sheng; Bronze Ding; Cyrus Cylinder; Flood Tablet; Standard of Ur; Rhind Papyrus; Crystal Skull | Correct (own knowledge) | The Cyrus entry's caution about "first charter of human rights" is right. |
| Class notes: Athena's owl, Gullinbursti, Bastet, Anzû, nine-tailed fox, Huginn, Bennu, Camazotz, three-legged crow | Correct (own knowledge) | The Cartographer is "World Turtle" on the kit but the note describes the Maize God rising from the turtle; pick one. |

Four problems in about twenty entries, none of them invented facts. That is a good rate, and still enough that "every line fact-checked" should not be claimed (C-6f).

### Tone

| ID | Sev | What I saw | Evidence | Why it matters | Fix (cost) |
|---|---|---|---|---|---|
| S-1 | P1 | **The frame celebrates looting while the cards deplore it.** Title: "Finders keepers." and "Excavation permit pending". Win rank: "Licensed Looter". Chest card: "Another chamber, another reason not to tell the museum." Then the Mask of Warka card describes the 2003 looting of the Iraq Museum. | title, summary and chest cards in `log-*.jsonl` | The satire is aimed at the player-character, which can work. Here the joke and the reward are the same thing, and the store tagline carries the joke without the cards that redeem it. | Change the two lines strangers see first: the tagline and the rank title. (S) |
| S-2 | P1 | **The Fence melts relics for Gold.** "Melt three, take one… Every melt pays 10 ◆ salvage." Named, real objects can be melted. | build line 3445; Shop "Fence discount" | Melting antiquities is the most destructive thing done to real collections, and Landa's book-burning is described with sorrow two screens away. This is the screenshot a critic will use. | Re-fiction as a trade, not a melt. (S) |
| S-3 | P2 | **Human remains as scoring pieces.** "Bone" and "Bones" are common finds; relics "hunger" for them; sarcophagi are opened for points. | powers table; find list | Mostly inside genre convention, and all ancient-state cultures, which was a careful choice. | Rename "Bones" to something an animal left. (S) |
| S-4 | P2 | **"Finders keepers." closes entries for objects held abroad.** The team caught one (Ishtar Gate, T96) and carried it. | `r3/DISCUSSION.md` T96 | Same issue as S-1 at card level. | Search all 48 and remove. (S) |
| S-5 | P3 | **Regional sensitivities.** The Oracle Bone entry lists "Academia Sinica, Taipei" beside Beijing. | relic `where` line | Decide territories on purpose. | Exclude mainland China at launch. (S) |

---

## What I would cut

- The interstitial, for v1. It earns cents and costs the first session.
- The reels presentation, the jackpot wheel and the near-miss tease. Keep the knucklebone as the one named gamble.
- The free bare-wall collapse and the second free mercy collapse.
- Sieve, Lamp Oil, and the reroll and second-chest video offers.
- Codex and Stats as separate menu entries; seed controls from the first-time menu.
- Android from v1.
- Every public post until there is a store link.

## What I would add

- A cost for every collapse and for quitting mid-wall, then a balance pass so three seals are three decisions.
- Two-line relic toasts in the dig, with the full entry kept for the Collection.
- A real Daily: fixed tomb, class and kit, one scored attempt.
- One "continue" video at the death card and "double Gold" on the summary, in place of the four current offers.
- A paid option priced against the ad model: a one-time unlock after Tomb II at $3.99 to $4.99, with rewarded-only ads before it.
- A first-launch choice for analytics outside the US.
- Ten real people on TestFlight for a week, with someone watching the first two minutes.
- An owner and a review date for every dated fact in the relic entries.

## Verdict: not ready

Not "ship after fixes". The build under review is a polished web game. The product being launched is an app that does not yet exist as a binary, with ad behaviour that contradicts its own review notes and a core loop a careless player solves in the first tomb.

The shortest honest path:

1. Build it and put it on one iPhone. See an ad, buy Ad-free, restore it, kill the app mid-run, turn the ringer switch off, play for an hour. (C-2)
2. Fix the ad triggers and add the test that would have caught them. (C-1, X-2)
3. Fix "Just dig", the slow-device toast, the Daily seed sticking, and the lost seal on close. (U-1, U-2, U-10, U-9)
4. Make collapses and quits cost something; rerun the balance sim; cut relic drops. (D-1, D-2, D-4, X-1)
5. Decide the gambling presentation and run both stores' rating questionnaires before more listing work. (C-3, C-4)
6. Correct the six overclaims and the four history lines; rename the Fence action, the rank title and the tagline. (C-6, section 6)
7. Fill every placeholder; host the policy and `app-ads.txt` on a real domain. (C-2, M-6)
8. Ten human testers for a week. Then decide on price versus ads with their numbers, not a bot's. (M-1 to M-3)

Items 2, 3, 6 and 7 are days. Items 1, 4, 5 and 8 are the real work, and I would not submit without them.

---

## Sources checked on the web (9 Nov 2026)

- Rosetta Stone, no formal request: [returningheritage.com](https://www.returningheritage.com/why-the-rosetta-stone-will-not-be-returning-to-egypt-just-yet)
- Gjermundbu helmet: [Wikipedia](https://en.wikipedia.org/wiki/Gjermundbu_helmet)
- 1985 Mexico City museum theft: [Wikipedia](https://en.wikipedia.org/wiki/1985_National_Museum_of_Anthropology_theft)
- Pergamonmuseum reopening date: [Staatliche Museen zu Berlin](https://www.smb.museum/en/whats-new/detail/the-pergamonmuseum-returns-opening-on-june-4th-2027/)
- Oriental Institute renamed: [University of Chicago News](https://news.uchicago.edu/story/oriental-institute-changes-name-institute-study-ancient-cultures-west-asia-north-africa)
- Royal drinking horns of Norway: [medieval.eu](https://www.medieval.eu/the-royal-drinking-horns-of-norway/)

Store-policy statements in section 5 are from my own knowledge of the Apple and Google rules, not re-read today.

## Files

- `/home/claude/swarm/team/redteam/t/rt.js`, `bot.js`, `srv.js`, `auto.js`, `h.js`: harness, tap bot, hand-play session.
- `/home/claude/swarm/team/redteam/t/adtest.js`: ad timing and reward caps against the shipped `www/ads.js`.
- `/home/claude/swarm/team/redteam/t/gear3.js`, `gear2.js`, `justdig.js`: the "Just dig" mismatch.
- `/home/claude/swarm/team/redteam/t/clock.js`: Daily reward against the device clock.
- `/home/claude/swarm/team/redteam/t/corrupt.js`: hostile and corrupt saves.
- `/home/claude/swarm/team/redteam/t/log-*.jsonl`, `save-*.json`: every card seen and each session's final profile.
- `/home/claude/swarm/team/redteam/shots/`: `cold-*` first five minutes, `man-*` menus and pause, `seas-*` seasoned profile and ad slips, `x-*` exploit evidence, `bot-*` session captures.