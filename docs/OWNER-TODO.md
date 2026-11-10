# Owner checklist: everything only you can fill in

One list. If a placeholder exists anywhere in this repo, it is here; `tests/docs.test.mjs` fails if a bracketed blank in `store/` is missing from this page.

**This repository is public.** Never put a secret, a password, a signing key or a personal email address in any file here. Secrets go in GitHub > Settings > Secrets and variables > Actions. A contact address belongs on the store page and the hosted privacy policy, not in the repo: use a dedicated support address, not a personal one.

Status key: **blocks TestFlight** (needed for the first test build), **blocks submission** (needed before App Review), **later** (not v1).

## 1. Apple: signing and the first build (blocks TestFlight)

| # | Item | Where it goes | Notes |
|---|---|---|---|
| 1.1 | `APP_STORE_CONNECT_ISSUER_ID` | GitHub repository secret | TRACK-B A1 |
| 1.2 | `APP_STORE_CONNECT_KEY_IDENTIFIER` | GitHub repository secret | TRACK-B A1 |
| 1.3 | `APP_STORE_CONNECT_PRIVATE_KEY` (the whole `.p8` text; key role Admin) | GitHub repository secret | TRACK-B A1. Never paste it anywhere else |
| 1.4 | `APPLE_TEAM_ID` | GitHub repository secret | TRACK-B A2 |
| 1.5 | Final Bundle ID (placeholder `com.gravegoods.app`) | `capacitor.config.ts` `appId` (and `BUNDLE_ID` in `codemagic.yaml`, three places, only if Codemagic is used) | Cannot be changed after the app record exists |
| 1.6 | App record in App Store Connect | App Store Connect website | TRACK-B A4 |
| 1.7 | TestFlight testers (emails, or a public link) | App Store Connect | **Real people must play before submission** (LAUNCH.md): 20 to 50 testers, two weeks |

## 2. AdMob (blocks submission; not needed for TestFlight)

Video offers are **off** in every build until these exist. v1 is rewarded video only: create **no** interstitial or banner unit.

| # | Item | Where it goes | Notes |
|---|---|---|---|
| 2.1 | AdMob account, payment details | admob.google.com | TRACK-B step 10 |
| 2.2 | `ADMOB_APP_ID_IOS` (`ca-app-pub-XXXX~YYYY`) | GitHub secret (or Codemagic `gg_secrets`) | Blank = Google's public test app id |
| 2.3 | `ADMOB_REWARDED_ID_IOS` (`ca-app-pub-XXXX/ZZZZ`) | GitHub secret (or Codemagic `gg_secrets`) | The only ad unit the app uses |
| 2.4 | **`app-ads.txt`** | A file at the **root** of your developer website | See the box below |
| 2.5 | Google's consent messages (UK, US states) in AdMob > Privacy & messaging | AdMob website | Do **not** create an "IDFA explainer" message: it would make the app show Apple's tracking prompt, which v1 does not do and the store notes say it does not do |
| 2.6 | Switch offers on for the build you submit | Remote config `flags.ads: true`, or build with `FLAGS_ADS_DEFAULT=true` and `ADMOB_TESTING=false` | The Ad-free row is only visible while offers are on; a reviewer needs to see it |

> **`app-ads.txt` must be served from the root of the developer website named in the store listing.**
> AdMob reads the developer website from your App Store listing and looks for `https://<that host>/app-ads.txt`.
> - A GitHub Pages **project** site will **not** do: `https://kaleogrant-blip.github.io/grave-goods/` would put the file at `/grave-goods/app-ads.txt`, and the root `https://kaleogrant-blip.github.io/app-ads.txt` belongs to a different site (or does not exist).
> - A GitHub Pages **user or organisation** site **will** do: a repository named `<account>.github.io` is served at `https://<account>.github.io/`, so the file sits at the root.
> - A **custom domain** you control **will** do (pointed at any host, GitHub Pages included).
>
> Whichever you choose, that same host is the `[WEBSITE URL]` in 3.2 and should carry the support page and the privacy policy too. The file's one line comes from AdMob > Apps > app-ads.txt > Set up. Verification can take days; until then ads may not fill.

## 3. Store listing blanks (blocks submission)

