import { CURRENT_SCENE_SCHEMA_VERSION, SceneDocument } from './scene-document';

/** Transforms a raw document from version `from` to `from + 1`. */
export interface SceneMigration {
  readonly from: number;
  readonly migrate: (raw: Record<string, unknown>) => Record<string, unknown>;
}

export class SceneMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SceneMigrationError';
  }
}

/**
 * Applies migrations sequentially until the document reaches the current schema.
 * Migrations are pure functions, so this stays testable without Angular.
 */
export function migrateScene(
  raw: Record<string, unknown>,
  migrations: readonly SceneMigration[],
): SceneDocument {
  let doc = raw;
  let version = typeof doc['schemaVersion'] === 'number' ? doc['schemaVersion'] : 0;

  if (version > CURRENT_SCENE_SCHEMA_VERSION) {
    throw new SceneMigrationError(`Scene schema v${version} is newer than supported.`);
  }

  while (version < CURRENT_SCENE_SCHEMA_VERSION) {
    const step = migrations.find((m) => m.from === version);
    if (!step) {
      throw new SceneMigrationError(`Missing migration from schema v${version}.`);
    }
    doc = { ...step.migrate(doc), schemaVersion: version + 1 };
    version += 1;
  }

  return doc as unknown as SceneDocument;
}
