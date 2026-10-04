import { VisualBehaviorType } from './behavior.interface';

export type AnimatedEntityType =
  | 'http-request'
  | 'http-response'
  | 'jwt-token'
  | 'sql-query'
  | 'vector-embedding'
  | 'document-chunk'
  | 'agent-thought'
  | 'tool-call-invocation'
  | 'memory-context'
  | 'prompt-token'
  | 'completion-stream';

export type EntityLifecycleState =
  'spawned' | 'traveling' | 'processing' | 'consumed' | 'dissolved';

export interface EntityTrajectory {
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly controlPoints?: readonly { x: number; y: number }[];
  readonly curvature?: number;
  readonly speedUnitsPerSec?: number;
}

export interface AnimatedEntity {
  readonly id: string;
  readonly type: AnimatedEntityType;
  readonly label: string;
  readonly color: string;
  readonly speed: number;
  readonly trajectory: EntityTrajectory;
  readonly state: EntityLifecycleState;
  readonly behavior?: VisualBehaviorType;
  readonly rendererTarget?: 'threejs' | 'canvas2d' | 'hybrid';
  readonly payload?: Record<string, unknown>;
}
