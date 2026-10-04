import { TranslationKey } from '../../core/i18n/locales/es';
import { IconName } from '../../shared/ui/icon/icon.component';

export interface NavItem {
  readonly path: string;
  readonly label: TranslationKey;
  readonly icon: IconName;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { path: 'dashboard', label: 'nav.dashboard', icon: 'home' },
  { path: 'lessons', label: 'nav.lessons', icon: 'book' },
  { path: 'templates', label: 'nav.templates', icon: 'layers' },
  { path: 'examples', label: 'nav.examples', icon: 'sparkles' },
  { path: 'canvas', label: 'nav.canvas', icon: 'pen' },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { path: 'philosophy', label: 'nav.philosophy', icon: 'compass' },
  { path: 'settings', label: 'nav.settings', icon: 'settings' },
  { path: 'about', label: 'nav.about', icon: 'info' },
];
