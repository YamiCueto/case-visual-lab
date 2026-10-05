import { TimelineFrame } from './timeline-frame.types';

/**
 * Supported timeline track types executing concurrently in the Parallel Scheduler.
 */
export type TimelineTrackType = 'VISUAL' | 'CAMERA' | 'AUDIO' | 'SUBTITLE' | 'CUSTOM';

/**
 * Definition of a timeline track containing an ordered sequence of frames.
 */
export interface TimelineTrackDefinition {
  readonly id: string;
  readonly type: TimelineTrackType;
  readonly name: string;
  readonly frames: readonly TimelineFrame[];
  readonly muted?: boolean;
  readonly priority?: number;
}
