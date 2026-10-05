import { SimulationState } from '../../simulation/contracts/simulation-state.types';

/**
 * Execution context supplied to BehaviorHandlers when transforming
 * domain simulation events into visual renderer commands.
 *
 * Invariant: Completely isolated from DOM, WebGL, Canvas, and Renderer details.
 */
export interface BehaviorExecutionContext {
  readonly virtualTime: number;
  readonly simulationState: SimulationState;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly seed: number;
}
