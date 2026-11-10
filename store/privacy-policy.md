<!--
OWNER: this is a draft, not legal advice. Before you publish it:
1. Replace every [PLACEHOLDER] (the full list is in docs/OWNER-TODO.md).
2. Host it at a public https address on your developer website and put that address in App Store Connect and in the app's TestFlight test information.
3. Have it read once by someone who can give legal advice, especially if you expect players in the UK or California. (The app is not offered in the EU at launch; see docs/AVAILABILITY.md.)
4. If any answer below stops being true (new SDK, an account system, a tracking prompt, a different ad type), change the policy BEFORE the release that does it.
Delete this comment when done.
-->

# Grave Goods: Privacy Policy

Effective [EFFECTIVE DATE]. This policy covers the Grave Goods app, made by [DEVELOPER NAME] ("we", "us").

**Platforms.** The app is available for iPhone and iPad. An Android version is planned and is not available yet; where this policy mentions Android, it describes what that version is designed to do and will be confirmed here before it is released.

## The short version

- There are no accounts. We never ask for your name, email, phone number or location.
- The first time you open the app it asks one question: whether you want to share anonymous play statistics. Until you answer "Yes", the app sends us nothing and creates no identifier. You can change your answer at any time in Settings.
- Your save is kept on your device and, if you use iCloud, in your own iCloud. We cannot see it.
- The only ads are optional videos you choose to watch for a small in-game bonus (Google AdMob). Nothing plays unless you tap it. There are no ads between levels and no banners.
- The app does not track you. It never shows Apple's "Allow tracking?" prompt, does not use your device's advertising identifier, and asks for non-personalised ads only.
- A one-time "Ad-free" purchase, handled by Apple, gives you the video bonuses without the videos. We never see your payment details.

## The question on first launch

When the app first opens you see: **"Help improve the game: share anonymous play statistics?"** with two buttons, **No thanks** and **Yes**. Neither is pre-selected.

- If you have not answered yet, or you answer **No thanks**: nothing is sent, nothing is queued to be sent later, and no identifier is created or stored.
- If you answer **Yes**: from that moment the app creates a random identifier and starts sending the statistics described below. Nothing from before your answer is sent.
- You can change your answer in **Settings > Privacy > Share play statistics**. Switching it off stops the sending at once, deletes anything not yet sent, and deletes the random identifier from your device. If you later switch it on again you get a new, unrelated identifier.

This applies to everyone, in every country. A build of the app that has no analytics configured does not ask, because it cannot send anything.

## What we collect, if you say Yes

Small batches of anonymous game events go to our analytics provider. An event is a short note such as "a seal was banked", with these kinds of details:

- what happened in the game: seals, collapses, relics found, Market and shop purchases (in-game Gold only), whether a video offer was tapped and whether its bonus was given, whether the Ad-free purchase was started or completed, luck throws and their results, tutorial steps, settings changes, share-card saves, how long a run lasted, which tomb and chamber;
- the game's own settings for that moment: the random seed of the dig, the raider and tool chosen;
- general facts about the device and app: that the app is running on iOS (or, later, Android), **the device's time-zone offset from UTC** (for example "+1 hour"; not your location), the app version, and the version of the game's balance settings;
- the game's own error messages, if something goes wrong;
- a random identifier created by the app when you said Yes. It is not your Apple advertising identifier or any other identifier Apple gives us, and it is not linked to your name, your Apple ID or any account. It lets us see that 50 events came from one anonymous player rather than from 50 players.

We switch off IP-address storage and location lookup in our analytics provider, so your IP address is not kept with these events **[CONFIRM in your PostHog project settings before publishing]**.

Separately from all of that, the game has a setting called **Play log** (Settings). It controls a short log the game keeps **on your device**, which you can copy from Settings to paste into a bug report if you choose to. The app itself sends those events only as the statistics above, and only if you said Yes. Switching Play log off stops the log being written at all, which also means nothing can be sent.

## What we do not collect

