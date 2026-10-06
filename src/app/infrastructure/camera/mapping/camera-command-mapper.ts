import {
  CommandEasing,
  RendererCommand,
} from '../../../engine/behaviors/commands/renderer-command.types';
import {
  CameraOffset,
  CameraState,
  CameraTransition,
  DEFAULT_CAMERA_STATE,
} from '../contracts/camera-state.interface';

export const SUPPORTED_CAMERA_COMMANDS = new Set<string>([
  'FOCUS_CAMERA',
  'MOVE_CAMERA',
  'ZOOM_CAMERA',
  'ROTATE_CAMERA',
  'RESET_CAMERA',
]);

export interface CameraFocusPayload {
  readonly target?: string;
  readonly zoom?: number;
  readonly offset?: Partial<CameraOffset>;
  readonly durationMs?: number;
  readonly easing?: CommandEasing;
}

export interface CameraMovePayload {
  readonly x?: number;
  readonly y?: number;
  readonly z?: number;
  readonly offset?: Partial<CameraOffset>;
  readonly target?: string | null;
  readonly durationMs?: number;
  readonly easing?: CommandEasing;
}

export interface CameraZoomPayload {
  readonly zoom?: number;
  readonly level?: number;
  readonly durationMs?: number;
  readonly easing?: CommandEasing;
}

export interface CameraRotatePayload {
  readonly rotation?: number;
  readonly angle?: number;
  readonly angleDegrees?: number;
  readonly durationMs?: number;
  readonly easing?: CommandEasing;
}

export interface CameraResetPayload {
  readonly durationMs?: number;
  readonly easing?: CommandEasing;
}

export class CameraCommandMapper {
  supports(command: RendererCommand): boolean {
    if (!command || !command.type) {
      return false;
    }
    return SUPPORTED_CAMERA_COMMANDS.has(command.type as string);
  }

  mapCommand(
    command: RendererCommand,
    currentState: CameraState = DEFAULT_CAMERA_STATE,
  ): CameraState | null {
    if (!this.supports(command)) {
      return null;
    }

    const commandType = command.type as string;
    const transition = this.extractTransition(command);

    switch (commandType) {
      case 'FOCUS_CAMERA':
        return this.mapFocus(command, currentState, transition);
      case 'MOVE_CAMERA':
        return this.mapMove(command, currentState, transition);
      case 'ZOOM_CAMERA':
        return this.mapZoom(command, currentState, transition);
      case 'ROTATE_CAMERA':
        return this.mapRotate(command, currentState, transition);
      case 'RESET_CAMERA':
        return this.mapReset(command, transition);
      default:
        return null;
    }
  }

  private extractTransition(command: RendererCommand): CameraTransition | undefined {
    const duration = command.durationMs ?? 0;
    const easing = (command.easing ?? 'linear') as CameraTransition['easing'];

    if (duration > 0) {
      return { durationMs: duration, easing };
    }
    return undefined;
  }

  private mapFocus(
    command: RendererCommand,
    currentState: CameraState,
    transition?: CameraTransition,
  ): CameraState {
    const payload = (command.payload || {}) as CameraFocusPayload;
    const target = payload.target ?? command.targetId ?? null;
    const zoom = payload.zoom ?? currentState.zoom;
    const offset: CameraOffset = {
      x: payload.offset?.x ?? currentState.offset.x,
      y: payload.offset?.y ?? currentState.offset.y,
      z: payload.offset?.z ?? currentState.offset.z ?? 0,
    };

    return {
      target,
      zoom,
      rotation: currentState.rotation,
      offset,
      transition,
    };
  }

  private mapMove(
    command: RendererCommand,
    currentState: CameraState,
    transition?: CameraTransition,
  ): CameraState {
    const payload = (command.payload || {}) as CameraMovePayload;
    const offset: CameraOffset = {
      x: payload.offset?.x ?? payload.x ?? currentState.offset.x,
      y: payload.offset?.y ?? payload.y ?? currentState.offset.y,
      z: payload.offset?.z ?? payload.z ?? currentState.offset.z ?? 0,
    };
    const target = payload.target !== undefined ? payload.target : currentState.target;

    return {
      target,
      zoom: currentState.zoom,
      rotation: currentState.rotation,
      offset,
      transition,
    };
  }

  private mapZoom(
    command: RendererCommand,
    currentState: CameraState,
    transition?: CameraTransition,
  ): CameraState {
    const payload = (command.payload || {}) as CameraZoomPayload;
    const zoom = payload.zoom ?? payload.level ?? currentState.zoom;

    return {
      target: currentState.target,
      zoom,
      rotation: currentState.rotation,
      offset: currentState.offset,
      transition,
    };
  }

  private mapRotate(
    command: RendererCommand,
    currentState: CameraState,
    transition?: CameraTransition,
  ): CameraState {
    const payload = (command.payload || {}) as CameraRotatePayload;
    const rotation =
      payload.rotation ?? payload.angle ?? payload.angleDegrees ?? currentState.rotation;

    return {
      target: currentState.target,
      zoom: currentState.zoom,
      rotation,
      offset: currentState.offset,
      transition,
    };
  }

  private mapReset(command: RendererCommand, transition?: CameraTransition): CameraState {
    const payload = (command.payload || {}) as CameraResetPayload;
    const effectiveTransition =
      transition ??
      (payload.durationMs && payload.durationMs > 0
        ? { durationMs: payload.durationMs, easing: payload.easing ?? 'linear' }
        : undefined);

    return {
      ...DEFAULT_CAMERA_STATE,
      transition: effectiveTransition,
    };
  }
}
