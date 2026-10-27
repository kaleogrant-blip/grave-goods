# capacitor-storekit

Local Capacitor 7 plugin over StoreKit 2 (iOS 15+). Pattern copied from `plugins/icloud-kv`.
JS name: `StoreKit` (reached as `Capacitor.Plugins.StoreKit`; `www/payments.js` is the only caller).

| Method | Returns |
|---|---|
| `canMakePayments()` | `{ allowed }` |
| `products({ ids })` | `{ products: [{ id, displayName, description, displayPrice, price, currencyCode, type, isFamilyShareable }], invalid }` |
| `purchase({ id })` | `{ status: 'success' \| 'pending' \| 'cancelled', productId, transactionId?, originalTransactionId? }`. Verifies, then `Transaction.finish()`. |
| `restore()` | `{ productIds }`: `AppStore.sync()` then `Transaction.currentEntitlements` |
| `entitlements()` | `{ productIds }`: verified, not revoked. Called on every launch. |
| event `transactionUpdate` | `{ productId, transactionId, revoked }` from `Transaction.updates` (Ask to Buy, other devices, refunds) |

Rules the code follows: only `.verified` transactions are trusted; ownership is read from `currentEntitlements`, not from the purchase result; the `Transaction.updates` listener starts in `load()`.

Needs: nothing in the entitlements file. The App ID has In-App Purchase on by default. Test in Xcode with `ios/App/GraveGoods.storekit` (Debug scheme only) or with a sandbox tester on TestFlight.

Never compiled. Things worth checking first on a Mac: `p.priceFormatStyle.currencyCode` (iOS 15 spelling), `AppStore.canMakePayments`, and the Swift 5.5 `Task.detached` capture in `load()`.