Your name, email address, phone number, contacts, photos, microphone or camera data, precise location, health data, your advertising identifier, your purchase history from Apple, or anything you type into other apps. The game has no chat and no user-generated content.

## Who handles the data

Anonymous play statistics are processed by PostHog ([US or EU] cloud) on our behalf. We use them to tune game balance and fix bugs. We do not sell them, we do not share them with advertisers, and we do not use them to show you ads.

## Network requests the app makes

So that nothing here is a surprise, this is every kind of request the app can make:

- **Fonts: none.** The game's two typefaces (Cinzel and Alegreya) are packaged inside the app. The app does not contact Google Fonts or any other font service.
- **Play statistics**, to our analytics provider: only after you said Yes.
- **Game settings file:** [DELETE this bullet if you do not set CONFIG_URL] when the app starts and you are online it downloads one small settings file (difficulty numbers and on/off switches) from [CONFIG HOST]. This is an ordinary file download. It sends no identifier and nothing about you, though like any download the server sees your IP address. It happens whether or not you share play statistics, because the game needs it to work the same for everyone.
- **Ads:** only when you tap a video offer; see Ads below.
- **Apple:** purchases, restoring a purchase and iCloud are handled by Apple's own systems.

The game itself plays fully offline.

## How long we keep it

Play statistics are kept for up to [12 months] and then deleted **[MATCH your PostHog retention setting]**.

## Because the data is anonymous

Events already sent are not tied to you, so we cannot look up "your" events to show or delete them. If you still have the app installed with sharing on, we can delete events by the random identifier if you send it to us; otherwise write to the address below and we will help as far as we can.

## Cloud save and iCloud

If you are signed in to iCloud, the app is designed to keep a copy of your progress in your own iCloud key-value storage. That copy belongs to your Apple account. We cannot read it. You can remove it by deleting the app's data in Settings > [your name] > iCloud > Manage Storage on your device, or by using **Reset profile** in the game.

Android (planned): progress is designed to be stored on the device and may be backed up by Android's own Auto Backup to your Google account; we cannot read it.

## Ads

The only ads in the game are **optional rewarded videos** served by Google AdMob. They appear as a button on two of the game's cards ("Watch a short video" for one extra Memory, or for one extra seal in the next chamber). If you never tap one, no ad is ever requested and Google's ad software is never started.

- **No tracking.** The app never asks for Apple's App Tracking Transparency permission, so your device's advertising identifier is not available to us or to Google through this app. Videos are requested as non-personalised ads.
- When you do tap a video offer, Google's software collects what it needs to deliver and measure the ad: ad-interaction data, device and diagnostic information, and your IP address, from which it may estimate your general area. This is under Google's policies (policies.google.com/privacy; "How Google uses information from sites or apps that use our services" at policies.google.com/technologies/partner-sites).
- Where the law requires it (for example the UK and some US states), Google's consent form appears before your first video and you can choose.
- If you buy "Ad-free" you are never shown a video and Google's ad software is never started. The same bonuses become free.
- Ad-free ownership is kept by Apple. The app asks the store whether you own it and keeps a copy of the answer on your device only.

## Purchases

The only purchase is the optional "Ad-free" item. Apple processes the payment; we receive no card or account details and do not see your purchase history. Ad-free can be restored from Settings > Restore purchases. If you share play statistics, the app records that a purchase was started or completed (not who by, and not how it was paid for).

## Children

Grave Goods is not aimed at children under 13 and we do not knowingly collect personal information from them. The game contains no accounts or chat. The one purchase is processed by Apple.

## Your rights

Depending on where you live (for example the UK or California) you may have rights to access, correct or delete personal data, or to object to its use. Our play statistics are collected only with your agreement, are anonymous and are not tied to you, so there is usually no personal data we hold to give you; if you believe there is, contact us and we will help. You can withdraw your agreement at any time in Settings > Privacy.

## Changes

If we change how the app handles data we will update this page and the "Effective" date, and for anything that collects more than described here we will say so inside the app before it starts.

## Contact

[DEVELOPER NAME]
[CONTACT EMAIL]
[POSTAL ADDRESS if required where you live]
