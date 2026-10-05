import { RendererCommand } from './renderer-command.types';

/**
 * Ordered, deterministic collection of RendererCommands.
 * Maintains chronological ordering of visual intentions for a frame or tick.
 */
export class RendererCommandBatch {
  private _commands: RendererCommand[] = [];

  constructor(initialCommands: readonly RendererCommand[] = []) {
    for (const cmd of initialCommands) {
      this._commands.push(cmd);
    }
  }

  /**
   * Appends one or more commands to the batch in deterministic order.
   */
  append(commandOrCommands: RendererCommand | readonly RendererCommand[]): void {
    if (Array.isArray(commandOrCommands)) {
      for (const cmd of commandOrCommands) {
        this._commands.push(cmd);
      }
    } else {
      this._commands.push(commandOrCommands as RendererCommand);
    }
  }

  /**
   * Merges all commands from another batch into this batch in sequential order.
   */
  merge(other: RendererCommandBatch): void {
    const incoming = other.commands();
    for (const cmd of incoming) {
      this._commands.push(cmd);
    }
  }

  /**
   * Total number of commands in the batch.
   */
  size(): number {
    return this._commands.length;
  }

  /**
   * Returns an immutable shallow copy of the commands array.
   */
  commands(): readonly RendererCommand[] {
    return [...this._commands];
  }

  /**
   * Returns true if the batch contains zero commands.
   */
  empty(): boolean {
    return this._commands.length === 0;
  }

  /**
   * Clears all commands from the batch.
   */
  clear(): void {
    this._commands = [];
  }
}
