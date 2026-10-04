import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent, IconName } from '../icon/icon.component';

@Component({
  selector: 'app-empty-state',
  imports: [IconComponent],
  template: `
    <div class="empty" data-animate="fade-up">
      <span class="badge"><app-icon [name]="icon()" [size]="22" /></span>
      <p>{{ message() }}</p>
    </div>
  `,
  styles: `
    .empty {
      display: grid;
      place-items: center;
      gap: var(--space-4);
      padding: var(--space-16) var(--space-6);
      border: 1px dashed var(--color-border-strong);
      border-radius: var(--radius-lg);
      color: var(--color-text-muted);
      text-align: center;
    }
    .badge {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      color: var(--color-accent);
      background: var(--color-accent-soft);
      box-shadow: 0 0 24px var(--color-accent-glow);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input.required<IconName>();
  readonly message = input.required<string>();
}
