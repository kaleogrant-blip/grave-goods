export interface ICloudKVPlugin {
  /** false when the user is signed out of iCloud or the entitlement is missing */
  isAvailable(): Promise<{ available: boolean }>;
  get(opts: { key: string }): Promise<{ value: string | null }>;
  set(opts: { key: string; value: string }): Promise<void>;
  remove(opts: { key: string }): Promise<void>;
  keys(): Promise<{ keys: string[] }>;
  /** NSUbiquitousKeyValueStore.synchronize(): a hint, not a guarantee */
  sync(): Promise<void>;
  /** fires when another device changed keys: { keys: string[] } */
  addListener(event: 'changed', cb: (e: { keys: string[] }) => void): Promise<{ remove(): Promise<void> }>;
}
export declare const ICloudKV: ICloudKVPlugin;
