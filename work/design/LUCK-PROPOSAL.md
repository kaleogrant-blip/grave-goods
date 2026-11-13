# Grave Goods: luck re-dress and the new seal rule

Design team proposal, 9 Nov 2026. Built against v1.0-rc8. Nothing in the game build was changed.

**What we need from Kaleo**

1. **Pick a direction for the chest reveal: A, B or C.** We recommend **A, Lift the Lid**. Play all three at `art/luck/board.html`.
2. **Decide the knucklebone.** Either it becomes an omen with nothing staked (our recommendation), or it stays a triple-or-nothing wager and the game is rated 18+ in Australia and 13+ elsewhere on Apple. There is no honest middle.
3. **Approve the seal rule: "A finds tray holds six."** It passes two of your three tests and only half-passes the third. Details and the weak spot are in Part 2.

---

# Part 1. Re-dressing the luck moments

## What the rating questions actually say

We looked these up today. Wording changes; check again on submission day.

| Body | The wording | What it means for us |
|---|---|---|
| **Apple** (App Store Connect, "Age ratings values and definitions") | Simulated Gambling: "Betting or wagering without using real money or in-game currency that can be exchanged for real money." Answers: none, infrequent (13+), frequent (18+). | The test is **betting or wagering**. A free chest that cannot lose you anything is not a bet. Putting a banked seal up for triple-or-nothing is. |
| **Apple, by country** | Australia: any simulated gambling gives R 18+. Brazil: 12 or 18. Korea: 12+ or 19+ (19+ needs a local rating number). | One "infrequent" answer costs Australia's under-18s. |
| **Australia** (Classification Board guidance, in force 22 Sept 2024) | Simulated gambling is R 18+ when all of these hold: it is interactive; it "resembles or functions like a real-world, age-restricted betting or gambling service"; a stake is required; the outcome is random; the stake can be lost. Size does not matter: a small part of a bigger game counts. | Reels and a wheel "resemble". The knucklebone has a stake, a random outcome and a loss. |
| **PEGI** | 18 for games that "teach and/or glamorise the use of games of chance that are played/carried out as a traditional means of gambling", meaning those "normally played or carried out in casinos, gambling halls, or racetracks". | In Feb 2025 PEGI moved Balatro and Luck Be a Landlord from 18 to 12 on appeal and promised finer rules. We have not seen the finer rules. |
| **Google Play / IARC** | We could not read the live questionnaire. It sits behind a Play Console login. An older IARC-style sample asks about "betting, gambling games or other games of chance that are normally played for money". | Unknown until someone runs it. It takes an hour. |

**What we read ourselves:** Apple's definitions page, the Australian guidance, PEGI's label page, a trade report on the Balatro appeal. We read them through a summarising tool, so the quotes should be checked against the pages before anyone relies on them.

**What stays uncertain:** the exact Google question; how an Apple reviewer treats risking in-game score rather than currency; whether "resembles a gambling service" would be stretched to cover a brushed-off plaque or a drawn lot.

**The working rule we designed to:** no stake, no casino object, no staged near-miss. If all three are true for a moment, "none" is a truthful answer for that moment.

## Where the build stands today

| Moment | How it works in rc8 | Is anything staked? | Problem |
|---|---|---|---|
| Sarcophagus | Three reels spin and stop left to right. The result was decided first. Relic 20%, ore 25%, bones 30%, mimic 15%, a Memory 10%. | No | Looks like a slot machine. 30% of bones and mimic results are dressed as "two stars and a miss". |
| Fourth Fever | A five-slice prize wheel titled "Streak Jackpot". Relic 30%, ore 25%, nothing 25%, a Memory 10%, 500 points 10%. | No | Looks like a prize wheel. Uses the word jackpot. |
| Knucklebone | After a seal of 2,500 or more: "Triple or nothing?" Pranes 32% pays three times over. Hyption, Chios and Kos take the seal back. | **Yes, the seal** | A real wager on a real ancient gambling piece. |
| Tool odds | Past 80% crack every strike rolls: normal 60, lucky 30 (finds in reach worth double), tremor 10 (6% extra crack). | No | Not gambling. The name "Press Your Luck" and the odds chip on the button look like it. |
| Stats | "Near misses" and "Jackpots" counters under a "Luck" heading. | No | A near-miss counter is the wrong thing to be seen counting. |

## The three directions

