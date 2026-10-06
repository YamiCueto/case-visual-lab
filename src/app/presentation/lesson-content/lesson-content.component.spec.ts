import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { vi } from 'vitest';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';
import { ExperienceManifest } from '../../engine/assets/contracts/experience-manifest.types';
import { CanvasRendererFactory } from '../../infrastructure/canvas/canvas-renderer.factory';
import { CanvasRendererPort } from '../../domain/canvas/canvas-renderer.port';
import { LessonContentComponent } from './lesson-content.component';

class MockOrchestratorFacade {
  readonly currentTime: WritableSignal<number> = signal(0);
  readonly experienceManifest: WritableSignal<ExperienceManifest | null> = signal(null);

  readonly seek = vi.fn().mockImplementation(async (targetTimeMs: number) => {
    this.currentTime.set(targetTimeMs);
    return Promise.resolve();
  });
}

class MockCanvasRendererPort implements CanvasRendererPort {
  readonly engineType = 'excalidraw' as const;
  mountedContainer: HTMLElement | null = null;
  lastUpdatedScene: unknown = null;
  updateSceneCalls: unknown[] = [];
  zoomToFitCalls = 0;
  unmountCalls = 0;

  async mount(container: HTMLElement, initialData: unknown): Promise<void> {
    this.mountedContainer = container;
    this.lastUpdatedScene = initialData;
    return Promise.resolve();
  }

  unmount(): void {
    this.unmountCalls += 1;
    this.mountedContainer = null;
  }

  updateScene(data: unknown): void {
    this.lastUpdatedScene = data;
    this.updateSceneCalls.push(data);
  }

  setTheme(): void {
    void 0;
  }
  async exportAs(): Promise<never> {
    throw new Error('Not implemented');
  }
  async importScene(): Promise<never> {
    throw new Error('Not implemented');
  }
  clear(): void {
    void 0;
  }
  zoomToFit(): void {
    this.zoomToFitCalls += 1;
  }
}

const createTestLessonManifest = (): ExperienceManifest => ({
  schemaVersion: '2.0.0',
  manifestVersion: '1.0.0',
  metadata: {
    id: 'test-lesson',
    title: 'Clean Architecture Lesson',
  },
  profile: {
    type: 'lesson',
  },
  narrative: {
    scripts: [
      {
        id: 's1',
        stepNumber: 1,
        title: 'Step 1: Domain Entities',
        content: 'Enterprise business rules pure entities.',
      },
      {
        id: 's2',
        stepNumber: 2,
        title: 'Step 2: Use Cases',
        content: 'Application layer orchestrating entities.',
      },
    ],
  },
  assets: {
    scenes: {
      scene_step_1: { elements: [{ id: 'elem_1' }] },
      scene_step_2: { elements: [{ id: 'elem_2' }] },
    },
    snippets: {
      snippet_step_1: {
        language: 'typescript',
        filename: 'order.entity.ts',
        code: 'export class Order {}',
        explanation: 'Pure entity without imports.',
      },
      snippet_step_2: {
        language: 'typescript',
        filename: 'create-order.use-case.ts',
        code: 'export class CreateOrderUseCase {}',
        explanation: 'Application use case.',
      },
    },
  },
  evaluation: {
    checkpoints: [
      {
        id: 'cp_1',
        stepNumber: 1,
        criteria: 'Check no DB annotations in entities',
        hint: 'Use pure TS',
      },
      {
        id: 'cp_2',
        stepNumber: 2,
        criteria: 'Check ports are injected',
        hint: 'Invert dependency',
      },
    ],
    quizzes: [
      {
        id: 'q_1',
        stepNumber: 1,
        prompt: 'Can entity import Express?',
        options: ['Yes', 'No, never'],
        correctIndex: 1,
        explanation: 'Domain is framework agnostic.',
      },
    ],
  },
  timeline: {
    durationMs: 8000,
    markers: [
      { id: 'marker_step_1', label: 'Step 1', timeMs: 0 },
      { id: 'marker_step_2', label: 'Step 2', timeMs: 4000 },
    ],
  },
});

