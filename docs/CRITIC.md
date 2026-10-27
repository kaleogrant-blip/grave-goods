# Grave Goods v1.0-rc7a: fresh-eyes critic (Sprint 13b)

Reviewer: the team lead, playing as a first-time reviewer. Build: `team/current.html` = v1.0-rc7a. Fresh profile, 390x844 at DPR 2, Chromium touchscreen taps only (Playwright, `sprint10/int/t/lib.js` wrapper, no state forcing). About 28 minutes on the clock across 7 runs (one tomb clear, a Descend that ended in a collapse and an abandon, an Oracle's Cellar run, the Daily as Brute, three more Valley runs), plus camp: Codex, Collection, Ledger, Shop, Stats, Settings, How to play, kit screen, Vault-full card, jackpot wheel, knucklebone, rival, collapse, walk-away, reload-resume. Screenshots: `testgroup/critic13b/shots/` (97 frames), card text log `testgroup/critic13b/cards.log`.

Honest limits of this review: I cannot hear audio or feel haptics, so sound is unrated. To keep the session moving I used a small helper to pick which cell to tap (cells next to a half-uncovered find, otherwise cells next to open ones) and a rule to press Seal; every input was still a real touch tap on the real UI. A human is slower and worse at this than the helper, so every "this is hard" below is, if anything, understated.

## Score: 7.5 / 10 (the bar is 8)

The look, the voice and the card writing are launch quality: the title scene, the Valley wall with lamp light, the relic reveal cards with real provenance, the Black Market, the knucklebone panel, "The tomb has forgotten you", "The log was not consulted". It plays like a game someone cared about, and the first 60 seconds teach themselves (red target square, "Tap the dirt.", a 30-point practice wall, "That was practice"). What holds it under 8 is that two things are wrong on screen in every chamber (the Pick and Hammer labels are covered by their own icons from the first real chamber onward, at 390x844 and 360x640; big numbers lack thousands separators) and that a casual player who seals early and uses the pick cannot reach chamber 2's 500 or chamber 3's 4,500 with three seals (I banked 165 of 500 and 1,268 of 4,500 playing that way, and cleared both only with a lucky 531 and 4,752 seal when I dug for the big one). Fix the visible defects and the copy and it is an 8; the casual climb decides whether it is a 9.

## The three things that would make it a 9+

1. **A HUD that is never wrong at a glance.** Fix the tool-bar label collision (CR-1), the armed Walk-away label crowding the hearts (CR-8), the truncated Daily row and 360-wide pouch labels (CR-6, CR-7), and make every big number use thousands separators (CR-2). These are the things a store reviewer's screenshot or a streamer's clip will show. Nothing else on screen needs to change.
2. **A casual path to chamber 3.** The jump 200, 500, 4,500 is steep for the player who seals at half-wall with the pick. Either the chamber 2 target comes down a little and a first-two-chambers Memory tweak softens the cliff (Sprint 13b balance step), or the game has to teach "hold one big seal" harder than one grey slip. Right now the best moments (the 4,752 seal, the 6,007 seal) are gifts the player cannot yet plan.
3. **Calmer cards.** The How to play Luck card is a wall of text (about 14 sentences), the Summary has five stacked blocks before the share text, and the summary's "Banked 1,645 of 2,320 · surplus not paid" line is hard to read (a wall pays at most 1.5x its target; say so plainly). Split the Luck card in two, make the summary arithmetic plain, and keep every card to a thumb-scroll or less.

## Bugs and rough edges found

Severity: P1 feel-breaking or on screen all run, P2 visible polish or wrong copy, P3 nit. IDs here are CR-n; the build step maps them to fixes.

| ID | Sev | What I saw | Repro / evidence |
|---|---|---|---|
| CR-1 | P1 | **Pick and Hammer button labels are hidden behind their own icons** from chamber 1 on ("Pick" shows as "k", "Hammer" as "Ham..er"). 390x844 and 360x640; fine at 844x390. Cause: `body.lkres button small.odds[hidden]{display:block!important}` plus `min-height:2.15em` reserves a 22 px odds line inside buttons that are only 61 px tall, which pushes the labels up under the absolutely placed icon. | Any chamber after training: `shots/18c.png`, `13-`, `27-`, `89-v360.png`. DOM: `#pickO` hidden but display:block, 22 px high. |
| CR-2 | P2 | Hero numbers have no thousands separator ("5560", "1518", "2739") while the line under them does ("best 5,560", "1,645"). | Tomb-cleared, collapse, walked-away and run-end cards. |
| CR-3 | P3 | Summary line "Banked 1,645 of 2,320 · surplus not paid" is confusing: the headline is paid points (capped at 1.5x target), the line is raw banked. (My first read of this as a number mismatch was a screenshot caught mid count-up; retracted. The numbers agree.) | Oracle's Cellar run end, `78-unh.png`. (T89 area.) |
| CR-4 | P2 | Collapse copy lower-cases a relic name: "The Dresden Codex is buried again... The dresden codex did not come back up." | Collapse card, `70-unh` text. |
| CR-5 | P2 | British spellings in a game that should be American: "Colour-blind assist" (Settings), "the colour of young maize" (Jade Mask legend), "Favourite class" (Stats), "synthesised" (About). | Settings, Jade Mask entry, Stats, About. |
| CR-6 | P2 | The Daily row on camp is clipped at 390: "OCT 22 · not dug yet · +50 ◆ f…". | `55-run-end.png`. (T86 copy now too long.) |
| CR-7 | P2 | 360x640: the wall board is only about 55% of the width with wide black bars either side, and pouch labels truncate ("Lodestone", "skip an age" lose letters; T95). 844x390 pouch labels also clip. | `89-v360.png`, `90-v844.png`. |
| CR-8 | P2 | Header Walk away armed label ("Tap again to confirm") pushes "CH. 3/3" and clips the third heart under the fast-forward button at 390. | `85-walked.png`. |
| CR-9 | P2 | Sky Iron ("every find shows its outline") outlines every covered find cell in the same red the game uses for danger, about 40 red boxes at once; it reads as a wall about to fall. | `35-skyiron.png`. |
| CR-10 | P2 | The "Uncovered: ..." toast grows to two lines when six or more finds are listed and covers the top two rows of the wall and the digger; the hint chip can also sit over a find. | `19-ch1-b.png`, `21-ch1-c.png`. |
| CR-11 | P3 | Run-summary tile "VAULT ENTRIES 3 / kinds met this run" does not say what it counts (relics that entered the Vault or were already owned); the share text line "Relics" then lists fewer relics than "Relics sealed x3" when the Vault was full. | Summary of the vault-full run. |
| CR-12 | P3 | Entry card: the sticky "Back" band sits under the header as a wide beige bar and Back appears again at the bottom; "Found at Stake 1 . Shallow Grave" repeats the "First found ... Stake 1" line above it (T97). | Every relic entry, `26-`/`31-` frames. |
| CR-13 | P3 | The coin offer ("Yes . throw") is one tap with 6,007 at stake (it was the right call to leave Pay buttons at two taps; this one is a different kind of loss). Odds are printed, so not a bug; a design flag. | `44-throw1.png`. |
| CR-14 | P3 | Walk-away card says "The wall stands" and then "Lost to the rubble: 1 unsealed find". | `86-walked2` text. |
| CR-15 | P3 | Pause card: the line "0 OF 7,000 BANKED THIS CHAMBER . 5,560 IN ALL . heart heart heart" wraps and strands the hearts. | `50-pause.png`. |
| CR-16 | P3 | Kit screen Tomb VII tab reads "7" (every other tab is a Roman numeral); Ledger prints "Unlocked." twice per tomb (badge and line). | `67-kitq.png`, `63-mLedger.png`. |
| CR-17 | P3 | Title says "TAP ANYWHERE FOR CAMP" while the Daily tile and DIG open the kit (T92 still true). Camp header shows "1 RUN . 1 TOMB CLEARED . BEST HAUL" and then "1 TOMB CLEARED. A STREAK STARTS AT TWO." directly under it (T93). | `55-run-end.png`. |
| CR-18 | P3 | Stats counted "Runs 1" after an abandoned dig and a cleared tomb (the abandon does not count). Probably intended; worth a line on the Abandon card. | `66-mStats.png`. |
| CR-19 | P3 | The Vault (12 slots) is full after about 25 minutes on a fresh profile, so from then on every relic find interrupts the dig with the Vault-full card (well written, but it fires on every relic). | `92-vaultfull.png`. |
| CR-20 | P3 | Pouch-full card: tapping the slot that holds the same ore silently closes the card (T94). | `74-pouchfull.png`. |

Not bugs, worth saying: no console or page errors in 28 minutes; Resume after a reload put me back at the right chamber with the right Memories and said so ("The wall is a fresh one" but not that the three seals I had made in that chamber were gone: worth a line); Walk away needs the second tap and the arm label works; the knucklebone, wheel, rival and Black Market cards all print their odds.

## Chamber 2 and 3 numbers from this session (casual style: pick or hammer, seal at about half wall)
| Attempt | Chamber 2 (500) | Chamber 3 (4,500) |
|---|---|---|
| Tomb I, first run (dug for a big seal) | 531 in one seal, cleared | 4,752 in one seal (Maya x3 mask), cleared |
| Tomb I, pick only, sealing at half wall | cleared | 1,268 of 4,500 after 3 seals; walked away |
| Tomb I with the Eye of Horus, hammer, three seals | 165 of 500, wall at 135 of 150 crack | not reached |
| Tomb I, hammer | cleared | 3,646 of 4,500, three collapses |

One honest sample is not a rate, but the shape matches round 3: players who wait for the big seal win, players who bank early do not, and nothing in the first ten minutes says which of those to be.

## Post-fix re-check (rc7b, Sprint 13b)

Re-played the same states on `sprint13b/next.html` at 390x844, 360x640 and 844x390 (shots in `sprint13b/shots/`):
- CR-1 fixed: Pick, Hammer, X-ray and Seal labels are visible in every chamber at all three sizes (`vis-*-ch2.png`).
- CR-2 fixed: count-up hero numbers print with thousands separators.
- CR-3 reworded: "Paid 1,645 of 2,320 banked (a wall pays at most 1.5x its target)".
- CR-4, CR-5 fixed (relic names keep capitals; American spelling, plus 17 more spelling fixes found in the proofread).
- CR-6 fixed: the Daily row keeps its reward text and wraps to two lines instead of clipping (`camp-390x844.png`).
- CR-7 partly fixed: four-slot pouch names no longer clip at 360 or in landscape (`pouch-*.png`); the 55% pillarboxed wall at 360x640 is not changed.
- CR-8 fixed: armed Walk away is a fixed 74 px, wraps, hearts stay visible (`walk-*.png`).
- CR-9 fixed: Sky Iron outlines are gold; CR-10 fixed: the Uncovered toast lists four names and "and N more".
- CR-17 (T92, T93) fixed; CR-20 (T94) fixed; CR-12 (T97) fixed.
- Not fixed: CR-11, CR-13..16, CR-18, CR-19 (design calls or copy that needs a decision), and the 360x640 board size.
Score after fixes: 8.0 / 10 on the look and the HUD. The casual climb now has a chamber-2 target of 400 (novice first-wall clear about 23% in the sim), but chamber 3 at 4,500 is still the wall for most casual players, so I would not call it 9.
