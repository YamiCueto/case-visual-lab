import { describe, expect, it, vi } from 'vitest';
import { EventPriority, RuntimeEventEnvelope } from './event-envelope';
import { RuntimeEventBus } from './runtime-event-bus';

describe('RuntimeEventBus', () => {
  it('delivers events to channel-specific subscribers', () => {
    const bus = new RuntimeEventBus();
    const received: RuntimeEventEnvelope[] = [];

    bus.subscribe('simulation', (event) => {
      received.push(event);
    });

    const envelope: RuntimeEventEnvelope = {
      id: 'evt_1',
      scope: 'internal',
      priority: EventPriority.NORMAL,
      channel: 'simulation',
      type: 'sim:step',
      timestamp: Date.now(),
      virtualTimeMs: 100,
      senderEngine: 'SimulationEngine',
      payload: { step: 1 },
    };

    bus.publish(envelope);

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe('evt_1');
    expect(received[0].payload).toEqual({ step: 1 });
  });

  it('delivers events to type-specific subscribers when type differs from channel', () => {
    const bus = new RuntimeEventBus();
    const received: string[] = [];

    bus.subscribe('sim:packet-flow', (event) => {
      received.push(event.id);
    });

    bus.publish({
      id: 'evt_pkt',
      scope: 'internal',
      priority: EventPriority.NORMAL,
      channel: 'network',
      type: 'sim:packet-flow',
      timestamp: 1000,
      virtualTimeMs: 50,
      senderEngine: 'SimulationEngine',
      payload: {},
    });

    expect(received).toEqual(['evt_pkt']);
  });

  it('supports wildcard * subscription for all events across channels', () => {
    const bus = new RuntimeEventBus();
    const allEvents: string[] = [];

    bus.subscribe('*', (event) => {
      allEvents.push(event.channel);
    });

    bus.publish({
      id: '1',
      scope: 'internal',
      priority: EventPriority.NORMAL,
      channel: 'audio',
      type: 'audio:play',
      timestamp: 1,
      virtualTimeMs: 0,
      senderEngine: 'AudioEngine',
      payload: null,
    });

    bus.publish({
      id: '2',
      scope: 'internal',
      priority: EventPriority.NORMAL,
      channel: 'camera',
      type: 'camera:pan',
      timestamp: 2,
      virtualTimeMs: 0,
      senderEngine: 'CameraEngine',
      payload: null,
    });

    expect(allEvents).toEqual(['audio', 'camera']);
  });

  it('unsubscribes cleanly without leaving dangling listeners', () => {
    const bus = new RuntimeEventBus();
    let count = 0;

    const unsubscribe = bus.subscribe('timeline', () => {
      count++;
    });

    bus.publish({
      id: 't1',
      scope: 'internal',
      priority: EventPriority.NORMAL,
      channel: 'timeline',
      type: 'tick',
      timestamp: 1,
      virtualTimeMs: 16,
      senderEngine: 'TimelineEngine',
      payload: null,
    });

    expect(count).toBe(1);

    unsubscribe();

    bus.publish({
      id: 't2',
      scope: 'internal',
      priority: EventPriority.NORMAL,
      channel: 'timeline',
      type: 'tick',
      timestamp: 2,
      virtualTimeMs: 32,
      senderEngine: 'TimelineEngine',
      payload: null,
    });

    expect(count).toBe(1);
    expect(bus.hasSubscribers('timeline')).toBe(false);
  });

  it('dispatches queued events in strict priority order (CRITICAL before HIGH before NORMAL before LOW)', () => {
    const bus = new RuntimeEventBus();
    const dispatchOrder: string[] = [];

    bus.subscribe('*', (event) => {
      dispatchOrder.push(event.id);
    });

    // Enter batch mode to queue before flushing
    bus.beginBatch();

    bus.publish({
      id: 'normal_event',
      scope: 'internal',
      priority: EventPriority.NORMAL,
      channel: 'test',
      type: 'test:normal',
      timestamp: 1,
      virtualTimeMs: 0,
      senderEngine: 'Test',
      payload: null,
    });

    bus.publish({
      id: 'critical_event',
      scope: 'internal',
      priority: EventPriority.CRITICAL,
      channel: 'test',
      type: 'test:critical',
      timestamp: 2,
      virtualTimeMs: 0,
      senderEngine: 'Test',
      payload: null,
    });

    bus.publish({
      id: 'low_event',
      scope: 'internal',
      priority: EventPriority.LOW,
      channel: 'test',
      type: 'test:low',
      timestamp: 3,
      virtualTimeMs: 0,
      senderEngine: 'Test',
      payload: null,
    });

    bus.publish({
      id: 'high_event',
      scope: 'internal',
      priority: EventPriority.HIGH,
      channel: 'test',
      type: 'test:high',
      timestamp: 4,
      virtualTimeMs: 0,
      senderEngine: 'Test',
      payload: null,
    });

    expect(dispatchOrder).toHaveLength(0); // Nothing dispatched while batching

    bus.flushBatch();

    expect(dispatchOrder).toEqual(['critical_event', 'high_event', 'normal_event', 'low_event']);
  });

  it('halts event propagation when an event is cancelled', () => {
    const bus = new RuntimeEventBus();
    const callLog: string[] = [];

    bus.subscribe('security', (event) => {
      callLog.push('handler_1');
      if (event.isCancellable) {
        event.isCancelled = true;
      }
    });

    bus.subscribe('security', () => {
      callLog.push('handler_2');
    });

    bus.publish({
      id: 'auth_fail',
      scope: 'internal',
      priority: EventPriority.HIGH,
      channel: 'security',
      type: 'sec:unauthorized',
      timestamp: 10,
      virtualTimeMs: 0,
      senderEngine: 'SecurityEngine',
      payload: null,
      isCancellable: true,
    });

    expect(callLog).toEqual(['handler_1']); // handler_2 was blocked by cancellation
  });

  it('triggers onBackpressure callback when queue threshold is reached', () => {
    const onBackpressure = vi.fn();
    const bus = new RuntimeEventBus({ maxQueueSize: 2, onBackpressure });

    bus.beginBatch();

    bus.publish({
      id: '1',
      scope: 'internal',
      priority: EventPriority.NORMAL,
      channel: 'log',
      type: 'log',
      timestamp: 1,
      virtualTimeMs: 0,
      senderEngine: 'A',
      payload: null,
    });

    bus.publish({
      id: '2',
      scope: 'internal',
      priority: EventPriority.NORMAL,
      channel: 'log',
      type: 'log',
      timestamp: 2,
      virtualTimeMs: 0,
      senderEngine: 'B',
      payload: null,
    });

    // 3rd event should trigger backpressure
    bus.publish({
      id: '3',
      scope: 'internal',
      priority: EventPriority.NORMAL,
      channel: 'log',
      type: 'log',
      timestamp: 3,
      virtualTimeMs: 0,
      senderEngine: 'C',
      payload: null,
    });

    expect(onBackpressure).toHaveBeenCalledWith(2);

    bus.flushBatch();
    expect(bus.queueSize).toBe(0);
  });

  it('clears all subscribers and internal queue cleanly', () => {
    const bus = new RuntimeEventBus();
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    bus.subscribe('test', handlerA);
    bus.subscribe('*', handlerB);

    expect(bus.getSubscriberCount()).toBe(2);

    bus.clear();

    expect(bus.getSubscriberCount()).toBe(0);
    expect(bus.hasSubscribers('test')).toBe(false);
  });
});
