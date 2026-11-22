# Grave Goods: team response to the red-team report

Build reviewed: `team/current.html` (v1.0-rc8) and the app shell in `grave-goods/`. Written 9 Nov 2026. Nothing was fixed and no file outside `team/redteam/` was changed.

**How to read this.** "Ran" means we ran it in this session. "Read" means we read the code or the document. "Not re-checked" means we are taking the red team's word. Our scripts and their output are in `redteam/review/`.

## The short version

- The red team is right on the things that matter most. The ad timing is wrong in code, quitting the app resets a wall for free, "Just dig" hands out the wrong item on some installs, and holding everything for one seal beats the first two tombs.
- They are wrong or loose on some details. The free "bare wall" collapse is narrower than they describe. The near-miss on the chest reels is disclosed on screen. The age-rating risk is not only a Google problem: it applies to iPhone in Australia too. The revenue table is arithmetic on guessed inputs.
- The "38% vs 4 of 4" conflict is settled, and it is not a conflict. Our own simulator says a player who seals early clears Tomb I about 38% of the time and a player who holds for one big seal clears it 90 to 99% of the time. One habit decides the result. The team already had this on its list as T40 ("hold-one-seal dominates, not fixed, design call open").
- We agree it is not ready for the store. It is about two short sprints from a TestFlight build worth giving to people, provided the first iOS build compiles.

---

## 1. What we verified ourselves

| Claim | Result | What we did and saw |
|---|---|---|
| **C-1 / M-1** Tracking prompt after the practice wall; full-screen ad after an abandoned first run | **CONFIRMED** | Read `www/ads.js`: any `run_end` with outcome `won` sets "first tomb cleared". Read the game: the practice wall emits `run_end` as `won` with `training:true` (line 9653). Ran the real UI: the game emitted `won (training)` after 11 seconds, then `abandoned` after 5. Ran our own test against the shipped ad module (`review/ads-check.js`): tracking prompt on the practice wall, ad on the very next run end whether abandoned, lost or won. |
| C-1, extra finding of ours | New | Abandoned runs count as "finished runs" for the every-second-run rule even for an established player, and that ad lands on the camp menu, not the summary. The review notes say "after a finished run, on the run summary". |
| **X-1** Quit mid-chamber gives a fresh wall, no Memory lost | **CONFIRMED, with a difference** | Ran it (`review/wall-check.js`): crack 21% to 0%, Memories 3 to 3, a different wall. But the chamber's sealed points also went, 569 to 0. So quitting is not free once you have sealed. It is free before your first seal, which is exactly when a hold-for-one-seal player wants a new wall. Cause read in code: the game saves only at the start of a chamber and when the Market opens. |
| **U-9** Closing during the tally loses the seal | **CONFIRMED, and wider** | Ran it. Any seal made since the chamber started is lost on close, not only one mid-count. In one run a seal that cleared the chamber (544 against 200) was lost because the app closed before the Market opened. |
| **D-1** Bare-wall collapse is free and resets crack | **PARTLY** | Read the code (lines 3209, 3402). It is free only when every tile is dug, nothing is uncovered and the sarcophagus is open. "Keep hammering after a seal" does cost a Memory or a free mercy: the red team's own log shows that (`log-coldG` at 347 s and 518 s). The loophole is still real: the bot dug a chamber-3 wall bare twice in four fresh runs, kept its bank and got a new wall for nothing. |
| **D-2** vs the 38% figure | **CONFIRMED by our own sim** | See section 2. |
| **U-1** "Just dig" kit mismatch | **CONFIRMED in code** | The shelf builds four items and guarantees the Knuckle Pick is among them, then shows three. If the Pick is fourth, the default falls to the first item (line 7222). That is about one fresh install in six, as the red team guessed. Not re-run; their 3 of 31 fits. |
| **U-10** Daily seed stays armed after Back | **CONFIRMED** | Ran it. Daily, Back, camp Dig, Descend: the run was `DAILY-20261109`. |
| **X-2** Rewarded caps live in memory | **CONFIRMED** | Ran against the shipped module. Second Memory offer in one session refused; after a relaunch, granted. A "+1 seal" bought before a relaunch is lost. |
| **C-4** Reel tease and remote odds | **PARTLY** | Read the code. The tease is real: 30% of bones and mimic chests show two stars and a miss, with a sting sound and a buzz (lines 6155, 6334). The red team left out that the panel says so in words: "A tease shows on 30% of bones and mimic lids and changes nothing." Remote config can change the knucklebone's chance (5% to 95%), the press-your-luck weights and the jackpot. The tease value itself is not remotely tunable. |
| Rosetta Stone, "Egypt has formally asked" | **CONFIRMED wrong** | Line 2066. The British Museum says it has had no formal request from the Egyptian government (Returning Heritage, Nov 2025). |
| Lamassu, "Oriental Institute Museum" | **CONFIRMED out of date** | Line 8729. Renamed April 2023 to the Institute for the Study of Ancient Cultures. |
| Pakal mask, "1984 or 1985" | **PARTLY** | Line 2264. Most sources say 25 December 1985. But the hedge was not invented: the Trafficking Culture encyclopedia says 24 December 1984. We think that source is wrong. Change to "Christmas 1985". |
| Lewis Chessmen wording | **CONFIRMED** | Line 8711 reads as if Lewis were under Norse rule in 1831. Reword. |
| D-7, D-8, M-4, M-5, C-6, S-1, S-2 strings | Read, present | "seal early, seal often" (3523); Lucky Knucklebone 40% x 3 = +20% (8881); "Grave Goods is out" and "spent a long time" in `POSTS.md`; the listing lines; "Licensed Looter" (5218); "Melt three, take one" (3445). |
| Not re-checked | | D-3, D-6, D-9, U-2 to U-8, U-11 (two of five strings seen), X-3 (payout line read, not run), X-4, X-5, C-5, C-7 to C-10, all screenshots. |

