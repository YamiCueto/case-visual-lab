import { CommandPriority, RendererCommand } from '../../behaviors/commands/renderer-command.types';
import { RenderExecutionContext } from '../contracts/render-context.interface';
import { RendererBatch } from '../contracts/renderer-batch.types';
import { RendererPort } from '../contracts/renderer-port.interface';
import { RendererRegistry } from '../registry/renderer-registry';

/**
 * Deterministic command dispatcher.
 * Partitions incoming commands by target renderer, constructs RendererBatches,
 * and routes them to appropriate RendererPorts.
 */
export class RendererDispatcher {
  private _batchSequence = 0;

  /**
   * Partitions commands by target renderer and dispatches batches to ports.
   */
  dispatch(
    commands: readonly RendererCommand[],
    registry: RendererRegistry,
    context: RenderExecutionContext,
  ): void {
    if (commands.length === 0) {
      return;
    }

    // Map: rendererId -> list of commands
    const grouped = new Map<string, RendererCommand[]>();

    for (const cmd of commands) {
      const ports = registry.resolve(cmd);
      for (const port of ports) {
        let list = grouped.get(port.id);
        if (!list) {
          list = [];
          grouped.set(port.id, list);
        }
        list.push(cmd);
      }
    }

    // Dispatch batches deterministically sorted by port priority descending
    const targetPorts = Array.from(grouped.keys())
      .map((id) => registry.get(id))
      .filter((p): p is RendererPort => p !== null)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    for (const port of targetPorts) {
      const cmds = grouped.get(port.id);
      if (!cmds || cmds.length === 0) {
        continue;
      }

      this._batchSequence += 1;
      const batch: RendererBatch = {
        batchId: `rb_${port.id}_${this._batchSequence}`,
        rendererId: port.id,
        commands: cmds,
        priority: this.determineBatchPriority(cmds),
        virtualTime: context.virtualTime,
      };

      port.render(batch, context);
    }
  }

  private determineBatchPriority(cmds: readonly RendererCommand[]): CommandPriority {
    for (const cmd of cmds) {
      if (cmd.priority === 'CRITICAL') {
        return 'CRITICAL';
      }
    }
    for (const cmd of cmds) {
      if (cmd.priority === 'HIGH') {
        return 'HIGH';
      }
    }
    for (const cmd of cmds) {
      if (cmd.priority === 'NORMAL') {
        return 'NORMAL';
      }
    }
    return 'LOW';
  }
}
