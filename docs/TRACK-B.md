# Track B: what the owner does, from a browser and a phone

You do not need a Mac. GitHub's own Mac machines (free for public repositories) build the app and send it to TestFlight, and a GitHub workflow makes every call to Apple's API for you. Your part is clicking in web pages and typing four secrets into GitHub.

**Two parts.** **Part A** (next) is the whole path to a TestFlight build on GitHub Actions. **Part B** (Steps 0 to 13 below it) is the older, longer reference: the Apple website screens, PostHog, AdMob, the purchase, Android, gifts. Part B steps that only matter for Codemagic are marked **Codemagic only**: Codemagic (`codemagic.yaml`) is kept as a **secondary** alternative and is not needed.

**A note on accuracy.** This was written without access to Apple's, GitHub's, PostHog's or Google's current screens, and the workflows have never run against Apple. Menu names move around. Anything that may have changed since mid-2026 is marked **(verify in the current UI)**. If a button is not where it says, look for the same words nearby; the order of steps will still be right. The list of what is unverified is at the end of Part A.

Rough time: 30 to 60 minutes of clicking, then waiting on Apple (first processing) and on the build (20 to 40 minutes).

# Part A: GitHub Actions to TestFlight

The repository is public at github.com/kaleogrant-blip/grave-goods, so Actions minutes on macOS are free. **Public repo means public logs.** GitHub hides secret values in logs (they show as `***`), but never paste a secret into an issue, a comment or a commit. Workflows started by other people's pull requests never receive your secrets.

## The four secrets (exact names)

| Secret name | What it is | Where it comes from |
|---|---|---|
| `APP_STORE_CONNECT_ISSUER_ID` | a UUID, like `57246542-96fe-1a63-e053-0824d011072a` | A1 |
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | 10 characters, like `ABC123DEFG` | A1 |
| `APP_STORE_CONNECT_PRIVATE_KEY` | the full text of the `.p8` file, BEGIN and END lines included | A1 |
| `APPLE_TEAM_ID` | 10 letters and digits, like `ABCDE12345` | A2 (Team ID lookup) |

Optional secrets (leave unset to switch the feature off): `POSTHOG_KEY`, `POSTHOG_HOST`, `CONFIG_URL` (Steps 8 and 9 below). Android only: `ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` (Step 12), and the three `ADMOB_*_ANDROID` ids.

## A1. Make the App Store Connect API key (Admin role)

