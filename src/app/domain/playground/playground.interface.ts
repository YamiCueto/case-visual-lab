import { AnimationTimeline } from '../animation/animation.interface';
import { CanvasSceneData } from '../canvas/canvas-engine.interface';
import { LessonCodeSnippet } from '../lesson/lesson.interface';

export type PlaygroundCategory =
  'System Design' | 'AI & Agents' | 'Distributed Systems' | 'Software Architecture';

export interface PlaygroundPreset {
  readonly id: string;
  readonly title: string;
  readonly badge: string;
  readonly category: PlaygroundCategory;
  readonly summary: string;
  readonly sceneData: CanvasSceneData;
  readonly timeline: AnimationTimeline;
  readonly codeExample?: LessonCodeSnippet;
  readonly learningPoints: readonly string[];
}
