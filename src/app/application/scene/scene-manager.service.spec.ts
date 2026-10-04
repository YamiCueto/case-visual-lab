import { TestBed } from '@angular/core/testing';
import { SceneManagerService } from './scene-manager.service';
import { SceneRepository } from './scene.repository';

describe('SceneManagerService', () => {
  let manager: SceneManagerService;
  let repository: SceneRepository;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    manager = TestBed.inject(SceneManagerService);
    repository = TestBed.inject(SceneRepository);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with a valid default scene and saved status', () => {
    expect(manager.activeScene()).toBeTruthy();
    expect(manager.saveStatus()).toBe('saved');
    expect(manager.isSaved()).toBe(true);
  });

  it('updates title and flushes immediately', () => {
    manager.updateTitle('Event-Driven Architecture');

    expect(manager.activeScene().title).toBe('Event-Driven Architecture');
    expect(manager.saveStatus()).toBe('saved');

    const loaded = repository.load(manager.activeScene().id);
    expect(loaded?.title).toBe('Event-Driven Architecture');
  });

  it('marks state dirty on canvas changes and saves after flushSave()', () => {
    const dummyElement = { id: 'node-1', type: 'rectangle', x: 10, y: 20 };
    manager.onCanvasChange({
      elements: [dummyElement],
      appState: { viewBackgroundColor: '#ffffff' },
      files: {},
    });

    expect(manager.saveStatus()).toBe('dirty');
    expect(manager.isSaved()).toBe(false);

    manager.flushSave();

    expect(manager.saveStatus()).toBe('saved');
    expect(manager.isSaved()).toBe(true);
    expect(manager.activeScene().elements.length).toBe(1);
  });

  it('creates, duplicates, and deletes scenes properly', () => {
    const newScene = manager.createNewScene('New Pipeline');
    expect(manager.activeScene().id).toBe(newScene.id);
    expect(manager.activeScene().title).toBe('New Pipeline');

    const duplicate = manager.duplicateActiveScene();
    expect(manager.activeScene().id).toBe(duplicate.id);
    expect(manager.activeScene().title).toBe('New Pipeline (Copia)');

    manager.deleteActiveScene();
    expect(manager.activeScene().id).not.toBe(duplicate.id);
  });
});
