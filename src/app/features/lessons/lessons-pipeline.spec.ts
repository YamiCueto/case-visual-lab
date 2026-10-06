import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { BrowserAssetProvider } from '../../infrastructure/assets/browser';
import { AssetLoader } from '../../engine/assets/loader/asset-loader';
import { ManifestResolver } from '../../engine/assets/resolver/manifest-resolver';
import { ExperienceOrchestrator } from '../../engine/orchestrator/runtime/experience-orchestrator';
import {
  ORCHESTRATOR_COMPOSITION_CONTEXT,
  OrchestratorFacadeService,
} from '../../application/orchestrator/orchestrator-facade.service';
import { LessonsPage } from './lessons.page';
import { LessonPlayerComponent } from '../../presentation/lesson-player/lesson-player.component';

describe('Lessons to LessonPlayer Acceptance Pipeline', () => {
  const REAL_INDEX_JSON = {
    lessons: [
      {
        slug: '01-clean-architecture',
        id: 'clean-architecture-foundations',
        title: 'Clean Architecture: La Regla de Dependencia',
        summary:
          'Comprende visualmente por qué las dependencias del código fuente solo pueden apuntar hacia adentro, protegiendo las reglas de negocio del dominio.',
        category: 'Arquitectura de Software',
        level: 'Fundamentos',
        estimatedMinutes: 8,
        tags: ['Clean Architecture', 'DDD', 'Ports & Adapters', 'Dependency Inversion'],
        icon: 'layers',
        assetUri: 'content/lessons/01-clean-architecture.json',
      },
    ],
  };

  const REAL_01_CLEAN_ARCHITECTURE_JSON = {
    id: 'clean-architecture-foundations',
    title: 'Clean Architecture: La Regla de Dependencia',
    category: 'Arquitectura de Software',
    summary:
      'Comprende visualmente por qué las dependencias del código fuente solo pueden apuntar hacia adentro, protegiendo las reglas de negocio del dominio.',
    level: 'Fundamentos',
    estimatedMinutes: 8,
    metadata: {
      id: 'clean-architecture-foundations',
      slug: 'clean-architecture-foundations',
      title: 'Clean Architecture: La Regla de Dependencia',
      category: 'Arquitectura de Software',
      summary:
        'Comprende visualmente por qué las dependencias del código fuente solo pueden apuntar hacia adentro.',
      level: 'Fundamentos',
      estimatedMinutes: 8,
      author: 'CASE OS Architecture Guild',
      tags: ['Clean Architecture', 'DDD', 'Ports & Adapters', 'Dependency Inversion'],
      icon: 'layers',
    },
    objectives: [
      'Comprender el principio de Inversión de Dependencias (DIP) en arquitecturas hexagonales.',
      'Distinguir claramente entre el Flujo de Control en runtime y la Dirección de Dependencia en tiempo de compilación.',
      'Garantizar que el núcleo del dominio jamás importe librerías de infraestructura, frameworks o bases de datos.',
    ],
    steps: [
      {
        step: 1,
        title: 'Paso 1: El Núcleo del Dominio (Entities)',
        explanation: 'El círculo central contiene las Entidades y Reglas de Negocio Empresariales.',
        keyConcept:
          'El dominio es agnóstico a la tecnología y jamás debe importar infraestructura ni paquetes de UI.',
        checkpoint: {
          id: 'cp_1',
          criteria:
            'Verifica que las entidades de dominio no contengan decoradores de base de datos ni referencias a HTTP.',
          hint: 'En Clean Architecture, el dominio no sufre ningún cambio.',
        },
        codeSnippet: {
          language: 'typescript',
          filename: 'order.entity.ts',
          code: 'export class Order { constructor(readonly id: string) {} }',
          explanation: 'Nótese la ausencia total de imports externos.',
        },
        question: {
          id: 'q_1',
          prompt: '¿Qué biblioteca externa puede importar legítimamente una entidad de dominio?',
          options: [
            'El cliente de Prisma o TypeORM',
            'El router de Express o Fastify',
            'Ninguna librería externa de infraestructura',
            'Librerías de renderizado visual',
          ],
          correctIndex: 2,
          explanation: 'El dominio jamás debe acoplarse a infraestructura externa.',
        },
      },
    ],
  };

  const createMockHttpBrowserAssetProvider = (): BrowserAssetProvider => {
    const assets = new Map<string, unknown>([
      ['/content/lessons/index.json', REAL_INDEX_JSON],
      ['/content/lessons/01-clean-architecture.json', REAL_01_CLEAN_ARCHITECTURE_JSON],
    ]);

    const fetchMock = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = typeof input === 'string' ? input : input.toString();
      const cleanPath = urlStr.replace(/^https?:\/\/[^/]+/, '');

      if (!assets.has(cleanPath)) {
        return new Response('Not Found', { status: 404, statusText: 'Not Found' });
      }

      if (init?.method === 'HEAD') {
        return new Response(null, { status: 200, statusText: 'OK' });
      }

      const content = assets.get(cleanPath);
      return new Response(JSON.stringify(content), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    return new BrowserAssetProvider({
      basePath: '/',
      fetchFn: fetchMock,
    });
  };

  it('executes full pipeline: catalog -> lesson selection -> real asset loading -> legacy adaptation -> orchestrator READY -> player controls', async () => {
    const assetProvider = createMockHttpBrowserAssetProvider();

    TestBed.configureTestingModule({
      imports: [LessonsPage, LessonPlayerComponent],
      providers: [
        provideRouter([]),
        {
          provide: BrowserAssetProvider,
          useValue: assetProvider,
        },
        {
          provide: ORCHESTRATOR_COMPOSITION_CONTEXT,
          useValue: {
            assetProvider,
          },
        },
        OrchestratorFacadeService,
      ],
    });

    const catalogFixture: ComponentFixture<LessonsPage> = TestBed.createComponent(LessonsPage);
    const catalogComponent = catalogFixture.componentInstance;
    await catalogComponent.loadCatalog();
    catalogFixture.detectChanges();

    const catalogEl = catalogFixture.nativeElement as HTMLElement;
    const cleanArchCard = catalogEl.querySelector('article[data-slug="01-clean-architecture"]');
    expect(cleanArchCard).not.toBeNull();

    const cleanArchTitle = catalogEl.querySelector('#lesson-title-01-clean-architecture');
    expect(cleanArchTitle?.textContent?.trim()).toBe('Clean Architecture: La Regla de Dependencia');

    const actionLink = catalogEl.querySelector(
      '#btn-open-lesson-01-clean-architecture',
    ) as HTMLAnchorElement;
    expect(actionLink).not.toBeNull();
    expect(actionLink.getAttribute('href')).toBe('/lessons/01-clean-architecture');

    const resolver = new ManifestResolver();
    const resolvedUri = resolver.resolveUri('lessons/01-clean-architecture');
    expect(resolvedUri).toBe('content/lessons/01-clean-architecture.json');

    const exists = await assetProvider.exists(resolvedUri);
    expect(exists).toBe(true);

    const rawJson = await assetProvider.loadJson<Record<string, unknown>>(resolvedUri);
    expect(rawJson['id']).toBe('clean-architecture-foundations');
    expect(resolver.isLegacyLesson(rawJson)).toBe(true);

    const loader = new AssetLoader(assetProvider);
    const descriptor = await loader.loadExperience('lessons/01-clean-architecture');
    expect(descriptor.originalFormat).toBe('legacy-lesson');
    expect(descriptor.migrated).toBe(true);
    expect(descriptor.manifest.schemaVersion).toBe('2.0.0');
    expect(descriptor.manifest.metadata.title).toBe('Clean Architecture: La Regla de Dependencia');

    const orchestrator = new ExperienceOrchestrator({
      assetLoader: loader,
    });
    const loadedContext = await orchestrator.load('lessons/01-clean-architecture');
    expect(loadedContext.manifest.metadata.id).toBe('clean-architecture-foundations');
    expect(orchestrator.state).toBe('READY');

    const facade = TestBed.inject(OrchestratorFacadeService);
    const context = await facade.load('lessons/01-clean-architecture');

    expect(context.manifest.metadata.id).toBe('clean-architecture-foundations');
    expect(facade.runtimeState()).toBe('READY');
    expect(facade.isReady()).toBe(true);
    expect(facade.experienceTitle?.()).toBe('Clean Architecture: La Regla de Dependencia');

    const playerFixture: ComponentFixture<LessonPlayerComponent> =
      TestBed.createComponent(LessonPlayerComponent);
    const playerComponent = playerFixture.componentInstance;
    playerFixture.detectChanges();

    expect(playerComponent).toBeDefined();
    expect(playerComponent.isReady()).toBe(true);
    expect(playerComponent.runtimeState()).toBe('READY');

    const contentEl = playerFixture.nativeElement.querySelector('app-lesson-content');
    expect(contentEl).not.toBeNull();
    const titleEl = contentEl.querySelector('#step-title');
    expect(titleEl?.textContent?.trim()).toBe('Paso 1: El Núcleo del Dominio (Entities)');

    expect(() => playerComponent.play()).not.toThrow();
    expect(playerComponent.isPlaying()).toBe(true);

    expect(() => playerComponent.pause()).not.toThrow();
    expect(playerComponent.isPaused()).toBe(true);

    expect(() => playerComponent.resume()).not.toThrow();
    expect(playerComponent.isPlaying()).toBe(true);

    await expect(playerComponent.seek(1500)).resolves.not.toThrow();
    expect(playerComponent.currentTime()).toBe(1500);

    expect(() => playerComponent.stop()).not.toThrow();
    expect(playerComponent.runtimeState()).toBe('STOPPED');
    expect(playerComponent.currentTime()).toBe(0);
    expect(playerComponent.isPlaying()).toBe(false);

    await facade.destroy();
    await orchestrator.destroy();
  });

  it('supports reloading or loading a new lesson when orchestrator is already in READY', async () => {
    const assetProvider = createMockHttpBrowserAssetProvider();
    const loader = new AssetLoader(assetProvider);
    const orchestrator = new ExperienceOrchestrator({ assetLoader: loader });

    const first = await orchestrator.load('lessons/01-clean-architecture');
    expect(first.manifest.metadata.id).toBe('clean-architecture-foundations');
    expect(orchestrator.state).toBe('READY');

    const second = await orchestrator.load('lessons/01-clean-architecture');
    expect(second.manifest.metadata.id).toBe('clean-architecture-foundations');
    expect(orchestrator.state).toBe('READY');

    await orchestrator.destroy();
  });
});
