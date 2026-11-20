# Sprint 16 log: v1.0-rc10 (the tray rule, tuned)

Resume by reading this file top to bottom. Work only in `work/sprint16/`.

- **Build:** `work/sprint16/build.html`, **v1.0-rc10, md5 `421166210941d55e890a27378f833bea`**, 1,154,715 bytes.
- **How it is made:** `python3 work/sprint16/ed.py` turns `work/tray/build.html` (v1.0-tray1, md5 8e42b5f5) into the build with 63 exact, counted text replacements. Balance numbers are in `tune.py`. The upgrade code is `src/migrate.js`. Nothing outside `work/sprint16/` was edited.
- **Simulator:** `sim.cjs`, `simlib.js`, `sim-verify.cjs`, `sim-table.cjs`, `sim-probe.cjs`, `sim-same.cjs` (copied from `work/tray/`, extended). Results in `sim-out/`.
- **Tests:** `t/` (`bash t/run-all.sh`), outputs in `t/results/`. Screenshots in `shots/` (51).

## Progress checklist
- [x] 0. Workspace made from `work/tray/`
- [x] 1. Tomb I, Stake 1 at 1,500 runs a player (chamber 3 kept at 9,000; 9,300 and 9,900 also run at 1,500)
- [x] 2. New player: first-tomb rules (seal held for a full tray, chamber 3 at 7,500), 300 profiles
- [x] 3. Later tombs (600 runs a cell) and Stakes 3 and 6 (600 runs a cell), final build
- [x] 4. Class spread: Brute hammer 26 to 22, Fence 12 to 11
- [x] 5. Bare-wall rule built, saved, coached, tested
- [x] 6. Carry-over (rc9b upgrade, main namespace, version, tag gone) and polish
- [x] 7. Every test on the final build: all pass (`t/results/SUMMARY.txt`)
- [x] sim-verify on the final build (`sim-out/verify.txt`)
- [x] Number list, balance table, open questions (below)

## State right now
Finished. Nothing is running. The lead promotes the build; `game/current.html` was not touched.

## What changed since tray1

