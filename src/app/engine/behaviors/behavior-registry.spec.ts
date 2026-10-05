import { describe, expect, it } from 'vitest';
import { SimulationEvent } from '../simulation/events/simulation-event.types';
import { RendererCommandBatch } from './commands/renderer-command-batch';
import { RendererCommand } from './commands/renderer-command.types';
import { BehaviorExecutionContext } from './contracts/behavior-context.interface';
import { BehaviorHandler, BehaviorMetadata } from './contracts/behavior-handler.interface';
import { DatabaseWriteHandler } from './handlers/database-write.handler';
import { ErrorFlowHandler } from './handlers/error-flow.handler';
import { NodePulseHandler } from './handlers/node-pulse.handler';
import { PacketFlowHandler } from './handlers/packet-flow.handler';
import { ResponseFlowHandler } from './handlers/response-flow.handler';
import { BehaviorRegistry } from './registry/behavior-registry';

describe('Behavior Registry & Handlers (Semantic Translation Layer)', () => {
  const dummyContext: BehaviorExecutionContext = {
    virtualTime: 100,
    simulationState: {
      stepIndex: 1,
      virtualTimeMs: 100,
      variables: {},
      entities: {},
    },
    variables: {},
    seed: 42,
  };

  const createEvent = (
    type: string,
    sourceEntityId = 'client',
    targetEntityId = 'api_gateway',
    payload: Record<string, unknown> = {},
  ): SimulationEvent => ({
    eventId: 'evt_1',
    type,
    sourceEntityId,
    targetEntityId,
    virtualTimeMs: 100,
    stepIndex: 1,
    sequence: 1,
    payload,
  });

  describe('RendererCommandBatch', () => {
    it('should initialize empty and report correct status', () => {
      const batch = new RendererCommandBatch();
      expect(batch.empty()).toBe(true);
      expect(batch.size()).toBe(0);
      expect(batch.commands()).toEqual([]);
    });

    it('should append single and multiple commands in deterministic order', () => {
      const batch = new RendererCommandBatch();
      const cmd1: RendererCommand = {
        id: 'cmd_1',
        type: 'HIGHLIGHT_NODE',
        targetId: 'node_1',
        payload: {},
        durationMs: 100,
        easing: 'linear',
        priority: 'NORMAL',
      };
      const cmd2: RendererCommand = {
        id: 'cmd_2',
        type: 'FADE_NODE',
        targetId: 'node_2',
        payload: {},
        durationMs: 200,
        easing: 'ease-in',
        priority: 'LOW',
      };

      batch.append(cmd1);
      expect(batch.size()).toBe(1);
      expect(batch.empty()).toBe(false);

      batch.append([cmd2]);
      expect(batch.size()).toBe(2);
      expect(batch.commands()).toEqual([cmd1, cmd2]);
    });

    it('should merge two batches maintaining sequential order', () => {
      const batch1 = new RendererCommandBatch([
        {
          id: 'c1',
          type: 'SPAWN_PARTICLE',
          targetId: 'src',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        },
      ]);
      const batch2 = new RendererCommandBatch([
        {
          id: 'c2',
          type: 'MOVE_PARTICLE',
          targetId: 'p1',
          payload: {},
          durationMs: 300,
          easing: 'ease-out',
          priority: 'HIGH',
        },
      ]);

      batch1.merge(batch2);
      expect(batch1.size()).toBe(2);
      expect(batch1.commands()[0].id).toBe('c1');
      expect(batch1.commands()[1].id).toBe('c2');
    });

    it('should clear commands', () => {
      const batch = new RendererCommandBatch([
        {
          id: 'c1',
          type: 'SPAWN_PARTICLE',
          targetId: 'src',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        },
      ]);
      batch.clear();
      expect(batch.empty()).toBe(true);
      expect(batch.size()).toBe(0);
    });
  });

  describe('BehaviorRegistry Core (Open/Closed Principle)', () => {
    it('should register, list, and resolve handlers dynamically without switch statements', () => {
      const registry = new BehaviorRegistry();
      const packetHandler = new PacketFlowHandler();

      registry.register(packetHandler);

      expect(registry.list()).toHaveLength(1);
      expect(registry.list()[0].id).toBe('packet-flow-handler');

      const resolved = registry.resolve('http:request-sent');
      expect(resolved).toHaveLength(1);
      expect(resolved[0]).toBe(packetHandler);
    });

    it('should return empty array for unregistered event types', () => {
      const registry = new BehaviorRegistry();
      const resolved = registry.resolve('unregistered:event');
      expect(resolved).toEqual([]);

      const batch = registry.execute(createEvent('unregistered:event'), dummyContext);
      expect(batch.empty()).toBe(true);
    });

    it('should unregister handlers by handlerId and purge index mappings', () => {
      const registry = new BehaviorRegistry();
      const packetHandler = new PacketFlowHandler();

      registry.register(packetHandler);
      expect(registry.resolve('http:request-sent')).toHaveLength(1);

      registry.unregister(packetHandler.id);

      expect(registry.list()).toHaveLength(0);
      expect(registry.resolve('http:request-sent')).toEqual([]);
    });

    it('should unregister all handlers subscribed to an event type', () => {
      const registry = new BehaviorRegistry();
      registry.register(new PacketFlowHandler());

      registry.unregister('http:request-sent');
      expect(registry.resolve('http:request-sent')).toEqual([]);
    });

    it('should preserve deterministic execution order when multiple handlers listen to the same event', () => {
      const registry = new BehaviorRegistry();

      class SpyHandlerA implements BehaviorHandler {
        readonly id = 'spy-a';
        supports(t: string): boolean {
          return t === 'custom:event';
        }
        execute(): readonly RendererCommand[] {
          return [
            {
              id: 'cmd_a',
              type: 'HIGHLIGHT_NODE',
              targetId: 'node_a',
              payload: {},
              durationMs: 10,
              easing: 'linear',
              priority: 'NORMAL',
            },
          ];
        }
        metadata(): BehaviorMetadata {
          return {
            id: this.id,
            name: 'A',
            description: '',
            supportedEventTypes: ['custom:event'],
          };
        }
      }

      class SpyHandlerB implements BehaviorHandler {
        readonly id = 'spy-b';
        supports(t: string): boolean {
          return t === 'custom:event';
        }
        execute(): readonly RendererCommand[] {
          return [
            {
              id: 'cmd_b',
              type: 'UPDATE_BADGE',
              targetId: 'node_b',
              payload: {},
              durationMs: 20,
              easing: 'linear',
              priority: 'LOW',
            },
          ];
        }
        metadata(): BehaviorMetadata {
          return {
            id: this.id,
            name: 'B',
            description: '',
            supportedEventTypes: ['custom:event'],
          };
        }
      }

      registry.register(new SpyHandlerA());
      registry.register(new SpyHandlerB());

      const batch = registry.execute(createEvent('custom:event'), dummyContext);
      expect(batch.size()).toBe(2);
      expect(batch.commands()[0].id).toBe('cmd_a');
      expect(batch.commands()[1].id).toBe('cmd_b');
    });

    it('should clear all registered handlers and mappings', () => {
      const registry = new BehaviorRegistry();
      registry.register(new PacketFlowHandler());
      registry.register(new NodePulseHandler());

      expect(registry.list()).toHaveLength(2);
      registry.clear();

      expect(registry.list()).toHaveLength(0);
      expect(registry.resolve('http:request-sent')).toEqual([]);
    });
  });

  describe('Official Behavior Handlers Unit Tests', () => {
    describe('PacketFlowHandler', () => {
      it('should support packet transmission events and produce spawn, move, and highlight commands', () => {
        const handler = new PacketFlowHandler();

        expect(handler.supports('http:request-sent')).toBe(true);
        expect(handler.supports('tcp:connecting')).toBe(true);
        expect(handler.supports('gateway:ratelimit-passed')).toBe(true);
        expect(handler.supports('database:query')).toBe(false);

        const event = createEvent('http:request-sent', 'client', 'api_gateway');
        const commands = handler.execute(event, dummyContext);

        expect(commands).toHaveLength(3);
        expect(commands[0].type).toBe('SPAWN_PARTICLE');
        expect(commands[0].targetId).toBe('client');
        expect(commands[1].type).toBe('MOVE_PARTICLE');
        expect(commands[2].type).toBe('HIGHLIGHT_NODE');
      });
    });

    describe('NodePulseHandler', () => {
      it('should support node logic events and emit highlight and badge commands', () => {
        const handler = new NodePulseHandler();

        expect(handler.supports('controller:entered')).toBe(true);
        expect(handler.supports('domain:executed')).toBe(true);
        expect(handler.supports('security:jwt-valid')).toBe(true);
        expect(handler.supports('http:response-sent')).toBe(false);

        const event = createEvent('controller:entered', 'order_service');
        const commands = handler.execute(event, dummyContext);

        expect(commands).toHaveLength(2);
        expect(commands[0].type).toBe('HIGHLIGHT_NODE');
        expect(commands[0].targetId).toBe('order_service');
        expect(commands[1].type).toBe('UPDATE_BADGE');
      });
    });

    describe('DatabaseWriteHandler', () => {
      it('should support database query and commit events and emit glow, badge, and audio commands', () => {
        const handler = new DatabaseWriteHandler();

        expect(handler.supports('database:query')).toBe(true);
        expect(handler.supports('database:commit')).toBe(true);
        expect(handler.supports('tcp:connecting')).toBe(false);

        const event = createEvent('database:commit', 'order_service', 'database', {
          tx: 'tx_123',
        });
        const commands = handler.execute(event, dummyContext);

        expect(commands).toHaveLength(3);
        expect(commands[0].type).toBe('HIGHLIGHT_NODE');
        expect(commands[0].targetId).toBe('database');
        expect(commands[1].type).toBe('UPDATE_BADGE');
        expect(commands[2].type).toBe('PLAY_AUDIO_CUE');
        expect(commands[2].payload['cue']).toBe('db_commit_sfx');
      });
    });

    describe('ResponseFlowHandler', () => {
      it('should translate response-sent event into return particle flow, badge, and audio', () => {
        const handler = new ResponseFlowHandler();

        expect(handler.supports('http:response-sent')).toBe(true);
        expect(handler.supports('tcp:connecting')).toBe(false);

        const event = createEvent('http:response-sent', 'api_gateway', 'client', {
          status: 201,
          statusText: 'Created',
        });
        const commands = handler.execute(event, dummyContext);

        expect(commands).toHaveLength(4);
        expect(commands[0].type).toBe('SPAWN_PARTICLE');
        expect(commands[1].type).toBe('MOVE_PARTICLE');
        expect(commands[2].type).toBe('UPDATE_BADGE');
        expect(commands[2].payload['text']).toBe('HTTP 201');
        expect(commands[3].type).toBe('PLAY_AUDIO_CUE');
      });
    });

    describe('ErrorFlowHandler', () => {
      it('should translate security, rate limit, and domain errors into red alert cues', () => {
        const handler = new ErrorFlowHandler();

        expect(handler.supports('security:jwt-invalid')).toBe(true);
        expect(handler.supports('gateway:ratelimit-exceeded')).toBe(true);
        expect(handler.supports('domain:not-found')).toBe(true);
        expect(handler.supports('domain:error')).toBe(true);
        expect(handler.supports('http:request-sent')).toBe(false);

        const event = createEvent('security:jwt-invalid', 'api_gateway', 'client', {
          status: 401,
          error: 'Unauthorized',
        });
        const commands = handler.execute(event, dummyContext);

        expect(commands).toHaveLength(5);
        expect(commands[0].type).toBe('HIGHLIGHT_NODE');
        expect(commands[0].payload['intent']).toBe('error');
        expect(commands[1].type).toBe('SPAWN_PARTICLE');
        expect(commands[2].type).toBe('MOVE_PARTICLE');
        expect(commands[3].type).toBe('UPDATE_BADGE');
        expect(commands[3].payload['text']).toBe('HTTP 401');
        expect(commands[4].type).toBe('PLAY_AUDIO_CUE');
        expect(commands[4].payload['cue']).toBe('http_error_alert');
      });
    });
  });
});
