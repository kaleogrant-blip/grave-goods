// TypeScript-free shim. In the app the bridge reaches the plugin as Capacitor.Plugins.ICloudKV (www/native.js).
// This file exists so `npm i` links a package that cap sync can discover; the web layer does not import it.
export const ICloudKV = {
  async isAvailable() { return { available: false }; },
  async get() { return { value: null }; },
  async set() {}, async remove() {}, async keys() { return { keys: [] }; }, async sync() {}
};