### Rules
1. **Bare-wall rule (owner ruling 5).** It was not in the code: `bareCheck()` let every bare wall go free. Now `run.bx[chamber]` counts bare walls. The first one in a chamber costs nothing; the next costs a Memory (through the same path as a collapse, so a new profile's two free collapses, the Heart Scarab, the Ankh and the Rope can still cover it). The count is on the run, so it is saved and resumed. Coaching, one line, three times a profile: "A bare wall costs nothing once a chamber. The next one costs a Memory." The card says "The wall was bare" and which of the two it was. With no dirt left the log adds "This chamber has had its free bare wall: an empty wall now costs a Memory." How to Play, "Memories and walking away", has the sentence too.
2. **The first tomb** (a profile that has never cleared a tomb; Tomb I, Stake 1; never the Daily):
   - **The seal waits for a full tray.** Seal is refused while fewer than six finds are on the tray, unless the wall is in the red (80% crack), nine finds lie loose, or no dirt is left. The button says `Tray 3/6 · fill it`, the log says why, a toast says it three times a profile.
   - **Chamber 3 asks 7,500, not 9,000.** The log says so when the chamber opens.
   - Both end with the profile's first cleared tomb.
3. **Classes:** Brute's hammer costs 22 crack (was 26). Fence's hammer costs 11 (was 12). Nothing else.
4. **Guardian chamber targets** by tomb: see the number list.

### Upgrade from rc9b (`src/migrate.js`, runs once, flag `rw_rc10`)
- Kept as they are: Vault, collection and Codex, rank and XP, Gold, tombs, Stakes, unlocks, settings, kit, counts of runs, tombs, taps, collapses, relics, the streak.
- **Old best scores are labelled, not scaled.** Best haul, best seal and Daily bests were made under a rule where one seal took every find, so three times the old number would still not be a fair mark to beat. They are set aside in `rw_rc9` and shown on the Stats page as "old rule: 6,100, old digits". New bests start from zero.
- The bars of the last-runs chart are redrawn at three times their old height, so they sit in the same digits as new runs. (Judgement call: a chart of 20 bars has no room for a label on each.)
- **A dig left open under the old rule is closed.** Its purse goes to the wallet. The saved-dig record now carries version 2, so an old one can never be laid over a new wall.
- **The note:** once, before the first kit screen or menu: "The rules of the dig changed" with the tray rule, the new digits, the old scores, and (if there was one) "Your open dig was closed. You were in chamber 1, on a wall cut for the old rule, so it could not be carried over. Its purse of 18 Gold is in your wallet. Nothing else was lost."
- A cloud copy written by rc9b that arrives later goes through the same step. Reset profile sets the flag, so a reset profile is never mistaken for an old one.
- The tray test build's own saves (`S15T_`) are not read. They were a separate test profile.

### Polish
- **Crumble sound:** its own (`SND.crumble`): a dry snap, a pot going to pieces, grit settling, two falling notes. Never dropped when many sounds play.
- **Tapping a small find:** a loose find is at least 44 px to tap. A tap up to (44 minus tile) / 2 px outside it (8 px in landscape, 4 px at 360 wide, 1 px at 390) still moves it on or off the tray. A tap inside another find, a shut sarcophagus or the middle of the next tile is never taken.
- **Toasts** sit over the foot of the wall while a wall is on screen (taps pass through), never over a button. In landscape they sit above the `Loose n/9` tag.
- **A find about to crumble** carries the words `CRUMBLES NEXT`. A relic gets `★ RELIC CRUMBLES NEXT` on a red plate, a thick red and brass rim, a toast every time ("★ The Ankh is your oldest loose find. Uncover one more and it crumbles. Seal it first."), a log line, a buzz and the warning sound. Relics still count toward the nine and can crumble, as built. **Open owner question.**
- The "hold your finds" note pinned to a wall now says "Fill the tray before you seal: six finds make a Hoard, and a Hoard doubles the Fame."

## Judgement calls
1. **Old bests labelled, not scaled** (above).
2. **The first-tomb seal guard is a hard rule, not advice.** The plain new-player bot seals the moment anything shows. Advice cannot change it, and lower targets alone did not help it (see the table). Holding the seal is the smallest change that did. The cost: on their first tomb a player cannot seal three finds at half crack. They can always seal in the red.
3. **Chamber 3 of Tomb I stays 9,000** (the tray log's 9,900 no longer fits: the bare-wall rule took about nine points off the early sealer). See "Tomb I".
4. **The red-bar holder is not fixed.** See "Tomb I".
5. **Mystic left alone.** See "Classes".
6. **The new balance numbers sit in `SKILL`** (`SKILL.first`, `SKILL.bare`, `SKILL.stakeT`) because the app shell's remote config reads and writes that object. `cfgVer` 10 to 11.
7. **A tray tap wins over a dig in the 44 px box.** A stray tray tap costs nothing and is undone by a second tap; a stray dig costs crack.
8. rc9b's own 14 em dashes are still in the file (for example "Dig interrupted — resumed"). None was added. Changing them would change strings the app shell's tests may read.

## Simulator
Same method as the tray log: the real build in headless Chromium with a fake clock. Changes: six classes (the Mystic was missing), where losing runs died, profiles that play several runs in a row (`SEQ=5`), an optional equipped relic (`RELIC=name`), and `sim-probe.cjs`.
Players are the tray log's. The new-player bot presses Seal whenever the game lets it; when the game holds the seal it digs on. That is the only change to any bot.
Seasoned bots play as a profile that has cleared a tomb (no first-tomb rules).

(Tables: see the sections below. They are filled in as runs finish.)

## Tomb I, Stake 1 (1,500 runs a player, six classes, 250 each; `sim-out/t1s1.*`)

| | Early sealer | Holder (red bar) | Holder at nine | Holder who chooses | Chooser at nine | Hammer bot |
|---|---|---|---|---|---|---|
| Clears the tomb | **45.7%** ±2.5 | **5.3%** | 34.4% | 17.5% | **77.3%** ±2.1 | 16.9% |
| Scholar | 64.8 | 1.2 | 47.6 | 7.6 | 91.2 | 22.4 |
| Brute | 37.6 | 1.2 | 21.2 | 12.8 | 64.8 | 22.4 |
| Medium | 58.8 | 26.8 | 58.4 | 54.0 | 83.6 | 23.6 |
| Fence | 41.6 | 1.6 | 24.4 | 15.2 | 72.0 | 7.6 |
| Cartographer | 68.4 | 0.4 | 47.6 | 10.0 | 90.4 | 24.4 |
| Mystic | 3.2 | 0.4 | 7.2 | 5.6 | 62.0 | 0.8 |

Chamber 3 target, 1,500 runs each: 9,000: early 45.7 / best 77.3. 9,300: 42.3 / 73.7. 9,900 (the tray log's 3,300): 34.3 / 66.8.
- **Kept 9,000.** The early sealer is inside 45 to 60. The best player is 77.3, two points over "about 75". No target puts both inside: the two players are 31 points apart and the bands allow 30.
- **The red-bar holder is at 5%, 40 points under the early sealer. The 15-point aim is not met and I do not think it can be** without taking the crumble away: this player uncovers every find before sealing and loses about 20 finds a run. The bare-wall rule took the rest (it used to end 2.4 walls a run bare, free). The holder who seals at nine is at 34%, 11 points under the early sealer. The warnings (tag, crack, label, toast) are there to turn the first holder into the second.

## New player (300 profiles, Scholar / Brute / Medium, up to five runs each; `sim-out/t1s1-novice.*`)
Where it died before: chamber 3 in 65% of runs with 6% of the target banked, chamber 2 in 27%. Why: three free seals spent on single finds at Fame ×1 (20 to 50 points each against 9,000); its only real seal was the one it bought with a Memory.

| Setting (150 profiles each) | Clears on run 1 | Has a clear by run 5 |
|---|---|---|
| As tray1 plus the bare-wall rule | 0.0% | 0.7% |
| Chamber 3 at 6,000, nothing else | 3.3% | 6.7% |
| Seal held under three finds | 0.0% | 0.0% |
| Seal held under four finds, chamber 3 at 6,000 | 0.0% | 0.0% |
| Seal held for a full tray | 10.7% | 19.3% |
| Seal held for a full tray, chamber 3 at 7,500 | 24.0% | 42.0% |
| Seal held for a full tray, chamber 3 at 6,000 | 40.7% | 67.3% |

**Chosen: full tray and 7,500.** On the final rules (300 profiles): clears on its first run **25.3%** ±4.9 (Scholar 30, Brute 20, Medium 26); has a clear by run 2, 3, 4, 5: 28.3 / 31.3 / 36.7 / 42.3%.
**Target I settled on:** the plain bot clears on its first run 15 to 30% of the time, and a third to a half of profiles have a clear within five runs. Why the first run counts most: it has the two free collapses. Later runs clear about 5% each.

## Classes
Best player for each class (chooser at nine), Tomb I Stake 1: Scholar 91, Cartographer 90, Medium 84, Fence 72, Brute 65, Mystic 62. The lowest is 68% of the highest (aim: at least half). Before: Brute 49, Fence 63 (200 runs each).
Sweeps (200 runs a class, early / chooser at nine): Brute hammer 26: 14.5 / 49. 24: 30 / 53.5. **22: 37 / 63.5.** 20: 53 / 75. Fence hammer 12: 29 / 63. **11: 39.5 / 70.** 10: 60 / 79.
**Mystic** is fine for a player who chooses (62%) and near zero for one who does not (early sealer 3%). It has no Fever, and with six finds a seal that costs more than it did. Not changed: the aim is met for its best-suited player, and it is the last class to unlock. **Open owner question.**

## Later tombs and Stakes (final build)

Tomb clear rate, six classes. Best player = chooser at nine. ±2.5 at 1,500 runs, ±4 at 600, ±5.5 at 300.

| | Guardian chamber asks | Best player | Early sealer | Runs a cell |
|---|---|---|---|---|
| Tomb I, Stake 1 | 9,000 | **77.3%** | **45.7%** | 1,500 |
| Tomb II, Stake 1 | 9,900 | 69.5% | 34.2% | 600 |
| Tomb III, Stake 1 | 8,100 (wall holds 40% less) | 63.7% | 33.5% | 600 |
| Tomb IV, Stake 1 | 8,550 | 59.3% | 17.3% | 600 |
| Tomb V, Stake 1 | 7,920 (wall holds 30% less) | 50.0% | 18.0% | 600 |
| Tomb VI, Stake 1 | 9,450 | 46.7% | 11.2% | 600 |
| Tomb VII, Stake 1 | 7,650 | 40.0% | 20.7% | 600 |
| Tomb I, Stake 2 | 9,000 | 79.3% | 45.3% | 300 |
| Tomb I, Stake 3 | 9,000 | 60.8% | 25.3% | 600 |
| Tomb III, Stake 3 | 8,100 | 40.7% | 20.0% | 600 |
| Tomb V, Stake 3 | 7,920 | 21.7% | 11.0% | 600 |
| Tomb VII, Stake 3 | 7,650 | 19.3% | 7.5% | 600 |
| Tomb I, Stake 4 | 9,450 | 52.3% | 17.0% | 300 |
| Tomb I, Stake 5 | 9,900 | 45.0% | 10.0% | 300 |
| Tomb I, Stake 6 | 10,350 then 8,630 | **15.0%** | 1.3% | 600 |
| Tomb III, Stake 6 | 9,320 then 8,630 | **8.8%** | 1.3% | 600 |
| Tomb V, Stake 6 | 9,110 then 8,630 | **3.8%** | 0.7% | 600 |
| Tomb VII, Stake 6 | 8,800 then 8,630 | **4.0%** | 0.3% | 600 |

- **Stake 1 falls smoothly for the best player:** 77, 70, 64, 59, 50, 47, 40.
- **Stake 6 is hard but possible for the best player:** 15, 9, 4, 4. For the early sealer it is about 1%. Brute and Fence are at 0 to 4% even for the best player at Stake 6.
- The Stake 1 rows for Tombs I to VII were run before the last build was made (the last edits were the Stake 6 number and the tap box). `sim-same.cjs` replayed 60 runs of each of the seven rows on the final build: all 420 ended the same way to the point (`sim-out/final-check.*`), so those tables stand for the final build.

### How the numbers were found
- **Guardian targets.** `sim-probe.cjs`: each tomb run with chamber 3 out of reach, to see how much each player banks before the Memories run out (`sim-out/probe-guardian.txt`). First pass from that (II +10, III -5, IV +5, V -10, VI +10, VII -5) gave 70, 59, 48, 48, 41, 29: not smooth. Second pass (the build) gave the row above.
- **Stake 6**, best player, 300 runs a cell, Tombs I / III / V / VII:

| Setting | Tomb I | III | V | VII |
|---|---|---|---|---|
| As tray1 (Stakes 4 to 6 ask +5 / +10 / +15%, fourth chamber 0.75) | 4.0 | 3.7 | 2.0 | 1.3 |
| A. No Stake multiplier, 0.75 | 14.0 | 6.7 | 6.3 | 1.7 |
| B. No Stake multiplier, 0.5 | 32.3 | 13.3 | 12.7 | 6.0 |
| C. Stakes ask -5 / -10 / -15%, 0.5 | 54.3 | 28.3 | 22.0 | 18.0 |
| D. +5 / +10 / +10%, 0.5 | 17.7 | 9.7 | 7.3 | 6.0 |
| E. +5 / +10 / +10%, 0.6 | 10.7 | 7.3 | 4.0 | 3.3 |
| **Built: +5 / +10 / +15% as today, fourth chamber 0.5** (600 runs) | 15.0 | 8.8 | 3.8 | 4.0 |

  (A to C were run with the first-pass guardian targets, D and E with the second.) **One number changed: the Long Dark's fourth chamber asks 0.5 of the deep step, not 0.75** (8,630 on screen, was 12,070). The Stake cards ("Targets +5% / +10% / +15%") stay true as written.

### What the simulated players lack, and the allowance
No player uses an ore, a class skill, the Market, a second tool or gear other than the default pick. I added the cheapest piece, one Vault relic (`RELIC=name`): Golden Fleece ("every seal pays 50% more"), equipped and **never fed**. Best player, 300 runs: Tomb I Stake 1 77.0 (77.3 without), Tomb IV 61.7 (59.3), Tomb VII 44.0 (40.0), Tomb I Stake 6 11.3 (15.0), Tomb V Stake 6 4.3 (3.8). All inside the noise. The reason is a game rule: a relic left hungry falls asleep at the end of the first chamber. So an unfed relic is worth almost nothing, and a fed one (Fame ×2 on top of its power) was not simulated because feeding costs a find and needs a player who plans it.
**Allowance I made:** a real player past their first runs feeds a relic, spends ores and uses the Market, so the rates above are floors. I aimed the best simulated player at the low end of each band for that reason (Tomb VII at 40%, Stake 6 at 4 to 15%) and did not tune further. How much higher real players land is **not measured**.

## Simulator against the real build
`node sim.cjs verify` on the final build (`sim-out/verify.txt`): eight recorded runs replayed with real taps in real time, fingerprint compared before every decision.
| Run | Replayed | Fingerprints compared | Result |
|---|---|---|---|
| early / scholar / Tomb 1 Stake 1 / V-1 | 220 of 461 recorded steps, 115 real taps | 105 | PASS |
| pick9 / medium / Tomb 1 Stake 1 / V-2 | 220 of 312 recorded steps, 123 real taps | 98 | PASS |
| hammer / brute / Tomb 1 Stake 1 / V-3 | 147 of 147 recorded steps, 94 real taps | 58 | PASS |
| hold / fence / Tomb 3 Stake 3 / V-4 | 220 of 392 recorded steps, 117 real taps | 104 | PASS |
| novice / scholar / Tomb 1 Stake 1 / V-5 | 220 of 484 recorded steps, 114 real taps | 106 | PASS |
| pick9 / cartographer / Tomb 5 Stake 6 / V-6 | 220 of 471 recorded steps, 118 real taps | 102 | PASS |
| early / mystic / Tomb 1 Stake 1 / V-7 | 220 of 227 recorded steps, 124 real taps | 96 | PASS |
| early / scholar / Tomb 1 Stake 1 / V-B2 | 257 of 257 recorded steps, 143 real taps | 119 | PASS |

788 fingerprints, all equal.
The new cases: a new profile under the first-tomb rules, Tomb V at Stake 6, a Mystic, and a run in which a second bare wall costs a Memory, replayed to its end.

## Tests (all on md5 42116621, real touchscreen taps; `t/results/`)

| Check | Result |
|---|---|
| `node --check` on the script | OK, 960,955 bytes |
| **Full flow at 390×844, 360×640, 844×390** (`flow.cjs`): title, kit, dig, eight loose, pick and unpick, six-find seal, sarcophagus reading, second bone, chamber cleared, Market | PASS. 0 page errors, no horizontal scroll at any stop |
| **Tray** (`tray.cjs`): default tray, pick / unpick, seal takes the tray, tenth find crumbles (and with Reduce Motion), several in one strike, resume mid-pick, seeded determinism, numbers | PASS, 9 of 9. One check ("the crumble effect has ended") failed once in the full run while the simulator was using both cores; it now waits up to 4 s more for the frame, and passed when run again |
| **Bare-wall rule** (`bare.cjs`): first is free and says so, count survives closing the app, second costs a Memory, the log warns, a new chamber has its own free one, last Memory ends the run, a new profile's free collapse covers it, a clearing seal is a clear | PASS, 8 of 8 |
| **First tomb** (`first.cjs`): seal held at three (two sizes), let go in the red and at nine loose, chamber 3 at 7,500, full sum after a win, never on the Daily, never for a profile with a win, survives resume | PASS, 7 of 7 |
| **Polish** (`polish.cjs`): toast clear of every button at three sizes and taps pass through it, 44 px box (open side and dirt side, landscape and 360), relic warning toast, log and painted label, crumble sound | PASS, 9 of 9 |
| **Upgrade from a real rc9b profile** (`upgrade.cjs`), with a dig in progress and without: no error, old dig closed and its purse paid, note shown once, everything else unchanged, old bests on Stats, new dig, seal and resume | PASS, 11 of 11 |
| **Smaller rules and words** (`extras.cjs`): version, no tag, How to Play text, relics that count finds, Gold per 300, knucklebone from 2,700, targets of every tomb and Stake | PASS |
| **Same seed, same wall as rc9b** (`seeds.cjs`) | PASS, 60 walls |
| **The Daily** (`daily.cjs`) | PASS, same wall and kit twice |
| **rc9b's oracle-bone resume test** (`rc9b-resume.cjs`) | PASS, 28 relaunches mid-reading, 3 mid-dig |
| **rc9b's honest-fork test** (`rc9b-fork.cjs`) | PASS |
| **Fuzz** (`fuzz.cjs`), 3 × 1,200 actions, one run per screen size; two profiles with a cleared tomb, one under the first-tomb rules | PASS. 0 page errors, 0 tray-rule breaks, 0 stuck, 0 unexplained taps. 50 tray taps, 8 crumbles |
| **Fuzz that hardly ever seals**, 3 × 1,200 | PASS. 0 page errors, 0 tray-rule breaks, 0 stuck (one alarm probed and cleared: Confirm digs was on). 70 tray taps, 14 crumbles |
| Screenshots (`shots.cjs` and the tests) | 51 written, 0 page errors |

Tap sizes (reported): tiles 42 / 36 / 28 px at the three sizes; Seal, Pick, Hammer all 59 px or taller.
Not a test: an earlier fuzz pass found seven dig taps that turned into tray taps, because the 44 px box took 8 px of every tile beside a find. The box now takes only 15% of a tile that can still be dug, and the full 44 px only from a tile a strike can do nothing with.

## Every number changed (tray1 to rc10)

| Number | tray1 | rc10 | Where |
|---|---|---|---|
| Version | v1.0-tray1 | v1.0-rc10 | `GAME_VERSION` |
| Save keys | `S15T_*`, cloud doc `profile_tray` | `rw_*`, cloud doc `profile` | everywhere |
| New save keys | | `rw_rc10` (upgrade done), `rw_rc9` (old bests), `rw_rc10note` (note waiting), `rw_traycoach` (was `S15T_traycoach`; new counters `bare`, `ft`) | `src/migrate.js` |
| Saved-dig record version | 1 | 2 | `rw_resume.v` |
| Telemetry config version | 10 | 11 | `S10.cfgVer` |
| Bare walls a chamber that cost nothing | no limit | 1 | `SKILL.bare.free` (new) |
| First tomb: finds on the tray before Seal works | none | 6 | `SKILL.first.tray` (new) |
| First tomb: crack share at which the seal is let go | none | 0.8 | `SKILL.first.red` (new) |
| First tomb: chamber 3 target | 9,000 | 7,500 | `SKILL.first.t3` (new) |
| Coaching line counts (bare wall, first tomb) | | 3 each | `SKILL.bare.coach`, `SKILL.first.coach` |
| Stake target multipliers | 1, 1, 1, 1.05, 1.1, 1.15 in code | the same values, now a table | `SKILL.stakeT` (new) |
| Long Dark fourth chamber, share of the deep step | 0.75 (12,070 on screen) | 0.5 (8,630) | `SKILL.long4` |
| Guardian target, Tomb II | +5% (9,450) | +10% (9,900) | `TOMBS[1].twist.tgt`, `PROG_DATA.tombs[1].target` |
| Guardian target, Tomb III | +15% (10,350) | -10% (8,100) | `TOMBS[2]`, `PROG_DATA.tombs[2]` |
| Guardian target, Tomb IV | none (9,000) | -5% (8,550) | `TOMBS[3]`, `PROG_DATA.tombs[3]` (new field) |
| Guardian target, Tomb V | +30% (11,700) | -12% (7,920) | `TOMBS[4]`, `PROG_DATA.tombs[4]` |
| Guardian target, Tomb VI | +10% (9,900) | +5% (9,450) | `TOMBS[5]`, `PROG_DATA.tombs[5]` |
| Guardian target, Tomb VII | -60% (3,600) | -15% (7,650) | `TOMBS[6]`, `PROG_DATA.tombs[6]` |
| Brute hammer crack | 26 | 22 | `CLASSES.brute.hamCrack` and two lines of text |
| Fence hammer crack | 12 | 11 | `PROG_DATA.fence.hamCrack` |
| Smallest tap box of a loose find | the tile | 44 px; 15% of a tile where the next tile can be dug | `TRAY.tap`, `TRAY.edge` (new) |
| Relic-warning log delay | | 250 ms | `trayRelicWarn` |

Not changed, for the record: Tomb I targets 900 / 1,200 / 9,000; Tombs II to VII chambers 1 and 2 at 900 / 2,700; `SKILL.firstReal` 600; `SKILL.mercy.free` 2; three free seals; tray of six, room for nine; knucklebone from 2,700; Gold and XP per 300; every other number in the tray log's list.
Text that changed with the numbers: the six guardian lines and slips, the Ledger line for Tomb VII, Brute's two descriptions, two How to Play cards, the hold-your-finds note.

## Open questions for the owner
1. **Relics count toward the nine and can crumble.** Kept as built, with a loud warning. Keep?
2. **The first-tomb seal guard is a hard rule.** A softer version (advice, "tap again to seal anyway") is kinder to a player who knows what they want, and leaves the plain bot near 0%. Which?
3. **Mystic** clears 62% for a player who chooses and 3% for one who does not. Leave it as the expert class, or give it something for the tray rule?
4. **Old bests** are labelled as old-rule scores and new bests start from zero. Or scale them by three?
5. **Brute and Fence at Stake 6** are at 0 to 4% for the best simulated player. Fine for the top rung, or lift them?
6. **Tomb VII's guardian** used to ask 60% less; it now asks 15% less (the old figure made the last tomb the easiest). The slip text lost "so few of them". Is the new line right for the fiction?

## Not done, or uncertain
- **No person has played it.** Every tap is a real touchscreen tap in headless Chromium. No iOS shell, no WKWebView, no VoiceOver.
- **Nothing was heard or felt.** The crumble sound is checked as a call (`sfx('crumble')`), not by ear.
- **Run counts.** Confirmed at 1,500: Tomb I Stake 1 (six players), and chamber 3 at 9,300 and 9,900. At 600: Tombs II to VII Stake 1, Tombs I / III / V / VII at Stakes 3 and 6. At 300: the new player, Tomb I at Stakes 2, 4 and 5, the relic rows, every trial. Not run at all: Tombs II, IV, VI at Stakes 2 to 6; Tombs III, V, VII at Stakes 2, 4, 5; the holders and the hammer bot past Tomb I.
- **Two aims missed, both by a little or by design:** the best player on Tomb I is 77.3%, not "about 75"; the red-bar holder is 40 points under the early sealer, not 15.
- **How much better real players do** than the simulated ones (ores, Market, a fed relic) is not measured.
- **The guardian chamber's Vault wake** (+3% a relic above three, from Tomb III) was simulated with an empty Vault. A full Vault raises those targets by up to 30%.
- **The app shell** (`www/`, `tests/`, config) still has rc9b's numbers. `tests/remote-config.test.mjs` and `tests/smoke.test.mjs` hard-code 300 / 900 / 4,500 and will need the list above. Store text, README and docs were not touched.
- **Timeline tiers for 7 and 8 ages** still cannot be reached with six finds (carried from the tray log).
- **rc9b's own 14 em dashes** are still in the file.
- The tray test build's saves (`S15T_`) are not brought over.
