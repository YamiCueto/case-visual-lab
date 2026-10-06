import { describe, expect, it } from 'vitest';
import { AssetProvider } from '../assets/contracts/asset-provider.interface';
import { ExperienceManifest } from '../assets/contracts/experience-manifest.types';
import { LegacyLessonManifest } from '../assets/contracts/legacy-lesson.types';
import { AssetLoader } from '../assets/loader/asset-loader';
import { RendererCommand } from '../behaviors/commands/renderer-command.types';
import { BehaviorExecutionContext } from '../behaviors/contracts/behavior-context.interface';
import { BehaviorHandler } from '../behaviors/contracts/behavior-handler.interface';
import { BehaviorRegistry } from '../behaviors/registry/behavior-registry';
import { RendererBatch } from '../rendering/contracts/renderer-batch.types';
import { RendererPort } from '../rendering/contracts/renderer-port.interface';
import { RendererEngine } from '../rendering/renderer-engine';
import { SimulationState } from '../simulation/contracts/simulation-state.types';
import { SimulationEvent } from '../simulation/events/simulation-event.types';
import {
  SimulationProvider,
  SimulationProviderInitResult,
  StepEvaluationResult,
} from '../simulation/provider/simulation-provider.types';
import { SimulationRuntime } from '../simulation/runtime/simulation-runtime';
import { ExperienceCompositionRoot } from '../kernel/composition';
import { OrchestratorError } from './contracts';
import { ExperienceOrchestrator } from './runtime/experience-orchestrator';

/**
 * In-memory provider for testing orchestrator loading.
 */
class MemoryProvider implements AssetProvider {
  private _storage = new Map<string, unknown>();

  set(uri: string, data: unknown): void {
    this._storage.set(uri, data);
  }

  async loadJson<T = unknown>(uri: string): Promise<T> {
    if (!this._storage.has(uri)) {
      throw new Error(`File not found: ${uri}`);
    }
    return JSON.parse(JSON.stringify(this._storage.get(uri))) as T;
  }

  async loadText(uri: string): Promise<string> {
    return String(this._storage.get(uri) ?? '');
  }

  async loadBinary(uri: string): Promise<ArrayBuffer> {
    void uri;
    return new ArrayBuffer(0);
  }

  async exists(uri: string): Promise<boolean> {
    return this._storage.has(uri);
  }
}

/**
 * Fake Simulation Provider for test scenarios.
 */
class FakeSimProvider implements SimulationProvider<
  { scenarioName: string },
  { stepCount: number }
> {
  readonly providerId = 'fake-sim-provider';
  readonly domain = 'test';

  initialize(
    scenario: { scenarioName: string },
    seed: number,
  ): SimulationProviderInitResult<{ stepCount: number }> {
    void scenario;
    void seed;
    return {
      initialState: {
        stepIndex: 0,
        virtualTimeMs: 0,
        variables: {},
        entities: {},
      },
      initialProviderState: { stepCount: 0 },
    };
  }

  step(
    state: SimulationState,
    providerState: Readonly<{ stepCount: number }>,
    deltaTimeMs: number,
  ): StepEvaluationResult<{ stepCount: number }> {
    const nextCount = (providerState?.stepCount ?? 0) + 1;
    const nextTime = state.virtualTimeMs + deltaTimeMs;

    const events: readonly SimulationEvent<Record<string, unknown>>[] = [
      {
        eventId: `sim_evt_${nextCount}`,
        type: 'PACKET_TRANSMITTED',
        sourceEntityId: 'client',
        targetEntityId: 'gateway',
        virtualTimeMs: nextTime,
        stepIndex: state.stepIndex + 1,
        sequence: nextCount,
        payload: { packetNumber: nextCount },
      },
    ];

    return {
      nextState: {
        stepIndex: state.stepIndex + 1,
        virtualTimeMs: nextTime,
        variables: state.variables,
        entities: state.entities,
      },
      providerState: { stepCount: nextCount },
      emittedEvents: events,
    };
  }
}

/**
 * Fake Renderer Port for test scenarios.
 */
class FakeRendererPort implements RendererPort {
  readonly id = 'fake-render-port';
  readonly priority = 100;

  renderedBatches: RendererBatch[] = [];
  isInit = false;
  isDisposed = false;

  initialize(): void {
    this.isInit = true;
  }

  supports(): boolean {
    return true;
  }

  render(batch: RendererBatch): void {
    this.renderedBatches.push(batch);
  }

