import { beforeEach, describe, expect, it } from 'vitest';
import { RendererCommand } from '../../../engine/behaviors/commands/renderer-command.types';
import { RendererBatch } from '../../../engine/rendering/contracts/renderer-batch.types';
import { ExcalidrawRendererAdapter } from './adapter/excalidraw-renderer.adapter';
import { ExcalidrawRenderContext } from './contracts/excalidraw-render-context.interface';
import { ExcalidrawScene, ExcalidrawSceneElement } from './contracts/excalidraw-scene.interface';

/**
 * In-memory test double representing an Excalidraw scene.
 */
class FakeExcalidrawScene implements ExcalidrawScene {
  private readonly elementsMap = new Map<string, ExcalidrawSceneElement>();
  readonly updateCalls: ExcalidrawSceneElement[][] = [];

  constructor(initialElements: readonly ExcalidrawSceneElement[] = []) {
    for (const el of initialElements) {
      this.elementsMap.set(el.id, { ...el });
    }
  }

  getElements(): readonly ExcalidrawSceneElement[] {
    return Array.from(this.elementsMap.values());
  }

  getElementById(id: string): ExcalidrawSceneElement | undefined {
    return this.elementsMap.get(id);
  }

  updateElements(elements: readonly ExcalidrawSceneElement[]): void {
    this.updateCalls.push([...elements]);
    for (const el of elements) {
      const prev = this.elementsMap.get(el.id) ?? { id: el.id, type: 'rectangle' };
      this.elementsMap.set(el.id, {
        ...prev,
        ...el,
        customData: {
          ...(prev.customData ?? {}),
          ...(el.customData ?? {}),
        },
      });
    }
  }

  addElement(element: ExcalidrawSceneElement): void {
    this.elementsMap.set(element.id, { ...element });
  }

  removeElement(id: string): void {
    this.elementsMap.delete(id);
  }
}