All three keep the same chances, decide the result before the animation, and print the chances on the oak clipboard before the player touches anything. All three end the same way: a finds tag drops onto the screen with a stamp.

One idea is shared by A and C and we think it is the best thing in this proposal. **The middle beat gives real evidence, and the clipboard is revised in pencil.** A gold glint rules out ore, bones and a Memory. The sheet strikes those three in red and writes the new chances next to the two that are left: relic 57%, mimic 43%. That is true arithmetic, not a tease. It replaces the fake "two stars and a miss" with honest suspense.

### A. Lift the Lid

**What the player sees and does**

| Time | Player | Screen |
|---|---|---|
| 0.0 s | Reads the sheet | Sarcophagus in lamplight, pry bar set at the corner. "The lid has not moved in three thousand years. Set the bar." |
| Tap 1 | "Set the bar" | The lid lifts a finger's width. Dust falls. A line of light shows under it: gold, blue-green or pale. The sheet strikes what that colour rules out and pencils in the new chances. |
| Tap 2 | "Lower the lamp" | The lamp is carried to the gap. A big, stretched shadow of the contents is thrown on the back wall. "Shadows exaggerate." |
| Tap 3 | "Lift the lid" | 0.6 s of stone grinding. The lid slides off and drops. The object rises into the light. |
| +1.2 s | | The finds tag drops and is stamped: BAGGED, RECORDED or HAZARD. |

**Why it is still exciting.** There are two suspense beats instead of one. The first is the colour of the glint, which genuinely changes the chances. The second is the 0.6 s grind with a gold glint showing, when you know it is a relic or a mimic and nothing else. The reveal lands on the object rising, not on a symbol lining up.

**Sound and touch.** Tap 1: a short wood-and-stone creak, one light tick of haptic. Tap 2: a second, lower creak. Tap 3: a long low grind with a rolling haptic (short pulses getting closer together), then silence for a breath, then a four-note rise for a relic, two falling notes for bones, a low growl and a hard double buzz for a mimic. No bells, no coin sounds.

**How the chances are shown.** As a burial record on the context sheet: five lines, a colour square, a percentage. Red strike-throughs and red pencil figures after the glint.

**The wheel.** Merged. The fourth Fever now reads "the hammer found a hollow": a sealed niche behind the plaster. Same three taps, its own record (relic 30, ore 25, nothing 25, a Memory 10, 500 points 10). "Nothing" becomes "robbed in antiquity", which is funnier than an empty wheel slice.

**Rating risk: lowest.** It is a chest being opened. Nothing is staked, nothing spins, nothing lines up. We would answer "none" for this moment without hesitating.

**Cost: M (about a day).** One new painted scene, three states, strings. The result logic is untouched.

### B. Brush the Cartouche

**What the player sees and does**

| Time | Player | Screen |
|---|---|---|
| 0.0 s | Reads the sheet | The lid from above, with a plaque caked in dust. "Brush, do not scrub." |
| 0 to 3 s | Drags a finger across the plaque (or taps Brush three times) | Dust comes away under the brush. A carved sign appears a strip at a time. At about a third: "Something carved. Not enough of it yet to put a name to." |
| About 60% clear | | The last dust blows off. The sign colours in and glows. "Clear enough to read: the maker's mark: a mask." |
| +0.9 s | | Finds tag and stamp. |

**Why it is still exciting.** The player's own hand does the revealing, at their own speed. The suspense is the half-seen shape. It is the most satisfying of the three to touch.

**Sound and touch.** A soft dry brush sound and a faint tick every few millimetres of stroke. A breath of air at the end. Then the same result sounds as A.

**How the chances are shown.** Same burial record. There is no honest halfway evidence here, so the sheet is not revised until the end. That is one beat fewer than A.

**The wheel.** Re-dressed as the Quartermaster's crate with a caked label. Same brush.

**Rating risk: medium.** No stake, so by Apple's sentence it is not simulated gambling. But rubbing a panel to reveal a prize is what a scratch card is, and scratch cards are lottery products. A reviewer or a parent could see that. We kept it to one plaque with no matching and no grid to stay clear, and we would never use the word "scratch". It is defensible. It is not as clean as A.

**Cost: M (a day or two).** The drag-to-erase layer needs care on slow phones and needs a tap fallback for accessibility (the mock has one).

### C. Read the Bone

