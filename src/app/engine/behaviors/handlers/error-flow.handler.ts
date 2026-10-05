import { SimulationEvent } from '../../simulation/events/simulation-event.types';
import { RendererCommand } from '../commands/renderer-command.types';
import { BehaviorExecutionContext } from '../contracts/behavior-context.interface';
import { BehaviorHandler, BehaviorMetadata } from '../contracts/behavior-handler.interface';

/**
 * Translates security, rate limiting, and domain fault events into error visual cues.
 */
export class ErrorFlowHandler implements BehaviorHandler {
  readonly id = 'error-flow-handler';

  private readonly _supportedTypes = new Set<string>([
    'security:jwt-invalid',
    'gateway:ratelimit-exceeded',
    'domain:not-found',
    'domain:error',
  ]);

  supports(eventType: string): boolean {
    return this._supportedTypes.has(eventType);
  }

  execute(event: SimulationEvent, _context: BehaviorExecutionContext): readonly RendererCommand[] {
    void _context;
    const targetEntityId = event.targetEntityId ?? 'client';
    const payload = event.payload as { status?: number; error?: string };
    const status = payload.status ?? 500;
    const particleId = `error_particle_${event.eventId}`;

    return [
      {
        id: `cmd_err_highlight_${event.eventId}`,
        type: 'HIGHLIGHT_NODE',
        targetId: event.sourceEntityId,
        payload: {
          intent: 'error',
          glowColor: '#EF4444',
          intensity: 1.5,
        },
        durationMs: 250,
        easing: 'ease-out',
        priority: 'HIGH',
      },
      {
        id: `cmd_err_spawn_${event.eventId}`,
        type: 'SPAWN_PARTICLE',
        targetId: event.sourceEntityId,
        payload: {
          particleId,
          semanticKind: 'error-packet',
          status,
          error: payload.error ?? 'Error',
        },
        durationMs: 0,
        easing: 'linear',
        priority: 'HIGH',
      },
      {
        id: `cmd_err_move_${event.eventId}`,
        type: 'MOVE_PARTICLE',
        targetId: particleId,
        payload: {
          destinationEntityId: targetEntityId,
        },
        durationMs: 200,
        easing: 'ease-out',
        priority: 'HIGH',
      },
      {
        id: `cmd_err_badge_${event.eventId}`,
        type: 'UPDATE_BADGE',
        targetId: targetEntityId,
        payload: {
          text: `HTTP ${status}`,
          intent: 'error',
        },
        durationMs: 400,
        easing: 'linear',
        priority: 'NORMAL',
      },
      {
        id: `cmd_err_audio_${event.eventId}`,
        type: 'PLAY_AUDIO_CUE',
        targetId: 'audio',
        payload: {
          cue: 'http_error_alert',
          volume: 1.0,
        },
        durationMs: 200,
        easing: 'linear',
        priority: 'NORMAL',
      },
    ];
  }

  metadata(): BehaviorMetadata {
    return {
      id: this.id,
      name: 'Error Flow Behavior',
      description: 'Animates red alert highlights, error packets, and failure sound cues',
      supportedEventTypes: Array.from(this._supportedTypes),
    };
  }
}