---

## 2. The clear-rate conflict (D-2)

**What the red team's bot did.** We read `t/bot.js` and the logs. It digs next to half-uncovered finds, otherwise the shallowest dirt, and seals once at about 72% crack. That is the "hold" habit, played sloppily. It also pressed luck buttons at random and lost two big seals to the knucklebone.

**What helped it.** In the four wins there were 10 collapses. Six cost nothing: two bare walls and four first-profile mercies. Without those, three of the four wins still stand; the fourth (four collapses) would have been a loss. It never used a resume reset. Two of the six fresh sessions never finished their first run (stuck on a dug-out wall in chamber 3), so "4 of 4" means "4 of the 4 that finished".

**What our sim says** (`review/sim-hold.sh`, `review/sim-stakes.js`, 200 to 400 runs a cell). The sim carries the chamber bank across collapses like the game. It does not model the free bare wall, and gives mercies only to its novice player.

| Player in the sim | Tomb I, Stake 1 | Tomb III, Stake 1 | Tomb V, Stake 6 |
|---|---|---|---|
| "Human": seals when the stack looks big (about 8 finds) | 38 to 41% | 23% | 1% |
| Same human habits, but holds for one seal at the red bar | 90% | 49% | 13% |
| "Greedy": hammer only, one seal at 85% crack | 99% | 73% | 42% |

**Which number we believe for a real new player.** Neither, yet. No person has played. The honest statement is a range: about 40% if they seal early, about 90% once they hold. The build now tells them to hold on the wall slips, so most will end up near the top number within a few runs. The 38% figure describes a player the game has since been taught to correct.

**What that means.** The red team's point stands for Tombs I and II: one habit, no reading of Dynasties or Timelines, wins. It does not stand as written for the whole game. Hold-only drops to about half at Tomb III and well under half at high Stakes, in the sim. The red team says they could not judge Stakes 4 to 6. Nobody has checked any of this with hands.

---

## 3. Finding by finding

