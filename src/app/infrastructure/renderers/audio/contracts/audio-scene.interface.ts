import { AudioCueState, AudioState } from './audio-state.interface';

/**
 * Abstract audio scene target.
 * Represents the low-level audio driver or audio context facade without direct browser dependencies.
 */
export interface AudioScene {
  /**
   * Retrieves the current audio state from the scene.
   */
  getState(): AudioState;

  /**
   * Triggers playback of a discrete audio cue.
   */
  playCue(cue: AudioCueState): void;

  /**
   * Stops playback of a specific audio cue.
   */
  stopCue(cueId: string): void;

  /**
   * Sets the global master volume (clamped between 0.0 and 1.0).
   */
  setMasterVolume(volume: number): void;

  /**
   * Toggles master mute status.
   */
  setMuted(muted: boolean): void;

  /**
   * Resets all audio cues and restores default master settings.
   */
  reset(): void;
}
