export type ThemeId = 'oled' | 'light';
export type LanguageCode = 'es' | 'en';

export interface AppSettings {
  readonly theme: ThemeId;
  readonly language: LanguageCode;
  readonly reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'oled',
  language: 'es',
  reducedMotion: false,
};
