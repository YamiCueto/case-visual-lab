import { EventPriority } from '../../event-bus/event-envelope';
import { RuntimeEventBus } from '../../event-bus/runtime-event-bus';
import { VirtualClock } from '../../kernel/clock/virtual-clock';
import { RendererEngine } from '../../rendering/renderer-engine';
import { SimulationRuntime } from '../../simulation/runtime/simulation-runtime';
import { TimelineEngine } from '../../timeline/timeline-engine';

/**
 * Seek Barrier.
 * Implements deterministic time-travel and world-state reconstruction according to ADR-010.
 * Rebuilds simulation state via historical snapshots and repositions timeline frames.
 */
export class SeekBarrier {
  execute(
    targetTimeMs: number,
    clock: VirtualClock,
    simulation: SimulationRuntime,
    timeline: TimelineEngine,
    renderer: RendererEngine,
    eventBus: RuntimeEventBus,
  ): void {
    const fromTime = clock.time;

    // 1. Emit seek start notification
    eventBus.publish({
      id: `evt_seek_start_${targetTimeMs}`,
      scope: 'internal',
      priority: EventPriority.HIGH,
      channel: 'orchestrator',
      type: 'SEEK_STARTED',
      timestamp: 0,
      virtualTimeMs: fromTime,
      senderEngine: 'barrier:seek',
      payload: {
        fromTime,
        targetTime: targetTimeMs,
      },
    });

    // 2. Reconstruct simulation state deterministically
    if (simulation.isInitialized()) {
      const simCurrentTime = simulation.time();

      if (targetTimeMs < simCurrentTime) {
        // Rewind: find closest prior snapshot
        const snapshots = simulation.snapshots();
        let closestSnapshot = null;

        for (const snap of snapshots) {
          if (snap.time <= targetTimeMs) {
            if (!closestSnapshot || snap.time > closestSnapshot.time) {
              closestSnapshot = snap;
            }
          }
        }

        if (closestSnapshot) {
          simulation.restore(closestSnapshot);
          const remaining = targetTimeMs - simulation.time();
          if (remaining > 0) {
            simulation.step(remaining);
          }
        } else if (snapshots.length > 0) {
          // Restore earliest available snapshot
          simulation.restore(snapshots[0]);
          const remaining = targetTimeMs - simulation.time();
          if (remaining > 0) {
            simulation.step(remaining);
          }
        }
      } else if (targetTimeMs > simCurrentTime) {
        // Fast-Forward: step simulation forward to target
        const delta = targetTimeMs - simCurrentTime;
        simulation.step(delta);
      }
    }

    // 3. Reposition timeline engine
    const timelineResult = timeline.seek(targetTimeMs);

    // 4. Reposition clock
    clock.seek(targetTimeMs);

    // 5. If static frame commands were evaluated at target position, dispatch to renderers
    if (timelineResult.commands.length > 0 && renderer.isInitialized()) {
      renderer.dispatch(timelineResult.commands, {
        virtualTime: targetTimeMs,
      });
    }

    // 6. Emit seek complete notification
    eventBus.publish({
      id: `evt_seek_complete_${targetTimeMs}`,
      scope: 'internal',
      priority: EventPriority.HIGH,
      channel: 'orchestrator',
      type: 'SEEK_COMPLETED',
      timestamp: 0,
      virtualTimeMs: targetTimeMs,
      senderEngine: 'barrier:seek',
      payload: {
        virtualTime: targetTimeMs,
      },
    });
  }
}
