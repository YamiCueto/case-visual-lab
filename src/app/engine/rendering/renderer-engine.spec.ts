import { describe, expect, it } from 'vitest';
import { RendererCommandBatch } from '../behaviors/commands/renderer-command-batch';
import { RendererCommand } from '../behaviors/commands/renderer-command.types';
import { RenderExecutionContext } from './contracts/render-context.interface';
import { RendererBatch } from './contracts/renderer-batch.types';
import { RendererPort } from './contracts/renderer-port.interface';
import { RendererRegistry } from './registry/renderer-registry';
import { RendererEngine } from './renderer-engine';

/**
 * Fake particle renderer for testing.
 */
class FakeParticleRenderer implements RendererPort {
  readonly id = 'fake-particle-renderer';
  readonly priority = 80;

  renderedBatches: RendererBatch[] = [];
  initialized = false;
  disposed = false;

  initialize(_context?: RenderExecutionContext): void {
    void _context;
    this.initialized = true;
  }

  supports(command: RendererCommand): boolean {
    return (
      command.type === 'SPAWN_PARTICLE' ||
      command.type === 'MOVE_PARTICLE' ||
      command.type === 'DESTROY_PARTICLE'
    );
  }

  render(batch: RendererBatch, _context?: RenderExecutionContext): void {
    void _context;
    this.renderedBatches.push(batch);
  }

  dispose(): void {
    this.disposed = true;
    this.initialized = false;
  }
}

/**
 * Fake camera renderer for testing.
 */
class FakeCameraRenderer implements RendererPort {
  readonly id = 'fake-camera-renderer';
  readonly priority = 100;

  renderedBatches: RendererBatch[] = [];
  initialized = false;
  disposed = false;

  initialize(_context?: RenderExecutionContext): void {
    void _context;
    this.initialized = true;
  }

  supports(command: RendererCommand): boolean {
    return command.type === 'FOCUS_CAMERA';
  }

  render(batch: RendererBatch, _context?: RenderExecutionContext): void {
    void _context;
    this.renderedBatches.push(batch);
  }

  dispose(): void {
    this.disposed = true;
    this.initialized = false;
  }
}

/**
 * Fake audio renderer for testing.
 */
class FakeAudioRenderer implements RendererPort {
  readonly id = 'fake-audio-renderer';
  readonly priority = 90;

  renderedBatches: RendererBatch[] = [];
  initialized = false;
  disposed = false;

  initialize(_context?: RenderExecutionContext): void {
    void _context;
    this.initialized = true;
  }

  supports(command: RendererCommand): boolean {
    return command.type === 'PLAY_AUDIO_CUE';
  }

  render(batch: RendererBatch, _context?: RenderExecutionContext): void {
    void _context;
    this.renderedBatches.push(batch);
  }

  dispose(): void {
    this.disposed = true;
    this.initialized = false;
  }
}

