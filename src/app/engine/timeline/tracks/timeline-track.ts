import { TimelineFrame } from '../contracts/timeline-frame.types';
import { TimelineTrackDefinition, TimelineTrackType } from '../contracts/timeline-track.types';

/**
 * Encapsulates an ordered sequence of frames for a concurrent timeline channel.
 */
export class TimelineTrack {
  readonly id: string;
  readonly type: TimelineTrackType;
  readonly name: string;
  readonly priority: number;
  private _muted: boolean;
  private _frames: TimelineFrame[];

  constructor(definition: TimelineTrackDefinition) {
    this.id = definition.id;
    this.type = definition.type;
    this.name = definition.name;
    this._muted = definition.muted ?? false;
    this.priority = definition.priority ?? this.defaultPriority(definition.type);
    this._frames = [...definition.frames].sort((a, b) => a.time - b.time);
  }

  /**
   * Queries all frames scheduled within the half-open interval (previousTimeMs, currentTimeMs].
   * If includeExactStart is true, includes frames scheduled exactly at previousTimeMs (useful for t=0).
   */
  queryFrames(
    previousTimeMs: number,
    currentTimeMs: number,
    includeExactStart = false,
  ): readonly TimelineFrame[] {
    if (this._muted || this._frames.length === 0) {
      return [];
    }

    const matches: TimelineFrame[] = [];

    for (const frame of this._frames) {
      const isMatch = includeExactStart
        ? frame.time >= previousTimeMs && frame.time <= currentTimeMs
        : frame.time > previousTimeMs && frame.time <= currentTimeMs;

      if (isMatch) {
        matches.push(frame);
      }
    }

    return matches;
  }

  /**
   * Returns all frames associated with this track.
   */
  allFrames(): readonly TimelineFrame[] {
    return [...this._frames];
  }

  /**
   * Computes the maximum end timestamp of any frame in this track.
   */
  duration(): number {
    let max = 0;
    for (const f of this._frames) {
      const end = f.time + f.duration;
      if (end > max) {
        max = end;
      }
    }
    return max;
  }

  isMuted(): boolean {
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
  }

  toDefinition(): TimelineTrackDefinition {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      frames: [...this._frames],
      muted: this._muted,
      priority: this.priority,
    };
  }

  private defaultPriority(type: TimelineTrackType): number {
    switch (type) {
      case 'CAMERA':
        return 100;
      case 'AUDIO':
        return 90;
      case 'VISUAL':
        return 80;
      case 'SUBTITLE':
        return 70;
      case 'CUSTOM':
      default:
        return 50;
    }
  }
}
