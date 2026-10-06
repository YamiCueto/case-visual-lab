import { CameraOffset, CameraState, CameraTransition } from '../contracts/camera-state.interface';

export class CameraInterpolator {
  interpolate(
    stateA: CameraState,
    stateB: CameraState,
    progress: number,
    customEasing?: CameraTransition['easing'],
  ): CameraState {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const easing = customEasing ?? stateB.transition?.easing ?? 'linear';
    const easedT = this.applyEasing(clampedProgress, easing);

    const zoom = this.lerp(stateA.zoom, stateB.zoom, easedT);
    const rotation = this.lerp(stateA.rotation, stateB.rotation, easedT);
    const offset: CameraOffset = {
      x: this.lerp(stateA.offset.x, stateB.offset.x, easedT),
      y: this.lerp(stateA.offset.y, stateB.offset.y, easedT),
      z: this.lerp(stateA.offset.z ?? 0, stateB.offset.z ?? 0, easedT),
    };

    const target = clampedProgress >= 0.5 ? stateB.target : stateA.target;

    return {
      target,
      zoom,
      rotation,
      offset,
      transition: stateB.transition,
    };
  }

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private applyEasing(t: number, easing: CameraTransition['easing']): number {
    switch (easing) {
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'linear':
      default:
        return t;
    }
  }
}
