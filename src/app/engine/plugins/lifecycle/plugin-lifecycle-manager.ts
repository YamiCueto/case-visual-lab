import { PluginExecutionContext } from '../contracts/plugin-context.interface';
import { Plugin } from '../contracts/plugin.interface';

export type PluginLifecycleState =
  'UNINITIALIZED' | 'INITIALIZED' | 'RUNNING' | 'STOPPED' | 'DISPOSED';

/**
 * Manages deterministic plugin lifecycle transitions:
 * initialize -> start -> stop -> dispose.
 * Honors dependency order on startup and reverse-dependency order on teardown.
 */
export class PluginLifecycleManager {
  private _states = new Map<string, PluginLifecycleState>();

  getState(pluginId: string): PluginLifecycleState {
    return this._states.get(pluginId) ?? 'UNINITIALIZED';
  }

  /**
   * Initializes plugins in forward topological order.
   */
  async initializeAll(
    plugins: readonly Plugin[],
    contextFactory: (plugin: Plugin) => PluginExecutionContext,
  ): Promise<void> {
    for (const plugin of plugins) {
      const id = plugin.descriptor.id;
      const state = this.getState(id);

      if (state === 'UNINITIALIZED') {
        const ctx = contextFactory(plugin);
        await plugin.initialize?.(ctx);
        this._states.set(id, 'INITIALIZED');
      }
    }
  }

  /**
   * Starts plugins in forward topological order.
   */
  async startAll(
    plugins: readonly Plugin[],
    contextFactory: (plugin: Plugin) => PluginExecutionContext,
  ): Promise<void> {
    for (const plugin of plugins) {
      const id = plugin.descriptor.id;
      const state = this.getState(id);

      if (state === 'INITIALIZED' || state === 'STOPPED') {
        const ctx = contextFactory(plugin);
        await plugin.start?.(ctx);
        this._states.set(id, 'RUNNING');
      }
    }
  }

  /**
   * Stops plugins in reverse topological order (dependents stop first).
   */
  async stopAll(
    plugins: readonly Plugin[],
    contextFactory: (plugin: Plugin) => PluginExecutionContext,
  ): Promise<void> {
    const reversed = Array.from(plugins).reverse();

    for (const plugin of reversed) {
      const id = plugin.descriptor.id;
      const state = this.getState(id);

      if (state === 'RUNNING') {
        const ctx = contextFactory(plugin);
        await plugin.stop?.(ctx);
        this._states.set(id, 'STOPPED');
      }
    }
  }

  /**
   * Disposes plugins in reverse topological order.
   */
  async disposeAll(plugins: readonly Plugin[]): Promise<void> {
    const reversed = Array.from(plugins).reverse();

    for (const plugin of reversed) {
      const id = plugin.descriptor.id;
      await plugin.dispose?.();
      this._states.set(id, 'DISPOSED');
    }
  }

  clear(): void {
    this._states.clear();
  }
}
