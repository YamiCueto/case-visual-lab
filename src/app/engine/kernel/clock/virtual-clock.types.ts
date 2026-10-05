/**
 * VirtualClock Domain Types & State Machine Definitions.
 * 100% pure TypeScript - zero framework or browser timing dependencies.
 */

export type VirtualClockState = 'STOPPED' | 'READY' | 'PLAYING' | 'PAUSED' | 'SEEKING';

export interface VirtualClockOptions {
  readonly initialTimeMs?: number;
  readonly defaultSpeed?: number;
  readonly minSpeed?: number;
  readonly maxSpeed?: number;
}

export interface VirtualClockSnapshot {
  readonly timeMs: number;
  readonly state: VirtualClockState;
  readonly speed: number;
}
