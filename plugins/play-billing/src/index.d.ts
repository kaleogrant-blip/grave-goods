export interface StoreProduct {
  id: string;
  displayName: string;
  description: string;
  /** localized, from StoreKit (e.g. "$2.99", "2,99 €"). Show this string, never one you built. */
  displayPrice: string;
  /** decimal as a string ("2.99") */
  price: string;
  currencyCode: string;
  type: 'consumable' | 'nonConsumable' | 'autoRenewable' | 'nonRenewable' | 'unknown';
  isFamilyShareable: boolean;
}
export interface PurchaseResult {
  status: 'success' | 'pending' | 'cancelled';
  productId: string;
  transactionId?: string;
  originalTransactionId?: string;
}
export interface PlayBillingPlugin {
  canMakePayments(): Promise<{ allowed: boolean }>;
  /** unknown ids come back in `invalid`, never as an error */
  products(opts: { ids: string[] }): Promise<{ products: StoreProduct[]; invalid: string[] }>;
  /** launches the Play purchase sheet; acknowledges a PURCHASED purchase (Play refunds it after 3 days otherwise) before resolving. Rejects only on a real failure (code in err.code). */
  purchase(opts: { id: string }): Promise<PurchaseResult>;
  /** Play has no sync call: this is a fresh queryPurchasesAsync, identical to entitlements() */
  restore(): Promise<{ productIds: string[] }>;
  /** queryPurchasesAsync(INAPP), state PURCHASED only. A refunded purchase is simply absent. */
  entitlements(): Promise<{ productIds: string[] }>;
  /** fires for transactions that finish outside a purchase() call (a pending purchase that cleared, a promo code redeemed in the Play Store app) */
  addListener(event: 'transactionUpdate', cb: (e: { productId: string; transactionId: string; revoked: boolean }) => void): Promise<{ remove(): Promise<void> }>;
}
export declare const PlayBilling: PlayBillingPlugin;
