import { VisualBehavior } from './behavior.interface';
import { CameraAction } from './camera.interface';
import { AnimatedEntity } from './entity.interface';
import { NarrativeFrame } from './narrative.interface';

export type LiveNodeStatus = 'idle' | 'processing' | 'success' | 'warning' | 'error';

export interface LiveStateMutation {
  readonly nodeId: string;
  readonly status?: LiveNodeStatus;
  readonly badgeText?: string;
  readonly metricText?: string;
  readonly strokeColor?: string;
  readonly backgroundColor?: string;
  readonly pulseRipples?: boolean;
}

export interface CinematicFrame {
  readonly id: string;
  readonly frameIndex: number;
  readonly durationMs: number;
  readonly narrative: NarrativeFrame;
  readonly camera?: CameraAction;
  readonly behaviors: readonly VisualBehavior[];
  readonly entities: readonly AnimatedEntity[];
  readonly stateMutations: readonly LiveStateMutation[];
  readonly autoAdvance?: boolean;
  readonly checkpointCriteria?: string;
}

export interface CinematicTimeline {
  readonly id: string;
  readonly title: string;
  readonly sceneId: string;
  readonly defaultSpeed?: number;
  readonly frames: readonly CinematicFrame[];
}
