import { ExperienceManifest } from './experience-manifest.types';

/**
 * Output descriptor produced by AssetLoader.
 * Encapsulates the validated, migrated ExperienceManifest and its loaded assets,
 * fully prepared for execution by ExperienceOrchestrator.
 */
export interface ExperienceDescriptor {
  readonly manifest: ExperienceManifest;
  readonly rawSourceUri: string;
  readonly schemaVersion: string;
  readonly migrated: boolean;
  readonly originalFormat: 'experience' | 'legacy-lesson';
  readonly loadedAt: number;
  readonly assets: ReadonlyMap<string, unknown>;
}
