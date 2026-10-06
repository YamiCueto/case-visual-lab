import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { vi } from 'vitest';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';
import { OrchestratorFacadeSnapshot } from '../../application/orchestrator/orchestrator-facade.types';
import { ExperienceManifest } from '../../engine/assets/contracts/experience-manifest.types';
import { LessonPlayerComponent } from './lesson-player.component';

class MockOrchestratorFacade {
  readonly runtimeState: WritableSignal<string> = signal('READY');
  readonly playState: WritableSignal<string> = signal('STOPPED');
  readonly currentTime: WritableSignal<number> = signal(0);
  readonly frameNumber: WritableSignal<number> = signal(0);
  readonly playbackSpeed: WritableSignal<number> = signal(1.0);
  readonly isReady: WritableSignal<boolean> = signal(true);
  readonly isPlaying: WritableSignal<boolean> = signal(false);
  readonly isPaused: WritableSignal<boolean> = signal(false);
  readonly isLoading: WritableSignal<boolean> = signal(false);
  readonly lastError: WritableSignal<string | null> = signal(null);
  readonly experienceManifest: WritableSignal<ExperienceManifest | null> = signal(null);

  readonly load = vi.fn().mockImplementation(async () => Promise.resolve());
  readonly play = vi.fn();
  readonly pause = vi.fn();
  readonly resume = vi.fn();
  readonly seek = vi.fn().mockImplementation(async () => Promise.resolve());
  readonly stop = vi.fn();
  readonly destroy = vi.fn().mockImplementation(async () => Promise.resolve());
  readonly tick = vi.fn();
  readonly dispose = vi.fn().mockImplementation(async () => Promise.resolve());
  readonly setPlaybackSpeed = vi.fn();
  readonly getSnapshot = vi.fn().mockImplementation((): OrchestratorFacadeSnapshot => ({
    runtimeState: 'READY',
    playState: 'STOPPED',
    currentTime: 0,
    frameNumber: 0,
    playbackSpeed: 1.0,
    isReady: true,
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    lastError: null,
  }));
}

describe('LessonPlayerComponent', () => {
  let fixture: ComponentFixture<LessonPlayerComponent>;
  let component: LessonPlayerComponent;
  let mockFacade: MockOrchestratorFacade;

  beforeEach(async () => {
    mockFacade = new MockOrchestratorFacade();

    await TestBed.configureTestingModule({
      imports: [LessonPlayerComponent],
      providers: [
        {
          provide: OrchestratorFacadeService,
          useValue: mockFacade,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LessonPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the lesson player shell component successfully', () => {
    expect(component).toBeDefined();
  });

  it('integrates Toolbar, RuntimeHost, Inspector, and Timeline into CSS Grid layout', () => {
    const el = fixture.nativeElement;
    const toolbar = el.querySelector('#shell-toolbar app-toolbar');
    const viewport = el.querySelector('#shell-viewport app-runtime-host');
    const inspector = el.querySelector('#shell-inspector app-inspector-panel');
    const timeline = el.querySelector('#shell-timeline app-timeline-panel');

    expect(toolbar).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(inspector).not.toBeNull();
    expect(timeline).not.toBeNull();
  });

  it('contains structural layers for overlays, notifications, dialogs, and asset browser', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('#layer-overlays')).not.toBeNull();
    expect(el.querySelector('#layer-notifications')).not.toBeNull();
    expect(el.querySelector('#layer-dialogs')).not.toBeNull();
    expect(el.querySelector('#layer-asset-browser')).not.toBeNull();
  });

  it('consumes orchestrator facade correctly and reflects initial state', () => {
    expect(component.facade).toBeDefined();
    expect(component.facade).toBe(mockFacade as unknown as OrchestratorFacadeService);
    expect(component.runtimeState()).toBe('READY');
    expect(component.currentTime()).toBe(0);
    expect(component.frameNumber()).toBe(0);
  });

  it('delegates actions to the facade correctly', async () => {
    await component.load('lesson-intro');
    expect(mockFacade.load).toHaveBeenCalledWith('lesson-intro');

    component.play();
    expect(mockFacade.play).toHaveBeenCalledTimes(1);

    component.pause();
    expect(mockFacade.pause).toHaveBeenCalledTimes(1);

    component.resume();
    expect(mockFacade.resume).toHaveBeenCalledTimes(1);

    await component.seek(750);
    expect(mockFacade.seek).toHaveBeenCalledWith(750);

    component.stop();
    expect(mockFacade.stop).toHaveBeenCalledTimes(1);

    await component.destroy();
    expect(mockFacade.destroy).toHaveBeenCalledTimes(1);

    component.tick(32);
    expect(mockFacade.tick).toHaveBeenCalledWith(32);
  });

  it('reactively renders loading overlay banner when isLoading is active', () => {
    mockFacade.isLoading.set(true);
    fixture.detectChanges();

    const spinnerEl = fixture.nativeElement.querySelector('#overlay-loading');
    expect(spinnerEl).not.toBeNull();
    expect(spinnerEl?.textContent?.trim()).toContain('Loading experience runtime');
  });

  it('reactively renders notification toast when lastError is set', () => {
    mockFacade.lastError.set('Experience manifest parsing error');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('#overlay-error');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent?.trim()).toBe('Experience manifest parsing error');
  });

  it('applies CSS Grid layout classes to the shell container', () => {
    const el: HTMLElement = fixture.nativeElement.querySelector('.lesson-player-shell');
    expect(el).not.toBeNull();
    expect(el.classList.contains('lesson-player-shell')).toBe(true);
  });

  it('drives playback tick via animation frames when playing (K)', () => {
    let capturedCb: ((now: number) => void) | null = null;
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      capturedCb = cb;
      return 1;
    });
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');

    mockFacade.isPlaying.set(true);
    fixture.detectChanges();

    expect(rafSpy).toHaveBeenCalled();
    expect(capturedCb).not.toBeNull();

    // Invoke captured callback
    capturedCb!(performance.now() + 16);
    expect(mockFacade.tick).toHaveBeenCalled();

    // Pause should stop loop
    mockFacade.isPlaying.set(false);
    fixture.detectChanges();

    expect(cancelSpy).toHaveBeenCalled();
    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  it('supports reloading a lesson cleanly without error (L)', async () => {
    await component.load('lessons/01-clean-architecture');
    expect(mockFacade.load).toHaveBeenCalledWith('lessons/01-clean-architecture');

    // Reload again
    await component.load('lessons/01-clean-architecture');
    expect(mockFacade.load).toHaveBeenCalledTimes(2);
  });
});
