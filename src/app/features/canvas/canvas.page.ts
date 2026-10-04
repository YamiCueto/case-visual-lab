import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { SlicePipe, UpperCasePipe } from '@angular/common';
import {
  FlowAnimationService,
  HTTP_FLOW_STAGES,
} from '../../application/animation/flow-animation.service';
import { TimelinePlayerService } from '../../application/animation/timeline-player.service';
import { LessonRuntimeService } from '../../application/lesson/lesson-runtime.service';
import { PLAYGROUND_PRESETS } from '../../application/playground/playground-catalog';
import { PlaygroundService } from '../../application/playground/playground.service';
import { SceneManagerService } from '../../application/scene/scene-manager.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AnimationRendererPort } from '../../domain/animation/animation-engine.port';
import { AnimationNodeCoordinate } from '../../domain/animation/animation.interface';
import { ExportFormat } from '../../domain/canvas/canvas-engine.interface';
import { CanvasRendererPort } from '../../domain/canvas/canvas-renderer.port';
import { PlaygroundPreset } from '../../domain/playground/playground.interface';
import { AnimationRendererFactory } from '../../infrastructure/animation/animation-renderer.factory';
import { CanvasRendererFactory } from '../../infrastructure/canvas/canvas-renderer.factory';
import { IconComponent } from '../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-canvas-page',
  imports: [IconComponent, SlicePipe, UpperCasePipe],
  templateUrl: './canvas.page.html',
  styleUrl: './canvas.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasPage implements AfterViewInit {
  protected readonly sceneManager = inject(SceneManagerService);
  protected readonly lessonRuntime = inject(LessonRuntimeService);
  protected readonly flowAnimation = inject(FlowAnimationService);
  protected readonly timelinePlayer = inject(TimelinePlayerService);
  protected readonly playgroundService = inject(PlaygroundService);
  protected readonly themeService = inject(ThemeService);
  protected readonly i18n = inject(I18nService);

  private readonly rendererFactory = inject(CanvasRendererFactory);
  private readonly animationFactory = inject(AnimationRendererFactory);
  private readonly destroyRef = inject(DestroyRef);

  private readonly canvasContainer = viewChild<ElementRef<HTMLDivElement>>('canvasContainer');
  private readonly animationOverlay = viewChild<ElementRef<HTMLDivElement>>('animationOverlay');

  private renderer: CanvasRendererPort | null = null;
  private animationRenderer: AnimationRendererPort | null = null;

  protected readonly isExportMenuOpen = signal(false);
  protected readonly isScenesListOpen = signal(false);
  protected readonly isPlaygroundMenuOpen = signal(false);
  protected readonly isCodeDrawerOpen = signal(false);
  protected readonly flowStages = HTTP_FLOW_STAGES;
  protected readonly playgrounds = PLAYGROUND_PRESETS;

  ngAfterViewInit(): void {
    const container = this.canvasContainer()?.nativeElement;
    if (!container) return;

    this.initCanvas(container);
  }

  private async initCanvas(container: HTMLElement): Promise<void> {
    this.renderer = this.rendererFactory.createRenderer('excalidraw');
    const scene = this.sceneManager.activeScene();

    await this.renderer.mount(
      container,
      {
        elements: scene.elements,
        appState: scene.appState,
        files: scene.files,
      },
      this.themeService.isDark(),
      (updatedData) => {
        this.sceneManager.onCanvasChange(updatedData);
      },
    );

    // Mount Three.js animation overlay dynamically
    const animContainer = this.animationOverlay()?.nativeElement;
    if (animContainer) {
      this.animationRenderer = this.animationFactory.createRenderer('threejs');
      await this.animationRenderer.mount(animContainer, { isDark: this.themeService.isDark() });

      // Connect Timeline execution to 3D particle rendering with projected coordinates
      const unsubscribe = this.timelinePlayer.onFrameChange((frame, nodePositions, speed) => {
        const projected: Record<string, AnimationNodeCoordinate> = {};
        for (const [id, coord] of Object.entries(nodePositions)) {
          projected[id] = this.renderer?.projectSceneToScreen
            ? this.renderer.projectSceneToScreen(coord)
            : coord;
        }
        this.animationRenderer?.renderFrame(frame, projected, speed);
      });

      this.destroyRef.onDestroy(() => {
        unsubscribe();
      });
    }

    // Default timeline for starter playground
    this.timelinePlayer.loadTimeline(PLAYGROUND_PRESETS[0].timeline);

    this.destroyRef.onDestroy(() => {
      this.animationRenderer?.unmount();
      this.animationRenderer = null;
      this.renderer?.unmount();
      this.renderer = null;
    });
  }

  protected onTitleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.sceneManager.updateTitle(target.value);
  }

  protected onNewScene(): void {
    const newScene = this.sceneManager.createNewScene('Nuevo Diagrama');
    this.renderer?.updateScene({
      elements: newScene.elements,
      appState: newScene.appState,
      files: newScene.files,
    });
    this.renderer?.clear();
    this.animationRenderer?.clear();
    this.timelinePlayer.reset();
  }

  protected onTogglePlaygroundMenu(): void {
    this.isPlaygroundMenuOpen.set(!this.isPlaygroundMenuOpen());
  }

  protected onSelectPlayground(preset: PlaygroundPreset): void {
    this.isPlaygroundMenuOpen.set(false);
    this.playgroundService.selectPlayground(preset.id);

    // Update canvas elements and app state
    this.sceneManager.replaceActiveSceneContent(
      preset.sceneData.elements,
      preset.sceneData.appState,
      preset.sceneData.files,
    );

    this.renderer?.updateScene(preset.sceneData);
    // Load timeline into Three.js temporal execution engine
    this.timelinePlayer.loadTimeline(preset.timeline);
    this.timelinePlayer.play();

    setTimeout(() => {
      this.renderer?.zoomToFit();
      // Re-project active frame coordinates after canvas zoom-to-fit completes
      setTimeout(() => {
        const current = this.timelinePlayer.currentFrame();
        const timeline = this.timelinePlayer.timeline();
        if (current && timeline) {
          const projected: Record<string, AnimationNodeCoordinate> = {};
          for (const [id, coord] of Object.entries(timeline.nodePositions)) {
            projected[id] = this.renderer?.projectSceneToScreen
              ? this.renderer.projectSceneToScreen(coord)
              : coord;
          }
          this.animationRenderer?.renderFrame(current, projected, this.timelinePlayer.speed());
        }
      }, 70);
    }, 80);
  }

  protected async onStartCleanArchLesson(): Promise<void> {
    try {
      const lesson = await this.lessonRuntime.loadLessonFromUrl(
        'content/lessons/01-clean-architecture.json',
      );
      const firstStep = lesson.steps[0];
      if (firstStep) {
        this.renderer?.updateScene(firstStep.sceneData);
        setTimeout(() => this.renderer?.zoomToFit(), 80);
      }
    } catch (err) {
      console.error('Error starting lesson:', err);
    }
  }

  protected onNextLessonStep(): void {
    const step = this.lessonRuntime.nextStep();
    if (step) {
      this.renderer?.updateScene(step.sceneData);
      setTimeout(() => this.renderer?.zoomToFit(), 80);
    }
  }

  protected onPreviousLessonStep(): void {
    const step = this.lessonRuntime.previousStep();
    if (step) {
      this.renderer?.updateScene(step.sceneData);
      setTimeout(() => this.renderer?.zoomToFit(), 80);
    }
  }

  protected onCloseLesson(): void {
    this.lessonRuntime.closeLesson();
  }

  protected onToggleCheckpoint(id: string): void {
    this.lessonRuntime.toggleCheckpoint(id);
  }

  protected onAnswerQuiz(optionIndex: number): void {
    this.lessonRuntime.submitQuizAnswer(optionIndex);
  }

  protected onToggleCodeDrawer(): void {
    this.isCodeDrawerOpen.set(!this.isCodeDrawerOpen());
  }

  protected onToggleTimelinePlay(): void {
    this.timelinePlayer.togglePlay();
  }

  protected onTimelineStepNext(): void {
    this.timelinePlayer.stepNext();
  }

  protected onTimelineStepPrev(): void {
    this.timelinePlayer.stepPrevious();
  }

  protected onTimelineSeek(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.timelinePlayer.seek(Number(target.value));
  }

  protected onTimelineSpeed(speed: number): void {
    this.timelinePlayer.setSpeed(speed);
  }

  protected onTimelineReset(): void {
    this.timelinePlayer.reset();
    this.animationRenderer?.clear();
  }

  protected onZoomFit(): void {
    this.renderer?.zoomToFit();
  }

  protected onToggleExportMenu(): void {
    this.isExportMenuOpen.set(!this.isExportMenuOpen());
  }

  protected async onExport(format: ExportFormat): Promise<void> {
    if (!this.renderer) return;
    this.isExportMenuOpen.set(false);

    try {
      const sceneTitle = this.sceneManager.activeScene().title;
      const result = await this.renderer.exportAs(format, sceneTitle);

      const blob = result.blob ?? new Blob([result.text ?? ''], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting scene:', err);
    }
  }

  protected onToggleScenesList(): void {
    this.isScenesListOpen.set(!this.isScenesListOpen());
  }

  protected onOpenScene(id: string): void {
    if (this.sceneManager.openScene(id)) {
      const scene = this.sceneManager.activeScene();
      this.renderer?.updateScene({
        elements: scene.elements,
        appState: scene.appState,
        files: scene.files,
      });
      this.isScenesListOpen.set(false);
      setTimeout(() => this.renderer?.zoomToFit(), 60);
    }
  }

  protected onDuplicateScene(): void {
    const copy = this.sceneManager.duplicateActiveScene();
    this.renderer?.updateScene({
      elements: copy.elements,
      appState: copy.appState,
      files: copy.files,
    });
    this.isScenesListOpen.set(false);
  }

  protected onDeleteScene(): void {
    this.sceneManager.deleteActiveScene();
    const scene = this.sceneManager.activeScene();
    this.renderer?.updateScene({
      elements: scene.elements,
      appState: scene.appState,
      files: scene.files,
    });
    this.isScenesListOpen.set(false);
  }

  protected onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      if (!content || !this.renderer) return;

      try {
        const imported = await this.renderer.importScene(content);
        this.sceneManager.replaceActiveSceneContent(
          imported.elements,
          imported.appState,
          imported.files,
        );
        this.renderer?.updateScene({
          elements: imported.elements,
          appState: imported.appState,
          files: imported.files,
        });
        setTimeout(() => this.renderer?.zoomToFit(), 60);
      } catch (err) {
        console.error('Error importing file:', err);
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
}
