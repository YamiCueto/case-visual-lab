import { RendererCommand } from '../../behaviors/commands/renderer-command.types';
import { RendererPort } from '../contracts/renderer-port.interface';

/**
 * Dynamic registry of RendererPort implementations.
 * Resolves supporting renderers without switch statements or type checks.
 */
export class RendererRegistry {
  private _ports = new Map<string, RendererPort>();

  /**
   * Registers a renderer port.
   */
  register(port: RendererPort): void {
    this._ports.set(port.id, port);
  }

  /**
   * Unregisters a renderer port by ID.
   */
  unregister(rendererId: string): void {
    this._ports.delete(rendererId);
  }

  /**
   * Resolves all registered ports capable of rendering the given command,
   * sorted by priority in descending order.
   */
  resolve(command: RendererCommand): readonly RendererPort[] {
    const matching: RendererPort[] = [];

    for (const port of this._ports.values()) {
      if (port.supports(command)) {
        matching.push(port);
      }
    }

    matching.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return matching;
  }

  /**
   * Retrieves a registered port by ID.
   */
  get(rendererId: string): RendererPort | null {
    return this._ports.get(rendererId) ?? null;
  }

  /**
   * Lists all registered ports sorted by priority descending.
   */
  list(): readonly RendererPort[] {
    const all = Array.from(this._ports.values());
    all.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return all;
  }

  /**
   * Clears all registered ports.
   */
  clear(): void {
    this._ports.clear();
  }
}
