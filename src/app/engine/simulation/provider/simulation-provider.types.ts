import { SimulationState } from '../contracts/simulation-state.types';
import { SimulationEvent } from '../events/simulation-event.types';
import { SimulationSnapshot } from '../snapshot/simulation-snapshot.types';

/**
 * Output of a single discrete simulation step evaluation.
 */
export interface StepEvaluationResult<TProviderState = unknown> {
  readonly nextState: SimulationState;
  readonly providerState: Readonly<TProviderState>;
  readonly emittedEvents: readonly SimulationEvent[];
  readonly isCompleted?: boolean;
}

/**
 * Output of initializing a simulation provider.
 */
export interface SimulationProviderInitResult<TProviderState = unknown> {
  readonly initialState: SimulationState;
  readonly initialProviderState: Readonly<TProviderState>;
}

/**
 * Service Provider Interface (SPI) for discrete domain simulation models.
 *
 * Implementations model domains (e.g. HTTP, TCP, Raft, Kafka, Agent Loop)
 * without any coupling to the Visual Execution Engine or Renderers.
 */
export interface SimulationProvider<TScenario = unknown, TProviderState = unknown> {
  readonly providerId: string;
  readonly domain: string;

  /**
   * Initializes the provider model with a domain scenario and deterministic seed.
   */
  initialize(scenario: TScenario, seed: number): SimulationProviderInitResult<TProviderState>;

  /**
   * Computes a state transition over a discrete time delta: S(t + delta) = delta(S(t), dt).
   */
  step(
    currentState: SimulationState,
    currentProviderState: Readonly<TProviderState>,
    deltaVirtualTimeMs: number,
  ): StepEvaluationResult<TProviderState>;

  /**
   * Optional hook to restore domain-specific structures from a snapshot.
   */
  restore?(
    snapshot: SimulationSnapshot<TProviderState>,
  ): SimulationProviderInitResult<TProviderState>;

  /**
   * Optional hook to clean up provider memory or state.
   */
  dispose?(): void;
}
