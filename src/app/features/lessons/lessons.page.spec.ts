import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { LessonsPage } from './lessons.page';
import { BrowserAssetProvider } from '../../infrastructure/assets/browser';
import { LessonCatalog } from './lesson-catalog.interface';

describe('LessonsPage', () => {
  let fixture: ComponentFixture<LessonsPage>;
  let component: LessonsPage;

  const mockCatalog: LessonCatalog = {
    lessons: [
      {
        slug: '01-clean-architecture',
        id: 'clean-architecture-foundations',
        title: 'Clean Architecture: La Regla de Dependencia',
        summary:
          'Comprende visualmente por qué las dependencias del código fuente solo pueden apuntar hacia adentro.',
        category: 'Arquitectura de Software',
        level: 'Fundamentos',
        estimatedMinutes: 8,
        tags: ['Clean Architecture', 'DDD'],
        icon: 'layers',
        assetUri: 'content/lessons/01-clean-architecture.json',
      },
    ],
  };

  it('renders lessons catalog cards when assets are successfully loaded', async () => {
    const mockProvider = {
      loadJson: vi.fn().mockResolvedValue(mockCatalog),
      loadText: vi.fn(),
      loadBinary: vi.fn(),
      exists: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [LessonsPage],
      providers: [
        provideRouter([]),
        {
          provide: BrowserAssetProvider,
          useValue: mockProvider,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LessonsPage);
    component = fixture.componentInstance;
    await component.loadCatalog();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const grid = el.querySelector('#lessons-catalog-grid');
    expect(grid).not.toBeNull();

    const card = el.querySelector('article[data-slug="01-clean-architecture"]');
    expect(card).not.toBeNull();

    const title = el.querySelector('#lesson-title-01-clean-architecture');
    expect(title?.textContent?.trim()).toBe('Clean Architecture: La Regla de Dependencia');

    const summary = el.querySelector('#lesson-summary-01-clean-architecture');
    expect(summary?.textContent?.trim()).toContain('Comprende visualmente');

    const category = el.querySelector('#lesson-category-01-clean-architecture');
    expect(category?.textContent?.trim()).toBe('Arquitectura de Software');

    const level = el.querySelector('#lesson-level-01-clean-architecture');
    expect(level?.textContent?.trim()).toBe('Fundamentos');

    const duration = el.querySelector('#lesson-duration-01-clean-architecture');
    expect(duration?.textContent?.trim()).toContain('8 min');

    const actionBtn = el.querySelector(
      '#btn-open-lesson-01-clean-architecture',
    ) as HTMLAnchorElement;
    expect(actionBtn).not.toBeNull();
    expect(actionBtn.getAttribute('href')).toBe('/lessons/01-clean-architecture');
  });

  it('displays empty state when catalog has no lessons', async () => {
    const mockProvider = {
      loadJson: vi.fn().mockResolvedValue({ lessons: [] }),
      loadText: vi.fn(),
      loadBinary: vi.fn(),
      exists: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [LessonsPage],
      providers: [
        provideRouter([]),
        {
          provide: BrowserAssetProvider,
          useValue: mockProvider,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LessonsPage);
    component = fixture.componentInstance;
    await component.loadCatalog();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-empty-state')).not.toBeNull();
  });

  it('displays error banner when loading catalog fails', async () => {
    const mockProvider = {
      loadJson: vi.fn().mockRejectedValue(new Error('Network offline')),
      loadText: vi.fn(),
      loadBinary: vi.fn(),
      exists: vi.fn().mockResolvedValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [LessonsPage],
      providers: [
        provideRouter([]),
        {
          provide: BrowserAssetProvider,
          useValue: mockProvider,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LessonsPage);
    component = fixture.componentInstance;
    await component.loadCatalog();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const errorBanner = el.querySelector('#lessons-error');
    expect(errorBanner).not.toBeNull();
    expect(errorBanner?.textContent).toContain('Network offline');
  });
});