describe('RendererEngine & Universal Rendering Pipeline', () => {
  const createCommands = (): RendererCommand[] => [
    {
      id: 'cmd_cam',
      type: 'FOCUS_CAMERA',
      targetId: 'node_gateway',
      payload: { zoom: 2.0 },
      durationMs: 300,
      easing: 'ease-in-out',
      priority: 'HIGH',
    },
    {
      id: 'cmd_audio',
      type: 'PLAY_AUDIO_CUE',
      targetId: 'audio',
      payload: { cue: 'http_request_whoosh' },
      durationMs: 100,
      easing: 'linear',
      priority: 'LOW',
    },
    {
      id: 'cmd_spawn',
      type: 'SPAWN_PARTICLE',
      targetId: 'client',
      payload: { particleId: 'p1' },
      durationMs: 0,
      easing: 'linear',
      priority: 'NORMAL',
    },
    {
      id: 'cmd_move',
      type: 'MOVE_PARTICLE',
      targetId: 'p1',
      payload: { destination: 'node_gateway' },
      durationMs: 250,
      easing: 'ease-out',
      priority: 'NORMAL',
    },
  ];

  describe('Registry & Port Lifecycle', () => {
    it('should register, list, and unregister ports without switch statements', () => {
      const engine = new RendererEngine();
      const particlePort = new FakeParticleRenderer();
      const cameraPort = new FakeCameraRenderer();

      engine.register(particlePort);
      engine.register(cameraPort);

      // List returns ports sorted by priority descending: Camera (100) -> Particle (80)
      const list = engine.list();
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe('fake-camera-renderer');
      expect(list[1].id).toBe('fake-particle-renderer');

      engine.unregister('fake-particle-renderer');
      expect(engine.list()).toHaveLength(1);
      expect(engine.list()[0].id).toBe('fake-camera-renderer');
      expect(particlePort.disposed).toBe(true);

      // Unregistering non-existent port is safe no-op
      expect(() => engine.unregister('non-existent')).not.toThrow();
    });

    it('should initialize all ports upon engine initialization', () => {
      const engine = new RendererEngine();
      const particlePort = new FakeParticleRenderer();
      const audioPort = new FakeAudioRenderer();

      engine.register(particlePort);
      engine.register(audioPort);

      expect(particlePort.initialized).toBe(false);
      expect(audioPort.initialized).toBe(false);

      engine.initialize();

      expect(particlePort.initialized).toBe(true);
      expect(audioPort.initialized).toBe(true);
      expect(engine.isInitialized()).toBe(true);
    });

    it('should auto-initialize new ports if engine is already initialized', () => {
      const engine = new RendererEngine();
      engine.initialize();

      const cameraPort = new FakeCameraRenderer();
      expect(cameraPort.initialized).toBe(false);

      engine.register(cameraPort);
      expect(cameraPort.initialized).toBe(true);
    });
  });

  describe('RendererRegistry', () => {
    it('should register, get, list, and clear ports correctly', () => {
      const registry = new RendererRegistry();
      const p1 = new FakeParticleRenderer();
      const c1 = new FakeCameraRenderer();

      registry.register(p1);
      registry.register(c1);

      expect(registry.get('fake-particle-renderer')).toBe(p1);
      expect(registry.get('unknown')).toBeNull();

      // Sorted by priority descending: Camera (100) -> Particle (80)
      const list = registry.list();
      expect(list.map((p) => p.id)).toEqual(['fake-camera-renderer', 'fake-particle-renderer']);

      registry.clear();
      expect(registry.list()).toEqual([]);
      expect(registry.get('fake-particle-renderer')).toBeNull();
    });

    it('should resolve matching ports without switch statements', () => {
      const registry = new RendererRegistry();
      const p1 = new FakeParticleRenderer();
      const c1 = new FakeCameraRenderer();

      registry.register(p1);
      registry.register(c1);

      const camCmd: RendererCommand = {
        id: 'c1',
        type: 'FOCUS_CAMERA',
        targetId: 'cam',
        payload: {},
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      };

      const resolved = registry.resolve(camCmd);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].id).toBe('fake-camera-renderer');

      const orphanCmd: RendererCommand = {
        id: 'o1',
        type: 'HIGHLIGHT_NODE',
        targetId: 'unknown',
        payload: {},
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      };

      expect(registry.resolve(orphanCmd)).toEqual([]);
    });
  });

  describe('Dispatcher & Batch Execution', () => {
    it('should partition commands by target renderer and construct discrete RendererBatches', () => {
      const engine = new RendererEngine();
      const particlePort = new FakeParticleRenderer();
      const cameraPort = new FakeCameraRenderer();
      const audioPort = new FakeAudioRenderer();

      engine.register(particlePort);
      engine.register(cameraPort);
      engine.register(audioPort);
      engine.initialize();

      const commands = createCommands();
      engine.dispatch(commands, { virtualTime: 250, deltaTimeMs: 16 });

      // Camera renderer received 1 command
      expect(cameraPort.renderedBatches).toHaveLength(1);
      const camBatch = cameraPort.renderedBatches[0];
      expect(camBatch.rendererId).toBe('fake-camera-renderer');
      expect(camBatch.commands).toHaveLength(1);
      expect(camBatch.commands[0].id).toBe('cmd_cam');
      expect(camBatch.priority).toBe('HIGH');
      expect(camBatch.virtualTime).toBe(250);

      // Audio renderer received 1 command
      expect(audioPort.renderedBatches).toHaveLength(1);
      const audioBatch = audioPort.renderedBatches[0];
      expect(audioBatch.rendererId).toBe('fake-audio-renderer');
      expect(audioBatch.commands).toHaveLength(1);
      expect(audioBatch.commands[0].id).toBe('cmd_audio');

      // Particle renderer received 2 commands (SPAWN + MOVE)
      expect(particlePort.renderedBatches).toHaveLength(1);
      const particleBatch = particlePort.renderedBatches[0];
      expect(particleBatch.rendererId).toBe('fake-particle-renderer');
      expect(particleBatch.commands).toHaveLength(2);
      expect(particleBatch.commands[0].id).toBe('cmd_spawn');
      expect(particleBatch.commands[1].id).toBe('cmd_move');
    });

    it('should support dispatching a RendererCommandBatch instance directly', () => {
      const engine = new RendererEngine();
      const cameraPort = new FakeCameraRenderer();
      engine.register(cameraPort);
      engine.initialize();

      const batch = new RendererCommandBatch([
        {
          id: 'c_cam_1',
          type: 'FOCUS_CAMERA',
          targetId: 'cam',
          payload: {},
          durationMs: 100,
          easing: 'linear',
          priority: 'NORMAL',
        },
      ]);

      engine.dispatch(batch);
      expect(cameraPort.renderedBatches).toHaveLength(1);
      expect(cameraPort.renderedBatches[0].commands[0].id).toBe('c_cam_1');
    });

    it('should ignore commands with no matching renderer without crashing', () => {
      const engine = new RendererEngine();
      const cameraPort = new FakeCameraRenderer();
      engine.register(cameraPort);
      engine.initialize();

      // Dispatch an audio command when only camera renderer is registered
      const unhandledCommand: RendererCommand = {
        id: 'cmd_audio_orphan',
        type: 'PLAY_AUDIO_CUE',
        targetId: 'audio',
        payload: { cue: 'orphan' },
        durationMs: 50,
        easing: 'linear',
        priority: 'LOW',
      };

      expect(() => engine.dispatch([unhandledCommand])).not.toThrow();
      expect(cameraPort.renderedBatches).toHaveLength(0);
    });

    it('should handle empty command list as no-op', () => {
      const engine = new RendererEngine();
      const cameraPort = new FakeCameraRenderer();
      engine.register(cameraPort);
      engine.initialize();

      engine.dispatch([]);
      expect(cameraPort.renderedBatches).toHaveLength(0);
    });
  });

  describe('Deterministic Ordering and Priorities', () => {
    it('should compute batch priority based on highest contained command priority', () => {
      const engine = new RendererEngine();
      const particlePort = new FakeParticleRenderer();
      engine.register(particlePort);
      engine.initialize();

      const commands: RendererCommand[] = [
        {
          id: 'p1',
          type: 'SPAWN_PARTICLE',
          targetId: 'a',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'LOW',
        },
        {
          id: 'p2',
          type: 'MOVE_PARTICLE',
          targetId: 'b',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'CRITICAL',
        },
      ];

      engine.dispatch(commands);
      expect(particlePort.renderedBatches[0].priority).toBe('CRITICAL');
    });

    it('should preserve command sequence order inside each renderer batch', () => {
      const engine = new RendererEngine();
      const particlePort = new FakeParticleRenderer();
      engine.register(particlePort);
      engine.initialize();

      const commands: RendererCommand[] = [
        {
          id: 'step_1',
          type: 'SPAWN_PARTICLE',
          targetId: 'n1',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        },
        {
          id: 'step_2',
          type: 'MOVE_PARTICLE',
          targetId: 'n2',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        },
        {
          id: 'step_3',
          type: 'DESTROY_PARTICLE',
          targetId: 'n3',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        },
      ];

      engine.dispatch(commands);
      const batchCmds = particlePort.renderedBatches[0].commands;
      expect(batchCmds.map((c) => c.id)).toEqual(['step_1', 'step_2', 'step_3']);
    });

    it('should dispatch batches across multiple ports deterministically ordered by port priority', () => {
      const engine = new RendererEngine();
      const dispatchLog: string[] = [];

      const particlePort = new FakeParticleRenderer();
      const cameraPort = new FakeCameraRenderer();
      const audioPort = new FakeAudioRenderer();

      // Hook into render to observe execution order
      const originalParticleRender = particlePort.render.bind(particlePort);
      particlePort.render = (b, c) => {
        dispatchLog.push(particlePort.id);
        originalParticleRender(b, c);
      };

      const originalCameraRender = cameraPort.render.bind(cameraPort);
      cameraPort.render = (b, c) => {
        dispatchLog.push(cameraPort.id);
        originalCameraRender(b, c);
      };

      const originalAudioRender = audioPort.render.bind(audioPort);
      audioPort.render = (b, c) => {
        dispatchLog.push(audioPort.id);
        originalAudioRender(b, c);
      };

      // Register in random order
      engine.register(particlePort); // priority 80
      engine.register(cameraPort); // priority 100
      engine.register(audioPort); // priority 90
      engine.initialize();

      engine.dispatch(createCommands());

      // Deterministic priority ordering: camera (100) -> audio (90) -> particle (80)
      expect(dispatchLog).toEqual([
        'fake-camera-renderer',
        'fake-audio-renderer',
        'fake-particle-renderer',
      ]);
    });

    it('should pass execution context and metadata to port render call', () => {
      const engine = new RendererEngine();
      let capturedContext: RenderExecutionContext | undefined;

      const cameraPort = new FakeCameraRenderer();
      cameraPort.render = (_batch, ctx) => {
        capturedContext = ctx;
      };

      engine.register(cameraPort);
      engine.initialize();

      engine.dispatch(
        [
          {
            id: 'c1',
            type: 'FOCUS_CAMERA',
            targetId: 'cam',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
        {
          virtualTime: 500,
          frameNumber: 42,
          deltaTimeMs: 32,
          metadata: { layer: 'foreground' },
        },
      );

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.virtualTime).toBe(500);
      expect(capturedContext?.frameNumber).toBe(42);
      expect(capturedContext?.deltaTimeMs).toBe(32);
      expect(capturedContext?.metadata).toEqual({ layer: 'foreground' });
    });
  });

  describe('Disposal', () => {
    it('should dispose all registered ports and reject subsequent operations', () => {
      const engine = new RendererEngine();
      const particlePort = new FakeParticleRenderer();
      const cameraPort = new FakeCameraRenderer();

      engine.register(particlePort);
      engine.register(cameraPort);
      engine.initialize();

      expect(engine.isDisposed()).toBe(false);
      engine.dispose();

      expect(engine.isDisposed()).toBe(true);
      expect(engine.isInitialized()).toBe(false);
      expect(particlePort.disposed).toBe(true);
      expect(cameraPort.disposed).toBe(true);
      expect(engine.list()).toEqual([]);

      expect(() => engine.register(new FakeAudioRenderer())).toThrow(/disposed/);
      expect(() => engine.dispatch(createCommands())).toThrow(/disposed/);
      expect(() => engine.initialize()).toThrow(/disposed/);

      // Calling dispose multiple times is safe and idempotent
      expect(() => engine.dispose()).not.toThrow();
    });
  });
});
