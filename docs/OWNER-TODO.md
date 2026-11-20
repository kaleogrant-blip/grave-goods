# Owner hand-off: what is left, and only you can do it

Written 20 Nov 2026 for the game as it stands in this repository: **Grave Goods v1.0-rc10a** inside the iPhone app shell.

This page is a checklist in the order to do it. Every step says where to click (or gives one block to paste), what you need to have ready, and how to tell it worked. You never have to edit code by hand. Where a step needs a file changed, it says "ask the developer seat", and that is a five-minute job for them.

**This repository is public.** Never put a password, a key, a `.p8` file or a personal email address in any file, issue or comment here. Secrets go in one place only: GitHub > Settings > Secrets and variables > Actions. A contact address belongs on the store page and the hosted privacy policy, and it should be a support address made for the game, not a personal one.

---

## Where things stand

### Finished and tested

"Tested" here means automated tests, run on a computer, with touchscreen taps in a headless browser. It does not mean a person or a phone.

- **The game, v1.0-rc10a.** The tray rule (a seal takes a tray of six, the wall holds nine loose finds, a tenth crumbles the oldest), the first-tomb seal guard, the bare-wall rule, the oracle-bone reading, the Daily, the upgrade from older saves. rc10a is rc10 plus four small fixes and no rule or balance change: the same seed gives the same walls and the same results as rc10 (60 walls and 360 simulated runs compared, none differ).
- **The four fixes in rc10a:** the play log no longer marks a dig you come back to as "interrupted"; the game now reports crumbles, tray choices, held seals and bare walls to the play statistics (only after a player says yes); the Stake cards and the bare-wall lines are written from the numbers, so changing those numbers from the server cannot make the text wrong; no video slip is drawn for a reward the Looter's Sack would ignore.
- **The app shell around it:** saving (with an iCloud copy), the one-time statistics question, the two optional video offers and their limits, the Ad-free purchase, remote config, haptics. All covered by the repository's test suite, which runs on every change (the "CI" check on GitHub).
- **The store text:** listing, review notes, privacy policy draft, six screenshots at iPhone size and six at Android size.

### Never run on a real device, or against Apple

Be clear-eyed about this list. None of it is known to be broken. None of it is known to work.

