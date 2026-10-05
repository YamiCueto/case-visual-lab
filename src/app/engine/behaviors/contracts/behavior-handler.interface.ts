import { SimulationEvent } from '../../simulation/events/simulation-event.types';
import { RendererCommand } from '../commands/renderer-command.types';
import { BehaviorExecutionContext } from './behavior-context.interface';

/**
 * Metadata descriptor for a behavior handler.
 */
export interface BehaviorMetadata {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly supportedEventTypes: readonly string[];
}

/**
 * Result returned from executing a behavior on a simulation event.
 */
export interface BehaviorResult {
  readonly handlerId: string;
  readonly eventId: string;
  readonly commands: readonly RendererCommand[];
}

/**
 * Strategy contract for translating discrete domain simulation events
 * into universal visual and auditory RendererCommands.
 *
 * Invariant: Handlers have zero knowledge of Three.js, Excalidraw, DOM, or WebGL.
 */
export interface BehaviorHandler {
  readonly id: string;

  /**
   * Returns true if this handler knows how to interpret the given simulation event type.
   */
  supports(eventType: string): boolean;

  /**
   * Translates a simulation event into a sequence of renderer commands.
   */
  execute(event: SimulationEvent, context: BehaviorExecutionContext): readonly RendererCommand[];

  /**
   * Returns metadata declaring capabilities and supported event subscriptions.
   */
  metadata(): BehaviorMetadata;
}
