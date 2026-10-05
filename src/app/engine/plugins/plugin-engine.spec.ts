import { describe, expect, it } from 'vitest';
import { PluginExecutionContext } from './contracts/plugin-context.interface';
import { PluginDescriptor } from './contracts/plugin-descriptor.interface';
import { Plugin } from './contracts/plugin.interface';
import { ExtensionRegistry } from './extensions/extension-registry';
import { PluginLifecycleManager } from './lifecycle/plugin-lifecycle-manager';
import { PluginLoader } from './loader/plugin-loader';
import { PluginRegistry } from './registry/plugin-registry';
import { isVersionCompatible, PluginResolver } from './resolver/plugin-resolver';

/**
 * Fake plugin helper for tests.
 */
class TestPlugin implements Plugin {
  readonly descriptor: PluginDescriptor;
  initialized = false;
  started = false;
  stopped = false;
  disposed = false;
  initContext?: PluginExecutionContext;

  constructor(
    id: string,
    capabilities: string[] = [],
    dependencies: Record<string, string> = {},
    version = '1.0.0',
    engineVersion = '^0.3.0',
  ) {
    this.descriptor = {
      id,
      name: `Plugin ${id}`,
      version,
      engineVersion,
      capabilities,
      dependencies,
    };
  }

  initialize(context: PluginExecutionContext): void {
    this.initialized = true;
    this.initContext = context;
  }

  start(): void {
    this.started = true;
  }

  stop(): void {
    this.stopped = true;
    this.started = false;
  }

  dispose(): void {
    this.disposed = true;
    this.initialized = false;
  }
}

