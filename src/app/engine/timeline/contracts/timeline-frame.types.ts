import { RendererCommand } from '../../behaviors/commands/renderer-command.types';

/**
 * Atomic temporal unit within a timeline track.
 * Associates a virtual timestamp with one or more visual or auditory RendererCommands.
 *
 * Invariant: Contains zero visual rendering or DOM logic.
 */
export interface TimelineFrame {
  readonly id: string;
  readonly time: number;
  readonly duration: number;
  readonly commands: readonly RendererCommand[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}
