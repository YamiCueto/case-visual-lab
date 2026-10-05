import { MigrationStep } from '../contracts/migration.types';

/**
 * Migration step from Schema v1.0.0 to Schema v2.0.0 (ADR-008).
 * Pure transformation: produces a new document without mutating the original.
 */
export const v1ToV2Migration: MigrationStep = {
  fromVersion: '1.0.0',
  toVersion: '2.0.0',
  description: 'Normalize root manifest to ADR-008 ExperienceManifest specification',
  migrate: (doc: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> => {
    const rawProfile = doc['profile'];
    let normalizedProfile: Record<string, unknown>;

    if (typeof rawProfile === 'string') {
      normalizedProfile = { type: rawProfile };
    } else if (rawProfile && typeof rawProfile === 'object' && !Array.isArray(rawProfile)) {
      normalizedProfile = { ...(rawProfile as Record<string, unknown>) };
    } else {
      normalizedProfile = { type: 'lesson' };
    }

    return {
      ...doc,
      $schema: 'https://case-visual-lab.io/schemas/v2/experience-manifest.json',
      schemaVersion: '2.0.0',
      manifestVersion: (doc['manifestVersion'] as string) ?? '1.0.0',
      profile: normalizedProfile,
    };
  },
};
