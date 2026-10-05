import { PluginCapability } from '../contracts/plugin-capability.types';
import { Plugin } from '../contracts/plugin.interface';

/**
 * Universal Plugin Registry.
 * High-performance indexed storage for runtime plugins.
 * Zero switch statements, zero if-chains by type: resolutions operate via capability inverted indexes.
 */
export class PluginRegistry {
  private _pluginsById = new Map<string, Plugin>();
  private _capabilityIndex = new Map<string, Set<string>>();

  /**
   * Registers a plugin and indexes its capabilities.
   */
  register(plugin: Plugin): void {
    const id = plugin.descriptor.id;
    if (this._pluginsById.has(id)) {
      throw new Error(`Plugin with ID "${id}" is already registered.`);
    }

    this._pluginsById.set(id, plugin);

    for (const capability of plugin.descriptor.capabilities) {
      let bucket = this._capabilityIndex.get(capability);
      if (!bucket) {
        bucket = new Set<string>();
        this._capabilityIndex.set(capability, bucket);
      }
      bucket.add(id);
    }
  }

  /**
   * Unregisters a plugin by ID and cleans up capability indexes.
   */
  unregister(pluginId: string): boolean {
    const plugin = this._pluginsById.get(pluginId);
    if (!plugin) {
      return false;
    }

    for (const capability of plugin.descriptor.capabilities) {
      const bucket = this._capabilityIndex.get(capability);
      if (bucket) {
        bucket.delete(pluginId);
        if (bucket.size === 0) {
          this._capabilityIndex.delete(capability);
        }
      }
    }

    return this._pluginsById.delete(pluginId);
  }

  /**
   * Resolves all plugins declaring a specific capability via inverted index.
   */
  resolve(capability: PluginCapability): readonly Plugin[] {
    const ids = this._capabilityIndex.get(capability);
    if (!ids || ids.size === 0) {
      return [];
    }

    const resolved: Plugin[] = [];
    for (const id of ids) {
      const plugin = this._pluginsById.get(id);
      if (plugin) {
        resolved.push(plugin);
      }
    }

    return resolved;
  }

  /**
   * Retrieves a plugin by its unique ID.
   */
  get(pluginId: string): Plugin | null {
    return this._pluginsById.get(pluginId) ?? null;
  }

  /**
   * Checks if a plugin is registered.
   */
  exists(pluginId: string): boolean {
    return this._pluginsById.has(pluginId);
  }

  /**
   * Returns all currently registered plugins.
   */
  list(): readonly Plugin[] {
    return Array.from(this._pluginsById.values());
  }

  /**
   * Clears all registered plugins and capability indexes.
   */
  clear(): void {
    this._pluginsById.clear();
    this._capabilityIndex.clear();
  }
}
