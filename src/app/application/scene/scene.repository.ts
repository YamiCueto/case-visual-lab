import { inject, Injectable } from '@angular/core';
import { SceneHeader } from '../../domain/canvas/canvas-engine.interface';
import { SceneDocument } from '../../domain/scene/scene-document';
import { migrateScene, SceneMigration } from '../../domain/scene/scene-migration';
import { duplicateScene } from '../../domain/scene/scene-operations';
import { StorageService } from '../../infrastructure/storage/storage.service';

interface InstrumentableElement {
  id?: string;
  type?: string;
  text?: string;
  width?: number;
  height?: number;
  strokeColor?: string;
  containerId?: string | null;
}

function instrumentRepoLog(step: string, elements?: readonly unknown[]) {
  if (!elements) return;
  const typedElements = elements as readonly InstrumentableElement[];
  const rectangles = typedElements.filter((e) => e?.type === 'rectangle').length;
  const texts = typedElements.filter((e) => e?.type === 'text').length;
  const arrows = typedElements.filter((e) => e?.type === 'arrow').length;
  const textDetails = typedElements
    .filter((e) => e?.type === 'text')
    .map((e) => ({
      id: e?.id,
      text: e?.text,
      width: e?.width,
      height: e?.height,
      strokeColor: e?.strokeColor,
      containerId: e?.containerId,
    }));
  console.log(`\n--- [INSTRUMENTATION REPO] ${step} ---`);
  console.log(
    `Total: ${typedElements.length} | Rects: ${rectangles} | Texts: ${texts} | Arrows: ${arrows}`,
  );
  console.log('Texts:', JSON.stringify(textDetails, null, 2));
  console.log('------------------------------------\n');
}

const KEY_PREFIX = 'scene:';
const INDEX_KEY = 'scene_index';
const ACTIVE_KEY = 'scene_active';

/** Register schema upgrades here, ordered by `from`. Empty while schema is v1. */
const SCENE_MIGRATIONS: readonly SceneMigration[] = [];

/** Loads, saves, indexes and versions scenes. */
@Injectable({ providedIn: 'root' })
export class SceneRepository {
  private readonly storage = inject(StorageService);

  list(): readonly SceneHeader[] {
    return this.storage.get<SceneHeader[]>(INDEX_KEY) ?? [];
  }

  load(id: string): SceneDocument | null {
    const raw = this.storage.get<Record<string, unknown>>(KEY_PREFIX + id);
    if (!raw) return null;
    instrumentRepoLog('load() - RAW JSON from Storage', raw['elements'] as readonly unknown[]);
    const scene = migrateScene(raw, SCENE_MIGRATIONS);
    instrumentRepoLog('load() - AFTER migrateScene', scene.elements);
    if (scene.appState && 'collaborators' in (scene.appState as Record<string, unknown>)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { collaborators, ...cleanState } = scene.appState as Record<string, unknown>;
      return { ...scene, appState: cleanState };
    }
    return scene;
  }

  save(scene: SceneDocument): boolean {
    instrumentRepoLog('save() - BEFORE Save to Storage', scene.elements);
    const success = this.storage.set(KEY_PREFIX + scene.id, scene);
    if (success) {
      this.updateIndex(scene);
    }
    return success;
  }

  remove(id: string): void {
    this.storage.remove(KEY_PREFIX + id);
    const current = this.list().filter((item) => item.id !== id);
    this.storage.set(INDEX_KEY, current);
    if (this.getActiveSceneId() === id) {
      this.storage.remove(ACTIVE_KEY);
    }
  }

  duplicate(id: string): SceneDocument | null {
    const original = this.load(id);
    if (!original) return null;
    const copy = duplicateScene(original);
    this.save(copy);
    return copy;
  }

  getActiveSceneId(): string | null {
    return this.storage.get<string>(ACTIVE_KEY);
  }

  setActiveSceneId(id: string): void {
    this.storage.set(ACTIVE_KEY, id);
  }

  private updateIndex(scene: SceneDocument): void {
    const headers = [...this.list()];
    const index = headers.findIndex((h) => h.id === scene.id);
    const header: SceneHeader = {
      id: scene.id,
      title: scene.title,
      updatedAt: scene.updatedAt,
      elementsCount: scene.elements.length,
    };

    if (index >= 0) {
      headers[index] = header;
    } else {
      headers.unshift(header);
    }
    this.storage.set(INDEX_KEY, headers);
  }
}
