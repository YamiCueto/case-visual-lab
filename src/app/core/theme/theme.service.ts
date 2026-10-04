import { computed, DOCUMENT, effect, inject, Injectable } from '@angular/core';
import { ThemeId } from '../../domain/settings/app-settings';
import { SettingsService } from '../settings/settings.service';

/** Applies the active theme to `<html data-theme>`. Excalidraw theme will derive from `isDark`. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly settings = inject(SettingsService);

  readonly theme = computed(() => this.settings.settings().theme);
  readonly isDark = computed(() => this.theme() === 'oled');

  constructor() {
    effect(() => {
      const root = this.document.documentElement;
      root.dataset['theme'] = this.theme();
      root.toggleAttribute('data-reduced-motion', this.settings.settings().reducedMotion);
    });
  }

  setTheme(theme: ThemeId): void {
    this.settings.update({ theme });
  }
}
