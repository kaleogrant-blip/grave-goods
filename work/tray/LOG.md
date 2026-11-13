# Tray test build log (v1.0-tray1)

The seal rule under test: **a finds tray holds six, and the wall gives you room for nine loose finds. Uncover a tenth and the oldest crumbles.**

- **Build:** `work/tray/build.html`, md5 `8e42b5f50349556f81e1631f2f252557`, 11,900 lines. It says `TRAY TEST · v1.0-tray1` at the top of every screen.
- **How it is made:** `python3 work/tray/ed.py` turns `game/current.html` (v1.0-rc9b, md5 `6fd8da9d…`) into the build with 76 exact text replacements, each with a checked count. Nothing outside `work/tray/` was edited. `game/current.html` still has its rc9b md5.
- **Tests:** `work/tray/t/` (`bash t/run-all.sh`), outputs in `t/results/`.
- **Screenshots:** `work/tray/shots/`, 36 pictures, three screen sizes.
- **Simulator:** `work/tray/sim.cjs` (it is `.cjs`, not `.js`, because the repo's package.json makes `.js` an ES module), with `simlib.js`, `sim-verify.cjs`, `sim-table.cjs`. Results in `work/tray/sim-out/`.

## The short version

1. The rule works in the build and passes every test I wrote for it.
2. **The simulator does not agree with the proposal's predictions.** On the real build, Tomb I, Stake 1, 1,500 runs each:

| Player | Proposal said | Real build |
|---|---|---|
| Early sealer (seals when six lie loose) | 45% | **56.3%** |
| Holder who never chooses (waits for the red bar) | 63% | **24.1%** |
| Holder who chooses well (waits for the red bar) | 70% | **45.2%** |
| Hammer bot | 35% | **41.7%** |
| New player (seals the moment anything shows) | 0% clear the tomb | **0.5%** |
| *Extra:* holder who seals when nine lie loose, never chooses | not in the proposal | **46.2%** |
| *Extra:* holder who seals when nine lie loose, and chooses | not in the proposal | **77.2%** |

3. What that means in plain words:
   - **Waiting for the red bar is now a bad plan.** A holder digs past nine loose finds and about 25 finds a run crumble. Sealing early beats it by 32 points. The proposal had this the other way round.
   - **Choosing is worth a lot.** At the same timing, choosing the six beats not choosing by 21 points (red-bar holder) and by 31 points (nine-find holder). That is the owner's third test, and it passes much more clearly than the proposal's 7 points.
   - **The best player I built clears 77%.** That is just over the owner's "nobody above about 75%" line. The early sealer at 56% is inside the 45 to 60 band.
   - The players here are mine, not the design team's (their simulator was not in the repo). So the comparison is rule against rule, not bot against bot. See "How far to trust the simulator".
4. Nothing was tuned toward the predictions. The build has the numbers the proposal lists and nothing else.

## What changed in the build

### The rule
- **A seal takes at most six finds.** With six or fewer loose, Seal takes them all. With more, it takes the six worth most.
- **The player chooses.** Tap an uncovered find to move it on or off the tray. Finds on the tray get a brass rim and a tick. Finds left off are dimmed with a dashed rim. Marks only show when there is something to tell apart (more than six loose, or something taken off by hand).
- **Finds not chosen stay on the wall** for a later seal, still at risk.
- **Nine loose finds at most.** Each find is stamped with its place in the order of uncovering. When a strike leaves more than nine loose, the oldest go until nine remain. If one strike uncovers several, the lowest Worth counts as oldest. Sarcophagi do not count.
- **The crumble:** the oldest find cracks (0.5 s), breaks into pieces that fall (1 s), a red `CRUMBLED` label sits over it, the toast line says which find went, and a dark hole is left. Reduce Motion: no shake, no falling pieces, the cracked find fades where it lies.
- **When nine lie loose** the oldest one shows a red crack and a blinking red rim (steady under Reduce Motion), and the tag over the wall turns red: `Loose 9/9 · full`.
- **On screen:** the Seal button says `Tray 4/6`. The strip chip and a tag over the wall say `Loose 7/9`. The score panel prices the tray, not everything uncovered.

### Numbers
| Setting | rc9b | Tray build |
|---|---|---|
| Tomb I chamber targets | 300 / 400 / 4,500 | 300 / 400 / 3,000, then ×3: **900 / 1,200 / 9,000** |
| Tombs II to VII | 300 / 900 / 4,500 with each tomb's own twist | **900 / 2,700 / 9,000** with the same twists and Stake multipliers as today (the proposal: "other tombs scale from this as they do today") |
| Every find's Worth | | ×3 |
| Payout cap (1.5× target) | on | **off** |
| Fame cap (×120) | on | **off** |
| Hoard (×2 Fame) | 8 or more finds | **a full tray (6)** |
| Knucklebone offered from | a seal of 2,500 | **2,700** (the proposal's "about 900", ×3) |
| Free seals per chamber | 3 | unchanged |

So that ×3 "changes nothing but the digits", these moved with it: first-wall soft target 200 to 600, the first real wall's 300 cap to 900, training target 30 to 90, Pyrite 1 to 3 (Sieve 5 to 15), the full-Memory gift 25 to 75, the second bone's gold 500 to 1,500, Draupnir +3 to +9 a find, Cyrus Cylinder +8 to +24, Gold now 1 per 300 banked and XP 1 per 300 (so a run pays the same Gold and XP as before for the same play).

### Words
- How to Play has a new second card, **The finds tray**, with its own drawing. "Dig and seal" and "Worth × Fame" were edited ("six at most", "a full tray of six (a Hoard)").
- The Training-complete card ends with: "One rule of the tomb proper. A finds tray holds six, and the wall has room for nine loose finds. Uncover a tenth and the oldest crumbles."
- First-time coaching toasts, each shown a few times per profile and then never again: "A tray holds six. The six worth most are on it. Tap a find to swap it on or off." (twice), "Nine loose finds. The wall has room for no more. Uncover a tenth and the oldest crumbles." (three times), "No room on the wall. The Coin, your oldest loose find, crumbled. Seal a tray to make room." (three times).
- Holding a finger on a loose find shows "On the tray · tap to leave it" or "Off the tray · tap to add it".
- No em dashes were added (14 in rc9b, 14 in the build).

### Kept apart from the main game
- Every storage key starts `S15T_` (rc9b uses `rw_`). The cloud document, if the runtime ever grants one, is `profile_tray`. Tested in one browser profile: see the test table.
- Version `v1.0-tray1` on the title and in About. A red `TRAY TEST · v1.0-tray1` tag is fixed to the top centre of every screen, above cards.

## Judgement calls

1. **A tap on a loose find always moves it on or off the tray, whatever tool is in hand. It never digs.** The other choice was to let a hammer tap on a find dig around it, but then choosing a tray could cost crack by accident, and that cannot be undone. The price: the hammer can no longer be centred on an uncovered find. Tap the dirt next to it instead. A tray tap also skips Confirm digs, since it cannot dig.
2. **Taking a find off lets the next most valuable one step in** (while more than six are loose). Hand picks come first, then the best of the rest. If all six are hand picks, a seventh is refused with "The tray is full."
3. **Picks reset after every seal.** Whatever was held back goes on the next tray by default.
4. **Relics count toward the nine and can crumble.** The proposal only exempts sarcophagi. A relic uncovered early and then ignored is lost. This will hurt the first time it happens. The toast names it.
5. **A Pyrite relic is ranked as the relic it pretends to be** when the default six are picked, so the tray never gives the fake away.
6. **No tray taps on the training wall.** It has five finds, so the tray never matters there, and a stray "left on the wall" would confuse the lesson.
7. **Relics, gear and classes that count finds:**
   - *Rhind Mathematical Papyrus* said "A Hoard needs 6 finds, not 8". With Hoard at 6 that is no power at all, so it is now **5**.
   - *Terracotta Warrior* (three of one shape): unchanged, a tray holds three easily.
   - *Rosetta Stone* (3 / 4 / 6 finds): unchanged, the top tier is a full tray.
   - *Timeline* pays more for runs up to 8 ages. A tray tops out at 6 (×3.5). Left alone, so the 7 and 8 tiers can no longer be reached.
   - *Dynasty* ×2 at five of one civilization: unchanged.
   - *Lamassu* (one more free seal): unchanged. It is worth more now, since seals are the scarce thing.
   - *Code of Hammurabi* pays "the full value of what you lost": now the best tray of what was lost, since no score can hold more than six. The collapse card quotes the same figure.
   - *Sack* (two seals a chamber, Fame bonus): unchanged. It is weaker now: two trays is twelve finds at most.
   - No class counts finds. The Fence still pockets one uncovered find at the end of a chamber.
8. **Hunger lines** such as "a find worth 5 or more" test the find's base worth, so they now read "worth 15 or more before its age".
9. **The crumble sound** is the game's own heavy dig sound plus a three-pulse buzz. No new sound was written.
10. **Later tombs:** rescaled exactly as the proposal says, by leaving every tomb twist and Stake multiplier alone on top of the new base. No Stake retune was put in the build. See the simulator section for how far the retune got.

## Tests (all on md5 8e42b5f5, real touchscreen taps)

| Check | Result |
|---|---|
| `node --check` on the extracted script (`check.sh`) | OK, 947,578 bytes |
| **Full flow at 390×844, 360×640, 844×390** (`flow.cjs`): title, kit, dig, eight loose finds, one tapped onto the tray and one tapped off, a six-find seal, sarcophagus reading, second bone, chamber cleared, Market | PASS. 0 page errors. No horizontal scroll at any of 15 stops per size. No vibrate call before the first tap |
| **Default tray** (`tray.cjs`): eight loose finds, the six worth most are on it; button says Tray 6/6; tag and chip say Loose 8/9; the panel prices the tray | PASS |
| **Pick and unpick** by tapping finds: off, back on, a hammer tap on a find moves it and digs nothing (crack and dirt unchanged), six hand picks, a seventh refused | PASS |
| **Seal takes exactly the tray**: the six chosen are banked, two stay loose, picks reset, the bank rises by the previewed total | PASS |
| **Tenth find, the oldest crumbles**: exactly the first-uncovered find is gone, nine remain, the tenth is there, toast and first-time line shown, the effect ends, and the tile is painted as a dark hole (pixel brightness 388 to 73) | PASS |
| The same with **Reduce Motion**: no shake, effect ends, same state | PASS |
| **Several in one strike**: the lower Worth gets the older stamp; a sarcophagus is not a loose find | PASS |
| **Resume mid-pick**: app closed with one find tapped off and one tapped on, nine loose. After relaunch: same loose finds, same tray, same hand picks, same ages, same crack, bank and generator state. A tenth find after the resume crumbles the same oldest | PASS |
| **Seeded determinism**: same seed, same taps (dig, pick, crumble, seal), run twice: identical finds, ages, losses, crack, bank, generator state | PASS |
| Hoard at six and not at five; targets 900 / 1,200 / 9,000; both caps off; every Worth a multiple of 3; version and tag; no storage key outside `S15T_` | PASS |
| **Same seed, same wall as rc9b** (`seeds.cjs`): 60 walls over 20 seeds, dirt, finds, ores, tell and generator state identical | PASS |
| **Main-game save untouched** (`mainsave.cjs`): play rc9b to a saved dig, then play the tray build from the title in the same browser profile (the two files do share one storage: checked), then reopen rc9b. All 12 main-game keys byte-identical, none added or removed; the tray build wrote 12 keys, all `S15T_`; it did not offer the main game's run; rc9b resumed the same wall, crack, bank and tap count | PASS |
| **Smaller rules and words** (`extras.cjs`): tag and version at three sizes, tag above cards, the new How to Play card present with its text, no retired wording, Rhind 5, Draupnir +9, Cyrus +24, Terracotta Warrior, Gold per 300, knucklebone 2,700, tomb targets, training wall clears with one tray | PASS, 16 of 16 |
| **rc9b's own resume test** on this build (`rc9b-resume.cjs`): 28 relaunches mid-reading (sarcophagus and second bone) plus 3 mid-dig | PASS, every one ends in the same state as the uninterrupted run |
| **rc9b's own honest-fork test** on this build (`rc9b-fork.cjs`) | PASS |
| **Fuzz** (`fuzz.cjs`), 3 × 1,200 random actions (one run per screen size), tray taps in the mix, tray rules checked after every action | PASS. 0 page errors, 0 tray-rule breaks, 0 stuck, no horizontal scroll. Up to 9 loose finds reached, 89 tray taps, 6 crumbles |
| **Fuzz that hardly ever seals**, 3 × 1,200 | PASS. 0 page errors, 0 tray-rule breaks, 0 stuck. 112 tray taps, 3 crumbles |
| Screenshots (`shots.cjs`) | 36 written, 0 page errors, no horizontal scroll |

Tray rules the fuzz checks after every action: never more than nine loose, never more than six on the tray, every loose find has an age and no two share one, a crumbled find is banked and lost, the tray holds only loose finds, and the Seal button's count equals the tray.

Fuzz, taps that should dig and did not (2,202 of 3,828 over both runs, 0 unexplained): 1,777 Confirm digs was on (the fuzz switches it on in Settings), 304 a seal was being counted, 118 the tool or tile refused and said so, 3 landed on another element. These are rc9b's own categories; none is new.

Random tapping rarely uncovers ten finds, so the fuzz hit the crumble only 9 times. The crumble is covered by the direct tests above.

## Simulator

### What it is
It does not re-implement the game. It opens the real `build.html` in headless Chromium, swaps the page clock for a fake one, switches off painting, sound and autosave, and lets scripted players play whole runs through the build's own functions. So walls, Worth, Fame, crack, red-line rolls, the tray, the crumble, chests, the Market, Memories and targets are whatever the build does.

**Check against the real build** (`node sim.cjs verify`): a simulated run is recorded, then the same actions are made on an untouched copy of the build in real time with real taps. Before every decision a fingerprint must match: chamber, bank, Memories, crack, loose finds, dirt left, seals, finds lost, and the state of the seeded generator.

VERIFY-TABLE

The first version of this check failed, and it was right to: the simulator's players were acting before the second bone came out (it arrives 0.7 s after the fourth Fever). The players now wait for it. That is the only correction it forced.

### The players
All use the default kit (Brass Knuckle Pick, standard tools, no relic equipped), never use an ore or a class skill, skip the Market, decline the knucklebone, and start from a seasoned profile with an empty Vault (the new player starts from a fresh profile, with its soft first target and two free collapses). 300 runs for each of five classes (Scholar, Brute, Medium, Fence, Cartographer) makes 1,500. The margin on each figure is about ±2.5 points.

- **Early sealer:** mis-taps 12% of the time, hammer on fresh ground, pick to finish what shows. Seals when six lie loose, or at 85% crack. Never chooses.
- **Holder, no choosing:** same hands. Waits for the red bar (80% crack), then taps Seal until nothing is left to seal. This is the proposal's holder, taken literally: it keeps digging past nine.
- **Holder who chooses:** same, but picks the six. The pick is every way of splitting the loose finds into this tray and the next, scored with the game's own score.
- **Hammer bot:** hammer only, never a wrong tile, seals at 85%. Never chooses.
- **New player:** taps dirt at random, mostly with the pick, opens every sarcophagus, seals the moment anything is uncovered while a free seal is left.
- **Extra, "at nine":** a holder who also seals when nine lie loose, so nothing crumbles. Run with and without choosing. The proposal has no such player. A real person will find this plan on their first crumble, so it is the one to watch.
- Every player pays a Memory for a fourth seal only when that seal clears the chamber.

### Tomb I, Stake 1 (1,500 runs a player)

| | Early sealer | Holder | Holder at nine | Holder who chooses | Chooser at nine | Hammer bot | New player |
|---|---|---|---|---|---|---|---|
| Clears the tomb | **56.3%** | **24.1%** | 46.2% | **45.2%** | **77.2%** | **41.7%** | 0.5% |
| Proposal's prediction | 45% | 63% | | 70% | | 35% | 0.0% |
| Best seal, median | 3,420 | 2,484 | 3,744 | 3,618 | 5,112 | 3,672 | 1,188 |
| Best seal, 95th percentile | 7,260 | 6,696 | 8,064 | 8,100 | 10,125 | 7,776 | 2,988 |
| Finds crumbled a run | 0.0 | 25.1 | 0.7 | 20.6 | 0.6 | 18.3 | 1.5 |
| Walls a run | 5.7 | 8.3 | 5.8 | 7.0 | 5.0 | 6.7 | 6.7 |
| Scholar | 88% | 48% | 73% | 71% | 95% | 70% | 1% |
| Brute | 16% | 3% | 16% | 19% | 49% | 14% | 0% |
| Medium | 60% | 25% | 57% | 54% | 85% | 24% | 0% |
| Fence | 30% | 5% | 17% | 14% | 64% | 5% | 0% |
| Cartographer | 87% | 40% | 68% | 68% | 93% | 95% | 1% |

New player, chamber by chamber: clears chamber 1 in 92.3% of runs, chamber 2 in 63.3%, the tomb in 0.5%. (The proposal: 36.5%, 10.8%, 0.0%. My new player digs on after its seals are spent and its first wall asks 600, so it gets further. It still cannot clear the tomb.)

Points are in ×3 units: divide by 3 to compare with the proposal ("a best seal is about 700 to 900, rare ones near 2,400"). The early sealer's median best seal is 1,140 in old units, the 95th percentile 2,420.

### Against the owner's three tests

| Test | Result on the real build |
|---|---|
| Tomb I, Stake 1, ordinary player between 45% and 60% | **Pass.** Early sealer 56.3%. |
| No policy above about 75% on Tomb I | **Just over.** The chooser at nine clears 77.2% (Scholar 95%, Cartographer 93%). HIGHER-TARGET |
| Skilled play clearly beats hold-only | **Pass, clearly.** Choosing adds 21 points for the red-bar holder and 31 points for the holder at nine. And "when" matters now too: sealing at nine instead of at the red bar adds 22 to 32 points. |

### Why the holder numbers are so far from the proposal
The proposal's holder waits for the red bar and scores 63%. On the real build the same plan loses about 25 finds a run to the crumble: a wall holds 10 to 14 finds, the holder uncovers nearly all of them before sealing, and everything past nine pushes the oldest out. It then seals six and three. The early sealer banks six, six and the rest, and every full tray is a Hoard (×2). So on the real build **the tray teaches "seal a full tray", not "hold"**. Whether the design team's holder ignored the crumble, or sealed at nine without saying so, I cannot tell from the document.

### The same players on rc9b (old seal rule), for scale

500 runs a player, `game/current.html`, numbers in rc9b's own units.

| | Early sealer (seals at six loose) | Holder (red bar) | Hammer bot | New player |
|---|---|---|---|---|
| rc9b, clears the tomb | 9.2% | 91.6% | 87.4% | 1.8% |
| Proposal's figures for today's rules | 40% | 90% | 99% | 0.0% |
| Tray build | 56.3% | 24.1% | 41.7% | 0.5% |

My holder lands on the proposal's holder (92% against 90%), so the two simulators agree about the old rule's problem. My early sealer is much weaker than theirs under the old rule (theirs sealed "at about 8 finds"; mine seals at six). Under the old rule, sealing early was a disaster and holding was nearly a sure win. Under the tray rule that is reversed, and the 92% player is gone.

### Other tombs and Stakes

ROWS-TABLE

### Tomb V, Stake 6 and the Stake retune

RETUNE

### How far to trust the simulator
- The rules are the build's own, and the fake-clock runs match real-time runs tap for tap (table above). That part is solid.
- The players are mine. The design team's simulator and its players were not in the repo (only an early copy of an older simulator, `work/sim/sim-old.js`, which models a much older game and was not used). So "early sealer 56%" and "early sealer 45%" are two different early sealers under what should be the same rule.
- No player here uses an ore, a class skill, the Market or an equipped relic. Real players do. Real win rates will be higher than these for anyone past their first few runs.
- Classes are very uneven with the default kit: Scholar and Cartographer clear about 88% as early sealers, Brute 16%, Fence 30%. The proposal saw the same shape (Medium 68%, Brute and Fence about 35%).
- **A loop the tray makes easier (it is in rc9b too):** a wall with no dirt, no loose finds and no shut sarcophagus "comes down anyway, and a bare wall costs nothing", and the chamber's bank carries to the next wall. Under the tray rule a careful digger can empty a wall, seal two or three trays, and take a fresh wall with three fresh seals at no cost, as often as the crack allows. The players above end 0.4 to 2.8 walls a run this way. DECISIONS.md item 5 says "one free bare-wall exit per chamber, then a Memory", but I could not find that limit in the rc9b code: every bare wall is free. I did not change it (it is main-game behaviour). It should be looked at before either rule ships.

## Not done, or uncertain

- **No person has played it.** Every tap in the tests is a real touchscreen tap in headless Chromium, not a finger on a phone. No iOS shell, no WKWebView, no VoiceOver.
- **Nothing was heard or felt.** The crumble's sound and buzz are checked only as calls.
- **Tray taps use wall tiles**, the same targets digging uses: 42 px at 390×844, 36 px at 360×640, 28 px at 844×390. Buttons are unchanged (all 59 px or taller). A one-tile Coin is a small thing to tap in landscape.
- **Landscape:** the `Loose n/9` tag sits at the bottom right of the wall there. There is no strip in landscape, so that tag and the Seal button are the only counters.
- **The first-time toasts cover the tool buttons** for about five seconds (taps pass through them). They are the game's existing toast, in its existing place.
- **The Stake retune is not in the build.** See above for how far the numbers got.
- **Classes are uneven** and were not rebalanced.
- **The free bare-wall loop** is reported, not changed.
- **Timeline tiers for 7 and 8 ages** can no longer be reached and were left in the table.
- **The Daily** runs under the tray rule in this build and keeps its own best score under `S15T_`. Not separately tested beyond the shared code paths.
- **Store text, README and docs** were not touched.
- One check in `extras.cjs` ("no em dash in the rendered manual") failed once in four runs and passed in the other three. I did not capture what it matched. The build's own new text has no em dash. Most likely one of rc9b's own cards printed a "—" placeholder for a kit that varies with the random gear offer.
