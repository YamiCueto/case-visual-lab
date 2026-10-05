import { describe, expect, it } from 'vitest';
import { SimulationState } from '../contracts/simulation-state.types';
import { SimulationEvent } from '../events/simulation-event.types';
import {
  SimulationProvider,
  SimulationProviderInitResult,
  StepEvaluationResult,
} from '../provider/simulation-provider.types';
import { SimulationSnapshot } from '../snapshot/simulation-snapshot.types';
import { SimulationRuntime } from './simulation-runtime';

interface FakeScenario {
  readonly initialPackets: number;
  readonly packetIntervalMs: number;
}

interface FakeProviderState {
  readonly pendingPackets: number;
  readonly processedPackets: number;
  readonly timeUntilNextPacketMs: number;
  readonly disposed: boolean;
}

/**
 * Deterministic test simulation provider that models a packet processing queue.
 */
class FakePacketSimulationProvider implements SimulationProvider<FakeScenario, FakeProviderState> {
  readonly providerId = 'fake-packet-queue';
  readonly domain = 'networking-test';
  isDisposed = false;

  initialize(
    scenario: FakeScenario,
    seed: number,
  ): SimulationProviderInitResult<FakeProviderState> {
    void seed;
    const initialState: SimulationState = {
      stepIndex: 0,
      virtualTimeMs: 0,
      variables: {
        totalPending: scenario.initialPackets,
        totalProcessed: 0,
      },
      entities: {
        gateway: {
          entityId: 'gateway',
          status: 'IDLE',
          metrics: { processed: 0 },
          attributes: { mode: 'buffered' },
        },
      },
    };

    const initialProviderState: FakeProviderState = {
      pendingPackets: scenario.initialPackets,
      processedPackets: 0,
      timeUntilNextPacketMs: scenario.packetIntervalMs,
      disposed: false,
    };

    return { initialState, initialProviderState };
  }

  step(
    currentState: SimulationState,
    currentProviderState: Readonly<FakeProviderState>,
    deltaVirtualTimeMs: number,
  ): StepEvaluationResult<FakeProviderState> {
    let pending = currentProviderState.pendingPackets;
    let processed = currentProviderState.processedPackets;
    let timeRemaining = currentProviderState.timeUntilNextPacketMs - deltaVirtualTimeMs;
    const emittedEvents: SimulationEvent[] = [];

    while (timeRemaining <= 0 && pending > 0) {
      pending -= 1;
      processed += 1;
      timeRemaining += 100; // interval is 100ms per packet

      emittedEvents.push({
        eventId: `pkt_${processed}`,
        type: 'packet:dispatched',
        sourceEntityId: 'gateway',
        targetEntityId: 'upstream',
        virtualTimeMs: currentState.virtualTimeMs + deltaVirtualTimeMs,
        stepIndex: currentState.stepIndex + 1,
        sequence: processed,
        payload: { packetNumber: processed, remainingInQueue: pending },
      });
    }

    const nextState: SimulationState = {
      stepIndex: currentState.stepIndex + 1,
      virtualTimeMs: currentState.virtualTimeMs + deltaVirtualTimeMs,
      variables: {
        totalPending: pending,
        totalProcessed: processed,
      },
      entities: {
        gateway: {
          entityId: 'gateway',
          status: pending > 0 ? 'BUSY' : 'IDLE',
          metrics: { processed },
          attributes: { mode: 'buffered' },
        },
      },
    };

    const nextProviderState: FakeProviderState = {
      pendingPackets: pending,
      processedPackets: processed,
      timeUntilNextPacketMs: Math.max(0, timeRemaining),
      disposed: false,
    };

    return {
      nextState,
      providerState: nextProviderState,
      emittedEvents,
      isCompleted: pending === 0,
    };
  }

  restore(
    snapshot: SimulationSnapshot<FakeProviderState>,
  ): SimulationProviderInitResult<FakeProviderState> {
    return {
      initialState: { ...snapshot.state },
      initialProviderState: { ...snapshot.providerState },
    };
  }

  dispose(): void {
    this.isDisposed = true;
  }
}

