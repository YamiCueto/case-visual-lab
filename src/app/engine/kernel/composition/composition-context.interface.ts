import { AssetProvider } from '../../assets/contracts/asset-provider.interface';
import { AssetLoader } from '../../assets/loader/asset-loader';
import { BehaviorHandler } from '../../behaviors/contracts/behavior-handler.interface';
import { BehaviorRegistry } from '../../behaviors/registry/behavior-registry';
import { RuntimeEventBus } from '../../event-bus/runtime-event-bus';
import { VirtualClock } from '../clock/virtual-clock';
import { RuntimeStateMachine } from '../state-machine/runtime-state-machine';
import { Plugin } from '../../plugins/contracts/plugin.interface';
import { ExtensionRegistry } from '../../plugins/extensions/extension-registry';
import { PluginLoader } from '../../plugins/loader/plugin-loader';
import { PluginRegistry } from '../../plugins/registry/plugin-registry';
import { RendererPort } from '../../rendering/contracts/renderer-port.interface';
import { RendererEngine } from '../../rendering/renderer-engine';
import { SimulationProvider } from '../../simulation/provider/simulation-provider.types';
import { SimulationRuntime } from '../../simulation/runtime/simulation-runtime';
import { TimelineEngine } from '../../timeline/timeline-engine';

/**
 * Optional configuration and custom extension points supplied during platform composition.
 */
export interface CompositionContext {
  readonly assetProvider?: AssetProvider;
  readonly clockInitialTime?: number;
  readonly defaultDeltaTimeMs?: number;
  readonly engineVersion?: string;
  readonly customHandlers?: readonly BehaviorHandler[];
  readonly customProviders?: readonly SimulationProvider[];
  readonly customRenderers?: readonly RendererPort[];
  readonly customPlugins?: readonly Plugin[];
}

/**
 * The fully assembled, wired, and validated runtime platform.
 * Exposes readonly references to all subsystem engines without exposing mutating APIs.
 */
export interface PlatformRuntime {
  readonly eventBus: RuntimeEventBus;
  readonly clock: VirtualClock;
  readonly stateMachine: RuntimeStateMachine;
  readonly simulationRuntime: SimulationRuntime;
  readonly behaviorRegistry: BehaviorRegistry;
  readonly timelineEngine: TimelineEngine;
  readonly rendererEngine: RendererEngine;
  readonly assetEngine: AssetLoader;
  readonly pluginLoader: PluginLoader;
  readonly pluginRegistry: PluginRegistry;
  readonly extensionRegistry: ExtensionRegistry;
  readonly simulationProviders: ReadonlyMap<string, SimulationProvider>;

  /**
   * Retrieves a registered simulation provider by ID.
   */
  getSimulationProvider(providerId: string): SimulationProvider | undefined;

  /**
   * Lists all available simulation providers in the runtime.
   */
  listSimulationProviders(): readonly SimulationProvider[];

  /**
   * Deterministically disposes all engines and releases platform resources.
   */
  dispose(): void;
}
