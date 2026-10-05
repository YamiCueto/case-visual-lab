/**
 * Legacy Lesson contracts (ADR-004).
 * Used by LegacyLessonAdapter to convert legacy lesson structures into ADR-008 ExperienceManifest.
 */

export interface LegacyCheckpoint {
  readonly id: string;
  readonly criteria: string;
  readonly hint?: string;
}

export interface LegacyCodeSnippet {
  readonly language: string;
  readonly filename: string;
  readonly code: string;
  readonly explanation?: string;
}

export interface LegacyQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation?: string;
}

export interface LegacySceneData {
  readonly elements?: readonly unknown[];
  readonly appState?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

export interface LegacyLessonStep {
  readonly step: number;
  readonly title: string;
  readonly explanation: string;
  readonly keyConcept?: string;
  readonly checkpoint?: LegacyCheckpoint;
  readonly codeSnippet?: LegacyCodeSnippet;
  readonly question?: LegacyQuestion;
  readonly sceneData?: LegacySceneData;
}

export interface LegacyLessonMetadata {
  readonly id?: string;
  readonly slug?: string;
  readonly title?: string;
  readonly category?: string;
  readonly summary?: string;
  readonly level?: string;
  readonly estimatedMinutes?: number;
  readonly author?: string;
  readonly tags?: readonly string[];
  readonly icon?: string;
  readonly [key: string]: unknown;
}

export interface LegacyLessonManifest {
  readonly id: string;
  readonly title: string;
  readonly category?: string;
  readonly summary?: string;
  readonly level?: string;
  readonly estimatedMinutes?: number;
  readonly schemaVersion?: string;
  readonly metadata?: LegacyLessonMetadata;
  readonly objectives?: readonly string[];
  readonly steps?: readonly LegacyLessonStep[];
  readonly [key: string]: unknown;
}