describe('SimulationRuntime (Kernel)', () => {
  const scenario: FakeScenario = {
    initialPackets: 5,
    packetIntervalMs: 100,
  };

  describe('Initialization', () => {
    it('should initialize runtime, store initial state, and capture S0 baseline snapshot', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      const provider = new FakePacketSimulationProvider();

      expect(runtime.isInitialized()).toBe(false);
      expect(runtime.isDisposed()).toBe(false);

      runtime.initialize(provider, scenario, 12345);

      expect(runtime.isInitialized()).toBe(true);
      expect(runtime.time()).toBe(0);
      expect(runtime.activeProvider()).toBe(provider);

      const state = runtime.state();
      expect(state.stepIndex).toBe(0);
      expect(state.virtualTimeMs).toBe(0);
      expect(state.variables['totalPending']).toBe(5);
      expect(state.variables['totalProcessed']).toBe(0);

      // Verify baseline snapshot S0 was captured
      const snapshots = runtime.snapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].time).toBe(0);
      expect(snapshots[0].sequence).toBe(0);
      expect(snapshots[0].seed).toBe(12345);
      expect(snapshots[0].stateHash).toBeDefined();
    });

    it('should reject operations when uninitialized', () => {
      const runtime = new SimulationRuntime();

      expect(() => runtime.step(16)).toThrow(/not initialized/);
      expect(() => runtime.advanceTo(100)).toThrow(/not initialized/);
      expect(() => runtime.snapshot()).toThrow(/not initialized/);
      expect(() => runtime.state()).toThrow(/not initialized/);
    });

    it('should reject re-initialization after being disposed', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      const provider = new FakePacketSimulationProvider();

      runtime.initialize(provider, scenario);
      runtime.dispose();

      expect(() => runtime.initialize(provider, scenario)).toThrow(/disposed/);
    });
  });

  describe('Step Execution', () => {
    it('should advance logical virtual time and process packets across steps', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      const provider = new FakePacketSimulationProvider();
      runtime.initialize(provider, scenario);

      // Step 50ms: not enough to emit packet (interval is 100ms)
      const events1 = runtime.step(50);
      expect(events1).toHaveLength(0);
      expect(runtime.time()).toBe(50);
      expect(runtime.state().stepIndex).toBe(1);

      // Step another 50ms (total 100ms): emits 1 packet
      const events2 = runtime.step(50);
      expect(events2).toHaveLength(1);
      expect(events2[0].type).toBe('packet:dispatched');
      expect(events2[0].sequence).toBe(1);
      expect(runtime.time()).toBe(100);
      expect(runtime.state().stepIndex).toBe(2);
      expect(runtime.state().variables['totalProcessed']).toBe(1);
      expect(runtime.state().variables['totalPending']).toBe(4);
    });

    it('should treat step(0) as a no-op returning empty events', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      runtime.initialize(new FakePacketSimulationProvider(), scenario);

      const events = runtime.step(0);
      expect(events).toEqual([]);
      expect(runtime.time()).toBe(0);
      expect(runtime.state().stepIndex).toBe(0);
    });

    it('should reject negative delta values', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      runtime.initialize(new FakePacketSimulationProvider(), scenario);

      expect(() => runtime.step(-10)).toThrow(/non-negative/);
    });
  });

  describe('AdvanceTo', () => {
    it('should advance in discrete chunks and aggregate emitted events in chronological order', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      runtime.initialize(new FakePacketSimulationProvider(), scenario);

      // Advance from 0 to 350ms in 100ms chunks:
      // Expect 3 packets dispatched (at 100ms, 200ms, 300ms)
      const events = runtime.advanceTo(350, 100);

      expect(runtime.time()).toBe(350);
      expect(events).toHaveLength(3);
      expect(events[0].sequence).toBe(1);
      expect(events[1].sequence).toBe(2);
      expect(events[2].sequence).toBe(3);

      expect(runtime.state().variables['totalProcessed']).toBe(3);
      expect(runtime.state().variables['totalPending']).toBe(2);
    });

    it('should reject backward advance', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      runtime.initialize(new FakePacketSimulationProvider(), scenario);

      runtime.advanceTo(300);
      expect(() => runtime.advanceTo(200)).toThrow(/Cannot advance backward/);
    });

    it('should reject non-positive stepDeltaMs in advanceTo', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      runtime.initialize(new FakePacketSimulationProvider(), scenario);

      expect(() => runtime.advanceTo(100, 0)).toThrow(/strictly positive/);
      expect(() => runtime.advanceTo(100, -16)).toThrow(/strictly positive/);
    });
  });

  describe('Snapshots and Time-Travel Restore', () => {
    it('should capture immutable checkpoints across simulation lifetime', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      runtime.initialize(new FakePacketSimulationProvider(), scenario);

      // Advance to 100ms and snapshot S1
      runtime.advanceTo(100);
      const snap1 = runtime.snapshot();
      expect(snap1.time).toBe(100);
      expect(snap1.state.variables['totalProcessed']).toBe(1);

      // Advance to 300ms and snapshot S2
      runtime.advanceTo(300);
      const snap2 = runtime.snapshot();
      expect(snap2.time).toBe(300);
      expect(snap2.state.variables['totalProcessed']).toBe(3);

      // Advance to 500ms and snapshot S3
      runtime.advanceTo(500);
      const snap3 = runtime.snapshot();
      expect(snap3.time).toBe(500);
      expect(snap3.state.variables['totalProcessed']).toBe(5);

      // Total snapshots: S0 (init) + S1 + S2 + S3 = 4
      expect(runtime.snapshots()).toHaveLength(4);
    });

    it('should restore previous state accurately and allow resuming simulation', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      runtime.initialize(new FakePacketSimulationProvider(), scenario);

      // Advance to 200ms and capture checkpoint
      runtime.advanceTo(200);
      const checkpoint = runtime.snapshot();
      expect(runtime.state().variables['totalProcessed']).toBe(2);

      // Advance all the way to 500ms
      runtime.advanceTo(500);
      expect(runtime.time()).toBe(500);
      expect(runtime.state().variables['totalProcessed']).toBe(5);

      // Rewind / restore to checkpoint at 200ms
      runtime.restore(checkpoint);
      expect(runtime.time()).toBe(200);
      expect(runtime.state().variables['totalProcessed']).toBe(2);
      expect(runtime.state().variables['totalPending']).toBe(3);

      // Step forward again from 200ms to 300ms
      const resumedEvents = runtime.step(100);
      expect(runtime.time()).toBe(300);
      expect(resumedEvents).toHaveLength(1);
      expect(resumedEvents[0].sequence).toBe(3);
      expect(runtime.state().variables['totalProcessed']).toBe(3);
    });
  });

  describe('Mathematical Determinism', () => {
    it('should produce identical states, event logs, and state hashes on identical runs', () => {
      const runtime1 = new SimulationRuntime<FakeScenario, FakeProviderState>();
      const runtime2 = new SimulationRuntime<FakeScenario, FakeProviderState>();

      runtime1.initialize(new FakePacketSimulationProvider(), scenario, 9999);
      runtime2.initialize(new FakePacketSimulationProvider(), scenario, 9999);

      const deltas = [50, 50, 100, 100, 50, 150];

      const events1: SimulationEvent[] = [];
      const events2: SimulationEvent[] = [];

      for (const dt of deltas) {
        events1.push(...runtime1.step(dt));
        events2.push(...runtime2.step(dt));
      }

      expect(runtime1.time()).toBe(runtime2.time());
      expect(runtime1.state()).toEqual(runtime2.state());
      expect(events1).toEqual(events2);

      const snap1 = runtime1.snapshot();
      const snap2 = runtime2.snapshot();

      expect(snap1.stateHash).toBe(snap2.stateHash);
      expect(snap1.state).toEqual(snap2.state);
    });
  });

  describe('Disposal', () => {
    it('should notify provider, purge state, and block future execution', () => {
      const runtime = new SimulationRuntime<FakeScenario, FakeProviderState>();
      const provider = new FakePacketSimulationProvider();

      runtime.initialize(provider, scenario);
      expect(provider.isDisposed).toBe(false);

      runtime.dispose();

      expect(provider.isDisposed).toBe(true);
      expect(runtime.isDisposed()).toBe(true);
      expect(runtime.isInitialized()).toBe(false);
      expect(runtime.activeProvider()).toBeNull();
      expect(runtime.snapshots()).toEqual([]);

      expect(() => runtime.step(10)).toThrow(/disposed/);
      expect(() => runtime.advanceTo(100)).toThrow(/disposed/);
      expect(() => runtime.snapshot()).toThrow(/disposed/);
      expect(() => runtime.state()).toThrow(/disposed/);

      // Disposal idempotency: should not throw when called again
      expect(() => runtime.dispose()).not.toThrow();
    });
  });
});
