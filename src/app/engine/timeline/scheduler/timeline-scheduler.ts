import { CommandPriority, RendererCommand } from '../../behaviors/commands/renderer-command.types';
import { TimelineFrame } from '../contracts/timeline-frame.types';
import { TimelineMarker } from '../contracts/timeline-marker.types';
import { MarkerManager } from '../markers/marker-manager';
import { TimelineTrack } from '../tracks/timeline-track';

export interface ScheduledStepResult {
  readonly commands: readonly RendererCommand[];
  readonly activeMarkers: readonly TimelineMarker[];
  readonly hitBarrier: TimelineMarker | null;
  readonly effectiveTime: number;
}

/**
 * Parallel multi-track scheduler.
 * Evaluates N concurrent timeline tracks deterministically and enforces barrier gates.
 */
export class TimelineScheduler {
  private static readonly PRIORITY_WEIGHTS: Readonly<Record<CommandPriority, number>> = {
    CRITICAL: 4,
    HIGH: 3,
    NORMAL: 2,
    LOW: 1,
  };

  /**
   * Evaluates all concurrent tracks over the interval (fromTime, toTime].
   * Halts progress at the earliest barrier encountered.
   */
  evaluateInterval(
    fromTime: number,
    toTime: number,
    tracks: readonly TimelineTrack[],
    markerManager: MarkerManager,
    includeExactStart = false,
  ): ScheduledStepResult {
    const barrier = markerManager.findNextBarrier(fromTime, toTime);
    const effectiveTime = barrier ? barrier.time : toTime;

    const collectedFrames: { frame: TimelineFrame; track: TimelineTrack }[] = [];

    // Evaluate all tracks concurrently in parallel
    for (const track of tracks) {
      if (!track.isMuted()) {
        const frames = track.queryFrames(fromTime, effectiveTime, includeExactStart);
        for (const frame of frames) {
          collectedFrames.push({ frame, track });
        }
      }
    }

    // Sort collected commands deterministically
    const sortedCommands = this.orderCommands(collectedFrames);

    // Collect markers within the evaluated window
    const activeMarkers = markerManager.queryMarkers(fromTime, effectiveTime, includeExactStart);

    return {
      commands: sortedCommands,
      activeMarkers,
      hitBarrier: barrier,
      effectiveTime,
    };
  }

  private orderCommands(
    items: { frame: TimelineFrame; track: TimelineTrack }[],
  ): readonly RendererCommand[] {
    // Flatten and tag with ordering keys
    const tagged: {
      time: number;
      trackPriority: number;
      cmdPriority: number;
      index: number;
      command: RendererCommand;
    }[] = [];

    let seq = 0;
    for (const { frame, track } of items) {
      for (const cmd of frame.commands) {
        seq += 1;
        tagged.push({
          time: frame.time,
          trackPriority: track.priority,
          cmdPriority: TimelineScheduler.PRIORITY_WEIGHTS[cmd.priority] ?? 0,
          index: seq,
          command: cmd,
        });
      }
    }

    // Sort: 1) time ascending, 2) trackPriority descending, 3) cmdPriority descending, 4) index
    tagged.sort((a, b) => {
      if (a.time !== b.time) {
        return a.time - b.time;
      }
      if (a.trackPriority !== b.trackPriority) {
        return b.trackPriority - a.trackPriority;
      }
      if (a.cmdPriority !== b.cmdPriority) {
        return b.cmdPriority - a.cmdPriority;
      }
      return a.index - b.index;
    });

    return tagged.map((t) => t.command);
  }
}