1. Go to appstoreconnect.apple.com and sign in as the account holder.
2. Click **Users and Access** (top bar), then the **Integrations** tab, then **App Store Connect API**, then **Team Keys** **(verify in the current UI)**. If this is your first key, click **Request Access** and accept the terms.
3. Click the blue **+**. Name: `GitHub`. Access: **Admin**. (App Manager is not enough: Xcode needs Admin to create the distribution certificate and signing profile in Apple's cloud.) Click **Generate**.
4. On the key's row: copy the **Issuer ID** (above the table) and the **Key ID**. Click **Download API Key** and save `AuthKey_XXXXXXXXXX.p8`. Apple lets you download it **once**; keep it safe.
5. Open the `.p8` in Notepad, Select all, Copy. That text is `APP_STORE_CONNECT_PRIVATE_KEY`.

## A2. Find your Team ID, then add the four secrets to GitHub

**Team ID lookup:** go to developer.apple.com/account and sign in. Click **Membership details** (in the left sidebar, or under the Account heading) **(verify in the current UI)**. The row **Team ID** is 10 characters of capitals and digits. Copy it.

**Add each secret:**
1. Go to github.com/kaleogrant-blip/grave-goods and click **Settings** (the tab on the far right of the repository's top row; you must be signed in as the owner).
2. In the left sidebar click **Secrets and variables**, then **Actions**.
3. Make sure the **Secrets** tab is selected (not Variables). Click **New repository secret**.
4. **Name:** type one of the four names exactly as in the table (capitals and underscores, no spaces). **Secret:** paste the value. Click **Add secret**.
5. Repeat for all four. A secret cannot be viewed again after saving, only replaced (click its pencil icon and paste again).

## A3. Run ASC setup (first time: it registers the bundle ID)

1. Click the **Actions** tab of the repository. In the left list click **ASC setup**.
2. Click the grey **Run workflow** button on the right, leave both tick-boxes **unticked**, and click the green **Run workflow**. Wait a few seconds, refresh, click the new run, click its job, and read the **summary** at the top of the run page.
3. What it does: registers the bundle ID `com.gravegoods.app` named "Grave Goods" with the iCloud capability (and In-App Purchase) if missing; tells you whether the app record exists; lists the storefronts to tick. It is safe to run any number of times.
4. A red failure with "Apple refused the key" means one of the three Apple secrets is wrong or the key is not Admin (A1). "Missing repository secrets" names which ones are empty.

## A4. Create the app record (App Store Connect website; Apple has no API for this)

Do this **after A3**: the Bundle ID drop-down only lists bundle IDs that already exist.

1. appstoreconnect.apple.com > **Apps** > the blue **+** > **New App**.
2. Platforms: **iOS**. Name: `Grave Goods` (if taken, `Grave Goods: Relic Wall`). Primary language: English (U.S.). Bundle ID: choose `Grave Goods - com.gravegoods.app`. SKU: `gravegoods001`. User Access: **Full Access**. Click **Create**.
3. Back on GitHub, run **ASC setup** again. The summary should now say "Found: Grave Goods".

## A5. The Ad-free purchase (optional now, needed before the App Store release)

Run **ASC setup** with **products** ticked and **apply** unticked: the summary shows what it would create (a dry run, nothing changes). If the plan looks right, run it again with **both** ticked. Apple's price list must contain the price in `config/products.json` (the summary says if not). The review screenshot and attaching the purchase to the first version are still by hand (Step 11). This needs the Paid Apps agreement signed (Step 11.1) to be useful in review, not to be created.

## A6. Tell Apple where the app is sold (EU decision)

App Store Connect > Grave Goods > **Pricing and Availability** > Availability > **Edit**: tick everything except the 27 EU countries. Exact list and reasoning: [`AVAILABILITY.md`](AVAILABILITY.md).

## A7. Run iOS TestFlight

1. **Actions** tab > **iOS TestFlight** > **Run workflow** > green **Run workflow**. (Later you can instead push a tag: `git tag ios-v1` then `git push origin ios-v1`.)
2. It stops in the first minute with a plain message if any of the four secrets is empty. Otherwise expect 20 to 40 minutes (limit 60). When it finishes, open the run and read the summary; the **Artifacts** section at the bottom holds the logs.
3. Success means "sent to App Store Connect". Apple then processes the build for 10 to 30 minutes; it appears under App Store Connect > Grave Goods > **TestFlight**. Continue at **Step 7** to invite testers. Every run uses a higher build number automatically (the run number); the version number comes from `package.json`.
4. If it fails, the summary lists likely causes in plain words; the table "When a build fails" near the end has more.

## Build versions (what the workflow does, for the record)

Xcode 26 or later is chosen automatically (Apple has required the iOS 26 SDK for uploads since 28 April 2026; the macOS 15 runner's default Xcode is older). Test ads only (`ADMOB_TESTING=true`), the purchase fake is off (`DEV=false`). Android: **Actions** > **Android internal** > **Run workflow**. With the four keystore secrets (Step 12) it makes a signed `.aab`; without them an unsigned debug `.apk`; either is under Artifacts.

## What is unverified (read this if a first run fails)

- **Nothing has run against Apple yet.** The `xcodebuild` flags come from Apple's `man xcodebuild` ("-allowProvisioningUpdates: allow xcodebuild to communicate with the Apple Developer website. For automatically signed targets, xcodebuild will create and update profiles, app IDs, and certificates"; "-authenticationKeyPath/-authenticationKeyID/-authenticationKeyIssuerID" authenticate with an App Store Connect API key). Apple forum reports show the combination works in CI but also that "no profile found" can occur at export; the first run is the real test.
- **The App Store Connect request bodies** in `scripts/asc-setup.mjs` and `scripts/asc-products.mjs` (bundle ID, iCloud capability settings, in-app purchase, price schedule) are written from the documentation and tested only against an in-memory fake.
- **`destination: upload`** may leave no `.ipa` behind, in which case the artifact step only warns.
- **Capacitor plugins** (the Swift iCloud and StoreKit plugins) have never been compiled; the first run is their first compile.

# Part B: reference steps

## Before you start

You need: your Apple Developer account (paid, active), a GitHub account (free), and the project folder on your Surface (only if you change the Bundle ID or edit files by hand; the build itself needs nothing on your PC). PostHog and GitHub Pages have free tiers that should cover a test group; check each price page **(verify in the current UI)**.

| Name | Pick | Where it is used |
|---|---|---|
| Bundle ID | `com.gravegoods.app` is a placeholder. Choose yours once (reverse of a domain you own is customary, e.g. `com.yourname.gravegoods`). It can never change after you create the App Store listing. | Step 1, Step 2, `capacitor.config.ts` (`appId`); `codemagic.yaml` (`BUNDLE_ID`) only if you use Codemagic |
| App name | Grave Goods (must be unique in the App Store; if taken, App Store Connect says so in Step 2, and you pick e.g. "Grave Goods: Relic Wall") | Step 2 |

If you change the Bundle ID from the placeholder, change it in those two files **before** Step 0's push (or push again afterwards). Use this one block (edit only `$new` on the first line):

```powershell
$new = "com.yourname.gravegoods"; $root = "C:\FULL\PATH\TO\grave-goods-app"
$n = 0
foreach ($f in @("$root\capacitor.config.ts", "$root\codemagic.yaml")) {
  $t = [System.IO.File]::ReadAllText($f)
  $c = ([regex]::Matches($t, "com\.gravegoods\.app")).Count
  [System.IO.File]::WriteAllText($f, $t.Replace("com.gravegoods.app", $new))
  Write-Host "$f : replaced $c"; $n += $c
}
Write-Host "TOTAL replacements: $n (expect 4: appId, and BUNDLE_ID in three workflows)"
```

If TOTAL is 0 the paths are wrong; nothing was changed. The same id is also the Android package name (the Play listing can never change it). The Android project keeps an internal `namespace` of `com.gravegoods.app`; that is fine and needs no edit.

## Step 0: the project is already on GitHub (done)

The repository is github.com/kaleogrant-blip/grave-goods (public) and is the source of truth. The text below is only for starting a fresh private copy; skip it.

1. In a browser go to github.com, click **+** (top right), **New repository**. Name `grave-goods-app`, choose **Private**, leave every checkbox empty, **Create repository**. Copy the repository URL it shows (ends in `.git`).
2. In PowerShell (needs Git for Windows installed; if `git --version` fails, install it from git-scm.com first):

```powershell
$root = "C:\FULL\PATH\TO\grave-goods-app"; $url = "https://github.com/YOURNAME/grave-goods-app.git"
Set-Location $root
Write-Host "1/4 init"; git init -b main
Write-Host "2/4 add";  git add -A
Write-Host "3/4 commit"; git commit -m "Grave Goods iOS shell"
Write-Host "4/4 push"; git remote add origin $url; git push -u origin main
Write-Host ("DONE. Files in the repo: " + (git ls-files | Measure-Object).Count)
```

GitHub asks you to sign in in a browser window the first time.

## Step 1: register the Bundle ID with iCloud turned on (Apple Developer website)

**The ASC setup workflow (A3) does this for you.** Use the hand steps below only if the workflow reports it could not.

The iCloud switch must be on **before** the first build. Without it Apple's signing profile lacks the permission the save-sync needs and the build fails with a message about `ubiquity-kvstore-identifier`.

1. Go to developer.apple.com/account and sign in.
2. Click **Certificates, Identifiers & Profiles** **(verify in the current UI)**, then **Identifiers**, then the blue **+**.
3. Choose **App IDs**, **Continue**, choose **App**, **Continue**.
4. Description: `Grave Goods`. Bundle ID: choose **Explicit** and type your Bundle ID from the table above.
5. In the **Capabilities** list tick **iCloud**. If a sub-choice appears, the key-value store needs no CloudKit container; leave CloudKit unticked unless the page insists **(verify in the current UI)**. Nothing else needs ticking now (add **In-App Purchase** later when you build the Remove Ads purchase).
6. **Continue**, then **Register**.

## Step 2: create the app record (App Store Connect)

1. Go to appstoreconnect.apple.com, **Apps**, the blue **+**, **New App**.
2. Platforms: **iOS**. Name: `Grave Goods`. Primary language: English (U.S.). Bundle ID: pick the one from Step 1 in the dropdown (if it is missing, wait a minute and refresh; if still missing, Step 1 did not save). SKU: any private label, e.g. `gravegoods001`. User Access: **Full Access**. **Create**.
3. Write down the numeric **Apple ID** of the app (App Information page, General Information). You do not need it for the build, but you will for support requests.

## Step 3: create the App Store Connect API key (this is how GitHub Actions signs in as you)

**Part A, step A1 is the current version of this step (role Admin).** The text below is the older version.

1. In App Store Connect click **Users and Access** (top bar), then the **Integrations** tab, then **App Store Connect API** **(verify in the current UI)**. Choose **Team Keys**.
2. If this is your first key, click **Request Access** and accept the terms; the page refreshes.
3. Click the blue **+** (Generate API Key). Name: `GitHub`. Access: **Admin** (App Manager cannot create the signing certificate and profile) **(verify in the current UI)**. **Generate**.
4. On the key's row:
   - Copy the **Issuer ID** (a UUID shown above the table) into a note. -> will become `APP_STORE_CONNECT_ISSUER_ID`.
   - Copy the **Key ID** (10 characters). -> `APP_STORE_CONNECT_KEY_IDENTIFIER`.
   - Click **Download API Key**. You get `AuthKey_XXXXXXXXXX.p8`. **Apple lets you download it exactly once.** Keep it somewhere safe. Its full text (including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines) -> `APP_STORE_CONNECT_PRIVATE_KEY`.

To put the key text on your clipboard for pasting (the file can be anywhere; edit the path):

```powershell
$p8 = "C:\FULL\PATH\TO\AuthKey_XXXXXXXXXX.p8"
if (Test-Path $p8) { Get-Content $p8 -Raw | Set-Clipboard; Write-Host "Copied $((Get-Content $p8).Count) lines to the clipboard" } else { Write-Host "File not found: $p8" }
```

## Step 4: make the certificate key (**Codemagic only**; GitHub Actions does not need it)

Codemagic creates your App Store signing certificate for you, using a private key that only you hold. Make it once:

```powershell
$k = "$env:USERPROFILE\Desktop\gg_cert_key"
Write-Host "making key..."
ssh-keygen -t rsa -b 2048 -m PEM -f $k -q -N '""'
if (Test-Path $k) { Get-Content $k -Raw | Set-Clipboard; Write-Host "OK: key file $k, $((Get-Content $k).Count) lines, copied to clipboard" } else { Write-Host "FAILED: no key file created (is OpenSSH Client installed? Settings > Apps > Optional features)" }
```

The text on the clipboard (starts `-----BEGIN RSA PRIVATE KEY-----`) -> `CERTIFICATE_PRIVATE_KEY`. Keep the file; if you lose it, make a new one and let Codemagic create a new certificate (Apple allows only a few distribution certificates per account).

## Step 5: Codemagic (**Codemagic only**, secondary alternative)

1. Go to codemagic.io, **Sign up** with GitHub. Allow access to the `grave-goods-app` repository only.
2. **Add application**, pick the repository, project type **Other** (the repo has a `codemagic.yaml`; Codemagic will use it) **(verify in the current UI)**.
3. Open the app, **Environment variables** tab (also called Variables and secrets) **(verify in the current UI)**. Create a group named exactly `gg_secrets` and add the rows in Step 6. Tick **Secure** on every one that says "secret".
4. Go to **Builds**, **Start new build**, branch `main`, workflow `Grave Goods iOS to TestFlight`, **Start**.
5. The first run takes 15 to 25 minutes. If it fails, open the red step; the usual causes are in "When a build fails" below.

## Step 6: every key, and the exact variable it goes in

**GitHub Actions:** the four required secrets are at the top of Part A. The optional ones in this table (`POSTHOG_*`, `CONFIG_URL`, `ADMOB_*`, the Android keystore rows) go in the same place: Settings > Secrets and variables > Actions > New repository secret, same names. `CERTIFICATE_PRIVATE_KEY` and `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` are **Codemagic only**. The workflows read `ADMOB_*_ANDROID`, `POSTHOG_*`, `CONFIG_URL` and the keystore rows; the iOS TestFlight workflow always uses Google's test ads and ignores the `_IOS` AdMob rows until a release workflow exists on GitHub.

For Codemagic, all go in the Codemagic group `gg_secrets`.

| Variable name | Value | Secret? | Comes from | Needed for |
|---|---|---|---|---|
| `APP_STORE_CONNECT_ISSUER_ID` | the Issuer ID | no | Step 3.4 | signing, upload |
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | the Key ID | no | Step 3.4 | signing, upload |
| `APP_STORE_CONNECT_PRIVATE_KEY` | full text of the `.p8` file | **yes** | Step 3.4 | signing, upload |
| `CERTIFICATE_PRIVATE_KEY` | full text of `gg_cert_key` | **yes** | Step 4 | creating the signing certificate |
| `POSTHOG_KEY` | project API key, starts `phc_` | no (it is public by design) | Step 8 | analytics (blank = no analytics at all) |
| `POSTHOG_HOST` | `https://us.i.posthog.com` or `https://eu.i.posthog.com` | no | Step 8 | analytics |
| `CONFIG_URL` | host and folder of your remote config, no `https://`, e.g. `yourname.github.io/gg-config` | no | Step 9 | remote balance config (blank = shipped values only) |
| `ADMOB_APP_ID_IOS` | `ca-app-pub-XXXX~YYYY` | no | Step 10 | ads (blank = Google's public test id) |
| `ADMOB_REWARDED_ID_IOS` | `ca-app-pub-XXXX/ZZZZ` | no | Step 10 | rewarded ads; required by `ios-release` |
| `ADMOB_INTERSTITIAL_ID_IOS` | `ca-app-pub-XXXX/WWWW` | no | Step 10 | between-run ad; required by `ios-release` |
| `ADMOB_APP_ID_ANDROID`, `ADMOB_REWARDED_ID_ANDROID`, `ADMOB_INTERSTITIAL_ID_ANDROID` | same shapes, from the Android app in AdMob | no | Step 10 | Android ads |
| `ANDROID_KEYSTORE_BASE64` | the upload keystore, base64 | **yes** | Step 12 | signing the AAB |
| `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` | from the keystore command | **yes** (password rows) | Step 12 | signing the AAB |
| `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` | full JSON of the service account key | **yes** | Step 12 | upload to Play |

`ADMOB_TESTING` is not a secret: the workflow files set it (`true` for TestFlight and Android internal); `codemagic.yaml` sets it `true` for TestFlight and Play internal builds and `false` for `ios-release`. `DEV` (the purchase fake) must stay `false`; the release workflow checks it.

The Bundle ID is not a secret and lives in `codemagic.yaml` (`BUNDLE_ID`), not in the group. For the first TestFlight build you can leave out everything from `ADMOB_` down (Google's public test ids are used).

## Step 7: invite testers (TestFlight)

Wait until the build shows under App Store Connect, your app, **TestFlight**, with status **Ready to Test** or **Ready to Submit** (10 to 30 minutes after Codemagic finishes). If it says **Missing Compliance**, the build number should still be usable: click **Manage**, answer "No" to encryption beyond HTTPS **(verify in the current UI)**; the app already declares `ITSAppUsesNonExemptEncryption = false` so this normally does not appear.

**Yourself and friends with an Apple Developer role (up to 100, no review, fastest):**
1. **Users and Access**, **+**, enter their name and Apple ID email, role **Customer Support** or **Developer** (least power that works) **(verify in the current UI)**, tick the app, **Invite**. They accept the email.
2. App Store Connect, your app, **TestFlight**, **Internal Testing**, **+** (create group), name `Team`, tick **Enable automatic distribution**, add the people, add the build.

**Your 20 to 50 outside testers (needs Beta App Review once per version, about a day):**
1. **TestFlight**, left sidebar **External Testing**, **+**, name the group `External Testers`.
2. Fill **Test Information**: beta app description (use the first paragraph of `store/listing.md`), feedback email, privacy policy URL (the hosted copy of `store/privacy-policy.md`), contact details. Sign-in is not needed (the app has no accounts).
3. Add testers by email, or switch on **Public Link** and send the link by message (set a tester limit, e.g. 50).
4. Add the build, **Submit for Review**. When approved the testers get the build automatically.
5. To have the build go to the external group automatically you would need to submit it for Beta App Review yourself in App Store Connect each version; the GitHub workflow only uploads (internal testers get it with no review). (Codemagic can automate this with `submit_to_testflight: true` in `codemagic.yaml`.)

**What testers do:** install the free **TestFlight** app from the App Store, open the invitation email or the public link on the iPhone, tap **Accept**, then **Install**.

## Step 8: PostHog (anonymous play data)

1. Go to posthog.com, sign up, choose the **US** or **EU** cloud (EU if most testers are in Europe).
2. Create a project named `Grave Goods`. Skip the "install" wizard.
3. **Project settings** (gear icon) **(verify in the current UI)**: copy **Project API Key** (starts `phc_`) -> `POSTHOG_KEY`. The host shown on that page (`https://us.i.posthog.com` or `https://eu.i.posthog.com`) -> `POSTHOG_HOST`.
4. In the same settings, switch **Discard client IP data** **on**, and set **data retention** to what the privacy policy says (12 months is the placeholder in the policy) **(verify in the current UI)**.
5. After the first TestFlight session, **Activity** (or **Events**) should show `run_start`, `seal` and so on within a minute. If nothing appears: check the key has no spaces or quotes in Codemagic, that you started a new build after adding it (the key is baked in at build time), and that the game's Settings switch "Play log" is on.

## Step 9: host the remote config (balance changes without an App Store release)

The file is `config/config.json`. It must be served over HTTPS from a place that sends the header `Access-Control-Allow-Origin: *` (the app's page origin is `capacitor://localhost`, which counts as another site).

Easiest: **GitHub Pages**.
1. A new public repository `gg-config` (public is required for free Pages; the file holds only game numbers).
2. Upload `config.json` (Add file, Upload files), commit.
3. **Settings**, **Pages**, Source: **Deploy from a branch**, branch `main`, folder `/ (root)`, **Save** **(verify in the current UI)**. After a minute the file is at `https://YOURNAME.github.io/gg-config/config.json`.
4. `CONFIG_URL` = `YOURNAME.github.io/gg-config` (no `https://`, no `/config.json`).
5. Check it from PowerShell (should print `access-control-allow-origin: *` and status 200):

```powershell
$u = "https://YOURNAME.github.io/gg-config/config.json"
$r = Invoke-WebRequest -Uri $u -Method Head -UseBasicParsing
Write-Host "status $($r.StatusCode); CORS header: $($r.Headers['Access-Control-Allow-Origin'])"
```

To change balance later: edit `config.json` on GitHub (pencil icon), raise `"version"` by 1, commit. The app picks it up the next time it starts. A mistake in the file (a misspelt key, a wrong type) makes the app ignore the whole file and keep its last good copy, so it cannot break the game; the cost is that your change does not apply. `README.md` lists what can be changed.

## Step 10: AdMob (iOS and Android)

Ads are ON in v1. TestFlight and Play internal builds use Google's sample ads whatever ids you set, so you can do this after the first test build. Required before `ios-release`.
1. admob.google.com, sign in, accept terms, set country and payment details **(verify in the current UI)**.
2. **Apps**, **Add app**, platform **iOS**. If the app is not live yet choose "No" for "listed on a supported app store" and link it later. Copy the **App ID** (`ca-app-pub-XXXX~YYYY`) -> `ADMOB_APP_ID_IOS`.
3. In that app, **Ad units**, **Add ad unit**:
   - **Rewarded**, name `Rewarded - bonus`, reward item `bonus`, amount 1. Copy the unit ID -> `ADMOB_REWARDED_ID_IOS`.
   - **Interstitial**, name `Interstitial - run summary`. Copy the unit ID -> `ADMOB_INTERSTITIAL_ID_IOS`.
4. Repeat steps 2 and 3 for platform **Android** (a separate AdMob app) -> the three `_ANDROID` variables.
5. Never tap real ads on your own device (Google can ban the account). TestFlight and Play internal builds use test ads automatically (`ADMOB_TESTING` is `true` there).
6. **app-ads.txt.** AdMob needs a file at `https://<your developer website>/app-ads.txt`. In AdMob: **Apps** > **app-ads.txt** > **Set up** gives the exact line (it looks like `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`) **(verify in the current UI)**. Put that one line in a file called `app-ads.txt` at the root of a domain you control (GitHub Pages on a custom domain works; a `github.io/project` path does not, it must be the root). Then set that same domain as the developer website: App Store Connect > the app > App Information > Marketing URL / support domain, and Play Console > Store settings > Website **(verify in the current UI)**. It can take days for AdMob to show "verified"; ads still serve meanwhile at lower fill.
7. In App Store Connect update **App Privacy** with the ads table in `store/listing.md` before submitting. In Play Console fill the Data safety form from `store/play-listing.md`.
8. Ads are already on in the shipped config. To switch the interstitial off remotely: `"flags": { "adInterstitial": false }`; to tune it: `"ads": { "interstitialEvery": 3, "interstitialMinGapSec": 240 }`; raise `"version"`. The tracking prompt appears once, after the player's first tomb clear. The game needs its ad buttons first: `docs/ADS-UI.md` (Design seat).

## Step 11: the Ad-free purchase (Apple)

1. App Store Connect > **Business** (older UI: Agreements, Tax, and Banking). Accept the **Paid Apps** agreement and fill in bank account and tax forms. Without this the purchase never works, even in review. Approval can take a day or two **(verify in the current UI)**.
2. Create the product. Either with the ASC setup workflow (A5: products ticked, dry run first, then apply) or by script (`node scripts/asc-products.mjs` shows what it would do, add `--apply` to do it). Or by hand: app > **Monetization** > **In-App Purchases** > **+** > Non-Consumable, Reference name `Ad-free`, Product ID `gg_adfree`, price (placeholder $2.99), display name `Ad-free`, description `Removes every ad, for good. The whole game is free either way.` **(verify in the current UI)**.
3. Add a **review screenshot** by hand (a screenshot of the game's Settings > Purchases section) and the review note from `config/products.json`.
4. Attach the product to the first app version you submit (version page > **In-App Purchases and Subscriptions** > **+**). The first IAP is only reviewed together with an app version.
5. Test: App Store Connect > Users and Access > **Sandbox** > create a Sandbox Apple Account. On the phone: Settings > Developer > Sandbox Apple Account. In a TestFlight build, tap Settings > Remove ads. TestFlight purchases are free.
6. Release: `ios-release` workflow submits with `release_notes.json`. Fill the review notes from `store/review-notes.md`.

## Step 12: Android (Play Console, keystore, service account)

1. play.google.com/console, sign up as a developer, one-off **$25** fee, identity verification (can take days) **(verify in the current UI)**.
2. **Create app**: name Grave Goods, Game, Free. Complete the checklist using `store/play-listing.md` (graphics are in `store/play/`).
3. **Make the upload keystore** (PowerShell, run once; keep the file and passwords safe, losing them is recoverable with Play App Signing but painful):

```powershell
$dir = "C:\FULL\PATH\TO\keys"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Write-Host "Creating keystore in $dir ..."
keytool -genkeypair -v -keystore "$dir\gg-upload.keystore" -alias gg-upload -keyalg RSA -keysize 2048 -validity 10000
Write-Host "Encoding to base64 ..."
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("$dir\gg-upload.keystore"))
Set-Clipboard -Value $b64
Write-Host "Done. The base64 text is on your clipboard: paste it into ANDROID_KEYSTORE_BASE64."
```

   `keytool` comes with Java (install a JDK first if the command is not found). It asks for a password and your details. `KEY_ALIAS` = `gg-upload`; `KEYSTORE_PASSWORD` and `KEY_PASSWORD` are what you typed. Leave **Play App Signing** on (default): Google holds the real signing key and this is only the upload key.
4. **Service account** so Codemagic (or a future GitHub upload step) can upload: Google Cloud console > create a project > IAM > Service Accounts > Create > Keys > Add key > JSON (downloads a file). Enable the **Google Play Android Developer API** in that project. In Play Console > **Users and permissions** > Invite new users > the service account's email, permission **Release to testing tracks** (and Release apps to production later) **(verify in the current UI)**. Paste the whole JSON file into `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`.
5. **First upload by hand.** Run **Android internal** in the GitHub Actions tab (with the four keystore secrets added as repository secrets, same names as the table in Step 6), download the `.aab` from the run's Artifacts, and upload it in Play Console > Testing > Internal testing > Create release. After that you can keep uploading by hand (automatic upload to Play is a Codemagic feature; on GitHub it is not set up).
6. In-app product: Monetize > In-app products > Create product, ID `gg_adfree`, name Ad-free, price, **Activate**. Billing only works for an uploaded app, signed by Play.
7. Test: add yourself as a license tester (Settings > License testing) and install from the internal-testing link; purchases are free test purchases.
8. Play may ask new personal accounts to run a closed test (12 testers, 14 days) before production **(verify in the current UI)**.

## Step 13: gifts

See `docs/GIFTING.md`. Short version: Apple offer codes (App Store Connect > the product > Offer Codes) and Google Play promo codes (Monetize > Promotions). There is deliberately no code box in the game (App Review 3.1.1).

## When a build fails

**GitHub Actions** (the summary on the run page names the likely cause first):

| Message contains | Cause | Fix |
|---|---|---|
| `Missing repository secrets` | one of the four secrets is empty or misspelt | Part A, A2 |
| `Apple refused the key` / `Cloud signing permission` | key not Admin, or ID/Key/`.p8` from different keys | A1, make a new Admin key |
| `No Xcode 26` | runner image changed | tell the developer |
| `No profiles for` / `no profile found` | bundle ID not registered, wrong `APPLE_TEAM_ID`, or Xcode could not create the profile | run ASC setup; check A2 Team ID |
| `ubiquity-kvstore-identifier` | iCloud not on the bundle ID | run ASC setup, then re-run |
| `already been used` / `must be higher` | build number reused | run again (the number rises each run) |
| `Pod install` failure | plugin version drift | send the log to the developer |

**Codemagic** (secondary):

| Message contains | Cause | Fix |
|---|---|---|
| `ubiquity-kvstore-identifier` or "doesn't include the ... entitlement" | iCloud was not ticked on the App ID before profiles were created | Step 1, tick iCloud, then in Apple Developer **Profiles** delete the profile Codemagic made (named like `codemagic ...`), re-run the build |
| `No matching profiles` / `fetch-signing-files` exit 1 | wrong Bundle ID, or API key role too low | check `BUNDLE_ID` equals Step 1; make a new key with Admin |
| `Invalid private key` / `CERTIFICATE_PRIVATE_KEY` | key pasted without its BEGIN/END lines or with extra spaces | Step 4, paste again with **Secure** ticked |
| `copy patch "play-log-copy" matched 0 times` | the game's Settings text was reworded | tell the developer; the sentence in `scripts/build-www.mjs` needs updating |
| `build number ... has already been used` | a build with that number is already in App Store Connect | start a new build (Codemagic's counter goes up) |
| `Pod install` / `CocoaPods could not find compatible versions` | plugin version drift | send the log to the developer |
| `ADMOB_TESTING must be false` / `set the three AdMob iOS ids` | `ios-release` guard | fill the variables in `gg_secrets` (Step 10) |
| `ANDROID_KEYSTORE_BASE64 is empty` | variable missing or not base64 | Step 12.3 |
| Play upload: `Package not found` / `APK specifies a version code` | first upload not done by hand, or the version code was used | Step 12.5 |
| unit test step fails | a test caught a real problem | send the log to the developer; do not skip the step |
