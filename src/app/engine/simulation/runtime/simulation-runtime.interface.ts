import { SimulationState } from '../contracts/simulation-state.types';
import { SimulationEvent } from '../events/simulation-event.types';
import { SimulationProvider } from '../provider/simulation-provider.types';
import { SimulationSnapshot } from '../snapshot/simulation-snapshot.types';

/**
 * Core interface for the Simulation Runtime.
 * Governs the execution of discrete simulation providers, snapshots, and event generation.
 */
export interface ISimulationRuntime<TScenario = unknown, TProviderState = unknown> {
  /**
   * Initializes the runtime with an active domain provider and initial scenario.
   */
  initialize(
    provider: SimulationProvider<TScenario, TProviderState>,
    scenario: TScenario,
    seed?: number,
  ): void;

  /**
   * Advances the simulation by a single discrete delta in virtual time.
   * Returns newly emitted simulation events from this step.
   */
  step(deltaVirtualTimeMs: number): readonly SimulationEvent[];

  /**
   * Advances the simulation to a target virtual timestamp, chunking into discrete steps.
   * Returns all events emitted during the advance window in temporal order.
   */
  advanceTo(targetVirtualTimeMs: number, stepDeltaMs?: number): readonly SimulationEvent[];

  /**
   * Captures an immutable snapshot of the current simulation and provider states.
   */
  snapshot(customHash?: string): SimulationSnapshot<TProviderState>;

  /**
   * Restores the simulation directly to an earlier snapshot.
   */
  restore(snapshot: SimulationSnapshot<TProviderState>): void;

  /**
   * Releases resources and tears down active provider.
   */
  dispose(): void;

  /**
   * Returns current simulation state.
   */
  state(): SimulationState;

  /**
   * Returns current logical virtual time in milliseconds.
   */
  time(): number;

  /**
   * Returns the active provider or null if uninitialized.
   */
  activeProvider(): SimulationProvider<TScenario, TProviderState> | null;

  /**
   * Returns captured snapshot history.
   */
  snapshots(): readonly SimulationSnapshot<TProviderState>[];

  /**
   * Returns true if initialized and ready to step.
   */
  isInitialized(): boolean;

  /**
   * Returns true if disposed.
   */
  isDisposed(): boolean;
}
