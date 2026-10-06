import { ChangeDetectionStrategy, Component, inject, input, Signal } from '@angular/core';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolbarComponent {
  readonly facade = inject(OrchestratorFacadeService);

  readonly experienceTitle = input<string>('CASE Visual Lab Experience');

  readonly availableSpeeds: readonly number[] = [0.25, 0.5, 1, 1.5, 2, 5];

  readonly runtimeState: Signal<string> = this.facade.runtimeState;
  readonly playState: Signal<string> = this.facade.playState;
  readonly currentTime: Signal<number> = this.facade.currentTime;
  readonly playbackSpeed: Signal<number> = this.facade.playbackSpeed;
  readonly isReady: Signal<boolean> = this.facade.isReady;
  readonly isPlaying: Signal<boolean> = this.facade.isPlaying;
  readonly isPaused: Signal<boolean> = this.facade.isPaused;
  readonly isLoading: Signal<boolean> = this.facade.isLoading;
  readonly lastError: Signal<string | null> = this.facade.lastError;

  async load(uriOrSlug = 'default'): Promise<void> {
    await this.facade.load(uriOrSlug);
  }

  play(): void {
    this.facade.play();
  }

  pause(): void {
    this.facade.pause();
  }

  resume(): void {
    this.facade.resume();
  }

  stop(): void {
    this.facade.stop();
  }

  setSpeed(speed: number): void {
    this.facade.setPlaybackSpeed(speed);
  }

  onSpeedSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const speed = parseFloat(target.value);
    if (!Number.isNaN(speed)) {
      this.setSpeed(speed);
    }
  }
}
