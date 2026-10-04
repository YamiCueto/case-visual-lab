import { inject, Injectable } from '@angular/core';
import { SceneDocument } from '../../domain/scene/scene-document';
import { migrateScene, SceneMigration } from '../../domain/scene/scene-migration';
import { StorageService } from '../../infrastructure/storage/storage.service';

const KEY_PREFIX = 'scene:';

/** Register schema upgrades here, ordered by `from`. Empty while schema is v1. */
const SCENE_MIGRATIONS: readonly SceneMigration[] = [];

/** Loads and saves versioned scenes; every read is migrated to the current schema. */
@Injectable({ providedIn: 'root' })
export class SceneRepository {
  private readonly storage = inject(StorageService);

  load(id: string): SceneDocument | null {
    const raw = this.storage.get<Record<string, unknown>>(KEY_PREFIX + id);
    return raw ? migrateScene(raw, SCENE_MIGRATIONS) : null;
  }

  save(scene: SceneDocument): boolean {
    return this.storage.set(KEY_PREFIX + scene.id, scene);
  }

  remove(id: string): void {
    this.storage.remove(KEY_PREFIX + id);
  }
}
