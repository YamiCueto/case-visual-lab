import { AssetLoader } from '../../assets/loader/asset-loader';
import { BehaviorRegistry } from '../../behaviors/registry/behavior-registry';
import { RuntimeEventBus } from '../../event-bus/runtime-event-bus';
import { VirtualClock } from '../../kernel/clock/virtual-clock';
import { RuntimeStateMachine } from '../../kernel/state-machine/runtime-state-machine';
import { RuntimeLifecycleState } from '../../kernel/state-machine/runtime-state-machine.types';
import { PluginLoader } from '../../plugins/loader/plugin-loader';
import { RendererEngine } from '../../rendering/renderer-engine';
import { SimulationRuntime } from '../../simulation/runtime/simulation-runtime';
import { TimelineEngine } from '../../timeline/timeline-engine';
import { ExecutionSession } from './execution-session.interface';
import { ExperienceContext } from './experience-context.interface';
import { RuntimeContext } from './runtime-context.interface';

export interface IExperienceOrchestrator {
  readonly state: RuntimeLifecycleState;
  readonly clock: VirtualClock;
  readonly eventBus: RuntimeEventBus;
  readonly stateMachine: RuntimeStateMachine;
  readonly simulation: SimulationRuntime;
  readonly timeline: TimelineEngine;
  readonly behaviors: BehaviorRegistry;
  readonly renderer: RendererEngine;
  readonly assetLoader: AssetLoader;
  readonly pluginLoader: PluginLoader;
  readonly context: ExperienceContext | null;
  readonly session: ExecutionSession | null;

  load(uriOrSlug: string): Promise<ExperienceContext>;
  initialize(): Promise<void>;
  play(): void;
  pause(): void;
  resume(): void;
  seek(targetTimeMs: number): Promise<void>;
  stop(): void;
  destroy(): Promise<void>;
  dispose(): Promise<void>;
  tick(deltaMs?: number): void;
  step(deltaMs?: number): void;
  runtimeContext(): RuntimeContext;
}
