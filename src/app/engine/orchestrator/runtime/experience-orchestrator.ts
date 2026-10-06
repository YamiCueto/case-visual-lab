import { AssetLoader } from '../../assets/loader/asset-loader';
import { BehaviorExecutionContext } from '../../behaviors/contracts/behavior-context.interface';
import { RendererCommand } from '../../behaviors/commands/renderer-command.types';
import { BehaviorRegistry } from '../../behaviors/registry/behavior-registry';
import { EventPriority } from '../../event-bus/event-envelope';
import { RuntimeEventBus } from '../../event-bus/runtime-event-bus';
import { VirtualClock } from '../../kernel/clock/virtual-clock';
import { RuntimeStateMachine } from '../../kernel/state-machine/runtime-state-machine';
import { RuntimeLifecycleState } from '../../kernel/state-machine/runtime-state-machine.types';
import { PluginLoader } from '../../plugins/loader/plugin-loader';
import { RendererEngine } from '../../rendering/renderer-engine';
import { SimulationRuntime } from '../../simulation/runtime/simulation-runtime';
import { TimelineEngine } from '../../timeline/timeline-engine';
import { TimelineFrame } from '../../timeline/contracts/timeline-frame.types';
import { TimelineMarker, TimelineMarkerKind } from '../../timeline/contracts/timeline-marker.types';
import {
  TimelineTrackDefinition,
  TimelineTrackType,
} from '../../timeline/contracts/timeline-track.types';
import { PauseBarrier } from '../barriers/pause-barrier';
import { SeekBarrier } from '../barriers/seek-barrier';
import { ExecutionSession } from '../contracts/execution-session.interface';
import { ExperienceContext } from '../contracts/experience-context.interface';
import { IExperienceOrchestrator } from '../contracts/experience-orchestrator.interface';
import { OrchestratorContext } from '../contracts/orchestrator-context.interface';
import { OrchestratorOptions } from '../contracts/orchestrator-options.interface';
import { OrchestratorError } from '../contracts/orchestrator-state.types';
import { PlatformRuntime } from '../../kernel/composition/composition-context.interface';
import { RuntimeContext } from '../contracts/runtime-context.interface';
import { FaultIsolator } from '../supervisor/fault-isolator';

export class ExperienceOrchestrator implements IExperienceOrchestrator {
  private readonly _clock: VirtualClock;
  private readonly _eventBus: RuntimeEventBus;
  private readonly _stateMachine: RuntimeStateMachine;
  private readonly _simulation: SimulationRuntime;
  private readonly _timeline: TimelineEngine;
  private readonly _behaviors: BehaviorRegistry;
  private readonly _renderer: RendererEngine;
  private readonly _assetLoader: AssetLoader;
  private readonly _pluginLoader: PluginLoader;
  private readonly _faultIsolator: FaultIsolator;
  private readonly _pauseBarrier: PauseBarrier;
  private readonly _seekBarrier: SeekBarrier;
  private readonly _defaultDeltaTimeMs: number;
  private readonly _platformRuntime?: PlatformRuntime;

  private _context: ExperienceContext | null = null;
  private _session: ExecutionSession | null = null;
  private _isDisposed = false;
  private _eventSequence = 0;
  private _tickNumber = 0;

  constructor(options?: OrchestratorContext & OrchestratorOptions) {
    const runtime = options?.platformRuntime;
    this._platformRuntime = runtime;

    this._clock = options?.clock ?? runtime?.clock ?? new VirtualClock();
    this._eventBus = options?.eventBus ?? runtime?.eventBus ?? new RuntimeEventBus();
    this._stateMachine =
      options?.stateMachine ??
      runtime?.stateMachine ??
      new RuntimeStateMachine({ initialState: 'LOAD' });
    this._simulation = options?.simulation ?? runtime?.simulationRuntime ?? new SimulationRuntime();
    this._timeline = options?.timeline ?? runtime?.timelineEngine ?? new TimelineEngine();
    this._behaviors = options?.behaviors ?? runtime?.behaviorRegistry ?? new BehaviorRegistry();
    this._renderer = options?.renderer ?? runtime?.rendererEngine ?? new RendererEngine();

    this._assetLoader =
      options?.assetLoader ??
      runtime?.assetEngine ??
      new AssetLoader({
        loadJson: async <T>() => ({}) as T,
        loadText: async () => '',
        loadBinary: async () => new ArrayBuffer(0),
        exists: async () => false,
      });

    this._pluginLoader = options?.pluginLoader ?? runtime?.pluginLoader ?? new PluginLoader();
    this._faultIsolator = new FaultIsolator();
    this._pauseBarrier = new PauseBarrier();
    this._seekBarrier = new SeekBarrier();
    this._defaultDeltaTimeMs = options?.defaultDeltaTimeMs ?? 16;
  }