**The history we checked.** Divination by lot is everywhere in antiquity and most of it was not gambling. Shang diviners (about 1250 to 1050 BC) heated pits drilled in ox shoulder blades and turtle shells and read the cracks; thousands survive with the question carved beside the crack. Greeks shook lots in a helmet (it is how Ajax is chosen in the Iliad) and Athens picked its juries with an allotment machine. Knucklebones were thrown at oracles as well as in taverns. Egyptians put written questions before a god's statue. Of these, the oracle bone is the furthest from anything a rater has seen in a casino, and the game already has a China tomb and an Oracle Bone relic.

**What the player sees and does**

| Time | Player | Screen |
|---|---|---|
| 0.0 s | Reads the sheet | An ox shoulder blade with five carved signs along the top and a drilled pit at the bottom. "The Quartermaster hands you an ox shoulder blade, a bronze rod and a look." |
| Tap 1 | "Heat the pit" | The glowing rod goes in. The pit brightens for about a second. "The bone smells of the kitchen. Nothing yet." |
| Tap 2 | "Wait for the crack" | Pok. A crack jumps up the bone and forks left or right. The sheet strikes the signs on the other side and pencils in new chances. |
| Tap 3 | "Read it" | The crack creeps on for 0.9 s and stops at one sign, which lights. "The crack ends at: a relic. The lid agrees." |
| +0.6 s | | Finds tag and stamp. |

**Why it is still exciting.** The crack is a line you watch travel. The fork is the same honest halving as A's glint. The last 0.9 s is the best single suspense beat of the three.

**Sound and touch.** A hiss while heating with a slow rising haptic. One sharp crack sound with a hard tap. Two small ticks as the crack creeps, then a second crack as it stops.

**How the chances are shown.** Same burial record, revised at the fork.

**The wheel.** Merged: "the Quartermaster has kept a second bone back" on the fourth Fever.

**Rating risk: low to medium.** Nothing is staked, and fortune-telling is not a rating category. Two cautions. First, it is one step removed from the sarcophagus, so the reveal is about a bone, not the thing you dug up. Second, divination belongs to living traditions as well as dead ones. An oracle bone in a Shang context is safe ground; using it in an Egyptian or Maya tomb is not accurate, and a per-tomb version (seven methods) turns an M into an L and needs the sensitivity reader for each one.

**Cost: M for the oracle bone alone. L (a sprint) if each tomb gets its own method.**

### Side by side

| | A. Lift the Lid | B. Brush the Cartouche | C. Read the Bone |
|---|---|---|---|
| Player action | Three taps | Drag (or three taps) | Three taps |
| Suspense beats | Two | One long one | Two |
| Honest halfway evidence | Yes, the glint | No | Yes, the fork |
| Fits every tomb | Yes | Yes | Only the China tomb, strictly |
| Looks like a gambling product | No | A scratch card, a little | No |
| Wheel | Merged into a sealed niche | Re-dressed as a crate label | Merged into a second bone |
| Build | M, about a day | M, a day or two | M, or L for seven tombs |
| Rating risk | Lowest | Medium | Low to medium |

## Recommendation for Part 1

**Build A.** It is the cheapest, the safest and the only one that is plainly about the thing the game is about: opening a tomb. Borrow two things: C's creeping-line timing for the last 0.6 s, and B's brush as the animation for uncovering an ordinary find on the wall later, where it carries no rating risk at all.

Total cost for A plus the items below: **M, two days**, plus the hour for the questionnaires.

## The knucklebone throw

Straight answer: **renaming it an omen does not change the questionnaire answer.** The questions ask what the player does, not what it is called. If the player puts a banked seal at risk on a random throw for a multiple of it, that is "betting or wagering" in Apple's sentence and it meets the stake, random outcome and loss tests in Australia's. Calling the bet a consultation is a fig leaf, and a reviewer who taps the button will see through it.

There are two honest options.

