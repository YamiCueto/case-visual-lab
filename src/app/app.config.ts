import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { I18nService } from './core/i18n/i18n.service';
import { ThemeService } from './core/theme/theme.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash routing: GitHub Pages has no SPA fallback, so /#/route avoids 404s on refresh.
    provideRouter(routes, withHashLocation(), withComponentInputBinding()),
    // Eagerly instantiate services whose effects sync <html> attributes.
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(I18nService);
    }),
  ],
};
