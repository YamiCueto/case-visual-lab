import { describe, expect, it } from 'vitest';
import { AssetProvider } from '../../assets/contracts/asset-provider.interface';
import { BehaviorExecutionContext } from '../../behaviors/contracts/behavior-context.interface';
import { BehaviorHandler } from '../../behaviors/contracts/behavior-handler.interface';
import { RendererCommand } from '../../behaviors/commands/renderer-command.types';
import { Plugin } from '../../plugins/contracts/plugin.interface';
import { RendererPort } from '../../rendering/contracts/renderer-port.interface';
import { SimulationEvent } from '../../simulation/events/simulation-event.types';
import {
  SimulationProvider,
  SimulationProviderInitResult,
} from '../../simulation/provider/simulation-provider.types';
import { PlatformRuntime } from './composition-context.interface';
import { ExperienceCompositionRoot } from './experience-composition-root';
import { CompositionError } from './experience-composition-root.interface';

class MockAssetProvider implements AssetProvider {
  private readonly _data = new Map<string, unknown>();

  set(uri: string, value: unknown): void {
    this._data.set(uri, value);
  }

  async loadJson<T = unknown>(uri: string): Promise<T> {
    const val = this._data.get(uri);
    if (!val) {
      throw new Error(`Asset not found: ${uri}`);
    }
    return val as T;
  }

  async loadText(uri: string): Promise<string> {
    return String(this._data.get(uri) ?? '');
  }

  async loadBinary(uri: string): Promise<ArrayBuffer> {
    void uri;
    return new ArrayBuffer(0);
  }

  async exists(uri: string): Promise<boolean> {
    return this._data.has(uri);
  }
}

class CustomTestHandler implements BehaviorHandler {
  readonly id = 'custom-test-handler';

  supports(eventType: string): boolean {
    return eventType === 'custom:event';
  }

  execute(event: SimulationEvent, _context: BehaviorExecutionContext): readonly RendererCommand[] {
    void _context;
    return [
      {
        id: `cmd_${event.eventId}`,
        type: 'HIGHLIGHT_NODE',
        targetId: event.targetEntityId ?? 'node',
        payload: { target: event.targetEntityId },
        durationMs: 300,
        easing: 'ease-out',
        priority: 'NORMAL',
      },
    ];
  }

  metadata() {
    return {
      id: this.id,
      name: 'Custom Test Handler',
      description: 'Custom Test Handler Description',
      version: '1.0.0',
      supportedEventTypes: ['custom:event'],
    };
  }
}

class CustomTestRenderer implements RendererPort {
  readonly id = 'custom-renderer';
  readonly priority = 50;

  initialize(): void {
    void this.id;
  }
  supports(): boolean {
    return true;
  }
  render(): void {
    void this.id;
  }
  dispose(): void {
    void this.id;
  }
}

class CustomSimulationProvider implements SimulationProvider<{ count: number }, { step: number }> {
  readonly providerId = 'custom-simulation-provider';
  readonly domain = 'custom';

  initialize(
    scenario: { count: number },
    _seed: number,
  ): SimulationProviderInitResult<{ step: number }> {
    void _seed;
    return {
      initialState: {
        stepIndex: 0,
        virtualTimeMs: 0,
        variables: { count: scenario.count },
        entities: {},
      },
      initialProviderState: { step: 0 },
    };
  }

  step() {
    return {
      nextState: { stepIndex: 1, virtualTimeMs: 100, variables: {}, entities: {} },
      providerState: { step: 1 },
      emittedEvents: [],
      isCompleted: true,
    };
  }

  snapshot() {
    return {
      stepIndex: 0,
      virtualTimeMs: 0,
      stateHash: 'mock',
      providerState: { step: 0 },
    };
  }

  restore(): SimulationProviderInitResult<{ step: number }> {
    return {
      initialState: { stepIndex: 0, virtualTimeMs: 0, variables: {}, entities: {} },
      initialProviderState: { step: 0 },
    };
  }
}

