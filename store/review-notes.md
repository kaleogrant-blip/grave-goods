# App Review notes (paste into App Store Connect > App Review Information > Notes)

Fill the brackets, keep the rest. Every sentence below describes what the build does; if the build changes, change the sentence. The bracketed items are all in [`docs/OWNER-TODO.md`](../docs/OWNER-TODO.md).

**Before you paste:** the "Ad-free" purchase row and the two video offers only exist while rewarded videos are switched on (`flags.ads` true). TestFlight builds ship with them **off**. For App Review they must be **on** (remote config, or a build made with `FLAGS_ADS_DEFAULT=true` and real AdMob ids), otherwise the reviewer cannot find the purchase. Set the "Current state" line to match the day you submit.

```
Thank you for reviewing Grave Goods.

SIGN-IN: none. There are no accounts.

PROMPTS THE APP SHOWS, AND WHEN
1. First launch, before anything else: one question from the app itself, "Help improve the game: share anonymous play
   statistics?" with two equal buttons, "No thanks" and "Yes". Until it is answered the app sends nothing and creates no
   identifier. The choice can be changed later in Settings > Privacy > "Share play statistics".
2. Only if the player taps a video offer, only in regions where Google requires it, and only the first time: Google's
   consent form (User Messaging Platform), shown before that first video.
3. The App Store payment sheet, when the player taps the Ad-free button in Settings.
The app does NOT show the App Tracking Transparency prompt. It does not track and does not use the advertising identifier.

ADVERTISING: Google AdMob, rewarded video only.
- There are exactly two offers, each a button the player must tap: "Watch a short video · +1 Memory" (on the card shown
  after a wall collapses, at most once per run) and "Watch a short video · +1 free seal next chamber" (on the
  chamber-cleared card, one banked at a time).
- Nothing plays on its own. There is no interstitial, no banner, no ad between runs, and no ad during the practice wall.
- Videos are requested as non-personalised ads.
- To see one: start a run, let a wall collapse (keep digging until the crack bar is full), and tap the video button
  on the card that follows.
- Current state of video offers in this build: [ON / OFF]. [If test mode: these are Google's sample ads.]

IN-APP PURCHASE: one non-consumable, "Ad-free" (product ID gg_adfree).
- What it does: the two video offers above become free claims. The same buttons appear, labelled "Claim · +1 Memory" and
  "Claim · +1 free seal next chamber", and give the same bonus under the same limits without a video. Owners never see a
  video. It unlocks no levels, characters, currency or other content: the whole game is free for everyone.
- To buy it: open Settings (from the main menu or the pause menu), scroll to the section headed "Purchases" and tap the
  button "Ad-free · [price]". The App Store payment sheet appears.
- To restore it: Settings > Purchases > "Restore purchases" (the row directly under it). It is visible before and after a
  purchase.
- After purchase the row reads "Ad-free · purchased". Reinstalling and tapping Restore purchases brings it back.

SIMULATED GAMBLING (age rating answer: yes, Infrequent/Mild. We accept the rating that produces, including R18+ in Australia).
The game contains one simulated wager inside a dig-and-bank puzzle game:
- The knucklebone: after a large seal the player may choose to throw it, at most once per chamber. It stakes that seal's
  points (in-game score, not currency): a 32% face pays the seal three times over, the other faces take the seal back.
  The chance of each face is printed on the card. It can be switched off in Settings.
  It is a triple-or-nothing bet of points the player has just earned, and we describe it as that.
[CHEST REVEAL: describe what the submitted build shows. Nothing is staked on it and the outcome is decided before it is shown.]
No real money can be wagered. Gold (the in-game currency) is earned by playing and cannot be bought, anywhere. Nothing
won has real-world value. The chances are fixed in the app and can only change with an app update.

ANALYTICS: anonymous play statistics (no name, email or account), sent only if the player answered "Yes" to the
first-launch question. Off by default. Changeable in Settings > Privacy.

NETWORK: the game runs fully offline. Fonts are bundled in the app.

CONTACT: [NAME], [PHONE], [CONTACT EMAIL]
```

Checklist before pressing Submit for Review:
- **People have played it.** A TestFlight round with real testers has happened and its fixes are in this build (LAUNCH.md). Do not submit a build only bots have played.
- Fill the CHEST REVEAL line in the block above from the build you submit, and from nothing else. rc9b (the build in this repo, 13 Nov) shows an oracle-bone reading on sarcophagi and after the fourth full Fever: three taps, the chances printed before the first, the result decided and saved before the panel opens, no reels, no wheel, no staged near-miss. Older builds (rc9a and before) show a three-reel reveal and a wheel. If the build still has reels and a wheel, say so in that line; if it has the oracle-bone reading, describe that. Never describe the one the build does not have. The knucklebone stays as written (owner ruling).
- Rewarded videos are ON for the submitted build and the AdMob ids are the real ones (`docs/OWNER-TODO.md`), or the reviewer will not find the Ad-free row.
- The IAP `gg_adfree` shows "Ready to Submit" and is attached to this version (App Store Connect > the version > In-App Purchases and Subscriptions > add it). Apple reviews the first IAP together with the app; it must have a review screenshot (a picture of Settings with the Ad-free row) and a review note, both filled in by `scripts/asc-products.mjs` only as far as the API allows. The screenshot is done by hand.
- The Paid Apps agreement, banking and tax forms are Active (TRACK-B step 11).
- App Privacy labels match `store/listing.md` (Tracking: No; Table 1 and Table 2).
- Do **not** create an "IDFA explainer" message in AdMob > Privacy & messaging. It would make Google's SDK show Apple's tracking prompt, which these notes say the app never shows.
- The privacy policy is live at the URL in the listing and says the same things as these notes.
