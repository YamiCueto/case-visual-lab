/**
 * Camera System Domain Contracts.
 * Controls visual framing, focal points, cinematic zooming, and dynamic camera choreography.
 */
export type CameraActionType =
  'focus' | 'zoom' | 'highlight' | 'fade' | 'orbit' | 'shake' | 'fit-scene' | 'follow' | 'center';

export interface CameraAction {
  readonly type: CameraActionType;
  readonly targetNodeId?: string;
  readonly targetEntityId?: string;
  readonly zoomLevel?: number; // 0.5 to 3.0 scale
  readonly durationMs?: number;
  readonly intensity?: number; // for shake amplitude (0-1) or fade alpha (0-1)
  readonly easing?: 'ease-in-out' | 'smooth' | 'spring' | 'linear';
}

/**
 * Port contract for the Camera System.
 * Implementations translate camera actions into 2D viewport pan/zoom transforms
 * or Three.js 3D camera matrices without leaking graphic details into the domain.
 */
export interface CameraPort {
  focus(nodeId: string, durationMs?: number): void;
  zoom(nodeId: string, level: number, durationMs?: number): void;
  highlight(nodeId: string, durationMs?: number): void;
  fade(nodeId: string, opacity: number, durationMs?: number): void;
  orbit(nodeId: string, angleDegrees: number, durationMs?: number): void;
  shake(intensity?: number, durationMs?: number): void;
  fitScene(durationMs?: number): void;
  follow(entityId: string): void;
  center(durationMs?: number): void;
  execute(action: CameraAction): void;
  reset(): void;
}
