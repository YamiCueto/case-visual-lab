import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { vi } from 'vitest';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';
import { OrchestratorFacadeSnapshot } from '../../application/orchestrator/orchestrator-facade.types';
import { InspectorPanelComponent } from './inspector-panel.component';

class MockOrchestratorFacade {
  readonly runtimeState: WritableSignal<string> = signal('READY');
  readonly playState: WritableSignal<string> = signal('STOPPED');
  readonly currentTime: WritableSignal<number> = signal(1500);
  readonly frameNumber: WritableSignal<number> = signal(90);
  readonly playbackSpeed: WritableSignal<number> = signal(1.0);
  readonly isReady: WritableSignal<boolean> = signal(true);
  readonly isPlaying: WritableSignal<boolean> = signal(false);
  readonly isPaused: WritableSignal<boolean> = signal(false);
  readonly isLoading: WritableSignal<boolean> = signal(false);
  readonly lastError: WritableSignal<string | null> = signal(null);

  readonly getSnapshot = vi.fn().mockImplementation((): OrchestratorFacadeSnapshot => ({
    runtimeState: 'READY',
    playState: 'STOPPED',
    currentTime: 1500,
    frameNumber: 90,
    playbackSpeed: 1.0,
    isReady: true,
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    lastError: null,
  }));

  readonly load = vi.fn().mockImplementation(async () => Promise.resolve());
}

describe('InspectorPanelComponent', () => {
  let fixture: ComponentFixture<InspectorPanelComponent>;
  let component: InspectorPanelComponent;
  let mockFacade: MockOrchestratorFacade;

  beforeEach(async () => {
    mockFacade = new MockOrchestratorFacade();

    await TestBed.configureTestingModule({
      imports: [InspectorPanelComponent],
      providers: [
        {
          provide: OrchestratorFacadeService,
          useValue: mockFacade,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectorPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the inspector panel component successfully', () => {
    expect(component).toBeDefined();
  });

  it('renders all structural sections and cards', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('#card-lifecycle')).not.toBeNull();
    expect(el.querySelector('#card-telemetry')).not.toBeNull();
    expect(el.querySelector('#card-flags')).not.toBeNull();
    expect(el.querySelector('#card-diagnostics')).not.toBeNull();
  });

  it('consumes orchestrator signals accurately', () => {
    expect(component.runtimeState()).toBe('READY');
    expect(component.playState()).toBe('STOPPED');
    expect(component.currentTime()).toBe(1500);
    expect(component.frameNumber()).toBe(90);
    expect(component.playbackSpeed()).toBe(1.0);
    expect(component.isReady()).toBe(true);
    expect(component.isPlaying()).toBe(false);
    expect(component.isPaused()).toBe(false);
    expect(component.isLoading()).toBe(false);
    expect(component.lastError()).toBeNull();
  });

  it('renders runtime states and flags accurately in the DOM', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('#inspector-runtime-state')?.textContent?.trim()).toBe('READY');
    expect(el.querySelector('#inspector-play-state')?.textContent?.trim()).toBe('STOPPED');

    const flagReady = el.querySelector('#flag-ready');
    const flagPlaying = el.querySelector('#flag-playing');
    expect(flagReady?.classList.contains('active')).toBe(true);
    expect(flagPlaying?.classList.contains('active')).toBe(false);
  });

  it('renders error state and health badge upon failure', () => {
    const el = fixture.nativeElement;
    const initialBadge = el.querySelector('#inspector-health-badge');
    expect(initialBadge?.textContent?.trim()).toBe('HEALTHY');
    expect(el.querySelector('#inspector-last-error')?.textContent?.trim()).toBe(
      'No errors detected',
    );

    mockFacade.lastError.set('Corrupted timeline stream');
    fixture.detectChanges();

    const errorBadge = el.querySelector('#inspector-health-badge');
    expect(errorBadge?.textContent?.trim()).toBe('ERROR');
    expect(errorBadge?.classList.contains('has-error')).toBe(true);
    expect(el.querySelector('#inspector-last-error')?.textContent?.trim()).toContain(
      'Corrupted timeline stream',
    );
  });

  it('updates the view reactively when signals change', () => {
    mockFacade.runtimeState.set('PLAYING');
    mockFacade.playState.set('PLAYING');
    mockFacade.currentTime.set(4500);
    mockFacade.frameNumber.set(270);
    mockFacade.playbackSpeed.set(2.0);
    mockFacade.isReady.set(false);
    mockFacade.isPlaying.set(true);

    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.querySelector('#inspector-runtime-state')?.textContent?.trim()).toBe('PLAYING');
    expect(el.querySelector('#inspector-play-state')?.textContent?.trim()).toBe('PLAYING');
    expect(el.querySelector('#inspector-current-time')?.textContent?.trim()).toBe('4500 ms');
    expect(el.querySelector('#inspector-current-frame')?.textContent?.trim()).toBe('270');
    expect(el.querySelector('#inspector-playback-speed')?.textContent?.trim()).toBe('2x');

    const flagReady = el.querySelector('#flag-ready');
    const flagPlaying = el.querySelector('#flag-playing');
    expect(flagReady?.classList.contains('active')).toBe(false);
    expect(flagPlaying?.classList.contains('active')).toBe(true);
  });

  it('delegates actions and snapshot solely to the facade', async () => {
    const snapshot = component.getSnapshot();
    expect(mockFacade.getSnapshot).toHaveBeenCalledTimes(1);
    expect(snapshot.runtimeState).toBe('READY');

    await component.load('exp-inspect');
    expect(mockFacade.load).toHaveBeenCalledWith('exp-inspect');
  });
});