| # | Placeholder | File | Notes |
|---|---|---|---|
| 3.1 | `[SUPPORT URL]` | `store/listing.md` | A page with a way to reach you. Use a support address made for the game, not a personal one |
| 3.2 | `[WEBSITE URL]` | `store/listing.md` | The developer website. Must be the host that serves `app-ads.txt` (2.4) |
| 3.3 | `[HOSTED URL OF privacy-policy.md]` | `store/listing.md` | Public https page; see section 4 |
| 3.4 | `[YEAR] [YOUR NAME OR COMPANY]` | `store/listing.md` (Copyright) | |
| 3.5 | `[NAME]`, `[PHONE]`, `[CONTACT EMAIL]` | `store/review-notes.md` (App Review contact) | Typed into App Store Connect only. Do not commit them |
| 3.6 | `[ON / OFF]` and `[If test mode: these are Google's sample ads.]` | `store/review-notes.md` | State of the video offers in the build you submit |
| 3.7 | Tagline | `store/listing.md` | Proposed: "Things buried with the dead. Nobody asked the dead." Yours to confirm or replace (ruling 6: not "Finders keepers.") |
| 3.8 | Final price tier for Ad-free (placeholder $2.99) | `config/products.json`, App Store Connect | It now buys free claims of two small bonuses, not ad removal; price it as that |
| 3.9 | New screenshots, first frame not the title screen | `store/screenshots/` | Current frames are from older builds |
| 3.10 | Age-rating questionnaire, run for real | App Store Connect | Save the result as a screenshot. Simulated gambling answer and its consequences: `store/listing.md` |
| 3.11 | Paid Apps agreement, bank and tax forms | App Store Connect > Business | TRACK-B step 11. Without it the purchase never works |
| 3.12 | Untick the 27 EU countries | App Store Connect > Pricing and Availability | `docs/AVAILABILITY.md` |

## 4. Privacy policy blanks (blocks submission; the URL is wanted for TestFlight external testers too)

All in `store/privacy-policy.md`. Host the finished page on the developer website.

| # | Placeholder | Notes |
|---|---|---|
| 4.1 | `[EFFECTIVE DATE]` | |
| 4.2 | `[DEVELOPER NAME]` (twice) | |
| 4.3 | `[CONTACT EMAIL]` | A support address. Goes on the hosted page, never in this repo |
| 4.4 | `[POSTAL ADDRESS if required where you live]` | |
| 4.5 | `[US or EU]` | Which PostHog cloud; must match `POSTHOG_HOST` |
| 4.6 | `[12 months]` and `[MATCH your PostHog retention setting]` | |
| 4.7 | `[CONFIRM in your PostHog project settings before publishing]` | IP capture off |
| 4.8 | `[CONFIG HOST]`, or delete that bullet (`[DELETE this bullet if you do not set CONFIG_URL]`) | Only if you use remote config |
| 4.9 | `[PLACEHOLDER]` | Not a blank: it is the word used in the instructions at the top of the file. Delete that comment block when done |
| 4.10 | A read by someone who can give legal advice | The analytics question and the UK are the parts to ask about |

## 5. Analytics and remote config (optional; blank = feature off)

| # | Item | Where it goes | Notes |
|---|---|---|---|
| 5.1 | `POSTHOG_KEY` (`phc_...`) | GitHub secret | Blank = no statistics at all, and the first-launch question is not shown. It is a public write-only key, but keep it in secrets anyway |
| 5.2 | `POSTHOG_HOST` | GitHub secret | US or EU cloud |
| 5.3 | In PostHog: IP capture off, retention set | PostHog project settings | Must match 4.6 and 4.7 |
| 5.4 | `CONFIG_URL` and a public https place for `config/config.json` with CORS `*` | GitHub secret; your host | Needed to switch video offers on without a new build |

## 6. Decisions waiting on you

| # | Decision | Where it shows |
|---|---|---|
| 6.1 | Decided 10 Nov: the knucklebone wager stays; the chest reveal becomes an oracle-bone reading (no reels, no wheel). Not built yet | When it is in the build you submit, fill `[CHEST REVEAL: describe what the submitted build shows. Nothing is staked on it and the outcome is decided before it is shown.]` in `store/review-notes.md` from that build, and only then mention the new reveal in public text |
| 6.1a | Age rating: answer simulated gambling "yes, infrequent". Expect Apple 13+ and R18+ in Australia | Run the questionnaire, screenshot the result, and decide whether Australia stays in the availability list at R18+ |
| 6.2 | Confirm the game build you submit has the Daily fix (same tomb, raider and kit for everyone) | The listing says so; do not submit that line with an older game build |
| 6.3 | iPhone only, or iPad too | Screenshots, Xcode device families |
| 6.4 | Whether to mention cloud saves at all | Only after a tester has seen a save cross two devices |
| 6.5 | When public posts go out | `marketing/social/POSTS.md`: the "is out" post is held until a store link exists |

## 7. Later: Android (not in v1)

Nothing here is needed now. Listed so it is not forgotten: Google Play developer account and app record; upload keystore (`ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`); `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`; `ADMOB_APP_ID_ANDROID`, `ADMOB_REWARDED_ID_ANDROID`; a decision on the `AD_ID` manifest permission (`store/play-listing.md`); the Play closed-test rule (12 testers, 14 days). Codemagic (`CERTIFICATE_PRIVATE_KEY`, the `gg_secrets` group) is only needed if you use the secondary CI.
