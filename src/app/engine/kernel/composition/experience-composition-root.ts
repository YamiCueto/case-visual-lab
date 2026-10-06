import { AssetProvider } from '../../assets/contracts/asset-provider.interface';
import { AssetLoader } from '../../assets/loader/asset-loader';
import { BehaviorHandler } from '../../behaviors/contracts/behavior-handler.interface';
import {
  DatabaseWriteHandler,
  ErrorFlowHandler,
  NodePulseHandler,
  PacketFlowHandler,
  ResponseFlowHandler,
} from '../../behaviors/handlers';
import { BehaviorRegistry } from '../../behaviors/registry/behavior-registry';
import { RuntimeEventBus } from '../../event-bus/runtime-event-bus';
import { VirtualClock } from '../clock/virtual-clock';
import { RuntimeStateMachine } from '../state-machine/runtime-state-machine';
import { ExtensionRegistry } from '../../plugins/extensions/extension-registry';

import { PluginLifecycleManager } from '../../plugins/lifecycle/plugin-lifecycle-manager';
import { PluginLoader } from '../../plugins/loader/plugin-loader';
import { PluginRegistry } from '../../plugins/registry/plugin-registry';
import { RendererPort } from '../../rendering/contracts/renderer-port.interface';
import { RendererEngine } from '../../rendering/renderer-engine';
import { HttpSimulationProvider } from '../../simulation/providers/http/http-simulation-provider';
import { SimulationProvider } from '../../simulation/provider/simulation-provider.types';
import { SimulationRuntime } from '../../simulation/runtime/simulation-runtime';
import { TimelineEngine } from '../../timeline/timeline-engine';
import { ExcalidrawRendererAdapter } from '../../../infrastructure/renderers/excalidraw';
import { CameraRendererAdapter } from '../../../infrastructure/camera';
import { WebAudioRendererAdapter } from '../../../infrastructure/renderers/audio';
import { ThreeRendererAdapter } from '../../../infrastructure/renderers/three';
import { CompositionContext, PlatformRuntime } from './composition-context.interface';
import {
  CompositionError,
  IExperienceCompositionRoot,
} from './experience-composition-root.interface';

const MANDATORY_HANDLER_IDS = [
  'packet-flow-handler',
  'node-pulse-handler',
  'database-write-handler',
  'response-flow-handler',
  'error-flow-handler',
] as const;

const MANDATORY_RENDERER_PORT_IDS = [
  'excalidraw-renderer',
  'camera-renderer',
  'web-audio-renderer',
  'threejs-renderer',
] as const;

const MANDATORY_PROVIDER_IDS = ['http-simulation-provider'] as const;

class NullAssetProvider implements AssetProvider {
  async loadJson<T = unknown>(_uri: string): Promise<T> {
    void _uri;
    throw new CompositionError(
      'MISSING_DEPENDENCY',
      'No AssetProvider configured in CompositionContext.',
    );
  }

  async loadText(_uri: string): Promise<string> {
    void _uri;
    throw new CompositionError(
      'MISSING_DEPENDENCY',
      'No AssetProvider configured in CompositionContext.',
    );
  }

  async loadBinary(_uri: string): Promise<ArrayBuffer> {
    void _uri;
    throw new CompositionError(
      'MISSING_DEPENDENCY',
      'No AssetProvider configured in CompositionContext.',
    );
  }

  async exists(_uri: string): Promise<boolean> {
    void _uri;
    throw new CompositionError(
      'MISSING_DEPENDENCY',
      'No AssetProvider configured in CompositionContext.',
    );
  }
}

export class ExperienceCompositionRoot implements IExperienceCompositionRoot {
  static compose(context?: CompositionContext): PlatformRuntime {
    return new ExperienceCompositionRoot().compose(context);
  }

