import { RenderExecutionContext } from '../../../../engine/rendering/contracts/render-context.interface';
import { ExcalidrawScene } from './excalidraw-scene.interface';

/**
 * Execution context provided specifically for Excalidraw rendering cycles.
 * Bridges the generic engine execution context with Excalidraw scene references.
 */
export interface ExcalidrawRenderContext extends RenderExecutionContext {
  readonly scene?: ExcalidrawScene;
  readonly theme?: 'light' | 'dark';
}
