import { AnimationTimeline } from '../animation/animation.interface';
import { CanvasSceneData } from '../canvas/canvas-engine.interface';

export type LessonLevel = 'Fundamentos' | 'Intermedio' | 'Avanzado';

export interface LessonMetadata {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly summary: string;
  readonly level: LessonLevel;
  readonly estimatedMinutes: number;
  readonly author?: string;
  readonly tags?: readonly string[];
  readonly icon?: string;
}

export interface LessonCodeSnippet {
  readonly language: string;
  readonly filename: string;
  readonly code: string;
  readonly explanation?: string;
}

export interface LessonQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

export interface LessonCheckpoint {
  readonly id: string;
  readonly criteria: string;
  readonly hint?: string;
  readonly completed?: boolean;
}

export interface LessonAsset {
  readonly name: string;
  readonly url: string;
  readonly type: 'documentation' | 'spec' | 'diagram' | 'repository';
}

export interface LessonStep {
  readonly step: number;
  readonly title: string;
  readonly explanation: string;
  readonly keyConcept: string;
  readonly sceneData: CanvasSceneData;
  readonly timeline?: AnimationTimeline;
  readonly checkpoint?: LessonCheckpoint;
  readonly codeSnippet?: LessonCodeSnippet;
  readonly question?: LessonQuestion;
}

export interface LessonManifest {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly summary: string;
  readonly level: LessonLevel;
  readonly estimatedMinutes: number;
  readonly metadata?: LessonMetadata;
  readonly objectives?: readonly string[];
  readonly steps: readonly LessonStep[];
  readonly scenes?: Record<string, CanvasSceneData>;
  readonly animations?: Record<string, AnimationTimeline>;
  readonly checkpoints?: readonly LessonCheckpoint[];
  readonly playgrounds?: readonly string[];
  readonly narration?: readonly string[];
  readonly questions?: readonly LessonQuestion[];
  readonly assets?: readonly LessonAsset[];
}
