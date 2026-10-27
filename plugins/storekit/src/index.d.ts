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
export interface StoreKitPlugin {
  canMakePayments(): Promise<{ allowed: boolean }>;
  /** unknown ids come back in `invalid`, never as an error */
  products(opts: { ids: string[] }): Promise<{ products: StoreProduct[]; invalid: string[] }>;
  /** verifies the transaction, calls Transaction.finish(), then resolves. Rejects only on a real failure (code in err.code). */
  purchase(opts: { id: string }): Promise<PurchaseResult>;
  /** AppStore.sync() (may show the Apple ID sheet), then the current entitlements */
  restore(): Promise<{ productIds: string[] }>;
  /** Transaction.currentEntitlements, verified and not revoked */
  entitlements(): Promise<{ productIds: string[] }>;
  /** fires for transactions that finish outside a purchase() call (Ask to Buy approval, another device, refund/revocation) */
  addListener(event: 'transactionUpdate', cb: (e: { productId: string; transactionId: string; revoked: boolean }) => void): Promise<{ remove(): Promise<void> }>;
}
export declare const StoreKit: StoreKitPlugin;
