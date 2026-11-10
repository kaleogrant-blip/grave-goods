# Reward slips: what the game draws and what the wrapper does

**v1 has two slips and no other advertising.** Both are opt-in rewarded videos. There is no interstitial, no banner, nothing between runs, and no tracking prompt (owner ruling 1; `www/ads.js`, `tests/ads.test.mjs`, `tests/real-game-ads.test.mjs`).

The wrapper (`www/ads.js`, wired by `www/native.js`) does everything behind the buttons: it hides them unless offers are on, handles the tap, plays the video, grants the reward, and remembers the caps across a relaunch. The game only draws the buttons.

Rules that never bend: a video is **always the player's choice**, never between chambers unprompted, never a gate, never offered on the practice wall, never a way to win something that cannot also be earned for free.

## 1. The button

Any element with the attribute `data-gg-ad` is a slip. Use a real `<button type="button">`.

```html
<button type="button" class="adslip" data-gg-ad="memory" aria-label="Watch a short video to get one extra Memory">
  <span class="as-t"><i>Sponsor's slip</i><b>Watch a short video · +1 Memory</b></span>
</button>
```

* `data-gg-ad` is `memory` or `seal`. Nothing else.
* Visibility is automatic: the wrapper CSS is `body:not(.gg-ads) [data-gg-ad]{display:none!important}`. `body.gg-ads` is present only when offers are on. Write the markup always, never test for ads in the game, and design the card so it still looks right with the slip absent (the common case: TestFlight builds, the web build, any time the remote flag is off).
* Label pattern: **"Watch a short video · <what you get>"** inside `.as-t b`, and an `aria-label` that starts **"Watch a short video to "**. The wrapper relies on those two patterns to relabel the slip for Ad-free owners (section 4). Keep them, or tell the Platform seat.
* 44 px minimum height. The slip is secondary: it must not outweigh the free choice next to it.
* The game calls `GG_NATIVE.ads.offer(kind)` itself (so it can show a toast) and stops the click; if it does not, `ads.js` handles the click. Either way one tap is one offer.

## 2. The two slips

| `data-gg-ad` | Reward | Where the game draws it (rc8) | Cap | Survives a relaunch |
|---|---|---|---|---|
| `memory` | **+1 Memory** (`run.lives`, never above 3) | The card after a wall collapses | `ads.memoryPerRun` per run (shipped 1), keyed by `run.tid` | Yes: the count is in Preferences, so a relaunch does not give a second one. If the app closes after the Memory is granted but before the game's next autosave, the Memory is given back on resume. |
| `seal` | **+1 free seal in the next chamber** (`state.xs`) | The chamber-cleared card | `ads.sealBonus` banked at a time (shipped 1) | Yes: a banked seal is in Preferences and lands in the next chamber the game builds for that run, including after a relaunch. Once it has landed, the same chamber rebuilt (a collapse, a resume) keeps it, the same way the game's own Market seal works. |

`GG_NATIVE.ads.canOffer(kind)` returns `''` when a tap would be served, otherwise why not: `off`, `not_ready` (caps still loading, first moments after launch), `training`, `cooldown`, `run_cap`, `full`, `unknown_kind`. Hide the slip for anything except `cooldown`. `GG_NATIVE.ads.pending()` gives `{ seal, memory, run, adFree }`.

After a reward the wrapper fires `gg:ad-reward` with `{ kind: 'memory', applied: true }` for the Memory (it has already changed `run.lives` and repainted `#lives`). The seal fires nothing; it is simply there in the next chamber.

## 3. Retired slips: `reroll` and `chestpick`

The Market reroll and chest re-pick videos are cut from v1. The game sprint after rc8 removes their markup. The wrapper is written to work with a game build that still has them and with one that does not:

* wrapper CSS hides `[data-gg-ad="reroll"]` and `[data-gg-ad="chestpick"]` always;
* `canOffer('reroll')` / `offer('chestpick')` return `unknown_kind`, never touch AdMob and never fire `gg:ad-reward`, so the game's old listeners simply never run;
* there are no `adReroll` / `adChestPick` flags any more; a remote config that carries them is rejected.

The game team can delete `adSlip('reroll')`, `adSlip('chestpick')`, `adChestHook`, `adChestReady` and the two `AD_LBL` entries whenever convenient.

## 4. Ad-free owners

Players who bought **Ad-free** keep both slips. For them a tap is a **free claim**: same reward, same caps, no video, AdMob never started. The wrapper adds `body.gg-adfree` and rewrites the slip's words as the game draws it (the game file is not edited):

| Game text | Owner sees |
|---|---|
| `Watch a short video · +1 Memory` | `Claim · +1 Memory` |
| `Sponsor's slip` | `Ad-free: no video` |
| aria-label `Watch a short video to get one extra Memory` | `Ad-free claim, no video: get one extra Memory` |

A cleaner version later: the game reads `GG_NATIVE.ads.pending().adFree` and writes the right words itself; then the relabelling in `www/adfree.js` can go. The game's failure toasts ("No video is ready right now") cannot appear for an owner, because a claim cannot fail to load.

If offers are switched off for everyone (`flags.ads` false) the claims are off too, and Settings does not offer Ad-free for sale.

## 5. Switches

| Key | Shipped | Meaning |
|---|---|---|
| `flags.ads` | **false** | Master switch for both slips (videos and owner claims). TestFlight builds stay off until real AdMob ids exist. Turn on by remote config, or per build with `FLAGS_ADS_DEFAULT=true`. |
| `flags.adMemory`, `flags.adSeal` | true | One switch per slip |
| `ads.memoryPerRun` | 1 | Memory slips per run |
| `ads.sealBonus` | 1 | Seals banked at a time |
| `ads.cooldownSec` | 30 | Minimum gap between two videos (not applied to owner claims) |

There is nothing else to configure: no interstitial keys, no frequency caps, no tracking setting.

## 6. What happens when (so the store notes stay true)

| Moment | What the app does |
|---|---|
| App start | Nothing ad-related. AdMob is not initialised. |
| Practice wall | No slip can be served (`training`). The practice wall's "won" event is ignored. |
| A run ends (won, lost, abandoned) | Nothing. A real win records "first tomb cleared" (`gg_first_tomb_clear`); nothing uses it to show anything. |
| Player taps a slip (not an owner) | First time only: Google's consent form where Google requires one, then AdMob initialises. Then one rewarded video, requested non-personalised. Reward only if the video was watched. |
| Player taps a slip (owner) | The reward, at once. No Google code runs. |
| Never | Interstitial, banner, App Tracking Transparency prompt, reading the advertising identifier. |

## 7. Checklist for the game team

1. Two slips with the markup above (`memory` on the collapse card, `seal` on the chamber-cleared card). Remove the two retired ones when convenient.
2. Keep the label and aria-label patterns from section 1.
3. Screenshots with the slips **present**, **absent**, and as an **owner** ("Claim").
4. Tell the Platform seat if a slip moves to another card: `store/review-notes.md` names the cards.
