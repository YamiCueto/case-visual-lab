import { SimulationEvent } from '../../simulation/events/simulation-event.types';
import { RendererCommand } from '../commands/renderer-command.types';
import { BehaviorExecutionContext } from '../contracts/behavior-context.interface';
import { BehaviorHandler, BehaviorMetadata } from '../contracts/behavior-handler.interface';

/**
 * Translates entity processing events into visual node pulse and status badge commands.
 */
export class NodePulseHandler implements BehaviorHandler {
  readonly id = 'node-pulse-handler';

  private readonly _supportedTypes = new Set<string>([
    'controller:entered',
    'domain:executed',
    'security:jwt-valid',
  ]);

  supports(eventType: string): boolean {
    return this._supportedTypes.has(eventType);
  }

  execute(event: SimulationEvent, _context: BehaviorExecutionContext): readonly RendererCommand[] {
    void _context;
    return [
      {
        id: `cmd_pulse_${event.eventId}`,
        type: 'HIGHLIGHT_NODE',
        targetId: event.sourceEntityId,
        payload: {
          intent: 'processing',
          intensity: 1.0,
          eventType: event.type,
        },
        durationMs: 200,
        easing: 'ease-in-out',
        priority: 'NORMAL',
      },
      {
        id: `cmd_badge_${event.eventId}`,
        type: 'UPDATE_BADGE',
        targetId: event.sourceEntityId,
        payload: {
          text: 'ACTIVE',
          intent: 'info',
        },
        durationMs: 300,
        easing: 'linear',
        priority: 'LOW',
      },
    ];
  }

  metadata(): BehaviorMetadata {
    return {
      id: this.id,
      name: 'Node Pulse Behavior',
      description: 'Emits visual highlight pulses and badge updates when nodes process logic',
      supportedEventTypes: Array.from(this._supportedTypes),
    };
  }
}
