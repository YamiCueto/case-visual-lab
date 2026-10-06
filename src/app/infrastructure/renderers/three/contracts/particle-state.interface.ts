/**
 * Pure TypeScript 3D coordinate representation.
 * Completely decoupled from Three.js Vector3.
 */
export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Immutable particle state.
 */
export interface ParticleState {
  readonly id: string;
  readonly sourceNodeId?: string;
  readonly targetNodeId?: string;
  readonly semanticKind?: string;
  readonly position: Vector3D;
  readonly scale: Vector3D;
  readonly rotation: Vector3D;
  readonly opacity: number;
  readonly color: string;
  readonly durationMs?: number;
  readonly easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  readonly isAlive: boolean;
}

/**
 * Spatial node representation in 3D scene overlay.
 */
export interface Node3DState {
  readonly nodeId: string;
  readonly highlighted?: boolean;
  readonly highlightColor?: string;
  readonly intensity?: number;
  readonly status?: string;
  readonly customData?: Readonly<Record<string, unknown>>;
}

/**
 * Spatial connection representation connecting two nodes in 3D.
 */
export interface Connection3DState {
  readonly connectionId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly active?: boolean;
  readonly color?: string;
  readonly lineWidth?: number;
  readonly flowSpeed?: number;
}

/**
 * Composite state of the entire abstract 3D scene overlay.
 */
export interface ThreeSceneState {
  readonly particles: Readonly<Record<string, ParticleState>>;
  readonly nodes: Readonly<Record<string, Node3DState>>;
  readonly connections: Readonly<Record<string, Connection3DState>>;
}

export const DEFAULT_THREE_SCENE_STATE: ThreeSceneState = Object.freeze({
  particles: Object.freeze({}),
  nodes: Object.freeze({}),
  connections: Object.freeze({}),
});
