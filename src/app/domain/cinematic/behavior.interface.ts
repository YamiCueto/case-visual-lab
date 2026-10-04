/**
 * Complete catalog of visual behaviors supported by the Cinematic Learning Engine.
 * Behaviors are pure domain descriptors specifying *what* happens in the scene,
 * completely decoupled from how any specific renderer (Three.js, Canvas2D, SVG) draws it.
 */
export type VisualBehaviorType =
  // Network & Communication
  | 'packet-flow'
  | 'request-response'
  | 'api-call'
  | 'retry'
  | 'timeout'
  | 'failure'
  // Data & Storage
  | 'database-write'
  | 'database-read'
  | 'filesystem-read'
  | 'filesystem-write'
  // Caching
  | 'cache-hit'
  | 'cache-miss'
  // Event-Driven & Messaging
  | 'event-publish'
  | 'event-consume'
  // AI, Agents & LLM
  | 'agent-thinking'
  | 'planner-selection'
  | 'tool-call'
  | 'streaming-response'
  | 'token-generation'
  | 'embedding-search'
  | 'vector-match'
  | 'memory-retrieval'
  // Visual Feedback & Node States
  | 'node-highlight'
  | 'node-pulse'
  | 'success'
  | 'warning'
  | 'error';

export interface VisualBehaviorPayload {
  readonly label?: string;
  readonly value?: string | number;
  readonly badge?: string;
  readonly color?: string;
  readonly glowIntensity?: number;
  readonly tokenChunk?: string;
  readonly queryPreview?: string;
  readonly latencyMs?: number;
  readonly particleCount?: number;
  readonly [key: string]: unknown;
}

export interface VisualBehavior {
  readonly id: string;
  readonly type: VisualBehaviorType;
  readonly targetNodeId?: string;
  readonly sourceNodeId?: string;
  readonly destinationNodeId?: string;
  readonly durationMs: number;
  readonly delayMs?: number;
  readonly easing?: 'linear' | 'ease-in-out' | 'cubic-bezier' | 'spring';
  readonly payload?: VisualBehaviorPayload;
}
