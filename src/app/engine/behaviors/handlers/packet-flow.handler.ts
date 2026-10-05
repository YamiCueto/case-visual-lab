import { SimulationEvent } from '../../simulation/events/simulation-event.types';
import { RendererCommand } from '../commands/renderer-command.types';
import { BehaviorExecutionContext } from '../contracts/behavior-context.interface';
import { BehaviorHandler, BehaviorMetadata } from '../contracts/behavior-handler.interface';

/**
 * Translates outgoing packet transmission events into visual particle flows.
 */
export class PacketFlowHandler implements BehaviorHandler {
  readonly id = 'packet-flow-handler';

  private readonly _supportedTypes = new Set<string>([
    'http:request-sent',
    'tcp:connecting',
    'gateway:ratelimit-passed',
  ]);

  supports(eventType: string): boolean {
    return this._supportedTypes.has(eventType);
  }

  execute(event: SimulationEvent, _context: BehaviorExecutionContext): readonly RendererCommand[] {
    void _context;
    const targetEntityId = event.targetEntityId ?? 'target';
    const particleId = `particle_${event.eventId}`;

    return [
      {
        id: `cmd_spawn_${event.eventId}`,
        type: 'SPAWN_PARTICLE',
        targetId: event.sourceEntityId,
        payload: {
          particleId,
          sourceEntityId: event.sourceEntityId,
          targetEntityId,
          semanticKind: 'request-packet',
          eventData: event.payload,
        },
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      },
      {
        id: `cmd_move_${event.eventId}`,
        type: 'MOVE_PARTICLE',
        targetId: particleId,
        payload: {
          destinationEntityId: targetEntityId,
        },
        durationMs: 300,
        easing: 'ease-out',
        priority: 'NORMAL',
      },
      {
        id: `cmd_highlight_${event.eventId}`,
        type: 'HIGHLIGHT_NODE',
        targetId: event.sourceEntityId,
        payload: {
          intent: 'transmitting',
          intensity: 0.8,
        },
        durationMs: 150,
        easing: 'ease-in-out',
        priority: 'LOW',
      },
    ];
  }

  metadata(): BehaviorMetadata {
    return {
      id: this.id,
      name: 'Packet Flow Behavior',
      description: 'Animates discrete packet trajectories between communicating entities',
      supportedEventTypes: Array.from(this._supportedTypes),
    };
  }
}
