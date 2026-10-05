/**
 * Supported lifecycle states of an Experience in CASE Visual Lab.
 * Governs the entire execution from asset loading to final destruction.
 *
 * Strict 11-state machine specified in ADR-007 and ADR-009.
 */
export type RuntimeLifecycleState =
  | 'LOAD'
  | 'VALIDATE'
  | 'BUILD'
  | 'INITIALIZE'
  | 'READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'SEEKING'
  | 'STOPPED'
  | 'DESTROYED'
  | 'ERROR';

/**
 * Immutable audit record of a state transition.
 * Uses a deterministic sequence counter instead of wall-clock time.
 */
export interface StateTransitionRecord {
  readonly from: RuntimeLifecycleState;
  readonly to: RuntimeLifecycleState;
  readonly sequence: number;
  readonly reason?: string;
}

/**
 * Configuration options for RuntimeStateMachine.
 */
export interface RuntimeStateMachineOptions {
  /**
   * Initial state when instantiated. Defaults to 'LOAD'.
   */
  readonly initialState?: RuntimeLifecycleState;

  /**
   * Maximum number of historical records to keep in memory.
   * Defaults to 100. Set to 0 for unbounded history.
   */
  readonly maxHistorySize?: number;
}
