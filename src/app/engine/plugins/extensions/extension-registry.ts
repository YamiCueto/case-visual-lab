import { IExtensionAccessor } from '../contracts/plugin-context.interface';

/**
 * Registry of namespaced extension points.
 * Allows plugins to register arbitrary features, drivers, protocols, or models
 * (Kafka, ROS, Blockchain, MCP, WebGPU, LLM Teleprompters) without modifying the Runtime.
 */
export class ExtensionRegistry implements IExtensionAccessor {
  private _namespaces = new Map<string, Map<string, unknown>>();

  register<T>(namespace: string, key: string, value: T): void {
    let bucket = this._namespaces.get(namespace);
    if (!bucket) {
      bucket = new Map<string, unknown>();
      this._namespaces.set(namespace, bucket);
    }
    bucket.set(key, value);
  }

  get<T>(namespace: string, key: string): T | null {
    const bucket = this._namespaces.get(namespace);
    if (!bucket) {
      return null;
    }
    const val = bucket.get(key);
    return val !== undefined ? (val as T) : null;
  }

  has(namespace: string, key?: string): boolean {
    const bucket = this._namespaces.get(namespace);
    if (!bucket) {
      return false;
    }
    if (key === undefined) {
      return bucket.size > 0;
    }
    return bucket.has(key);
  }

  listNamespaces(): readonly string[] {
    return Array.from(this._namespaces.keys());
  }

  listKeys(namespace: string): readonly string[] {
    const bucket = this._namespaces.get(namespace);
    if (!bucket) {
      return [];
    }
    return Array.from(bucket.keys());
  }

  remove(namespace: string, key: string): boolean {
    const bucket = this._namespaces.get(namespace);
    if (!bucket) {
      return false;
    }
    const deleted = bucket.delete(key);
    if (bucket.size === 0) {
      this._namespaces.delete(namespace);
    }
    return deleted;
  }

  clear(namespace?: string): void {
    if (namespace !== undefined) {
      this._namespaces.delete(namespace);
    } else {
      this._namespaces.clear();
    }
  }
}
