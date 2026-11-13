# Sprint 15b log (v1.0-rc9b, "Read the Bone")

- Build: `work/sprint15b/build.html`, md5 `6fd8da9d13ffa9be150ed06466b93888`, 11,785 lines. Made from `game/current.html` (v1.0-rc9a).
- Reference, untouched: `work/sprint15b/rc9a.html`. `game/current.html`, `www/`, `store/` were not edited.
- Tests: `work/sprint15b/t/` (harness `h.cjs`). Saved outputs: `t/results/`. Screenshots: `shots/` (25 PNGs, 4.8 MB).
- Source fragments of the new module: `src/bone.js`, `src/bone.css` (first drafts; the build is the truth).

## What changed

1. **Sarcophagus = the bone reading.** Reels gone. Three taps: Heat the pit, Wait for the crack, Read it; then a stamped finds tag.
   The roll is still made and saved in `openSarc()` before the panel opens. The record prints the chances first, split "left of the pit / right of the pit".
   The fork goes to the side that holds the decided result (`boneSide()`), the other side is struck in red, and the pencilled figures are computed from the roll's own table (`boneRevised()`), nothing hard-coded.
   Under Sulfur the record says mimic 0% and bones 45%, because that is what the roll does.
   First reading only: "The Quartermaster carries ox shoulder blades from dig to dig and asks one before every lid. His habit, not the tomb's."
   After 3 readings a "Read it at once" button appears (one tap, chances still printed first). Reduce Motion: same taps, no travel or shake, a 0.25 s fade to the tag.
2. **Fourth-Fever wheel = his second bone.** Same panel, own record with the wheel's weights. "Nothing" reads "Robbed in antiquity."
3. **Knucklebone** unchanged in rule, chances and trigger. Copy now says "This is a wager on the seal you just banked"; buttons "Wager it" / "Keep N".
4. **Past 80% crack:** name and percent chip gone. A field note hangs from the clipboard ("Wall is talking. Loose 30 in 100. Tremor 10 in 100."), Pick and Hammer carry a pencil "×2 if loose", and the ×2 tag on finds is drawn as a pencil note. "LUCKY STRIKE" is "LOOSE STONE"; its shower is grit, not gold.
5. **Stats and words.** Heading "Field conditions"; cells Loose stone, Bones thrown, Close shaves (now counts only seals with under 5% of the wall to spare), Bones read. Near misses and Jackpots removed. How to Play card "Luck" rewritten as "Chances". Quartz, Loose Mortar, Charioteer, guardian cards, settings and Ledger lines reworded.
6. **Sound and touch.** New one-shots `k_hiss`, `k_crack`, `k_creep`, `k_stop`, `k_tag`; `k_reeltick`, `k_reelstop`, `k_wheel`, `k_jackpot` removed. No bell voices in the bone sounds. A reading that is cut short stops its sounds and vibration.
   Haptics are separate timed pulses (8, 12, 18, 28 ms rising; 100 at the crack; 6, 6, 6 then 30), because the iOS shell turns each `hap()` call into one impact.
7. **Coaching** is built from the kit the run has (`kitNames()`): class slip, Damp slip, first tutorial card, Glass Hammer line, chisel refusal.
8. **Version** `v1.0-rc9b`.

## Done differently, and why

- **The second bone is rolled when it is brought out**, not on a later tap, and saved as `state.jpPend`. Same two seeded draws, same place in the sequence. In rc9a, closing the app with the wheel card up lost the wheel; now it is paid on resume.
- **Results are paid when the panel closes** (tap "Back to the wall", or by itself after 2.6 s), so the sting and the wall effects happen where the player can see them.
- **Resume fix:** rc9a spent the spare seeded draw twice if the app closed 0.6 s or more into the reels. The save now records that it was spent (`sarcPend.d`).
- **The wall is not repainted under the bone** (as under a card).
- **Words left alone on purpose:** "Coin" (a find on the wall), Athenian coins, the Antikythera gear wheel, the crystal skull's jeweler's wheel, Camazotz taking heads, the nine-tailed fox, "Lucky Knucklebone" (gear name), "the lucky number". "Stake" and "Triple or nothing" kept as ruled.
- **Not changed:** the `k_lucky` sound for loose stone is still a bell arpeggio (outside the bone scope).

## Verification, all on md5 6fd8da9d

