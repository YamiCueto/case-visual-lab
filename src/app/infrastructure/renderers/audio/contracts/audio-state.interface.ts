/**
 * Representation of an active discrete audio cue.
 * Pure logical state decoupled from Web Audio API nodes or browser audio elements.
 */
export interface AudioCueState {
  readonly cueId: string;
  readonly soundUri?: string;
  readonly soundType?: string;
  readonly volume: number;
  readonly loop: boolean;
  readonly playbackRate?: number;
  readonly isPlaying: boolean;
  readonly startedAtVirtualTime?: number;
}

/**
 * Global audio state representation.
 */
export interface AudioState {
  readonly masterVolume: number;
  readonly muted: boolean;
  readonly activeCues: Readonly<Record<string, AudioCueState>>;
}

/**
 * Standard default audio state.
 */
export const DEFAULT_AUDIO_STATE: AudioState = Object.freeze({
  masterVolume: 1.0,
  muted: false,
  activeCues: Object.freeze({}),
});