Effort: S = hours, M = a day or two, L = a sprint.

### Game design and balance

| ID | Verdict | Seat | Reasoning | Effort |
|---|---|---|---|---|
| D-1 | Accept with changes | Design + Balance | Narrower than reported, still a free reroll. Keep one free bare-wall exit per chamber (it prevents the dead end in D-6), charge after that. The sim must learn the bare wall first. | M |
| D-2 | **Owner decision** | Design + Balance | Confirmed by our own sim. Parked as T40; the red team did change our mind that "teach the hold" is enough. Seats disagree, see below. | L if the rule changes |
| D-3 | Defer to the D-2 decision | Balance | The pay cap exists because seals overshoot. It follows from whatever is decided on D-2; changing it alone moves XP and Gold rates. | M |
| D-4 | Accept with changes | Balance + UX | Saves show 11 and 12 relics after two wins. Stop the "Vault full" card interrupting the dig now (S). Cutting the drop rate needs a sim run and the owner's sign-off. Note 12 in 13 minutes does not mean 48 in an hour: the rare ones take far longer. | S + M |
| D-5 | Accept with changes | Balance | Two free collapses were added because the cautious tester cleared 0 of 6. Try one, in the sim, after D-1 and X-1 are closed. It is a remote-config number. | S |
| D-6 | Accept | UX | We parked this as T88. The red team is right that the exits are not signposted. | S |
| D-7 | Accept | Content | The diary line contradicts the coaching slip. | S |
| D-8 | Accept with changes | Balance | Lucky Knucklebone at 40% makes "always throw" correct (+20%). Set it near 36%. Cutting Sieve and Lamp Oil waits until after launch. | S |
| D-9 | Accept | Balance | We rated it P3 (T91). A first shop where nothing is affordable is worse than that. | S |
| D-10 | Accept with changes | Design | Fix tomb, class and kit for the Daily, or stop saying "same seed for everyone". One scored attempt can wait: there is no leaderboard. | M (or S for copy only) |
| D-11 | Reject for v1 | Design | The owner asked for the luck flavour. Tells are information, not noise. The wheel goes to the gambling decision (question 3). | none |
| D-12 | Defer | Balance | Agreed there is nothing to do until the core is settled. | none |

*Disagreement on D-2.* Design wants a rule change before any human plays, because first impressions cannot be re-run. Balance says we have no human data and three sprints of bot-tuned numbers already; change the loopholes, then measure. Recorded as is.

### First-time player and UX

| ID | Verdict | Seat | Reasoning | Effort |
|---|---|---|---|---|
| U-1 | Accept | UX | Confirmed in code. Put the Knuckle Pick first on a fresh profile. | S |
| U-2 | Accept | UX | Switch the effect off silently. | S |
| U-3 | Accept with changes | UX + Content | Content objects to a two-line toast for a first discovery: the history card is the product. Compromise: full card the first time a relic is ever found, with the effect as the first line and a short body; repeats never interrupt. Changes feel; owner sign-off. | M |
| U-4 | Accept with changes | Design | Teach one multiplier on the practice wall. Do it after watching real people, not before. | M |
| U-5 | Accept | UX | Label the badge. | S |
| U-6 | Accept with changes | UX | Hide seed controls and fold the books on a fresh profile now (S). Merging screens waits. | S, then M |
| U-7 | Accept | UX + Platform | Also an ad-policy risk (accidental taps). Result, Go deeper, then one slip. | S |
| U-8 | Accept | Art + UX | Clear the banners during the tally. | S |
| U-9 | Accept | Design + Integrator | Wider than reported. Fixed by the same save change as X-1. | with X-1 |
| U-10 | Accept | UX | Confirmed. Reset the seed on Back. | S |
| U-11 | Accept | UX + Content | Small strings and a double-tap guard. | S |

### Market and monetisation

