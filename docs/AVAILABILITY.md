# Where Grave Goods is sold: territories to tick

**Decision (owner, Nov 2026): the EU is left out at launch.** The owner is an individual and **not a trader** under the EU Digital Services Act (DSA), and does not want to publish a trader name, address and phone number on the EU storefronts. So the app is sold everywhere Apple offers it **except the 27 EU member states**. Revisit this when the app earns money in a business capacity (see "If you change your mind").

## What to do in App Store Connect

1. appstoreconnect.apple.com > Apps > Grave Goods > **Pricing and Availability** (left sidebar, under General) **(verify in the current UI)**.
2. Find **Availability** (App Availability) and click **Edit**.
3. Tick **every** country and region **except** the 27 below. The quickest way: click the select-all box at the top, then untick the 27 EU countries.
4. Leave **Make this app available in new countries and regions** off, or the EU will switch on by itself if Apple adds a member state, and so will any other new storefront you have not looked at. Turn it on later on purpose **(verify in the current UI)**.
5. **Save** (or Confirm). The page shows a count (Apple offers about 175 storefronts; the number moves).

The ASC setup workflow prints the exact live list (storefronts to tick, and the EU ones to leave out) in its job summary under "Where the app can be sold", read straight from Apple, so use that as the check-list if this page and Apple disagree.

## Leave these 27 UNTICKED (EU members)

| Country | Apple territory code | | Country | Apple territory code |
|---|---|---|---|---|
| Austria | AUT | | Latvia | LVA |
| Belgium | BEL | | Lithuania | LTU |
| Bulgaria | BGR | | Luxembourg | LUX |
| Croatia | HRV | | Malta | MLT |
| Cyprus | CYP | | Netherlands | NLD |
| Czechia | CZE | | Poland | POL |
| Denmark | DNK | | Portugal | PRT |
| Estonia | EST | | Romania | ROU |
| Finland | FIN | | Slovakia | SVK |
| France | FRA | | Slovenia | SVN |
| Germany | DEU | | Spain | ESP |
| Greece | GRC | | Sweden | SWE |
| Hungary | HUN | | | |
| Ireland | IRL | | | |
| Italy | ITA | | | |

That is 27. (The same list lives in `scripts/lib/territories.mjs`, with a test that counts it.)

## Easy to untick by mistake: these are NOT in the EU, so tick them

United Kingdom, Switzerland, Norway, Iceland, Liechtenstein, Albania, Bosnia and Herzegovina, Kosovo, Moldova, Montenegro, North Macedonia, Serbia, Ukraine, Belarus, Georgia, Armenia, Azerbaijan, Turkey, Russia (if Apple lists it for your account; sanctions rules may apply, owner's call), and everything outside Europe (United States, Canada, Mexico, all of Latin America, Asia-Pacific, the Middle East, Africa).

Also tick the overseas parts of EU countries only if Apple lists them as separate storefronts; if a storefront belongs to an EU member's territory and Apple lists it under the member, leave it off with the rest of that country **(verify in the current UI)**.

## What else this touches

- **In-app purchase availability.** `scripts/asc-products.mjs` makes `gg_adfree` available in all territories. That is harmless: a product in a storefront where the app is not sold is never shown. No change needed.
- **TestFlight** is not limited by this setting for testers outside the EU; testers inside the EU can still install a TestFlight build (TestFlight is separate from App Store availability), though Apple's DSA trader rules can affect external beta distribution **(verify in the current UI)**.
- **Google Play** has its own country list (Play Console > Release > Production > Countries/regions); `store/play-listing.md` does not exclude the EU yet. Decide separately; Play asks for trader status in the same way (Play Console > Settings > Developer account).

## If you change your mind (adding the EU later)

Apple requires you to state your **trader status** before the app can be available in the EU **(verify in the current UI: App Store Connect > Business, or the app's App Information page)**. Declaring "trader" publishes your name, address, phone and email on the app's EU product pages; "non-trader" is for people who are not acting in a business capacity. Make that call with an adviser if there is any doubt: the declaration is yours, and this repo does not decide it. Then come back to Pricing and Availability and tick the 27.
