import { RenderExecutionContext } from '../../../../engine/rendering/contracts/render-context.interface';
import { ThreeScene } from './three-scene.interface';

/**
 * Execution context supplied specifically to 3D rendering cycles.
 */
export interface ThreeRenderContext extends RenderExecutionContext {
  readonly threeScene?: ThreeScene;
  readonly isDark?: boolean;
}