| ID | Verdict | Seat | Reasoning | Effort |
|---|---|---|---|---|
| M-1 | Accept | Platform | Same as C-1. | S |
| M-2 | Accept with changes | Design | True for Tombs I and II. Follows from D-2, D-4 and D-10. | see those |
| M-3 | Accept with changes | Design + Platform | Reroll and second-chest offers are weak. "+1 seal" is not worthless: testers bought the Market's extra seal 16 times out of 16. A "continue" video changes the Memory economy and needs the sim. | M |
| M-4 | Accept | Marketing | `LAUNCH.md` still says "never interstitials"; the app README says one interstitial rule. Fix the document. Holding posts is question 8. | S |
| M-5 | Accept | Marketing | The game's own About says "Built with Claude". The post should say it first. | S |
| M-6 | Accept | Platform | From our knowledge of AdMob, not re-read today: the file must sit at the root of the developer site in the store listing. Needs a domain. | S plus a domain |
| M-7 | Reject as a finding | Owner | Leaving the EU out was a deliberate choice (he does not want to publish a trader address). It has a cost; it is not a mistake. | none |

### Exploits

| ID | Verdict | Seat | Reasoning | Effort |
|---|---|---|---|---|
| X-1 | Accept | Design + Integrator | Confirmed. We logged it as T100 at P3; that was too low. Save the wall (dirt, crack, sealed finds) at each seal and when the app is hidden; resume the same wall. | M |
| X-2 | Accept | Platform | Confirmed. Persist both counters by run id. | S |
| X-3 | Accept | Design | Low value. Refuse dates not later than the last claim. | S |
| X-4 | Accept with changes | Balance | Single-player, no leaderboard. After launch. | S |
| X-5 | Accept | Integrator | Clamp Memories and validate the resume record. | S |
| X-6 | Accept | Platform | Fold into C-1: an abandon is not a finished run. | with C-1 |

### Platform and compliance

| ID | Verdict | Seat | Reasoning | Effort |
|---|---|---|---|---|
| C-1 | Accept | Platform | Confirmed three ways. Ignore training events; count only won and lost runs; test with events captured from the real game. | S |
| C-2 | Accept | Platform + owner | Known. The first build is the next step and waits on the owner's signing secrets. Expect it to fail a few times. | L |
| C-3 | **Owner decision** | Platform | The risk is real and wider than reported (section 4). | S to M |
| C-4 | Accept | Design + Platform | Remove the tease, or at least its sting and buzz. Take luck odds out of remote config so "odds only change with an update" is true. Small feel change; owner sign-off. | S |
| C-5 | Accept | UX | The reel panel already prints percentages. The chest-pick card says "now and then". Use the numbers there too. | S |
| C-6 | Accept | Marketing + Platform | Edit the six lines. (a) depends on D-10. | S |
| C-7 | Accept with changes | Platform | We are not lawyers. Cheapest safe option: analytics off by default outside the US, or ask once on first launch. | S to M |
| C-8 | Accept | Platform | Bundle the two fonts in the app; add the missing lines to the policy. | S |
| C-9 | Accept | Platform | Android was already deferred. Remove it from the listing text and posts. | S |
| C-10 | Accept with changes | Platform | Only matters if the interstitial stays. | S |
| C-11 | See S-1 to S-5 | Content | | |

### Accuracy and tone

| ID | Verdict | Seat | Reasoning | Effort |
|---|---|---|---|---|
| Rosetta, Lamassu, Pakal, Lewis | Accept | Content | Four string edits. Pakal: the hedge had a source, but 1985 is right. | S |
| Cartographer "World Turtle" vs Maize God note | Accept | Content | Not checked by us. Pick one. | S |
| Dated facts need an owner | Accept | Content | A short list of lines that will go stale (Pergamon reopening, repatriation status), reviewed before each release. | S |
| S-1 | **Owner decision** | Content | The satire is his voice. The red team is right about one thing: the store tagline carries the joke without the cards that answer it. | S |
| S-2 | Accept with changes | Content | "Melt three, take one" on named real objects is the screenshot a critic uses. Same mechanic, different words (a trade). Goes to the owner with S-1. | S |
| S-3 | Reject | Content | The game is called Grave Goods. Bone finds are inside the genre. The owner can overrule. | none |
| S-4 | Accept | Content | Search all 48 cards for "Finders keepers." on contested objects. | S |
| S-5 | Reject as written | Content + Platform | Academia Sinica in Taipei does hold a large share of the oracle bones; naming it is a fact. Mainland China needs its own game licence in any case (our knowledge, not re-checked), so it is off for another reason. | none |

