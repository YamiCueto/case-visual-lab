import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AssetProvider } from '../engine/assets/contracts/asset-provider.interface';
import { ExperienceManifest } from '../engine/assets/contracts/experience-manifest.types';
import { ORCHESTRATOR_COMPOSITION_CONTEXT, OrchestratorFacadeService } from './orchestrator';

class TestAssetProvider implements AssetProvider {
  private readonly _storage = new Map<string, unknown>();

  set(uri: string, data: unknown): void {
    this._storage.set(uri, data);
  }

  async loadJson<T = unknown>(uri: string): Promise<T> {
    const val = this._storage.get(uri);
    if (!val) {
      throw new Error(`Asset not found: ${uri}`);
    }
    return JSON.parse(JSON.stringify(val)) as T;
  }

  async loadText(uri: string): Promise<string> {
    return String(this._storage.get(uri) ?? '');
  }

  async loadBinary(uri: string): Promise<ArrayBuffer> {
    void uri;
    return new ArrayBuffer(0);
  }

  async exists(uri: string): Promise<boolean> {
    return this._storage.has(uri);
  }
}

const createTestManifest = (): ExperienceManifest => ({
  schemaVersion: '2.0.0',
  manifestVersion: '1.0.0',
  metadata: {
    id: 'exp_application_test',
    title: 'Application Layer Test Experience',
  },
  profile: {
    type: 'simulation',
  },
  timeline: {
    tracks: [
      {
        id: 'track_test',
        name: 'Test Track',
        type: 'VISUAL',
        frames: [],
      },
    ],
  },
});

describe('OrchestratorFacadeService', () => {
  let service: OrchestratorFacadeService;
  let assetProvider: TestAssetProvider;

  beforeEach(() => {
    assetProvider = new TestAssetProvider();
    assetProvider.set('content/experiences/test.experience.json', createTestManifest());

    TestBed.configureTestingModule({
      providers: [
        {
          provide: ORCHESTRATOR_COMPOSITION_CONTEXT,
          useValue: {
            assetProvider,
          },
        },
        OrchestratorFacadeService,
      ],
    });

    service = TestBed.inject(OrchestratorFacadeService);
  });

  afterEach(async () => {
    await service.dispose();
  });

  it('creates the facade service successfully', () => {
    expect(service).toBeDefined();
    expect(service.runtimeState()).toBe('LOAD');
    expect(service.playState()).toBe('STOPPED');
    expect(service.currentTime()).toBe(0);
    expect(service.frameNumber()).toBe(0);
    expect(service.playbackSpeed()).toBe(1.0);
    expect(service.isReady()).toBe(false);
    expect(service.isPlaying()).toBe(false);
    expect(service.isPaused()).toBe(false);
    expect(service.isLoading()).toBe(true);
    expect(service.lastError()).toBeNull();
  });

  it('acts as a singleton within the Angular injector', () => {
    const secondInstance = TestBed.inject(OrchestratorFacadeService);
    expect(service).toBe(secondInstance);
  });

  it('loads an experience and transitions signals to READY', async () => {
    const context = await service.load('test');

    expect(context).toBeDefined();
    expect(context.manifest.metadata.id).toBe('exp_application_test');
    expect(service.runtimeState()).toBe('READY');
    expect(service.isReady()).toBe(true);
    expect(service.isLoading()).toBe(false);
    expect(service.isPlaying()).toBe(false);
    expect(service.isPaused()).toBe(false);
    expect(service.lastError()).toBeNull();
  });

  it('plays, ticks, pauses, resumes, and stops updating signals reactively', async () => {
    await service.load('test');
    expect(service.isReady()).toBe(true);

    service.play();
    expect(service.runtimeState()).toBe('PLAYING');
    expect(service.playState()).toBe('PLAYING');
    expect(service.isPlaying()).toBe(true);
    expect(service.isPaused()).toBe(false);

    service.tick(100);
    expect(service.currentTime()).toBe(100);
    expect(service.frameNumber()).toBe(1);

    service.pause();
    expect(service.runtimeState()).toBe('PAUSED');
    expect(service.playState()).toBe('PAUSED');
    expect(service.isPaused()).toBe(true);
    expect(service.isPlaying()).toBe(false);

    service.resume();
    expect(service.runtimeState()).toBe('PLAYING');
    expect(service.playState()).toBe('PLAYING');
    expect(service.isPlaying()).toBe(true);

    service.stop();
    expect(service.runtimeState()).toBe('STOPPED');
    expect(service.currentTime()).toBe(0);
    expect(service.isPlaying()).toBe(false);
  });

  it('seeks to target time and updates currentTime signal', async () => {
    await service.load('test');
    service.play();

    await service.seek(500);
    expect(service.currentTime()).toBe(500);
    expect(service.isPlaying()).toBe(true);
  });

  it('updates playback speed reactively', async () => {
    service.setPlaybackSpeed(2.5);
    expect(service.playbackSpeed()).toBe(2.5);
  });

  it('provides a complete synchronous snapshot of all signals', async () => {
    await service.load('test');
    service.play();
    service.tick(50);

    const snapshot = service.getSnapshot();
    expect(snapshot.runtimeState).toBe('PLAYING');
    expect(snapshot.currentTime).toBe(50);
    expect(snapshot.frameNumber).toBe(1);
    expect(snapshot.isPlaying).toBe(true);
    expect(snapshot.isPaused).toBe(false);
    expect(snapshot.isReady).toBe(false);
    expect(snapshot.lastError).toBeNull();
  });

  it('destroys and disposes the runtime cleanly', async () => {
    await service.load('test');
    service.play();

    await service.destroy();
    expect(service.runtimeState()).toBe('DESTROYED');

    await expect(service.dispose()).resolves.toBeUndefined();
    expect(service.runtimeState()).toBe('DESTROYED');
  });

  it('captures error in lastError signal when load fails', async () => {
    await expect(service.load('non-existent-experience')).rejects.toThrow();

    expect(service.lastError()).not.toBeNull();
    expect(service.lastError()).toContain('Asset not found');
  });

  it('instantiates standalone with optional composition context', async () => {
    const standaloneProvider = new TestAssetProvider();
    standaloneProvider.set('content/experiences/test.experience.json', createTestManifest());

    const injector = Injector.create({
      providers: [
        {
          provide: ORCHESTRATOR_COMPOSITION_CONTEXT,
          useValue: {
            assetProvider: standaloneProvider,
          },
        },
        {
          provide: OrchestratorFacadeService,
          useClass: OrchestratorFacadeService,
        },
      ],
    });

    const standalone = injector.get(OrchestratorFacadeService);

    const ctx = await standalone.load('test');
    expect(ctx.manifest.metadata.id).toBe('exp_application_test');
    expect(standalone.isReady()).toBe(true);

    await standalone.destroy();
  });
});