  compose(context?: CompositionContext): PlatformRuntime {
    this.validateDuplicateRegistrations(context);

    const eventBus = new RuntimeEventBus();
    const clock = new VirtualClock({
      initialTimeMs: context?.clockInitialTime ?? 0,
      defaultSpeed: 1.0,
    });
    const stateMachine = new RuntimeStateMachine({ initialState: 'LOAD' });
    const simulationRuntime = new SimulationRuntime();

    const simulationProviders = new Map<string, SimulationProvider>();
    const httpProvider = new HttpSimulationProvider();
    simulationProviders.set(httpProvider.providerId, httpProvider);

    if (context?.customProviders) {
      for (const provider of context.customProviders) {
        simulationProviders.set(provider.providerId, provider);
      }
    }

    const behaviorRegistry = new BehaviorRegistry();
    const standardHandlers: BehaviorHandler[] = [
      new PacketFlowHandler(),
      new NodePulseHandler(),
      new DatabaseWriteHandler(),
      new ResponseFlowHandler(),
      new ErrorFlowHandler(),
    ];

    for (const handler of standardHandlers) {
      behaviorRegistry.register(handler);
    }

    if (context?.customHandlers) {
      for (const handler of context.customHandlers) {
        behaviorRegistry.register(handler);
      }
    }

    const timelineEngine = new TimelineEngine();
    const rendererEngine = new RendererEngine();

    const standardRenderers: RendererPort[] = [
      new ExcalidrawRendererAdapter(),
      new CameraRendererAdapter(),
      new WebAudioRendererAdapter(),
      new ThreeRendererAdapter(),
    ];

    for (const renderer of standardRenderers) {
      rendererEngine.register(renderer);
    }

    if (context?.customRenderers) {
      for (const renderer of context.customRenderers) {
        rendererEngine.register(renderer);
      }
    }

    const assetProvider = context?.assetProvider ?? new NullAssetProvider();
    const assetEngine = new AssetLoader(assetProvider);

    const pluginRegistry = new PluginRegistry();
    const extensionRegistry = new ExtensionRegistry();
    const pluginLifecycle = new PluginLifecycleManager();
    const pluginLoader = new PluginLoader({
      engineVersion: context?.engineVersion ?? '0.3.0',
      registry: pluginRegistry,
      extensions: extensionRegistry,
      lifecycle: pluginLifecycle,
    });

    if (context?.customPlugins) {
      for (const plugin of context.customPlugins) {
        pluginLoader.register(plugin);
      }
    }

    try {
      pluginLoader.resolve(context?.engineVersion);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new CompositionError('INCOMPATIBLE_PLUGIN', message);
    }

    let isDisposed = false;

    const runtime: PlatformRuntime = {
      eventBus,
      clock,
      stateMachine,
      simulationRuntime,
      behaviorRegistry,
      timelineEngine,
      rendererEngine,
      assetEngine,
      pluginLoader,
      pluginRegistry,
      extensionRegistry,
      simulationProviders,

      getSimulationProvider(providerId: string): SimulationProvider | undefined {
        return simulationProviders.get(providerId);
      },

      listSimulationProviders(): readonly SimulationProvider[] {
        return Array.from(simulationProviders.values());
      },

      dispose(): void {
        if (isDisposed) {
          return;
        }
        isDisposed = true;

        rendererEngine.dispose();
        timelineEngine.dispose();
        simulationRuntime.dispose();
        void pluginLoader.dispose();
        behaviorRegistry.clear();
        eventBus.clear();
        clock.stop();
        stateMachine.reset('LOAD');
      },
    };

    this.validate(runtime);

    return runtime;
  }

  validate(runtime: PlatformRuntime): void {
    this.validateMandatoryDependencies(runtime);
    this.validateMandatoryProviders(runtime.simulationProviders);
    this.validateMandatoryHandlers(runtime.behaviorRegistry);
    this.validateMandatoryRendererPorts(runtime.rendererEngine);
  }

