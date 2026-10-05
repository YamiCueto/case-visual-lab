import { PluginExecutionContext } from '../contracts/plugin-context.interface';
import { Plugin } from '../contracts/plugin.interface';
import { ExtensionRegistry } from '../extensions/extension-registry';
import { PluginLifecycleManager } from '../lifecycle/plugin-lifecycle-manager';
import { PluginRegistry } from '../registry/plugin-registry';
import { PluginResolver } from '../resolver/plugin-resolver';

export interface PluginLoaderOptions {
  readonly engineVersion?: string;
  readonly registry?: PluginRegistry;
  readonly extensions?: ExtensionRegistry;
  readonly lifecycle?: PluginLifecycleManager;
}

/**
 * Universal Plugin Loader.
 * High-level supervisor coordinating registration, dependency resolution,
 * topological lifecycle execution, and extension point management.
 */
export class PluginLoader {
  private readonly _engineVersion: string;
  private readonly _registry: PluginRegistry;
  private readonly _extensions: ExtensionRegistry;
  private readonly _lifecycle: PluginLifecycleManager;
  private _resolvedPlugins: Plugin[] = [];
  private _isInitialized = false;
  private _isRunning = false;
  private _isDisposed = false;

  constructor(options?: PluginLoaderOptions) {
    this._engineVersion = options?.engineVersion ?? '0.3.0';
    this._registry = options?.registry ?? new PluginRegistry();
    this._extensions = options?.extensions ?? new ExtensionRegistry();
    this._lifecycle = options?.lifecycle ?? new PluginLifecycleManager();
  }

  /**
   * Registers a plugin into the loader's registry.
   */
  register(plugin: Plugin): void {
    this.assertOperational();
    this._registry.register(plugin);
  }

  /**
   * Unregisters a plugin. If initialized, shuts it down first.
   */
  async unregister(pluginId: string): Promise<boolean> {
    this.assertOperational();
    const plugin = this._registry.get(pluginId);
    if (!plugin) {
      return false;
    }

    if (this._isRunning) {
      await this._lifecycle.stopAll([plugin], (p) => this.createContext(p));
    }
    await this._lifecycle.disposeAll([plugin]);

    const removed = this._registry.unregister(pluginId);
    this._resolvedPlugins = this._resolvedPlugins.filter((p) => p.descriptor.id !== pluginId);
    return removed;
  }

  /**
   * Resolves registered plugins against dependency and version constraints.
   */
  resolve(engineVersion?: string): readonly Plugin[] {
    this.assertOperational();
    const resolver = new PluginResolver(engineVersion ?? this._engineVersion);
    const result = resolver.resolve(this._registry.list());

    if (!result.isValid) {
      const details = result.errors
        .map((e) => `[${e.code}] ${e.pluginId}: ${e.message}`)
        .join('; ');
      throw new Error(`Plugin resolution failed: ${details}`);
    }

    this._resolvedPlugins = Array.from(result.orderedPlugins);
    return this._resolvedPlugins;
  }

  /**
   * Resolves and initializes all plugins in topological order.
   */
  async initialize(engineVersion?: string): Promise<readonly Plugin[]> {
    this.assertOperational();
    const ordered = this.resolve(engineVersion);

    await this._lifecycle.initializeAll(ordered, (plugin) => this.createContext(plugin));
    this._isInitialized = true;
    return ordered;
  }

  /**
   * Starts all resolved plugins.
   */
  async start(): Promise<void> {
    this.assertOperational();
    if (!this._isInitialized) {
      await this.initialize();
    }

    await this._lifecycle.startAll(this._resolvedPlugins, (plugin) => this.createContext(plugin));
    this._isRunning = true;
  }

  /**
   * Stops all active plugins in reverse topological order.
   */
  async stop(): Promise<void> {
    this.assertOperational();
    if (!this._isRunning) {
      return;
    }

    await this._lifecycle.stopAll(this._resolvedPlugins, (plugin) => this.createContext(plugin));
    this._isRunning = false;
  }

  /**
   * Disposes all plugins and clears registries.
   */
  async dispose(): Promise<void> {
    if (this._isDisposed) {
      return;
    }

    if (this._isRunning) {
      await this.stop();
    }

    await this._lifecycle.disposeAll(this._resolvedPlugins);

    this._registry.clear();
    this._extensions.clear();
    this._lifecycle.clear();
    this._resolvedPlugins = [];
    this._isInitialized = false;
    this._isRunning = false;
    this._isDisposed = true;
  }

  registry(): PluginRegistry {
    return this._registry;
  }

  extensions(): ExtensionRegistry {
    return this._extensions;
  }

  lifecycle(): PluginLifecycleManager {
    return this._lifecycle;
  }

  isInitialized(): boolean {
    return this._isInitialized;
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  isDisposed(): boolean {
    return this._isDisposed;
  }

  private createContext(plugin: Plugin): PluginExecutionContext {
    return {
      pluginId: plugin.descriptor.id,
      engineVersion: this._engineVersion,
      extensions: this._extensions,
      metadata: plugin.descriptor.extensions,
    };
  }

  private assertOperational(): void {
    if (this._isDisposed) {
      throw new Error('PluginLoader is disposed and cannot perform operations.');
    }
  }
}
