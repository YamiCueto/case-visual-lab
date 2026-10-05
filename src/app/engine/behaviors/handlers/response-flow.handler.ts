import { SimulationEvent } from '../../simulation/events/simulation-event.types';
import { RendererCommand } from '../commands/renderer-command.types';
import { BehaviorExecutionContext } from '../contracts/behavior-context.interface';
import { BehaviorHandler, BehaviorMetadata } from '../contracts/behavior-handler.interface';

/**
 * Translates HTTP response events into return particle flows towards the client.
 */
export class ResponseFlowHandler implements BehaviorHandler {
  readonly id = 'response-flow-handler';

  private readonly _supportedTypes = new Set<string>(['http:response-sent']);

  supports(eventType: string): boolean {
    return this._supportedTypes.has(eventType);
  }

  execute(event: SimulationEvent, _context: BehaviorExecutionContext): readonly RendererCommand[] {
    void _context;
    const targetEntityId = event.targetEntityId ?? 'client';
    const particleId = `response_particle_${event.eventId}`;
    const payload = event.payload as { status?: number; statusText?: string };
    const status = payload.status ?? 200;
    const isSuccess = status >= 200 && status < 400;

    return [
      {
        id: `cmd_spawn_resp_${event.eventId}`,
        type: 'SPAWN_PARTICLE',
        targetId: event.sourceEntityId,
        payload: {
          particleId,
          sourceEntityId: event.sourceEntityId,
          targetEntityId,
          semanticKind: 'response-packet',
          status,
          isSuccess,
        },
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      },
      {
        id: `cmd_move_resp_${event.eventId}`,
        type: 'MOVE_PARTICLE',
        targetId: particleId,
        payload: {
          destinationEntityId: targetEntityId,
        },
        durationMs: 250,
        easing: 'ease-in-out',
        priority: 'NORMAL',
      },
      {
        id: `cmd_badge_resp_${event.eventId}`,
        type: 'UPDATE_BADGE',
        targetId: targetEntityId,
        payload: {
          text: `HTTP ${status}`,
          intent: isSuccess ? 'success' : 'error',
        },
        durationMs: 400,
        easing: 'linear',
        priority: 'NORMAL',
      },
      {
        id: `cmd_audio_resp_${event.eventId}`,
        type: 'PLAY_AUDIO_CUE',
        targetId: 'audio',
        payload: {
          cue: isSuccess ? 'http_success_cue' : 'http_error_cue',
          status,
        },
        durationMs: 150,
        easing: 'linear',
        priority: 'LOW',
      },
    ];
  }

  metadata(): BehaviorMetadata {
    return {
      id: this.id,
      name: 'Response Flow Behavior',
      description:
        'Animates return packet trajectories from server back to client with HTTP status cues',
      supportedEventTypes: Array.from(this._supportedTypes),
    };
  }
}
