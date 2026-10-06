import { RenderExecutionContext } from '../../../engine/rendering/contracts/render-context.interface';
import { CameraScene } from './camera-scene.interface';

export interface CameraRenderContext extends RenderExecutionContext {
  readonly cameraScene?: CameraScene;
}
