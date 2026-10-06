import { RendererCommand } from '../../../../engine/behaviors/commands/renderer-command.types';
import { RenderExecutionContext } from '../../../../engine/rendering/contracts/render-context.interface';
import { RendererBatch } from '../../../../engine/rendering/contracts/renderer-batch.types';
import { RendererPort } from '../../../../engine/rendering/contracts/renderer-port.interface';
import { AudioRenderContext } from '../contracts/audio-render-context.interface';
import { AudioScene } from '../contracts/audio-scene.interface';
import { AudioState, DEFAULT_AUDIO_STATE } from '../contracts/audio-state.interface';
import { AudioCommandMapper } from '../mapping/audio-command-mapper';
import { AudioDiff } from '../mapping/audio-diff';

/**
 * Infrastructure Renderer Adapter for Web Audio subsystem.
 *
 * Implements RendererPort without direct browser dependencies.
 * Translates discrete audio RendererCommands into pure AudioState mutations,
 * performs incremental diffing, and dispatches calls to an abstract AudioScene.
 */
export class WebAudioRendererAdapter implements RendererPort {
  readonly id: string;
  readonly priority: number;

  private scene?: AudioScene;
  private readonly mapper: AudioCommandMapper;
  private readonly diff: AudioDiff;

  private currentState: AudioState = DEFAULT_AUDIO_STATE;
  private initialized = false;
  private disposed = false;
  private renderCount = 0;
  private lastRenderedBatchId?: string;

  constructor(
    scene?: AudioScene,
    options?: {
      readonly id?: string;
      readonly priority?: number;
      readonly mapper?: AudioCommandMapper;
      readonly diff?: AudioDiff;
    },
  ) {
    this.id = options?.id ?? 'web-audio-renderer';
    this.priority = options?.priority ?? 30;
    this.scene = scene;
    this.mapper = options?.mapper ?? new AudioCommandMapper();
    this.diff = options?.diff ?? new AudioDiff();

    if (scene) {
      this.currentState = scene.getState();
    }
  }

  setScene(scene: AudioScene): void {
    this.scene = scene;
    this.currentState = scene.getState();
  }

  getScene(): AudioScene | undefined {
    return this.scene;
  }

  getCurrentState(): AudioState {
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
      throw new Error(`Cannot initialize disposed audio renderer: ${this.id}`);
    }

    const audioCtx = context as AudioRenderContext | undefined;
    if (audioCtx?.audioScene) {
      this.setScene(audioCtx.audioScene);
    } else if (context?.metadata?.['audioScene']) {
      this.setScene(context.metadata['audioScene'] as AudioScene);
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

    const audioCtx = context as AudioRenderContext | undefined;
    const activeScene = audioCtx?.audioScene ?? this.scene;

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
      const nextState = this.mapper.mapCommand(cmd, this.currentState, batch.virtualTime);
      if (!nextState) {
        continue;
      }

      const diffResult = this.diff.computeDiff(this.currentState, nextState);
      if (diffResult.hasChanges) {
        if (diffResult.masterVolumeChanged) {
          activeScene.setMasterVolume(nextState.masterVolume);
        }
        if (diffResult.mutedChanged) {
          activeScene.setMuted(nextState.muted);
        }
        for (const cue of diffResult.cuesToPlay) {
          activeScene.playCue(cue);
        }
        for (const cueId of diffResult.cuesToStop) {
          activeScene.stopCue(cueId);
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
    this.currentState = DEFAULT_AUDIO_STATE;
    if (this.scene) {
      this.scene.reset();
    }
  }

  dispose(): void {
    this.scene = undefined;
    this.disposed = true;
    this.initialized = false;
    this.currentState = DEFAULT_AUDIO_STATE;
  }
}
