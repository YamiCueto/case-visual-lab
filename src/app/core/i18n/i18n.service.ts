import { computed, DOCUMENT, effect, inject, Injectable } from '@angular/core';
import { LanguageCode } from '../../domain/settings/app-settings';
import { SettingsService } from '../settings/settings.service';
import { en } from './locales/en';
import { Dictionary, es, TranslationKey } from './locales/es';

const DICTIONARIES: Record<LanguageCode, Partial<Dictionary>> = { es, en };

/**
 * Lightweight runtime i18n built on signals.
 * Runtime (not build-time @angular/localize) because GitHub Pages serves one bundle
 * and the language must switch without reloading.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly settings = inject(SettingsService);
  private readonly document = inject(DOCUMENT);

  readonly language = computed(() => this.settings.settings().language);
  private readonly dictionary = computed(() => DICTIONARIES[this.language()]);

  constructor() {
    effect(() => (this.document.documentElement.lang = this.language()));
  }

  /** Reactive when called from templates or computed contexts. */
  t(key: TranslationKey): string {
    return this.dictionary()[key] ?? es[key];
  }

  setLanguage(language: LanguageCode): void {
    this.settings.update({ language });
  }
}