  dispose(): void {
    this.isDisposed = true;
    this.isInit = false;
  }
}

/**
 * Fake Behavior Handler for test scenarios.
 */
class FakePacketHandler implements BehaviorHandler {
  readonly id = 'fake-packet-handler';

  supports(eventType: string): boolean {
    return eventType === 'PACKET_TRANSMITTED';
  }

  execute(
    event: SimulationEvent<unknown>,
    context: BehaviorExecutionContext,
  ): readonly RendererCommand[] {
    void context;
    const payload =
      typeof event.payload === 'object' && event.payload !== null
        ? (event.payload as Record<string, unknown>)
        : {};
    return [
      {
        id: `cmd_${event.eventId}`,
        type: 'SPAWN_PARTICLE',
        targetId: event.targetEntityId ?? 'target',
        payload,
        durationMs: 100,
        easing: 'linear',
        priority: 'NORMAL',
      },
    ];
  }

  metadata() {
    return {
      id: this.id,
      name: 'Fake Packet Handler',
      description: 'Translates packet transmitted event to particle spawn',
      supportedEventTypes: ['PACKET_TRANSMITTED'],
    };
  }
}

describe('ExperienceOrchestrator (Sprint 3 — Paso 11)', () => {
  const createModernManifest = (): ExperienceManifest => ({
    $schema: 'https://case-visual-lab.io/schemas/v2/experience-manifest.json',
    schemaVersion: '2.0.0',
    manifestVersion: '1.0.0',
    metadata: {
      id: 'exp_http_lifecycle',
      title: 'HTTP Request Lifecycle',
      category: 'networking',
      difficulty: 'intermediate',
      estimatedMinutes: 10,
    },
    profile: {
      type: 'lesson',
      policy: {
        allowFreeNavigation: true,
      },
    },
    simulation: {
      provider: 'fake-sim-provider',
    },
    timeline: {
      durationMs: 10000,
      tracks: [
        {
          id: 'track_visual',
          name: 'Visual Flow',
          type: 'VISUAL',
          frames: [
            {
              id: 'kf_0',
              time: 0,
              duration: 0,
              commands: [
                {
                  id: 'cmd_init',
                  type: 'FOCUS_CAMERA',
                  targetId: 'camera',
                  payload: {},
                  durationMs: 0,
                  easing: 'linear',
                  priority: 'NORMAL',
                },
              ],
            },
          ],
        },
      ],
      markers: [
        {
          id: 'marker_barrier_1',
          time: 500,
          name: 'Checkpoint 1',
          kind: 'BARRIER',
        },
      ],
    },
  });

  const createLegacyManifest = (): LegacyLessonManifest => ({
    id: 'legacy-clean-arch',
    title: 'Clean Architecture Lesson',
    category: 'Architecture',
    summary: 'Legacy ADR-004 lesson format',
    level: 'Intermediate',
    estimatedMinutes: 8,
    steps: [
      {
        step: 1,
        title: 'Domain Entities',
        explanation: 'The entities hold the core business rules.',
        sceneData: { elements: [{ id: 'e1' }] },
      },
    ],
  });

  const setupHarness = () => {
    const memoryProvider = new MemoryProvider();
    const assetLoader = new AssetLoader(memoryProvider);
    const renderer = new RendererEngine();
    const renderPort = new FakeRendererPort();
    renderer.register(renderPort);

    const simulation = new SimulationRuntime();
    const simProvider = new FakeSimProvider();
    simulation.initialize(simProvider, { scenarioName: 'test' });

    const behaviors = new BehaviorRegistry();
    behaviors.register(new FakePacketHandler());

    const orchestrator = new ExperienceOrchestrator({
      assetLoader,
      renderer,
      simulation,
      behaviors,
    });

    return {
      orchestrator,
      memoryProvider,
      renderPort,
      simulation,
      behaviors,
      renderer,
    };
  };

  describe('Startup Sequence (ADR-010 Section 7.1)', () => {
    it('should transition through LOAD -> VALIDATE -> BUILD -> INITIALIZE -> READY in order', async () => {
      const { orchestrator, memoryProvider, renderPort } = setupHarness();
      const manifest = createModernManifest();
      memoryProvider.set('content/experiences/http.experience.json', manifest);

      const events: string[] = [];
      orchestrator.eventBus.subscribe('*', (envelope) => {
        events.push(envelope.type);
      });

      expect(orchestrator.state).toBe('LOAD');

      const context = await orchestrator.load('http');

      expect(orchestrator.state).toBe('READY');
      expect(context.manifest.metadata.id).toBe('exp_http_lifecycle');
      expect(orchestrator.session?.experienceId).toBe('exp_http_lifecycle');
      expect(orchestrator.session?.activeProfile).toBe('lesson');
      expect(orchestrator.clock.time).toBe(0);
      expect(renderPort.isInit).toBe(true);

      // Verify strict event flow
      expect(events).toContain('EXPERIENCE_LOADING');
      expect(events).toContain('ASSET_LOADED');
      expect(events).toContain('EXPERIENCE_VALIDATED');
      expect(events).toContain('ENGINES_WIRED');
      expect(events).toContain('SYSTEM_INITIALIZED');
      expect(events).toContain('EXPERIENCE_READY');

      const loadIdx = events.indexOf('EXPERIENCE_LOADING');
      const valIdx = events.indexOf('EXPERIENCE_VALIDATED');
      const wiredIdx = events.indexOf('ENGINES_WIRED');
      const sysInitIdx = events.indexOf('SYSTEM_INITIALIZED');
      const readyIdx = events.indexOf('EXPERIENCE_READY');

      expect(loadIdx).toBeLessThan(valIdx);
      expect(valIdx).toBeLessThan(wiredIdx);
      expect(wiredIdx).toBeLessThan(sysInitIdx);
      expect(sysInitIdx).toBeLessThan(readyIdx);
    });

    it('should seamlessly load legacy ADR-004 lessons and initialize without error', async () => {
      const { orchestrator, memoryProvider } = setupHarness();
      const legacy = createLegacyManifest();
      memoryProvider.set('content/lessons/clean-arch.json', legacy);

      const context = await orchestrator.load('lessons/clean-arch');

      expect(orchestrator.state).toBe('READY');
      expect(context.originalFormat).toBe('legacy-lesson');
      expect(context.manifest.metadata.id).toBe('legacy-clean-arch');
      expect(context.manifest.profile.type).toBe('lesson');
    });
  });

  describe('Playback Controls & State Machine Integration', () => {
    it('should play, pause, resume, and stop with strict state transitions', async () => {
      const { orchestrator, memoryProvider } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');

      const events: string[] = [];
      orchestrator.eventBus.subscribe('*', (e) => events.push(e.type));

      // 1. Play
      orchestrator.play();
      expect(orchestrator.state).toBe('PLAYING');
      expect(events).toContain('EXPERIENCE_STARTED');

      // 2. Pause
      orchestrator.pause();
      expect(orchestrator.state).toBe('PAUSED');
      expect(events).toContain('EXPERIENCE_PAUSED');

      // 3. Resume
      orchestrator.resume();
      expect(orchestrator.state).toBe('PLAYING');
      expect(events).toContain('EXPERIENCE_RESUMED');

      // 4. Stop
      orchestrator.stop();
      expect(orchestrator.state).toBe('STOPPED');
      expect(orchestrator.clock.time).toBe(0);
      expect(events).toContain('EXPERIENCE_STOPPED');
    });

    it('should safely ignore invalid state triggers without corrupting state', async () => {
      const { orchestrator } = setupHarness();
      expect(orchestrator.state).toBe('LOAD');

      // Pausing when in LOAD should be a safe no-op
      orchestrator.pause();
      expect(orchestrator.state).toBe('LOAD');

      // Resuming when in LOAD should be a safe no-op
      orchestrator.resume();
      expect(orchestrator.state).toBe('LOAD');
    });
  });

  describe('Tick Loop & Pipeline Execution (ADR-010 Section 6)', () => {
    it('should execute the deterministic pipeline and dispatch frame commands on step()', async () => {
      const { orchestrator, memoryProvider, renderPort } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');
      orchestrator.play();

      let frameRenderedFired = false;
      orchestrator.eventBus.subscribe('FRAME_RENDERED', () => {
        frameRenderedFired = true;
      });

      // Execute one tick: 100ms
      orchestrator.step(100);

      expect(orchestrator.clock.time).toBe(100);
      expect(orchestrator.session?.frameSequence).toBe(1);
      expect(frameRenderedFired).toBe(true);

      // Verify that renderer port received batches from simulation and timeline
      expect(renderPort.renderedBatches.length).toBeGreaterThan(0);
      const allCmds = renderPort.renderedBatches.flatMap((b) => b.commands);
      expect(allCmds.some((c) => c.type === 'SPAWN_PARTICLE')).toBe(true);
    });

    it('should automatically pause when timeline encounters a barrier marker', async () => {
      const { orchestrator, memoryProvider } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');
      orchestrator.play();

      // Step up to barrier time (barrier is at 500ms)
      orchestrator.step(500);

      expect(orchestrator.state).toBe('PAUSED');
      expect(orchestrator.timeline.state()).toBe('PAUSED');
    });
  });

  describe('Seek Barrier & Deterministic Time Travel (ADR-010 Section 5.1)', () => {
    it('should perform fast-forward and rewind with historical snapshots', async () => {
      const { orchestrator, memoryProvider, renderPort } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');
      orchestrator.play();

      // Step to generate simulation history: t=100, t=200, t=300
      orchestrator.step(100);
      orchestrator.step(100);
      orchestrator.step(100);
      expect(orchestrator.clock.time).toBe(300);

      // Take snapshot in simulation to enable rewind
      orchestrator.simulation.snapshot();

      // Fast-forward seek to 800ms
      renderPort.renderedBatches = [];
      await orchestrator.seek(800);
      expect(orchestrator.clock.time).toBe(800);
      expect(orchestrator.state).toBe('PLAYING');

      // Rewind seek back to 200ms
      await orchestrator.seek(200);
      expect(orchestrator.clock.time).toBe(200);
      expect(orchestrator.state).toBe('PLAYING');
    });
  });

  describe('Shutdown Sequence & Leak Prevention (ADR-010 Section 7.2)', () => {
    it('should dispose in strict reverse topological order and block subsequent operations', async () => {
      const { orchestrator, memoryProvider, renderPort } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');
      orchestrator.play();

      expect(orchestrator.state).toBe('PLAYING');

      await orchestrator.dispose();

      expect(orchestrator.state).toBe('DESTROYED');
      expect(renderPort.isDisposed).toBe(true);
      expect(orchestrator.simulation.isDisposed()).toBe(true);
      expect(orchestrator.timeline.isDisposed()).toBe(true);
      expect(orchestrator.renderer.isDisposed()).toBe(true);
      expect(orchestrator.context).toBeNull();
      expect(orchestrator.session).toBeNull();

      // Subsequent operations throw operational error
      expect(() => orchestrator.play()).toThrow(/disposed/);
      expect(() => orchestrator.step()).toThrow(/disposed/);
      await expect(orchestrator.load('http')).rejects.toThrow(/disposed/);
    });
  });

  describe('Fault Isolation & Graceful Degradation (ADR-010 Section 8)', () => {
    it('should classify and isolate recoverable errors without halting playback', () => {
      const { orchestrator } = setupHarness();
      const report = orchestrator.faultIsolator.classify(
        new Error('Secondary audio cue failed'),
        'audio',
        100,
      );

      expect(report.severity).toBe('RECOVERABLE');
      expect(report.policy).toBe('DEGRADE_RENDER');

      orchestrator.faultIsolator.handle(report, orchestrator.stateMachine, orchestrator.eventBus);
      // State machine should not transition to ERROR on recoverable faults
      expect(orchestrator.state).not.toBe('ERROR');
    });

    it('should transition to ERROR state on fatal kernel faults', () => {
      const { orchestrator } = setupHarness();
      const report = orchestrator.faultIsolator.classify(
        new Error('Kernel memory corruption'),
        'kernel',
        100,
      );

      expect(report.severity).toBe('FATAL');
      expect(report.policy).toBe('HALT');

      orchestrator.faultIsolator.handle(report, orchestrator.stateMachine, orchestrator.eventBus);
      expect(orchestrator.state).toBe('ERROR');
    });
  });

  describe('Runtime Context & Getters', () => {
    it('should expose runtime context with clean facades', async () => {
      const { orchestrator, memoryProvider } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');

      const runtimeCtx = orchestrator.runtimeContext();
      expect(runtimeCtx.clock).toBe(orchestrator.clock);
      expect(runtimeCtx.eventBus).toBe(orchestrator.eventBus);
      expect(runtimeCtx.stateMachine).toBe(orchestrator.stateMachine);
      expect(runtimeCtx.extensions).toBeDefined();
      expect(runtimeCtx.sessionId).toBe(orchestrator.session?.id);

      // Verify engine getters
      expect(orchestrator.simulation).toBeDefined();
      expect(orchestrator.timeline).toBeDefined();
      expect(orchestrator.behaviors).toBeDefined();
      expect(orchestrator.renderer).toBeDefined();
      expect(orchestrator.assetLoader).toBeDefined();
      expect(orchestrator.pluginLoader).toBeDefined();
    });

    it('should allow recovery by reloading when in ERROR state', async () => {
      const { orchestrator, memoryProvider } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');
      expect(orchestrator.state).toBe('READY');

      // Trigger fatal error to transition to ERROR state
      const report = orchestrator.faultIsolator.classify(new Error('Fatal error'), 'kernel');
      orchestrator.faultIsolator.handle(report, orchestrator.stateMachine, orchestrator.eventBus);
      expect(orchestrator.state).toBe('ERROR');

      // Reloading from ERROR state transitions back to LOAD -> ... -> READY
      await orchestrator.load('http');
      expect(orchestrator.state).toBe('READY');
    });

    it('should safely ignore step with dt <= 0', async () => {
      const { orchestrator, memoryProvider } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');
      orchestrator.play();

      orchestrator.step(0);
      orchestrator.step(-5);
      expect(orchestrator.clock.time).toBe(0);
    });

    it('should handle non-Error objects and clear history in FaultIsolator', () => {
      const { orchestrator } = setupHarness();
      const report = orchestrator.faultIsolator.classify('String failure', 'plugin:test', 50);

      expect(report.severity).toBe('RECOVERABLE');
      expect(report.policy).toBe('ISOLATE_PLUGIN');
      expect(report.message).toBe('String failure');
      expect(orchestrator.faultIsolator.history().length).toBe(1);

      orchestrator.faultIsolator.clear();
      expect(orchestrator.faultIsolator.history().length).toBe(0);
    });

    it('should handle seek when simulation is not initialized', async () => {
      const memoryProvider = new MemoryProvider();
      const assetLoader = new AssetLoader(memoryProvider);
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());

      const orchestrator = new ExperienceOrchestrator({ assetLoader });
      await orchestrator.load('http');

      await orchestrator.seek(500);
      expect(orchestrator.clock.time).toBe(500);
    });

    it('should support tick() following the exact pipeline', async () => {
      const { orchestrator, memoryProvider, renderPort } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');
      orchestrator.play();

      renderPort.renderedBatches = [];
      orchestrator.tick(50);

      expect(orchestrator.clock.time).toBe(50);
      expect(orchestrator.session?.frameSequence).toBe(1);
      expect(renderPort.renderedBatches.length).toBeGreaterThan(0);
    });

    it('should support destroy() and be idempotent', async () => {
      const { orchestrator, memoryProvider } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');
      orchestrator.play();

      await orchestrator.destroy();
      expect(orchestrator.state).toBe('DESTROYED');

      await expect(orchestrator.destroy()).resolves.toBeUndefined();
      expect(orchestrator.state).toBe('DESTROYED');
    });

    it('should support two-phase load and initialize', async () => {
      const { orchestrator, memoryProvider } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());

      await orchestrator.load('http', false);
      expect(orchestrator.state).toBe('BUILD');

      await orchestrator.initialize();
      expect(orchestrator.state).toBe('READY');

      await expect(orchestrator.initialize()).resolves.toBeUndefined();
    });

    it('should throw typed OrchestratorError on invalid initialize transition', async () => {
      const { orchestrator, memoryProvider } = setupHarness();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());
      await orchestrator.load('http');
      orchestrator.play();

      await expect(orchestrator.initialize()).rejects.toThrow(OrchestratorError);
    });

    it('should integrate seamlessly with PlatformRuntime from ExperienceCompositionRoot', async () => {
      const memoryProvider = new MemoryProvider();
      memoryProvider.set('content/experiences/http.experience.json', createModernManifest());

      const platformRuntime = ExperienceCompositionRoot.compose({
        assetProvider: memoryProvider,
      });

      const orchestrator = new ExperienceOrchestrator({ platformRuntime });
      expect(orchestrator.state).toBe('LOAD');

      await orchestrator.load('http');
      expect(orchestrator.state).toBe('READY');

      orchestrator.play();
      expect(orchestrator.state).toBe('PLAYING');

      orchestrator.tick(16);
      expect(orchestrator.clock.time).toBe(16);

      orchestrator.pause();
      expect(orchestrator.state).toBe('PAUSED');

      orchestrator.resume();
      expect(orchestrator.state).toBe('PLAYING');

      orchestrator.stop();
      expect(orchestrator.state).toBe('STOPPED');

      await orchestrator.destroy();
      expect(orchestrator.state).toBe('DESTROYED');
    });
  });
});
