# Google Play listing: Grave Goods

Copy-paste for Play Console. Limits are Google's. **(verify in the current UI)** where the form may have moved.

## Graphics

| Slot | File | Spec |
|---|---|---|
| App icon | [play/icon-512.png](play/icon-512.png) | 512x512 PNG, 32-bit RGB, under 1 MB. Google applies its own rounded mask |
| Feature graphic | [play/feature-graphic-1024x500.png](play/feature-graphic-1024x500.png) | 1024x500 PNG/JPEG, no transparency. Plain draft (icon + name + tagline); art team may replace it |
| Phone screenshots (2 to 8) | [play/screenshots/](play/screenshots/) 01 to 06 | 1080x2340 (19.5:9). Check Play Console's current aspect-ratio rule before upload: older guidance capped the long side at 2x the short side (2160 px for 1080), in which case use the 1398x2796 frames from git history or re-render. Each side 320 to 3840 px |
| 7-inch and 10-inch tablet screenshots | not made | Optional; needed only to be featured on tablets |

The screenshots and the feature graphic (drawn from the title scene) were captured from rc7b. Re-run the capture if the screens changed (see `store/listing.md`).

## Text

**App name** (30): `Grave Goods`
**Short description** (80): `Dig up relics, seal the good ones, and get out before the wall cracks.`
**Full description** (4000): use the description in `store/listing.md`, with two changes: replace "Your progress follows your Apple ID through iCloud." with "Your progress is saved on your device and backed up by Android Auto Backup."; and add before the last line: "Optional rewarded videos can give a small bonus. A one-time Ad-free purchase removes all ads."
**Category**: Game > Puzzle (or Strategy). **Tags**: roguelike, puzzle, strategy.
**Contact email** (required, public), **Website** (optional), **Privacy policy URL** (required): same hosted policy as iOS.
**App access**: no restricted parts (no login).
**Ads**: "Yes, my app contains ads".
**Content rating** (IARC questionnaire): no violence, no sexual content, no profanity, no real-money gambling. Answer the simulated gambling question "yes, simulated/social casino-style elements, no real money" and accept the rating that comes out. Target audience: 13 and over (not designed for children; this avoids the Families policy).
**In-app products**: `gg_adfree`, "Ad-free", Active, price set to match the iOS tier (placeholder $2.99). Created by hand: Play Console > Monetize > In-app products **(verify in the current UI)**.

## Data safety form

Answer from the facts below. Nothing is sold. Everything is encrypted in transit (HTTPS).

| Question | Answer |
|---|---|
| Does the app collect or share required user data types? | Yes |
| Is all data encrypted in transit? | Yes |
| Can users ask for data to be deleted? | Anonymous statistics cannot be tied to a person; players can switch collection off in Settings > Play log, and can request help at the contact email. Answer "Yes, users can request deletion" and describe that |
| Account creation | None |

| Data type | Collected | Shared | Purpose | Optional |
|---|---|---|---|---|
| Device or other IDs: advertising ID (AdMob) | Yes | Yes (with Google AdMob) | Advertising | Not optional while the app shows ads |
| Device or other IDs: app-generated random ID (PostHog) | Yes | No (service provider acting for us) | Analytics | Yes, Settings > Play log |
| App activity: in-app actions (seals, collapses, finds, settings) | Yes | No | Analytics | Yes |
| App info and performance: crash logs, diagnostics (game error events; AdMob also collects) | Yes | Yes (AdMob) | Analytics, app functionality | Partly |
| Approximate location (AdMob derives it from IP) | Yes | Yes | Advertising | No |
| Purchase history | Not collected by us. Google Play handles payment | | | |
| Personal info, financial info, health, messages, photos, contacts | No | | | |

Also declare: the app uses the **Advertising ID** permission (`com.google.android.gms.permission.AD_ID`, already in the manifest). In the Play Console "Advertising ID" declaration say it is used for advertising.

Re-check against Google's current AdMob data-disclosure page when you submit; Google updates its list.

## Release steps that need the Console

1. Create the app (Play Console > Create app), name, default language, Game, Free, accept policies.
2. Complete the dashboard checklist: privacy policy, ads declaration, app access, content rating, target audience, data safety, government-apps question.
3. **The first upload must be done by hand.** Play will not accept an API upload of a brand-new app's first AAB. Download the AAB from the Codemagic build, upload it in Testing > Internal testing > Create release, add testers, roll out. After that, `android-internal` uploads automatically.
4. Play requires for newly created personal accounts: a closed test with at least 12 testers for 14 days before production. Check the rule applies to your account type **(verify in the current UI)**.
