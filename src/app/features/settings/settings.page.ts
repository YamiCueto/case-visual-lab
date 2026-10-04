import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { SettingsService } from '../../core/settings/settings.service';
import { ThemeService } from '../../core/theme/theme.service';
import { LanguageCode, ThemeId } from '../../domain/settings/app-settings';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-settings-page',
  imports: [PageHeaderComponent],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly settings = inject(SettingsService);

  protected readonly themes: readonly ThemeId[] = ['oled', 'light'];
  protected readonly languages: readonly { code: LanguageCode; label: string }[] = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English (beta)' },
  ];

  protected onTheme(value: string): void {
    this.theme.setTheme(value as ThemeId);
  }

  protected onLanguage(value: string): void {
    this.i18n.setLanguage(value as LanguageCode);
  }
}
