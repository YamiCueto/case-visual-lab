import {
  Connection3DState,
  Node3DState,
  ParticleState,
  ThreeSceneState,
} from './particle-state.interface';

/**
 * Abstract graphics backend driver for 3D overlays.
 * Free of any Three.js Mesh, Geometry, Scene or Camera references.
 */
export interface ThreeScene {
  /**
   * Returns current internal state of the 3D scene.
   */
  getState(): ThreeSceneState;

  /**
   * Spawns a new particle into the 3D visual layer.
   */
  spawnParticle(particle: ParticleState): void;

  /**
   * Updates an existing active particle's spatial coordinates, scale, or appearance.
   */
  updateParticle(particle: ParticleState): void;

  /**
   * Removes or releases a particle from the scene.
   */
  destroyParticle(particleId: string): void;

  /**
   * Modifies 3D node aura/highlight attributes.
   */
  highlightNode(node: Node3DState): void;

  /**
   * Updates or animates an active connection between nodes.
   */
  updateConnection(connection: Connection3DState): void;

  /**
   * Resets all particles, highlights, and connections to initial clean state.
   */
  reset(): void;
}