### The "cut" list

| Item | Verdict | Seat | Reasoning | Effort |
|---|---|---|---|---|
| Interstitial in v1 | **Owner decision** (team: cut) | Platform | Question 1. | S |
| Reels, wheel, tease | Tease: Accept. Reels and wheel: **Owner decision** | Design | Question 3. | S to M |
| Free bare-wall collapse, second mercy | Accept with changes | Balance | Limit, do not remove (D-1, D-5). | M |
| Sieve, Lamp Oil | Defer to after launch | Balance | Harmless. | S |
| Reroll and second-chest video offers | Accept | Platform | Weak offers; fewer ad buttons is better. | S |
| Codex and Stats entries; seed controls on first menu | Seeds: Accept. Merge: Defer | UX | U-6. | S / M |
| Android from v1 | Accept | Platform | Already the plan. | S |
| Every public post until a store link | **Owner decision** | Marketing | Question 8. | none |

### The "add" list

| Item | Verdict | Seat | Reasoning | Effort |
|---|---|---|---|---|
| Cost for every collapse and quit, then a balance pass | Accept with changes | Design + Balance | D-1, X-1, then the sim. | M |
| Two-line relic toasts | Accept with changes | UX + Content | U-3 compromise. | M |
| A real Daily | Accept with changes | Design | Fixed kit now; scored single attempt later. | M |
| "Continue" video and "double Gold" | Accept with changes | Design + Platform | Sim first. Only if ads stay. | M |
| Paid unlock after Tomb II | **Owner decision** (team: no) | Platform | He removed this exact gate on 16 Oct. Question 2. | M |
| Analytics choice outside the US | Accept | Platform | C-7. | S |
| Ten real people on TestFlight | Accept | Owner | Already the plan, at 20 to 50. It has not started. | L |
| Owner and review date for dated facts | Accept | Content | | S |

**Art and Audio.** Almost nothing here is theirs. Art: U-8, the slow-device effect in U-2, and a screenshot refresh (the store shots are from rc4). Audio: if the tease stays in any form, drop its sting. Nobody has heard the game on a phone; that is a TestFlight task, not a fix.

---

## 4. Where the red team is wrong or overreaching

