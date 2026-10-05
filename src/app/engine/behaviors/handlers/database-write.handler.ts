import { SimulationEvent } from '../../simulation/events/simulation-event.types';
import { RendererCommand } from '../commands/renderer-command.types';
import { BehaviorExecutionContext } from '../contracts/behavior-context.interface';
import { BehaviorHandler, BehaviorMetadata } from '../contracts/behavior-handler.interface';

/**
 * Translates database queries and transaction commits into disk I/O visual cues and audio.
 */
export class DatabaseWriteHandler implements BehaviorHandler {
  readonly id = 'database-write-handler';

  private readonly _supportedTypes = new Set<string>(['database:query', 'database:commit']);

  supports(eventType: string): boolean {
    return this._supportedTypes.has(eventType);
  }

  execute(event: SimulationEvent, _context: BehaviorExecutionContext): readonly RendererCommand[] {
    void _context;
    const isCommit = event.type === 'database:commit';

    return [
      {
        id: `cmd_db_highlight_${event.eventId}`,
        type: 'HIGHLIGHT_NODE',
        targetId: 'database',
        payload: {
          intent: isCommit ? 'success' : 'busy',
          glowColor: isCommit ? '#10B981' : '#F59E0B',
          intensity: 1.2,
        },
        durationMs: 250,
        easing: 'ease-out',
        priority: 'HIGH',
      },
      {
        id: `cmd_db_badge_${event.eventId}`,
        type: 'UPDATE_BADGE',
        targetId: 'database',
        payload: {
          text: isCommit ? 'COMMITTED' : 'QUERYING',
          intent: isCommit ? 'success' : 'warning',
        },
        durationMs: 300,
        easing: 'linear',
        priority: 'NORMAL',
      },
      {
        id: `cmd_db_audio_${event.eventId}`,
        type: 'PLAY_AUDIO_CUE',
        targetId: 'audio',
        payload: {
          cue: isCommit ? 'db_commit_sfx' : 'db_query_sfx',
          volume: 0.7,
        },
        durationMs: 100,
        easing: 'linear',
        priority: 'LOW',
      },
    ];
  }

  metadata(): BehaviorMetadata {
    return {
      id: this.id,
      name: 'Database Write Behavior',
      description: 'Generates storage glow, status badges, and audio cues for DB I/O',
      supportedEventTypes: Array.from(this._supportedTypes),
    };
  }
}
