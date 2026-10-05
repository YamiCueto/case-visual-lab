/**
 * In-memory asset cache contract.
 * Pure TypeScript, zero dependency on browser localStorage, IndexedDB or window.
 */
export interface IAssetCache {
  /**
   * Looks up a cached item by key. Returns null if missing or expired.
   */
  lookup<T>(key: string): T | null;

  /**
   * Stores a value in the cache with an optional TTL in milliseconds.
   */
  set<T>(key: string, value: T, ttlMs?: number): void;

  /**
   * Invalidates a specific key from the cache.
   * Returns true if the key was present, false otherwise.
   */
  invalidate(key: string): boolean;

  /**
   * Clears all cached items.
   */
  clear(): void;

  /**
   * Warms up the cache with initial key-value pairs.
   */
  warmup(entries: Iterable<[string, unknown]>): void;

  /**
   * Checks if an unexpired key exists in cache.
   */
  has(key: string): boolean;

  /**
   * Returns the count of active items in the cache.
   */
  size(): number;
}
