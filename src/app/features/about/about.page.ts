import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-about-page',
  imports: [PageHeaderComponent],
  template: `
    <app-page-header [heading]="i18n.t('about.title')" [subtitle]="i18n.t('about.subtitle')" />
    <section class="card" data-animate="fade-up">
      <p>{{ i18n.t('about.disclaimer') }}</p>
      <p>{{ i18n.t('about.license') }}</p>
      <a
        id="about-excalidraw-repo"
        href="https://github.com/excalidraw/excalidraw"
        target="_blank"
        rel="noopener noreferrer"
      >
        github.com/excalidraw/excalidraw
      </a>
    </section>
  `,
  styles: `
    .card {
      display: grid;
      gap: var(--space-4);
      max-width: 720px;
      color: var(--color-text-muted);
    }
    .card:hover {
      transform: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {
  protected readonly i18n = inject(I18nService);
}
