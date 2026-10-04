import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { CameraPort } from '../../domain/cinematic/camera.interface';
import {
  CinematicFrame,
  CinematicTimeline,
  LiveStateMutation,
} from '../../domain/cinematic/cinematic-frame.interface';

@Injectable({ providedIn: 'root' })
export class CinematicEngineService implements OnDestroy {
  private readonly timelineState = signal<CinematicTimeline | null>(null);
  private readonly frameIndexState = signal<number>(0);
  private readonly isPlayingState = signal<boolean>(false);
  private readonly speedState = signal<number>(1);
  private readonly liveStateMapState = signal<Map<string, LiveStateMutation>>(new Map());

  readonly timeline = this.timelineState.asReadonly();
  readonly currentFrameIndex = this.frameIndexState.asReadonly();
  readonly isPlaying = this.isPlayingState.asReadonly();
  readonly speed = this.speedState.asReadonly();
  readonly liveStateMap = this.liveStateMapState.asReadonly();

  readonly totalFrames = computed(() => this.timelineState()?.frames.length ?? 0);

  readonly currentFrame = computed<CinematicFrame | null>(() => {
    const tl = this.timelineState();
    if (!tl || tl.frames.length === 0) return null;
    return tl.frames[this.frameIndexState()] ?? null;
  });

  readonly activeNarrative = computed(() => this.currentFrame()?.narrative ?? null);
  readonly activeBehaviors = computed(() => this.currentFrame()?.behaviors ?? []);
  readonly activeEntities = computed(() => this.currentFrame()?.entities ?? []);

  private cameraAdapter: CameraPort | null = null;
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    this.stopAutoAdvance();
  }

  registerCameraPort(camera: CameraPort): void {
    this.cameraAdapter = camera;
  }

  loadTimeline(timeline: CinematicTimeline): void {
    this.stopAutoAdvance();
    this.timelineState.set(timeline);
    this.frameIndexState.set(0);
    this.speedState.set(timeline.defaultSpeed ?? 1);
    this.isPlayingState.set(false);
    this.applyFrame(0);
  }

  stepNext(): void {
    const total = this.totalFrames();
    if (this.frameIndexState() < total - 1) {
      this.goToFrame(this.frameIndexState() + 1);
    }
  }

  stepPrevious(): void {
    if (this.frameIndexState() > 0) {
      this.goToFrame(this.frameIndexState() - 1);
    }
  }

  goToFrame(index: number): void {
    const total = this.totalFrames();
    if (total === 0) return;
    const clamped = Math.max(0, Math.min(index, total - 1));
    this.frameIndexState.set(clamped);
    this.applyFrame(clamped);
  }

  play(): void {
    this.isPlayingState.set(true);
    this.scheduleAutoAdvance();
  }

  pause(): void {
    this.isPlayingState.set(false);
    this.stopAutoAdvance();
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  setSpeed(speed: number): void {
    this.speedState.set(Math.max(0.25, Math.min(speed, 4)));
    if (this.isPlaying()) {
      this.scheduleAutoAdvance();
    }
  }

  reset(): void {
    this.pause();
    this.frameIndexState.set(0);
    this.liveStateMapState.set(new Map());
    this.cameraAdapter?.reset();
    this.applyFrame(0);
  }

  private applyFrame(index: number): void {
    const frame = this.timelineState()?.frames[index];
    if (!frame) return;

    // 1. Dispatch camera action if present
    if (frame.camera && this.cameraAdapter) {
      this.cameraAdapter.execute(frame.camera);
    }

    // 2. Accumulate or replace live state mutations
    const newMap = new Map<string, LiveStateMutation>();
    for (const mutation of frame.stateMutations) {
      newMap.set(mutation.nodeId, mutation);
    }
    this.liveStateMapState.set(newMap);
  }

  private scheduleAutoAdvance(): void {
    this.stopAutoAdvance();
    const frame = this.currentFrame();
    const duration = Math.max(500, (frame?.durationMs ?? 2500) / this.speedState());

    this.autoAdvanceTimer = setTimeout(() => {
      if (!this.isPlaying()) return;
      const nextIdx = this.frameIndexState() + 1;
      if (nextIdx < this.totalFrames()) {
        this.goToFrame(nextIdx);
        this.scheduleAutoAdvance();
      } else {
        this.pause();
      }
    }, duration);
  }

  private stopAutoAdvance(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }
}
