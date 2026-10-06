import {
  RuntimeLifecycleState,
  StateTransitionRecord,
} from '../../kernel/state-machine/runtime-state-machine.types';

export type OrchestratorLifecycleState = RuntimeLifecycleState;
export type { StateTransitionRecord };

export type OrchestratorErrorCode =
  | 'INVALID_STATE_TRANSITION'
  | 'EXPERIENCE_LOAD_FAILED'
  | 'INITIALIZATION_FAILED'
  | 'SIMULATION_ERROR'
  | 'RENDERER_ERROR'
  | 'TIMELINE_ERROR'
  | 'OPERATION_ABORTED'
  | 'DISPOSED';

export class OrchestratorError extends Error {
  constructor(
    readonly code: OrchestratorErrorCode,
    message: string,
    override readonly cause?: unknown,
  ) {
    super(`[OrchestratorError:${code}] ${message}`, { cause });
    this.name = 'OrchestratorError';
    Object.setPrototypeOf(this, OrchestratorError.prototype);
  }
}
