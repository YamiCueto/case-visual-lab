import {
  computed,
  inject,
  Injectable,
  InjectionToken,
  OnDestroy,
  signal,
  Signal,
} from '@angular/core';
import { CompositionContext } from '../../engine/kernel/composition/composition-context.interface';
import { ExperienceCompositionRoot } from '../../engine/kernel/composition/experience-composition-root';
import { ExperienceOrchestrator } from '../../engine/orchestrator/runtime/experience-orchestrator';
import { ExperienceContext } from '../../engine/orchestrator/contracts/experience-context.interface';
import { RuntimeLifecycleState } from '../../engine/kernel/state-machine/runtime-state-machine.types';
import { IOrchestratorFacade } from './orchestrator-facade.interface';
import { OrchestratorFacadeSnapshot } from './orchestrator-facade.types';

export const ORCHESTRATOR_COMPOSITION_CONTEXT = new InjectionToken<CompositionContext>(
  'ORCHESTRATOR_COMPOSITION_CONTEXT',
);

@Injectable({
  providedIn: 'root',
})
export class OrchestratorFacadeService implements IOrchestratorFacade, OnDestroy {
  private readonly _orchestrator: ExperienceOrchestrator;

  private readonly _runtimeState = signal<RuntimeLifecycleState>('LOAD');
  private readonly _playState = signal<string>('STOPPED');
  private readonly _currentTime = signal<number>(0);
  private readonly _frameNumber = signal<number>(0);
  private readonly _playbackSpeed = signal<number>(1.0);
  private readonly _lastError = signal<string | null>(null);

  readonly runtimeState: Signal<RuntimeLifecycleState> = this._runtimeState.asReadonly();
  readonly playState: Signal<string> = this._playState.asReadonly();
  readonly currentTime: Signal<number> = this._currentTime.asReadonly();
  readonly frameNumber: Signal<number> = this._frameNumber.asReadonly();
  readonly playbackSpeed: Signal<number> = this._playbackSpeed.asReadonly();
  readonly lastError: Signal<string | null> = this._lastError.asReadonly();

  readonly isReady: Signal<boolean> = computed(() => this._runtimeState() === 'READY');
  readonly isPlaying: Signal<boolean> = computed(
    () => this._runtimeState() === 'PLAYING' || this._playState() === 'PLAYING',
  );
  readonly isPaused: Signal<boolean> = computed(
    () => this._runtimeState() === 'PAUSED' || this._playState() === 'PAUSED',
  );
  readonly isLoading: Signal<boolean> = computed(() => {
    const s = this._runtimeState();
    return s === 'LOAD' || s === 'VALIDATE' || s === 'BUILD' || s === 'INITIALIZE';
  });

  private readonly _injectedContext = inject(ORCHESTRATOR_COMPOSITION_CONTEXT, {
    optional: true,
  });

  constructor() {
    const platformRuntime = ExperienceCompositionRoot.compose(this._injectedContext ?? undefined);
    this._orchestrator = new ExperienceOrchestrator({ platformRuntime });
    this.syncSignals();
  }

  ngOnDestroy(): void {
    void this.dispose();
  }

  async load(uriOrSlug: string, autoInitialize = true): Promise<ExperienceContext> {
    try {
      this._lastError.set(null);
      this._runtimeState.set('LOAD');
      const context = await this._orchestrator.load(uriOrSlug, autoInitialize);
      this.syncSignals();
      return context;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  play(): void {
    try {
      this._orchestrator.play();
      this.syncSignals();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  pause(): void {
    try {
      this._orchestrator.pause();
      this.syncSignals();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  resume(): void {
    try {
      this._orchestrator.resume();
      this.syncSignals();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async seek(targetTimeMs: number): Promise<void> {
    try {
      await this._orchestrator.seek(targetTimeMs);
      this.syncSignals();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  stop(): void {
    try {
      this._orchestrator.stop();
      this.syncSignals();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  tick(deltaMs?: number): void {
    try {
      this._orchestrator.tick(deltaMs);
      this.syncSignals();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      await this._orchestrator.destroy();
      this.syncSignals();
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async dispose(): Promise<void> {
    await this.destroy();
  }

  setPlaybackSpeed(speed: number): void {
    this._orchestrator.clock.setSpeed(speed);
    this.syncSignals();
  }

  getSnapshot(): OrchestratorFacadeSnapshot {
    return {
      runtimeState: this.runtimeState(),
      playState: this.playState(),
      currentTime: this.currentTime(),
      frameNumber: this.frameNumber(),
      playbackSpeed: this.playbackSpeed(),
      isReady: this.isReady(),
      isPlaying: this.isPlaying(),
      isPaused: this.isPaused(),
      isLoading: this.isLoading(),
      lastError: this.lastError(),
    };
  }

  private syncSignals(): void {
    const currentState = this._orchestrator.state;
    this._runtimeState.set(currentState);
    this._playState.set(this._orchestrator.clock.state);
    this._currentTime.set(this._orchestrator.clock.time);
    this._playbackSpeed.set(this._orchestrator.clock.speed);
    this._frameNumber.set(this._orchestrator.session?.frameSequence ?? 0);

    if (currentState !== 'ERROR' && this._lastError() !== null) {
      this._lastError.set(null);
    }
  }

  private handleError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this._lastError.set(message);
    this.syncSignals();
  }
}
