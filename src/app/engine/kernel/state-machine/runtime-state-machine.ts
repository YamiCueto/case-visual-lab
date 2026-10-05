import { InvalidStateTransitionError } from './runtime-state-machine.errors';
import {
  RuntimeLifecycleState,
  RuntimeStateMachineOptions,
  StateTransitionRecord,
} from './runtime-state-machine.types';
import { ALLOWED_TRANSITIONS } from './transition-table';

/**
 * Deterministic finite state machine governing the complete lifecycle of an Experience.
 *
 * Conforms to ADR-007 and ADR-009 specifications:
 * - Pure TypeScript: zero dependencies on Angular, DOM, RxJS, Three.js, Excalidraw.
 * - Zero execution logic: does not simulate, does not render, does not publish events.
 * - Strict transition validation with atomicity ("permanencia en estado" on rejection).
 * - Monotonic deterministic sequence counter (zero Date.now / performance.now).
 */
export class RuntimeStateMachine {
  private _currentState: RuntimeLifecycleState;
  private _previousState: RuntimeLifecycleState | null;
  private _sequence: number;
  private readonly _maxHistorySize: number;
  private _history: StateTransitionRecord[];

  constructor(options: RuntimeStateMachineOptions = {}) {
    this._currentState = options.initialState ?? 'LOAD';
    this._previousState = null;
    this._sequence = 0;
    this._maxHistorySize = options.maxHistorySize ?? 100;
    this._history = [];
  }

  /**
   * Returns the current lifecycle state.
   */
  currentState(): RuntimeLifecycleState {
    return this._currentState;
  }

  /**
   * Returns the immediate previous state, or null if no transition has occurred yet.
   */
  previousState(): RuntimeLifecycleState | null {
    return this._previousState;
  }

  /**
   * Checks whether transitioning from the current state to the target state is legal.
   */
  canTransition(targetState: RuntimeLifecycleState): boolean {
    const allowed = ALLOWED_TRANSITIONS[this._currentState];
    return allowed !== undefined && allowed.has(targetState);
  }

  /**
   * Executes a state transition if valid.
   * Throws `InvalidStateTransitionError` if the transition is illegal.
   * Guarantees atomic state permanency: state is unmodified if rejected.
   *
   * @param targetState The destination state.
   * @param reason Optional human-readable rationale or trigger description.
   */
  transition(targetState: RuntimeLifecycleState, reason?: string): void {
    if (!this.canTransition(targetState)) {
      throw new InvalidStateTransitionError(
        this._currentState,
        targetState,
        reason
          ? `Invalid lifecycle transition: Cannot transition from '${this._currentState}' to '${targetState}': ${reason}`
          : undefined,
      );
    }

    const from = this._currentState;
    this._sequence += 1;

    const record: StateTransitionRecord = {
      from,
      to: targetState,
      sequence: this._sequence,
      ...(reason !== undefined ? { reason } : {}),
    };

    this._history.push(record);

    if (this._maxHistorySize > 0 && this._history.length > this._maxHistorySize) {
      this._history.shift();
    }

    this._previousState = from;
    this._currentState = targetState;
  }

  /**
   * Resets the state machine back to an initial state, clearing history and previous state.
   *
   * @param initialState The state to reset to (defaults to 'LOAD').
   */
  reset(initialState: RuntimeLifecycleState = 'LOAD'): void {
    this._currentState = initialState;
    this._previousState = null;
    this._sequence = 0;
    this._history = [];
  }

  /**
   * Returns an immutable copy of the transition history.
   */
  history(): readonly StateTransitionRecord[] {
    return [...this._history];
  }
}
