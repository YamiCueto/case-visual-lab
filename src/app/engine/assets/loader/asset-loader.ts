import { IAssetCache } from '../contracts/asset-cache.interface';
import { AssetProvider } from '../contracts/asset-provider.interface';
import { ExperienceDescriptor } from '../contracts/experience-descriptor.interface';
import { ExperienceManifest } from '../contracts/experience-manifest.types';
import { LegacyLessonManifest } from '../contracts/legacy-lesson.types';
import { AssetCache } from '../cache/asset-cache';
import { MigrationPipeline } from '../migrations/migration-pipeline';
import { v1ToV2Migration } from '../migrations/v1-to-v2.migration';
import { ManifestResolver } from '../resolver/manifest-resolver';
import { SchemaValidator } from '../validator/schema-validator';
import { LegacyLessonAdapter } from './legacy-lesson-adapter';

export interface AssetLoaderOptions {
  readonly cache?: IAssetCache;
  readonly resolver?: ManifestResolver;
  readonly validator?: SchemaValidator;
  readonly pipeline?: MigrationPipeline;
  readonly legacyAdapter?: LegacyLessonAdapter;
}

export interface LoadExperienceOptions {
  readonly skipCache?: boolean;
}

/**
 * Universal Asset Loader.
 * Coordinates loading, resolving, schema validation, legacy adaptation,
 * and caching of Experiences and related assets.
 * Completely decoupled from Angular, fetch, and DOM.
 */
export class AssetLoader {
  private readonly _provider: AssetProvider;
  private readonly _cache: IAssetCache;
  private readonly _resolver: ManifestResolver;
  private readonly _validator: SchemaValidator;
  private readonly _pipeline: MigrationPipeline;
  private readonly _legacyAdapter: LegacyLessonAdapter;

  constructor(provider: AssetProvider, options?: AssetLoaderOptions) {
    this._provider = provider;
    this._cache = options?.cache ?? new AssetCache();
    this._resolver = options?.resolver ?? new ManifestResolver();
    this._validator = options?.validator ?? new SchemaValidator();

    if (options?.pipeline) {
      this._pipeline = options.pipeline;
    } else {
      this._pipeline = new MigrationPipeline();
      this._pipeline.registerStep(v1ToV2Migration);
    }

    this._legacyAdapter = options?.legacyAdapter ?? new LegacyLessonAdapter();
  }

  /**
   * Loads an Experience by URI, identifier, or slug.
   * Transparently handles legacy ADR-004 lessons, migrations, and caching.
   */
  async loadExperience(
    uriOrSlug: string,
    options?: LoadExperienceOptions,
  ): Promise<ExperienceDescriptor> {
    const resolvedUri = this._resolver.resolveUri(uriOrSlug);
    const cacheKey = `experience:${resolvedUri}`;

    if (!options?.skipCache) {
      const cached = this._cache.lookup<ExperienceDescriptor>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const exists = await this._provider.exists(resolvedUri);
    if (!exists) {
      throw new Error(`Asset not found: "${resolvedUri}" (requested as "${uriOrSlug}")`);
    }

    const rawDocument = await this._provider.loadJson<Record<string, unknown>>(resolvedUri);

    const isLegacy = this._resolver.isLegacyLesson(rawDocument);
    const originalFormat: 'experience' | 'legacy-lesson' = isLegacy
      ? 'legacy-lesson'
      : 'experience';

    let manifest: ExperienceManifest;
    let wasMigrated: boolean;

    if (isLegacy) {
      wasMigrated = true;
      manifest = this._legacyAdapter.adapt(rawDocument as unknown as LegacyLessonManifest);
    } else {
      // Modern experience path: check if migration is needed
      const migrationResult = this._pipeline.migrate(rawDocument, '2.0.0');
      wasMigrated = migrationResult.appliedSteps.length > 0;
      manifest = migrationResult.document as unknown as ExperienceManifest;
    }

    // Validate the resulting manifest
    const validation = this._validator.validate(manifest);
    if (!validation.isValid) {
      const errorDetails = validation.errors
        .map((e) => `[${e.code}] ${e.path}: ${e.message}`)
        .join('; ');
      throw new Error(`Invalid Experience Manifest at "${resolvedUri}": ${errorDetails}`);
    }

    const descriptor: ExperienceDescriptor = {
      manifest,
      rawSourceUri: resolvedUri,
      schemaVersion: manifest.schemaVersion,
      migrated: wasMigrated,
      originalFormat,
      loadedAt: Date.now(),
      assets: new Map<string, unknown>(),
    };

    this._cache.set(cacheKey, descriptor);
    return descriptor;
  }

  /**
   * Loads a scene asset (vector elements, layout definition).
   */
  async loadSceneAsset(uri: string): Promise<unknown> {
    const cacheKey = `scene:${uri}`;
    const cached = this._cache.lookup<unknown>(cacheKey);
    if (cached) {
      return cached;
    }

    const exists = await this._provider.exists(uri);
    if (!exists) {
      throw new Error(`Scene asset not found: "${uri}"`);
    }

    const scene = await this._provider.loadJson(uri);
    this._cache.set(cacheKey, scene);
    return scene;
  }

  /**
   * Loads a narrative asset (Markdown text, GFM script).
   */
  async loadNarrativeAsset(uri: string): Promise<string> {
    const cacheKey = `narrative:${uri}`;
    const cached = this._cache.lookup<string>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const exists = await this._provider.exists(uri);
    if (!exists) {
      throw new Error(`Narrative asset not found: "${uri}"`);
    }

    const text = await this._provider.loadText(uri);
    this._cache.set(cacheKey, text);
    return text;
  }

  /**
   * Loads a simulation scenario asset.
   */
  async loadSimulationAsset(uri: string): Promise<unknown> {
    const cacheKey = `simulation:${uri}`;
    const cached = this._cache.lookup<unknown>(cacheKey);
    if (cached) {
      return cached;
    }

    const exists = await this._provider.exists(uri);
    if (!exists) {
      throw new Error(`Simulation asset not found: "${uri}"`);
    }

    const simulation = await this._provider.loadJson(uri);
    this._cache.set(cacheKey, simulation);
    return simulation;
  }

  /**
   * Access to internal cache.
   */
  cache(): IAssetCache {
    return this._cache;
  }

  /**
   * Access to resolver.
   */
  resolver(): ManifestResolver {
    return this._resolver;
  }

  /**
   * Access to validator.
   */
  validator(): SchemaValidator {
    return this._validator;
  }

  /**
   * Access to migration pipeline.
   */
  pipeline(): MigrationPipeline {
    return this._pipeline;
  }
}
