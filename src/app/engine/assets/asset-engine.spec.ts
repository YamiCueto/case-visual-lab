import { describe, expect, it } from 'vitest';
import { AssetCache } from './cache/asset-cache';
import { AssetProvider } from './contracts/asset-provider.interface';
import { ExperienceManifest } from './contracts/experience-manifest.types';
import { LegacyLessonManifest } from './contracts/legacy-lesson.types';
import { AssetLoader } from './loader/asset-loader';
import { LegacyLessonAdapter } from './loader/legacy-lesson-adapter';
import { MigrationPipeline } from './migrations/migration-pipeline';
import { v1ToV2Migration } from './migrations/v1-to-v2.migration';
import { ManifestResolver } from './resolver/manifest-resolver';
import { SchemaValidator } from './validator/schema-validator';

/**
 * In-memory Asset Provider for headless unit testing.
 * Implements the AssetProvider SPI without network or DOM dependencies.
 */
class MemoryAssetProvider implements AssetProvider {
  private _storage = new Map<string, string | ArrayBuffer | unknown>();
  loadJsonCallCount = 0;
  loadTextCallCount = 0;

  setJson(uri: string, data: unknown): void {
    this._storage.set(uri, data);
  }

  setText(uri: string, text: string): void {
    this._storage.set(uri, text);
  }

  setBinary(uri: string, buffer: ArrayBuffer): void {
    this._storage.set(uri, buffer);
  }

  async loadJson<T = unknown>(uri: string): Promise<T> {
    this.loadJsonCallCount += 1;
    if (!this._storage.has(uri)) {
      throw new Error(`MemoryAssetProvider: file not found "${uri}"`);
    }
    const item = this._storage.get(uri);
    return JSON.parse(JSON.stringify(item)) as T;
  }

  async loadText(uri: string): Promise<string> {
    this.loadTextCallCount += 1;
    if (!this._storage.has(uri)) {
      throw new Error(`MemoryAssetProvider: file not found "${uri}"`);
    }
    const item = this._storage.get(uri);
    return String(item);
  }

  async loadBinary(uri: string): Promise<ArrayBuffer> {
    if (!this._storage.has(uri)) {
      throw new Error(`MemoryAssetProvider: file not found "${uri}"`);
    }
    return this._storage.get(uri) as ArrayBuffer;
  }

  async exists(uri: string): Promise<boolean> {
    return this._storage.has(uri);
  }
}

