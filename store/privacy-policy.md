<!--
OWNER: this is a draft, not legal advice. Before you publish it:
1. Replace every [PLACEHOLDER].
2. Host it at a public https address (GitHub Pages is fine) and put that address in App Store Connect and in the app's TestFlight test information.
3. Have it read once by someone who can give legal advice, especially if you expect players in the EU, UK or California.
4. If any answer below stops being true (new SDK, an account system, purchases), change the policy BEFORE the release that does it.
Delete this comment when done.
-->

# Grave Goods: Privacy Policy

Effective [EFFECTIVE DATE]. This policy covers the Grave Goods app for iPhone and iPad, made by [DEVELOPER NAME] ("we", "us").

## The short version

- There are no accounts. We never ask for your name, email, phone number or location.
- The app sends anonymous play statistics (what was dug up, sealed, bought) so we can balance the game. You can turn this off in the app.
- Your save is kept on your device and in your own iCloud. We cannot see it.
- The game shows ads (Google AdMob): optional videos you choose to watch, and an occasional short ad between runs. A one-time "Ad-free" purchase, handled by Apple or Google, removes them. We never see your payment details.

## What we collect

If "Play log" in Settings is on (it is on by default), the app sends small batches of anonymous game events to our analytics provider. An event is a short note such as "a seal was banked", with these kinds of details:

- what happened in the game: seals, collapses, relics found, Market and shop purchases (in-game Gold only), whether the Ad-free purchase was started or completed, gambles and their results, tutorial steps, settings changes, share-card saves, how long a run lasted, which tomb and chamber;
- the game's own settings for that moment: the random seed of the dig, the class and tool chosen, the app version;
- general facts: that the app is running on iOS or Android, the device's time-zone offset from UTC, and the app version;
- the game's own error messages, if something goes wrong.

We also create a random ID the first time you open the app. It is made by the app, it is not your Apple advertising ID or any other ID Apple gives us, and it is not linked to your name, your Apple ID or any account. It lets us see that 50 events came from one anonymous player rather than from 50 players.

We switch off IP-address storage in our analytics provider, so your IP address is not kept with these events **[CONFIRM in your PostHog project settings before publishing]**.

## What we do not collect

Your name, email address, phone number, contacts, photos, microphone or camera data, precise location (the ad provider may derive approximate location from your IP address; see Ads), health data, purchase history from Apple, or anything you type into other apps. The game has no chat and no user-generated content.

## Who handles the data

Anonymous play statistics are processed by PostHog ([US or EU] cloud) on our behalf. We use them to tune game balance and fix bugs. We do not sell them, and we do not use them to show you ads.

The app also loads two typefaces (Cinzel and Alegreya) from Google Fonts when it starts and you are online. As with any web font, that request lets Google see your IP address and the standard details of the request. We send Google nothing else. **[REMOVE this paragraph if the fonts are bundled into the app instead; see README, "Known gaps".]**

## How long we keep it

Play statistics are kept for up to [12 months] and then deleted **[MATCH your PostHog retention setting]**.

## Turning it off

Open the game, go to **Settings**, and switch **Play log** off. From that moment the app stops recording and stops sending, and it deletes any events not yet sent. The setting is remembered, including after a reinstall if you use iCloud. Because the data is anonymous and not tied to you, we cannot look up and delete events that were already sent before you switched it off; if you want to ask us anything, write to the address below.

## Cloud save and iCloud

On Android, progress is stored on the device and may be backed up by Android's own Auto Backup to your Google account; we cannot read it.

If you are signed in to iCloud, the app keeps a copy of your progress in your own iCloud key-value storage so that your progress follows your Apple ID to a new device. That copy belongs to your Apple account. We cannot read it. You can remove it by deleting the app's data in Settings > [your name] > iCloud > Manage Storage on your device, or by using **Reset profile** in the game.

## Ads

The game shows ads served by Google AdMob: optional rewarded videos (for example, "watch a short video for one extra Memory") and an occasional short ad on the screen after a finished run. If you buy "Ad-free" from the store, no ads are shown.

- AdMob may use your device's advertising identifier and collect ad-interaction and device information, under Google's policies (policies.google.com/privacy). On Android it may also derive approximate location from your IP address.
- On iPhone and iPad the app asks your permission once (Apple's App Tracking Transparency prompt, after your first completed tomb) before any advertising identifier is used. If you decline, ads can still appear but will not be personalised.
- Where the law requires it (for example the EU and UK), Google's consent form appears first and you can choose.
- Ad-free ownership is kept by Apple or Google. The app asks the store whether you own it and keeps a copy of the answer on your device only.

## Purchases

The only purchase is the optional "Ad-free" item. Apple or Google processes the payment; we receive no card or account details and do not see your purchase history. Ad-free can be restored from Settings > Restore purchases.

## Children

Grave Goods is not aimed at children under 13 and we do not knowingly collect personal information from them. The game contains no accounts or chat. The one purchase is processed by Apple or Google.

## Your rights

Depending on where you live (for example the EU, UK or California) you may have rights to access, correct or delete personal data, or to object to its use. Our play statistics are anonymous and not tied to you, so there is usually no personal data we hold to give you; if you believe there is, contact us and we will help.

## Changes

If we change how the app handles data we will update this page and the "Effective" date, and for anything that collects more than described here we will say so inside the app before it starts.

## Contact

[DEVELOPER NAME]
[CONTACT EMAIL]
[POSTAL ADDRESS if required where you live]
