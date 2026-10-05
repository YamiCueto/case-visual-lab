import { TimelineMarker } from '../contracts/timeline-marker.types';

/**
 * Manages timeline checkpoints, synchronization barriers, and semantic cue markers.
 */
export class MarkerManager {
  private _markers: TimelineMarker[] = [];

  constructor(initialMarkers: readonly TimelineMarker[] = []) {
    this._markers = [...initialMarkers].sort((a, b) => a.time - b.time);
  }

  /**
   * Adds a new marker and maintains chronological ordering.
   */
  addMarker(marker: TimelineMarker): void {
    this._markers.push(marker);
    this._markers.sort((a, b) => a.time - b.time);
  }

  /**
   * Queries all markers triggered within the interval (prevTime, currTime].
   */
  queryMarkers(
    prevTime: number,
    currTime: number,
    includeExactStart = false,
  ): readonly TimelineMarker[] {
    const matches: TimelineMarker[] = [];

    for (const marker of this._markers) {
      const isMatch = includeExactStart
        ? marker.time >= prevTime && marker.time <= currTime
        : marker.time > prevTime && marker.time <= currTime;

      if (isMatch) {
        matches.push(marker);
      }
    }

    return matches;
  }

  /**
   * Finds the earliest synchronization barrier in the interval (fromTime, toTime].
   */
  findNextBarrier(fromTime: number, toTime: number): TimelineMarker | null {
    for (const marker of this._markers) {
      if (marker.kind === 'BARRIER' && marker.time > fromTime && marker.time <= toTime) {
        return marker;
      }
    }
    return null;
  }

  /**
   * Returns all markers.
   */
  allMarkers(): readonly TimelineMarker[] {
    return [...this._markers];
  }

  /**
   * Maximum marker timestamp.
   */
  maxTime(): number {
    let max = 0;
    for (const m of this._markers) {
      if (m.time > max) {
        max = m.time;
      }
    }
    return max;
  }

  clear(): void {
    this._markers = [];
  }
}
