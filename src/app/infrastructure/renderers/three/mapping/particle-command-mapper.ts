import { RendererCommand } from '../../../../engine/behaviors/commands/renderer-command.types';
import {
  Connection3DState,
  DEFAULT_THREE_SCENE_STATE,
  Node3DState,
  ParticleState,
  ThreeSceneState,
  Vector3D,
} from '../contracts/particle-state.interface';

export const SUPPORTED_THREE_COMMANDS = new Set<string>([
  'SPAWN_PARTICLE',
  'MOVE_PARTICLE',
  'DESTROY_PARTICLE',
  'HIGHLIGHT_NODE',
  'UPDATE_NODE_STATE',
  'UPDATE_CONNECTION',
]);

const INTENT_COLORS: Readonly<Record<string, string>> = {
  error: '#EF4444',
  success: '#10B981',
  transmitting: '#00F2FE',
  busy: '#F59E0B',
  default: '#6366F1',
};

export interface SpawnParticlePayload {
  readonly particleId?: string;
  readonly sourceEntityId?: string;
  readonly targetEntityId?: string;
  readonly semanticKind?: string;
  readonly position?: Partial<Vector3D>;
  readonly scale?: Partial<Vector3D>;
  readonly rotation?: Partial<Vector3D>;
  readonly opacity?: number;
  readonly color?: string;
  readonly durationMs?: number;
  readonly easing?: ParticleState['easing'];
}

export interface MoveParticlePayload {
  readonly destinationEntityId?: string;
  readonly destination?: Partial<Vector3D>;
  readonly position?: Partial<Vector3D>;
  readonly durationMs?: number;
  readonly easing?: ParticleState['easing'];
}

export interface HighlightNodePayload {
  readonly intent?: string;
  readonly intensity?: number;
  readonly glowColor?: string;
  readonly color?: string;
  readonly reset?: boolean;
}

export interface UpdateNodeStatePayload {
  readonly status?: string;
  readonly customData?: Readonly<Record<string, unknown>>;
}

export interface UpdateConnectionPayload {
  readonly fromNodeId?: string;
  readonly toNodeId?: string;
  readonly active?: boolean;
  readonly color?: string;
  readonly lineWidth?: number;
  readonly flowSpeed?: number;
}

export class ParticleCommandMapper {
  supports(command: RendererCommand): boolean {
    if (!command || !command.type) {
      return false;
    }
    return SUPPORTED_THREE_COMMANDS.has(command.type as string);
  }

  mapCommand(
    command: RendererCommand,
    currentState: ThreeSceneState = DEFAULT_THREE_SCENE_STATE,
  ): ThreeSceneState | null {
    if (!this.supports(command)) {
      return null;
    }

    const commandType = command.type as string;

    switch (commandType) {
      case 'SPAWN_PARTICLE':
        return this.mapSpawnParticle(command, currentState);
      case 'MOVE_PARTICLE':
        return this.mapMoveParticle(command, currentState);
      case 'DESTROY_PARTICLE':
        return this.mapDestroyParticle(command, currentState);
      case 'HIGHLIGHT_NODE':
        return this.mapHighlightNode(command, currentState);
      case 'UPDATE_NODE_STATE':
        return this.mapUpdateNodeState(command, currentState);
      case 'UPDATE_CONNECTION':
        return this.mapUpdateConnection(command, currentState);
      default:
        return null;
    }
  }

  private mapSpawnParticle(
    command: RendererCommand,
    currentState: ThreeSceneState,
  ): ThreeSceneState {
    const payload = (command.payload || {}) as SpawnParticlePayload;
    const particleId = payload.particleId ?? command.targetId;

    let color = payload.color;
    if (!color) {
      if (payload.semanticKind === 'error-packet') {
        color = INTENT_COLORS['error'];
      } else if (payload.semanticKind === 'response-packet') {
        color = INTENT_COLORS['success'];
      } else {
        color = INTENT_COLORS['transmitting'];
      }
    }

    const particle: ParticleState = {
      id: particleId,
      sourceNodeId: payload.sourceEntityId,
      targetNodeId: payload.targetEntityId,
      semanticKind: payload.semanticKind,
      position: {
        x: payload.position?.x ?? 0,
        y: payload.position?.y ?? 0,
        z: payload.position?.z ?? 0,
      },
      scale: {
        x: payload.scale?.x ?? 1,
        y: payload.scale?.y ?? 1,
        z: payload.scale?.z ?? 1,
      },
      rotation: {
        x: payload.rotation?.x ?? 0,
        y: payload.rotation?.y ?? 0,
        z: payload.rotation?.z ?? 0,
      },
      opacity: payload.opacity ?? 1.0,
      color,
      durationMs: command.durationMs ?? payload.durationMs ?? 0,
      easing: (command.easing ?? payload.easing ?? 'linear') as ParticleState['easing'],
      isAlive: true,
    };

    return {
      ...currentState,
      particles: {
        ...currentState.particles,
        [particleId]: particle,
      },
    };
  }

