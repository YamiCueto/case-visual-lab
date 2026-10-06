import { ExperienceManifest } from '../../assets/contracts/experience-manifest.types';

/**
 * Immutable context encapsulating the loaded ExperienceManifest and source descriptors.
 * Provided to the Orchestrator and downstream execution sessions.
 */
export interface ExperienceContext {
  readonly manifest: ExperienceManifest;
  readonly sessionKey: string;
  readonly originalFormat: 'experience' | 'legacy-lesson';
  readonly schemaVersion: string;
  readonly loadedAt: number;
}
