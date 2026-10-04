import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-templates-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      [heading]="i18n.t('templates.title')"
      [subtitle]="i18n.t('templates.subtitle')"
    />
    <app-empty-state icon="layers" [message]="i18n.t('common.comingSoon')" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplatesPage {
  protected readonly i18n = inject(I18nService);
}