  private emitEvent<T = unknown>(
    type: string,
    payload: T,
    priority: EventPriority = EventPriority.NORMAL,
  ): void {
    this._eventSequence += 1;
    this._eventBus.publish({
      id: `evt_${type}_${this._eventSequence}`,
      scope: 'internal',
      priority,
      channel: 'orchestrator',
      type,
      timestamp: 0,
      virtualTimeMs: this._clock.time,
      senderEngine: 'orchestrator',
      payload,
    });
  }

  async load(uriOrSlug: string, autoInitialize = true): Promise<ExperienceContext> {
    this.assertOperational();

    try {
      if (this._stateMachine.currentState() === 'ERROR') {
        this._stateMachine.transition('LOAD', `Reloading experience after error: ${uriOrSlug}`);
      } else if (this._stateMachine.currentState() !== 'LOAD') {
        this._clock.stop();
        this._timeline.stop();
        this._stateMachine.reset('LOAD');
      }

      this.emitEvent('EXPERIENCE_LOADING', { uri: uriOrSlug });
      const descriptor = await this._assetLoader.loadExperience(uriOrSlug);
      this.emitEvent('ASSET_LOADED', { descriptor });

      this._stateMachine.transition(
        'VALIDATE',
        'Validating manifest contracts and plugin capabilities',
      );
      this.emitEvent('EXPERIENCE_VALIDATED', { id: descriptor.manifest.metadata.id });

      this._stateMachine.transition('BUILD', 'Resolving dependencies and wiring engines');
      this._pluginLoader.resolve();

      this._context = {
        manifest: descriptor.manifest,
        sessionKey: `session_${descriptor.manifest.metadata.id}_${this._tickNumber}`,
        originalFormat: descriptor.originalFormat,
        schemaVersion: descriptor.schemaVersion,
        loadedAt: this._clock.time,
      };

      this._session = {
        id: this._context.sessionKey,
        experienceId: descriptor.manifest.metadata.id,
        startedAtTicks: this._tickNumber,
        frameSequence: 0,
        lastTickVirtualTime: 0,
        activeProfile: descriptor.manifest.profile.type,
      };

      this.emitEvent('ENGINES_WIRED', { sessionKey: this._context.sessionKey });

      if (descriptor.manifest.timeline) {
        const rawTracks = Array.isArray(descriptor.manifest.timeline.tracks)
          ? (descriptor.manifest.timeline.tracks as readonly Record<string, unknown>[])
          : [];
        const tracks: TimelineTrackDefinition[] = rawTracks.map((t, idx) => {
          const rawFrames = t['frames'];
          const rawKeyframes = t['keyframes'];
          let frames: readonly TimelineFrame[] = [];

          if (Array.isArray(rawFrames)) {
            frames = rawFrames as readonly TimelineFrame[];
          } else if (Array.isArray(rawKeyframes)) {
            const kfList = rawKeyframes as readonly Record<string, unknown>[];
            frames = kfList.map((kf, kfIdx) => ({
              id: typeof kf['id'] === 'string' ? kf['id'] : `frame_${kfIdx}`,
              time:
                typeof kf['time'] === 'number'
                  ? kf['time']
                  : typeof kf['timeMs'] === 'number'
                    ? kf['timeMs']
                    : 0,
              duration:
                typeof kf['duration'] === 'number'
                  ? kf['duration']
                  : typeof kf['durationMs'] === 'number'
                    ? kf['durationMs']
                    : 0,
              commands: Array.isArray(kf['commands'])
                ? (kf['commands'] as readonly RendererCommand[])
                : [],
            }));
          }

          return {
            id: typeof t['id'] === 'string' ? t['id'] : `track_${idx}`,
            type: (t['type'] ?? t['channel'] ?? 'VISUAL') as TimelineTrackType,
            name: typeof t['name'] === 'string' ? t['name'] : `Track ${idx}`,
            frames,
            muted: Boolean(t['muted']),
            priority: typeof t['priority'] === 'number' ? t['priority'] : 0,
          };
        });

        let markers: TimelineMarker[] = [];
        if (
          descriptor.manifest.timeline?.markers &&
          Array.isArray(descriptor.manifest.timeline.markers)
        ) {
          const rawMarkers = descriptor.manifest.timeline.markers as readonly Record<
            string,
            unknown
          >[];
          markers = rawMarkers.map((m, mIdx) => ({
            id: typeof m['id'] === 'string' ? m['id'] : `marker_${mIdx}`,
            name:
              typeof m['name'] === 'string'
                ? m['name']
                : typeof m['label'] === 'string'
                  ? m['label']
                  : `Marker ${mIdx}`,
            time:
              typeof m['time'] === 'number'
                ? m['time']
                : typeof m['timeMs'] === 'number'
                  ? m['timeMs']
                  : 0,
            kind: (m['kind'] ?? (m['isBarrier'] ? 'BARRIER' : 'CHECKPOINT')) as TimelineMarkerKind,
            payload: m['payload'] as Readonly<Record<string, unknown>> | undefined,
          }));
        }

        const durationMs =
          typeof descriptor.manifest.timeline.durationMs === 'number'
            ? descriptor.manifest.timeline.durationMs
            : undefined;

        this._timeline.load(tracks, markers, durationMs);
      } else {
        this._timeline.load([], []);
      }

      if (descriptor.manifest.simulation) {
        const providerId = descriptor.manifest.simulation.provider;
        const currentProvider = this._simulation.activeProvider();
        const provider =
          this._platformRuntime?.getSimulationProvider(providerId) ??
          (currentProvider?.providerId === providerId ? currentProvider : null);

        this._simulation.reset();

        if (provider) {
          const scenario =
            descriptor.manifest.simulation.scenario ??
            descriptor.manifest.simulation.initialVariables ??
            {};
          this._simulation.initialize(provider, scenario);
        }
      } else {
        this._simulation.reset();
      }

      if (autoInitialize) {
        await this.initialize();
      }

      return this._context;
    } catch (error) {
      const report = this._faultIsolator.classify(error, 'orchestrator:load', this._clock.time);
      this._faultIsolator.handle(report, this._stateMachine, this._eventBus);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    this.assertOperational();

    const currentState = this._stateMachine.currentState();
    if (currentState === 'READY') {
      return;
    }

    if (currentState !== 'BUILD') {
      throw new OrchestratorError(
        'INVALID_STATE_TRANSITION',
        `Cannot initialize orchestrator in state "${currentState}".`,
      );
    }

    try {
      this._stateMachine.transition(
        'INITIALIZE',
        'Initializing plugins, timeline, and renderer ports',
      );
      await this._pluginLoader.initialize();

      if (!this._renderer.isInitialized()) {
        this._renderer.initialize({
          virtualTime: 0,
          frameNumber: 0,
          deltaTimeMs: 0,
        });
      }

      this._clock.reset();
      this.emitEvent('SYSTEM_INITIALIZED', { sessionKey: this._context?.sessionKey });

      this._stateMachine.transition('READY', 'Experience is prepared for playback');
      this.emitEvent('EXPERIENCE_READY', { id: this._context?.manifest.metadata.id });
    } catch (error) {
      const report = this._faultIsolator.classify(
        error,
        'orchestrator:initialize',
        this._clock.time,
      );
      this._faultIsolator.handle(report, this._stateMachine, this._eventBus);
      throw error;
    }
  }

  play(): void {
    this.assertOperational();

    try {
      this._stateMachine.transition('PLAYING', 'User initiated playback');
      this._clock.play();
      this._timeline.play();
      this.emitEvent('EXPERIENCE_STARTED', {
        virtualTime: this._clock.time,
        tickNumber: this._tickNumber,
      });
    } catch (error) {
      const report = this._faultIsolator.classify(error, 'orchestrator:play', this._clock.time);
      this._faultIsolator.handle(report, this._stateMachine, this._eventBus);
      throw error;
    }
  }

  pause(): void {
    this.assertOperational();

    if (this._stateMachine.currentState() !== 'PLAYING') {
      return;
    }

    try {
      this._stateMachine.transition('PAUSED', 'User paused playback');
      this._clock.pause();
      this._pauseBarrier.execute(this._clock, this._timeline, this._renderer, this._eventBus);
    } catch (error) {
      const report = this._faultIsolator.classify(error, 'orchestrator:pause', this._clock.time);
      this._faultIsolator.handle(report, this._stateMachine, this._eventBus);
      throw error;
    }
  }

  resume(): void {
    this.assertOperational();

    if (this._stateMachine.currentState() !== 'PAUSED') {
      return;
    }

    try {
      this._stateMachine.transition('PLAYING', 'User resumed playback');
      this._clock.resume();
      this._timeline.resume();
      this.emitEvent('EXPERIENCE_RESUMED', {
        virtualTime: this._clock.time,
        tickNumber: this._tickNumber,
      });
    } catch (error) {
      const report = this._faultIsolator.classify(error, 'orchestrator:resume', this._clock.time);
      this._faultIsolator.handle(report, this._stateMachine, this._eventBus);
      throw error;
    }
  }

  async seek(targetTimeMs: number): Promise<void> {
    this.assertOperational();

    const previousState = this._stateMachine.currentState();

    try {
      this._stateMachine.transition('SEEKING', `Seek requested to ${targetTimeMs}ms`);

      this._seekBarrier.execute(
        targetTimeMs,
        this._clock,
        this._simulation,
        this._timeline,
        this._renderer,
        this._eventBus,
      );

      if (previousState === 'PLAYING') {
        this._stateMachine.transition('PLAYING', 'Resumed after seek');
        this._clock.play();
        this._timeline.play();
      } else if (previousState === 'PAUSED') {
        this._stateMachine.transition('PAUSED', 'Returned to pause after seek');
        this._clock.pause();
      } else if (previousState === 'STOPPED') {
        this._stateMachine.transition('STOPPED', 'Returned to stop after seek');
        this._clock.stop();
      } else {
        this._stateMachine.transition('READY', 'Seek completed in ready state');
      }
    } catch (error) {
      const report = this._faultIsolator.classify(error, 'orchestrator:seek', this._clock.time);
      this._faultIsolator.handle(report, this._stateMachine, this._eventBus);
      throw error;
    }
  }

  stop(): void {
    this.assertOperational();

    if (
      this._stateMachine.currentState() !== 'PLAYING' &&
      this._stateMachine.currentState() !== 'PAUSED' &&
      this._stateMachine.currentState() !== 'READY' &&
      this._stateMachine.currentState() !== 'SEEKING'
    ) {
      return;
    }

    try {
      this._stateMachine.transition('STOPPED', 'User stopped playback');
      this._clock.stop();
      this._timeline.stop();
      this._clock.reset();
      this._tickNumber = 0;
      this.emitEvent('EXPERIENCE_STOPPED', { virtualTime: 0 });
    } catch (error) {
      const report = this._faultIsolator.classify(error, 'orchestrator:stop', this._clock.time);
      this._faultIsolator.handle(report, this._stateMachine, this._eventBus);
      throw error;
    }
  }

  tick(deltaTimeMs?: number): void {
    this.assertOperational();

    const dt = deltaTimeMs ?? this._defaultDeltaTimeMs;
    if (dt <= 0) {
      return;
    }

    try {
      const newVirtualTime = this._clock.tick(dt);
      this._tickNumber += 1;

      if (this._session) {
        this._session.frameSequence += 1;
        this._session.lastTickVirtualTime = newVirtualTime;
      }

      const simEvents = this._simulation.isInitialized() ? this._simulation.step(dt) : [];

      const translatedCommands: RendererCommand[] = [];
      const simState = this._simulation.isInitialized()
        ? this._simulation.state()
        : { stepIndex: 0, virtualTimeMs: newVirtualTime, variables: {}, entities: {} };

      const behaviorContext: BehaviorExecutionContext = {
        virtualTime: newVirtualTime,
        simulationState: simState,
        variables: simState.variables,
        seed: 0,
      };

      for (const event of simEvents) {
        const batch = this._behaviors.execute(event, behaviorContext);
        translatedCommands.push(...batch.commands());
      }

      const timelineResult = this._timeline.tick(dt);
      const combinedCommands = [...translatedCommands, ...timelineResult.commands];

      if (combinedCommands.length > 0 && this._renderer.isInitialized()) {
        this._renderer.dispatch(combinedCommands, {
          virtualTime: newVirtualTime,
          frameNumber: this._session?.frameSequence ?? 0,
          deltaTimeMs: dt,
        });
      }

      if (timelineResult.hitBarrier && this._stateMachine.currentState() === 'PLAYING') {
        this.pause();
      }

      this.emitEvent('FRAME_RENDERED', {
        virtualTime: newVirtualTime,
        frameNumber: this._session?.frameSequence ?? 0,
        commandCount: combinedCommands.length,
        markers: timelineResult.activeMarkers.map((m) => m.id),
      });
    } catch (error) {
      const report = this._faultIsolator.classify(error, 'orchestrator:step', this._clock.time);
      this._faultIsolator.handle(report, this._stateMachine, this._eventBus);
      throw error;
    }
  }

  step(deltaTimeMs?: number): void {
    this.tick(deltaTimeMs);
  }

  async destroy(): Promise<void> {
    if (this._isDisposed) {
      return;
    }

    try {
      this._stateMachine.transition('DESTROYED', 'Disposing orchestrator runtime');
    } catch {
      void 0;
    }

    this._clock.reset();
    this._renderer.dispose();
    this._timeline.dispose();
    this._simulation.dispose();
    await this._pluginLoader.dispose();
    this._assetLoader.cache().clear();

    this.emitEvent('RUNTIME_DISPOSED', {});
    this._eventBus.clear();

    this._context = null;
    this._session = null;
    this._isDisposed = true;
  }

  async dispose(): Promise<void> {
    await this.destroy();
  }

  get state(): RuntimeLifecycleState {
    return this._stateMachine.currentState();
  }

  get session(): ExecutionSession | null {
    return this._session;
  }

  get context(): ExperienceContext | null {
    return this._context;
  }

  get clock(): VirtualClock {
    return this._clock;
  }

  get eventBus(): RuntimeEventBus {
    return this._eventBus;
  }

  get stateMachine(): RuntimeStateMachine {
    return this._stateMachine;
  }

  get simulation(): SimulationRuntime {
    return this._simulation;
  }

  get timeline(): TimelineEngine {
    return this._timeline;
  }

  get behaviors(): BehaviorRegistry {
    return this._behaviors;
  }

  get renderer(): RendererEngine {
    return this._renderer;
  }

  get assetLoader(): AssetLoader {
    return this._assetLoader;
  }

  get pluginLoader(): PluginLoader {
    return this._pluginLoader;
  }

  get faultIsolator(): FaultIsolator {
    return this._faultIsolator;
  }

  runtimeContext(): RuntimeContext {
    return {
      clock: this._clock,
      eventBus: this._eventBus,
      stateMachine: this._stateMachine,
      extensions: this._pluginLoader.extensions(),
      sessionId: this._session?.id ?? 'none',
    };
  }

  private assertOperational(): void {
    if (this._isDisposed) {
      throw new Error('ExperienceOrchestrator is disposed and cannot perform operations.');
    }
  }
}
