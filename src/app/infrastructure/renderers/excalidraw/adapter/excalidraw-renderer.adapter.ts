import { RendererCommand } from '../../../../engine/behaviors/commands/renderer-command.types';
import { RenderExecutionContext } from '../../../../engine/rendering/contracts/render-context.interface';
import { RendererBatch } from '../../../../engine/rendering/contracts/renderer-batch.types';
import { RendererPort } from '../../../../engine/rendering/contracts/renderer-port.interface';
import { ExcalidrawRenderContext } from '../contracts/excalidraw-render-context.interface';
import { ExcalidrawScene, ExcalidrawSceneElement } from '../contracts/excalidraw-scene.interface';
import { CommandMapper } from '../mapping/command-mapper';
import { SceneDiff } from '../mapping/scene-diff';

/**
 * Infrastructure Renderer Adapter for Excalidraw.
 *
 * Implements the RendererPort contract without any domain, timing, or simulation logic.
 * Translates discrete visual RendererCommands into Excalidraw element mutations, computes
 * an incremental SceneDiff, and patches the target ExcalidrawScene deterministically.
 */
export class ExcalidrawRendererAdapter implements RendererPort {
  readonly id: string;
  readonly priority: number;

  private scene?: ExcalidrawScene;
  private readonly mapper: CommandMapper;
  private readonly diff: SceneDiff;

  private initialized = false;
  private disposed = false;
  private renderCount = 0;
  private lastRenderedBatchId?: string;

  constructor(
    scene?: ExcalidrawScene,
    options?: {
      readonly id?: string;
      readonly priority?: number;
      readonly mapper?: CommandMapper;
      readonly diff?: SceneDiff;
    },
  ) {
    this.id = options?.id ?? 'excalidraw-renderer';
    this.priority = options?.priority ?? 10;
    this.scene = scene;
    this.mapper = options?.mapper ?? new CommandMapper();
    this.diff = options?.diff ?? new SceneDiff();
  }

  /**
   * Attaches or updates the active Excalidraw scene target.
   */
  setScene(scene: ExcalidrawScene): void {
    this.scene = scene;
  }

  /**
   * Returns the currently attached scene target.
   */
  getScene(): ExcalidrawScene | undefined {
    return this.scene;
  }

  /**
   * Total number of batches rendered by this adapter.
   */
  getRenderCount(): number {
    return this.renderCount;
  }

  /**
   * Returns the ID of the last batch rendered.
   */
  getLastRenderedBatchId(): string | undefined {
    return this.lastRenderedBatchId;
  }

  /**
   * Whether this adapter has been disposed.
   */
  isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Initializes the renderer port.
   */
  initialize(context?: RenderExecutionContext): void {
    if (this.disposed) {
      throw new Error(`Cannot initialize disposed renderer adapter: ${this.id}`);
    }

    const excalidrawCtx = context as ExcalidrawRenderContext | undefined;
    if (excalidrawCtx?.scene) {
      this.scene = excalidrawCtx.scene;
    } else if (context?.metadata?.['scene']) {
      this.scene = context.metadata['scene'] as ExcalidrawScene;
    }

    this.initialized = true;
  }

  /**
   * Verifies if this adapter can interpret and render the given command.
   * Filters out particle, audio, or camera commands intended for other adapters.
   */
  supports(command: RendererCommand): boolean {
    if (!command || !command.type) {
      return false;
    }
    return this.mapper.supports(command);
  }

  /**
   * Renders a batch of commands targeted at Excalidraw.
   *
   * Pipeline:
   * 1. Filter supported commands
   * 2. Map commands to desired Excalidraw scene elements
   * 3. Compute incremental SceneDiff against current scene
   * 4. Apply only modified elements to the scene
   */
  render(batch: RendererBatch, context?: RenderExecutionContext): void {
    if (this.disposed) {
      return;
    }

    const excalidrawCtx = context as ExcalidrawRenderContext | undefined;
    const activeScene = excalidrawCtx?.scene ?? this.scene;

    if (!activeScene) {
      return;
    }

    if (!batch || !Array.isArray(batch.commands) || batch.commands.length === 0) {
      this.lastRenderedBatchId = batch?.batchId;
      return;
    }

    // 1. Filter supported commands, preserving deterministic sequential order
    const supportedCommands = batch.commands.filter((cmd) => this.supports(cmd));
    if (supportedCommands.length === 0) {
      this.lastRenderedBatchId = batch.batchId;
      return;
    }

    // 2. Map commands into desired element mutations
    const desiredElements: ExcalidrawSceneElement[] = [];
    for (const cmd of supportedCommands) {
      const mapped = this.mapper.mapCommand(cmd, activeScene);
      for (const el of mapped) {
        desiredElements.push(el);
      }
    }

    if (desiredElements.length === 0) {
      this.lastRenderedBatchId = batch.batchId;
      return;
    }

    // 3. Compute incremental SceneDiff (skips unchanged elements)
    const diffResult = this.diff.computeDiff(desiredElements, activeScene);

    // 4. Atomically apply patches only if genuine changes exist
    if (diffResult.hasChanges && diffResult.patches.length > 0) {
      activeScene.updateElements(diffResult.patches);
    }

    this.renderCount++;
    this.lastRenderedBatchId = batch.batchId;
  }

  /**
   * Releases internal references and detaches the active scene.
   */
  dispose(): void {
    this.scene = undefined;
    this.disposed = true;
    this.initialized = false;
  }
}
