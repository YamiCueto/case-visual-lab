import { SimulationEvent } from '../../simulation/events/simulation-event.types';
import { RendererCommandBatch } from '../commands/renderer-command-batch';
import { BehaviorExecutionContext } from '../contracts/behavior-context.interface';
import { BehaviorHandler } from '../contracts/behavior-handler.interface';
import { IBehaviorRegistry } from '../contracts/behavior-registry.interface';

/**
 * High-performance, O(1) dynamic behavior registry.
 *
 * Implements Open/Closed Principle:
 * - Dynamic registration and subscription without any `switch`, `if (type === ...)`, or `instanceof`.
 * - Preserves deterministic registration order for event dispatching.
 */
export class BehaviorRegistry implements IBehaviorRegistry {
  private _handlers = new Map<string, BehaviorHandler>();
  private _typeIndex = new Map<string, Set<string>>();

  /**
   * Registers a behavior handler and maps all its declared supported event types.
   */
  register(handler: BehaviorHandler): void {
    if (this._handlers.has(handler.id)) {
      this.unregister(handler.id);
    }

    this._handlers.set(handler.id, handler);

    const supportedTypes = handler.metadata().supportedEventTypes;
    for (const eventType of supportedTypes) {
      let idSet = this._typeIndex.get(eventType);
      if (!idSet) {
        idSet = new Set<string>();
        this._typeIndex.set(eventType, idSet);
      }
      idSet.add(handler.id);
    }
  }

  /**
   * Unregisters a handler by handlerId or removes all handlers for an event type.
   */
  unregister(identifier: string): void {
    if (this._handlers.has(identifier)) {
      const handler = this._handlers.get(identifier)!;
      this._handlers.delete(identifier);

      for (const eventType of handler.metadata().supportedEventTypes) {
        const idSet = this._typeIndex.get(eventType);
        if (idSet) {
          idSet.delete(identifier);
          if (idSet.size === 0) {
            this._typeIndex.delete(eventType);
          }
        }
      }
      return;
    }

    // If identifier matches an event type, clear its mappings
    if (this._typeIndex.has(identifier)) {
      this._typeIndex.delete(identifier);
    }
  }

  /**
   * Resolves all handlers subscribed to the given event type.
   */
  resolve(eventType: string): readonly BehaviorHandler[] {
    const idSet = this._typeIndex.get(eventType);
    if (!idSet || idSet.size === 0) {
      return [];
    }

    const resolved: BehaviorHandler[] = [];
    for (const handlerId of idSet) {
      const handler = this._handlers.get(handlerId);
      if (handler && handler.supports(eventType)) {
        resolved.push(handler);
      }
    }

    return resolved;
  }

  /**
   * Dispatches the simulation event across all resolved handlers
   * and aggregates their generated RendererCommands into a batch.
   */
  execute(event: SimulationEvent, context: BehaviorExecutionContext): RendererCommandBatch {
    const handlers = this.resolve(event.type);
    const batch = new RendererCommandBatch();

    for (const handler of handlers) {
      const commands = handler.execute(event, context);
      batch.append(commands);
    }

    return batch;
  }

  /**
   * Lists all registered handlers.
   */
  list(): readonly BehaviorHandler[] {
    return Array.from(this._handlers.values());
  }

  /**
   * Clears all registrations and indices.
   */
  clear(): void {
    this._handlers.clear();
    this._typeIndex.clear();
  }
}
