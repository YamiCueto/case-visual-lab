/**
 * Universal discrete command types emitted by behaviors.
 * Represent pure visual/spatial intention, independent of rendering technology.
 */
export type RendererCommandType =
  | 'SPAWN_PARTICLE'
  | 'MOVE_PARTICLE'
  | 'DESTROY_PARTICLE'
  | 'HIGHLIGHT_NODE'
  | 'FADE_NODE'
  | 'UPDATE_BADGE'
  | 'PLAY_AUDIO_CUE'
  | 'FOCUS_CAMERA';

/**
 * Normalized animation easing curves.
 */
export type CommandEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

/**
 * Command execution priority.
 */
export type CommandPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

/**
 * Immutable command representing a visual or auditory intent.
 * Consumed by Renderer Adapters (Excalidraw, Three.js, Web Audio, SVG).
 */
export interface RendererCommand<TPayload = Record<string, unknown>> {
  readonly id: string;
  readonly type: RendererCommandType;
  readonly targetId: string;
  readonly payload: Readonly<TPayload>;
  readonly durationMs: number;
  readonly easing: CommandEasing;
  readonly priority: CommandPriority;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