describe('LessonContentComponent', () => {
  let fixture: ComponentFixture<LessonContentComponent>;
  let component: LessonContentComponent;
  let mockFacade: MockOrchestratorFacade;
  let mockPort: MockCanvasRendererPort;
  let mockRendererFactory: { createRenderer: () => CanvasRendererPort };

  beforeEach(async () => {
    mockFacade = new MockOrchestratorFacade();
    mockPort = new MockCanvasRendererPort();
    mockRendererFactory = {
      createRenderer: () => mockPort,
    };

    mockFacade.experienceManifest.set(createTestLessonManifest());

    await TestBed.configureTestingModule({
      imports: [LessonContentComponent],
      providers: [
        { provide: OrchestratorFacadeService, useValue: mockFacade },
        { provide: CanvasRendererFactory, useValue: mockRendererFactory },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LessonContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('creates the component successfully and initializes renderer', () => {
    expect(component).toBeDefined();
    expect(mockPort.mountedContainer).not.toBeNull();
    expect(mockPort.zoomToFitCalls).toBeGreaterThanOrEqual(1);
  });

  it('derives activeStep from currentTime deterministically (F)', () => {
    // At t=0 -> Step 1
    mockFacade.currentTime.set(0);
    expect(component.activeStep()).toBe(1);

    // At t=2000 -> Step 1
    mockFacade.currentTime.set(2000);
    expect(component.activeStep()).toBe(1);

    // At t=4000 -> Step 2
    mockFacade.currentTime.set(4000);
    expect(component.activeStep()).toBe(2);

    // At t=7000 -> Step 2
    mockFacade.currentTime.set(7000);
    expect(component.activeStep()).toBe(2);
  });

  it('renders active step title and narrative content', () => {
    mockFacade.currentTime.set(0);
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('#step-title');
    const narrativeEl = fixture.nativeElement.querySelector('#step-narrative');
    const counterEl = fixture.nativeElement.querySelector('#step-counter');

    expect(titleEl?.textContent?.trim()).toBe('Step 1: Domain Entities');
    expect(narrativeEl?.textContent?.trim()).toContain('Enterprise business rules');
    expect(counterEl?.textContent?.trim()).toBe('Paso 1 / 2');
  });

  it('navigates with Next and Previous seeking to the correct marker timestamp (G)', async () => {
    expect(component.activeStep()).toBe(1);

    // Next -> should seek to 4000ms
    await component.nextStep();
    expect(mockFacade.seek).toHaveBeenCalledWith(4000);
    expect(component.activeStep()).toBe(2);

    // Previous -> should seek to 0ms
    await component.previousStep();
    expect(mockFacade.seek).toHaveBeenCalledWith(0);
    expect(component.activeStep()).toBe(1);
  });

  it('disables previous button on step 1 and next button on last step', () => {
    mockFacade.currentTime.set(0);
    fixture.detectChanges();

    const prevBtn = fixture.nativeElement.querySelector('#btn-prev-step');
    const nextBtn = fixture.nativeElement.querySelector('#btn-next-step');
    expect(prevBtn?.disabled).toBe(true);
    expect(nextBtn?.disabled).toBe(false);

    mockFacade.currentTime.set(4000);
    fixture.detectChanges();
    expect(prevBtn?.disabled).toBe(false);
    expect(nextBtn?.disabled).toBe(true);
  });

  it('updates scene on step change and calls zoomToFit (H)', async () => {
    mockPort.zoomToFitCalls = 0;
    mockPort.updateSceneCalls = [];

    // Switch to step 2
    mockFacade.currentTime.set(4000);
    fixture.detectChanges();

    expect(component.activeScene()).toEqual({ elements: [{ id: 'elem_2' }] });
    expect(mockPort.updateSceneCalls.length).toBeGreaterThan(0);
    expect(mockPort.zoomToFitCalls).toBeGreaterThan(0);
  });

  it('displays active snippet for the current step (I)', () => {
    mockFacade.currentTime.set(0);
    fixture.detectChanges();

    const filenameEl = fixture.nativeElement.querySelector('#snippet-filename');
    const codeEl = fixture.nativeElement.querySelector('#snippet-code');
    const expEl = fixture.nativeElement.querySelector('#snippet-explanation');

    expect(filenameEl?.textContent?.trim()).toBe('order.entity.ts');
    expect(codeEl?.textContent?.trim()).toBe('export class Order {}');
    expect(expEl?.textContent?.trim()).toBe('Pure entity without imports.');
  });

  it('displays checkpoint with criteria and hint (J)', () => {
    mockFacade.currentTime.set(0);
    fixture.detectChanges();

    const criteriaEl = fixture.nativeElement.querySelector('#checkpoint-criteria');
    const hintEl = fixture.nativeElement.querySelector('#checkpoint-hint');

    expect(criteriaEl?.textContent?.trim()).toContain('Check no DB annotations');
    expect(hintEl?.textContent?.trim()).toContain('Use pure TS');
  });

  it('handles quiz prompt, selection, correctness and explanation (J)', () => {
    mockFacade.currentTime.set(0);
    fixture.detectChanges();

    const promptEl = fixture.nativeElement.querySelector('#quiz-prompt');
    expect(promptEl?.textContent?.trim()).toBe('Can entity import Express?');

    const optionButtons = fixture.nativeElement.querySelectorAll('.quiz-option-btn');
    expect(optionButtons.length).toBe(2);

    // Select option 0 (Incorrect)
    component.selectQuizOption(0);
    fixture.detectChanges();

    expect(component.isQuizCorrect()).toBe(false);
    const incorrectBanner = fixture.nativeElement.querySelector('#quiz-result-incorrect');
    expect(incorrectBanner).not.toBeNull();

    // Select option 1 (Correct)
    component.selectQuizOption(1);
    fixture.detectChanges();

    expect(component.isQuizCorrect()).toBe(true);
    const correctBanner = fixture.nativeElement.querySelector('#quiz-result-correct');
    expect(correctBanner).not.toBeNull();
    const explanationEl = fixture.nativeElement.querySelector('#quiz-explanation');
    expect(explanationEl?.textContent?.trim()).toBe('Domain is framework agnostic.');
  });

  it('unmounts the canvas renderer when component is destroyed', () => {
    expect(mockPort.unmountCalls).toBe(0);
    component.ngOnDestroy();
    expect(mockPort.unmountCalls).toBe(1);
  });
});
