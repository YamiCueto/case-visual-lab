import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

/** App chrome: mobile topbar + drawer, persistent sidebar on wide screens. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarComponent, IconComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'drawerOpen.set(false)' },
})
export class ShellComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly drawerOpen = signal(false);
}
