export interface CameraOffset {
  readonly x: number;
  readonly y: number;
  readonly z?: number;
}

export interface CameraTransition {
  readonly durationMs: number;
  readonly easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface CameraState {
  readonly target: string | null;
  readonly zoom: number;
  readonly rotation: number;
  readonly offset: CameraOffset;
  readonly transition?: CameraTransition;
}

export const DEFAULT_CAMERA_STATE: CameraState = Object.freeze({
  target: null,
  zoom: 1.0,
  rotation: 0,
  offset: Object.freeze({ x: 0, y: 0, z: 0 }),
});
