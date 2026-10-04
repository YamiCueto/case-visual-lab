import { CinematicFrame } from './cinematic-frame.interface';

export interface CinematicFrameExecutionResult {
  readonly frameIndex: number;
  readonly completed: boolean;
  readonly timestamp: number;
}

/**
 * Port contract for the Cinematic Learning Engine.
 * Coordinates frame-by-frame execution across the Camera System,
 * Live State Mutations, Visual Behaviors, and Narrative Progression.
 */
export interface CinematicEnginePort {
  /**
   * Executes a cinematic frame deterministically.
   */
  executeFrame(
    frame: CinematicFrame,
    speedMultiplier?: number,
  ): Promise<CinematicFrameExecutionResult>;

  /**
   * Pauses the current cinematic playback without losing progress.
   */
  pause(): void;

  /**
   * Resets all visual live state mutations and returns camera to neutral.
   */
  reset(): void;
}
