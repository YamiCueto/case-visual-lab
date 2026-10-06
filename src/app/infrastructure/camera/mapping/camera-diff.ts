import { CameraState } from '../contracts/camera-state.interface';

export interface CameraDiffResult {
  readonly hasChanges: boolean;
  readonly changedProperties: readonly (keyof CameraState)[];
  readonly targetChanged: boolean;
  readonly zoomChanged: boolean;
  readonly rotationChanged: boolean;
  readonly offsetChanged: boolean;
  readonly transitionChanged: boolean;
}

export class CameraDiff {
  private readonly epsilon = 1e-6;

  computeDiff(stateA: CameraState, stateB: CameraState): CameraDiffResult {
    const targetChanged = stateA.target !== stateB.target;
    const zoomChanged = Math.abs(stateA.zoom - stateB.zoom) > this.epsilon;
    const rotationChanged = Math.abs(stateA.rotation - stateB.rotation) > this.epsilon;

    const offsetChanged =
      Math.abs(stateA.offset.x - stateB.offset.x) > this.epsilon ||
      Math.abs(stateA.offset.y - stateB.offset.y) > this.epsilon ||
      Math.abs((stateA.offset.z ?? 0) - (stateB.offset.z ?? 0)) > this.epsilon;

    const durA = stateA.transition?.durationMs ?? 0;
    const durB = stateB.transition?.durationMs ?? 0;
    const easeA = stateA.transition?.easing ?? 'linear';
    const easeB = stateB.transition?.easing ?? 'linear';
    const transitionChanged = durA !== durB || easeA !== easeB;

    const changedProperties: (keyof CameraState)[] = [];
    if (targetChanged) changedProperties.push('target');
    if (zoomChanged) changedProperties.push('zoom');
    if (rotationChanged) changedProperties.push('rotation');
    if (offsetChanged) changedProperties.push('offset');
    if (transitionChanged) changedProperties.push('transition');

    const hasChanges = changedProperties.length > 0;

    return {
      hasChanges,
      changedProperties,
      targetChanged,
      zoomChanged,
      rotationChanged,
      offsetChanged,
      transitionChanged,
    };
  }
}
