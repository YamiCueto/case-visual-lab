import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { vi } from 'vitest';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';
import { ToolbarComponent } from './toolbar.component';

class MockOrchestratorFacade {
  readonly runtimeState: WritableSignal<string> = signal('READY');
  readonly playState: WritableSignal<string> = signal('STOPPED');
  readonly currentTime: WritableSignal<number> = signal(0);
  readonly playbackSpeed: WritableSignal<number> = signal(1.0);
  readonly isReady: WritableSignal<boolean> = signal(true);
  readonly isPlaying: WritableSignal<boolean> = signal(false);
  readonly isPaused: WritableSignal<boolean> = signal(false);
  readonly isLoading: WritableSignal<boolean> = signal(false);
  readonly lastError: WritableSignal<string | null> = signal(null);

  readonly load = vi.fn().mockImplementation(async () => Promise.resolve());
  readonly play = vi.fn();
  readonly pause = vi.fn();
  readonly resume = vi.fn();
  readonly stop = vi.fn();
  readonly setPlaybackSpeed = vi.fn();
}

describe('ToolbarComponent', () => {
  let fixture: ComponentFixture<ToolbarComponent>;
  let component: ToolbarComponent;
  let mockFacade: MockOrchestratorFacade;

  beforeEach(async () => {
    mockFacade = new MockOrchestratorFacade();

    await TestBed.configureTestingModule({
      imports: [ToolbarComponent],
      providers: [
        {
          provide: OrchestratorFacadeService,
          useValue: mockFacade,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the toolbar component successfully', () => {
    expect(component).toBeDefined();
  });

  it('renders experience title, telemetry badges, and transport buttons', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('#toolbar-experience-title')?.textContent?.trim()).toBe(
      'CASE Visual Lab Experience',
    );
    expect(el.querySelector('#toolbar-runtime-state')?.textContent?.trim()).toBe('READY');
    expect(el.querySelector('#toolbar-play-state')?.textContent?.trim()).toBe('STOPPED');
    expect(el.querySelector('#toolbar-current-time')?.textContent?.trim()).toBe('0 ms');
    expect(el.querySelector('#toolbar-btn-load')).not.toBeNull();
    expect(el.querySelector('#toolbar-btn-play')).not.toBeNull();
    expect(el.querySelector('#toolbar-btn-pause')).not.toBeNull();
    expect(el.querySelector('#toolbar-btn-resume')).not.toBeNull();
    expect(el.querySelector('#toolbar-btn-stop')).not.toBeNull();
    expect(el.querySelector('#toolbar-speed-select')).not.toBeNull();
  });

  it('delegates transport button clicks to facade methods', () => {
    const el = fixture.nativeElement;
    el.querySelector('#toolbar-btn-load')?.click();
    expect(mockFacade.load).toHaveBeenCalledWith('default');

    el.querySelector('#toolbar-btn-play')?.click();
    expect(mockFacade.play).toHaveBeenCalledTimes(1);

    el.querySelector('#toolbar-btn-pause')?.click();
    expect(mockFacade.pause).toHaveBeenCalledTimes(1);

    el.querySelector('#toolbar-btn-resume')?.click();
    expect(mockFacade.resume).toHaveBeenCalledTimes(1);

    el.querySelector('#toolbar-btn-stop')?.click();
    expect(mockFacade.stop).toHaveBeenCalledTimes(1);
  });

  it('delegates speed changes via pills and select dropdown', () => {
    const el = fixture.nativeElement;
    const pill15: HTMLButtonElement | null = el.querySelector('button[data-speed="1.5"]');
    pill15?.click();
    expect(mockFacade.setPlaybackSpeed).toHaveBeenCalledWith(1.5);

    const select: HTMLSelectElement | null = el.querySelector('#toolbar-speed-select');
    if (select) {
      select.value = '2';
      select.dispatchEvent(new Event('change'));
      expect(mockFacade.setPlaybackSpeed).toHaveBeenCalledWith(2);
    }
  });

  it('delegates programmatically called actions correctly', async () => {
    await component.load('custom-experience');
    expect(mockFacade.load).toHaveBeenCalledWith('custom-experience');

    component.play();
    expect(mockFacade.play).toHaveBeenCalled();

    component.pause();
    expect(mockFacade.pause).toHaveBeenCalled();

    component.resume();
    expect(mockFacade.resume).toHaveBeenCalled();

    component.stop();
    expect(mockFacade.stop).toHaveBeenCalled();

    component.setSpeed(0.5);
    expect(mockFacade.setPlaybackSpeed).toHaveBeenCalledWith(0.5);
  });

  it('updates the view reactively when signals change', () => {
    mockFacade.runtimeState.set('PLAYING');
    mockFacade.playState.set('PLAYING');
    mockFacade.currentTime.set(3400);
    mockFacade.playbackSpeed.set(2.0);
    mockFacade.isPlaying.set(true);

    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.querySelector('#toolbar-runtime-state')?.textContent?.trim()).toBe('PLAYING');
    expect(el.querySelector('#toolbar-play-state')?.textContent?.trim()).toBe('PLAYING');
    expect(el.querySelector('#toolbar-current-time')?.textContent?.trim()).toBe('3400 ms');

    const pill2: HTMLButtonElement | null = el.querySelector('button[data-speed="2"]');
    expect(pill2?.classList.contains('active')).toBe(true);
  });

  it('reflects visual states on active play and pause buttons', () => {
    const el = fixture.nativeElement;
    const playBtn = el.querySelector('#toolbar-btn-play');
    const pauseBtn = el.querySelector('#toolbar-btn-pause');

    expect(playBtn?.classList.contains('active')).toBe(false);
    expect(pauseBtn?.classList.contains('active')).toBe(false);

    mockFacade.isPlaying.set(true);
    mockFacade.isPaused.set(false);
    fixture.detectChanges();
    expect(playBtn?.classList.contains('active')).toBe(true);
    expect(pauseBtn?.classList.contains('active')).toBe(false);

    mockFacade.isPlaying.set(false);
    mockFacade.isPaused.set(true);
    fixture.detectChanges();
    expect(playBtn?.classList.contains('active')).toBe(false);
    expect(pauseBtn?.classList.contains('active')).toBe(true);
  });
});