describe('ExperienceCompositionRoot', () => {
  describe('Wiring & Object Graph Construction', () => {
    it('composes complete platform runtime with all 11 core subsystems', () => {
      const runtime = ExperienceCompositionRoot.compose();

      expect(runtime).toBeDefined();
      expect(runtime.eventBus).toBeDefined();
      expect(runtime.clock).toBeDefined();
      expect(runtime.stateMachine).toBeDefined();
      expect(runtime.simulationRuntime).toBeDefined();
      expect(runtime.behaviorRegistry).toBeDefined();
      expect(runtime.timelineEngine).toBeDefined();
      expect(runtime.rendererEngine).toBeDefined();
      expect(runtime.assetEngine).toBeDefined();
      expect(runtime.pluginLoader).toBeDefined();
      expect(runtime.pluginRegistry).toBeDefined();
      expect(runtime.extensionRegistry).toBeDefined();
      expect(runtime.simulationProviders).toBeDefined();
    });

    it('initializes state machine in LOAD state', () => {
      const runtime = ExperienceCompositionRoot.compose();
      expect(runtime.stateMachine.currentState()).toBe('LOAD');
      expect(runtime.stateMachine.previousState()).toBeNull();
    });

    it('initializes clock at stopped state with zero time by default', () => {
      const runtime = ExperienceCompositionRoot.compose();
      expect(runtime.clock.time).toBe(0);
      expect(runtime.clock.state).toBe('STOPPED');
      expect(runtime.clock.speed).toBe(1.0);
    });

    it('configures custom clock initial time from context', () => {
      const runtime = ExperienceCompositionRoot.compose({
        clockInitialTime: 2500,
      });
      expect(runtime.clock.time).toBe(2500);
    });

    it('does NOT execute, render, simulate, or start playback during composition', () => {
      const runtime = ExperienceCompositionRoot.compose();

      expect(runtime.simulationRuntime.isInitialized()).toBe(false);
      expect(runtime.rendererEngine.isInitialized()).toBe(false);
      expect(runtime.clock.state).toBe('STOPPED');
      expect(runtime.timelineEngine.state()).toBe('STOPPED');
    });

    it('sets default NullAssetProvider that rejects manifest calls if context omits provider', async () => {
      const runtime = ExperienceCompositionRoot.compose();
      await expect(runtime.assetEngine.loadExperience('any-uri')).rejects.toThrow(CompositionError);
    });
  });

  describe('Handlers Registration', () => {
    it('registers all 5 mandatory standard behavior handlers', () => {
      const runtime = ExperienceCompositionRoot.compose();
      const handlers = runtime.behaviorRegistry.list();

      const ids = handlers.map((h) => h.id);
      expect(ids).toContain('packet-flow-handler');
      expect(ids).toContain('node-pulse-handler');
      expect(ids).toContain('database-write-handler');
      expect(ids).toContain('response-flow-handler');
      expect(ids).toContain('error-flow-handler');
    });

    it('resolves standard handlers for corresponding event types', () => {
      const runtime = ExperienceCompositionRoot.compose();

      const packetHandlers = runtime.behaviorRegistry.resolve('http:request-sent');
      expect(packetHandlers.some((h) => h.id === 'packet-flow-handler')).toBe(true);

      const pulseHandlers = runtime.behaviorRegistry.resolve('controller:entered');
      expect(pulseHandlers.some((h) => h.id === 'node-pulse-handler')).toBe(true);

      const dbHandlers = runtime.behaviorRegistry.resolve('database:commit');
      expect(dbHandlers.some((h) => h.id === 'database-write-handler')).toBe(true);

      const responseHandlers = runtime.behaviorRegistry.resolve('http:response-sent');
      expect(responseHandlers.some((h) => h.id === 'response-flow-handler')).toBe(true);

      const errorHandlers = runtime.behaviorRegistry.resolve('domain:error');
      expect(errorHandlers.some((h) => h.id === 'error-flow-handler')).toBe(true);
    });
  });

  describe('Renderers Registration', () => {
    it('registers all 4 mandatory renderer ports with correct priorities', () => {
      const runtime = ExperienceCompositionRoot.compose();
      const ports = runtime.rendererEngine.list();

      const ids = ports.map((p) => p.id);
      expect(ids).toContain('excalidraw-renderer');
      expect(ids).toContain('camera-renderer');
      expect(ids).toContain('web-audio-renderer');
      expect(ids).toContain('threejs-renderer');

      const webAudio = ports.find((p) => p.id === 'web-audio-renderer');
      const three = ports.find((p) => p.id === 'threejs-renderer');
      const camera = ports.find((p) => p.id === 'camera-renderer');
      const excalidraw = ports.find((p) => p.id === 'excalidraw-renderer');

      expect(webAudio?.priority).toBe(30);
      expect(three?.priority).toBe(25);
      expect(camera?.priority).toBe(20);
      expect(excalidraw?.priority).toBe(10);
    });
  });

  describe('Simulation Providers Registration', () => {
    it('registers mandatory HttpSimulationProvider', () => {
      const runtime = ExperienceCompositionRoot.compose();

      const httpProvider = runtime.getSimulationProvider('http-simulation-provider');
      expect(httpProvider).toBeDefined();
      expect(httpProvider?.providerId).toBe('http-simulation-provider');
      expect(httpProvider?.domain).toBe('networking');

      const all = runtime.listSimulationProviders();
      expect(all.some((p) => p.providerId === 'http-simulation-provider')).toBe(true);
    });
  });

  describe('Dependency Injection & Extension Points', () => {
    it('injects custom AssetProvider into AssetEngine', async () => {
      const mockProvider = new MockAssetProvider();
      mockProvider.set('test-exp.json', {
        schemaVersion: '2.0.0',
        manifestVersion: '2.0.0',
        metadata: {
          id: 'test-exp',
          title: 'Test Experience',
        },
        profile: {
          type: 'simulation',
        },
      });

      const runtime = ExperienceCompositionRoot.compose({
        assetProvider: mockProvider,
      });

      const exp = await runtime.assetEngine.loadExperience('test-exp.json');
      expect(exp.manifest.metadata.id).toBe('test-exp');
    });

    it('registers custom BehaviorHandler alongside standard handlers', () => {
      const customHandler = new CustomTestHandler();
      const runtime = ExperienceCompositionRoot.compose({
        customHandlers: [customHandler],
      });

      const resolved = runtime.behaviorRegistry.resolve('custom:event');
      expect(resolved.some((h) => h.id === 'custom-test-handler')).toBe(true);
      expect(runtime.behaviorRegistry.list().length).toBe(6);
    });

    it('registers custom RendererPort alongside standard ports', () => {
      const customRenderer = new CustomTestRenderer();
      const runtime = ExperienceCompositionRoot.compose({
        customRenderers: [customRenderer],
      });

      const ports = runtime.rendererEngine.list();
      expect(ports.some((p) => p.id === 'custom-renderer')).toBe(true);
      expect(ports.length).toBe(5);
    });

    it('registers custom SimulationProvider alongside standard provider', () => {
      const customProvider = new CustomSimulationProvider();
      const runtime = ExperienceCompositionRoot.compose({
        customProviders: [customProvider],
      });

      const retrieved = runtime.getSimulationProvider('custom-simulation-provider');
      expect(retrieved).toBeDefined();
      expect(retrieved?.providerId).toBe('custom-simulation-provider');
      expect(runtime.listSimulationProviders().length).toBe(2);
    });

    it('registers and resolves valid custom plugins', () => {
      const customPlugin: Plugin = {
        descriptor: {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          engineVersion: '^0.3.0',
          capabilities: [],
        },
      };

      const runtime = ExperienceCompositionRoot.compose({
        customPlugins: [customPlugin],
      });

      expect(runtime.pluginRegistry.exists('test-plugin')).toBe(true);
    });
  });

  describe('Duplicate Registrations Validation', () => {
    it('throws DUPLICATE_REGISTRATION if custom handler duplicates a standard handler ID', () => {
      const duplicateHandler: BehaviorHandler = {
        id: 'packet-flow-handler',
        supports: () => true,
        execute: () => [],
        metadata: () => ({
          id: 'packet-flow-handler',
          name: 'Duplicate Handler',
          description: 'Duplicate Handler Description',
          version: '1.0.0',
          supportedEventTypes: ['http:request-sent'],
        }),
      };

      expect(() =>
        ExperienceCompositionRoot.compose({
          customHandlers: [duplicateHandler],
        }),
      ).toThrowError(/already registered/);

      try {
        ExperienceCompositionRoot.compose({ customHandlers: [duplicateHandler] });
      } catch (err) {
        expect((err as CompositionError).code).toBe('DUPLICATE_REGISTRATION');
      }
    });

    it('throws DUPLICATE_REGISTRATION if custom handler duplicates another custom handler', () => {
      const handlerA = new CustomTestHandler();
      const handlerB = new CustomTestHandler();

      expect(() =>
        ExperienceCompositionRoot.compose({
          customHandlers: [handlerA, handlerB],
        }),
      ).toThrowError(CompositionError);
    });

    it('throws DUPLICATE_REGISTRATION if custom provider duplicates standard provider ID', () => {
      const duplicateProvider: SimulationProvider = {
        providerId: 'http-simulation-provider',
        domain: 'networking',
        initialize: () => ({
          initialState: { stepIndex: 0, virtualTimeMs: 0, variables: {}, entities: {} },
          initialProviderState: {},
        }),
        step: () => ({
          nextState: { stepIndex: 0, virtualTimeMs: 0, variables: {}, entities: {} },
          providerState: {},
          emittedEvents: [],
          isCompleted: true,
        }),
      };

      expect(() =>
        ExperienceCompositionRoot.compose({
          customProviders: [duplicateProvider],
        }),
      ).toThrowError(CompositionError);
    });

    it('throws DUPLICATE_REGISTRATION if custom renderer duplicates standard renderer ID', () => {
      const duplicateRenderer: RendererPort = {
        id: 'excalidraw-renderer',
        priority: 10,
        initialize: () => void 0,
        supports: () => true,
        render: () => void 0,
        dispose: () => void 0,
      };

      expect(() =>
        ExperienceCompositionRoot.compose({
          customRenderers: [duplicateRenderer],
        }),
      ).toThrowError(CompositionError);
    });

    it('throws DUPLICATE_REGISTRATION if custom plugin ID is registered twice', () => {
      const pluginA: Plugin = {
        descriptor: {
          id: 'dup-plugin',
          name: 'Dup Plugin A',
          version: '1.0.0',
          engineVersion: '^0.3.0',
          capabilities: [],
        },
      };
      const pluginB: Plugin = {
        descriptor: {
          id: 'dup-plugin',
          name: 'Dup Plugin B',
          version: '1.1.0',
          engineVersion: '^0.3.0',
          capabilities: [],
        },
      };

      expect(() =>
        ExperienceCompositionRoot.compose({
          customPlugins: [pluginA, pluginB],
        }),
      ).toThrowError(CompositionError);
    });
  });

  describe('Plugin Incompatibility Validation', () => {
    it('throws INCOMPATIBLE_PLUGIN when plugin targetEngineVersion is incompatible', () => {
      const incompatiblePlugin: Plugin = {
        descriptor: {
          id: 'future-plugin',
          name: 'Future Plugin',
          version: '1.0.0',
          engineVersion: '>=2.0.0',
          capabilities: [],
        },
      };

      expect(() =>
        ExperienceCompositionRoot.compose({
          engineVersion: '0.3.0',
          customPlugins: [incompatiblePlugin],
        }),
      ).toThrowError(CompositionError);

      try {
        ExperienceCompositionRoot.compose({
          engineVersion: '0.3.0',
          customPlugins: [incompatiblePlugin],
        });
      } catch (err) {
        expect((err as CompositionError).code).toBe('INCOMPATIBLE_PLUGIN');
      }
    });

    it('throws INCOMPATIBLE_PLUGIN when plugin dependency is missing', () => {
      const pluginWithMissingDep: Plugin = {
        descriptor: {
          id: 'dependent-plugin',
          name: 'Dependent Plugin',
          version: '1.0.0',
          engineVersion: '^0.3.0',
          capabilities: [],
          dependencies: {
            'non-existent-plugin': '^1.0.0',
          },
        },
      };

      expect(() =>
        ExperienceCompositionRoot.compose({
          customPlugins: [pluginWithMissingDep],
        }),
      ).toThrowError(CompositionError);
    });
  });

  describe('Validation Method (validate)', () => {
    it('throws MISSING_DEPENDENCY if any mandatory subsystem reference is null', () => {
      const root = new ExperienceCompositionRoot();
      const runtime = root.compose();

      const corruptRuntime = {
        ...runtime,
        eventBus: null as unknown as PlatformRuntime['eventBus'],
      };

      expect(() => root.validate(corruptRuntime)).toThrowError(CompositionError);
      try {
        root.validate(corruptRuntime);
      } catch (err) {
        expect((err as CompositionError).code).toBe('MISSING_DEPENDENCY');
      }
    });

    it('throws MISSING_PROVIDER if http provider is deleted', () => {
      const root = new ExperienceCompositionRoot();
      const runtime = root.compose();

      const emptyProviders = new Map();
      const corruptRuntime = {
        ...runtime,
        simulationProviders: emptyProviders,
      };

      expect(() => root.validate(corruptRuntime)).toThrowError(CompositionError);
      try {
        root.validate(corruptRuntime);
      } catch (err) {
        expect((err as CompositionError).code).toBe('MISSING_PROVIDER');
      }
    });

    it('throws MISSING_HANDLER if a mandatory handler is missing from behavior registry', () => {
      const root = new ExperienceCompositionRoot();
      const runtime = root.compose();

      runtime.behaviorRegistry.unregister('packet-flow-handler');

      expect(() => root.validate(runtime)).toThrowError(CompositionError);
      try {
        root.validate(runtime);
      } catch (err) {
        expect((err as CompositionError).code).toBe('MISSING_HANDLER');
      }
    });

    it('throws MISSING_RENDERER_PORT if a mandatory renderer port is uninstalled', () => {
      const root = new ExperienceCompositionRoot();
      const runtime = root.compose();

      runtime.rendererEngine.unregister('threejs-renderer');

      expect(() => root.validate(runtime)).toThrowError(CompositionError);
      try {
        root.validate(runtime);
      } catch (err) {
        expect((err as CompositionError).code).toBe('MISSING_RENDERER_PORT');
      }
    });
  });

  describe('Deterministic Resource Cleanup (dispose)', () => {
    it('disposes all subsystems cleanly in reverse dependency order', () => {
      const runtime = ExperienceCompositionRoot.compose();

      expect(runtime.rendererEngine.isDisposed()).toBe(false);
      expect(runtime.timelineEngine.isDisposed()).toBe(false);
      expect(runtime.simulationRuntime.isDisposed()).toBe(false);

      runtime.dispose();

      expect(runtime.rendererEngine.isDisposed()).toBe(true);
      expect(runtime.timelineEngine.isDisposed()).toBe(true);
      expect(runtime.simulationRuntime.isDisposed()).toBe(true);
      expect(runtime.behaviorRegistry.list().length).toBe(0);
      expect(runtime.eventBus.getSubscriberCount()).toBe(0);
      expect(runtime.clock.time).toBe(0);
      expect(runtime.stateMachine.currentState()).toBe('LOAD');
    });

    it('is idempotent when dispose is invoked multiple times', () => {
      const runtime = ExperienceCompositionRoot.compose();

      expect(() => {
        runtime.dispose();
        runtime.dispose();
        runtime.dispose();
      }).not.toThrow();

      expect(runtime.rendererEngine.isDisposed()).toBe(true);
    });
  });
});
