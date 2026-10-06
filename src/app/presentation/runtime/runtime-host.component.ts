import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';

@Component({
  selector: 'app-runtime-host',
  templateUrl: './runtime-host.component.html',
  styleUrl: './runtime-host.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuntimeHostComponent {
  readonly facade = inject(OrchestratorFacadeService);

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

  async load(uriOrSlug: string): Promise<void> {
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

  async seek(targetTimeMs: number): Promise<void> {
    await this.facade.seek(targetTimeMs);
  }

  stop(): void {
    this.facade.stop();
  }

  async destroy(): Promise<void> {
    await this.facade.destroy();
  }

  tick(deltaMs?: number): void {
    this.facade.tick(deltaMs);
  }
}
