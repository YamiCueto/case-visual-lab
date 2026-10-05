import { RendererCommandBatch } from '../behaviors/commands/renderer-command-batch';
import { RendererCommand } from '../behaviors/commands/renderer-command.types';
import { RenderExecutionContext } from './contracts/render-context.interface';
import { IRendererEngine } from './contracts/renderer-engine.interface';
import { RendererPort } from './contracts/renderer-port.interface';
import { RendererDispatcher } from './dispatcher/renderer-dispatcher';
import { RendererRegistry } from './registry/renderer-registry';

/**
 * Universal Renderer Engine.
 *
 * Implements ADR-001, ADR-005, and ADR-009:
 * - Decouples domain and animation logic from rendering technologies.
 * - Routes RendererCommands to registered RendererPorts via RendererDispatcher.
 * - Zero WebGL, zero Canvas, zero DOM references.
 */
export class RendererEngine implements IRendererEngine {
  private _registry = new RendererRegistry();
  private _dispatcher = new RendererDispatcher();
  private _initializedPorts = new Set<string>();
  private _isInitialized = false;
  private _isDisposed = false;
  private _frameNumber = 0;

  /**
   * Initializes the engine and all currently registered ports.
   */
  initialize(context?: RenderExecutionContext): void {
    if (this._isDisposed) {
      throw new Error('RendererEngine is disposed and cannot be re-initialized.');
    }

    const defaultContext: RenderExecutionContext = context ?? {
      virtualTime: 0,
      frameNumber: 0,
      deltaTimeMs: 0,
    };

    for (const port of this._registry.list()) {
      if (!this._initializedPorts.has(port.id)) {
        port.initialize(defaultContext);
        this._initializedPorts.add(port.id);
      }
    }

    this._isInitialized = true;
  }

  /**
   * Registers a new renderer port into the engine.
   * If the engine is already initialized, initializes the port immediately.
   */
  register(port: RendererPort): void {
    this.assertOperational();
    this._registry.register(port);

    if (this._isInitialized && !this._initializedPorts.has(port.id)) {
      port.initialize({
        virtualTime: 0,
        frameNumber: this._frameNumber,
        deltaTimeMs: 0,
      });
      this._initializedPorts.add(port.id);
    }
  }

  /**
   * Unregisters a renderer port by ID.
   */
  unregister(rendererId: string): void {
    this.assertOperational();
    const port = this._registry.get(rendererId);
    if (port) {
      port.dispose();
      this._initializedPorts.delete(rendererId);
      this._registry.unregister(rendererId);
    }
  }

  /**
   * Dispatches commands to matching renderer ports.
   */
  dispatch(
    commandsOrBatch: readonly RendererCommand[] | RendererCommandBatch,
    partialContext?: Partial<RenderExecutionContext>,
  ): void {
    this.assertOperational();

    const commands: readonly RendererCommand[] =
      commandsOrBatch instanceof RendererCommandBatch
        ? commandsOrBatch.commands()
        : commandsOrBatch;

    if (commands.length === 0) {
      return;
    }

    this._frameNumber += 1;

    const context: RenderExecutionContext = {
      virtualTime: partialContext?.virtualTime ?? 0,
      frameNumber: partialContext?.frameNumber ?? this._frameNumber,
      deltaTimeMs: partialContext?.deltaTimeMs ?? 16,
      metadata: partialContext?.metadata,
    };

    this._dispatcher.dispatch(commands, this._registry, context);
  }

  /**
   * Lists all registered renderer ports.
   */
  list(): readonly RendererPort[] {
    return this._registry.list();
  }

  /**
   * Releases resources across all registered ports and marks engine as disposed.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    for (const port of this._registry.list()) {
      port.dispose();
    }

    this._registry.clear();
    this._initializedPorts.clear();
    this._isInitialized = false;
    this._isDisposed = true;
  }

  isInitialized(): boolean {
    return this._isInitialized;
  }

  isDisposed(): boolean {
    return this._isDisposed;
  }

  private assertOperational(): void {
    if (this._isDisposed) {
      throw new Error('RendererEngine is disposed and cannot perform operations.');
    }
  }
}
