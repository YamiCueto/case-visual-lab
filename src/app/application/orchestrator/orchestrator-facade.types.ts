import { RuntimeLifecycleState } from '../../engine/kernel/state-machine/runtime-state-machine.types';

export interface OrchestratorFacadeSnapshot {
  readonly runtimeState: RuntimeLifecycleState;
  readonly playState: string;
  readonly currentTime: number;
  readonly frameNumber: number;
  readonly playbackSpeed: number;
  readonly isReady: boolean;
  readonly isPlaying: boolean;
  readonly isPaused: boolean;
  readonly isLoading: boolean;
  readonly lastError: string | null;
  readonly activeNode?: string;
  readonly latencyMs?: number;
  readonly currentStage?: string;
  readonly experienceTitle?: string;
}