| | Keep the wager | Make it a true omen |
|---|---|---|
| What happens | As today. Triple or nothing on a big seal, 32%. | After a big seal the Quartermaster offers to throw for **the next wall**. Nothing banked is touched. The four faces set the next wall's condition, using the "tells" the game already has: Pranes 32% a Quiet wall (holds 25% more, an extra Memory on clear); Hyption 46% nothing; Chios 11% Unstable (holds 15% less, finds worth 35% more); Kos 11% Hollow (target 15% higher, shallow dirt). |
| Is it a bet? | Yes. | No stake is put up and nothing is paid as a multiple. It is a risk you accept, like choosing a harder road. |
| Rating answer | Apple: "infrequent" simulated gambling. 13+ worldwide, **R 18+ in Australia**, 12 in Brazil and Korea. Google: unknown. | "None", truthfully, as far as we can judge. Someone could still argue a worse wall is a stake. We think that is a weak argument. |
| What is lost | Nothing in the game. Australian under-18s, and adult-rated apps get stricter ad rules there. | The single biggest gasp in the game: watching 9,000 become 27,000 or zero. |
| Cost | None. Fix the listing to say so. | M. A rule change, so it needs a sim pass. The numbers above are a starting point and were **not** simulated. |

**Our view: make it a true omen.** Three reasons. It keeps the bone, the four named faces, the throw and the printed chances. It ties the throw into the tells, which the red team said nobody notices. And under the new seal rule in Part 2 seals are smaller, so a 2,500 trigger would almost never fire anyway (in the sim the 95th-percentile best seal is about 2,300).

If you would rather keep the wager, keep it openly: one named gamble, declared, and Australia at 18+ or left out. Do not ship the middle version.

Whichever you choose, set the Lucky Knucklebone gear to 36%, as the red team asked. At 40% the wager has a positive return and "always throw" is correct.

## Tool odds, the Stats counters and the words

**Tool odds past 80% crack.** Keep the mechanic and the printed numbers. It is a risk inside the dig, like a critical hit, not a bet. Change the dress: drop the name "Press Your Luck" and the casino-style odds chip. On the clipboard it becomes a line of field notes that appears at the red line: "Wall is talking. Loose 30 in 100. Tremor 10 in 100." The ×2 badge on the tool stays as a pencil note.

**Stats.** Remove "Near misses" and "Jackpots". The staged near-miss is going, so most of that counter is going with it. Keep the true ones under a new name: "Close shaves: sealed with under 5% of the wall to spare". Rename the "Luck" heading "Field conditions". "Coins flipped" becomes "Bones thrown".

**Words to retire.** These are from a search of the build. Counts are rough (the search also catches code names).

| Retire | Seen about | Use instead |
|---|---|---|
| jackpot, Streak Jackpot | 34 | "a sealed niche", "fourth Fever" |
| reel, reels, spin | 40 | lid, bar, lift, open |
| wheel, slot, "five slots" | many (slot is also used for pouch slots, which is fine) | niche, record, line |
| tease, near miss | 16 | cut entirely |
| "Triple or nothing", "double or nothing" | 5 | "Ask the bone" (if the omen is chosen) |
| bet, wager, "known bets", Odalys Vane's Wager | under 10 real uses | risk, terms, "Odalys Vane's Terms" |
| odds | 35 | chances, "in 100", "as recorded" |
| pays, payout, winnings | a few | banked, counts, is worth |
| Lucky strike, Press Your Luck | 15 | "loose stone", "the wall is talking" |
| coin, flip, heads | in text only | bone, throw, Pranes |
| Fortune (the stat) | several | "Favour" or leave; low risk |
| Stake 1 to 6 (difficulty) | 43 | **Optional.** "Season 1 to 6" suits a dig. Balatro uses "stake" and was rated 12 in the end, so this is taste, not risk. |

Also change the store listing: it currently answers "infrequent/mild simulated gambling". With A, the true omen and the word list, we believe the truthful answer is "none". Run both questionnaires before promising that anywhere.

## The mocks

| File | What it is |
|---|---|
| `art/luck/board.html` | All three in phone frames, side by side, each playable. Start here. |
| `art/luck/mock-A.html`, `mock-B.html`, `mock-C.html` | Each direction alone at phone size. Fonts are built in; they work offline. |
| `art/luck/shots/` | Screenshots: `A-strip.png`, `B-strip.png`, `C-strip.png` (four steps each), `extras-strip.png` (mimic, the fourth-Fever niche, a half-brushed plaque), `board-played.png`, `board-phone.png`. |
| `art/luck/src/` | Sources and `build.py`. |

In each mock: the red button plays the next step. **Next:** forces a result so you can see a relic, a mimic or nothing on demand. The top-right button swaps to the fourth-Fever version. **Again** resets. Sound is rough placeholder tones. The mocks use the look you chose for the HUD: oak frame, clipboard sheet, pencil figures, finds tags, finds-tray buttons.

