import { TestBed } from '@angular/core/testing';
import { createEmptyScene } from '../../domain/scene/scene-operations';
import { SceneRepository } from './scene.repository';

describe('SceneRepository', () => {
  let repository: SceneRepository;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    repository = TestBed.inject(SceneRepository);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts with an empty scene index', () => {
    expect(repository.list()).toEqual([]);
  });

  it('saves and indexes a new scene', () => {
    const scene = createEmptyScene('Microservices Architecture');
    const saved = repository.save(scene);

    expect(saved).toBe(true);

    const list = repository.list();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(scene.id);
    expect(list[0].title).toBe('Microservices Architecture');

    const loaded = repository.load(scene.id);
    expect(loaded).toBeTruthy();
    expect(loaded?.id).toBe(scene.id);
    expect(loaded?.title).toBe('Microservices Architecture');
  });

  it('removes a scene and updates the index', () => {
    const scene = createEmptyScene('To Delete');
    repository.save(scene);
    repository.setActiveSceneId(scene.id);

    expect(repository.list().length).toBe(1);
    expect(repository.getActiveSceneId()).toBe(scene.id);

    repository.remove(scene.id);

    expect(repository.list().length).toBe(0);
    expect(repository.load(scene.id)).toBeNull();
    expect(repository.getActiveSceneId()).toBeNull();
  });

  it('duplicates an existing scene', () => {
    const original = createEmptyScene('Original');
    repository.save(original);

    const duplicate = repository.duplicate(original.id);

    expect(duplicate).toBeTruthy();
    expect(duplicate?.id).not.toBe(original.id);
    expect(duplicate?.title).toBe('Original (Copia)');
    expect(repository.list().length).toBe(2);
  });
});
