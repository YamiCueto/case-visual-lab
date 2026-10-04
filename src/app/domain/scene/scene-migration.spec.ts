import { describe, expect, it } from 'vitest';
import { CURRENT_SCENE_SCHEMA_VERSION } from './scene-document';
import { migrateScene, SceneMigrationError } from './scene-migration';

describe('migrateScene', () => {
  it('upgrades a legacy document through registered steps', () => {
    const result = migrateScene({ elements: [] }, [
      { from: 0, migrate: (raw) => ({ ...raw, title: 'Untitled' }) },
    ]);

    expect(result.schemaVersion).toBe(CURRENT_SCENE_SCHEMA_VERSION);
    expect(result.title).toBe('Untitled');
  });

  it('rejects documents from a newer schema', () => {
    expect(() => migrateScene({ schemaVersion: 999 }, [])).toThrow(SceneMigrationError);
  });

  it('fails loudly when a step is missing', () => {
    expect(() => migrateScene({ schemaVersion: 0 }, [])).toThrow(SceneMigrationError);
  });
});
