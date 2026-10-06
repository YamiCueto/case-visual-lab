import { Signal } from '@angular/core';
import { RuntimeLifecycleState } from '../../engine/kernel/state-machine/runtime-state-machine.types';
import { ExperienceContext } from '../../engine/orchestrator/contracts/experience-context.interface';

export interface IOrchestratorFacade {
  readonly runtimeState: Signal<RuntimeLifecycleState>;
  readonly playState: Signal<string>;
  readonly currentTime: Signal<number>;
  readonly frameNumber: Signal<number>;
  readonly playbackSpeed: Signal<number>;
  readonly isReady: Signal<boolean>;
  readonly isPlaying: Signal<boolean>;
  readonly isPaused: Signal<boolean>;
  readonly isLoading: Signal<boolean>;
  readonly lastError: Signal<string | null>;
  readonly activeNode?: Signal<string>;
  readonly latencyMs?: Signal<number>;
  readonly currentStage?: Signal<string>;
  readonly experienceTitle?: Signal<string>;

  load(uriOrSlug: string, autoInitialize?: boolean): Promise<ExperienceContext>;
  play(): void;
  pause(): void;
  resume(): void;
  seek(targetTimeMs: number): Promise<void>;
  stop(): void;
  destroy(): Promise<void>;
  tick(deltaMs?: number): void;
  dispose(): Promise<void>;
}
