import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconName =
  | 'home'
  | 'book'
  | 'layers'
  | 'sparkles'
  | 'pen'
  | 'settings'
  | 'info'
  | 'menu'
  | 'compass'
  | 'plus'
  | 'check'
  | 'download'
  | 'upload'
  | 'play'
  | 'pause'
  | 'maximize'
  | 'x'
  | 'copy'
  | 'trash'
  | 'code'
  | 'arrow-left'
  | 'arrow-right'
  | 'check-circle'
  | 'help-circle';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  book: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5zm0 15A1.5 1.5 0 0 0 5.5 21H20',
  layers: 'm12 3 9 5-9 5-9-5zm-9 9 9 5 9-5M3 16l9 5 9-5',
  sparkles:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z',
  pen: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-10v6m0-9.5v.5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm4.2-13.2-2.7 6.9-6.9 2.7 2.7-6.9z',
  plus: 'M12 5v14M5 12h14',
  check: 'M20 6 9 17l-5-5',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  play: 'M5 3l14 9-14 9V3z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  maximize:
    'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
  x: 'M18 6 6 18M6 6l12 12',
  copy: 'M9 9h10v10H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3',
  'help-circle':
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-6h.01M12 8a2 2 0 0 1 2 2c0 1-1.5 1.5-1.5 2.5',
};

/** Inline stroke icons: no icon font or network request required. */
@Component({
  selector: 'app-icon',
  template: `<svg
    viewBox="0 0 24 24"
    [attr.width]="size()"
    [attr.height]="size()"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="path()" />
  </svg>`,
  styles: ':host { display: inline-flex; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(18);
  protected readonly path = computed(() => PATHS[this.name()]);
}