  private mapMoveParticle(
    command: RendererCommand,
    currentState: ThreeSceneState,
  ): ThreeSceneState {
    const payload = (command.payload || {}) as MoveParticlePayload;
    const particleId = command.targetId;
    const existing = currentState.particles[particleId];

    if (!existing) {
      return currentState;
    }

    const nextPos: Vector3D = {
      x: payload.destination?.x ?? payload.position?.x ?? existing.position.x,
      y: payload.destination?.y ?? payload.position?.y ?? existing.position.y,
      z: payload.destination?.z ?? payload.position?.z ?? existing.position.z,
    };

    const updated: ParticleState = {
      ...existing,
      targetNodeId: payload.destinationEntityId ?? existing.targetNodeId,
      position: nextPos,
      durationMs: command.durationMs ?? payload.durationMs ?? existing.durationMs,
      easing: (command.easing ?? payload.easing ?? existing.easing) as ParticleState['easing'],
    };

    return {
      ...currentState,
      particles: {
        ...currentState.particles,
        [particleId]: updated,
      },
    };
  }

  private mapDestroyParticle(
    command: RendererCommand,
    currentState: ThreeSceneState,
  ): ThreeSceneState {
    const particleId = command.targetId;
    if (!currentState.particles[particleId]) {
      return currentState;
    }

    const nextParticles = { ...currentState.particles };
    delete nextParticles[particleId];

    return {
      ...currentState,
      particles: nextParticles,
    };
  }

  private mapHighlightNode(
    command: RendererCommand,
    currentState: ThreeSceneState,
  ): ThreeSceneState {
    const payload = (command.payload || {}) as HighlightNodePayload;
    const nodeId = command.targetId;
    const existing = currentState.nodes[nodeId];

    const isReset = Boolean(payload.reset);
    const resolvedColor =
      payload.glowColor ??
      payload.color ??
      (payload.intent ? INTENT_COLORS[payload.intent] : undefined) ??
      INTENT_COLORS['default'];

    const node: Node3DState = {
      ...(existing ?? { nodeId }),
      nodeId,
      highlighted: !isReset,
      highlightColor: isReset ? undefined : resolvedColor,
      intensity: isReset ? 0 : (payload.intensity ?? 1.0),
    };

    return {
      ...currentState,
      nodes: {
        ...currentState.nodes,
        [nodeId]: node,
      },
    };
  }

  private mapUpdateNodeState(
    command: RendererCommand,
    currentState: ThreeSceneState,
  ): ThreeSceneState {
    const payload = (command.payload || {}) as UpdateNodeStatePayload;
    const nodeId = command.targetId;
    const existing = currentState.nodes[nodeId];

    const node: Node3DState = {
      ...(existing ?? { nodeId }),
      nodeId,
      status: payload.status ?? existing?.status,
      customData: {
        ...(existing?.customData ?? {}),
        ...(payload.customData ?? {}),
      },
    };

    return {
      ...currentState,
      nodes: {
        ...currentState.nodes,
        [nodeId]: node,
      },
    };
  }

  private mapUpdateConnection(
    command: RendererCommand,
    currentState: ThreeSceneState,
  ): ThreeSceneState {
    const payload = (command.payload || {}) as UpdateConnectionPayload;
    const connectionId = command.targetId;
    const existing = currentState.connections[connectionId];

    const connection: Connection3DState = {
      connectionId,
      fromNodeId: payload.fromNodeId ?? existing?.fromNodeId ?? '',
      toNodeId: payload.toNodeId ?? existing?.toNodeId ?? '',
      active: payload.active ?? existing?.active ?? true,
      color: payload.color ?? existing?.color ?? INTENT_COLORS['transmitting'],
      lineWidth: payload.lineWidth ?? existing?.lineWidth ?? 2,
      flowSpeed: payload.flowSpeed ?? existing?.flowSpeed ?? 1.0,
    };

    return {
      ...currentState,
      connections: {
        ...currentState.connections,
        [connectionId]: connection,
      },
    };
  }
}
