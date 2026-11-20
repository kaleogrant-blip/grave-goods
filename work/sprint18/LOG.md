# Sprint 18 log: v1.0-rc10a, store screenshots, owner hand-off

Resume by reading this file. Branch `sprint-18` (from `origin/main` at 4fccc32).

- **Game build:** `work/sprint18/build.html` = `game/current.html`, **v1.0-rc10a, md5 `d3cd2b1d562af3b10c59b745c9c1d0d7`**, 1,158,207 bytes.
- **How it is made:** `python3 work/sprint18/ed.py` turns `work/sprint16/build.html` (rc10, md5 42116621) into it with 17 exact, counted text replacements. No balance number is touched.
- **Tests of the game alone:** `bash work/sprint18/t/run-all.sh` (results in `t/results/`); the four fixes are `t/fixes.cjs`.

## Checklist
- [x] A. Four game fixes; `t/fixes.cjs` 19 of 19; same walls (60) and same results (360 simulated runs) as rc10; sprint 16 test set and two fuzz runs on the final build
- [x] B. Promoted into `game/current.html`; shell tests and documents updated
- [x] C. Store screenshots: `scripts/store-shots.mjs`, twelve frames re-made, each looked at
- [x] D. `docs/OWNER-TODO.md` rewritten as an ordered hand-off
- [ ] E. Full `npm test` on the final tree, merge to main, CI green (see "State right now")

## State right now
All content is committed on `sprint-18`. Left: the last full `npm test`, the merge, and watching CI.

## A. The four fixes (all in `ed.py`)
1. **Resume and the play log.** `s10TelBoot` tested saved-dig record version 1; the record is version 2. Now `rz.v===2`. A dig closed and reopened leaves one `run_resume` and no `run_end` in the game's log. The same steps on rc10 leave a final "interrupted" row (test 1b).
2. **Telemetry for the tray rule,** through `telEmit` like every other event (same buffer, same Play log switch, same `gg:tel` hand-off to the shell, which holds the consent gate). No identifiers. All skip the practice wall.
   - `crumble` {chamber, wall_index, kind, relic, loose}: one row per find that crumbled. `kind` is the find's name (a game item, such as "Coin"); `loose` is how many lay loose when it went (10 for the usual case).
   - `tray_pick` {chamber, wall_index, tray, loose, put_on, held_back}: one row at a seal, and only when the tray sealed differs from the one the game would have laid out. Taps send nothing. A find tapped off and back on is not a change.
   - `seal_held` {chamber, wall_index, tray, loose, crack_pct}: the first-tomb guard refused a seal. One row per wall and tray count, so repeated presses do not flood the log.
   - `bare_wall` {chamber, wall_index, charged, nth}: `charged` means the wall went down the path that costs a Memory (a free collapse or a relic may still cover it); `nth` is its number in the chamber.
   - One field each on existing rows: `seal.loose` (finds loose when Seal was pressed) and `chamber_end.crumbled` (finds that crumbled on the wall the chamber ended on).
3. **Text from the numbers.** Stake cards: `STAKES[n].rule` is now a getter that adds "Targets +5%" (or "Targets 10% lower", or nothing at 0) from `SKILL.stakeT`; the Ledger line reads it live. Bare-wall lines (log, coaching toast, card subtitle, "no dirt left" line, How to Play card) come from `bareTxt()`, which reads `SKILL.bare.free`: 0 = "a bare wall costs a Memory", 1 = the rc10 words exactly, 2 and 3 = "the first two bare walls ... twice a chamber ... a third bare wall". With the shipped numbers every string is identical to rc10 (test 3a).
4. **No seal slip with the Looter's Sack.** The chamber-cleared card does not write the slip when `gear.id==='sack'`. The shell's `not_applicable` guard stays.

