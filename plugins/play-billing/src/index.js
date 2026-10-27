// Shim so `npm i` links a package that cap sync can discover. The web layer does not import it:
// in the app the bridge reaches the plugin as Capacitor.Plugins.PlayBilling (www/payments.js).
export const PlayBilling = {
  async canMakePayments() { return { allowed: false }; },
  async products() { return { products: [], invalid: [] }; },
  async purchase() { throw Object.assign(new Error('Play Billing is not available here'), { code: 'UNAVAILABLE' }); },
  async restore() { return { productIds: [] }; },
  async entitlements() { return { productIds: [] }; }
};
