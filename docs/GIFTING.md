# Giving the Ad-free purchase to friends, testers and press

Checked 22 Oct 2026. Click paths marked **(verify in the current UI)** may have moved.

## The rule: no code typed into the game

There is no "enter a friend code" box in the game and there will not be one. A code typed into the game that unlocks a paid feature is a way of getting an in-app purchase without going through the store, and Apple rejects that under App Review guideline 3.1.1. Google's payments policy says the same for Play. The stores have their own gift-code systems, and they are the only supported route. Both are below.

## iPhone and iPad: offer codes (these replaced IAP promo codes)

Apple retired the old in-app-purchase promo codes (100 per product per 6 months) on 26 March 2026. Their replacement is **offer codes**, and they work for non-consumables such as `gg_adfree`.

Limits:
- A free offer on `gg_adfree`. The player redeems it and owns the purchase for good.
- **One-time-use codes**: a batch of 500 to 25,000, expiry date required, at most 6 months out.
- **Custom code**: one word you choose (for example `GRAVEFRIENDS`), reusable up to a limit you set. This is the right tool for 20 friends: share one word and cap it at 25.
- The product must be approved and the app live (Ready for Distribution) before production codes work.
- Redeeming: the App Store app (Account > Redeem Gift Card or Code), a redemption link (`https://apps.apple.com/redeem?ctx=offercodes&id=<APP ID>&code=<CODE>`), or inside an app that calls Apple's redemption sheet (iOS 16.3+; the game does not, the link is enough).

Steps in the web UI (this is the path that is known to work) **(verify in the current UI)**:
1. App Store Connect > your app > **Monetization** (or **In-App Purchases**) > `gg_adfree`.
2. **Offer Codes** > **Create Offer**. Name it (for example `friends`), choose **Free**, pick countries.
3. Add codes: **One-Time Use Codes** (enter how many and the expiry), or **Custom Codes** (type the word, set the cap and expiry).
4. Download the code list (CSV) or copy the link. Send each person one code.

By script: `node scripts/asc-promo-codes.mjs --count 500 --expires 2027-03-31 --name friends` prints what it would do. Add `--apply` to do it. It needs the same App Store Connect key as `asc-products.mjs`. It is written from Apple's documented endpoint names, but the request bodies could not be checked from the build environment (marked VERIFY in the file). If Apple rejects a call, the script says so and you use the web steps above. The minimum batch is 500; for a handful of friends use a Custom code in the web UI.

## Android: Google Play promo codes

Google Play promo codes cover one-time (in-app) products. Allowance: 500 per quarter per app for in-app products (one-time use each).

1. Play Console > your app > **Monetize** > **Promotions** (or **Monetize with Play** > Promo codes) **(verify in the current UI)**.
2. **Create promo code** > type **In-app product** > choose `gg_adfree` (the product must be active).
3. Enter how many codes and an expiry, **Create**, download the CSV.
4. Redeem: Play Store app > profile > Payments & subscriptions > Redeem code, or the redemption link `https://play.google.com/redeem?code=<CODE>`.

Play offers Android codes only in the Play Store; they do not cross to iOS.

## Who gets what

| Person | Use |
|---|---|
| A few friends and family | Custom code (Apple) or Play promo codes. Note a Custom code can be forwarded, so cap it |
| Playtesters (TestFlight, Play internal) | They do not need codes. In TestFlight and the Play internal track purchases are sandbox/test purchases and cost nothing |
| Press and streamers | One-time-use batch, short expiry, send one code each |
| Anyone who asks for their money back | Apple: reportaproblem.apple.com. Google: Play order history. The game picks up the refund on the next launch and ads return |

## Reminder: gifts and ads

A redeemed code makes the purchase appear in the player's store account like any other. The game checks the store at launch, so ads switch off on the next start (or at the next entitlement refresh) with no extra work. The Settings row then reads "Ad-free · purchased".
