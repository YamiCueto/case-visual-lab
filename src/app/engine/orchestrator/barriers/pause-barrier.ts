import { EventPriority } from '../../event-bus/event-envelope';
import { RuntimeEventBus } from '../../event-bus/runtime-event-bus';
import { VirtualClock } from '../../kernel/clock/virtual-clock';
import { RendererEngine } from '../../rendering/renderer-engine';
import { TimelineEngine } from '../../timeline/timeline-engine';

/**
 * Pause Barrier.
 * Enforces atomic pausing across clock, timeline, and renderer without dropping frames.
 */
export class PauseBarrier {
  execute(
    clock: VirtualClock,
    timeline: TimelineEngine,
    renderer: RendererEngine,
    eventBus: RuntimeEventBus,
  ): void {
    // 1. Freeze timeline playback
    timeline.pause();

    // 2. Publish deterministic pause event
    eventBus.publish({
      id: `evt_pause_${clock.time}`,
      scope: 'internal',
      priority: EventPriority.HIGH,
      channel: 'orchestrator',
      type: 'EXPERIENCE_PAUSED',
      timestamp: 0,
      virtualTimeMs: clock.time,
      senderEngine: 'barrier:pause',
      payload: {
        virtualTime: clock.time,
      },
    });
  }
}