describe('Plugin Engine Subsystem (Sprint 3 — Paso 10)', () => {
  describe('ExtensionRegistry', () => {
    it('should register, get, list, and clear namespaced extension points', () => {
      const extensions = new ExtensionRegistry();

      expect(extensions.listNamespaces()).toEqual([]);
      expect(extensions.has('simulation')).toBe(false);

      extensions.register('simulation', 'ros-bridge', { protocol: 'ros2' });
      extensions.register('simulation', 'kafka-stream', { broker: 'localhost:9092' });
      extensions.register('renderer', 'three-webgpu', { compute: true });

      expect(extensions.has('simulation')).toBe(true);
      expect(extensions.has('simulation', 'ros-bridge')).toBe(true);
      expect(extensions.has('simulation', 'missing')).toBe(false);

      expect(extensions.get('simulation', 'ros-bridge')).toEqual({ protocol: 'ros2' });
      expect(extensions.get('simulation', 'missing')).toBeNull();

      expect(extensions.listNamespaces()).toEqual(['simulation', 'renderer']);
      expect(extensions.listKeys('simulation')).toEqual(['ros-bridge', 'kafka-stream']);

      // Remove single key
      expect(extensions.remove('simulation', 'kafka-stream')).toBe(true);
      expect(extensions.listKeys('simulation')).toEqual(['ros-bridge']);

      // Clear single namespace
      extensions.clear('simulation');
      expect(extensions.has('simulation')).toBe(false);
      expect(extensions.has('renderer')).toBe(true);

      // Clear all
      extensions.clear();
      expect(extensions.listNamespaces()).toEqual([]);
    });
  });

  describe('PluginRegistry', () => {
    it('should register plugins and index capabilities without switch statements', () => {
      const registry = new PluginRegistry();
      const p1 = new TestPlugin('sim-http', ['simulation-provider', 'behavior-handler']);
      const p2 = new TestPlugin('sim-kafka', ['simulation-provider']);
      const p3 = new TestPlugin('rend-three', ['renderer-port']);

      registry.register(p1);
      registry.register(p2);
      registry.register(p3);

      expect(registry.exists('sim-http')).toBe(true);
      expect(registry.exists('unknown')).toBe(false);
      expect(registry.get('sim-http')).toBe(p1);
      expect(registry.list()).toHaveLength(3);

      // Resolve by capability via inverted index
      const simProviders = registry.resolve('simulation-provider');
      expect(simProviders).toHaveLength(2);
      expect(simProviders.map((p) => p.descriptor.id)).toEqual(['sim-http', 'sim-kafka']);

      const renderers = registry.resolve('renderer-port');
      expect(renderers).toHaveLength(1);
      expect(renderers[0].descriptor.id).toBe('rend-three');

      const missingCap = registry.resolve('camera-adapter');
      expect(missingCap).toEqual([]);
    });

    it('should reject registering duplicate plugin IDs', () => {
      const registry = new PluginRegistry();
      const p1 = new TestPlugin('dup-id');
      const p2 = new TestPlugin('dup-id');

      registry.register(p1);
      expect(() => registry.register(p2)).toThrow(/already registered/);
    });

    it('should unregister a plugin and clean up capability indexes', () => {
      const registry = new PluginRegistry();
      const p1 = new TestPlugin('p1', ['simulation-provider']);

      registry.register(p1);
      expect(registry.resolve('simulation-provider')).toHaveLength(1);

      expect(registry.unregister('p1')).toBe(true);
      expect(registry.exists('p1')).toBe(false);
      expect(registry.resolve('simulation-provider')).toHaveLength(0);
      expect(registry.unregister('non-existent')).toBe(false);
    });

    it('should clear all plugins and capability indexes', () => {
      const registry = new PluginRegistry();
      registry.register(new TestPlugin('p1', ['cap1']));
      registry.register(new TestPlugin('p2', ['cap2']));

      registry.clear();
      expect(registry.list()).toEqual([]);
      expect(registry.resolve('cap1')).toEqual([]);
    });
  });

  describe('PluginResolver & Dependency Resolution', () => {
    it('should evaluate semver compatibility accurately', () => {
      expect(isVersionCompatible('0.3.0', '^0.3.0')).toBe(true);
      expect(isVersionCompatible('0.3.5', '^0.3.0')).toBe(true);
      expect(isVersionCompatible('0.4.0', '^0.3.0')).toBe(false); // 0.x semver behavior

      expect(isVersionCompatible('1.2.0', '^1.0.0')).toBe(true);
      expect(isVersionCompatible('2.0.0', '^1.0.0')).toBe(false);

      expect(isVersionCompatible('1.5.0', '>=1.0.0')).toBe(true);
      expect(isVersionCompatible('0.9.0', '>=1.0.0')).toBe(false);

      expect(isVersionCompatible('2.3.4', '*')).toBe(true);
    });

    it('should sort plugins in topological dependency order (dependencies first)', () => {
      const resolver = new PluginResolver('0.3.0');

      // Graph: pC depends on pB, pB depends on pA
      const pC = new TestPlugin('plugin-c', [], { 'plugin-b': '^1.0.0' });
      const pB = new TestPlugin('plugin-b', [], { 'plugin-a': '^1.0.0' });
      const pA = new TestPlugin('plugin-a', []);

      // Pass in reverse order: C, B, A
      const result = resolver.resolve([pC, pB, pA]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.orderedPlugins.map((p) => p.descriptor.id)).toEqual([
        'plugin-a',
        'plugin-b',
        'plugin-c',
      ]);
    });

    it('should detect duplicate plugin IDs in input list', () => {
      const resolver = new PluginResolver('0.3.0');
      const p1 = new TestPlugin('dup');
      const p2 = new TestPlugin('dup');

      const result = resolver.resolve([p1, p2]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DUPLICATE_PLUGIN_ID')).toBe(true);
    });

    it('should detect missing dependencies', () => {
      const resolver = new PluginResolver('0.3.0');
      const p1 = new TestPlugin('client', [], { 'missing-service': '^1.0.0' });

      const result = resolver.resolve([p1]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_DEPENDENCY')).toBe(true);
    });

    it('should detect incompatible dependency versions', () => {
      const resolver = new PluginResolver('0.3.0');
      const dep = new TestPlugin('service', [], {}, '2.0.0');
      const client = new TestPlugin('client', [], { service: '^1.0.0' });

      const result = resolver.resolve([dep, client]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INCOMPATIBLE_DEPENDENCY_VERSION')).toBe(true);
    });

    it('should detect incompatible engine version', () => {
      const resolver = new PluginResolver('0.3.0');
      const plugin = new TestPlugin('future-plugin', [], {}, '1.0.0', '>=1.0.0');

      const result = resolver.resolve([plugin]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INCOMPATIBLE_ENGINE_VERSION')).toBe(true);
    });

    it('should detect circular dependencies', () => {
      const resolver = new PluginResolver('0.3.0');
      // A depends on B, B depends on A
      const pA = new TestPlugin('a', [], { b: '*' });
      const pB = new TestPlugin('b', [], { a: '*' });

      const result = resolver.resolve([pA, pB]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });
  });

  describe('PluginLifecycleManager', () => {
    it('should advance states correctly and stop/dispose in reverse topological order', async () => {
      const manager = new PluginLifecycleManager();
      const executionOrder: string[] = [];

      const pA = new TestPlugin('pA');
      const pB = new TestPlugin('pB');

      pA.initialize = () => {
        executionOrder.push('init:pA');
      };
      pB.initialize = () => {
        executionOrder.push('init:pB');
      };

      pA.start = () => {
        executionOrder.push('start:pA');
      };
      pB.start = () => {
        executionOrder.push('start:pB');
      };

      pA.stop = () => {
        executionOrder.push('stop:pA');
      };
      pB.stop = () => {
        executionOrder.push('stop:pB');
      };

      pA.dispose = () => {
        executionOrder.push('dispose:pA');
      };
      pB.dispose = () => {
        executionOrder.push('dispose:pB');
      };

      const plugins = [pA, pB];
      const contextFactory = (p: Plugin) => ({
        pluginId: p.descriptor.id,
        engineVersion: '0.3.0',
        extensions: new ExtensionRegistry(),
      });

      // 1. Initialize: pA then pB
      await manager.initializeAll(plugins, contextFactory);
      expect(manager.getState('pA')).toBe('INITIALIZED');
      expect(manager.getState('pB')).toBe('INITIALIZED');

      // 2. Start: pA then pB
      await manager.startAll(plugins, contextFactory);
      expect(manager.getState('pA')).toBe('RUNNING');
      expect(manager.getState('pB')).toBe('RUNNING');

      // 3. Stop: pB then pA (reverse!)
      await manager.stopAll(plugins, contextFactory);
      expect(manager.getState('pA')).toBe('STOPPED');
      expect(manager.getState('pB')).toBe('STOPPED');

      // 4. Dispose: pB then pA (reverse!)
      await manager.disposeAll(plugins);
      expect(manager.getState('pA')).toBe('DISPOSED');
      expect(manager.getState('pB')).toBe('DISPOSED');

      expect(executionOrder).toEqual([
        'init:pA',
        'init:pB',
        'start:pA',
        'start:pB',
        'stop:pB',
        'stop:pA',
        'dispose:pB',
        'dispose:pA',
      ]);
    });
  });

  describe('PluginLoader (Supervisor Pipeline)', () => {
    it('should coordinate registration, resolution, lifecycle, and extensions end-to-end', async () => {
      const loader = new PluginLoader({ engineVersion: '0.3.0' });

      // Create a base telemetry plugin and a simulation plugin that depends on it
      const telemetryPlugin = new TestPlugin('telemetry-plugin', ['evaluation-provider'], {});
      telemetryPlugin.initialize = (ctx) => {
        ctx.extensions.register('telemetry', 'sink', { type: 'memory' });
      };

      const simPlugin = new TestPlugin('ros-sim-plugin', ['simulation-provider'], {
        'telemetry-plugin': '^1.0.0',
      });
      simPlugin.initialize = (ctx) => {
        // Can read extension registered by telemetry plugin because of topological ordering!
        const sink = ctx.extensions.get('telemetry', 'sink');
        expect(sink).toEqual({ type: 'memory' });
        ctx.extensions.register('simulation', 'ros', { node: 'robot_arm' });
      };

      loader.register(simPlugin);
      loader.register(telemetryPlugin);

      expect(loader.isInitialized()).toBe(false);
      expect(loader.isRunning()).toBe(false);

      // Initialize
      const resolved = await loader.initialize();
      expect(resolved.map((p) => p.descriptor.id)).toEqual(['telemetry-plugin', 'ros-sim-plugin']);
      expect(loader.isInitialized()).toBe(true);
      expect(loader.extensions().get('simulation', 'ros')).toEqual({ node: 'robot_arm' });

      // Start
      await loader.start();
      expect(loader.isRunning()).toBe(true);

      // Stop
      await loader.stop();
      expect(loader.isRunning()).toBe(false);

      // Dispose
      await loader.dispose();
      expect(loader.isDisposed()).toBe(true);
      expect(loader.registry().list()).toEqual([]);
      expect(loader.extensions().listNamespaces()).toEqual([]);

      // Operations after dispose throw
      expect(() => loader.register(new TestPlugin('p'))).toThrow(/disposed/);
      await expect(loader.start()).rejects.toThrow(/disposed/);
    });

    it('should gracefully unregister an individual plugin with shutdown', async () => {
      const loader = new PluginLoader();
      const plugin = new TestPlugin('temp-plugin');

      loader.register(plugin);
      await loader.initialize();
      await loader.start();

      expect(loader.registry().exists('temp-plugin')).toBe(true);
      expect(plugin.started).toBe(true);

      await loader.unregister('temp-plugin');
      expect(plugin.stopped).toBe(true);
      expect(plugin.disposed).toBe(true);
      expect(loader.registry().exists('temp-plugin')).toBe(false);
    });
  });
});
