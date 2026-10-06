import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';
import { OrchestratorFacadeSnapshot } from '../../application/orchestrator/orchestrator-facade.types';

@Component({
  selector: 'app-inspector-panel',
  templateUrl: './inspector-panel.component.html',
  styleUrl: './inspector-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectorPanelComponent {
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

  getSnapshot(): OrchestratorFacadeSnapshot {
    return this.facade.getSnapshot();
  }

  async load(uriOrSlug: string): Promise<void> {
    await this.facade.load(uriOrSlug);
  }
}
