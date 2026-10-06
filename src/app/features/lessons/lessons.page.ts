import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { BrowserAssetProvider } from '../../infrastructure/assets/browser';
import { LessonCatalog, LessonCatalogItem } from './lesson-catalog.interface';

@Component({
  selector: 'app-lessons-page',
  imports: [PageHeaderComponent, EmptyStateComponent, RouterLink],
  templateUrl: './lessons.page.html',
  styleUrl: './lessons.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonsPage implements OnInit {
  protected readonly i18n = inject(I18nService);
  private readonly _assetProvider = inject(BrowserAssetProvider, { optional: true });
  private _isLoaded = false;

  readonly lessons = signal<readonly LessonCatalogItem[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    if (!this._isLoaded) {
      await this.loadCatalog();
    }
  }

  async loadCatalog(): Promise<void> {
    this._isLoaded = true;
    try {
      this.isLoading.set(true);
      const provider = this._assetProvider ?? new BrowserAssetProvider();
      const catalog = await provider.loadJson<LessonCatalog>('content/lessons/index.json');
      this.lessons.set(catalog.lessons ?? []);
      this.error.set(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error.set(msg);
    } finally {
      this.isLoading.set(false);
    }
  }
}
