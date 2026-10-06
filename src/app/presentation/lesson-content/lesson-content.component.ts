import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';
import {
  EvaluationCheckpoint,
  EvaluationQuizQuestion,
  ExperienceManifest,
  NarrativeScript,
} from '../../engine/assets/contracts/experience-manifest.types';
import { CanvasRendererFactory } from '../../infrastructure/canvas/canvas-renderer.factory';
import { CanvasRendererPort } from '../../domain/canvas/canvas-renderer.port';
import { CanvasSceneData } from '../../domain/canvas/canvas-engine.interface';

export interface StepMarkerInfo {
  readonly stepNumber: number;
  readonly timeMs: number;
  readonly markerId: string;
}

export interface StepSnippetData {
  readonly language?: string;
  readonly filename?: string;
  readonly code: string;
  readonly explanation?: string;
}

@Component({
  selector: 'app-lesson-content',
  templateUrl: './lesson-content.component.html',
  styleUrl: './lesson-content.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonContentComponent implements AfterViewInit, OnDestroy {
  readonly facade = inject(OrchestratorFacadeService);
  private readonly rendererFactory = inject(CanvasRendererFactory);

  readonly manifest = input<ExperienceManifest | null>(null);

  readonly canvasContainerRef = viewChild<ElementRef<HTMLElement>>('canvasContainer');

  private renderer: CanvasRendererPort | null = null;
  private isMounted = false;
  private lastRenderedStep = -1;

  readonly selectedQuizOption = signal<number | null>(null);

  readonly resolvedManifest = computed<ExperienceManifest | null>(() => {
    return this.manifest() ?? this.facade.experienceManifest();
  });

  readonly stepMarkers = computed<readonly StepMarkerInfo[]>(() => {
    const manifest = this.resolvedManifest();
    if (!manifest) return [];
    const scripts = manifest.narrative?.scripts ?? [];
    const markers = (manifest.timeline?.markers ?? []) as readonly Record<string, unknown>[];

    const stepNumbers = new Set<number>();
    for (const s of scripts) {
      if (s.stepNumber !== undefined) stepNumbers.add(s.stepNumber);
    }
    for (const m of markers) {
      const id = String(m['id'] ?? '');
      const match = id.match(/marker_step_(\d+)/);
      if (match) {
        stepNumbers.add(parseInt(match[1], 10));
      }
    }

    if (stepNumbers.size === 0) {
      return [{ stepNumber: 1, timeMs: 0, markerId: 'marker_step_1' }];
    }

    const sortedSteps = Array.from(stepNumbers).sort((a, b) => a - b);
    return sortedSteps.map((stepNum) => {
      const marker = markers.find((m) => {
        const id = String(m['id'] ?? '');
        return id === `marker_step_${stepNum}`;
      });
      const timeMs =
        typeof marker?.['time'] === 'number'
          ? (marker['time'] as number)
          : typeof marker?.['timeMs'] === 'number'
            ? (marker['timeMs'] as number)
            : (stepNum - 1) * 4000;
      return {
        stepNumber: stepNum,
        timeMs,
        markerId: String(marker?.['id'] ?? `marker_step_${stepNum}`),
      };
    });
  });

  readonly totalSteps = computed<number>(() => {
    const list = this.stepMarkers();
    return list.length > 0 ? list.length : 1;
  });

  readonly activeStep = computed<number>(() => {
    const markers = this.stepMarkers();
    if (markers.length === 0) return 1;
    const current = this.facade.currentTime();
    let active = markers[0].stepNumber;
    for (const m of markers) {
      if (m.timeMs <= current) {
        active = m.stepNumber;
      } else {
        break;
      }
    }
    return active;
  });

  readonly activeNarrative = computed<NarrativeScript | null>(() => {
    const manifest = this.resolvedManifest();
    if (!manifest?.narrative?.scripts) return null;
    const step = this.activeStep();
    return manifest.narrative.scripts.find((s) => s.stepNumber === step) ?? null;
  });

  readonly activeScene = computed<CanvasSceneData | null>(() => {
    const manifest = this.resolvedManifest();
    if (!manifest?.assets?.scenes) return null;
    const step = this.activeStep();
    const sceneKey = `scene_step_${step}`;
    const raw = manifest.assets.scenes[sceneKey];
    return (raw as CanvasSceneData) ?? null;
  });

  readonly activeSnippet = computed<StepSnippetData | null>(() => {
    const manifest = this.resolvedManifest();
    if (!manifest?.assets?.snippets) return null;
    const step = this.activeStep();
    const snippetKey = `snippet_step_${step}`;
    const raw = manifest.assets.snippets[snippetKey];
    return (raw as StepSnippetData) ?? null;
  });

  readonly activeCheckpoint = computed<EvaluationCheckpoint | null>(() => {
    const manifest = this.resolvedManifest();
    if (!manifest?.evaluation?.checkpoints) return null;
    const step = this.activeStep();
    return manifest.evaluation.checkpoints.find((cp) => cp.stepNumber === step) ?? null;
  });

  readonly activeQuiz = computed<EvaluationQuizQuestion | null>(() => {
    const manifest = this.resolvedManifest();
    if (!manifest?.evaluation?.quizzes) return null;
    const step = this.activeStep();
    return manifest.evaluation.quizzes.find((q) => q.stepNumber === step) ?? null;
  });

  readonly isQuizCorrect = computed<boolean | null>(() => {
    const quiz = this.activeQuiz();
    const selected = this.selectedQuizOption();
    if (!quiz || selected === null) return null;
    return selected === quiz.correctIndex;
  });

  constructor() {
    effect(() => {
      const step = this.activeStep();
      const scene = this.activeScene();

      // Reset selection when step changes
      if (step !== this.lastRenderedStep) {
        this.selectedQuizOption.set(null);
      }

      if (this.isMounted && this.renderer && step !== this.lastRenderedStep) {
        this.lastRenderedStep = step;
        if (scene) {
          this.renderer.updateScene({
            elements: scene.elements ?? [],
            appState: scene.appState ?? { viewBackgroundColor: '#0b0d10' },
            files: scene.files ?? {},
          });
          this.renderer.zoomToFit();
        } else {
          this.renderer.clear();
        }
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const container = this.canvasContainerRef()?.nativeElement;
    if (!container) return;

    try {
      this.renderer = this.rendererFactory.createRenderer('excalidraw');
      const step = this.activeStep();
      const initialScene = this.activeScene();

      await this.renderer.mount(
        container,
        {
          elements: initialScene?.elements ?? [],
          appState: initialScene?.appState ?? { viewBackgroundColor: '#0b0d10' },
          files: initialScene?.files ?? {},
        },
        true,
        () => void 0,
      );

      this.isMounted = true;
      this.lastRenderedStep = step;
      this.renderer.zoomToFit();
    } catch {
      // In SSR or non-canvas test environments
    }
  }

  ngOnDestroy(): void {
    if (this.renderer) {
      this.renderer.unmount();
      this.renderer = null;
      this.isMounted = false;
    }
  }

  selectQuizOption(index: number): void {
    this.selectedQuizOption.set(index);
  }

  async previousStep(): Promise<void> {
    const current = this.activeStep();
    if (current <= 1) return;
    const prev = current - 1;
    const marker = this.stepMarkers().find((m) => m.stepNumber === prev);
    if (marker) {
      await this.facade.seek(marker.timeMs);
    }
  }

  async nextStep(): Promise<void> {
    const current = this.activeStep();
    if (current >= this.totalSteps()) return;
    const next = current + 1;
    const marker = this.stepMarkers().find((m) => m.stepNumber === next);
    if (marker) {
      await this.facade.seek(marker.timeMs);
    }
  }
}
