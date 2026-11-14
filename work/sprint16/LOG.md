# Sprint 16 log: v1.0-rc10 (the tray rule, tuned)

Resume by reading this file top to bottom. Work only in `work/sprint16/`.

- **Build:** `work/sprint16/build.html` (md5 in `t/results/build-md5.txt` once the last test run is in; see "State right now").
- **How it is made:** `python3 work/sprint16/ed.py` turns `work/tray/build.html` (v1.0-tray1, md5 8e42b5f5) into the build with exact, counted text replacements. Balance numbers are in `tune.py`. The upgrade code is `src/migrate.js`.
- **Simulator:** `sim.cjs`, `simlib.js`, `sim-verify.cjs`, `sim-table.cjs`, `sim-probe.cjs` (copied from `work/tray/`, extended). Results in `sim-out/`.
- **Tests:** `t/` (`bash t/run-all.sh`), outputs in `t/results/`. Screenshots in `shots/`.

## Progress checklist
- [x] 0. Workspace made from `work/tray/` (build md5 8e42b5f5)
- [x] 5. Bare-wall rule built, saved, coached, tested (`t/bare.cjs`, 8 pass)
- [x] 6a. Carry-over: main save namespace (`rw_`), version v1.0-rc10, tag gone, rc9b upgrade (`t/upgrade.cjs`, 11 pass)
- [x] 6b. Polish: crumble sound, 44 px tray taps, toasts off the tool buttons, relic crack warning (`t/polish.cjs`, 9 pass)
- [x] 2. New player: first-tomb rules built and tested (`t/first.cjs`, 7 pass); simulated at 300 profiles
- [x] 4. Class spread: Brute hammer 26 to 22, Fence 12 to 11
- [x] 1. Tomb I, Stake 1 at 1,500 runs a player (kept at 9,000; 9,300 and 9,900 also run)
- [ ] 3. Later tombs: first pass run at 600; second pass of guardian targets set, NOT yet confirmed. Stakes 3 and 6: baseline running, retune not chosen yet
- [ ] 7. Old tests on the final build (tray, flow, extras, seeds, daily, rc9b-resume, rc9b-fork passed on an earlier build of today; fuzz and shots not run yet)
- [ ] sim-verify on the final build (running on an earlier build, with four new cases)
- [ ] Final tables, number list, open questions (drafts below)

## State right now (update this first when resuming)
- `tune.py` has the second-pass guardian targets (II +10%, III -10%, IV -5%, V -12%, VI +5%, VII -15%). They need a 600-run confirm (`sim.cjs table 600 2:1,3:1,4:1,5:1,6:1,7:1 pick9,early`).
- Stake multipliers are still tray1's (1, 1, 1, 1.05, 1.10, 1.15) and `long4` 0.75. Next step: pick them from the Stake 6 trials, then run the final table.
- Long simulator runs are started from a copy of the build and simulator in a scratch folder, so editing here never disturbs a run.

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
| Mystic | 3.0 | 0.6 | 7.2 | 5.6 | 62.0 | 0.8 |

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

## Later tombs and Stakes
(in progress; see "State right now")

## Every number changed (tray1 to rc10)
(filled in at the end; so far)
| Number | tray1 | rc10 |
|---|---|---|
| Version | v1.0-tray1 | v1.0-rc10 |
| Save keys | `S15T_*`, cloud doc `profile_tray` | `rw_*`, cloud doc `profile` |
| Saved-dig record version | 1 | 2 |
| `cfgVer` (telemetry config version) | 10 | 11 |
| Bare walls a chamber that cost nothing (`SKILL.bare.free`) | no limit | 1 |
| First tomb: finds on the tray before Seal works (`SKILL.first.tray`) | none | 6 |
| First tomb: crack share at which the seal is let go (`SKILL.first.red`) | none | 0.8 |
| First tomb: chamber 3 target (`SKILL.first.t3`) | 9,000 | 7,500 |
| Brute hammer crack | 26 | 22 |
| Fence hammer crack | 12 | 11 |
| Smallest tap box of a loose find (`TRAY.tap`) | the tile | 44 px |
| Guardian target, Tomb II (Oracle) | +5% | +10% |
| Guardian target, Tomb III (Jelling) | +15% | -10% (second pass, to confirm) |
| Guardian target, Tomb IV (Tikal) | 0 | -5% (to confirm) |
| Guardian target, Tomb V (Ur) | +30% | -12% (to confirm) |
| Guardian target, Tomb VI (Knossos) | +10% | +5% (to confirm) |
| Guardian target, Tomb VII (Terracotta) | -60% | -15% (to confirm) |
| Tomb I targets 900 / 1,200 / 9,000 | | unchanged |
| Tombs II to VII chambers 1 and 2: 900 / 2,700 | | unchanged |

## Open questions for the owner
1. Relics count toward the nine and can crumble. Keep?
2. The first-tomb seal guard is a hard rule. Keep it hard, or make it advice with "tap again to seal anyway" (the plain bot then stays near 0%)?
3. Mystic: weak for anyone who does not choose. Leave, or give it something for the tray rule?
4. Old bests are labelled as old and new ones start from zero. Or scale them by three?

## Not done or uncertain
(filled in at the end)
