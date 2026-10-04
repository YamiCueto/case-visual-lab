import { CameraAction, CameraPort } from '../../../domain/cinematic/camera.interface';

/**
 * Concrete Camera Controller Adapter.
 * Translates abstract domain CameraActions into viewport transformations
 * and camera choreographies.
 */
export class CameraControllerAdapter implements CameraPort {
  private activeTargetNodeId: string | null = null;
  private currentZoom = 1.0;
  private isShaking = false;

  focus(nodeId: string, durationMs = 600): void {
    this.activeTargetNodeId = nodeId;
    void durationMs;
  }

  zoom(nodeId: string, level: number, durationMs = 600): void {
    this.activeTargetNodeId = nodeId;
    this.currentZoom = Math.max(0.5, Math.min(level, 3.0));
    void durationMs;
  }

  highlight(nodeId: string, durationMs = 500): void {
    this.activeTargetNodeId = nodeId;
    void durationMs;
  }

  fade(nodeId: string, opacity: number, durationMs = 400): void {
    this.activeTargetNodeId = nodeId;
    void opacity;
    void durationMs;
  }

  orbit(nodeId: string, angleDegrees: number, durationMs = 1200): void {
    this.activeTargetNodeId = nodeId;
    void angleDegrees;
    void durationMs;
  }

  shake(intensity = 0.5, durationMs = 300): void {
    this.isShaking = true;
    void intensity;
    setTimeout(() => {
      this.isShaking = false;
    }, durationMs);
  }

  fitScene(durationMs = 500): void {
    this.currentZoom = 1.0;
    this.activeTargetNodeId = null;
    void durationMs;
  }

  follow(entityId: string): void {
    void entityId;
  }

  center(durationMs = 500): void {
    this.activeTargetNodeId = null;
    this.currentZoom = 1.0;
    void durationMs;
  }

  execute(action: CameraAction): void {
    switch (action.type) {
      case 'focus':
        if (action.targetNodeId) this.focus(action.targetNodeId, action.durationMs);
        break;
      case 'zoom':
        if (action.targetNodeId) {
          this.zoom(action.targetNodeId, action.zoomLevel ?? 1.5, action.durationMs);
        }
        break;
      case 'highlight':
        if (action.targetNodeId) this.highlight(action.targetNodeId, action.durationMs);
        break;
      case 'fade':
        if (action.targetNodeId) {
          this.fade(action.targetNodeId, action.intensity ?? 0.3, action.durationMs);
        }
        break;
      case 'orbit':
        if (action.targetNodeId) {
          this.orbit(action.targetNodeId, action.intensity ?? 45, action.durationMs);
        }
        break;
      case 'shake':
        this.shake(action.intensity ?? 0.5, action.durationMs);
        break;
      case 'fit-scene':
        this.fitScene(action.durationMs);
        break;
      case 'follow':
        if (action.targetEntityId) this.follow(action.targetEntityId);
        break;
      case 'center':
        this.center(action.durationMs);
        break;
    }
  }

  reset(): void {
    this.activeTargetNodeId = null;
    this.currentZoom = 1.0;
    this.isShaking = false;
  }
}