  private validateDuplicateRegistrations(context?: CompositionContext): void {
    if (!context) {
      return;
    }

    if (context.customProviders && context.customProviders.length > 0) {
      const seen = new Set<string>(MANDATORY_PROVIDER_IDS);
      for (const provider of context.customProviders) {
        if (seen.has(provider.providerId)) {
          throw new CompositionError(
            'DUPLICATE_REGISTRATION',
            `SimulationProvider ID "${provider.providerId}" is already registered.`,
          );
        }
        seen.add(provider.providerId);
      }
    }

    if (context.customHandlers && context.customHandlers.length > 0) {
      const seen = new Set<string>(MANDATORY_HANDLER_IDS);
      for (const handler of context.customHandlers) {
        if (seen.has(handler.id)) {
          throw new CompositionError(
            'DUPLICATE_REGISTRATION',
            `BehaviorHandler ID "${handler.id}" is already registered.`,
          );
        }
        seen.add(handler.id);
      }
    }

    if (context.customRenderers && context.customRenderers.length > 0) {
      const seen = new Set<string>(MANDATORY_RENDERER_PORT_IDS);
      for (const renderer of context.customRenderers) {
        if (seen.has(renderer.id)) {
          throw new CompositionError(
            'DUPLICATE_REGISTRATION',
            `RendererPort ID "${renderer.id}" is already registered.`,
          );
        }
        seen.add(renderer.id);
      }
    }

    if (context.customPlugins && context.customPlugins.length > 0) {
      const seen = new Set<string>();
      for (const plugin of context.customPlugins) {
        if (seen.has(plugin.descriptor.id)) {
          throw new CompositionError(
            'DUPLICATE_REGISTRATION',
            `Plugin ID "${plugin.descriptor.id}" is already registered.`,
          );
        }
        seen.add(plugin.descriptor.id);
      }
    }
  }

  private validateMandatoryDependencies(runtime: PlatformRuntime): void {
    const required: [keyof PlatformRuntime, unknown][] = [
      ['eventBus', runtime.eventBus],
      ['clock', runtime.clock],
      ['stateMachine', runtime.stateMachine],
      ['simulationRuntime', runtime.simulationRuntime],
      ['behaviorRegistry', runtime.behaviorRegistry],
      ['timelineEngine', runtime.timelineEngine],
      ['rendererEngine', runtime.rendererEngine],
      ['assetEngine', runtime.assetEngine],
      ['pluginLoader', runtime.pluginLoader],
      ['pluginRegistry', runtime.pluginRegistry],
      ['extensionRegistry', runtime.extensionRegistry],
      ['simulationProviders', runtime.simulationProviders],
    ];

    for (const [name, val] of required) {
      if (!val) {
        throw new CompositionError(
          'MISSING_DEPENDENCY',
          `Mandatory runtime dependency "${String(name)}" is missing or undefined.`,
        );
      }
    }
  }

  private validateMandatoryProviders(providers: ReadonlyMap<string, SimulationProvider>): void {
    for (const id of MANDATORY_PROVIDER_IDS) {
      if (!providers.has(id)) {
        throw new CompositionError(
          'MISSING_PROVIDER',
          `Mandatory simulation provider "${id}" is not registered.`,
        );
      }
    }
  }

  private validateMandatoryHandlers(registry: BehaviorRegistry): void {
    const registeredIds = new Set(registry.list().map((h) => h.id));
    for (const id of MANDATORY_HANDLER_IDS) {
      if (!registeredIds.has(id)) {
        throw new CompositionError(
          'MISSING_HANDLER',
          `Mandatory behavior handler "${id}" is not registered.`,
        );
      }
    }
  }

  private validateMandatoryRendererPorts(engine: RendererEngine): void {
    const registeredIds = new Set(engine.list().map((r) => r.id));
    for (const id of MANDATORY_RENDERER_PORT_IDS) {
      if (!registeredIds.has(id)) {
        throw new CompositionError(
          'MISSING_RENDERER_PORT',
          `Mandatory renderer port "${id}" is not registered.`,
        );
      }
    }
  }
}
