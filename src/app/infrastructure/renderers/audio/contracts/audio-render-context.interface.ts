import { RenderExecutionContext } from '../../../../engine/rendering/contracts/render-context.interface';
import { AudioScene } from './audio-scene.interface';

/**
 * Execution context supplied to audio rendering cycles.
 */
export interface AudioRenderContext extends RenderExecutionContext {
  readonly audioScene?: AudioScene;
}
