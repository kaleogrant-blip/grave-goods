# Ad buttons: what the Design seat adds to the game

The game file has **no ad buttons today**. The wrapper (`www/ads.js`, wired by `www/native.js`) already does everything behind them: it hides every ad button unless ads are on, handles the tap, plays the video, and grants the reward. The game only needs the buttons, one listener for two of the rewards, and nothing else. **The interstitial needs no UI at all** (it fires from the run summary by itself); see the last section.

Rules that never bend (Launch plan, "Business model"): rewarded ads are **always the player's choice**, never between chambers unprompted, never a gate, never a way to win something that cannot also be earned for free. Odds stay printed.

## 1. The button

Any element with the attribute `data-gg-ad` is an ad button. Use a real `<button type="button">`.

```html
<button type="button" class="adbtn" data-gg-ad="memory">Watch a short video · +1 Memory</button>
```

* `data-gg-ad` is one of `memory`, `seal`, `reroll`, `chestpick`.
* Do **not** add your own `onclick`. `ads.js` listens on the document (capture phase), calls `preventDefault()`, and runs the offer. If you also handle the click, the video may play twice.
* Visibility is automatic: the wrapper CSS is `body:not(.gg-ads) [data-gg-ad]{display:none!important}`. `body.gg-ads` is present only when ads are on **and** configured **and** the player has not bought Ad-free. So: write the markup always, never test for ads in the game, and design the card so it still looks right with the button absent (the common case for Ad-free players and for the web/artifact build).
* Label pattern: **"Watch a short video · <what you get>"**. Always the verb "Watch", always the reward, never "Free". Sentence case, no countdown, no urgency colours. The button is secondary: it must not outweigh the free choice next to it.
* Size and touch: 44 px minimum height, same width rules as the other card buttons. Add `aria-label` with the full sentence ("Watch a short video to get one extra Memory").
* After a tap the wrapper does not change the button. If the offer is refused or fails, nothing happens (no fill, closed early, run cap). Optional: listen for `gg:ad-reward` (below) to disable the button after a successful reward in the same card.

## 2. The four buttons

| `data-gg-ad` | Reward | Where it goes | Caps (remote config) | The game must |
|---|---|---|---|---|
| `memory` | **+1 Memory** (`run.lives`, never above 3) | The run-ending card for a collapse (`endChamber(false)` when the last Memory is gone, "no Memories left") and the Memory pip row in the chamber-cleared card when lives < 3. One per card. | `ads.memoryPerRun` per run (default 1) | Nothing. `ads.js` increments `run.lives` and repaints `#lives` itself. If the card shows a "run over" state, re-read `run.lives` after `gg:ad-reward` and offer **Continue** instead of **Finish**. |
| `seal` | **+1 free seal in the next chamber** (`state.xs`) | The chamber-cleared card (the "Pick a chest" card) and the Black Market card, as "Watch a short video · +1 free seal next chamber". | `ads.sealBonus` (default 1) | Nothing. `ads.js` banks it and adds it at the next `newChamber()`. Show the pending bonus in the HUD if you want (`GG_NATIVE.ads.pending().seal`). |
| `reroll` | **One free Black Market reroll** | Beside `#bmRe` ("Reroll · N ◆") in `showMarket`'s `bm-act` row. | cooldown only | Listen for `gg:ad-reward` with `detail.kind === 'reroll'` and run the same code `#bmRe` runs, **without** charging the price. `applied:false` in the detail means "you must apply it". |
| `chestpick` | **Re-pick the chest** (open a second chest after seeing the first) | The "Pick a chest" reveal card, shown after the first chest is opened and before **Next chamber**. | cooldown only | Listen for `gg:ad-reward` with `detail.kind === 'chestpick'`: re-enable the unopened chests for exactly one more pick. |

`reroll` and `chestpick` are the two the wrapper cannot finish alone: the Market and the chest card are closures inside the game.

```js
document.addEventListener('gg:ad-reward', function (e) {
  var d = e.detail;                        // { kind: 'memory'|'seal'|'reroll'|'chestpick', applied: boolean }
  if (d.kind === 'reroll' && !d.applied)    { /* inside showMarket's closure: do a free reroll, then paint() */ }
  if (d.kind === 'chestpick' && !d.applied) { /* re-enable the chests once */ }
});
```

Register the listener **where the closure lives** (inside `showMarket` and the chest card code) and remove it when the card closes, or it will fire on a card that is gone.

## 3. Per-kind switches and what is shown when

Every kind has its own remote flag, so any of them can be turned off without a release: `flags.adMemory`, `adSeal`, `adReroll`, `adChestPick`. Master: `flags.ads`. Cooldown between any two offers: `ads.cooldownSec` (30 s shipped). The Design seat does not need to know any of it; a hidden button is a hidden button.

## 4. The interstitial (no UI work)

One interstitial, run by `ads.js` from the `run_end` event that `showSummary()` already emits:

* only on the **run summary** screen: never mid-tomb, never between chambers;
* never before the first tomb clear of a profile, and never on the run that makes that clear;
* at most once per `ads.interstitialEvery` finished runs (shipped 2) and never within `ads.interstitialMinGapSec` (shipped 180 s) of the previous one;
* off with `flags.adInterstitial = false` (remote) or the Ad-free purchase.

The summary card must therefore be **safe to cover**: it is a read-only card plus a few buttons, the ad appears over it about a second after it renders, and the player returns to the same card. Nothing on it may depend on a timer or an animation that runs while the ad is up.

## 5. Ad-free owners

Players who bought **Ad-free** have `body.gg-ads` removed for good, so all four buttons vanish and the interstitial never runs. Do not add a "you are ad-free" message to the game; Settings > Purchases says so.

## 6. Checklist for the Design seat

1. Four buttons with the markup above in the five places in the table.
2. Two listeners (`reroll`, `chestpick`) in the Market and the chest card.
3. Screenshots with the buttons **present** and **absent**.
4. A test in the game's own suite: with `document.body.classList.add('gg-ads')` the buttons are visible and 44 px tall; without it they are `display:none`.
5. Tell the Platform seat the final labels so they go into the App Store screenshots and the review notes (`store/review-notes.md`).