**Checked:** all three load and play through with no console errors in headless Chrome at 390×844, in sarcophagus and fourth-Fever modes, for relic, mimic and nothing. The drag on B was tested with a simulated finger. **Not checked:** a real phone, real sound, VoiceOver.

---

# Part 2. The seal rule

## Why the obvious fixes fail

We ran the team's simulator on a copy (`art/luck/sim/`). One fact explains everything. Fame multiplies, so a stack of 12 finds is not worth four times a stack of 3. In the sim it is worth about fourteen times as much (median chamber-3 seal: 1,813 for a player who holds, 132 for a player who seals at about 8 finds). Any rule that leaves "one seal can hold the whole wall" in place loses to that arithmetic.

We tested the ideas in the brief first. Tomb I, Stake 1, five classes, 500 runs a row.

| Rule tried | One-sentence version | Early sealer | Holds for one seal | Perfect hold (bot) | Policy built to play the rule | Verdict |
|---|---|---|---|---|---|---|
| Today (rc8) | | 40% | 90% | 99% | | The problem. |
| **Fame carries** | "Each seal's Fame multiplies the next seal in this chamber." | 74% | 92% | 99% | 43% | **Fails.** Three small sets multiplied together are still smaller than one big set. Tested again with the target doubled to 9,000: 30 / 69 / 95 / 29. |
| **Sealed finds stay on the scale** | "Every seal re-counts everything you have already sealed here." | 98% | 97% | 100% | 98% | **Half works.** It stops punishing early sealing: everyone lands in the same place. But it adds no decision and holding is still as good as anything. At a 9,000 target: 88 / 88 / 98 / 90. |
| **Rising seals** | "Beat your last seal and the new one pays double; do it twice and it pays triple." | 22% | 65% | 93% | 50% (77% for two classes) | **Fails, and can be gamed.** Seal one pebble, seal two pebbles, then hold for the tripled seal. That is a ritual, not a decision. (At a 9,000 target.) |

So the root has to be cut: one seal must not be able to hold the wall.

## The three candidates that do cut it

### Candidate 1. A finds tray holds six

**The rule on the wall:** *"A finds tray holds six: each seal takes six finds, and you choose which."*

- **What the best player does now.** Three trays, three picks. With nine finds showing, which six go together? A Greek Dynasty now, or hold two Greeks back for a bigger Greek tray later? Which tray gets the Fever and the Gold Dust? This is the Balatro question (which five cards) asked three times a chamber.
- **New players.** A bare tap on Seal takes the six most valuable finds, so nobody is stuck. Sealing early costs much less than today because the ceiling on one seal is so much lower.
- **Classes, relics, Fever, Memories.** Everything still works. Hoard needs 8 finds today, which a tray cannot hold; it becomes "a full tray" (6). Relics that count finds (Rhind Papyrus, Terracotta Warrior) need a look. The fourth seal still costs a Memory.
- **Sim result at a 3,000 target** (1,500 runs a row): early sealer 48%, holder who never chooses 59%, perfect-digging bot who never chooses 75%, **holder who chooses well 90%**, a player who seals trays early under Fever 78%.
- **Verdict.** New players land in the band. Choosing is worth 31 points. But a patient player who holds and then chooses well clears 90%, above your 75% line.

### Candidate 2. A tray of six, and room for nine (recommended)

**The rule on the wall:** *"A finds tray holds six, and the wall gives you room for nine loose finds: uncover a tenth and the oldest crumbles."*

- **What the best player does now.** The same three picks, with a clock on them. You cannot sit on the whole wall and choose at leisure. Once nine are showing, every strike that uncovers something pushes your oldest find out. So the question becomes "is this tray good enough to seal now, or do I dig for one more piece and lose the one I found first?"
- **New players.** The same safe default. The crumble is easy to see and teaches itself: a tenth find appears, the oldest one cracks and falls.
- **Sim result at a 3,000 target.** See the full table below. Early sealer 45%. Nobody above 70%.
- **Verdict.** Passes two of the three tests. Half-passes the third. Our pick.

### Candidate 3. Only six finds can lie uncovered

**The rule on the wall:** *"Only six finds can lie uncovered at once: uncover a seventh and the oldest crumbles."*

