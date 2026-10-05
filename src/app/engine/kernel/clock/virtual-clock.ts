import {
  VirtualClockOptions,
  VirtualClockSnapshot,
  VirtualClockState,
} from './virtual-clock.types';

/**
 * Deterministic master virtual clock for CASE Visual Lab.
 * Governs the logical time of an experience completely decoupled from wall-clock time.
 * 100% pure TypeScript - zero dependencies on Date.now(), performance.now(), or timers.
 */
export class VirtualClock {
  private currentTimeMs: number;
  private currentState: VirtualClockState;
  private currentSpeed: number;
  private previousStateBeforeSeek: VirtualClockState = 'STOPPED';

  private readonly minSpeed: number;
  private readonly maxSpeed: number;
  private readonly defaultSpeed: number;

  constructor(options: VirtualClockOptions = {}) {
    this.currentTimeMs = Math.max(0, options.initialTimeMs ?? 0);
    this.defaultSpeed = options.defaultSpeed ?? 1.0;
    this.minSpeed = options.minSpeed ?? 0.1;
    this.maxSpeed = options.maxSpeed ?? 10.0;
    this.currentSpeed = this.clampSpeed(this.defaultSpeed);
    this.currentState = 'STOPPED';
  }

  /**
   * Current logical virtual time in milliseconds.
   */
  get time(): number {
    return this.currentTimeMs;
  }

  /**
   * Current speed multiplier (e.g. 0.25, 0.5, 1.0, 1.5, 2.0, 5.0).
   */
  get speed(): number {
    return this.currentSpeed;
  }

  /**
   * Current clock state machine phase.
   */
  get state(): VirtualClockState {
    return this.currentState;
  }

  get isPlaying(): boolean {
    return this.currentState === 'PLAYING';
  }

  get isPaused(): boolean {
    return this.currentState === 'PAUSED';
  }

  get isStopped(): boolean {
    return this.currentState === 'STOPPED';
  }

  /**
   * Transitions clock to READY state at current or zero timestamp.
   */
  ready(): void {
    if (this.currentState !== 'PLAYING') {
      this.currentState = 'READY';
    }
  }

  /**
   * Starts or resumes playback. Advances state to PLAYING.
   */
  play(): void {
    this.currentState = 'PLAYING';
  }

  /**
   * Pauses the clock, freezing virtual time progression.
   */
  pause(): void {
    if (this.currentState === 'PLAYING') {
      this.currentState = 'PAUSED';
    }
  }

  /**
   * Resumes playback if currently paused.
   */
  resume(): void {
    if (this.currentState === 'PAUSED') {
      this.currentState = 'PLAYING';
    }
  }

  /**
   * Stops playback and resets virtual time to 0.
   */
  stop(): void {
    this.currentTimeMs = 0;
    this.currentState = 'STOPPED';
  }

  /**
   * Resets time to 0, restores default speed, and transitions to READY.
   */
  reset(): void {
    this.currentTimeMs = 0;
    this.currentSpeed = this.defaultSpeed;
    this.currentState = 'READY';
  }

  /**
   * Explicitly enters the SEEKING state (useful during asynchronous asset buffering).
   */
  beginSeek(): void {
    if (this.currentState !== 'SEEKING') {
      this.previousStateBeforeSeek = this.currentState;
      this.currentState = 'SEEKING';
    }
  }

  /**
   * Exits the SEEKING state, restoring the state prior to seeking.
   */
  endSeek(): void {
    if (this.currentState === 'SEEKING') {
      this.currentState = this.previousStateBeforeSeek;
    }
  }

  /**
   * Atomically seeks to an arbitrary target time in milliseconds.
   * This is the ONLY authorized mechanism to move virtual time backwards.
   * Target is clamped to >= 0.
   */
  seek(targetTimeMs: number): number {
    this.currentTimeMs = Math.max(0, targetTimeMs);
    return this.currentTimeMs;
  }

  /**
   * Advances the clock by an external delta in milliseconds.
   * Strict invariants:
   * - deltaMs must be non-negative.
   * - Time advances ONLY when in PLAYING state.
   * - Time progression is scaled by currentSpeed: delta * speed.
   */
  tick(deltaMs: number): number {
    if (deltaMs < 0) {
      throw new Error(`VirtualClock: deltaMs must be non-negative. Received: ${deltaMs}`);
    }

    if (this.currentState !== 'PLAYING') {
      return this.currentTimeMs;
    }

    const scaledDelta = deltaMs * this.currentSpeed;
    this.currentTimeMs += scaledDelta;

    return this.currentTimeMs;
  }

  /**
   * Advances virtual time directly forward to targetTimeMs.
   * Strict invariant:
   * - Can only move forward! If targetTimeMs <= currentTimeMs, this is a no-op.
   * - Backward movement is strictly reserved for seek().
   */
  advanceTo(targetTimeMs: number): number {
    if (targetTimeMs > this.currentTimeMs) {
      this.currentTimeMs = targetTimeMs;
    }
    return this.currentTimeMs;
  }

  /**
   * Sets the playback speed multiplier.
   * Validated and clamped between minSpeed and maxSpeed.
   */
  setSpeed(multiplier: number): void {
    this.currentSpeed = this.clampSpeed(multiplier);
  }

  /**
   * Captures an immutable snapshot of the current clock state.
   */
  snapshot(): VirtualClockSnapshot {
    return {
      timeMs: this.currentTimeMs,
      state: this.currentState,
      speed: this.currentSpeed,
    };
  }

  private clampSpeed(speed: number): number {
    if (isNaN(speed) || speed <= 0) {
      return this.defaultSpeed;
    }
    return Math.max(this.minSpeed, Math.min(this.maxSpeed, speed));
  }
}
