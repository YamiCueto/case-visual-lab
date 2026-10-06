import { beforeEach, describe, expect, it } from 'vitest';
import { RendererCommand } from '../../../engine/behaviors/commands/renderer-command.types';
import { RendererBatch } from '../../../engine/rendering/contracts/renderer-batch.types';
import { ThreeRendererAdapter } from './adapter/three-renderer.adapter';
import {
  Connection3DState,
  DEFAULT_THREE_SCENE_STATE,
  Node3DState,
  ParticleState,
  ThreeSceneState,
} from './contracts/particle-state.interface';
import { ThreeRenderContext } from './contracts/three-render-context.interface';
import { ThreeScene } from './contracts/three-scene.interface';
import { ParticleCommandMapper } from './mapping/particle-command-mapper';
import { ParticleDiff } from './mapping/particle-diff';
import { ParticleInterpolator } from './mapping/particle-interpolator';

class FakeThreeScene implements ThreeScene {
  private state: ThreeSceneState = { ...DEFAULT_THREE_SCENE_STATE };
  readonly spawned: ParticleState[] = [];
  readonly updated: ParticleState[] = [];
  readonly destroyed: string[] = [];
  readonly highlighted: Node3DState[] = [];
  readonly connections: Connection3DState[] = [];
  resetCount = 0;

  getState(): ThreeSceneState {
    return { ...this.state };
  }

  spawnParticle(particle: ParticleState): void {
    this.spawned.push({ ...particle });
    this.state = {
      ...this.state,
      particles: {
        ...this.state.particles,
        [particle.id]: { ...particle },
      },
    };
  }

  updateParticle(particle: ParticleState): void {
    this.updated.push({ ...particle });
    this.state = {
      ...this.state,
      particles: {
        ...this.state.particles,
        [particle.id]: { ...particle },
      },
    };
  }

  destroyParticle(particleId: string): void {
    this.destroyed.push(particleId);
    const next = { ...this.state.particles };
    delete next[particleId];
    this.state = {
      ...this.state,
      particles: next,
    };
  }

  highlightNode(node: Node3DState): void {
    this.highlighted.push({ ...node });
    this.state = {
      ...this.state,
      nodes: {
        ...this.state.nodes,
        [node.nodeId]: { ...node },
      },
    };
  }

  updateConnection(connection: Connection3DState): void {
    this.connections.push({ ...connection });
    this.state = {
      ...this.state,
      connections: {
        ...this.state.connections,
        [connection.connectionId]: { ...connection },
      },
    };
  }

  reset(): void {
    this.resetCount++;
    this.state = { ...DEFAULT_THREE_SCENE_STATE };
  }
}

