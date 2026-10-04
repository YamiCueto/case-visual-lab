import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { PRIMARY_NAV } from '../../presentation/layout/navigation';
import { IconComponent } from '../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, IconComponent],
  template: `
    <header class="hero" data-animate="fade-up">
      <div class="hero-badge">
        <span class="badge-dot" aria-hidden="true"></span>
        <span>CASE OS · Visual Learning Engine</span>
      </div>

      <h1 class="hero-title">{{ i18n.t('dashboard.title') }}</h1>
      <p class="hero-subtitle">{{ i18n.t('dashboard.subtitle') }}</p>
      <p class="hero-tagline">{{ i18n.t('dashboard.tagline') }}</p>

      <div class="manifesto-teaser card">
        <p class="teaser-text">“{{ i18n.t('dashboard.manifestoPreview') }}”</p>
        <a id="dashboard-manifesto-link" class="teaser-link" routerLink="/philosophy">
          {{ i18n.t('dashboard.manifestoCta') }}
        </a>
      </div>
    </header>

    <section class="grid" aria-label="Secciones">
      @for (item of sections; track item.path; let i = $index) {
        <a
          class="card section-card"
          [id]="'dashboard-' + item.path"
          [routerLink]="'/' + item.path"
          data-animate="fade-up"
          [style.animation-delay.ms]="i * 40"
        >
          <div class="card-icon">
            <app-icon [name]="item.icon" [size]="22" />
          </div>
          <div class="card-info">
            <h2>{{ i18n.t(item.label) }}</h2>
          </div>
        </a>
      }
    </section>
  `,
  styles: `
    .hero {
      display: grid;
      gap: var(--space-3);
      max-width: 800px;
      margin-bottom: var(--space-12);
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      width: fit-content;
      padding: var(--space-1) var(--space-3);
      border-radius: 999px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-accent);
      box-shadow: 0 0 8px var(--color-accent-glow);
    }

    .hero-title {
      font-size: clamp(2rem, 1.5rem + 2.5vw, 3rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.1;
      color: var(--color-text);
    }

    .hero-subtitle {
      font-size: clamp(1.1rem, 0.95rem + 0.8vw, 1.35rem);
      font-weight: 500;
      color: var(--color-accent);
      letter-spacing: -0.01em;
    }

    .hero-tagline {
      font-size: var(--text-md);
      color: var(--color-text-muted);
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .manifesto-teaser {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-4);
      padding: var(--space-4) var(--space-6);
      background: var(--color-surface);
      border-color: var(--color-border);

      &:hover {
        transform: none;
      }
    }

    .teaser-text {
      font-size: var(--text-sm);
      font-style: italic;
      color: var(--color-text-muted);
      max-width: 55ch;
    }

    .teaser-link {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--color-accent);
      white-space: nowrap;

      &:hover {
        text-decoration: underline;
      }
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
      gap: var(--space-4);
    }

    .section-card {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      color: var(--color-text);
      text-decoration: none;
    }

    .card-icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-accent-soft);
      color: var(--color-accent);
    }

    h2 {
      font-size: var(--text-md);
      font-weight: 600;
      letter-spacing: -0.01em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly i18n = inject(I18nService);
  protected readonly sections = PRIMARY_NAV.filter((item) => item.path !== 'dashboard');
}