Not changed: `cfgVer` stays 11 (no balance change), save keys and the saved-dig record (no migration: `chamber_end.crumbled` is counted from the finds' existing `crumb` mark, so nothing new is saved). Em dashes: 14 before, 14 after.

## A. Tests on the final build (md5 d3cd2b1d, real touchscreen taps)
| Check | Result |
|---|---|
| `node --check` | OK, 964,447 bytes |
| `fixes.cjs` (the four fixes, with rc10 controls) | PASS 19 of 19 |
| Same seed, same wall as rc10 (`seeds.cjs`) | PASS, 60 walls over 20 seeds (dirt, finds, ores, tell, generator state) |
| Same seed, same result as rc10 (`sim.cjs` on both builds, `sim-same.cjs`; `sim-out/same.txt`) | 360 runs (Tomb I Stake 1 and Tomb V Stake 6; early sealer, chooser at nine, new player; six classes), 0 differ |
| Full flow at 390x844, 360x640, 844x390 (`flow.cjs`) | PASS, 0 page errors, no horizontal scroll |
| `tray` 9, `bare` 8, `first` 7, `polish` 9, `upgrade` 11 (from a real rc9b profile), `extras`, `daily`, `rc9b-resume`, `rc9b-fork` | all PASS |
| Fuzz, 3 x 1,200 actions, one run per screen size | PASS, 0 page errors, 0 tray-rule breaks, 0 stuck |
| Fuzz that hardly ever seals, 3 x 1,200 | PASS, same |

One honest note. `tray.cjs` failed one check in the first full run ("a tap on a find never digs": it reads the log line, and a coaching line on a timer had replaced it). The same check fails the same way on unmodified rc10 on this machine, so it is the test's timing and not the build. The test now keeps the last four log lines; three runs in a row then passed 9 of 9. Saves: `upgrade.cjs` and the resume tests read and write rc10-format saves with no migration step.

## B. Shell
- `game/current.html` replaced by the build (never edited by hand). `www/index.html` is generated and git-ignored.
- Telemetry: the shell has no allow-list of event names, so no code change. New tests: two unit tests in `tests/telemetry.test.mjs` (the four events pass through the normal batch; nothing queued or sent with no answer, "no", Play log off, or no key) and three real-game tests in `tests/rc10-rules.test.mjs` (the four events from real taps to the analytics endpoint with only their own fields; "No thanks" sends nothing; the Sack card has no slip and the shell still refuses).
- `tests/rc10-rules.test.mjs` now asserts the play-log fix where it used to carry a "known bug" comment. `tests/smoke.test.mjs` asserts that remote `stakeT` and `bare.free` change the words. `tests/ad-slips.test.mjs`: the Sack card has 0 slips (was: 1, hidden).
- Version strings in tests and documents: rc10a where they name the build in the repo.
- Two tests could fail by chance before this sprint and did once here: a wall with the Hollow tell asks 15% more (about one wall in thirty), and `rc10-rules` test 1 and one `smoke` test read a chamber-2 target of exactly 1,200. Both now allow for or avoid the tell. Not caused by rc10a (the tell is decided from the seed alone, and seeded walls are identical).

## C. Store screenshots
`scripts/store-shots.mjs` (README, "Store screenshots"). Twelve frames re-made from rc10a, same names and sizes as before (1290x2796 and 1080x2340, RGB, no alpha). Composition follows the old frames: dark ground, gold headline, one italic line, the game in a brass border; now in the app's own two typefaces. I looked at all twelve.
- Fixed while looking: the long headline of frame 02 ran off the right edge (headlines are now set smaller until they fit; the old rc7b frame 02 had its headline printed over its subtitle); three frames caught the score sheet half open (the script now waits for it and sets it); the first knucklebone seed was not worth the offer (the script now searches for one and fails loudly if there is none).
- What is setup and what is real is written at the top of the script and in `store/listing.md`: a made-up profile with 17 relics, walls prepared so a find is one tap from open; the uncovering, tray choice and seal are real taps; nothing on screen is drawn by the script.
- Weak points, said plainly: frame 02 shows two Dynasties and Fever but no Timeline tag in view, though the headline names Timelines; frame 01 still prints "Finders keepers." (it is the game's title screen), so it is uploaded last; no person has judged any of them; the Play feature graphic is still the rc7b one.
- `tests/store-assets.test.mjs` checks sizes, colour type, names and that captions match the listing.

## D. Owner hand-off
`docs/OWNER-TODO.md` rewritten: what is finished and tested, what has never run on a device or against Apple, then twelve ordered steps, each with where to click, what it needs and how to tell it worked; four PowerShell check blocks (website, app-ads.txt, config) written for line-by-line pasting. `tests/docs.test.mjs` still checks every blank is listed.
Three facts in the brief were not in the old file and are added from the brief or the code; the lead should confirm them:
- **SKU `gravegoods`.** `docs/TRACK-B.md` and `scripts/asc-setup.mjs` suggest `gravegoods001`. The hand-off says `gravegoods` and notes the other; it is a private label, so only a mismatch with an existing app record matters.
- **The exposed App Store Connect key.** Step 1 says revoke and regenerate, then replace three secrets. The repo has no record of how it was exposed.
- **Daily tomb range.** Read from the game: `DAILY.tombs` is all seven tombs, so a new player's Daily can be Tomb VII. Listed as decision D5.

## For the game team
- The `tell` on a wall changes its target (Hollow +15%); any test or tool that reads a target on a random seed should allow for it.
- `crumble.kind` is the find's display name. If names are ever localised, send a stable id instead.
