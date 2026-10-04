import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { CanvasSceneData, SceneHeader } from '../../domain/canvas/canvas-engine.interface';
import { SceneDocument } from '../../domain/scene/scene-document';
import {
  createEmptyScene,
  createStarterPlaygroundScene,
  duplicateScene,
  touchScene,
} from '../../domain/scene/scene-operations';
import { SceneRepository } from './scene.repository';

export type SaveStatus = 'saved' | 'saving' | 'dirty';

/**
 * Coordinates in-memory active scene state and Notion-style debounced auto-saving.
 */
@Injectable({ providedIn: 'root' })
export class SceneManagerService implements OnDestroy {
  private readonly repository = inject(SceneRepository);

  private readonly activeSceneState = signal<SceneDocument>(this.resolveInitialScene());
  private readonly saveStatusState = signal<SaveStatus>('saved');
  private readonly scenesListState = signal<readonly SceneHeader[]>(this.repository.list());

  readonly activeScene = this.activeSceneState.asReadonly();
  readonly saveStatus = this.saveStatusState.asReadonly();
  readonly scenes = this.scenesListState.asReadonly();
  readonly isSaved = computed(() => this.saveStatusState() === 'saved');

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs = 1000;

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.flushSave();
    }
  }

  /**
   * Called by the canvas renderer on every user stroke or node movement.
   * Debounces disk write by 1 second.
   */
  onCanvasChange(data: CanvasSceneData): void {
    const updated = touchScene(this.activeSceneState(), {
      elements: data.elements,
      appState: data.appState,
      files: data.files,
    });

    this.activeSceneState.set(updated);
    this.saveStatusState.set('dirty');

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushSave();
    }, this.debounceMs);
  }

  updateTitle(newTitle: string): void {
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === this.activeSceneState().title) return;
    const updated = touchScene(this.activeSceneState(), { title: trimmed });
    this.activeSceneState.set(updated);
    this.flushSave();
  }

  createNewScene(title?: string): SceneDocument {
    this.flushSave();
    const scene = createEmptyScene(title);
    this.repository.save(scene);
    this.repository.setActiveSceneId(scene.id);
    this.activeSceneState.set(scene);
    this.saveStatusState.set('saved');
    return scene;
  }

  loadStarterPlayground(): SceneDocument {
    this.flushSave();
    const scene = createStarterPlaygroundScene();
    this.repository.save(scene);
    this.repository.setActiveSceneId(scene.id);
    this.activeSceneState.set(scene);
    this.saveStatusState.set('saved');
    return scene;
  }

  openScene(id: string): boolean {
    this.flushSave();
    const scene = this.repository.load(id);
    if (!scene) return false;
    this.repository.setActiveSceneId(id);
    this.activeSceneState.set(scene);
    this.saveStatusState.set('saved');
    return true;
  }

  duplicateActiveScene(): SceneDocument {
    this.flushSave();
    const copy = duplicateScene(this.activeSceneState());
    this.repository.save(copy);
    this.repository.setActiveSceneId(copy.id);
    this.activeSceneState.set(copy);
    this.saveStatusState.set('saved');
    return copy;
  }

  deleteActiveScene(): void {
    const currentId = this.activeSceneState().id;
    this.repository.remove(currentId);
    this.scenesListState.set(this.repository.list());
    const remaining = this.repository.list();
    if (remaining.length > 0) {
      this.openScene(remaining[0].id);
    } else {
      this.loadStarterPlayground();
    }
  }

  replaceActiveSceneContent(elements: readonly unknown[], appState = {}, files = {}): void {
    const updated = touchScene(this.activeSceneState(), {
      elements,
      appState: { ...this.activeSceneState().appState, ...appState },
      files: { ...this.activeSceneState().files, ...files },
    });
    this.activeSceneState.set(updated);
    this.flushSave();
  }

  flushSave(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.saveStatusState.set('saving');
    this.repository.save(this.activeSceneState());
    this.scenesListState.set(this.repository.list());
    this.saveStatusState.set('saved');
  }

  private resolveInitialScene(): SceneDocument {
    const activeId = this.repository.getActiveSceneId();
    if (activeId) {
      const stored = this.repository.load(activeId);
      if (stored) return stored;
    }

    const list = this.repository.list();
    if (list.length > 0) {
      const first = this.repository.load(list[0].id);
      if (first) {
        this.repository.setActiveSceneId(first.id);
        return first;
      }
    }

    // Default to starter living playground on fresh installation
    const starter = createStarterPlaygroundScene();
    this.repository.save(starter);
    this.repository.setActiveSceneId(starter.id);
    return starter;
  }
}
