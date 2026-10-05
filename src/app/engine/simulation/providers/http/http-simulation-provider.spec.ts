import { describe, expect, it } from 'vitest';
import { SimulationEvent } from '../../events/simulation-event.types';
import { SimulationRuntime } from '../../runtime/simulation-runtime';
import { HttpSimulationProvider } from './http-simulation-provider';
import { HTTP_SCENARIOS, HttpProviderState, HttpScenario } from './http-simulation.types';

describe('HttpSimulationProvider (First Official Provider)', () => {
  const createRuntime = () => new SimulationRuntime<HttpScenario, HttpProviderState>();

  describe('Full Successful Flow (HTTP 200 & 201)', () => {
    it('should simulate full canonical request lifecycle with HTTP 200', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.SUCCESS_200, 42);

      expect(runtime.time()).toBe(0);
      expect(runtime.state().variables['currentStage']).toBe('IDLE');

      // Advance through entire pipeline (default total duration ~360ms)
      const events = runtime.advanceTo(500, 50);

      expect(runtime.state().variables['isCompleted']).toBe(true);
      expect(runtime.state().variables['status']).toBe(200);

      // Verify event sequence
      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('tcp:connecting');
      expect(eventTypes).toContain('tls:completed');
      expect(eventTypes).toContain('http:request-sent');
      expect(eventTypes).toContain('security:jwt-valid');
      expect(eventTypes).toContain('gateway:ratelimit-passed');
      expect(eventTypes).toContain('controller:entered');
      expect(eventTypes).toContain('domain:executed');
      expect(eventTypes).toContain('database:query');
      expect(eventTypes).toContain('database:commit');
      expect(eventTypes).toContain('http:response-sent');
      expect(eventTypes).toContain('simulation:completed');

      // Verify entities state
      const entities = runtime.state().entities;
      expect(entities['client'].status).toBe('RECEIVED');
      expect(entities['client'].metrics['responsesReceived']).toBe(1);
      expect(entities['database'].status).toBe('READY');
    });

    it('should simulate resource creation with HTTP 201 Created', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.SUCCESS_201, 101);
      const events = runtime.advanceTo(500, 50);

      expect(runtime.state().variables['status']).toBe(201);
      expect(runtime.state().variables['isCompleted']).toBe(true);

      const responseEvent = events.find((e) => e.type === 'http:response-sent');
      expect(responseEvent).toBeDefined();
      expect((responseEvent!.payload as { status: number; statusText: string }).status).toBe(201);
      expect((responseEvent!.payload as { status: number; statusText: string }).statusText).toBe(
        'Created',
      );
    });

    it('should simulate deletion with HTTP 204 No Content', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.NO_CONTENT_204, 204);
      const events = runtime.advanceTo(500, 50);

      expect(runtime.state().variables['status']).toBe(204);
      expect(runtime.state().variables['isCompleted']).toBe(true);

      const responseEvent = events.find((e) => e.type === 'http:response-sent');
      expect((responseEvent!.payload as { status: number; statusText: string }).statusText).toBe(
        'No Content',
      );
    });
  });

  describe('Error Scenarios and Short-Circuits', () => {
    it('should short-circuit at JWT validation on HTTP 401 Unauthorized', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.UNAUTHORIZED_401, 401);
      const events = runtime.advanceTo(500, 50);

      expect(runtime.state().variables['status']).toBe(401);
      expect(runtime.state().variables['isCompleted']).toBe(true);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('security:jwt-invalid');
      expect(eventTypes).toContain('http:response-sent');

      // Must NOT reach internal controller, domain, or database
      expect(eventTypes).not.toContain('controller:entered');
      expect(eventTypes).not.toContain('domain:executed');
      expect(eventTypes).not.toContain('database:query');
    });

    it('should short-circuit at Gateway rate limiting on HTTP 429 Too Many Requests', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.RATE_LIMIT_429, 429);
      const events = runtime.advanceTo(500, 50);

      expect(runtime.state().variables['status']).toBe(429);
      expect(runtime.state().variables['isCompleted']).toBe(true);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('security:jwt-valid');
      expect(eventTypes).toContain('gateway:ratelimit-exceeded');
      expect(eventTypes).toContain('http:response-sent');

      // Never reached controller or database
      expect(eventTypes).not.toContain('controller:entered');
      expect(eventTypes).not.toContain('database:query');
    });

    it('should short-circuit at Domain entity lookup on HTTP 404 Not Found', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.NOT_FOUND_404, 404);
      const events = runtime.advanceTo(500, 50);

      expect(runtime.state().variables['status']).toBe(404);
      expect(runtime.state().variables['isCompleted']).toBe(true);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('controller:entered');
      expect(eventTypes).toContain('domain:not-found');
      expect(eventTypes).toContain('http:response-sent');

      // Reached domain, but aborted before database write
      expect(eventTypes).not.toContain('database:commit');
    });

    it('should short-circuit at Domain processing on HTTP 500 Internal Server Error', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.SERVER_ERROR_500, 500);
      const events = runtime.advanceTo(500, 50);

      expect(runtime.state().variables['status']).toBe(500);
      expect(runtime.state().variables['isCompleted']).toBe(true);

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain('domain:error');
      expect(eventTypes).toContain('http:response-sent');
      expect(eventTypes).not.toContain('database:commit');
    });
  });

  describe('Pausing, Stepping, and Virtual Clock Zero-Entropy', () => {
    it('should freeze simulation state when step delta is 0ms (pause simulation)', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.SUCCESS_200);

      // Advance to 80ms (in the middle of TLS_HANDSHAKE)
      runtime.advanceTo(80, 20);
      const stateBeforePause = { ...runtime.state() };
      const timeBeforePause = runtime.time();

      // Zero-delta step simulates frozen clock tick
      const pausedEvents = runtime.step(0);
      expect(pausedEvents).toEqual([]);
      expect(runtime.time()).toBe(timeBeforePause);
      expect(runtime.state().virtualTimeMs).toBe(stateBeforePause.virtualTimeMs);
      expect(runtime.state().stepIndex).toBe(stateBeforePause.stepIndex);
      expect(runtime.state().variables['currentStage']).toBe(
        stateBeforePause.variables['currentStage'],
      );
    });

    it('should maintain state once simulation completes without redundant events', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.SUCCESS_200);
      runtime.advanceTo(500, 50);
      expect(runtime.state().variables['isCompleted']).toBe(true);

      // Subsequent steps after completion must emit nothing
      const extraEvents = runtime.step(50);
      expect(extraEvents).toEqual([]);
    });
  });

  describe('Snapshots and Time-Travel Restore', () => {
    it('should capture intermediate snapshot and restore back seamlessly', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.SUCCESS_201);

      // Advance to 100ms (TCP & TLS complete, now in REQUEST_SENT)
      runtime.advanceTo(100, 50);
      const snapshotAt100 = runtime.snapshot();

      expect(snapshotAt100.time).toBe(100);
      expect(snapshotAt100.state.variables['currentStage']).toBe('REQUEST_SENT');

      // Advance all the way to completion (500ms)
      runtime.advanceTo(500, 50);
      expect(runtime.time()).toBe(500);
      expect(runtime.state().variables['isCompleted']).toBe(true);

      // Time-travel restore to 100ms
      runtime.restore(snapshotAt100);

      expect(runtime.time()).toBe(100);
      expect(runtime.state().variables['currentStage']).toBe('REQUEST_SENT');
      expect(runtime.state().variables['isCompleted']).toBe(false);

      // Step forward again from restored checkpoint
      const resumedEvents = runtime.advanceTo(200, 50);
      expect(runtime.time()).toBe(200);
      expect(resumedEvents.length).toBeGreaterThan(0);
    });

    it('should support deterministic replay from S0 baseline', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      runtime.initialize(provider, HTTP_SCENARIOS.SUCCESS_200, 777);
      const s0 = runtime.snapshots()[0];

      // Run to completion
      const firstRunEvents = runtime.advanceTo(500, 50);
      const firstRunState = { ...runtime.state() };

      // Restore to S0
      runtime.restore(s0);
      expect(runtime.time()).toBe(0);

      // Re-run identical step deltas
      const replayEvents = runtime.advanceTo(500, 50);

      expect(runtime.time()).toBe(500);
      expect(runtime.state().variables).toEqual(firstRunState.variables);
      expect(replayEvents.map((e) => e.type)).toEqual(firstRunEvents.map((e) => e.type));
    });
  });

  describe('Mathematical Determinism & Isolation', () => {
    it('should produce identical execution states and hashes across independent runtimes', () => {
      const runtime1 = createRuntime();
      const runtime2 = createRuntime();

      runtime1.initialize(new HttpSimulationProvider(), HTTP_SCENARIOS.SUCCESS_201, 888);
      runtime2.initialize(new HttpSimulationProvider(), HTTP_SCENARIOS.SUCCESS_201, 888);

      const deltas = [16, 33, 16, 50, 100, 50, 100];
      const events1: SimulationEvent[] = [];
      const events2: SimulationEvent[] = [];

      for (const dt of deltas) {
        events1.push(...runtime1.step(dt));
        events2.push(...runtime2.step(dt));
      }

      expect(runtime1.time()).toBe(runtime2.time());
      expect(runtime1.state()).toEqual(runtime2.state());
      expect(events1.map((e) => e.type)).toEqual(events2.map((e) => e.type));

      const snap1 = runtime1.snapshot();
      const snap2 = runtime2.snapshot();
      expect(snap1.stateHash).toBe(snap2.stateHash);
    });

    it('should execute multiple independent scenarios in sequence without state leakage', () => {
      const runtime = createRuntime();
      const provider = new HttpSimulationProvider();

      // Run 1: 401 Unauthorized
      runtime.initialize(provider, HTTP_SCENARIOS.UNAUTHORIZED_401, 1);
      runtime.advanceTo(500, 50);
      expect(runtime.state().variables['status']).toBe(401);

      // Run 2: 201 Created on new runtime
      const runtime2 = createRuntime();
      runtime2.initialize(new HttpSimulationProvider(), HTTP_SCENARIOS.SUCCESS_201, 2);
      runtime2.advanceTo(500, 50);
      expect(runtime2.state().variables['status']).toBe(201);
    });
  });
});
