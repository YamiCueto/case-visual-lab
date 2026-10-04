import { LessonCodeSnippet, LessonQuestion } from '../lesson/lesson.interface';

export interface PedagogicalGoal {
  readonly id: string;
  readonly description: string;
  readonly bloomTaxonomyLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate';
}

export interface InstructorNotes {
  readonly teachingTips: readonly string[];
  readonly commonMisconceptions: readonly string[];
  readonly suggestedQuestions: readonly string[];
}

export interface NarrativeScript {
  readonly text: string;
  readonly tone?: 'instructive' | 'analytical' | 'inspirational';
  readonly estimatedReadingSeconds?: number;
  readonly cuePoints?: readonly { atSeconds: number; label: string }[];
}

export interface NarrativeFrame {
  readonly title: string;
  readonly subtitle?: string;
  readonly description: string;
  readonly narrative: NarrativeScript;
  readonly explanation: string;
  readonly codeSnippet?: LessonCodeSnippet;
  readonly question?: LessonQuestion;
  readonly pedagogicalGoal?: PedagogicalGoal;
  readonly instructorNotes?: InstructorNotes;
}