- **No person has played rc10 or rc10a.** Not in a browser, not on a phone. Every tester so far has been a script.
- **The app has never been built for iOS.** The GitHub workflows "ASC setup" and "iOS TestFlight" have never been run. The two Swift plugins (iCloud saving, the purchase) have never been compiled. The first run is their first real test, and a first-run failure is likely enough that you should expect one.
- **Nothing has been seen in the iPhone's own browser engine.** Layout, the notch and home-bar margins, scrolling and font rendering were checked in Chromium only.
- **Nothing has been heard or felt.** Sound and haptics are checked as "the game asked for it", not by ear or hand.
- **iCloud saving has never crossed two real devices.**
- **No video ad has ever played** (not even Google's sample ads), and **no purchase has ever been made** (not even a sandbox one).
- **VoiceOver and Dynamic Type** are untested. The store text does not claim them.
- **The remote config** has only been fetched from a test server.

That is what TestFlight with real people is for. See step 5.

---

## The steps, in order

Status words: **blocks TestFlight** (needed for the first test build), **blocks submission** (needed before App Review), **decision** (only your call), **later** (not v1).

### Step 1. Replace the App Store Connect key that was exposed (do this first)

An App Store Connect API key was exposed earlier. Treat it as public. Revoke it and make a new one before anything else.

1. Go to appstoreconnect.apple.com and sign in as the account holder.
2. Click **Users and Access**, then the **Integrations** tab, then **App Store Connect API**, then **Team Keys**.
3. Find the old key in the list. Click it (or hover its row) and choose **Revoke**. Confirm.
4. Click the blue **+**. Name: `GitHub`. Access: **Admin**. Click **Generate**. (App Manager is not enough: the build needs Admin to create the signing certificate.)
5. Copy the **Issuer ID** (above the table) and the new **Key ID**. Click **Download API Key**. Apple lets you download the `.p8` file once. Keep it somewhere private, not in this project's folder.
6. Open the `.p8` in Notepad, Select all, Copy. Paste it only into the GitHub secret box in step 2. Nowhere else: not a chat, not an email, not a file here.

**How to tell it worked:** the old key shows under "Revoked" (or is gone), and one active key named `GitHub` with Admin access is in the list.

### Step 2. The four GitHub secrets (blocks TestFlight)

| Secret name (exact) | What it is | Where it comes from |
|---|---|---|
| `APP_STORE_CONNECT_ISSUER_ID` | A long ID with dashes | Step 1.5 |
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | 10 characters | Step 1.5 (the new Key ID) |
| `APP_STORE_CONNECT_PRIVATE_KEY` | The whole text of the `.p8` file, BEGIN and END lines included | Step 1.6 |
| `APPLE_TEAM_ID` | 10 letters and digits | developer.apple.com/account > **Membership details** > Team ID |

1. Go to github.com/kaleogrant-blip/grave-goods and click **Settings** (far right of the top row).
2. Left sidebar: **Secrets and variables**, then **Actions**. Make sure the **Secrets** tab is selected.
3. For each of the four: if the name is already listed, click its pencil and paste the new value. If not, click **New repository secret**, type the name exactly, paste the value, click **Add secret**.
4. Because the key changed in step 1, the first three must all be replaced, even if they were set before.

**How to tell it worked:** the Secrets list shows all four names with today's date under "Updated". GitHub never shows a secret's value again; that is normal.

### Step 3. Register the app with Apple (blocks TestFlight)

Fixed names, used everywhere in this repository: bundle ID **`com.gravegoods.app`**, SKU **`gravegoods`**.

- The bundle ID cannot be changed once the app record exists. If you want a different one, say so before this step and ask the developer seat to change it (`capacitor.config.ts` `appId`, and `BUNDLE_ID` in `codemagic.yaml`, three places, only if Codemagic is ever used).
- The SKU is a private label only you see. `docs/TRACK-B.md` and the setup script suggest `gravegoods001`; either is fine. If you already created the app record, keep whatever you typed then.

1. On GitHub: **Actions** tab > **ASC setup** (left list) > **Run workflow** > leave both boxes unticked > green **Run workflow**.
2. Wait a minute, refresh, open the new run and read the **summary** at the top. It registers the bundle ID `com.gravegoods.app` with iCloud and In-App Purchase switched on.
3. On appstoreconnect.apple.com: **Apps** > blue **+** > **New App**. Platform **iOS**. Name `Grave Goods` (if taken: `Grave Goods: Relic Wall`). Language English (U.S.). Bundle ID: pick `Grave Goods - com.gravegoods.app`. SKU: `gravegoods`. User Access: **Full Access**. Click **Create**.
4. Back on GitHub, run **ASC setup** once more.

**How to tell it worked:** the second run's summary says "Found: Grave Goods". If it says "Apple refused the key", one of the three Apple secrets is wrong or the key is not Admin: redo steps 1 and 2. "Missing repository secrets" names the empty ones.

### Step 4. The first TestFlight build (blocks TestFlight)

1. On GitHub: **Actions** > **iOS TestFlight** > **Run workflow** > green **Run workflow**.
2. It stops in the first minute with a plain message if a secret is empty. Otherwise allow 20 to 40 minutes.
3. Open the run and read its summary. If it failed, the summary lists the likely causes in plain words, and `docs/TRACK-B.md` has a table "When a build fails". Send the summary to the developer seat. A failure on the very first run is not a surprise (see "Never run" above).

**How to tell it worked:** the summary says the build was sent to App Store Connect, and 10 to 30 minutes later the build appears under App Store Connect > Grave Goods > **TestFlight** as "Ready to Test" or "Ready to Submit".

Test builds have the video offers switched **off** and use Google's sample ads if they are ever switched on. That is on purpose.

### Step 5. Real people on TestFlight before anything is submitted (blocks submission)

**No exceptions: real testers play before App Review.** 20 to 50 people, two weeks, and one round of their fixes goes in before you submit. Do not submit a build only scripts have played.

1. Install the build on your own iPhone first: get the free **TestFlight** app, add yourself under App Store Connect > **Users and Access**, then TestFlight > **Internal Testing** > **+** group `Team`, add yourself and the build.
2. Play it. This is the first time anyone will have. Things to look at on purpose, because no test could: does it fit the screen top and bottom, do the sound and the buzz feel right, does a save survive closing the app, does a second device signed in to the same Apple account pick up the save.
3. For outside testers: TestFlight > **External Testing** > **+** group `External Testers`. Fill **Test Information** (description: first paragraph of `store/listing.md`; a feedback address; the privacy policy URL from step 7). Add people by email or switch on **Public Link** with a limit of 50. Add the build and click **Submit for Review** (Beta review, about a day, once per version).

**How to tell it worked:** testers appear as "Installed" in the group list, and after a day of play the crash figure in TestFlight is at or near zero. The target is 99.5% crash-free sessions.

If testers were ever given the older build (rc9b), read the note in step 9 about config addresses.

### Step 6. Decisions only you can make (decision)

None of these blocks a test build. All of them should be settled before submission.

| # | Decision | What is known |
|---|---|---|
| D1 | **Tomb VII's guardian line** (open question 6 from rc10). It now asks 15% less. It used to ask 60% less, which made the last tomb the easiest, and its slip lost the words "so few of them". Is the new line right for the fiction? | **Open. Yours to answer.** |
| D2 | **Ad-free price.** Placeholder is $2.99 (`config/products.json`). | It does not remove ads; it turns the two video bonuses into free claims. Price it as that. Tell the developer seat the number |
| D3 | **Tagline.** Proposed: "Things buried with the dead. Nobody asked the dead." | Yours to confirm or replace. Not "Finders keepers." on the store page (ruling 6) |
| D4 | **Australia at R18+.** Answering the age questionnaire honestly (simulated gambling: yes, infrequent) is expected to give 13+ on Apple's scale and R18+ in Australia. | Decide whether Australia stays in the availability list at R18+ |
| D5 | **Daily tomb range.** The Daily picks one tomb from a list for everyone that day. Today the list is all seven tombs, so a new player's Daily can be Tomb VII. | Keep all seven, or narrow it (for example to the first three)? It is one line in the game (`DAILY.tombs`); the game team changes it |
| D6 | **"+1 free seal" under the tray rule.** A seal is worth more now (it banks six finds, not the whole wall). Keep the video reward at one extra seal? | The dial is `ads.sealBonus` in remote config |
| D7 | iPhone only, or iPad too | Changes the screenshots and one project setting |
| D8 | Whether to mention cloud saves anywhere public | Only after a tester has seen a save cross two devices |
| D9 | When public posts go out | The "is out" post waits for a store link |

Already decided, recorded so nobody reopens them: the knucklebone wager stays, declared openly (10 Nov); the chest reveal is the oracle-bone reading, built in rc9b and unchanged since; the Daily is the same tomb, raider and kit for everyone (in the game from rc9a).

### Step 7. A website: support page, privacy policy, `app-ads.txt` (blocks submission)

You need one host that you control. It carries three things, and Apple and Google both read it.

> **`app-ads.txt` must be served from the root of the developer website named in the store listing.**
> AdMob reads the developer website from your App Store listing and looks for `https://<that host>/app-ads.txt`.
> - A GitHub Pages **project** site will **not** do: `https://kaleogrant-blip.github.io/grave-goods/` would put the file at `/grave-goods/app-ads.txt`, and the root `https://kaleogrant-blip.github.io/app-ads.txt` belongs to a different site (or does not exist).
> - A GitHub Pages **user or organisation** site **will** do: a repository named `<account>.github.io` is served at `https://<account>.github.io/`, so the file sits at the root.
> - A **custom domain** you control **will** do (pointed at any host, GitHub Pages included).

1. Choose the host (a custom domain, or a GitHub Pages user site). That address is `[WEBSITE URL]`.
2. Put up a support page with a way to reach you. Its address is `[SUPPORT URL]`.
3. Fill the blanks in `store/privacy-policy.md` (list below), publish the finished page on the same host. Its address is `[HOSTED URL OF privacy-policy.md]`. The contact address goes on the hosted page, never in this repository.
4. `app-ads.txt` comes in step 8.

Privacy policy blanks, all in `store/privacy-policy.md`:

| Blank | Note |
|---|---|
| `[EFFECTIVE DATE]` | |
| `[DEVELOPER NAME]` (twice) | |
| `[CONTACT EMAIL]` | A support address, on the hosted page only |
| `[POSTAL ADDRESS if required where you live]` | |
| `[US or EU]` | Which PostHog cloud; must match `POSTHOG_HOST` (step 9) |
| `[12 months]` and `[MATCH your PostHog retention setting]` | |
| `[CONFIRM in your PostHog project settings before publishing]` | IP capture off |
| `[CONFIG HOST]`, or delete that bullet (`[DELETE this bullet if you do not set CONFIG_URL]`) | Only if you use remote config |
| `[PLACEHOLDER]` | Not a blank: it is the word used in the instructions at the top of the file. Delete that comment block when done |

Have someone who can give legal advice read the finished policy. The statistics question and the UK are the parts to ask about.

**How to tell it worked:** paste this into PowerShell, one line at a time, after changing the three addresses on the first three lines. Each line prints as it goes; the last line is the verdict.

```powershell
$site = "https://YOUR-HOST"
$support = "https://YOUR-HOST/support"
$privacy = "https://YOUR-HOST/privacy"
$ok = 0
Write-Host "1 of 3: checking the website root..."; try { $r = Invoke-WebRequest -Uri $site -UseBasicParsing; Write-Host "   status $($r.StatusCode)"; if ($r.StatusCode -eq 200) { $ok++ } } catch { Write-Host "   FAILED: $($_.Exception.Message)" }
Write-Host "2 of 3: checking the support page..."; try { $r = Invoke-WebRequest -Uri $support -UseBasicParsing; Write-Host "   status $($r.StatusCode)"; if ($r.StatusCode -eq 200) { $ok++ } } catch { Write-Host "   FAILED: $($_.Exception.Message)" }
Write-Host "3 of 3: checking the privacy policy..."; try { $r = Invoke-WebRequest -Uri $privacy -UseBasicParsing; Write-Host "   status $($r.StatusCode)"; if ($r.StatusCode -eq 200) { $ok++ } } catch { Write-Host "   FAILED: $($_.Exception.Message)" }
Write-Host "RESULT: $ok of 3 pages answered. All three must answer (3 of 3) before submission."
```

### Step 8. AdMob (blocks submission; not needed for TestFlight)

Video offers stay **off** in every build until these exist. v1 is rewarded video only: create **no** interstitial unit and no banner unit.

1. admob.google.com: sign in, accept the terms, set country and payment details.
2. **Apps** > **Add app** > **iOS**. Copy the App ID (`ca-app-pub-XXXX~YYYY`). Save it as the GitHub secret `ADMOB_APP_ID_IOS` (same place as step 2). Left blank, the app uses Google's public test app id.
3. In that app: **Ad units** > **Add ad unit** > **Rewarded**. Name `Rewarded - bonus`. Copy the unit ID (`ca-app-pub-XXXX/ZZZZ`). Save it as the GitHub secret `ADMOB_REWARDED_ID_IOS`. It is the only ad unit the app uses.
4. **`app-ads.txt`:** AdMob > **Apps** > **app-ads.txt** > **Set up** gives you one line of text. Put it in a file named `app-ads.txt` at the root of the host from step 7. Verification can take days; until then ads may not fill.
5. AdMob > **Privacy & messaging**: set up the consent messages Google asks for (UK, US states). Do **not** create an "IDFA explainer" message. It would make the app show Apple's tracking prompt, which v1 does not do and the store notes say it does not do.
6. Never tap real ads on your own phone. Google can close the account for it.
7. Switch offers on for the build you submit: remote config `flags.ads: true` (step 9), or ask the developer seat for a build with `FLAGS_ADS_DEFAULT=true` and `ADMOB_TESTING=false`. The Ad-free row only shows while offers are on, and a reviewer needs to see it.

**How to tell it worked:** paste this, one line at a time, after changing the address on the first line.

```powershell
$u = "https://YOUR-HOST/app-ads.txt"
Write-Host "1 of 2: fetching $u ..."; $body = ""; try { $r = Invoke-WebRequest -Uri $u -UseBasicParsing; $body = [string]$r.Content; Write-Host "   status $($r.StatusCode), $($body.Length) characters" } catch { Write-Host "   FAILED: $($_.Exception.Message)" }
Write-Host "2 of 2: looking for Google's line..."; $found = $body -match "google\.com, *pub-"
Write-Host "RESULT: app-ads.txt found at the root with a Google line = $found (must be True)"
```

AdMob's own app-ads.txt page should also turn to "Authorized" within a few days.

### Step 9. Play statistics and remote config (optional; blank means the feature is off)

**Statistics (PostHog).** Without a key, no statistics exist and the first-launch question is not shown at all.

1. posthog.com: sign up, choose the **US** or **EU** cloud, make a project `Grave Goods`.
2. Project settings: copy the **Project API Key** (starts `phc_`) into the GitHub secret `POSTHOG_KEY`, and the host (`https://us.i.posthog.com` or the EU one) into `POSTHOG_HOST`.
3. In the same settings: switch **Discard client IP data** on, and set data retention to what the privacy policy says. These must match the policy blanks in step 7.

**How to tell it worked:** after the next TestFlight build, play one run having answered Yes to the question. Within a minute PostHog's **Activity** shows events such as `run_start` and `seal`. New in rc10a: `crumble`, `tray_pick`, `seal_held`, `bare_wall`.

**Remote config.** Needed to switch the video offers on, or change balance numbers, without a new build.

1. Put `config/config.json` on a public https address that sends the header `Access-Control-Allow-Origin: *` (a small public GitHub Pages repository does this; `docs/TRACK-B.md` Step 9 walks through it).
2. Save the address, without `https://` and without `/config.json`, as the GitHub secret `CONFIG_URL`.

**One config address serves one generation of the game.** The file must be the rc10 one (`"schema": 2`); rc10a uses the same file. The app refuses a file written for rc9b (`"schema": 1`, old targets) and plays on its built-in numbers, and an rc9b app refuses the new file the same way. So if testers are ever on both rc9b and rc10 or later at once, give each build its own address. Once everyone is on one build this stops mattering.

From rc10a the Stake cards ("Targets +5%") and the bare-wall lines ("once a chamber") are written from the numbers, so the Stake target multipliers and the number of free bare walls can now be changed from the server without the on-screen text going wrong. (This was open question 8; it is closed.)

**How to tell it worked:** paste this, one line at a time, after changing the address on the first line.

```powershell
$u = "https://YOUR-CONFIG-HOST/config.json"
Write-Host "1 of 2: fetching $u ..."; $cors = ""; $schema = 0; try { $r = Invoke-WebRequest -Uri $u -UseBasicParsing; $cors = [string]$r.Headers['Access-Control-Allow-Origin']; $schema = ($r.Content | ConvertFrom-Json).schema; Write-Host "   status $($r.StatusCode)" } catch { Write-Host "   FAILED: $($_.Exception.Message)" }
Write-Host "2 of 2: reading the answer..."; Write-Host "   CORS header: '$cors' (must be *)"; Write-Host "   schema: $schema (must be 2)"
Write-Host "RESULT: config is usable = $(($cors -eq '*') -and ($schema -eq 2)) (must be True)"
```

### Step 10. The Ad-free purchase (blocks submission)

1. App Store Connect > **Business**: accept the **Paid Apps** agreement and fill in the bank and tax forms. Without it the purchase never works, even in review. Approval can take a day or two.
2. Settle the price first (decision D2).
3. On GitHub: **Actions** > **ASC setup** > **Run workflow** with **products** ticked and **apply** unticked. Read the summary: it shows what it would create and changes nothing. If it looks right, run it again with **both** ticked.
4. By hand in App Store Connect: add a review screenshot to the purchase (the game's Settings > Purchases section) and attach the purchase to the first app version you submit.

**How to tell it worked:** App Store Connect > Grave Goods > **Monetization** > **In-App Purchases** lists `gg_adfree` as "Ready to Submit". On a TestFlight build with offers switched on, Settings > Purchases shows the Ad-free row with the price, and buying it (free in TestFlight) turns the two video slips into "Claim" buttons.

### Step 11. The store page (blocks submission)

Everything to paste is in `store/listing.md`. The blanks:

| Blank | File | Note |
|---|---|---|
| `[SUPPORT URL]` | `store/listing.md` | From step 7 |
| `[WEBSITE URL]` | `store/listing.md` | From step 7. Must be the host that serves `app-ads.txt` |
| `[HOSTED URL OF privacy-policy.md]` | `store/listing.md` | From step 7 |
| `[YEAR] [YOUR NAME OR COMPANY]` | `store/listing.md` (Copyright) | |
| Tagline | `store/listing.md` | Decision D3 |

Then, in App Store Connect:

1. **Screenshots:** upload the six files in `store/screenshots/`, in file-name order. They were made from rc10a by `scripts/store-shots.mjs`; the first frame is a dig, not the title screen. Look at each one before you upload it: you are the first person to judge them.
2. **Age rating:** run the questionnaire for real and answer simulated gambling "yes, infrequent" (the answers are in `store/listing.md`). Save a screenshot of the result. Then decision D4.
3. **Pricing and Availability:** untick the 27 EU countries (`docs/AVAILABILITY.md` has the list and the reason).
4. **App Privacy:** fill it from the tables in `store/listing.md` (Tracking: No).

**How to tell it worked:** the version page in App Store Connect shows no red "required" marks.

### Step 12. Review notes, then Submit (blocks submission)

`store/review-notes.md` holds the text for the App Review box. Fill these from the exact build you submit:

| Blank | Note |
|---|---|
| `[NAME]`, `[PHONE]`, `[CONTACT EMAIL]` | The App Review contact. Typed into App Store Connect only. Never committed here |
| `[ON / OFF]` and `[If test mode: these are Google's sample ads.]` | The state of the video offers in the build you submit |
| `[CHEST REVEAL: describe what the submitted build shows. Nothing is staked on it and the outcome is decided before it is shown.]` | Write it from the build you submit and from nothing else. rc10a shows the oracle-bone reading: three taps, the chances printed before the first, the result decided before the panel opens, no reels and no wheel. Only after this line is filled may public text mention the new reveal |

Before you press **Submit for Review**, all of these are true:

- Real testers have played a TestFlight build, and their fixes are in this one (step 5).
- Video offers are on in this build, with the real AdMob ids (step 8), so the reviewer can find the Ad-free row.
- The website, support page, privacy policy and `app-ads.txt` all answer (steps 7 and 8).
- The Paid Apps agreement is active and the purchase is attached to this version (step 10).
- Every decision in step 6 that touches the store page is made.

Expect one or two rejections. Common ones: privacy details missing, notes that do not match the build, a purchase the reviewer cannot find.

---

## 6a. Open questions from rc10

Kept as a record. The game team ended v1.0-rc10 with six questions (`work/sprint16/LOG.md`). You answered five on 20 Nov 2026 (`work/design/DECISIONS.md`); all five keep rc10 as built. One is still open, and it is decision D1 above.

| # | Question | Status |
|---|---|---|
| 1 | Relics count toward the nine loose finds and can crumble, with a loud warning. Keep? | **Decided 20 Nov: keep.** |
| 2 | The first-tomb seal guard is a hard rule (no seal under six finds, except in the red, at nine loose, or with no dirt left). Hard rule, or advice only? | **Decided 20 Nov: stays a hard rule.** |
| 3 | The Mystic clears 62% for a player who chooses and 3% for one who does not. Leave it as the expert class? | **Decided 20 Nov: stays the expert class, as it is.** |
| 4 | Old best scores are marked "old rule" and new bests start from zero. Or scale them by three? | **Decided 20 Nov: marked "old rule", new bests restart from zero.** |
| 5 | Brute and Fence are at 0 to 4% on Stake 6 for the best simulated player. Fine for the top rung? | **Decided 20 Nov: fine. "We want a challenge."** |
| 6 | Tomb VII's guardian now asks 15% less (it used to ask 60% less, which made the last tomb the easiest), and its slip lost the words "so few of them". Is the new line right for the fiction? | **Open. Yours to answer.** |

Two more came out of fitting the app around rc10: question 7 is decision D6 above, and question 8 (fixed text beside changeable numbers) was closed by rc10a.

## 7. Later: Android (not in v1)

Nothing here is needed now. Listed so it is not forgotten: Google Play developer account and app record; upload keystore (`ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`); `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`; `ADMOB_APP_ID_ANDROID`, `ADMOB_REWARDED_ID_ANDROID`; a decision on the `AD_ID` manifest permission (`store/play-listing.md`); the Play closed-test rule (12 testers, 14 days). Codemagic (`CERTIFICATE_PRIVATE_KEY`, the `gg_secrets` group) is only needed if you use the secondary CI.

## Where the longer versions live

- `docs/TRACK-B.md`: every screen of the Apple, GitHub, PostHog and AdMob steps in more detail, and "When a build fails".
- `store/listing.md`, `store/review-notes.md`, `store/privacy-policy.md`: the text to paste.
- `docs/AVAILABILITY.md`: the EU list. `docs/ADS-UI.md`: what the two video slips do.

Menu names on Apple's, GitHub's, PostHog's and Google's sites move around, and these steps were written without those screens in front of the writer. If a button is not where a step says, look for the same words nearby; the order of the steps will still be right.
