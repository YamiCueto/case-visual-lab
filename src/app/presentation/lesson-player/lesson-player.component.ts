import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  Signal,
  untracked,
} from '@angular/core';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { RuntimeHostComponent } from '../runtime/runtime-host.component';
import { TimelinePanelComponent } from '../timeline/timeline-panel.component';
import { InspectorPanelComponent } from '../inspector/inspector-panel.component';
import { LessonContentComponent } from '../lesson-content/lesson-content.component';

@Component({
  selector: 'app-lesson-player',
  imports: [
    ToolbarComponent,
    LessonContentComponent,
    RuntimeHostComponent,
    TimelinePanelComponent,
    InspectorPanelComponent,
  ],
  templateUrl: './lesson-player.component.html',
  styleUrl: './lesson-player.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonPlayerComponent implements OnInit, OnDestroy {
  readonly facade = inject(OrchestratorFacadeService);
  readonly slug = input<string>();

  private _lastLoadedSlug = '';
  private _animFrameId: number | null = null;
  private _lastFrameTime = 0;

  readonly runtimeState: Signal<string> = this.facade.runtimeState;
  readonly playState: Signal<string> = this.facade.playState;
  readonly currentTime: Signal<number> = this.facade.currentTime;
  readonly frameNumber: Signal<number> = this.facade.frameNumber;
  readonly playbackSpeed: Signal<number> = this.facade.playbackSpeed;
  readonly isReady: Signal<boolean> = this.facade.isReady;
  readonly isPlaying: Signal<boolean> = this.facade.isPlaying;
  readonly isPaused: Signal<boolean> = this.facade.isPaused;
  readonly isLoading: Signal<boolean> = this.facade.isLoading;
  readonly lastError: Signal<string | null> = this.facade.lastError;

  readonly experienceTitle: Signal<string> = computed(() => {
    return this.facade.experienceTitle
      ? this.facade.experienceTitle()
      : 'CASE Visual Lab Experience';
  });

  readonly timelineDuration: Signal<number> = computed(() => {
    return this.facade.experienceManifest()?.timeline?.durationMs ?? 10000;
  });

  constructor() {
    effect(() => {
      const s = this.slug();
      if (s && s !== this._lastLoadedSlug) {
        this._lastLoadedSlug = s;
        const uri = s.startsWith('lessons/') || s.endsWith('.json') ? s : `lessons/${s}`;
        untracked(() => {
          void this.load(uri).catch(() => void 0);
        });
      }
    });

    effect(() => {
      const isPlaying = this.facade.isPlaying();
      if (isPlaying) {
        this.startPlaybackLoop();
      } else {
        this.stopPlaybackLoop();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const s = this.slug();
    if (s && s !== this._lastLoadedSlug && !this.isReady()) {
      this._lastLoadedSlug = s;
      try {
        const uri = s.startsWith('lessons/') || s.endsWith('.json') ? s : `lessons/${s}`;
        await this.load(uri);
      } catch {
        void 0;
      }
    }
  }

  async load(uriOrSlug: string): Promise<void> {
    await this.facade.load(uriOrSlug);
  }

  ngOnDestroy(): void {
    this.stopPlaybackLoop();
  }

  play(): void {
    this.facade.play();
  }

  pause(): void {
    this.stopPlaybackLoop();
    this.facade.pause();
  }

  resume(): void {
    this.facade.resume();
  }

  async seek(targetTimeMs: number): Promise<void> {
    await this.facade.seek(targetTimeMs);
  }

  stop(): void {
    this.stopPlaybackLoop();
    this.facade.stop();
  }

  async destroy(): Promise<void> {
    this.stopPlaybackLoop();
    await this.facade.destroy();
  }

  tick(deltaMs?: number): void {
    this.facade.tick(deltaMs);
  }

  private startPlaybackLoop(): void {
    if (this._animFrameId !== null || typeof requestAnimationFrame === 'undefined') {
      return;
    }
    this._lastFrameTime = performance.now();
    const loop = (now: number) => {
      if (!this.facade.isPlaying()) {
        this.stopPlaybackLoop();
        return;
      }
      const deltaMs = Math.max(0, now - this._lastFrameTime);
      this._lastFrameTime = now;
      if (deltaMs > 0) {
        this.facade.tick(deltaMs);
      }
      const duration = this.timelineDuration();
      if (duration > 0 && this.facade.currentTime() >= duration) {
        this.pause();
        return;
      }
      this._animFrameId = requestAnimationFrame(loop);
    };
    this._animFrameId = requestAnimationFrame(loop);
  }

  private stopPlaybackLoop(): void {
    if (this._animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
  }
}
