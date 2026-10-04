import { AnimationFrame, AnimationNodeCoordinate } from './animation.interface';

export interface AnimationMountOptions {
  readonly isDark?: boolean;
}

/**
 * Port contract for animation rendering engines (Three.js WebGL overlay, Canvas2D, etc.).
 * Decouples the domain and application services from graphic rendering libraries.
 */
export interface AnimationRendererPort {
  /**
   * Mounts the animation engine into the provided host element.
   */
  mount(container: HTMLElement, options?: AnimationMountOptions): Promise<void>;

  /**
   * Cleans up all GPU/CPU resources, listeners, and render loops.
   */
  unmount(): void;

  /**
   * Resizes the rendering viewport to match the host dimensions.
   */
  resize(width: number, height: number): void;

  /**
   * Renders the specified animation frame with node spatial coordinates.
   */
  renderFrame(
    frame: AnimationFrame,
    nodePositions: Record<string, AnimationNodeCoordinate>,
    speedMultiplier?: number,
  ): void;

  /**
   * Clears all currently rendered particles, trails, and pulses.
   */
  clear(): void;

  /**
   * Updates dark/light theme styling for particles, trails, and glows.
   */
  setTheme(isDark: boolean): void;
}
