import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-examples-page',
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header
      [heading]="i18n.t('examples.title')"
      [subtitle]="i18n.t('examples.subtitle')"
    />
    <app-empty-state icon="sparkles" [message]="i18n.t('common.comingSoon')" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamplesPage {
  protected readonly i18n = inject(I18nService);
}
