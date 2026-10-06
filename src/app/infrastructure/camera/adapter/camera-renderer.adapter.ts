import { RendererCommand } from '../../../engine/behaviors/commands/renderer-command.types';
import { RenderExecutionContext } from '../../../engine/rendering/contracts/render-context.interface';
import { RendererBatch } from '../../../engine/rendering/contracts/renderer-batch.types';
import { RendererPort } from '../../../engine/rendering/contracts/renderer-port.interface';
import { CameraRenderContext } from '../contracts/camera-render-context.interface';
import { CameraScene } from '../contracts/camera-scene.interface';
import { CameraState, DEFAULT_CAMERA_STATE } from '../contracts/camera-state.interface';
import { CameraCommandMapper } from '../mapping/camera-command-mapper';
import { CameraDiff } from '../mapping/camera-diff';

export class CameraRendererAdapter implements RendererPort {
  readonly id: string;
  readonly priority: number;

  private scene?: CameraScene;
  private readonly mapper: CameraCommandMapper;
  private readonly diff: CameraDiff;

  private currentState: CameraState = DEFAULT_CAMERA_STATE;
  private initialized = false;
  private disposed = false;
  private renderCount = 0;
  private lastRenderedBatchId?: string;

  constructor(
    scene?: CameraScene,
    options?: {
      readonly id?: string;
      readonly priority?: number;
      readonly mapper?: CameraCommandMapper;
      readonly diff?: CameraDiff;
    },
  ) {
    this.id = options?.id ?? 'camera-renderer';
    this.priority = options?.priority ?? 20;
    this.scene = scene;
    this.mapper = options?.mapper ?? new CameraCommandMapper();
    this.diff = options?.diff ?? new CameraDiff();

    if (scene) {
      this.currentState = scene.getCamera();
    }
  }

  setScene(scene: CameraScene): void {
    this.scene = scene;
    this.currentState = scene.getCamera();
  }

  getScene(): CameraScene | undefined {
    return this.scene;
  }

  getCurrentState(): CameraState {
    return this.currentState;
  }

  getRenderCount(): number {
    return this.renderCount;
  }

  getLastRenderedBatchId(): string | undefined {
    return this.lastRenderedBatchId;
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  initialize(context?: RenderExecutionContext): void {
    if (this.disposed) {
      throw new Error(`Cannot initialize disposed camera renderer: ${this.id}`);
    }

    const cameraCtx = context as CameraRenderContext | undefined;
    if (cameraCtx?.cameraScene) {
      this.setScene(cameraCtx.cameraScene);
    } else if (context?.metadata?.['cameraScene']) {
      this.setScene(context.metadata['cameraScene'] as CameraScene);
    }

    this.initialized = true;
  }

  supports(command: RendererCommand): boolean {
    if (!command || !command.type) {
      return false;
    }
    return this.mapper.supports(command);
  }

  render(batch: RendererBatch, context?: RenderExecutionContext): void {
    if (this.disposed) {
      return;
    }

    const cameraCtx = context as CameraRenderContext | undefined;
    const activeScene = cameraCtx?.cameraScene ?? this.scene;

    if (!activeScene) {
      return;
    }

    if (!batch || !Array.isArray(batch.commands) || batch.commands.length === 0) {
      this.lastRenderedBatchId = batch?.batchId;
      return;
    }

    const supportedCommands = batch.commands.filter((cmd) => this.supports(cmd));
    if (supportedCommands.length === 0) {
      this.lastRenderedBatchId = batch.batchId;
      return;
    }

    for (const cmd of supportedCommands) {
      const nextState = this.mapper.mapCommand(cmd, this.currentState);
      if (!nextState) {
        continue;
      }

      const diffResult = this.diff.computeDiff(this.currentState, nextState);
      if (diffResult.hasChanges) {
        activeScene.setCamera(nextState);
        this.currentState = nextState;
      }
    }

    this.renderCount++;
    this.lastRenderedBatchId = batch.batchId;
  }

  reset(): void {
    if (this.disposed) {
      return;
    }
    this.currentState = DEFAULT_CAMERA_STATE;
    if (this.scene) {
      this.scene.reset();
    }
  }

  dispose(): void {
    this.scene = undefined;
    this.disposed = true;
    this.initialized = false;
    this.currentState = DEFAULT_CAMERA_STATE;
  }
}
