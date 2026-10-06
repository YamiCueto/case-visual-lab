/**
 * Profile archetypes defining execution policies in the ExperienceOrchestrator.
 */
export type ExperienceProfileType =
  | 'lesson'
  | 'workshop'
  | 'presentation'
  | 'playground'
  | 'interactive-book'
  | 'simulation'
  | 'certification'
  | 'assessment'
  | 'live-demo';

/**
 * Metadata header for experiences (ADR-008).
 */
export interface ExperienceAuthor {
  readonly name: string;
  readonly email?: string;
  readonly url?: string;
}

export interface ExperienceMetadata {
  readonly id: string;
  readonly title: string;
  readonly slug?: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly author?: string | ExperienceAuthor;
  readonly organization?: string;
  readonly license?: string;
  readonly language?: string;
  readonly difficulty?: string;
  readonly estimatedMinutes?: number;
  readonly tags?: readonly string[];
  readonly category?: string;
  readonly categories?: readonly string[];
  readonly thumbnail?: string;
  readonly cover?: string;
  readonly icon?: string;
  readonly version?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface ExperienceProfile {
  readonly type: ExperienceProfileType;
  readonly policy?: Readonly<Record<string, unknown>>;
}

export interface ExperienceSimulationConfig {
  readonly provider: string;
  readonly scenario?: string;
  readonly initialVariables?: Readonly<Record<string, unknown>>;
  readonly inputs?: readonly unknown[];
}

export interface ExperienceTimelineConfig {
  readonly durationMs?: number;
  readonly loop?: boolean;
  readonly tracks?: readonly unknown[];
  readonly markers?: readonly unknown[];
}

export interface NarrativeScript {
  readonly id: string;
  readonly stepNumber?: number;
  readonly title?: string;
  readonly content: string;
}

export interface ExperienceNarrativeConfig {
  readonly scripts?: readonly NarrativeScript[];
}

export interface EvaluationCheckpoint {
  readonly id: string;
  readonly stepNumber?: number;
  readonly criteria?: string;
  readonly hint?: string;
}

export interface EvaluationQuizQuestion {
  readonly id: string;
  readonly stepNumber?: number;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation?: string;
}

export interface ExperienceEvaluationConfig {
  readonly checkpoints?: readonly EvaluationCheckpoint[];
  readonly quizzes?: readonly EvaluationQuizQuestion[];
}

export interface ExperienceAssetsConfig {
  readonly scenes?: Readonly<Record<string, unknown>>;
  readonly audio?: Readonly<Record<string, string>>;
  readonly snippets?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

/**
 * Universal Experience Manifest contract (ADR-008).
 * Represents any interactive visual experience (Lesson, Workshop, Simulation, etc.).
 */
export interface ExperienceManifest {
  readonly $schema?: string;
  readonly schemaVersion: string;
  readonly manifestVersion: string;
  readonly contentVersion?: string;
  readonly metadata: ExperienceMetadata;
  readonly profile: ExperienceProfile;
  readonly assets?: ExperienceAssetsConfig;
  readonly simulation?: ExperienceSimulationConfig;
  readonly timeline?: ExperienceTimelineConfig;
  readonly narrative?: ExperienceNarrativeConfig;
  readonly evaluation?: ExperienceEvaluationConfig;
  readonly variables?: Readonly<Record<string, unknown>>;
  readonly settings?: Readonly<Record<string, unknown>>;
  readonly plugins?: {
    readonly required?: readonly string[];
    readonly options?: Readonly<Record<string, unknown>>;
  };
  readonly extensions?: Readonly<Record<string, unknown>>;
}
