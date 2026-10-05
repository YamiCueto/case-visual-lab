import { CommandPriority, RendererCommand } from '../../behaviors/commands/renderer-command.types';

/**
 * Atomic batch of commands targeted at a specific RendererPort.
 * Free of visual objects, DOM nodes, or GPU pointers.
 */
export interface RendererBatch {
  readonly batchId: string;
  readonly rendererId: string;
  readonly commands: readonly RendererCommand[];
  readonly priority: CommandPriority;
  readonly virtualTime: number;
}
