import { RuntimeEventBus } from '../../event-bus/runtime-event-bus';
import { VirtualClock } from '../../kernel/clock/virtual-clock';
import { RuntimeStateMachine } from '../../kernel/state-machine/runtime-state-machine';
import { IExtensionAccessor } from '../../plugins/contracts/plugin-context.interface';

/**
 * Access interface providing authorized runtime capabilities (Clock, EventBus, State, Extensions).
 */
export interface RuntimeContext {
  readonly clock: VirtualClock;
  readonly eventBus: RuntimeEventBus;
  readonly stateMachine: RuntimeStateMachine;
  readonly extensions: IExtensionAccessor;
  readonly sessionId: string;
}
