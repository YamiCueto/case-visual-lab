import { ITimelineEngine, TimelineExecutionResult } from './contracts/timeline-engine.interface';
import { TimelineMarker } from './contracts/timeline-marker.types';
import { TimelinePlayState, TimelineSnapshot } from './contracts/timeline-snapshot.types';
import { TimelineTrackDefinition } from './contracts/timeline-track.types';
import { MarkerManager } from './markers/marker-manager';
import { TimelineScheduler } from './scheduler/timeline-scheduler';
import { TimelineTrack } from './tracks/timeline-track';

/**
 * Parallel Timeline Execution Engine.
 *
 * Implements ADR-002, ADR-005, and ADR-009:
 * - Decides WHEN to execute RendererCommands across concurrent tracks.
 * - Enforces zero visual knowledge (no Three.js, Excalidraw, or Canvas).
 * - Multi-track concurrency (Visual, Camera, Audio, Subtitle, Custom).
 * - Deterministic discrete scheduling with sync barriers and checkpoints.
 */
export class TimelineEngine implements ITimelineEngine {
  private _tracks: TimelineTrack[] = [];
  private _markerManager = new MarkerManager();
  private _scheduler = new TimelineScheduler();

  private _currentTimeMs = 0;
  private _totalDurationMs = 0;
  private _state: TimelinePlayState = 'STOPPED';
  private _sequence = 0;
  private _pendingBarrier: TimelineMarker | null = null;
  private _executedFrameIds = new Set<string>();
  private _passedMarkerIds = new Set<string>();
  private _isDisposed = false;

  /**
   * Loads tracks and markers into the timeline and calculates total duration.
   */
  load(
    tracks: readonly TimelineTrackDefinition[],
    markers: readonly TimelineMarker[] = [],
    durationMs?: number,
  ): void {
    this.assertOperational();

    this._tracks = tracks.map((def) => new TimelineTrack(def));
    this._markerManager = new MarkerManager(markers);

    let maxDuration = 0;
    for (const track of this._tracks) {
      const d = track.duration();
      if (d > maxDuration) {
        maxDuration = d;
      }
    }
    const markerMax = this._markerManager.maxTime();
    this._totalDurationMs = Math.max(maxDuration, markerMax, durationMs ?? 0);

    this.stop();
  }

  /**
   * Starts playback from current position.
   */
  play(): void {
    this.assertOperational();
    if (this._state !== 'PLAYING') {
      this._state = 'PLAYING';
    }
  }

  /**
   * Freezes playback at current virtual time.
   */
  pause(): void {
    this.assertOperational();
    if (this._state === 'PLAYING') {
      this._state = 'PAUSED';
    }
  }

  /**
   * Resumes playback after a pause or barrier resolution.
   */
  resume(): void {
    this.assertOperational();
    this._pendingBarrier = null;
    this._state = 'PLAYING';
  }

  /**
   * Advances the timeline forward by deltaVirtualTimeMs.
   */
  tick(deltaVirtualTimeMs: number): TimelineExecutionResult {
    this.assertOperational();

    if (this._state !== 'PLAYING' || deltaVirtualTimeMs <= 0) {
      return this.emptyResult();
    }

    const fromTime = this._currentTimeMs;
    const targetTime = fromTime + deltaVirtualTimeMs;

    const result = this._scheduler.evaluateInterval(
      fromTime,
      targetTime,
      this._tracks,
      this._markerManager,
      fromTime === 0 && this._sequence === 0, // Include t=0 frames on first tick
    );

    this._sequence += 1;
    this._currentTimeMs = result.effectiveTime;

    // Track executed items
    for (const cmd of result.commands) {
      this._executedFrameIds.add(cmd.id);
    }
    for (const marker of result.activeMarkers) {
      this._passedMarkerIds.add(marker.id);
    }

    if (result.hitBarrier) {
      this._pendingBarrier = result.hitBarrier;
      this._state = 'PAUSED';
    }

    const isCompleted = this._currentTimeMs >= this._totalDurationMs;
    if (isCompleted && !result.hitBarrier) {
      this._state = 'STOPPED';
    }

    return {
      commands: result.commands,
      activeMarkers: result.activeMarkers,
      hitBarrier: result.hitBarrier,
      isCompleted,
      currentTimeMs: this._currentTimeMs,
    };
  }

