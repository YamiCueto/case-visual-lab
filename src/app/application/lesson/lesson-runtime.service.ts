import { computed, Injectable, signal } from '@angular/core';
import { AnimationTimeline } from '../../domain/animation/animation.interface';
import { LessonManifest, LessonStep } from '../../domain/lesson/lesson.interface';

@Injectable({ providedIn: 'root' })
export class LessonRuntimeService {
  private readonly activeLessonState = signal<LessonManifest | null>(null);
  private readonly currentStepIndexState = signal<number>(0);
  private readonly completedCheckpointsState = signal<Set<string>>(new Set());
  private readonly activeQuizAnswerState = signal<number | null>(null);
  private readonly quizFeedbackState = signal<{ isCorrect: boolean; explanation: string } | null>(
    null,
  );

  readonly activeLesson = this.activeLessonState.asReadonly();
  readonly currentStepIndex = this.currentStepIndexState.asReadonly();
  readonly completedCheckpoints = this.completedCheckpointsState.asReadonly();
  readonly activeQuizAnswer = this.activeQuizAnswerState.asReadonly();
  readonly quizFeedback = this.quizFeedbackState.asReadonly();

  readonly isLessonActive = computed(() => this.activeLessonState() !== null);

  readonly currentStep = computed<LessonStep | null>(() => {
    const lesson = this.activeLessonState();
    if (!lesson || lesson.steps.length === 0) return null;
    const idx = Math.min(this.currentStepIndexState(), lesson.steps.length - 1);
    return lesson.steps[idx];
  });

  readonly activeTimeline = computed<AnimationTimeline | null>(() => {
    const step = this.currentStep();
    return step?.timeline ?? null;
  });

  readonly totalSteps = computed<number>(() => {
    return this.activeLessonState()?.steps.length ?? 0;
  });

  readonly hasNextStep = computed(() => {
    return this.currentStepIndexState() < this.totalSteps() - 1;
  });

  readonly hasPreviousStep = computed(() => {
    return this.currentStepIndexState() > 0;
  });

  async loadLessonFromUrl(
    relativeUrl = 'content/lessons/01-clean-architecture.json',
  ): Promise<LessonManifest> {
    const base = document.baseURI.endsWith('/') ? document.baseURI : document.baseURI + '/';
    const fullUrl = new URL(relativeUrl, base).href;

    const res = await fetch(fullUrl);
    if (!res.ok) {
      throw new Error(`Error loading lesson from ${fullUrl} (${res.status})`);
    }

    const lesson: LessonManifest = await res.json();
    this.startLesson(lesson);
    return lesson;
  }

  startLesson(manifest: LessonManifest): void {
    this.activeLessonState.set(manifest);
    this.currentStepIndexState.set(0);
    this.completedCheckpointsState.set(new Set());
    this.resetQuiz();
  }

  goToStep(index: number): LessonStep | null {
    const lesson = this.activeLessonState();
    if (!lesson || index < 0 || index >= lesson.steps.length) return null;
    this.currentStepIndexState.set(index);
    this.resetQuiz();
    return lesson.steps[index];
  }

  nextStep(): LessonStep | null {
    if (this.hasNextStep()) {
      return this.goToStep(this.currentStepIndexState() + 1);
    }
    return null;
  }

  previousStep(): LessonStep | null {
    if (this.hasPreviousStep()) {
      return this.goToStep(this.currentStepIndexState() - 1);
    }
    return null;
  }

  toggleCheckpoint(id: string): void {
    this.completedCheckpointsState.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  submitQuizAnswer(selectedIndex: number): boolean {
    const step = this.currentStep();
    if (!step?.question) return false;

    this.activeQuizAnswerState.set(selectedIndex);
    const isCorrect = selectedIndex === step.question.correctIndex;
    this.quizFeedbackState.set({
      isCorrect,
      explanation: step.question.explanation,
    });
    return isCorrect;
  }

  private resetQuiz(): void {
    this.activeQuizAnswerState.set(null);
    this.quizFeedbackState.set(null);
  }

  closeLesson(): void {
    this.activeLessonState.set(null);
    this.currentStepIndexState.set(0);
    this.resetQuiz();
  }
}
