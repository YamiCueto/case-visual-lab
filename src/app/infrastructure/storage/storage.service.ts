import { Injectable } from '@angular/core';

const NAMESPACE = 'cvl';
const LEGACY_NAMESPACE = 'eel';

/**
 * Namespaced, failure-tolerant wrapper over `localStorage`.
 * Handles private mode, quota errors and corrupted JSON without throwing.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage: Storage | null = this.resolveStorage();

  get<T>(key: string): T | null {
    const raw =
      this.storage?.getItem(this.key(key)) ?? this.storage?.getItem(`${LEGACY_NAMESPACE}:${key}`);
    if (raw == null) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set(key: string, value: unknown): boolean {
    try {
      this.storage?.setItem(this.key(key), JSON.stringify(value));
      return this.storage !== null;
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    this.storage?.removeItem(this.key(key));
  }

  private key(key: string): string {
    return `${NAMESPACE}:${key}`;
  }

  private resolveStorage(): Storage | null {
    try {
      const probe = `${NAMESPACE}:probe`;
      localStorage.setItem(probe, probe);
      localStorage.removeItem(probe);
      return localStorage;
    } catch {
      return null;
    }
  }
}
