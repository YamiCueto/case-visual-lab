import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

interface Belief {
  readonly title: string;
  readonly description: string;
}

@Component({
  selector: 'app-philosophy-page',
  imports: [PageHeaderComponent, IconComponent],
  templateUrl: './philosophy.page.html',
  styleUrl: './philosophy.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhilosophyPage {
  protected readonly i18n = inject(I18nService);

  protected readonly beliefs: readonly Belief[] = [
    {
      title: 'The best engineers think visually.',
      description:
        'Los mejores ingenieros no solo leen código: razonan en términos de flujos, límites y relaciones espaciales.',
    },
    {
      title: 'Learning should be interactive.',
      description:
        'La comprensión pasiva se desvanece rápido. El aprendizaje que permanece es aquel donde interactúas, mueves piezas y ves la causa-efecto.',
    },
    {
      title: 'Diagrams are executable knowledge.',
      description:
        'Un diagrama no es solo una imagen estática en una wiki: es una representación viva de la arquitectura y la lógica de un sistema.',
    },
    {
      title: 'AI should accelerate understanding, not replace it.',
      description:
        'La IA debe ser un amplificador cognitivo que ayude a explorar y razonar sobre sistemas, manteniendo al ingeniero en control.',
    },
    {
      title: 'Every concept deserves a playground.',
      description:
        'Desde RAG y Clean Architecture hasta DDD y Migration Contracts: cada concepto técnico merece un lienzo donde experimentar sin miedo.',
    },
  ];
}
