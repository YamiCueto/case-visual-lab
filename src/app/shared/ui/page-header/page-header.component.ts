import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Consistent page heading. Content projection allows actions on the right. */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header" data-animate="fade-up">
      <div>
        <h1>{{ heading() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <ng-content />
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-8);
    }
    h1 {
      font-size: var(--text-xl);
      font-weight: 600;
    }
    p {
      margin-top: var(--space-2);
      max-width: 60ch;
      color: var(--color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>();
}
