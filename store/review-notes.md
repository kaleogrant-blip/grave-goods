# App Review notes (paste into App Store Connect > App Review Information > Notes)

Fill the brackets, keep the rest. The "Remove ads" row only appears while ads are on (`flags.ads` true in the remote config), so the ads must be ON when Review looks. Update the sentence about ads to match the remote-config state on the day you submit.

```
Thank you for reviewing Grave Goods.

SIGN-IN: none. There are no accounts.

IN-APP PURCHASE: one non-consumable, "Ad-free" (product ID gg_adfree). It removes all advertising. It unlocks no gameplay, content or currency.
- To buy it: open the game, open Settings, scroll to the section headed "Purchases" and tap "Remove ads". The App Store payment sheet appears.
- To restore it: Settings, "Restore purchases" (the row directly under "Remove ads"). The row is visible before and after a purchase.
- After purchase the row reads "Ad-free · purchased" and no ads appear. Reinstalling and tapping Restore purchases brings it back.

ADVERTISING: Google AdMob.
- Rewarded video: optional buttons ("Watch a video for +1 Memory", "+1 Seal", a Market reroll and a chest re-pick). The player must tap them; nothing plays on its own.
- Interstitial: at most one, on the run-summary screen after a finished run; never in the first tomb of a new player, never twice within 3 minutes, and never more than once per two finished runs.
- App Tracking Transparency: the prompt appears once, after the player's first completed tomb. Declining it still allows non-personalised ads.
- Current state of ads in this build: [ON / OFF]. Test ads are not shown to reviewers; they see ordinary AdMob ads.

SIMULATED GAMBLING (age rating answer: Infrequent/Mild).
The game has three luck moments: an optional coin flip on a big seal (can be switched off in Settings), a three-reel reveal when a chest is opened (the outcome is decided before the reels spin), and a wheel after a full Fever streak. They are occasional events inside a dig-and-bank puzzle game. They use only Gold that the player earns by playing. Gold cannot be bought with real money, anywhere, and nothing won has real-world value. Odds are printed on screen beside each one. The only purchase in the app is the Ad-free item above.

ANALYTICS: anonymous play statistics (no name, email or account). They can be switched off in Settings > Play log.

CONTACT: [NAME], [PHONE], [EMAIL]
```

Checklist before pressing Submit for Review:
- The IAP `gg_adfree` shows "Ready to Submit" and is attached to this version (App Store Connect > the version > In-App Purchases and Subscriptions > add it). Apple reviews the first IAP together with the app; it must have a review screenshot (a picture of Settings with the Remove ads row) and a review note, both filled in by `scripts/asc-products.mjs` only as far as the API allows. The screenshot is done by hand.
- The Paid Apps agreement, banking and tax forms are Active (TRACK-B step 11).
- App Privacy labels updated for ads (`store/listing.md`).
- Answer "Yes" to the advertising identifier question and tick "Serve advertisements within the app".
