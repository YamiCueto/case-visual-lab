import {
  Connection3DState,
  Node3DState,
  ParticleState,
  ThreeSceneState,
  Vector3D,
} from '../contracts/particle-state.interface';

export interface ParticleDiffResult {
  readonly hasChanges: boolean;
  readonly spawnedParticles: readonly ParticleState[];
  readonly updatedParticles: readonly ParticleState[];
  readonly destroyedParticleIds: readonly string[];
  readonly highlightedNodes: readonly Node3DState[];
  readonly updatedConnections: readonly Connection3DState[];
}

export class ParticleDiff {
  private readonly epsilon = 1e-4;

  computeDiff(stateA: ThreeSceneState, stateB: ThreeSceneState): ParticleDiffResult {
    const spawnedParticles: ParticleState[] = [];
    const updatedParticles: ParticleState[] = [];
    const destroyedParticleIds: string[] = [];
    const highlightedNodes: Node3DState[] = [];
    const updatedConnections: Connection3DState[] = [];

    for (const [id, nextP] of Object.entries(stateB.particles)) {
      const prevP = stateA.particles[id];
      if (!prevP) {
        if (nextP.isAlive) {
          spawnedParticles.push(nextP);
        }
      } else {
        if (!prevP.isAlive && nextP.isAlive) {
          spawnedParticles.push(nextP);
        } else if (nextP.isAlive && this.hasParticleChanged(prevP, nextP)) {
          updatedParticles.push(nextP);
        }
      }
    }

    for (const [id, prevP] of Object.entries(stateA.particles)) {
      const nextP = stateB.particles[id];
      if (prevP.isAlive && (!nextP || !nextP.isAlive)) {
        destroyedParticleIds.push(id);
      }
    }

    for (const [id, nextN] of Object.entries(stateB.nodes)) {
      const prevN = stateA.nodes[id];
      if (!prevN || this.hasNodeChanged(prevN, nextN)) {
        highlightedNodes.push(nextN);
      }
    }

    for (const [id, nextC] of Object.entries(stateB.connections)) {
      const prevC = stateA.connections[id];
      if (!prevC || this.hasConnectionChanged(prevC, nextC)) {
        updatedConnections.push(nextC);
      }
    }

    const hasChanges =
      spawnedParticles.length > 0 ||
      updatedParticles.length > 0 ||
      destroyedParticleIds.length > 0 ||
      highlightedNodes.length > 0 ||
      updatedConnections.length > 0;

    return {
      hasChanges,
      spawnedParticles,
      updatedParticles,
      destroyedParticleIds,
      highlightedNodes,
      updatedConnections,
    };
  }

  private hasParticleChanged(a: ParticleState, b: ParticleState): boolean {
    return (
      this.hasVectorChanged(a.position, b.position) ||
      this.hasVectorChanged(a.scale, b.scale) ||
      this.hasVectorChanged(a.rotation, b.rotation) ||
      Math.abs(a.opacity - b.opacity) > this.epsilon ||
      a.color !== b.color ||
      a.targetNodeId !== b.targetNodeId
    );
  }

  private hasVectorChanged(a: Vector3D, b: Vector3D): boolean {
    return (
      Math.abs(a.x - b.x) > this.epsilon ||
      Math.abs(a.y - b.y) > this.epsilon ||
      Math.abs(a.z - b.z) > this.epsilon
    );
  }

  private hasNodeChanged(a: Node3DState, b: Node3DState): boolean {
    return (
      a.highlighted !== b.highlighted ||
      a.highlightColor !== b.highlightColor ||
      Math.abs((a.intensity ?? 0) - (b.intensity ?? 0)) > this.epsilon ||
      a.status !== b.status
    );
  }

  private hasConnectionChanged(a: Connection3DState, b: Connection3DState): boolean {
    return (
      a.active !== b.active ||
      a.color !== b.color ||
      Math.abs((a.lineWidth ?? 0) - (b.lineWidth ?? 0)) > this.epsilon ||
      Math.abs((a.flowSpeed ?? 0) - (b.flowSpeed ?? 0)) > this.epsilon
    );
  }
}