describe('Asset Engine Subsystem (Sprint 3 — Paso 9)', () => {
  const createValidModernExperience = (): ExperienceManifest => ({
    $schema: 'https://case-visual-lab.io/schemas/v2/experience-manifest.json',
    schemaVersion: '2.0.0',
    manifestVersion: '1.0.0',
    metadata: {
      id: 'exp_http_lifecycle',
      title: 'HTTP Request Lifecycle',
      category: 'networking',
      difficulty: 'intermediate',
      estimatedMinutes: 15,
      tags: ['http', 'gateway'],
    },
    profile: {
      type: 'lesson',
      policy: {
        allowFreeNavigation: true,
      },
    },
    simulation: {
      provider: 'http-simulation-provider',
      scenario: 'client_to_gateway',
    },
    timeline: {
      durationMs: 8000,
    },
  });

  const createLegacyLesson = (): LegacyLessonManifest => ({
    id: 'clean-architecture-foundations',
    title: 'Clean Architecture: La Regla de Dependencia',
    category: 'Arquitectura de Software',
    summary: 'Comprende visualmente las reglas de dependencia.',
    level: 'Fundamentos',
    estimatedMinutes: 8,
    objectives: ['Comprender DIP', 'Separar dominio de infra'],
    metadata: {
      id: 'clean-architecture-foundations',
      slug: 'clean-architecture-foundations',
      title: 'Clean Architecture: La Regla de Dependencia',
      author: 'CASE Architecture Guild',
      tags: ['DDD', 'Clean Architecture'],
      icon: 'layers',
    },
    steps: [
      {
        step: 1,
        title: 'El Núcleo del Dominio',
        explanation: 'El círculo central contiene las Entidades.',
        keyConcept: 'El dominio jamás importa infraestructura.',
        checkpoint: {
          id: 'cp_1',
          criteria: 'Verifica entidades puras.',
          hint: 'Sin decorators de ORM.',
        },
        codeSnippet: {
          language: 'typescript',
          filename: 'order.entity.ts',
          code: 'export class Order {}',
          explanation: 'Sin dependencias externas.',
        },
        question: {
          id: 'q_1',
          prompt: '¿Qué biblioteca externa puede importar el dominio?',
          options: ['Express', 'Prisma', 'Ninguna'],
          correctIndex: 2,
          explanation: 'El dominio es puro.',
        },
        sceneData: {
          elements: [{ id: 'circle_domain', type: 'ellipse' }],
        },
      },
      {
        step: 2,
        title: 'Casos de Uso',
        explanation: 'Orquestan el flujo de datos.',
      },
    ],
  });

  describe('AssetCache', () => {
    it('should support lookup, set, invalidate, clear, warmup, and size without browser globals', () => {
      let currentTime = 1000;
      const cache = new AssetCache(() => currentTime);

      expect(cache.size()).toBe(0);
      expect(cache.lookup('key1')).toBeNull();

      // Set item with TTL
      cache.set('key1', { data: 'test' }, 500); // expires at 1500
      expect(cache.has('key1')).toBe(true);
      expect(cache.lookup<{ data: string }>('key1')?.data).toBe('test');
      expect(cache.size()).toBe(1);

      // Advance time before expiry
      currentTime = 1400;
      expect(cache.lookup('key1')).not.toBeNull();

      // Advance time past expiry
      currentTime = 1600;
      expect(cache.lookup('key1')).toBeNull();
      expect(cache.has('key1')).toBe(false);
      expect(cache.size()).toBe(0);

      // Warmup
      cache.warmup([
        ['asset_a', 100],
        ['asset_b', 200],
      ]);
      expect(cache.size()).toBe(2);
      expect(cache.lookup('asset_a')).toBe(100);

      // Invalidate single item
      expect(cache.invalidate('asset_a')).toBe(true);
      expect(cache.lookup('asset_a')).toBeNull();
      expect(cache.invalidate('asset_a')).toBe(false);

      // Clear all
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.lookup('asset_b')).toBeNull();
    });
  });

  describe('SchemaValidator', () => {
    it('should validate a valid ADR-008 Experience Manifest', () => {
      const validator = new SchemaValidator();
      const manifest = createValidModernExperience();
      const result = validator.validate(manifest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object root', () => {
      const validator = new SchemaValidator();
      expect(validator.validate(null).isValid).toBe(false);
      expect(validator.validate('string').isValid).toBe(false);
      expect(validator.validate([]).isValid).toBe(false);
    });

    it('should report missing schemaVersion', () => {
      const validator = new SchemaValidator();
      const manifest = {
        metadata: { id: 'm1', title: 'Test' },
        profile: { type: 'lesson' },
      };
      const result = validator.validate(manifest);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_SCHEMA_VERSION')).toBe(true);
    });

    it('should report missing or invalid metadata', () => {
      const validator = new SchemaValidator();
      const manifest = {
        schemaVersion: '2.0.0',
        profile: { type: 'lesson' },
      };
      const result = validator.validate(manifest);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_METADATA')).toBe(true);

      const invalidMeta = {
        schemaVersion: '2.0.0',
        metadata: { id: '', title: '' },
        profile: { type: 'lesson' },
      };
      const result2 = validator.validate(invalidMeta);
      expect(result2.errors.some((e) => e.code === 'INVALID_METADATA_ID')).toBe(true);
      expect(result2.errors.some((e) => e.code === 'INVALID_METADATA_TITLE')).toBe(true);
    });

    it('should report invalid profile types with detailed list of valid archetypes', () => {
      const validator = new SchemaValidator();
      const manifest = {
        schemaVersion: '2.0.0',
        metadata: { id: 'm1', title: 'Test' },
        profile: { type: 'invalid-profile' },
      };
      const result = validator.validate(manifest);
      expect(result.isValid).toBe(false);
      const err = result.errors.find((e) => e.code === 'INVALID_PROFILE_TYPE');
      expect(err).toBeDefined();
      expect(err?.message).toContain('invalid-profile');
    });

    it('should validate optional simulation and timeline blocks', () => {
      const validator = new SchemaValidator();
      const manifest = {
        schemaVersion: '2.0.0',
        metadata: { id: 'm1', title: 'Test' },
        profile: { type: 'simulation' },
        simulation: { provider: '' },
        timeline: { durationMs: -100 },
      };
      const result = validator.validate(manifest);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_SIMULATION_PROVIDER')).toBe(true);
      expect(result.errors.some((e) => e.code === 'INVALID_TIMELINE_DURATION')).toBe(true);
    });

    it('should support registering custom version validators for future schema versions', () => {
      const validator = new SchemaValidator();
      validator.registerVersionValidator('10.0.0', (doc) => ({
        isValid: doc['futureProof'] === true,
        errors:
          doc['futureProof'] === true
            ? []
            : [{ path: '/futureProof', message: 'Must be future proof', code: 'NOT_FUTURE_PROOF' }],
        warnings: [],
      }));

      const invalidV10 = { schemaVersion: '10.0.0' };
      expect(validator.validate(invalidV10).isValid).toBe(false);

      const validV10 = { schemaVersion: '10.0.0', futureProof: true };
      expect(validator.validate(validV10).isValid).toBe(true);
    });
  });

  describe('MigrationPipeline', () => {
    it('should execute migrations through pure functions without mutating original document', () => {
      const pipeline = new MigrationPipeline();
      pipeline.registerStep(v1ToV2Migration);

      const originalDoc = Object.freeze({
        schemaVersion: '1.0.0',
        metadata: { id: 'm1', title: 'Old Title' },
        profile: 'workshop',
      });

      // Take deep snapshot of original to verify immutability
      const snapshot = JSON.stringify(originalDoc);

      const result = pipeline.migrate(originalDoc, '2.0.0');

      // Verify original is strictly untouched
      expect(JSON.stringify(originalDoc)).toBe(snapshot);

      // Verify migration output
      expect(result.originalVersion).toBe('1.0.0');
      expect(result.finalVersion).toBe('2.0.0');
      expect(result.appliedSteps).toHaveLength(1);
      expect(result.document['schemaVersion']).toBe('2.0.0');
      expect(result.document['profile']).toEqual({ type: 'workshop' });
    });

    it('should return clone without steps if already at target version', () => {
      const pipeline = new MigrationPipeline();
      pipeline.registerStep(v1ToV2Migration);

      const docV2 = { schemaVersion: '2.0.0', metadata: { id: 'm1', title: 'V2' } };
      const result = pipeline.migrate(docV2, '2.0.0');

      expect(result.appliedSteps).toHaveLength(0);
      expect(result.finalVersion).toBe('2.0.0');
    });

    it('should support chaining multiple migration steps sequentially', () => {
      const pipeline = new MigrationPipeline();
      pipeline.registerStep(v1ToV2Migration);
      pipeline.registerStep({
        fromVersion: '2.0.0',
        toVersion: '3.0.0',
        description: 'Upgrade to schema v3 with extra flags',
        migrate: (d) => ({ ...d, schemaVersion: '3.0.0', v3Flag: true }),
      });

      const docV1 = { schemaVersion: '1.0.0', metadata: { id: 'm1', title: 'Chained' } };
      const result = pipeline.migrate(docV1, '3.0.0');

      expect(result.originalVersion).toBe('1.0.0');
      expect(result.finalVersion).toBe('3.0.0');
      expect(result.appliedSteps).toHaveLength(2);
      expect(result.document['schemaVersion']).toBe('3.0.0');
      expect(result.document['v3Flag']).toBe(true);
    });
  });

  describe('LegacyLessonAdapter', () => {
    it('should transparently convert ADR-004 Lesson to ADR-008 Experience Manifest', () => {
      const adapter = new LegacyLessonAdapter();
      const legacy = createLegacyLesson();
      const snapshot = JSON.stringify(legacy);

      const experience = adapter.adapt(legacy);

      // Immutability: original legacy document untouched
      expect(JSON.stringify(legacy)).toBe(snapshot);

      // ADR-008 Root validation
      expect(experience.schemaVersion).toBe('2.0.0');
      expect(experience.manifestVersion).toBe('1.0.0');
      expect(experience.profile.type).toBe('lesson');
      expect(experience.profile.policy?.['allowFreeNavigation']).toBe(true);

      // Metadata mapping
      expect(experience.metadata.id).toBe('clean-architecture-foundations');
      expect(experience.metadata.title).toBe('Clean Architecture: La Regla de Dependencia');
      expect(experience.metadata.category).toBe('Arquitectura de Software');
      expect(experience.metadata.difficulty).toBe('Fundamentos');
      expect(experience.metadata.estimatedMinutes).toBe(8);

      // Assets mapping
      expect(experience.assets?.scenes?.['scene_step_1']).toBeDefined();
      expect(experience.assets?.snippets?.['snippet_step_1']).toBeDefined();

      // Narrative mapping
      expect(experience.narrative?.scripts).toHaveLength(2);
      expect(experience.narrative?.scripts?.[0].title).toBe('El Núcleo del Dominio');
      expect(experience.narrative?.scripts?.[0].content).toContain('Concepto Clave');

      // Evaluation checkpoints and quizzes mapping
      expect(experience.evaluation?.checkpoints).toHaveLength(1);
      expect(experience.evaluation?.checkpoints?.[0].id).toBe('cp_1');
      expect(experience.evaluation?.quizzes).toHaveLength(1);
      expect(experience.evaluation?.quizzes?.[0].id).toBe('q_1');
      expect(experience.evaluation?.quizzes?.[0].correctIndex).toBe(2);

      // Timeline mapping
      expect(experience.timeline?.durationMs).toBe(8000);
      expect(experience.timeline?.markers).toHaveLength(2);
    });
  });

  describe('ManifestResolver', () => {
    it('should resolve full json paths, experience identifiers, and legacy lesson identifiers', () => {
      const resolver = new ManifestResolver();

      expect(resolver.resolveUri('custom/path.json')).toBe('custom/path.json');
      expect(resolver.resolveUri('http-flow')).toBe(
        'content/experiences/http-flow.experience.json',
      );
      expect(resolver.resolveUri('experiences/http-flow')).toBe(
        'content/experiences/http-flow.experience.json',
      );
      expect(resolver.resolveUri('lessons/clean-arch')).toBe('content/lessons/clean-arch.json');
      expect(resolver.resolveUri('lesson_clean-arch')).toBe('content/lessons/clean-arch.json');
    });

    it('should distinguish between legacy lesson and modern experience formats', () => {
      const resolver = new ManifestResolver();
      const legacy = createLegacyLesson();
      const modern = createValidModernExperience();

      expect(resolver.isLegacyLesson(legacy)).toBe(true);
      expect(resolver.isModernExperience(legacy)).toBe(false);

      expect(resolver.isLegacyLesson(modern)).toBe(false);
      expect(resolver.isModernExperience(modern)).toBe(true);
    });
  });

  describe('AssetLoader (Integrated Pipeline)', () => {
    it('should load a modern Experience Manifest and cache the descriptor', async () => {
      const provider = new MemoryAssetProvider();
      const modernManifest = createValidModernExperience();
      provider.setJson('content/experiences/http-flow.experience.json', modernManifest);

      const loader = new AssetLoader(provider);

      // First load: fetches from provider
      const descriptor1 = await loader.loadExperience('http-flow');
      expect(descriptor1.manifest.metadata.id).toBe('exp_http_lifecycle');
      expect(descriptor1.originalFormat).toBe('experience');
      expect(descriptor1.migrated).toBe(false);
      expect(provider.loadJsonCallCount).toBe(1);

      // Second load: served from internal cache
      const descriptor2 = await loader.loadExperience('http-flow');
      expect(descriptor2).toBe(descriptor1);
      expect(provider.loadJsonCallCount).toBe(1); // Call count unchanged!

      // Skip cache option
      const descriptor3 = await loader.loadExperience('http-flow', { skipCache: true });
      expect(descriptor3.manifest.metadata.id).toBe('exp_http_lifecycle');
      expect(provider.loadJsonCallCount).toBe(2);
    });

    it('should automatically adapt a legacy lesson manifest and validate without runtime error', async () => {
      const provider = new MemoryAssetProvider();
      const legacyLesson = createLegacyLesson();
      provider.setJson('content/lessons/01-clean-arch.json', legacyLesson);

      const loader = new AssetLoader(provider);
      const descriptor = await loader.loadExperience('lessons/01-clean-arch');

      expect(descriptor.originalFormat).toBe('legacy-lesson');
      expect(descriptor.migrated).toBe(true);
      expect(descriptor.manifest.schemaVersion).toBe('2.0.0');
      expect(descriptor.manifest.profile.type).toBe('lesson');
      expect(descriptor.manifest.metadata.id).toBe('clean-architecture-foundations');
    });

    it('should migrate schema v1 to v2 automatically', async () => {
      const provider = new MemoryAssetProvider();
      const v1Experience = {
        schemaVersion: '1.0.0',
        metadata: { id: 'exp_v1', title: 'V1 Experience' },
        profile: 'workshop',
      };
      provider.setJson('content/experiences/v1.experience.json', v1Experience);

      const loader = new AssetLoader(provider);
      const descriptor = await loader.loadExperience('v1');

      expect(descriptor.originalFormat).toBe('experience');
      expect(descriptor.migrated).toBe(true);
      expect(descriptor.manifest.schemaVersion).toBe('2.0.0');
      expect(descriptor.manifest.profile.type).toBe('workshop');
    });

    it('should throw clear error when asset does not exist', async () => {
      const provider = new MemoryAssetProvider();
      const loader = new AssetLoader(provider);

      await expect(loader.loadExperience('missing-asset')).rejects.toThrow(/Asset not found/);
    });

    it('should throw detailed error when manifest fails schema validation', async () => {
      const provider = new MemoryAssetProvider();
      const invalidManifest = {
        schemaVersion: '2.0.0',
        // missing metadata and profile!
      };
      provider.setJson('content/experiences/invalid.experience.json', invalidManifest);

      const loader = new AssetLoader(provider);

      await expect(loader.loadExperience('invalid')).rejects.toThrow(
        /Invalid Experience Manifest.*MISSING_METADATA/,
      );
    });

    it('should load and cache scene assets, narrative assets, and simulation assets', async () => {
      const provider = new MemoryAssetProvider();
      provider.setJson('assets/scenes/scene_1.json', { elements: [{ id: 'e1' }] });
      provider.setText('assets/narratives/intro.md', '# Introducción a Clean Architecture');
      provider.setJson('assets/simulations/http.json', { rateLimit: 100 });

      const loader = new AssetLoader(provider);

      // Scene asset
      const scene1 = await loader.loadSceneAsset('assets/scenes/scene_1.json');
      expect(scene1).toEqual({ elements: [{ id: 'e1' }] });
      // Cached scene
      const scene2 = await loader.loadSceneAsset('assets/scenes/scene_1.json');
      expect(scene2).toBe(scene1);

      // Narrative asset
      const text1 = await loader.loadNarrativeAsset('assets/narratives/intro.md');
      expect(text1).toContain('Clean Architecture');
      // Cached narrative
      const text2 = await loader.loadNarrativeAsset('assets/narratives/intro.md');
      expect(text2).toBe(text1);

      // Simulation asset
      const sim1 = await loader.loadSimulationAsset('assets/simulations/http.json');
      expect(sim1).toEqual({ rateLimit: 100 });
      // Cached simulation
      const sim2 = await loader.loadSimulationAsset('assets/simulations/http.json');
      expect(sim2).toBe(sim1);

      // Missing assets throw descriptive errors
      await expect(loader.loadSceneAsset('missing.json')).rejects.toThrow(/Scene asset not found/);
      await expect(loader.loadNarrativeAsset('missing.md')).rejects.toThrow(
        /Narrative asset not found/,
      );
      await expect(loader.loadSimulationAsset('missing_sim.json')).rejects.toThrow(
        /Simulation asset not found/,
      );
    });
  });
});
