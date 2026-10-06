import { AssetLoader } from '../../assets/loader/asset-loader';
import { BehaviorRegistry } from '../../behaviors/registry/behavior-registry';
import { RuntimeEventBus } from '../../event-bus/runtime-event-bus';
import { VirtualClock } from '../../kernel/clock/virtual-clock';
import { PlatformRuntime } from '../../kernel/composition/composition-context.interface';
import { RuntimeStateMachine } from '../../kernel/state-machine/runtime-state-machine';
import { PluginLoader } from '../../plugins/loader/plugin-loader';
import { RendererEngine } from '../../rendering/renderer-engine';
import { SimulationRuntime } from '../../simulation/runtime/simulation-runtime';
import { TimelineEngine } from '../../timeline/timeline-engine';

export interface OrchestratorContext {
  readonly platformRuntime?: PlatformRuntime;
  readonly clock?: VirtualClock;
  readonly eventBus?: RuntimeEventBus;
  readonly stateMachine?: RuntimeStateMachine;
  readonly simulation?: SimulationRuntime;
  readonly timeline?: TimelineEngine;
  readonly behaviors?: BehaviorRegistry;
  readonly renderer?: RendererEngine;
  readonly assetLoader?: AssetLoader;
  readonly pluginLoader?: PluginLoader;
  readonly defaultDeltaTimeMs?: number;
}