| Check | Result |
|---|---|
| `node --check` on the extracted script (`t/check.sh`) | OK, 934,441 bytes |
| Flow, real taps, 390x844 / 360x640 / 844x390 (`flow.cjs`): title, kit, dig, seal, sarcophagus reading, second bone, Market | PASS. 0 page errors, scrollWidth = viewport at all 13 stops per size, no vibrate call before the first tap |
| Same seed as rc9a (`parity.cjs`, 20 seeds) | PASS. 60 walls identical; 23 sarcophagus results, 20 fourth-Fever results and 346 red-line rolls identical; generator state and bank identical at the end of every chamber; 0 seeds differ |
| Honest fork (`fork.cjs`, 200,000 seeded rolls per table) | PASS. Sarcophagus: printed 20/25/30/15/10, observed 20.00/25.08/29.98/15.06/9.88; pencilled 44/56 and 55/27/18, observed 44.37/55.63 and 54.60/27.42/17.99. Second bone: printed 30/25/10/10/25, pencilled 46/38/15 and 29/71, observed 46.30/38.39/15.31 and 28.36/71.64. Worst z 1.9. Plus 40 real readings: fork side, strikes, pencilled figures and end sign all matched the saved result, 40 of 40 |
| Resume (`resume.cjs`) | PASS. 28 relaunches mid-reading (4 sarcophagus seeds and 3 second-bone seeds, each closed before any tap, after Heat, after the crack, with the tag up) plus 7 second relaunches: every one ends in the same state as the uninterrupted run, paid once. 3 mid-dig relaunches: same wall, crack, bank |
| Sound (`audio.cjs`) | PASS, 36 of 36. 29 nodes per reading, every one given a stop time at start, longest 1.08 s; none left 3.6 s after a reading; none left after `luckReset()` mid-hiss, after the crack or mid-creep; none after hide/show; no luck timers left |
| Smaller rules (`extras.cjs`) | PASS, 26 of 26: version on title, first-time line, 600 ms tap guard, fast path, red-line note, knucklebone copy, Stats, rendered How to Play / Stats / Settings / Ledger / Codex free of retired words, coaching across 60 class x tool kits, Reduce Motion |
| Fuzz (`fuzz.cjs`), 5 x 1500 mixed sizes + 2 x 1500 landscape | PASS. 0 page errors, 0 stuck, no horizontal scroll. See below |
| draw() (`perf.cjs`) | PASS. 0 draw calls while the bone is up (frame gap 16.7 ms). draw() forced 200 times with the panel up: median 0.3 to 0.4 ms, p95 1.1 to 1.8 ms. Idle wall: 0.7 to 0.8 ms |
| Retired words (`words.py`) | 0 left in the build (rc9a: 49). 33 allowed uses listed with reasons |
| Repo tests, build substituted in a scratch copy | 189 of 190 pass. The one failure (`android-patch`: `capacitor.plugins.json` missing, a git-ignored file) fails the same way with rc9a |

### Taps that should dig and did not (fuzz, 4,888 such taps, 2,466 did not dig, 0 unexplained)

- 1,533: Confirm digs was on (the fuzz switched it on in Settings; first tap only aims).
- 909: a seal was being counted. `strike()` drops taps while `state.sealing` is true and says nothing. **This is the likely cause of the old "tap dug nothing" report.**
- 22: a card or panel opened under the tap in the same instant.
- 2: the tool refused and said so in a toast.

## Notes on the tests themselves

- Headless Chromium on `file://` sometimes drops all of localStorage across `page.reload()` (3 of 30 with rc9a, 6 of 30 with this build, no `removeItem` call). Relaunch tests therefore fire `pagehide`, copy storage out and boot a new context with it (`H.relaunch`).
- The repo's smoke tests caught a `navigator.vibrate(0)` at boot that my harness had hidden; fixed in the build, and the harness now records any vibrate call made before the first tap.
- Pictures use a forced result (`H.forceSarc`); no test does.
- Raw fuzz reports are not committed; `t/results/fuzz-summary.json` has counts and examples.

## Not done / uncertain

- Nothing was heard or felt: sound levels are estimates, haptics are checked only as calls. No real phone, no WKWebView, no VoiceOver.
- The app shell (`www/native.js`, not mine to edit) fires a "success" haptic when `luckJackpot()` is called, which is now the moment the second bone appears.
- The silent drop of taps during a seal count is reported, not fixed.
- Store text and README still describe rc9a.
