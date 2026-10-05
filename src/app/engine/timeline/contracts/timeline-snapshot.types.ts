/**
 * Playback lifecycle state of the timeline engine.
 */
export type TimelinePlayState = 'STOPPED' | 'PLAYING' | 'PAUSED';

/**
 * Immutable state checkpoint of the timeline engine at a discrete point in virtual time.
 */
export interface TimelineSnapshot {
  readonly snapshotId: string;
  readonly time: number;
  readonly state: TimelinePlayState;
  readonly executedFrameIds: readonly string[];
  readonly passedMarkerIds: readonly string[];
  readonly pendingBarrierId: string | null;
  readonly sequence: number;
}
