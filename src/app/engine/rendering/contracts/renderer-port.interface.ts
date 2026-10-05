import { RendererCommand } from '../../behaviors/commands/renderer-command.types';
import { RenderExecutionContext } from './render-context.interface';
import { RendererBatch } from './renderer-batch.types';

/**
 * Universal Port interface for rendering technologies (Three.js, Excalidraw, SVG, Web Audio).
 * Follows Hexagonal Architecture: domain engine talks to ports, infrastructure implements adapters.
 */
export interface RendererPort {
  readonly id: string;
  readonly priority?: number;

  /**
   * Initializes the renderer port.
   */
  initialize(context?: RenderExecutionContext): void;

  /**
   * Returns true if this port knows how to interpret the given command.
   */
  supports(command: RendererCommand): boolean;

  /**
   * Executes a batch of commands targeted to this renderer.
   */
  render(batch: RendererBatch, context?: RenderExecutionContext): void;

  /**
   * Releases renderer resources.
   */
  dispose(): void;
}
