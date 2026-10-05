import { IAssetCache } from '../contracts/asset-cache.interface';

interface CacheEntry<T = unknown> {
  readonly value: T;
  readonly expiresAt?: number;
}

/**
 * Deterministic In-Memory Asset Cache.
 * Completely free of browser globals (window, localStorage, IndexedDB).
 * Safe for node, web workers, and headless test runners.
 */
export class AssetCache implements IAssetCache {
  private _entries = new Map<string, CacheEntry>();
  private readonly _nowProvider: () => number;

  constructor(nowProvider?: () => number) {
    this._nowProvider = nowProvider ?? (() => Date.now());
  }

  lookup<T>(key: string): T | null {
    const entry = this._entries.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== undefined && this._nowProvider() > entry.expiresAt) {
      this._entries.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = ttlMs !== undefined ? this._nowProvider() + ttlMs : undefined;
    this._entries.set(key, { value, expiresAt });
  }

  invalidate(key: string): boolean {
    return this._entries.delete(key);
  }

  clear(): void {
    this._entries.clear();
  }

  warmup(entries: Iterable<[string, unknown]>): void {
    for (const [key, value] of entries) {
      this.set(key, value);
    }
  }

  has(key: string): boolean {
    return this.lookup(key) !== null;
  }

  size(): number {
    this.purgeExpired();
    return this._entries.size;
  }

  private purgeExpired(): void {
    const now = this._nowProvider();
    for (const [key, entry] of this._entries) {
      if (entry.expiresAt !== undefined && now > entry.expiresAt) {
        this._entries.delete(key);
      }
    }
  }
}