- **What the best player does now.** There is nothing to choose. Whatever six are showing are your tray. The only decision is when.
- **Sim result at a 2,400 target** (500 runs a row): early sealer 54%, holder 69%, perfect one-seal bot 29%, a player who seals on good sets 54%.
- **Verdict.** It kills one-seal play hardest of all. But it removes the pick, which is the interesting part, and losing finds this often will feel mean. Keep it in the drawer.

## The recommendation, with the evidence

**Ship Candidate 2.**

### Numbers to ship

| Setting | Today | Ship |
|---|---|---|
| Finds one seal can take | No limit | **6** |
| Which six | All uncovered | Default: the six highest Worth. The player can tap a find to swap it in or out before sealing. |
| Loose finds allowed | No limit | **9.** When a 10th is uncovered, the one uncovered longest ago is lost. If one strike uncovers several, the lowest Worth counts as oldest. |
| Hoard (×2 Fame) | 8 or more finds in a seal | **A full tray (6)** |
| Tomb I chamber targets | 300 / 400 / 4,500 | **300 / 400 / 3,000** (other tombs scale from this as they do today) |
| Payout cap (1.5× target) | On | **Off** |
| Fame cap (120) | On | **Off** |
| Free seals per chamber | 3, fourth costs a Memory | Unchanged |
| Timeline order rule | On | Unchanged |
| Knucklebone trigger | Seal of 2,500+ | Moot if it becomes an omen. If the wager stays, lower to about 900. |

### What we ran

Recommended rule, cap off, team's simulator, five classes, 300 runs a class, **1,500 runs per number**. The margin on each figure is about ±2.5 points.

