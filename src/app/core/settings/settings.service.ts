import { effect, inject, Injectable, signal } from '@angular/core';
import { AppSettings, DEFAULT_SETTINGS } from '../../domain/settings/app-settings';
import { StorageService } from '../../infrastructure/storage/storage.service';

const STORAGE_KEY = 'settings';

/** Single source of truth for user preferences, persisted automatically. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly storage = inject(StorageService);
  private readonly state = signal<AppSettings>({
    ...DEFAULT_SETTINGS,
    ...this.storage.get<Partial<AppSettings>>(STORAGE_KEY),
  });

  readonly settings = this.state.asReadonly();

  constructor() {
    effect(() => this.storage.set(STORAGE_KEY, this.state()));
  }

  update(patch: Partial<AppSettings>): void {
    this.state.update((current) => ({ ...current, ...patch }));
  }

  reset(): void {
    this.state.set(DEFAULT_SETTINGS);
  }
}