describe('ExcalidrawRendererAdapter', () => {
  let scene: FakeExcalidrawScene;
  let adapter: ExcalidrawRendererAdapter;

  const initialNodes: ExcalidrawSceneElement[] = [
    {
      id: 'node-client',
      type: 'rectangle',
      x: 100,
      y: 200,
      width: 150,
      height: 80,
      strokeColor: '#000000',
      strokeWidth: 1,
      backgroundColor: '#ffffff',
    },
    {
      id: 'node-server',
      type: 'rectangle',
      x: 400,
      y: 200,
      width: 150,
      height: 80,
      strokeColor: '#000000',
      strokeWidth: 1,
      backgroundColor: '#ffffff',
    },
    {
      id: 'static-label',
      type: 'text',
      text: 'Original Label',
    },
  ];

  beforeEach(() => {
    scene = new FakeExcalidrawScene(initialNodes);
    adapter = new ExcalidrawRendererAdapter(scene);
    adapter.initialize();
  });

  describe('Contract and Support Verification', () => {
    it('should implement RendererPort properties and default priority', () => {
      expect(adapter.id).toBe('excalidraw-renderer');
      expect(adapter.priority).toBe(10);
      expect(adapter.isDisposed()).toBe(false);
    });

    it('should support required 2D annotation commands', () => {
      const supportedTypes = [
        'HIGHLIGHT_NODE',
        'UPDATE_BADGE',
        'UPDATE_LABEL',
        'SHOW_TOOLTIP',
        'HIDE_TOOLTIP',
      ];

      for (const type of supportedTypes) {
        const cmd = {
          id: 'test_1',
          type,
          targetId: 'node-client',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        } as unknown as RendererCommand;

        expect(adapter.supports(cmd)).toBe(true);
      }
    });

    it('should ignore commands designated for other renderers (3D particles, audio, camera)', () => {
      const foreignCommands: RendererCommand[] = [
        {
          id: 'c1',
          type: 'SPAWN_PARTICLE',
          targetId: 'node-client',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'HIGH',
        },
        {
          id: 'c2',
          type: 'MOVE_PARTICLE',
          targetId: 'p1',
          payload: {},
          durationMs: 200,
          easing: 'ease-out',
          priority: 'HIGH',
        },
        {
          id: 'c3',
          type: 'DESTROY_PARTICLE',
          targetId: 'p1',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        },
        {
          id: 'c4',
          type: 'PLAY_AUDIO_CUE',
          targetId: 'audio',
          payload: {},
          durationMs: 100,
          easing: 'linear',
          priority: 'LOW',
        },
        {
          id: 'c5',
          type: 'FOCUS_CAMERA',
          targetId: 'node-server',
          payload: {},
          durationMs: 500,
          easing: 'ease-in-out',
          priority: 'HIGH',
        },
        {
          id: 'c6',
          type: 'FADE_NODE',
          targetId: 'node-server',
          payload: {},
          durationMs: 200,
          easing: 'linear',
          priority: 'NORMAL',
        },
      ];

      for (const cmd of foreignCommands) {
        expect(adapter.supports(cmd)).toBe(false);
      }

      // If a batch contains only foreign commands, scene must not be touched
      const batch: RendererBatch = {
        batchId: 'batch_foreign',
        rendererId: 'three-renderer',
        commands: foreignCommands,
        priority: 'HIGH',
        virtualTime: 100,
      };

      adapter.render(batch);
      expect(scene.updateCalls.length).toBe(0);
      expect(adapter.getLastRenderedBatchId()).toBe('batch_foreign');
    });

    it('should return false for invalid or null command objects', () => {
      expect(adapter.supports(null as unknown as RendererCommand)).toBe(false);
      expect(adapter.supports({} as unknown as RendererCommand)).toBe(false);
    });
  });

  describe('HIGHLIGHT_NODE Translation', () => {
    it('should highlight a node with explicit glowColor and strokeWidth', () => {
      const batch: RendererBatch = {
        batchId: 'b_highlight_1',
        rendererId: adapter.id,
        priority: 'HIGH',
        virtualTime: 0,
        commands: [
          {
            id: 'cmd_h1',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node-client',
            payload: {
              glowColor: '#38BDF8',
              strokeWidth: 4,
              backgroundColor: '#0369A1',
            },
            durationMs: 200,
            easing: 'ease-out',
            priority: 'HIGH',
          },
        ],
      };

      adapter.render(batch);

      expect(scene.updateCalls.length).toBe(1);
      const updated = scene.getElementById('node-client');
      expect(updated?.strokeColor).toBe('#38BDF8');
      expect(updated?.strokeWidth).toBe(4);
      expect(updated?.backgroundColor).toBe('#0369A1');
      expect(updated?.customData?.['highlighted']).toBe(true);
      expect(updated?.customData?.['highlightColor']).toBe('#38BDF8');
    });

    it('should map semantic intents (error, success, warning) to standard colors', () => {
      const testCases = [
        { intent: 'error', expectedColor: '#EF4444' },
        { intent: 'success', expectedColor: '#10B981' },
        { intent: 'warning', expectedColor: '#F59E0B' },
        { intent: 'info', expectedColor: '#3B82F6' },
      ];

      for (const { intent, expectedColor } of testCases) {
        const batch: RendererBatch = {
          batchId: `b_intent_${intent}`,
          rendererId: adapter.id,
          priority: 'NORMAL',
          virtualTime: 0,
          commands: [
            {
              id: `cmd_int_${intent}`,
              type: 'HIGHLIGHT_NODE',
              targetId: 'node-server',
              payload: { intent },
              durationMs: 150,
              easing: 'linear',
              priority: 'NORMAL',
            },
          ],
        };

        adapter.render(batch);
        const updated = scene.getElementById('node-server');
        expect(updated?.strokeColor).toBe(expectedColor);
      }
    });

    it('should reset node highlight when reset flag is true', () => {
      const batch: RendererBatch = {
        batchId: 'b_reset',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'cmd_reset',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node-client',
            payload: { reset: true },
            durationMs: 100,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      adapter.render(batch);
      const updated = scene.getElementById('node-client');
      expect(updated?.strokeWidth).toBe(1);
      expect(updated?.customData?.['highlighted']).toBe(false);
    });
  });

  describe('UPDATE_BADGE Translation', () => {
    it('should create and attach a badge element and sync target node customData', () => {
      const batch: RendererBatch = {
        batchId: 'b_badge_1',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 50,
        commands: [
          {
            id: 'cmd_b1',
            type: 'UPDATE_BADGE',
            targetId: 'node-client',
            payload: {
              text: 'HTTP 200 OK',
              intent: 'success',
            },
            durationMs: 200,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      adapter.render(batch);

      const badge = scene.getElementById('node-client__badge');
      expect(badge).toBeDefined();
      expect(badge?.type).toBe('text');
      expect(badge?.text).toBe('HTTP 200 OK');
      expect(badge?.containerId).toBe('node-client');
      expect(badge?.customData?.['role']).toBe('badge');
      expect(badge?.customData?.['intent']).toBe('success');

      const target = scene.getElementById('node-client');
      expect(target?.customData?.['badgeText']).toBe('HTTP 200 OK');
    });

    it('should update existing badge text and preserve custom coordinates', () => {
      // First batch: create badge
      adapter.render({
        batchId: 'b1',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'UPDATE_BADGE',
            targetId: 'node-server',
            payload: { text: 'PENDING' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      // Second batch: update badge text
      adapter.render({
        batchId: 'b2',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 100,
        commands: [
          {
            id: 'c2',
            type: 'UPDATE_BADGE',
            targetId: 'node-server',
            payload: { text: 'COMPLETED', intent: 'success' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      const badge = scene.getElementById('node-server__badge');
      expect(badge?.text).toBe('COMPLETED');
      expect(badge?.customData?.['intent']).toBe('success');
    });
  });

  describe('UPDATE_LABEL Translation', () => {
    it('should update text on an existing label element', () => {
      const batch: RendererBatch = {
        batchId: 'b_label',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 20,
        commands: [
          {
            id: 'cmd_lbl',
            type: 'UPDATE_LABEL' as unknown as RendererCommand['type'],
            targetId: 'static-label',
            payload: {
              text: 'Updated Label Content',
              color: '#4F46E5',
            },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
        ],
      };

      adapter.render(batch);

      const updated = scene.getElementById('static-label');
      expect(updated?.text).toBe('Updated Label Content');
      expect(updated?.strokeColor).toBe('#4F46E5');
    });
  });

  describe('SHOW_TOOLTIP and HIDE_TOOLTIP Translation', () => {
    it('should create tooltip on SHOW_TOOLTIP and mark as deleted on HIDE_TOOLTIP', () => {
      // 1. Show Tooltip
      const showBatch: RendererBatch = {
        batchId: 'b_show_tt',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 10,
        commands: [
          {
            id: 'cmd_tt1',
            type: 'SHOW_TOOLTIP' as unknown as RendererCommand['type'],
            targetId: 'node-server',
            payload: {
              title: 'Server Info',
              text: 'Latency: 42ms',
            },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
        ],
      };

      adapter.render(showBatch);

      const tooltip = scene.getElementById('node-server__tooltip');
      expect(tooltip).toBeDefined();
      expect(tooltip?.text).toBe('Server Info: Latency: 42ms');
      expect(tooltip?.opacity).toBe(100);
      expect(tooltip?.isDeleted).toBe(false);
      expect(tooltip?.customData?.['visible']).toBe(true);

      // 2. Hide Tooltip
      const hideBatch: RendererBatch = {
        batchId: 'b_hide_tt',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 50,
        commands: [
          {
            id: 'cmd_tt2',
            type: 'HIDE_TOOLTIP' as unknown as RendererCommand['type'],
            targetId: 'node-server',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
        ],
      };

      adapter.render(hideBatch);

      const hiddenTooltip = scene.getElementById('node-server__tooltip');
      expect(hiddenTooltip?.opacity).toBe(0);
      expect(hiddenTooltip?.isDeleted).toBe(true);
      expect(hiddenTooltip?.customData?.['visible']).toBe(false);
    });
  });

  describe('SceneDiff Incremental Updates & Idempotence', () => {
    it('should only update changed elements and avoid modifying untouched elements', () => {
      const batch: RendererBatch = {
        batchId: 'b_inc',
        rendererId: adapter.id,
        priority: 'HIGH',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node-client',
            payload: { glowColor: '#E11D48' },
            durationMs: 0,
            easing: 'linear',
            priority: 'HIGH',
          },
        ],
      };

      adapter.render(batch);

      expect(scene.updateCalls.length).toBe(1);
      const patchedElements = scene.updateCalls[0];
      // Only node-client should be patched, not node-server or static-label
      expect(patchedElements.length).toBe(1);
      expect(patchedElements[0].id).toBe('node-client');
      expect(patchedElements[0].strokeColor).toBe('#E11D48');
    });

    it('should be completely idempotent when receiving the identical batch twice', () => {
      const batch: RendererBatch = {
        batchId: 'b_idem',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node-server',
            payload: { glowColor: '#10B981', strokeWidth: 3 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      // First run: changes applied
      adapter.render(batch);
      expect(scene.updateCalls.length).toBe(1);

      // Second run: exact same properties, SceneDiff must detect 0 changes
      adapter.render(batch);
      expect(scene.updateCalls.length).toBe(1); // No new update call
    });
  });

  describe('Deterministic Ordering and Multi-Batch Execution', () => {
    it('should execute commands in strictly deterministic sequential order', () => {
      const batch: RendererBatch = {
        batchId: 'b_multi_order',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 100,
        commands: [
          {
            id: 'c1',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node-client',
            payload: { glowColor: '#000000' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
          {
            id: 'c2',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node-client',
            payload: { glowColor: '#FF0000' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
          {
            id: 'c3',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node-client',
            payload: { glowColor: '#00FF00' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      adapter.render(batch);

      // The final state of node-client must reflect the last command in sequential order
      const client = scene.getElementById('node-client');
      expect(client?.strokeColor).toBe('#00FF00');
    });

    it('should accurately track renderCount and lastRenderedBatchId across batches', () => {
      expect(adapter.getRenderCount()).toBe(0);

      adapter.render({
        batchId: 'batch_alpha',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node-client',
            payload: { glowColor: '#123456' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(adapter.getRenderCount()).toBe(1);
      expect(adapter.getLastRenderedBatchId()).toBe('batch_alpha');

      adapter.render({
        batchId: 'batch_beta',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 50,
        commands: [
          {
            id: 'c2',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node-server',
            payload: { glowColor: '#654321' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(adapter.getRenderCount()).toBe(2);
      expect(adapter.getLastRenderedBatchId()).toBe('batch_beta');
    });
  });

  describe('Lifecycle and Disposal', () => {
    it('should allow re-binding scenes via initialize context and setScene', () => {
      const alternateScene = new FakeExcalidrawScene([{ id: 'alt-node', type: 'rectangle' }]);

      const freshAdapter = new ExcalidrawRendererAdapter();
      expect(freshAdapter.getScene()).toBeUndefined();

      const context: ExcalidrawRenderContext = {
        virtualTime: 0,
        frameNumber: 0,
        deltaTimeMs: 16,
        scene: alternateScene,
      };

      freshAdapter.initialize(context);
      expect(freshAdapter.getScene()).toBe(alternateScene);

      freshAdapter.render({
        batchId: 'b_alt',
        rendererId: freshAdapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c_alt',
            type: 'HIGHLIGHT_NODE',
            targetId: 'alt-node',
            payload: { glowColor: '#EC4899' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(alternateScene.getElementById('alt-node')?.strokeColor).toBe('#EC4899');
    });

    it('should read scene from metadata if context.scene is not provided', () => {
      const metaScene = new FakeExcalidrawScene([{ id: 'm-node', type: 'rectangle' }]);
      const freshAdapter = new ExcalidrawRendererAdapter();

      freshAdapter.initialize({
        virtualTime: 0,
        frameNumber: 0,
        deltaTimeMs: 16,
        metadata: { scene: metaScene },
      });

      expect(freshAdapter.getScene()).toBe(metaScene);
    });

    it('should safely no-op when rendering with empty batch or commands', () => {
      adapter.render({
        batchId: 'empty_batch',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [],
      });

      expect(scene.updateCalls.length).toBe(0);
      expect(adapter.getLastRenderedBatchId()).toBe('empty_batch');
    });

    it('should safely no-op when rendering without an attached scene', () => {
      const orphanAdapter = new ExcalidrawRendererAdapter();
      orphanAdapter.render({
        batchId: 'orphan_batch',
        rendererId: orphanAdapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'HIGHLIGHT_NODE',
            targetId: 'x',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(orphanAdapter.getRenderCount()).toBe(0);
    });

    it('should dispose resources cleanly and prevent further renders', () => {
      adapter.dispose();

      expect(adapter.isDisposed()).toBe(true);
      expect(adapter.getScene()).toBeUndefined();

      // Rendering on disposed adapter should be a no-op
      adapter.render({
        batchId: 'post_dispose',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c_disp',
            type: 'HIGHLIGHT_NODE',
            targetId: 'node-client',
            payload: { glowColor: '#000000' },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(scene.updateCalls.length).toBe(0);

      // Initializing a disposed adapter must throw
      expect(() => adapter.initialize()).toThrowError(
        /Cannot initialize disposed renderer adapter/,
      );
    });
  });
});