Five kinds of player:
- **Early sealer** (the team's "human"): mis-taps, forgets ores, seals when the tray looks full. Never chooses; takes the default six.
- **Holder, no choosing:** same hands, waits for the red bar, taps Seal.
- **Hammer bot** (the team's "greedy"): hammer only, no mis-taps, seals at 85% crack. Never chooses. This was the 99% player.
- **Holder who chooses:** same hands as the first two, waits, then picks a good six. **This is the skilled player.**
- **Early spreader:** seals a tray as soon as it holds a decent set, to catch Fever each time.

| | Early sealer | Holder, no choosing | Hammer bot | Holder who chooses | Early spreader |
|---|---|---|---|---|---|
| **Tomb I, Stake 1** | **45%** | 63% | 35% | **70%** | 57% |
| Tomb I, Stake 3 | 36% | 53% | 44% | 60% | 37% |
| Tomb III, Stake 1 | 40% | 59% | 74% | 64% | 37% |
| Tomb V, Stake 1 | 25% | 28% | 28% | 32% | 12% |
| Tomb V, Stake 6 | 1% | 2% | 6% | 2% | 1% |

For comparison, today's rules on the same simulator (1,500 runs per number; they match the team's own figures):

| | Early sealer | Holds for one seal | Hammer bot |
|---|---|---|---|
| Tomb I, Stake 1 | 40% | 90% | 99% |
| Tomb I, Stake 3 | 30% | 74% | 97% |
| Tomb III, Stake 1 | 23% | 49% | 74% |
| Tomb V, Stake 1 | 23% | 48% | 82% |
| Tomb V, Stake 6 | 1% | 14% | 42% |

### Against your three tests

| Test | Result |
|---|---|
| Tomb I, Stake 1, ordinary player between 45% and 60% | **Pass, just.** 45.4%. It sits at the bottom of the band. A target of 2,900 would centre it; we did not run that. |
| No policy above about 75% on Tomb I | **Pass.** The best is 70%. The 99% bot drops to 35%. |
| Skilled play clearly beats hold-only | **Half pass. Be aware of this.** Choosing beats not choosing by 7 points (70% against 63%), and one seal can no longer clear chamber 3 at all (the 95th-percentile best seal is about 2,350 against a 3,000 target). But **waiting still beats sealing early.** The player we built to spread seals out lost to the patient one, 57% against 70%. The rule moves the skill from "when" to "which six". It does not make "when" interesting. |

We would rather tell you that than dress it up. Our spreader may simply be badly built; a person may find the timing we did not. But on the evidence, the three seals become three real picks, not three real timings.

### The brand-new player

We also ran the team's "novice": seals the moment anything is uncovered, gets two free collapses, quits after two collapses in a row. 1,500 runs each way (`sim/novice.out`).

| | Clears chamber 1 | Clears chamber 2 | Clears the tomb |
|---|---|---|---|
| Today | 36.5% | 10.8% | 0.0% |
| New rule | 36.5% | 10.8% | 0.0% |

The rule makes no difference to this player, in either direction. They never have more than six finds showing, so the tray never matters. So the new rule does not push cautious beginners down. It also does not rescue them: someone who seals every single find still cannot clear Tomb I, exactly as now. That is a teaching problem (the wall slips that say "hold your finds"), not something this rule fixes.

### Other things the numbers show

- **The cap can go.** With the cap off, the points that earn Gold rise by 7% for the early sealer and 14% for the skilled player. That is the whole overshoot. Today the hammer bot loses 21% of its points to the cap. Fame at the 95th percentile is 24 to 36, so the 120 Fame cap never bites either.
- **Big numbers get smaller.** A best seal is now about 700 to 900, with rare ones near 2,400. Today they run 3,000 to 10,000. If you miss the size, multiply every Worth and every target by the same number. It changes nothing but the digits. We suggest ×3, which puts chamber 3 at 9,000.
- **High Stakes are now too hard.** Tomb V at Stake 6 is 1 to 6% for everyone. The Stake target multipliers were tuned for one giant seal and must come down. We did not retune them.
- **Classes are uneven.** At Tomb I the Medium clears about 68% as an early sealer; the Brute and the Fence about 35%. The gap was there before but shows more now.
- **The rule does not bite in Tomb III for the hammer bot.** It clears 74% there, the same as today, against 35% in Tomb I. Ordinary players in Tomb III go up (23% to 40%). We did not find out why the bot is untouched there. Look at it before shipping.

### What we did not test

- **A person.** No human has played this rule. The pick is done in the sim by a simple helper (best of: highest Worth, each Dynasty, each Timeline run). A real player may pick better or worse.
- **The pick screen itself.** Tapping finds to choose six is new interface. It is the real cost of this rule.
- Tombs II, IV, VI and VII, and Stakes 2, 4 and 5.

### For the integrator

1. At seal time, build the tray: if six or fewer finds are uncovered, take them all. Otherwise take the six the player has marked, defaulting to the six highest Worth.
2. Score the tray exactly as a seal is scored today. Finds left out stay on the wall, uncovered and at risk.
3. Keep a running order of uncovering. When a strike leaves more than nine finds uncovered and unsealed, remove the oldest until nine remain. Play a crumble. Sarcophagi do not count toward the nine.
4. Hoard threshold 8 becomes 6. Tomb I chamber 3 target 4,500 becomes 3,000. Turn the 1.5× payout cap and the 120 Fame cap off.
5. Show "Tray 4/6" on the Seal button and "Loose 7/9" on the clipboard. Give the oldest loose find a visible crack when the count reaches nine.
6. Rerun `art/luck/sim/final.sh` after any number moves. The prototype lives in `art/luck/sim/sim.js` behind `rule: {kind:'tray', n:6, fifo:true, loose:9}`; with no rule set it behaves as the team's simulator did.

**Cost: L, a sprint.** The rule itself is small. The pick interface, the crumble, the tutorial line, the Stake retune and a round of real play are the sprint.

## Files

| Path | What |
|---|---|
| `art/luck/PROPOSAL.md` | This document |
| `art/luck/board.html`, `mock-A.html`, `mock-B.html`, `mock-C.html` | Playable mocks |
| `art/luck/shots/` | Screenshots |
| `art/luck/src/` | Mock sources and build script |
| `art/luck/sim/sim.js` | Copy of the team simulator with the candidate rules added |
| `art/luck/sim/final.sh`, `final.out` | The recommended rule's tables |
| `art/luck/sim/try1.out` to `try9.out`, `base.out` | Every exploratory run quoted above |
| `art/luck/sim/novice.sh`, `novice.out` | The new-player check |

## Sources read on 9 Nov 2026

- Apple, App Store Connect Help, "Age ratings values and definitions": developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions
- Australian Classification, gambling-like content FAQ and fact sheet: classification.gov.au
- PEGI, "What do the labels mean": pegi.info/what-do-the-labels-mean
- Ask About Games, "PEGI rating for gambling is now always 18"
- Game Developer, report on the Balatro PEGI appeal, 24 Feb 2025
- Google Play Console Help, content ratings (rating descriptions only; the questionnaire itself was not visible)
- Singapore IMDA, sample online games questionnaire (an older IARC-style form)