/**
 * Primitive values allowed in simulation variables and attributes.
 */
export type SimulationPrimitive = string | number | boolean | null | undefined;

/**
 * Composite values allowed in simulation state.
 */
export type SimulationStateValue =
  SimulationPrimitive | readonly SimulationPrimitive[] | Readonly<Record<string, unknown>>;

/**
 * State of a single discrete entity in the simulation model.
 * Pure mathematical state with zero visual or UI properties.
 */
export interface SimulationEntityState {
  readonly entityId: string;
  readonly status: string;
  readonly metrics: Readonly<Record<string, number>>;
  readonly attributes: Readonly<Record<string, SimulationStateValue>>;
}

/**
 * Universal discrete simulation state.
 * Immutable snapshot of all variables and entities at a given virtual timestamp.
 */
export interface SimulationState {
  readonly stepIndex: number;
  readonly virtualTimeMs: number;
  readonly variables: Readonly<Record<string, SimulationStateValue>>;
  readonly entities: Readonly<Record<string, SimulationEntityState>>;
}
