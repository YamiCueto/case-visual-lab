import { beforeEach, describe, expect, it } from 'vitest';
import { RendererCommand } from '../../engine/behaviors/commands/renderer-command.types';
import { RendererBatch } from '../../engine/rendering/contracts/renderer-batch.types';
import { CameraRendererAdapter } from './adapter/camera-renderer.adapter';
import { CameraRenderContext } from './contracts/camera-render-context.interface';
import { CameraScene } from './contracts/camera-scene.interface';
import { CameraState, DEFAULT_CAMERA_STATE } from './contracts/camera-state.interface';
import { CameraCommandMapper } from './mapping/camera-command-mapper';
import { CameraDiff } from './mapping/camera-diff';
import { CameraInterpolator } from './mapping/camera-interpolator';

class FakeCameraScene implements CameraScene {
  private state: CameraState = { ...DEFAULT_CAMERA_STATE };
  readonly setCalls: CameraState[] = [];
  resetCallCount = 0;

  getCamera(): CameraState {
    return { ...this.state };
  }

  setCamera(state: CameraState): void {
    this.state = { ...state };
    this.setCalls.push({ ...state });
  }

  reset(): void {
    this.state = { ...DEFAULT_CAMERA_STATE };
    this.resetCallCount++;
  }
}

describe('Camera Infrastructure Subsystem', () => {
  let scene: FakeCameraScene;
  let adapter: CameraRendererAdapter;
  let mapper: CameraCommandMapper;
  let interpolator: CameraInterpolator;
  let diff: CameraDiff;

  beforeEach(() => {
    scene = new FakeCameraScene();
    adapter = new CameraRendererAdapter(scene);
    adapter.initialize();
    mapper = new CameraCommandMapper();
    interpolator = new CameraInterpolator();
    diff = new CameraDiff();
  });

  describe('CameraCommandMapper', () => {
    it('should identify supported camera commands', () => {
      const supported = [
        'FOCUS_CAMERA',
        'MOVE_CAMERA',
        'ZOOM_CAMERA',
        'ROTATE_CAMERA',
        'RESET_CAMERA',
      ];
      for (const type of supported) {
        const cmd = {
          id: 'c1',
          type,
          targetId: 'node-1',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        } as unknown as RendererCommand;
        expect(mapper.supports(cmd)).toBe(true);
      }
    });

    it('should reject foreign commands', () => {
      const foreign = [
        'SPAWN_PARTICLE',
        'MOVE_PARTICLE',
        'DESTROY_PARTICLE',
        'HIGHLIGHT_NODE',
        'UPDATE_BADGE',
        'PLAY_AUDIO_CUE',
      ];
      for (const type of foreign) {
        const cmd = {
          id: 'c2',
          type,
          targetId: 'node-1',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        } as unknown as RendererCommand;
        expect(mapper.supports(cmd)).toBe(false);
        expect(mapper.mapCommand(cmd)).toBeNull();
      }
    });

    it('should map FOCUS_CAMERA command into CameraState', () => {
      const cmd: RendererCommand = {
        id: 'cmd_focus',
        type: 'FOCUS_CAMERA',
        targetId: 'target-node',
        payload: {
          zoom: 2.5,
          offset: { x: 50, y: -20 },
        },
        durationMs: 400,
        easing: 'ease-out',
        priority: 'HIGH',
      };

      const result = mapper.mapCommand(cmd, DEFAULT_CAMERA_STATE);
      expect(result).not.toBeNull();
      expect(result?.target).toBe('target-node');
      expect(result?.zoom).toBe(2.5);
      expect(result?.offset.x).toBe(50);
      expect(result?.offset.y).toBe(-20);
      expect(result?.transition?.durationMs).toBe(400);
      expect(result?.transition?.easing).toBe('ease-out');
    });

    it('should map MOVE_CAMERA command into CameraState', () => {
      const cmd = {
        id: 'cmd_move',
        type: 'MOVE_CAMERA',
        targetId: '',
        payload: {
          x: 120,
          y: 340,
          z: 10,
        },
        durationMs: 300,
        easing: 'ease-in-out',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const result = mapper.mapCommand(cmd, DEFAULT_CAMERA_STATE);
      expect(result?.offset.x).toBe(120);
      expect(result?.offset.y).toBe(340);
      expect(result?.offset.z).toBe(10);
      expect(result?.transition?.durationMs).toBe(300);
    });

    it('should map ZOOM_CAMERA command into CameraState', () => {
      const cmd = {
        id: 'cmd_zoom',
        type: 'ZOOM_CAMERA',
        targetId: '',
        payload: { level: 1.8 },
        durationMs: 250,
        easing: 'linear',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const result = mapper.mapCommand(cmd, DEFAULT_CAMERA_STATE);
      expect(result?.zoom).toBe(1.8);
      expect(result?.transition?.durationMs).toBe(250);
    });

    it('should map ROTATE_CAMERA command into CameraState', () => {
      const cmd = {
        id: 'cmd_rotate',
        type: 'ROTATE_CAMERA',
        targetId: '',
        payload: { angle: 45 },
        durationMs: 500,
        easing: 'ease-in',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const result = mapper.mapCommand(cmd, DEFAULT_CAMERA_STATE);
      expect(result?.rotation).toBe(45);
      expect(result?.transition?.durationMs).toBe(500);
      expect(result?.transition?.easing).toBe('ease-in');
    });

    it('should map RESET_CAMERA command restoring default values', () => {
      const currentModified: CameraState = {
        target: 'some-target',
        zoom: 3.0,
        rotation: 90,
        offset: { x: 500, y: 500, z: 50 },
      };

      const cmd = {
        id: 'cmd_reset',
        type: 'RESET_CAMERA',
        targetId: '',
        payload: { durationMs: 200 },
        durationMs: 200,
        easing: 'linear',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const result = mapper.mapCommand(cmd, currentModified);
      expect(result?.target).toBeNull();
      expect(result?.zoom).toBe(1.0);
      expect(result?.rotation).toBe(0);
      expect(result?.offset.x).toBe(0);
      expect(result?.offset.y).toBe(0);
      expect(result?.transition?.durationMs).toBe(200);
    });
  });

  describe('CameraInterpolator', () => {
    const stateA: CameraState = {
      target: 'node-A',
      zoom: 1.0,
      rotation: 0,
      offset: { x: 0, y: 0, z: 0 },
    };

    const stateB: CameraState = {
      target: 'node-B',
      zoom: 2.0,
      rotation: 90,
      offset: { x: 100, y: 200, z: 50 },
      transition: { durationMs: 500, easing: 'linear' },
    };

    it('should interpolate linear state deterministically at t=0, t=0.5, t=1', () => {
      const at0 = interpolator.interpolate(stateA, stateB, 0);
      expect(at0.zoom).toBe(1.0);
      expect(at0.offset.x).toBe(0);
      expect(at0.target).toBe('node-A');

      const atHalf = interpolator.interpolate(stateA, stateB, 0.5);
      expect(atHalf.zoom).toBeCloseTo(1.5, 4);
      expect(atHalf.rotation).toBeCloseTo(45, 4);
      expect(atHalf.offset.x).toBeCloseTo(50, 4);
      expect(atHalf.offset.y).toBeCloseTo(100, 4);
      expect(atHalf.offset.z).toBeCloseTo(25, 4);
      expect(atHalf.target).toBe('node-B');

      const at1 = interpolator.interpolate(stateA, stateB, 1.0);
      expect(at1.zoom).toBe(2.0);
      expect(at1.rotation).toBe(90);
      expect(at1.offset.x).toBe(100);
      expect(at1.offset.y).toBe(200);
      expect(at1.offset.z).toBe(50);
      expect(at1.target).toBe('node-B');
    });

    it('should support ease-in, ease-out, and ease-in-out curves', () => {
      const easeIn = interpolator.interpolate(stateA, stateB, 0.5, 'ease-in');
      const easeOut = interpolator.interpolate(stateA, stateB, 0.5, 'ease-out');
      const easeInOut = interpolator.interpolate(stateA, stateB, 0.5, 'ease-in-out');

      expect(easeIn.zoom).toBeLessThan(1.5);
      expect(easeOut.zoom).toBeGreaterThan(1.5);
      expect(easeInOut.zoom).toBeCloseTo(1.5, 4);
    });

    it('should clamp progress below 0 and above 1', () => {
      const belowZero = interpolator.interpolate(stateA, stateB, -0.5);
      expect(belowZero.zoom).toBe(1.0);

      const aboveOne = interpolator.interpolate(stateA, stateB, 1.5);
      expect(aboveOne.zoom).toBe(2.0);
    });

    it('should guarantee mathematical determinism on repeated calls', () => {
      const res1 = interpolator.interpolate(stateA, stateB, 0.333, 'ease-out');
      const res2 = interpolator.interpolate(stateA, stateB, 0.333, 'ease-out');

      expect(res1.zoom).toBe(res2.zoom);
      expect(res1.rotation).toBe(res2.rotation);
      expect(res1.offset.x).toBe(res2.offset.x);
      expect(res1.offset.y).toBe(res2.offset.y);
      expect(res1.offset.z).toBe(res2.offset.z);
    });
  });

  describe('CameraDiff', () => {
    it('should detect zero changes for identical camera states', () => {
      const state1: CameraState = {
        target: 'node-1',
        zoom: 1.5,
        rotation: 30,
        offset: { x: 10, y: 20, z: 0 },
      };
      const state2: CameraState = {
        target: 'node-1',
        zoom: 1.5,
        rotation: 30,
        offset: { x: 10, y: 20, z: 0 },
      };

      const result = diff.computeDiff(state1, state2);
      expect(result.hasChanges).toBe(false);
      expect(result.changedProperties.length).toBe(0);
    });

    it('should accurately identify specific changed properties', () => {
      const state1: CameraState = {
        target: 'node-1',
        zoom: 1.0,
        rotation: 0,
        offset: { x: 0, y: 0, z: 0 },
      };
      const state2: CameraState = {
        target: 'node-2',
        zoom: 1.8,
        rotation: 0,
        offset: { x: 50, y: 0, z: 0 },
      };

      const result = diff.computeDiff(state1, state2);
      expect(result.hasChanges).toBe(true);
      expect(result.targetChanged).toBe(true);
      expect(result.zoomChanged).toBe(true);
      expect(result.rotationChanged).toBe(false);
      expect(result.offsetChanged).toBe(true);
      expect(result.changedProperties).toContain('target');
      expect(result.changedProperties).toContain('zoom');
      expect(result.changedProperties).toContain('offset');
      expect(result.changedProperties).not.toContain('rotation');
    });
  });

  describe('CameraRendererAdapter Lifecycle and Execution', () => {
    it('should implement RendererPort properties', () => {
      expect(adapter.id).toBe('camera-renderer');
      expect(adapter.priority).toBe(20);
      expect(adapter.isDisposed()).toBe(false);
      expect(adapter.getCurrentState()).toEqual(DEFAULT_CAMERA_STATE);
    });

    it('should initialize and attach scene via context', () => {
      const altScene = new FakeCameraScene();
      const freshAdapter = new CameraRendererAdapter();
      expect(freshAdapter.getScene()).toBeUndefined();

      const context: CameraRenderContext = {
        virtualTime: 0,
        frameNumber: 0,
        deltaTimeMs: 16,
        cameraScene: altScene,
      };

      freshAdapter.initialize(context);
      expect(freshAdapter.getScene()).toBe(altScene);
    });

    it('should initialize and attach scene via metadata fallback', () => {
      const altScene = new FakeCameraScene();
      const freshAdapter = new CameraRendererAdapter();

      freshAdapter.initialize({
        virtualTime: 0,
        frameNumber: 0,
        deltaTimeMs: 16,
        metadata: { cameraScene: altScene },
      });

      expect(freshAdapter.getScene()).toBe(altScene);
    });

    it('should render FOCUS_CAMERA and update scene camera', () => {
      const batch: RendererBatch = {
        batchId: 'b_cam_1',
        rendererId: adapter.id,
        priority: 'HIGH',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'FOCUS_CAMERA',
            targetId: 'gateway-node',
            payload: { zoom: 2.0 },
            durationMs: 300,
            easing: 'ease-out',
            priority: 'HIGH',
          },
        ],
      };

      adapter.render(batch);

      expect(scene.setCalls.length).toBe(1);
      const state = adapter.getCurrentState();
      expect(state.target).toBe('gateway-node');
      expect(state.zoom).toBe(2.0);
      expect(state.transition?.durationMs).toBe(300);
      expect(adapter.getRenderCount()).toBe(1);
      expect(adapter.getLastRenderedBatchId()).toBe('b_cam_1');
    });

    it('should ignore non-camera commands and leave scene untouched', () => {
      const batch: RendererBatch = {
        batchId: 'b_particles',
        rendererId: 'three-renderer',
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'p1',
            type: 'SPAWN_PARTICLE',
            targetId: 'n1',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
          {
            id: 'p2',
            type: 'MOVE_PARTICLE',
            targetId: 'n1',
            payload: {},
            durationMs: 200,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      adapter.render(batch);
      expect(scene.setCalls.length).toBe(0);
      expect(adapter.getLastRenderedBatchId()).toBe('b_particles');
    });

    it('should be idempotent when receiving identical commands', () => {
      const batch: RendererBatch = {
        batchId: 'b_same',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'FOCUS_CAMERA',
            targetId: 'node-x',
            payload: { zoom: 1.5 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      adapter.render(batch);
      expect(scene.setCalls.length).toBe(1);

      adapter.render(batch);
      expect(scene.setCalls.length).toBe(1);
    });

    it('should process multi-command batches in sequential order', () => {
      const batch: RendererBatch = {
        batchId: 'b_sequence',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 100,
        commands: [
          {
            id: 'c1',
            type: 'MOVE_CAMERA' as unknown as RendererCommand['type'],
            targetId: '',
            payload: { x: 50, y: 50 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
          {
            id: 'c2',
            type: 'ZOOM_CAMERA' as unknown as RendererCommand['type'],
            targetId: '',
            payload: { level: 2.2 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
          {
            id: 'c3',
            type: 'ROTATE_CAMERA' as unknown as RendererCommand['type'],
            targetId: '',
            payload: { angle: 180 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
        ],
      };

      adapter.render(batch);

      const finalState = adapter.getCurrentState();
      expect(finalState.offset.x).toBe(50);
      expect(finalState.offset.y).toBe(50);
      expect(finalState.zoom).toBe(2.2);
      expect(finalState.rotation).toBe(180);
    });

    it('should delegate reset() to scene and restore default camera state', () => {
      adapter.render({
        batchId: 'b_mod',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'FOCUS_CAMERA',
            targetId: 'target-1',
            payload: { zoom: 3.0 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(adapter.getCurrentState().target).toBe('target-1');

      adapter.reset();

      expect(scene.resetCallCount).toBe(1);
      expect(adapter.getCurrentState()).toEqual(DEFAULT_CAMERA_STATE);
    });

    it('should handle dispose cleanly and prevent subsequent operations', () => {
      adapter.dispose();

      expect(adapter.isDisposed()).toBe(true);
      expect(adapter.getScene()).toBeUndefined();

      adapter.render({
        batchId: 'b_post_dispose',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'FOCUS_CAMERA',
            targetId: 'target-1',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(scene.setCalls.length).toBe(0);

      expect(() => adapter.initialize()).toThrowError(/Cannot initialize disposed camera renderer/);
    });

    it('should safely no-op when rendering with empty batch or empty commands', () => {
      adapter.render({
        batchId: 'empty_b',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [],
      });

      expect(scene.setCalls.length).toBe(0);
      expect(adapter.getLastRenderedBatchId()).toBe('empty_b');
    });

    it('should safely no-op when rendering without attached scene', () => {
      const orphanAdapter = new CameraRendererAdapter();
      orphanAdapter.render({
        batchId: 'b_orphan',
        rendererId: orphanAdapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'FOCUS_CAMERA',
            targetId: 'node-1',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(orphanAdapter.getRenderCount()).toBe(0);
    });

    it('should ensure zero external mutations on input batches and commands', () => {
      const originalPayload = Object.freeze({ zoom: 1.5, offset: Object.freeze({ x: 10, y: 20 }) });
      const originalCommand: RendererCommand = Object.freeze({
        id: 'cmd_freeze',
        type: 'FOCUS_CAMERA',
        targetId: 'frozen-node',
        payload: originalPayload,
        durationMs: 100,
        easing: 'linear',
        priority: 'NORMAL',
      });
      const originalBatch: RendererBatch = Object.freeze({
        batchId: 'b_frozen',
        rendererId: adapter.id,
        commands: Object.freeze([originalCommand]),
        priority: 'NORMAL',
        virtualTime: 0,
      });

      expect(() => adapter.render(originalBatch)).not.toThrow();
      expect(originalCommand.targetId).toBe('frozen-node');
      expect(originalPayload.zoom).toBe(1.5);
    });
  });
});
