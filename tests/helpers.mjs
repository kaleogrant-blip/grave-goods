import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const load = name => require(path.join(ROOT, 'www', name));

// In-memory Preferences stand-in with call log.
export function memPrefs(init = {}) {
  const m = new Map(Object.entries(init));
  return { m, get: async k => (m.has(k) ? m.get(k) : null), set: async (k, v) => void m.set(k, String(v)), remove: async k => void m.delete(k) };
}
export function memLS(init = {}) {
  const m = new Map(Object.entries(init));
  return { m, get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: k => void m.delete(k) };
}
// In-memory iCloud KVS with Apple's limits enforced, so oversize writes fail the way they would on a device.
export function memICloud({ available = true } = {}) {
  const m = new Map();
  return { m, available: async () => available, sync: async () => {}, get: async k => (m.has(k) ? m.get(k) : null),
    set: async (k, v) => { if (Buffer.byteLength(v) > 1024 * 1024) throw new Error('value > 1 MB'); m.set(k, v); },
    remove: async k => void m.delete(k) };
}
