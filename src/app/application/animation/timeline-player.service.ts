import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import {
  AnimationFrame,
  AnimationTimeline,
  PlaybackStatus,
  TimelinePlaybackState,
} from '../../domain/animation/animation.interface';

export type FrameChangeHandler = (
  frame: AnimationFrame,
  nodePositions: AnimationTimeline['nodePositions'],
  speed: number,
) => void;

/**
 * Coordinates frame-by-frame temporal execution for architectural animations.
 * Provides controls for play, pause, step next/previous, seeking, and variable playback speeds.
 */
@Injectable({ providedIn: 'root' })
export class TimelinePlayerService implements OnDestroy {
  private readonly timelineState = signal<AnimationTimeline | null>(null);
  private readonly frameIndexState = signal<number>(0);
  private readonly statusState = signal<PlaybackStatus>('idle');
  private readonly speedState = signal<number>(1);

  readonly timeline = this.timelineState.asReadonly();
  readonly currentFrameIndex = this.frameIndexState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly speed = this.speedState.asReadonly();

  readonly isPlaying = computed(() => this.statusState() === 'playing');
  readonly totalFrames = computed(() => this.timelineState()?.frames.length ?? 0);

  readonly currentFrame = computed<AnimationFrame | null>(() => {
    const tl = this.timelineState();
    if (!tl || tl.frames.length === 0) return null;
    return tl.frames[this.frameIndexState()] ?? null;
  });

  readonly progressPct = computed(() => {
    const total = this.totalFrames();
    if (total <= 1) return 0;
    return Math.round((this.frameIndexState() / (total - 1)) * 100);
  });

  readonly playbackState = computed<TimelinePlaybackState>(() => ({
    status: this.statusState(),
    currentFrameIndex: this.frameIndexState(),
    progressPct: this.progressPct(),
    speed: this.speedState(),
  }));

  private timer: ReturnType<typeof setTimeout> | null = null;
  private onFrameListeners: FrameChangeHandler[] = [];

  ngOnDestroy(): void {
    this.stopTimer();
    this.onFrameListeners = [];
  }

  onFrameChange(listener: FrameChangeHandler): () => void {
    this.onFrameListeners.push(listener);
    // Emit current frame immediately if available
    const frame = this.currentFrame();
    const tl = this.timelineState();
    if (frame && tl) {
      listener(frame, tl.nodePositions, this.speedState());
    }
    return () => {
      this.onFrameListeners = this.onFrameListeners.filter((l) => l !== listener);
    };
  }

  loadTimeline(timeline: AnimationTimeline): void {
    this.pause();
    this.timelineState.set(timeline);
    this.frameIndexState.set(0);
    this.speedState.set(timeline.defaultSpeed ?? 1);
    this.statusState.set('idle');
    this.notifyFrame();
  }

  play(): void {
    const total = this.totalFrames();
    if (total === 0) return;

    // Loop back to start if at the end
    if (this.frameIndexState() >= total - 1) {
      this.frameIndexState.set(0);
    }

    this.statusState.set('playing');
    this.notifyFrame();
    this.scheduleNextFrame();
  }

  pause(): void {
    this.stopTimer();
    if (this.statusState() === 'playing') {
      this.statusState.set('paused');
    }
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  stepNext(): void {
    this.pause();
    const total = this.totalFrames();
    if (total === 0) return;
    if (this.frameIndexState() < total - 1) {
      this.frameIndexState.update((idx) => idx + 1);
      this.notifyFrame();
    }
  }

  stepPrevious(): void {
    this.pause();
    if (this.frameIndexState() > 0) {
      this.frameIndexState.update((idx) => idx - 1);
      this.notifyFrame();
    }
  }

  seek(frameIndex: number): void {
    const total = this.totalFrames();
    if (total === 0) return;
    const clamped = Math.max(0, Math.min(frameIndex, total - 1));
    this.frameIndexState.set(clamped);
    this.notifyFrame();
    if (this.isPlaying()) {
      this.scheduleNextFrame();
    }
  }

  setSpeed(speed: number): void {
    this.speedState.set(Math.max(0.25, Math.min(speed, 4)));
    if (this.isPlaying()) {
      this.scheduleNextFrame();
    }
  }

  reset(): void {
    this.pause();
    this.frameIndexState.set(0);
    this.statusState.set('idle');
    this.notifyFrame();
  }

  private scheduleNextFrame(): void {
    this.stopTimer();
    const frame = this.currentFrame();
    const baseDuration = frame?.durationMs ?? 2000;
    const effectiveDuration = Math.max(300, baseDuration / this.speedState());

    this.timer = setTimeout(() => {
      const nextIndex = this.frameIndexState() + 1;
      if (nextIndex < this.totalFrames()) {
        this.frameIndexState.set(nextIndex);
        this.notifyFrame();
        this.scheduleNextFrame();
      } else {
        this.statusState.set('completed');
        this.stopTimer();
      }
    }, effectiveDuration);
  }

  private notifyFrame(): void {
    const frame = this.currentFrame();
    const tl = this.timelineState();
    if (!frame || !tl) return;
    for (const listener of this.onFrameListeners) {
      listener(frame, tl.nodePositions, this.speedState());
    }
  }

  private stopTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
