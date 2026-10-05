import { SimulationEvent } from '../../simulation/events/simulation-event.types';
import { RendererCommandBatch } from '../commands/renderer-command-batch';
import { BehaviorExecutionContext } from './behavior-context.interface';
import { BehaviorHandler } from './behavior-handler.interface';

/**
 * Registry and dispatch pipeline for behavior handlers.
 * Dynamically resolves handlers based on event types without conditional branching.
 */
export interface IBehaviorRegistry {
  /**
   * Registers a new behavior handler into the dispatch table.
   */
  register(handler: BehaviorHandler): void;

  /**
   * Unregisters a handler by its identifier or supported event type.
   */
  unregister(handlerId: string): void;

  /**
   * Resolves all handlers registered for a given simulation event type.
   */
  resolve(eventType: string): readonly BehaviorHandler[];

  /**
   * Executes all handlers registered for the event's type, accumulating commands into a batch.
   */
  execute(event: SimulationEvent, context: BehaviorExecutionContext): RendererCommandBatch;

  /**
   * Lists all currently registered handlers in registration order.
   */
  list(): readonly BehaviorHandler[];

  /**
   * Removes all handlers from the registry.
   */
  clear(): void;
}