1. **D-1's mechanism.** You cannot seal, hammer and collapse for free. Only a fully dug wall is free. Their own logs show the difference.
2. **"4 of 4."** Four of six. Six of ten collapses in those wins were free. The bot threw away two big seals at random. The conclusion survives because our sim agrees, not because of the sample.
3. **"Stake 1 has no decisions" as a verdict on the game.** It is a fair verdict on Tombs I and II. The sim has hold-only at about 49% on Tomb III and 13% on Tomb V at Stake 6. They did not test there.
4. **C-4 leaves out the disclosure.** The panel tells the player about the tease. We still recommend removing it, because a staged near-miss is the pattern regulators name, and a sentence of small print does not change that.
5. **C-3 blames Google only.** Apple now gives any app with simulated gambling an R18+ rating in Australia, whatever the "infrequent" answer says (Neowin's report of Apple's change; Australia's rule took effect 22 Sept 2024 and covers phones). PEGI has rated games that "teach or glamorise" gambling 18 since 2020; whether a chest reel counts is not settled by anything we read. Nobody knows the Google result until the questionnaire is run.
6. **The revenue table.** The sums are right: about 5.5 cents an install. The inputs are guesses with no source. The comparison with a paid game assumes the same number of installs, and a price usually cuts installs many times over. The honest reading is that neither model earns real money at a few thousand installs. The useful number in there is that the interstitial is worth about 2 cents an install, roughly $20 per thousand.
7. **X-1 is not unlimited.** Quitting throws away the chamber's sealed points. It is still a free wall reroll before the first seal.
8. **"Mostly done in an evening" (D-4).** Twelve relics in 13 minutes is the easy quarter. Not shown for the rest.
9. **Pakal "needless hedge", S-5, M-7.** Covered above.

What they missed that we found: abandons count toward the interstitial rule for everyone; a chamber-clearing seal can be lost on close; the iPhone side of the Australian rating.

---

## 5. Ranked fix plan

"Mechanical" means it should not change how the game plays. "Feel" means it does, and needs a sim run where numbers move and the owner's sign-off.

### Tier A: before TestFlight goes to people

| # | Findings | Change | Seat | Effort | Type | How we check it |
|---|---|---|---|---|---|---|
| A1 | C-2 | First iOS build through GitHub Actions; install on the owner's iPhone | Platform + owner | L | Mechanical | It launches, saves, survives a force-quit, sound obeys the ringer switch |
| A2 | C-1, M-1, X-6 | Ad triggers: ignore training, count only won and lost runs. For TestFlight, ads off by remote flag | Platform | S | Mechanical | `review/ads-check.js` scenarios A to E all show nothing before a real clear; new test fed with events captured from the game |
| A3 | X-1, U-9 | Save the wall at each seal and on app-hide; resume the same wall with its crack and bank | Design + Integrator | M | Feel (closes a loophole) | `review/wall-check.js`: after reload, crack, bank and layout are unchanged; fuzz; same seed gives same wall |
| A4 | U-1, U-2, U-10 | Knuckle Pick first on a fresh profile; silent slow-device switch; Daily seed cleared on Back | UX | S | Mechanical | `t/gear3.js` shows 0 mismatches in 30; `wall-check.js daily` shows a normal seed |
| A5 | D-1, D-6 | One free bare-wall exit per chamber; name the exits on the hint bar | Design + Balance | M | Feel, sim | Sim models the bare wall; clear rates reported before and after |
| A6 | D-7, U-5, U-8, U-11, D-4 (Vault card only) | Text and layout fixes | Content + UX + Art | S | Mechanical | Screenshots at 390x844 and 360x640 |
| A7 | History four, S-4 | Four string edits; "Finders keepers." sweep | Content | S | Mechanical | Grep for the old strings returns nothing |
| A8 | C-7, C-8 | Analytics consent or default-off outside the US; bundle fonts | Platform | S to M | Mechanical | No network request before consent in a non-US locale test |

### Tier B: before App Store submission

| # | Findings | Change | Seat | Effort | Type | How we check it |
|---|---|---|---|---|---|---|
| B1 | D-2, D-3, D-5, D-8, D-9 | Balance pass using TestFlight data: the hold rule, pay cap, mercy count, knucklebone, first-shop prices | Balance + Design | L | Feel, sim, owner | Sim tables plus real clear rates and seals per wall from testers |
| B2 | C-3, C-4, C-5 | Whatever the gambling decision is; remove the tease; odds out of remote config; run both rating questionnaires | Design + Platform | S to M | Feel, owner | Questionnaire results saved as screenshots |
| B3 | X-2, C-10, U-7, M-3 | Ad polish if ads stay: persistent caps, slip order, fewer offers, "Remove ads" near the ad | Platform + UX | S to M | Mechanical | Ad test extended to relaunch cases |
| B4 | D-10, C-6 | Daily with fixed tomb, class and kit; correct the six listing lines | Design + Marketing | M | Feel | Two profiles get identical Daily walls and kit |
| B5 | U-3, D-4 (drop rate) | Shorter first-find card; relic rate | UX + Content + Balance | M | Feel, sim, owner | Word counts; relics per run in the sim |
| B6 | C-2 rest, M-6, C-9 | Real IDs, policy, support address, domain with `app-ads.txt`, sandbox purchase and restore, new screenshots, Android removed from copy | Platform + owner | M | Mechanical | Checklist in `store/review-notes.md` |
| B7 | S-1, S-2, M-4, M-5 | Tone lines per the owner; `LAUNCH.md` corrected; posts rewritten | Content + Marketing | S | Owner | Read-through |
| B8 | X-3, X-5 | Clock and save clamps | Integrator | S | Mechanical | `t/clock.js`, `t/corrupt.js` |

### Tier C: after launch or won't do

- After launch: U-4 (teach a multiplier), U-6 (merge menus), X-4 (seed farming), D-12, Sieve and Lamp Oil, one scored Daily attempt, a "continue" video.
- Won't do: D-11 (strip the luck layers), S-3 (rename Bones), S-5 as written, M-7 (reopen the EU decision), Android in v1.

### Sprint order (one agent at a time)

1. **Platform.** A2, then A8. Ads off by flag for TestFlight.
2. **Integrator with Design.** A3 (the save change). It is the riskiest edit, so it goes early and alone.
3. **UX.** A4 and A6.
4. **Content.** A7.
5. **Balance, then Design.** A5: teach the sim the bare wall, then the rule.
6. **Integrator.** Build rc9, full verification, then the owner runs A1.
7. **People play.** Then Tier B in the order B1, B2, B4, B5, B3, B6, B7, B8.

A1 can start in parallel the moment the signing secrets exist. It does not depend on the fixes.

---

## 6. Decisions only Kaleo can make

**1. Interstitial in v1: yes or no?**
- Options: keep it with fixed triggers; or rewarded ads only.
- Team recommendation: rewarded only for v1.
- Cost either way: by the red team's own inputs it earns about $20 per thousand installs. Keeping it risks the first session and adds a review risk. Cutting it gives up that $20.

**2. Price versus ads.**
- Options: (a) as decided: free, ads, $2.99 Ad-free. (b) free, rewarded only, Ad-free. (c) paid up front. (d) free to Tomb II then a one-time unlock.
- Their arithmetic: about 5.5 cents an install on ads; a paid install keeps about $2.54. Our view: both sets of inputs are guesses, and a price cuts installs heavily. At a few thousand installs no option pays for more than the Apple fee.
- Team recommendation: (b), and decide again with real numbers after TestFlight. You removed (d) on 16 Oct; we see no new evidence to reverse that. The web build stays open either way.

**3. Gambling presentation versus age rating.**
- Options: (a) keep reels, wheel and knucklebone and accept an adult rating in Australia and possibly elsewhere. (b) keep the knucklebone as the one named gamble, re-dress the chest reveal so it is not a slot reel, drop the wheel. (c) keep everything and leave Australia out.
- Team recommendation: remove the tease whatever you choose. Run the rating questionnaires before deciding between (a) and (b); it costs an hour and replaces guessing.
- Cost: (a) smaller audience and stricter ad rules for adult-rated apps. (b) a day or two of work and some casino flavour you like.

**4. What should a collapse and a quit cost?**
- Options for the bare wall: free once per chamber then a Memory (recommended); always a Memory; always free (today).
- Options for quitting: resume the same wall (recommended); charge a Memory on resume; leave it.
- Cost: the recommended pair makes the game harder for cautious players. The sim will say by how much before anything ships.

**5. The hold-for-one-seal rule (D-2).**
- Options: (a) change nothing until people have played, and read seals per wall from their data. (b) change the rule now, for example targets that step up after each seal, or a bonus for three ordered seals.
- Team recommendation: (a), split vote. Design prefers (b).
- Cost: (a) risks testers finding Tombs I and II samey. (b) is a sprint of retuning on bot data alone.

**6. Looting tone.**
- The lines: "Finders keepers." on the title and store, "Licensed Looter", "Melt three, take one", "another reason not to tell the museum".
- Team recommendation: keep the voice in the game. Change the Fence's "melt" to a trade. Do not lead the store page with "Finders keepers."
- Cost: a few strings. Leaving them costs nothing unless someone screenshots the Fence next to the Iraq Museum card.

**7. The Daily.**
- Options: fix tomb, class and kit so it is the same for everyone (a day or two); or keep it personal and stop claiming "same seed for everyone" (an hour).
- Team recommendation: fix it. It is the only thing with a clock on it.

**8. Marketing timing and the AI line.**
- Options: hold every post until there is a store link; or post now asking for playtesters, with the web build, saying up front it was built with Claude.
- Team recommendation: hold the "is out" post. A playtest-wanted post is fine if it says how it was made. Confirm Android is out of v1 copy.

---

## 7. Team verdict

We agree with "not ready" for the App Store, and we do not think anyone on the team would have argued otherwise: the app has never been compiled, every tester so far was a bot, and the ad rules in code do not match the notes written for Apple. We disagree that the core loop is broken beyond a retune. What the evidence shows is two loopholes (the free wall on quit and the unlimited bare wall), one known dominant habit on the first two tombs, and a first-run experience with a handful of real bugs. The distance to a TestFlight build for real testers is the Tier A list: roughly two short sprints of fixes, most of them mechanical, plus however many attempts the first iOS build takes, which is the one thing we cannot estimate because it has never run. The distance to submission is longer and mostly not code: two to four weeks of people playing, one balance pass on their numbers, the gambling and pricing decisions above, and the paperwork. We would not submit before humans have played it.

---

## Sources checked on the web (9 Nov 2026)

- Rosetta Stone, no formal request: [Returning Heritage](https://www.returningheritage.com/why-the-rosetta-stone-will-not-be-returning-to-egypt-just-yet)
- 1985 museum theft: [Wikipedia](https://en.wikipedia.org/wiki/1985_National_Museum_of_Anthropology_theft); the 1984 date: [Trafficking Culture](https://traffickingculture.org/encyclopedia/case-studies/museo-nacional-de-antropologia-theft/)
- Oriental Institute renamed: [University of Chicago News](https://news.uchicago.edu/story/oriental-institute-changes-name-institute-study-ancient-cultures-west-asia-north-africa), [WTTW](https://news.wttw.com/2023/04/03/oi-gets-rebranded-drops-oriental-name)
- Lewis Chessmen dates: [Wikipedia](https://en.wikipedia.org/wiki/Lewis_chessmen). The end of Norse rule in the Hebrides (1266) is from our own knowledge.
- Apple R18+ in Australia for simulated gambling: [Neowin](https://www.neowin.net/news/simulated-gambling-triggers-r18-rating-in-australia-for-iphone-apps/)
- Australian rule, 22 Sept 2024: [Australian Classification](https://www.classification.gov.au/classification-ratings/new-classifications-for-gambling-content-video-games)
- PEGI 18 for gambling since 2020: [Ask About Games](https://www.askaboutgames.com/news/pegi-rating-for-gambling-is-now-always-18)

Not verified today: Apple's current global age tier for "infrequent" simulated gambling, Google Play's questionnaire outcome, the Play 12-tester rule, AdMob's `app-ads.txt` rule, China's game licence rule.

## Files

- `/home/claude/swarm/team/redteam/TEAM-RESPONSE.md`: this document.
- `/home/claude/swarm/team/redteam/review/ads-check.js`: ad timing and reward caps against the shipped `www/ads.js`.
- `/home/claude/swarm/team/redteam/review/wall-check.js`, `wall-check.out`, `wall-resume.out`: resume, tally, Daily seed and training-event checks in the real UI.
- `/home/claude/swarm/team/redteam/review/sim-hold.sh`, `sim-hold.out`, `sim-stakes.js`, `sim-stakes.out`: the clear-rate runs.
- `/home/claude/swarm/team/redteam/review/dbg.js`: navigation probe, safe to delete.
