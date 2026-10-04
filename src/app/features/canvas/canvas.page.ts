import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

/** Future host of the Excalidraw React island (see documentation/architecture.md). */
@Component({
  selector: 'app-canvas-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header [heading]="i18n.t('canvas.title')" [subtitle]="i18n.t('canvas.subtitle')" />
    <app-empty-state icon="pen" [message]="i18n.t('common.comingSoon')" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasPage {
  protected readonly i18n = inject(I18nService);
}
