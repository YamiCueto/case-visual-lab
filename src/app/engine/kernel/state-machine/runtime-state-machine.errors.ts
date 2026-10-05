import { RuntimeLifecycleState } from './runtime-state-machine.types';

/**
 * Thrown when an illegal or impossible state transition is attempted
 * in the RuntimeStateMachine.
 */
export class InvalidStateTransitionError extends Error {
  readonly from: RuntimeLifecycleState;
  readonly to: RuntimeLifecycleState;

  constructor(from: RuntimeLifecycleState, to: RuntimeLifecycleState, message?: string) {
    super(message ?? `Invalid lifecycle transition: Cannot transition from '${from}' to '${to}'.`);
    this.name = 'InvalidStateTransitionError';
    this.from = from;
    this.to = to;
  }
}
