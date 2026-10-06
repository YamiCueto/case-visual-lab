import { RendererCommand } from '../../../../engine/behaviors/commands/renderer-command.types';
import { RenderExecutionContext } from '../../../../engine/rendering/contracts/render-context.interface';
import { RendererBatch } from '../../../../engine/rendering/contracts/renderer-batch.types';
import { RendererPort } from '../../../../engine/rendering/contracts/renderer-port.interface';
import { DEFAULT_THREE_SCENE_STATE, ThreeSceneState } from '../contracts/particle-state.interface';
import { ThreeRenderContext } from '../contracts/three-render-context.interface';
import { ThreeScene } from '../contracts/three-scene.interface';
import { ParticleCommandMapper } from '../mapping/particle-command-mapper';
import { ParticleDiff } from '../mapping/particle-diff';

/**
 * Infrastructure Renderer Adapter for 3D overlay animations (particles, pulses, spatial connections).
 *
 * Implements RendererPort without direct Three.js or DOM dependencies.
 * Translates discrete visual commands into spatial Particle/3D mutations, computes incremental diffs,
 * and delegates drawing operations to an abstract ThreeScene driver.
 */
export class ThreeRendererAdapter implements RendererPort {
  readonly id: string;
  readonly priority: number;

  private scene?: ThreeScene;
  private readonly mapper: ParticleCommandMapper;
  private readonly diff: ParticleDiff;

  private currentState: ThreeSceneState = DEFAULT_THREE_SCENE_STATE;
  private initialized = false;
  private disposed = false;
  private renderCount = 0;
  private lastRenderedBatchId?: string;

  constructor(
    scene?: ThreeScene,
    options?: {
      readonly id?: string;
      readonly priority?: number;
      readonly mapper?: ParticleCommandMapper;
      readonly diff?: ParticleDiff;
    },
  ) {
    this.id = options?.id ?? 'threejs-renderer';
    this.priority = options?.priority ?? 25;
    this.scene = scene;
    this.mapper = options?.mapper ?? new ParticleCommandMapper();
    this.diff = options?.diff ?? new ParticleDiff();

    if (scene) {
      this.currentState = scene.getState();
    }
  }

  setScene(scene: ThreeScene): void {
    this.scene = scene;
    this.currentState = scene.getState();
  }

  getScene(): ThreeScene | undefined {
    return this.scene;
  }

  getCurrentState(): ThreeSceneState {
    return this.currentState;
  }

  getRenderCount(): number {
    return this.renderCount;
  }

  getLastRenderedBatchId(): string | undefined {
    return this.lastRenderedBatchId;
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  initialize(context?: RenderExecutionContext): void {
    if (this.disposed) {
      throw new Error(`Cannot initialize disposed three renderer: ${this.id}`);
    }

    const threeCtx = context as ThreeRenderContext | undefined;
    if (threeCtx?.threeScene) {
      this.setScene(threeCtx.threeScene);
    } else if (context?.metadata?.['threeScene']) {
      this.setScene(context.metadata['threeScene'] as ThreeScene);
    }

    this.initialized = true;
  }

  supports(command: RendererCommand): boolean {
    if (!command || !command.type) {
      return false;
    }
    return this.mapper.supports(command);
  }

  render(batch: RendererBatch, context?: RenderExecutionContext): void {
    if (this.disposed) {
      return;
    }

    const threeCtx = context as ThreeRenderContext | undefined;
    const activeScene = threeCtx?.threeScene ?? this.scene;

    if (!activeScene) {
      return;
    }

    if (!batch || !Array.isArray(batch.commands) || batch.commands.length === 0) {
      this.lastRenderedBatchId = batch?.batchId;
      return;
    }

    const supportedCommands = batch.commands.filter((cmd) => this.supports(cmd));
    if (supportedCommands.length === 0) {
      this.lastRenderedBatchId = batch.batchId;
      return;
    }

    for (const cmd of supportedCommands) {
      const nextState = this.mapper.mapCommand(cmd, this.currentState);
      if (!nextState) {
        continue;
      }

      const diffResult = this.diff.computeDiff(this.currentState, nextState);
      if (diffResult.hasChanges) {
        for (const spawned of diffResult.spawnedParticles) {
          activeScene.spawnParticle(spawned);
        }
        for (const updated of diffResult.updatedParticles) {
          activeScene.updateParticle(updated);
        }
        for (const destroyedId of diffResult.destroyedParticleIds) {
          activeScene.destroyParticle(destroyedId);
        }
        for (const node of diffResult.highlightedNodes) {
          activeScene.highlightNode(node);
        }
        for (const conn of diffResult.updatedConnections) {
          activeScene.updateConnection(conn);
        }
        this.currentState = nextState;
      }
    }

    this.renderCount++;
    this.lastRenderedBatchId = batch.batchId;
  }

  reset(): void {
    if (this.disposed) {
      return;
    }
    this.currentState = DEFAULT_THREE_SCENE_STATE;
    if (this.scene) {
      this.scene.reset();
    }
  }

  dispose(): void {
    this.scene = undefined;
    this.disposed = true;
    this.initialized = false;
    this.currentState = DEFAULT_THREE_SCENE_STATE;
  }
}
