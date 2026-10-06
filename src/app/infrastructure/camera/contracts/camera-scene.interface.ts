import { CameraState } from './camera-state.interface';

export interface CameraScene {
  getCamera(): CameraState;
  setCamera(state: CameraState): void;
  reset(): void;
}
