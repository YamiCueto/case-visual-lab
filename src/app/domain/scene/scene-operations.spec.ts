import { describe, expect, it } from 'vitest';
import {
  createEmptyScene,
  createStarterPlaygroundScene,
  duplicateScene,
  touchScene,
} from './scene-operations';

describe('SceneOperations', () => {
  it('creates an empty scene with schema version 1', () => {
    const scene = createEmptyScene('Custom Title');
    expect(scene.title).toBe('Custom Title');
    expect(scene.schemaVersion).toBe(1);
    expect(scene.elements).toHaveLength(0);
    expect(scene.id).toContain('scene_');
  });

  it('creates a starter playground scene with living nodes', () => {
    const scene = createStarterPlaygroundScene();
    expect(scene.id).toBe('starter_playground');
    expect(scene.elements.length).toBeGreaterThan(5);
    expect(scene.title).toContain('Playground');
  });

  it('duplicates a scene with a new unique id and copy title', () => {
    const original = createEmptyScene('Original');
    const copy = duplicateScene(original);

    expect(copy.id).not.toBe(original.id);
    expect(copy.title).toBe('Original (Copia)');
    expect(copy.createdAt).toBeDefined();
  });

  it('touches a scene updating timestamps and elements', () => {
    const original = createEmptyScene('Original');
    const updated = touchScene(original, { elements: [{ id: '1' }] });

    expect(updated.elements).toHaveLength(1);
    expect(updated.updatedAt).toBeDefined();
  });
});