  /**
   * Repositions the timeline to an arbitrary virtual timestamp without setTimeout/RAF.
   */
  seek(targetVirtualTimeMs: number): TimelineExecutionResult {
    this.assertOperational();

    const clampedTarget = Math.max(0, Math.min(targetVirtualTimeMs, this._totalDurationMs));
    this._pendingBarrier = null;

    // Query all frames active up to seek target
    const result = this._scheduler.evaluateInterval(
      0,
      clampedTarget,
      this._tracks,
      this._markerManager,
      true,
    );

    this._currentTimeMs = clampedTarget;
    this._sequence += 1;

    // Rebuild execution sets for new position
    this._executedFrameIds.clear();
    for (const cmd of result.commands) {
      this._executedFrameIds.add(cmd.id);
    }
    this._passedMarkerIds.clear();
    for (const marker of result.activeMarkers) {
      this._passedMarkerIds.add(marker.id);
    }

    return {
      commands: result.commands,
      activeMarkers: result.activeMarkers,
      hitBarrier: null,
      isCompleted: this._currentTimeMs >= this._totalDurationMs,
      currentTimeMs: this._currentTimeMs,
    };
  }

  /**
   * Stops playback and rewinds to t=0.
   */
  stop(): void {
    this.assertOperational();
    this._state = 'STOPPED';
    this._currentTimeMs = 0;
    this._pendingBarrier = null;
    this._executedFrameIds.clear();
    this._passedMarkerIds.clear();
  }

  /**
   * Captures an immutable snapshot of the timeline state.
   */
  snapshot(): TimelineSnapshot {
    this.assertOperational();

    return {
      snapshotId: `tl_snap_${this._sequence}_${this._currentTimeMs}`,
      time: this._currentTimeMs,
      state: this._state,
      executedFrameIds: Array.from(this._executedFrameIds),
      passedMarkerIds: Array.from(this._passedMarkerIds),
      pendingBarrierId: this._pendingBarrier ? this._pendingBarrier.id : null,
      sequence: this._sequence,
    };
  }

  /**
   * Restores timeline state directly to an earlier snapshot.
   */
  restore(snapshot: TimelineSnapshot): void {
    this.assertOperational();

    this._currentTimeMs = snapshot.time;
    this._state = snapshot.state;
    this._sequence = snapshot.sequence;
    this._executedFrameIds = new Set(snapshot.executedFrameIds);
    this._passedMarkerIds = new Set(snapshot.passedMarkerIds);

    if (snapshot.pendingBarrierId) {
      const found = this._markerManager
        .allMarkers()
        .find((m) => m.id === snapshot.pendingBarrierId);
      this._pendingBarrier = found ?? null;
    } else {
      this._pendingBarrier = null;
    }
  }

  /**
   * Releases timeline resources.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._tracks = [];
    this._markerManager.clear();
    this._executedFrameIds.clear();
    this._passedMarkerIds.clear();
    this._pendingBarrier = null;
    this._isDisposed = true;
  }

  time(): number {
    return this._currentTimeMs;
  }

  duration(): number {
    return this._totalDurationMs;
  }

  state(): TimelinePlayState {
    return this._state;
  }

  tracks(): readonly TimelineTrackDefinition[] {
    return this._tracks.map((t) => t.toDefinition());
  }

  markers(): readonly TimelineMarker[] {
    return this._markerManager.allMarkers();
  }

  isDisposed(): boolean {
    return this._isDisposed;
  }

  private emptyResult(): TimelineExecutionResult {
    return {
      commands: [],
      activeMarkers: [],
      hitBarrier: null,
      isCompleted: this._currentTimeMs >= this._totalDurationMs,
      currentTimeMs: this._currentTimeMs,
    };
  }

  private assertOperational(): void {
    if (this._isDisposed) {
      throw new Error('TimelineEngine is disposed and cannot perform operations.');
    }
  }
}
