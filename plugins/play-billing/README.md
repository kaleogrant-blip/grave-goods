# capacitor-play-billing

Local Capacitor 7 plugin over Google Play Billing Library 8 (Kotlin), one-time products only. Same JS contract as `plugins/storekit`
(`products`, `purchase`, `restore`, `entitlements`, event `transactionUpdate`); JS name `PlayBilling`. `www/payments.js` picks whichever of the two exists.

- `purchase` launches the Play sheet and acknowledges a PURCHASED purchase (unacknowledged purchases are refunded by Google after 3 days).
- `entitlements` / `restore` are `queryPurchasesAsync(INAPP)`; a refunded purchase is simply absent, so the cache heals on the next launch.
- A purchase that did not start in `purchase()` (a pending one that cleared, a Play promo code redeemed in the Play Store app) comes through `onPurchasesUpdated` and is forwarded as `transactionUpdate`.
- Billing Library 8.0.0 is pinned in `android/build.gradle`; Google requires 8+ for new apps and updates from 31 Aug 2026. Bump to the newest 8.x at build time.

Never compiled. First things to check when `android-internal` first runs: the `QueryProductDetailsResult` callback shape (8.x), `enableAutoServiceReconnection()`, and the Kotlin/Java 21 settings (copied from the AdMob plugin).