describe('ThreeJsRendererAdapter Subsystem', () => {
  let scene: FakeThreeScene;
  let adapter: ThreeRendererAdapter;
  let mapper: ParticleCommandMapper;
  let interpolator: ParticleInterpolator;
  let diff: ParticleDiff;

  beforeEach(() => {
    scene = new FakeThreeScene();
    adapter = new ThreeRendererAdapter(scene);
    adapter.initialize();
    mapper = new ParticleCommandMapper();
    interpolator = new ParticleInterpolator();
    diff = new ParticleDiff();
  });

  describe('Contract and Support Verification', () => {
    it('should implement RendererPort properties and default priority', () => {
      expect(adapter.id).toBe('threejs-renderer');
      expect(adapter.priority).toBe(25);
      expect(adapter.isDisposed()).toBe(false);
      expect(adapter.getCurrentState()).toEqual(DEFAULT_THREE_SCENE_STATE);
    });

    it('should support all 3D/particle command types', () => {
      const supported = [
        'SPAWN_PARTICLE',
        'MOVE_PARTICLE',
        'DESTROY_PARTICLE',
        'HIGHLIGHT_NODE',
        'UPDATE_NODE_STATE',
        'UPDATE_CONNECTION',
      ];

      for (const type of supported) {
        const cmd = {
          id: 'c1',
          type,
          targetId: 't1',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        } as unknown as RendererCommand;

        expect(adapter.supports(cmd)).toBe(true);
      }
    });

    it('should reject foreign commands (audio, camera, excalidraw badge)', () => {
      const foreign = [
        'PLAY_AUDIO_CUE',
        'STOP_AUDIO_CUE',
        'FOCUS_CAMERA',
        'ZOOM_CAMERA',
        'UPDATE_BADGE',
        'SHOW_TOOLTIP',
      ];

      for (const type of foreign) {
        const cmd = {
          id: 'c_foreign',
          type,
          targetId: 't1',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        } as unknown as RendererCommand;

        expect(adapter.supports(cmd)).toBe(false);
        expect(mapper.mapCommand(cmd)).toBeNull();
      }
    });

    it('should return false for invalid or null command objects', () => {
      expect(adapter.supports(null as unknown as RendererCommand)).toBe(false);
      expect(adapter.supports({} as unknown as RendererCommand)).toBe(false);
    });
  });

  describe('ParticleCommandMapper', () => {
    it('should map SPAWN_PARTICLE with default and semantic colors', () => {
      const cmd: RendererCommand = {
        id: 'cmd_spawn',
        type: 'SPAWN_PARTICLE',
        targetId: 'node_src',
        payload: {
          particleId: 'pkt_101',
          sourceEntityId: 'node_src',
          targetEntityId: 'node_dst',
          semanticKind: 'error-packet',
          position: { x: 10, y: 20, z: 0 },
        },
        durationMs: 300,
        easing: 'ease-out',
        priority: 'HIGH',
      };

      const result = mapper.mapCommand(cmd, DEFAULT_THREE_SCENE_STATE);
      expect(result).not.toBeNull();
      const p = result?.particles['pkt_101'];
      expect(p).toBeDefined();
      expect(p?.id).toBe('pkt_101');
      expect(p?.sourceNodeId).toBe('node_src');
      expect(p?.targetNodeId).toBe('node_dst');
      expect(p?.semanticKind).toBe('error-packet');
      expect(p?.color).toBe('#EF4444');
      expect(p?.position).toEqual({ x: 10, y: 20, z: 0 });
      expect(p?.isAlive).toBe(true);
    });

    it('should map MOVE_PARTICLE updating destination and coordinates', () => {
      const existingParticle: ParticleState = {
        id: 'p1',
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0 },
        opacity: 1,
        color: '#00F2FE',
        isAlive: true,
      };

      const initialState: ThreeSceneState = {
        ...DEFAULT_THREE_SCENE_STATE,
        particles: { p1: existingParticle },
      };

      const cmd: RendererCommand = {
        id: 'cmd_move',
        type: 'MOVE_PARTICLE',
        targetId: 'p1',
        payload: {
          destination: { x: 100, y: 200, z: 10 },
          destinationEntityId: 'node_dst',
        },
        durationMs: 400,
        easing: 'ease-in-out',
        priority: 'NORMAL',
      };

      const next = mapper.mapCommand(cmd, initialState);
      const moved = next?.particles['p1'];
      expect(moved?.position).toEqual({ x: 100, y: 200, z: 10 });
      expect(moved?.targetNodeId).toBe('node_dst');
      expect(moved?.durationMs).toBe(400);
      expect(moved?.easing).toBe('ease-in-out');
    });

    it('should map DESTROY_PARTICLE removing particle', () => {
      const existingParticle: ParticleState = {
        id: 'p1',
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 0 },
        opacity: 1,
        color: '#00F2FE',
        isAlive: true,
      };

      const initialState: ThreeSceneState = {
        ...DEFAULT_THREE_SCENE_STATE,
        particles: { p1: existingParticle },
      };

      const cmd: RendererCommand = {
        id: 'cmd_del',
        type: 'DESTROY_PARTICLE',
        targetId: 'p1',
        payload: {},
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      };

      const next = mapper.mapCommand(cmd, initialState);
      expect(next?.particles['p1']).toBeUndefined();
    });

    it('should map HIGHLIGHT_NODE with color and reset flag', () => {
      const cmd: RendererCommand = {
        id: 'cmd_h',
        type: 'HIGHLIGHT_NODE',
        targetId: 'gateway',
        payload: {
          intent: 'success',
          intensity: 1.5,
        },
        durationMs: 150,
        easing: 'linear',
        priority: 'NORMAL',
      };

      const next = mapper.mapCommand(cmd, DEFAULT_THREE_SCENE_STATE);
      const node = next?.nodes['gateway'];
      expect(node?.highlighted).toBe(true);
      expect(node?.highlightColor).toBe('#10B981');
      expect(node?.intensity).toBe(1.5);

      const resetCmd: RendererCommand = {
        id: 'cmd_reset',
        type: 'HIGHLIGHT_NODE',
        targetId: 'gateway',
        payload: { reset: true },
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      };

      const afterReset = mapper.mapCommand(resetCmd, next!);
      expect(afterReset?.nodes['gateway']?.highlighted).toBe(false);
      expect(afterReset?.nodes['gateway']?.intensity).toBe(0);
    });

    it('should map UPDATE_NODE_STATE and UPDATE_CONNECTION', () => {
      const nodeCmd = {
        id: 'cmd_ns',
        type: 'UPDATE_NODE_STATE' as unknown as RendererCommand['type'],
        targetId: 'database',
        payload: { status: 'COMMITTED', customData: { rows: 42 } },
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const stateWithNode = mapper.mapCommand(nodeCmd, DEFAULT_THREE_SCENE_STATE);
      expect(stateWithNode?.nodes['database']?.status).toBe('COMMITTED');
      expect(stateWithNode?.nodes['database']?.customData?.['rows']).toBe(42);

      const connCmd = {
        id: 'cmd_conn',
        type: 'UPDATE_CONNECTION' as unknown as RendererCommand['type'],
        targetId: 'conn_client_gw',
        payload: {
          fromNodeId: 'client',
          toNodeId: 'gateway',
          active: true,
          color: '#00F2FE',
          lineWidth: 3,
        },
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const stateWithConn = mapper.mapCommand(connCmd, stateWithNode!);
      const conn = stateWithConn?.connections['conn_client_gw'];
      expect(conn?.active).toBe(true);
      expect(conn?.lineWidth).toBe(3);
      expect(conn?.fromNodeId).toBe('client');
      expect(conn?.toNodeId).toBe('gateway');
    });
  });

  describe('ParticleInterpolator', () => {
    const pStart: ParticleState = {
      id: 'p1',
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: { x: 0, y: 0, z: 0 },
      opacity: 1.0,
      color: '#000000',
      isAlive: true,
      easing: 'linear',
    };

    const pEnd: ParticleState = {
      id: 'p1',
      position: { x: 100, y: 200, z: 50 },
      scale: { x: 2, y: 2, z: 2 },
      rotation: { x: 90, y: 180, z: 45 },
      opacity: 0.0,
      color: '#FFFFFF',
      isAlive: true,
      easing: 'linear',
    };

    it('should interpolate position, scale, rotation and opacity at t=0, t=0.5, t=1', () => {
      const at0 = interpolator.interpolate(pStart, pEnd, 0);
      expect(at0.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(at0.opacity).toBe(1.0);

      const atHalf = interpolator.interpolate(pStart, pEnd, 0.5);
      expect(atHalf.position.x).toBeCloseTo(50, 4);
      expect(atHalf.position.y).toBeCloseTo(100, 4);
      expect(atHalf.position.z).toBeCloseTo(25, 4);
      expect(atHalf.scale.x).toBeCloseTo(1.5, 4);
      expect(atHalf.opacity).toBeCloseTo(0.5, 4);

      const at1 = interpolator.interpolate(pStart, pEnd, 1.0);
      expect(at1.position).toEqual({ x: 100, y: 200, z: 50 });
      expect(at1.scale).toEqual({ x: 2, y: 2, z: 2 });
      expect(at1.opacity).toBe(0.0);
    });

    it('should interpolate hex colors smoothly across spectrum', () => {
      const midColor = interpolator.interpolateColor('#000000', '#FFFFFF', 0.5);
      expect(midColor).toBe('#808080');

      const customHex = interpolator.interpolateColor('#FF0000', '#0000FF', 0.5);
      expect(customHex).toBe('#800080');
    });

    it('should support ease-in, ease-out and ease-in-out easing modes', () => {
      const easeIn = interpolator.interpolate(pStart, pEnd, 0.5, 'ease-in');
      const easeOut = interpolator.interpolate(pStart, pEnd, 0.5, 'ease-out');
      const easeInOut = interpolator.interpolate(pStart, pEnd, 0.5, 'ease-in-out');

      expect(easeIn.position.x).toBeLessThan(50);
      expect(easeOut.position.x).toBeGreaterThan(50);
      expect(easeInOut.position.x).toBeCloseTo(50, 4);
    });

    it('should clamp progress boundaries deterministically', () => {
      const below = interpolator.interpolate(pStart, pEnd, -0.5);
      expect(below.position.x).toBe(0);

      const above = interpolator.interpolate(pStart, pEnd, 1.5);
      expect(above.position.x).toBe(100);
    });
  });

  describe('ParticleDiff', () => {
    it('should detect zero changes for identical 3D states', () => {
      const state1: ThreeSceneState = {
        particles: {
          p1: {
            id: 'p1',
            position: { x: 10, y: 20, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0 },
            opacity: 1,
            color: '#00F2FE',
            isAlive: true,
          },
        },
        nodes: {},
        connections: {},
      };

      const result = diff.computeDiff(state1, state1);
      expect(result.hasChanges).toBe(false);
      expect(result.spawnedParticles.length).toBe(0);
      expect(result.updatedParticles.length).toBe(0);
      expect(result.destroyedParticleIds.length).toBe(0);
    });

    it('should accurately detect spawned, updated, and destroyed particles', () => {
      const stateA: ThreeSceneState = {
        particles: {
          p_existing: {
            id: 'p_existing',
            position: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0 },
            opacity: 1,
            color: '#00F2FE',
            isAlive: true,
          },
          p_to_del: {
            id: 'p_to_del',
            position: { x: 50, y: 50, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0 },
            opacity: 1,
            color: '#EF4444',
            isAlive: true,
          },
        },
        nodes: {},
        connections: {},
      };

      const stateB: ThreeSceneState = {
        particles: {
          p_existing: {
            ...stateA.particles['p_existing'],
            position: { x: 100, y: 100, z: 0 },
          },
          p_new: {
            id: 'p_new',
            position: { x: 20, y: 20, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0 },
            opacity: 1,
            color: '#10B981',
            isAlive: true,
          },
        },
        nodes: {
          gw: { nodeId: 'gw', highlighted: true, highlightColor: '#10B981' },
        },
        connections: {
          c1: { connectionId: 'c1', fromNodeId: 'a', toNodeId: 'b', active: true },
        },
      };

      const result = diff.computeDiff(stateA, stateB);
      expect(result.hasChanges).toBe(true);
      expect(result.spawnedParticles.length).toBe(1);
      expect(result.spawnedParticles[0].id).toBe('p_new');
      expect(result.updatedParticles.length).toBe(1);
      expect(result.updatedParticles[0].id).toBe('p_existing');
      expect(result.destroyedParticleIds).toContain('p_to_del');
      expect(result.highlightedNodes.length).toBe(1);
      expect(result.updatedConnections.length).toBe(1);
    });
  });

  describe('ThreeRendererAdapter Rendering and Integration', () => {
    it('should render SPAWN_PARTICLE batch and call scene.spawnParticle', () => {
      const batch: RendererBatch = {
        batchId: 'b_spawn',
        rendererId: adapter.id,
        priority: 'HIGH',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'SPAWN_PARTICLE',
            targetId: 'node_client',
            payload: {
              particleId: 'pkt_1',
              semanticKind: 'request-packet',
            },
            durationMs: 0,
            easing: 'linear',
            priority: 'HIGH',
          },
        ],
      };

      adapter.render(batch);

      expect(scene.spawned.length).toBe(1);
      expect(scene.spawned[0].id).toBe('pkt_1');
      expect(adapter.getRenderCount()).toBe(1);
      expect(adapter.getLastRenderedBatchId()).toBe('b_spawn');
    });

    it('should render MOVE_PARTICLE batch and call scene.updateParticle', () => {
      // First spawn particle
      adapter.render({
        batchId: 'b1',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'SPAWN_PARTICLE',
            targetId: 'client',
            payload: { particleId: 'p10' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      // Now move particle
      adapter.render({
        batchId: 'b2',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 50,
        commands: [
          {
            id: 'c2',
            type: 'MOVE_PARTICLE',
            targetId: 'p10',
            payload: { destination: { x: 300, y: 150, z: 0 } },
            durationMs: 250,
            easing: 'ease-out',
            priority: 'NORMAL',
          },
        ],
      });

      expect(scene.updated.length).toBe(1);
      expect(scene.updated[0].id).toBe('p10');
      expect(scene.updated[0].position.x).toBe(300);
    });

    it('should render DESTROY_PARTICLE batch and call scene.destroyParticle', () => {
      adapter.render({
        batchId: 'b_spawn',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'SPAWN_PARTICLE',
            targetId: 'n1',
            payload: { particleId: 'p_temp' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      adapter.render({
        batchId: 'b_destroy',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 100,
        commands: [
          {
            id: 'c2',
            type: 'DESTROY_PARTICLE',
            targetId: 'p_temp',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(scene.destroyed).toContain('p_temp');
    });

    it('should render HIGHLIGHT_NODE and UPDATE_CONNECTION batches', () => {
      adapter.render({
        batchId: 'b_overlay',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node_db',
            payload: { intent: 'error', intensity: 2.0 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
          {
            id: 'c2',
            type: 'UPDATE_CONNECTION' as unknown as RendererCommand['type'],
            targetId: 'wire_1',
            payload: { fromNodeId: 'svc', toNodeId: 'db', active: true },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
        ],
      });

      expect(scene.highlighted.length).toBe(1);
      expect(scene.highlighted[0].nodeId).toBe('node_db');
      expect(scene.connections.length).toBe(1);
      expect(scene.connections[0].connectionId).toBe('wire_1');
    });

    it('should safely ignore non-3D commands leaving scene untouched', () => {
      const batch: RendererBatch = {
        batchId: 'b_audio',
        rendererId: 'audio-renderer',
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'a1',
            type: 'PLAY_AUDIO_CUE',
            targetId: 'snd',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      adapter.render(batch);
      expect(scene.spawned.length).toBe(0);
      expect(scene.updated.length).toBe(0);
      expect(adapter.getLastRenderedBatchId()).toBe('b_audio');
    });

    it('should be idempotent when receiving identical batches', () => {
      const batch: RendererBatch = {
        batchId: 'b_idem',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node_redis',
            payload: { intent: 'success' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      adapter.render(batch);
      expect(scene.highlighted.length).toBe(1);

      // Repeat identical batch
      adapter.render(batch);
      expect(scene.highlighted.length).toBe(1);
    });

    it('should process multi-command batches deterministically in sequence', () => {
      const batch: RendererBatch = {
        batchId: 'b_multi_seq',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'SPAWN_PARTICLE',
            targetId: 'node1',
            payload: { particleId: 'p_flow', position: { x: 0, y: 0, z: 0 } },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
          {
            id: 'c2',
            type: 'MOVE_PARTICLE',
            targetId: 'p_flow',
            payload: { destination: { x: 50, y: 50, z: 0 } },
            durationMs: 100,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      adapter.render(batch);

      expect(scene.spawned.length).toBe(1);
      expect(scene.updated.length).toBe(1);
      expect(adapter.getCurrentState().particles['p_flow'].position.x).toBe(50);
    });
  });

  describe('Lifecycle and Disposal', () => {
    it('should initialize and attach scene via ThreeRenderContext', () => {
      const altScene = new FakeThreeScene();
      const fresh = new ThreeRendererAdapter();
      expect(fresh.getScene()).toBeUndefined();

      const context: ThreeRenderContext = {
        virtualTime: 0,
        frameNumber: 0,
        deltaTimeMs: 16,
        threeScene: altScene,
      };

      fresh.initialize(context);
      expect(fresh.getScene()).toBe(altScene);
    });

    it('should initialize and attach scene via metadata fallback', () => {
      const altScene = new FakeThreeScene();
      const fresh = new ThreeRendererAdapter();

      fresh.initialize({
        virtualTime: 0,
        frameNumber: 0,
        deltaTimeMs: 16,
        metadata: { threeScene: altScene },
      });

      expect(fresh.getScene()).toBe(altScene);
    });

    it('should delegate reset() to scene and restore DEFAULT_THREE_SCENE_STATE', () => {
      adapter.render({
        batchId: 'b_spawn',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'SPAWN_PARTICLE',
            targetId: 'n1',
            payload: { particleId: 'p_res' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(adapter.getCurrentState().particles['p_res']).toBeDefined();

      adapter.reset();
      expect(scene.resetCount).toBe(1);
      expect(adapter.getCurrentState()).toEqual(DEFAULT_THREE_SCENE_STATE);
    });

    it('should dispose resources cleanly and block subsequent renders', () => {
      adapter.dispose();

      expect(adapter.isDisposed()).toBe(true);
      expect(adapter.getScene()).toBeUndefined();

      adapter.render({
        batchId: 'b_post',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'SPAWN_PARTICLE',
            targetId: 'n',
            payload: { particleId: 'px' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(scene.spawned.length).toBe(0);

      expect(() => adapter.initialize()).toThrowError(/Cannot initialize disposed three renderer/);
    });

    it('should safely no-op when rendering with empty batch or commands', () => {
      adapter.render({
        batchId: 'b_empty',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [],
      });

      expect(scene.spawned.length).toBe(0);
      expect(adapter.getLastRenderedBatchId()).toBe('b_empty');
    });

    it('should safely no-op when rendering without attached scene', () => {
      const orphan = new ThreeRendererAdapter();
      orphan.render({
        batchId: 'b_orphan',
        rendererId: orphan.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'SPAWN_PARTICLE',
            targetId: 'n',
            payload: { particleId: 'p1' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(orphan.getRenderCount()).toBe(0);
    });

    it('should guarantee zero mutations on original batch and command inputs', () => {
      const payload = Object.freeze({ particleId: 'frozen_p', semanticKind: 'frozen' });
      const cmd: RendererCommand = Object.freeze({
        id: 'cmd_frozen',
        type: 'SPAWN_PARTICLE',
        targetId: 'frozen_p',
        payload,
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      });
      const batch: RendererBatch = Object.freeze({
        batchId: 'b_frozen',
        rendererId: adapter.id,
        commands: Object.freeze([cmd]),
        priority: 'NORMAL',
        virtualTime: 0,
      });

      expect(() => adapter.render(batch)).not.toThrow();
      expect(cmd.targetId).toBe('frozen_p');
      expect(payload.semanticKind).toBe('frozen');
    });
  });
});
