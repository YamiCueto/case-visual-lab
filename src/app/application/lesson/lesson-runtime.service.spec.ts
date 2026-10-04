import { TestBed } from '@angular/core/testing';
import { LessonManifest } from '../../domain/lesson/lesson.interface';
import { LessonRuntimeService } from './lesson-runtime.service';

const MOCK_LESSON: LessonManifest = {
  id: 'lesson_test',
  title: 'Hexagonal Architecture Test',
  category: 'Software Architecture',
  summary: 'Testing lesson runtime capabilities',
  level: 'Fundamentos',
  estimatedMinutes: 5,
  steps: [
    {
      step: 1,
      title: 'Step 1: Domain',
      explanation: 'Domain entities',
      keyConcept: 'Entities are pure',
      sceneData: { elements: [], appState: {}, files: {} },
      checkpoint: { id: 'cp_test_1', criteria: 'Domain pure' },
      question: {
        id: 'q_test_1',
        prompt: 'Can domain import DB?',
        options: ['Yes', 'No'],
        correctIndex: 1,
        explanation: 'No, domain is pure.',
      },
    },
    {
      step: 2,
      title: 'Step 2: Ports',
      explanation: 'Ports and adapters',
      keyConcept: 'DIP inversion',
      sceneData: { elements: [], appState: {}, files: {} },
    },
  ],
};

describe('LessonRuntimeService', () => {
  let runtime: LessonRuntimeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    runtime = TestBed.inject(LessonRuntimeService);
  });

  afterEach(() => {
    runtime.closeLesson();
  });

  it('starts lesson and initializes to step 1', () => {
    runtime.startLesson(MOCK_LESSON);

    expect(runtime.isLessonActive()).toBe(true);
    expect(runtime.activeLesson()?.id).toBe('lesson_test');
    expect(runtime.currentStepIndex()).toBe(0);
    expect(runtime.currentStep()?.title).toBe('Step 1: Domain');
    expect(runtime.totalSteps()).toBe(2);
    expect(runtime.hasNextStep()).toBe(true);
    expect(runtime.hasPreviousStep()).toBe(false);
  });

  it('navigates next and previous steps', () => {
    runtime.startLesson(MOCK_LESSON);

    runtime.nextStep();
    expect(runtime.currentStepIndex()).toBe(1);
    expect(runtime.hasNextStep()).toBe(false);
    expect(runtime.hasPreviousStep()).toBe(true);

    runtime.previousStep();
    expect(runtime.currentStepIndex()).toBe(0);
  });

  it('tracks checkpoints completion', () => {
    runtime.startLesson(MOCK_LESSON);

    expect(runtime.completedCheckpoints().has('cp_test_1')).toBe(false);

    runtime.toggleCheckpoint('cp_test_1');
    expect(runtime.completedCheckpoints().has('cp_test_1')).toBe(true);

    runtime.toggleCheckpoint('cp_test_1');
    expect(runtime.completedCheckpoints().has('cp_test_1')).toBe(false);
  });

  it('evaluates interactive quiz answers', () => {
    runtime.startLesson(MOCK_LESSON);

    // Incorrect answer
    const wrong = runtime.submitQuizAnswer(0);
    expect(wrong).toBe(false);
    expect(runtime.quizFeedback()?.isCorrect).toBe(false);

    // Correct answer
    const correct = runtime.submitQuizAnswer(1);
    expect(correct).toBe(true);
    expect(runtime.quizFeedback()?.isCorrect).toBe(true);
  });

  it('closes lesson and resets state', () => {
    runtime.startLesson(MOCK_LESSON);
    expect(runtime.isLessonActive()).toBe(true);

    runtime.closeLesson();
    expect(runtime.isLessonActive()).toBe(false);
    expect(runtime.activeLesson()).toBeNull();
  });
});
