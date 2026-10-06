import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { vi } from 'vitest';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';
import { TimelinePanelComponent } from './timeline-panel.component';

class MockOrchestratorFacade {
  readonly runtimeState: WritableSignal<string> = signal('READY');
  readonly playState: WritableSignal<string> = signal('PAUSED');
  readonly currentTime: WritableSignal<number> = signal(1000);
  readonly frameNumber: WritableSignal<number> = signal(60);
  readonly playbackSpeed: WritableSignal<number> = signal(1.0);
  readonly isReady: WritableSignal<boolean> = signal(true);
  readonly isPlaying: WritableSignal<boolean> = signal(false);
  readonly isPaused: WritableSignal<boolean> = signal(true);
  readonly isLoading: WritableSignal<boolean> = signal(false);
  readonly lastError: WritableSignal<string | null> = signal(null);

  readonly play = vi.fn();
  readonly pause = vi.fn();
  readonly resume = vi.fn();
  readonly stop = vi.fn();
  readonly seek = vi.fn().mockImplementation(async () => Promise.resolve());
  readonly setPlaybackSpeed = vi.fn();
}

describe('TimelinePanelComponent', () => {
  let fixture: ComponentFixture<TimelinePanelComponent>;
  let component: TimelinePanelComponent;
  let mockFacade: MockOrchestratorFacade;

  beforeEach(async () => {
    mockFacade = new MockOrchestratorFacade();

    await TestBed.configureTestingModule({
      imports: [TimelinePanelComponent],
      providers: [
        {
          provide: OrchestratorFacadeService,
          useValue: mockFacade,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimelinePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the timeline panel component successfully', () => {
    expect(component).toBeDefined();
  });

  it('renders all structural timeline elements', () => {
    const el = fixture.nativeElement;
    expect(el.querySelector('#timeline-current-time')).not.toBeNull();
    expect(el.querySelector('#timeline-frame-number')).not.toBeNull();
    expect(el.querySelector('#timeline-speed-value')).not.toBeNull();
    expect(el.querySelector('#timeline-runtime-state')).not.toBeNull();
    expect(el.querySelector('#timeline-play-state')).not.toBeNull();
    expect(el.querySelector('#timeline-visual-bar')).not.toBeNull();
    expect(el.querySelector('#timeline-progress-fill')).not.toBeNull();
    expect(el.querySelector('#timeline-playhead-marker')).not.toBeNull();
    expect(el.querySelector('#timeline-seek-slider')).not.toBeNull();
    expect(el.querySelector('#btn-play')).not.toBeNull();
    expect(el.querySelector('#btn-pause')).not.toBeNull();
    expect(el.querySelector('#btn-resume')).not.toBeNull();
    expect(el.querySelector('#btn-stop')).not.toBeNull();
    expect(el.querySelector('#timeline-speed-select')).not.toBeNull();
  });

  it('reflects facade signals and computes progress percent correctly', () => {
    expect(component.currentTime()).toBe(1000);
    expect(component.frameNumber()).toBe(60);
    expect(component.playbackSpeed()).toBe(1.0);
    expect(component.runtimeState()).toBe('READY');
    expect(component.playState()).toBe('PAUSED');
    expect(component.progressPercent()).toBe(10);
  });

  it('delegates transport button clicks to facade', () => {
    const el = fixture.nativeElement;
    el.querySelector('#btn-play')?.click();
    expect(mockFacade.play).toHaveBeenCalledTimes(1);

    el.querySelector('#btn-pause')?.click();
    expect(mockFacade.pause).toHaveBeenCalledTimes(1);

    el.querySelector('#btn-resume')?.click();
    expect(mockFacade.resume).toHaveBeenCalledTimes(1);

    el.querySelector('#btn-stop')?.click();
    expect(mockFacade.stop).toHaveBeenCalledTimes(1);
  });

  it('delegates programmatically called actions to facade', async () => {
    component.play();
    expect(mockFacade.play).toHaveBeenCalled();

    component.pause();
    expect(mockFacade.pause).toHaveBeenCalled();

    component.resume();
    expect(mockFacade.resume).toHaveBeenCalled();

    component.stop();
    expect(mockFacade.stop).toHaveBeenCalled();

    await component.seek(4000);
    expect(mockFacade.seek).toHaveBeenCalledWith(4000);

    component.setSpeed(1.5);
    expect(mockFacade.setPlaybackSpeed).toHaveBeenCalledWith(1.5);
  });

  it('delegates slider input events to seek action', async () => {
    const slider: HTMLInputElement | null =
      fixture.nativeElement.querySelector('#timeline-seek-slider');
    expect(slider).not.toBeNull();

    if (slider) {
      slider.value = '3500';
      slider.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(mockFacade.seek).toHaveBeenCalledWith(3500);
    }
  });

  it('delegates speed changes via buttons and select dropdown', () => {
    const btn2x: HTMLButtonElement | null = fixture.nativeElement.querySelector('#speed-btn-2');
    btn2x?.click();
    expect(mockFacade.setPlaybackSpeed).toHaveBeenCalledWith(2);

    const select: HTMLSelectElement | null =
      fixture.nativeElement.querySelector('#timeline-speed-select');
    if (select) {
      select.value = '0.5';
      select.dispatchEvent(new Event('change'));
      expect(mockFacade.setPlaybackSpeed).toHaveBeenCalledWith(0.5);
    }
  });

  it('updates the template reactively when facade signals change', () => {
    mockFacade.currentTime.set(5000);
    mockFacade.frameNumber.set(300);
    mockFacade.playbackSpeed.set(1.5);
    mockFacade.runtimeState.set('PLAYING');
    mockFacade.playState.set('PLAYING');

    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.querySelector('#timeline-current-time')?.textContent?.trim()).toBe('5000 ms');
    expect(el.querySelector('#timeline-frame-number')?.textContent?.trim()).toBe('300');
    expect(el.querySelector('#timeline-speed-value')?.textContent?.trim()).toBe('1.5x');
    expect(el.querySelector('#timeline-runtime-state')?.textContent?.trim()).toBe('PLAYING');
    expect(el.querySelector('#timeline-play-state')?.textContent?.trim()).toBe('PLAYING');
    expect(component.progressPercent()).toBe(50);

    const progressFill: HTMLElement | null = el.querySelector('#timeline-progress-fill');
    expect(progressFill?.style.width).toBe('50%');

    const marker: HTMLElement | null = el.querySelector('#timeline-playhead-marker');
    expect(marker?.style.left).toBe('50%');
  });
});
