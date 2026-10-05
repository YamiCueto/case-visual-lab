import { RendererCommandBatch } from '../../behaviors/commands/renderer-command-batch';
import { RendererCommand } from '../../behaviors/commands/renderer-command.types';
import { RenderExecutionContext } from './render-context.interface';
import { RendererPort } from './renderer-port.interface';

/**
 * Universal Renderer Engine contract.
 * Aggregates commands into batches and routes them deterministically to RendererPorts.
 */
export interface IRendererEngine {
  /**
   * Initializes the engine and all registered ports.
   */
  initialize(context?: RenderExecutionContext): void;

  /**
   * Registers a new renderer port.
   */
  register(port: RendererPort): void;

  /**
   * Unregisters a renderer port by its ID.
   */
  unregister(rendererId: string): void;

  /**
   * Dispatches commands to their matching renderer ports.
   */
  dispatch(
    commands: readonly RendererCommand[] | RendererCommandBatch,
    context?: Partial<RenderExecutionContext>,
  ): void;

  /**
   * Lists all registered renderer ports.
   */
  list(): readonly RendererPort[];

  /**
   * Releases resources and tears down all ports.
   */
  dispose(): void;

  /**
   * Returns true if initialized.
   */
  isInitialized(): boolean;

  /**
   * Returns true if disposed.
   */
  isDisposed(): boolean;
}
