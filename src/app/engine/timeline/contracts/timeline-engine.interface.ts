import { RendererCommand } from '../../behaviors/commands/renderer-command.types';
import { TimelineMarker } from './timeline-marker.types';
import { TimelinePlayState, TimelineSnapshot } from './timeline-snapshot.types';
import { TimelineTrackDefinition } from './timeline-track.types';

/**
 * Result returned by the TimelineEngine on discrete ticks or seeks.
 */
export interface TimelineExecutionResult {
  readonly commands: readonly RendererCommand[];
  readonly activeMarkers: readonly TimelineMarker[];
  readonly hitBarrier: TimelineMarker | null;
  readonly isCompleted: boolean;
  readonly currentTimeMs: number;
}

/**
 * Contract for the Timeline Execution Engine.
 * Decides WHEN to execute RendererCommands across concurrent tracks with temporal barriers.
 */
export interface ITimelineEngine {
  /**
   * Loads tracks and optional markers into the timeline.
   */
  load(
    tracks: readonly TimelineTrackDefinition[],
    markers?: readonly TimelineMarker[],
    durationMs?: number,
  ): void;

  /**
   * Starts playback from current position.
   */
  play(): void;

  /**
   * Freezes playback at current virtual time.
   */
  pause(): void;

  /**
   * Resumes playback after a pause or barrier resolution.
   */
  resume(): void;

  /**
   * Steps the timeline forward by deltaVirtualTimeMs.
   */
  tick(deltaVirtualTimeMs: number): TimelineExecutionResult;

  /**
   * Repositions the timeline to an arbitrary virtual timestamp.
   */
  seek(targetVirtualTimeMs: number): TimelineExecutionResult;

  /**
   * Stops playback and resets timeline position to 0ms.
   */
  stop(): void;

  /**
   * Captures an immutable checkpoint of the timeline state.
   */
  snapshot(): TimelineSnapshot;

  /**
   * Restores timeline state directly to an earlier snapshot.
   */
  restore(snapshot: TimelineSnapshot): void;

  /**
   * Releases timeline resources.
   */
  dispose(): void;

  /**
   * Current logical virtual time in milliseconds.
   */
  time(): number;

  /**
   * Total duration of the timeline based on longest track or marker.
   */
  duration(): number;

  /**
   * Current playback state.
   */
  state(): TimelinePlayState;

  /**
   * Returns registered tracks.
   */
  tracks(): readonly TimelineTrackDefinition[];

  /**
   * Returns registered markers.
   */
  markers(): readonly TimelineMarker[];

  /**
   * Returns true if disposed.
   */
  isDisposed(): boolean;
}
