import { SimulationState } from '../contracts/simulation-state.types';
import { SimulationEvent } from '../events/simulation-event.types';
import { SimulationProvider } from '../provider/simulation-provider.types';
import {
  computeDeterministicHash,
  SimulationSnapshot,
} from '../snapshot/simulation-snapshot.types';
import { ISimulationRuntime } from './simulation-runtime.interface';

/**
 * Deterministic Simulation Runtime kernel.
 *
 * Implements ADR-006:
 * - Pure mathematical discrete state progression.
 * - Zero domain coupling (HTTP, Kafka, Agent Loop are external SPI providers).
 * - Zero visual coupling (no canvas, no colors, no coordinates, no DOM).
 * - Full time-travel support via immutable snapshots and deterministic restores.
 */
export class SimulationRuntime<
  TScenario = unknown,
  TProviderState = unknown,
> implements ISimulationRuntime<TScenario, TProviderState> {
  private _provider: SimulationProvider<TScenario, TProviderState> | null = null;
  private _state: SimulationState | null = null;
  private _providerState: Readonly<TProviderState> | null = null;
  private _seed = 0;
  private _sequence = 0;
  private _currentTimeMs = 0;
  private _snapshots: SimulationSnapshot<TProviderState>[] = [];
  private _isInitialized = false;
  private _isDisposed = false;

  /**
   * Initializes the runtime with a domain provider and initial scenario.
   */
  initialize(
    provider: SimulationProvider<TScenario, TProviderState>,
    scenario: TScenario,
    seed = 42,
  ): void {
    if (this._isDisposed) {
      throw new Error('SimulationRuntime is disposed and cannot be re-initialized.');
    }

    this._provider = provider;
    this._seed = seed;
    this._sequence = 0;
    this._snapshots = [];

    const initResult = provider.initialize(scenario, seed);
    this._state = initResult.initialState;
    this._providerState = initResult.initialProviderState;
    this._currentTimeMs = this._state.virtualTimeMs;

    this._isInitialized = true;

    // Capture initial baseline snapshot (S0)
    this.snapshot();
  }

  /**
   * Advances the simulation by a single discrete delta in virtual time.
   */
  step(deltaVirtualTimeMs: number): readonly SimulationEvent[] {
    this.assertOperational();

    if (deltaVirtualTimeMs < 0) {
      throw new Error(
        `Invalid deltaVirtualTimeMs: ${deltaVirtualTimeMs}. Delta must be non-negative; simulation cannot step backward.`,
      );
    }

    if (deltaVirtualTimeMs === 0) {
      return [];
    }

    const result = this._provider!.step(this._state!, this._providerState!, deltaVirtualTimeMs);

    this._sequence += 1;
    this._currentTimeMs += deltaVirtualTimeMs;

    this._state = {
      ...result.nextState,
      virtualTimeMs: this._currentTimeMs,
      stepIndex: this._state!.stepIndex + 1,
    };
    this._providerState = result.providerState;

    return result.emittedEvents;
  }

  /**
   * Advances the simulation to a target timestamp chunking into discrete delta steps.
   */
  advanceTo(targetVirtualTimeMs: number, stepDeltaMs = 16): readonly SimulationEvent[] {
    this.assertOperational();

    if (stepDeltaMs <= 0) {
      throw new Error(`Invalid stepDeltaMs: ${stepDeltaMs}. Must be strictly positive.`);
    }

    if (targetVirtualTimeMs < this._currentTimeMs) {
      throw new Error(
        `Cannot advance backward from ${this._currentTimeMs}ms to ${targetVirtualTimeMs}ms. Use restore() to rewind.`,
      );
    }

    const allEvents: SimulationEvent[] = [];

    while (this._currentTimeMs < targetVirtualTimeMs) {
      const delta = Math.min(stepDeltaMs, targetVirtualTimeMs - this._currentTimeMs);
      const events = this.step(delta);
      for (const event of events) {
        allEvents.push(event);
      }
    }

    return allEvents;
  }

  /**
   * Captures an immutable snapshot of the current state.
   */
  snapshot(customHash?: string): SimulationSnapshot<TProviderState> {
    this.assertOperational();

    const stateHash =
      customHash ??
      computeDeterministicHash({
        state: this._state,
        providerState: this._providerState,
      });

    const snap: SimulationSnapshot<TProviderState> = {
      snapshotId: `snap_${this._sequence}_${this._currentTimeMs}`,
      time: this._currentTimeMs,
      seed: this._seed,
      stateHash,
      providerState: this._providerState!,
      sequence: this._sequence,
      state: { ...this._state! },
    };

    this._snapshots.push(snap);
    return snap;
  }

  /**
   * Restores the simulation directly to an earlier snapshot.
   */
  restore(snapshot: SimulationSnapshot<TProviderState>): void {
    this.assertOperational();

    if (this._provider?.restore) {
      const restored = this._provider.restore(snapshot);
      this._state = restored.initialState;
      this._providerState = restored.initialProviderState;
    } else {
      this._state = { ...snapshot.state };
      this._providerState = snapshot.providerState;
    }

    this._currentTimeMs = snapshot.time;
    this._sequence = snapshot.sequence;
  }

  /**
   * Releases resources and tears down active provider.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._provider?.dispose?.();
    this._provider = null;
    this._state = null;
    this._providerState = null;
    this._snapshots = [];
    this._isInitialized = false;
    this._isDisposed = true;
  }

  state(): SimulationState {
    this.assertOperational();
    return this._state!;
  }

  time(): number {
    return this._currentTimeMs;
  }

  activeProvider(): SimulationProvider<TScenario, TProviderState> | null {
    return this._provider;
  }

  snapshots(): readonly SimulationSnapshot<TProviderState>[] {
    return [...this._snapshots];
  }

  isInitialized(): boolean {
    return this._isInitialized;
  }

  isDisposed(): boolean {
    return this._isDisposed;
  }

  private assertOperational(): void {
    if (this._isDisposed) {
      throw new Error('SimulationRuntime is disposed and cannot perform operations.');
    }
    if (!this._isInitialized) {
      throw new Error('SimulationRuntime is not initialized. Call initialize() first.');
    }
  }
}
