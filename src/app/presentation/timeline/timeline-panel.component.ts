import { ChangeDetectionStrategy, Component, computed, inject, input, Signal } from '@angular/core';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';

@Component({
  selector: 'app-timeline-panel',
  templateUrl: './timeline-panel.component.html',
  styleUrl: './timeline-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelinePanelComponent {
  readonly facade = inject(OrchestratorFacadeService);

  readonly durationMs = input<number>(10000);

  readonly availableSpeeds: readonly number[] = [0.25, 0.5, 1, 1.5, 2, 5];

  readonly runtimeState: Signal<string> = this.facade.runtimeState;
  readonly playState: Signal<string> = this.facade.playState;
  readonly currentTime: Signal<number> = this.facade.currentTime;
  readonly frameNumber: Signal<number> = this.facade.frameNumber;
  readonly playbackSpeed: Signal<number> = this.facade.playbackSpeed;

  readonly progressPercent: Signal<number> = computed(() => {
    const duration = this.durationMs();
    if (duration <= 0) {
      return 0;
    }
    const current = this.currentTime();
    return Math.min(100, Math.max(0, (current / duration) * 100));
  });

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

  async seek(targetTimeMs: number): Promise<void> {
    await this.facade.seek(targetTimeMs);
  }

  async onSeekSlider(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const value = Number(target.value);
    if (!Number.isNaN(value)) {
      await this.seek(value);
    }
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
