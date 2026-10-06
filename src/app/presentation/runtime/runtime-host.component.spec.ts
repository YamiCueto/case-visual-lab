import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { vi } from 'vitest';
import { OrchestratorFacadeService } from '../../application/orchestrator/orchestrator-facade.service';
import { RuntimeHostComponent } from './runtime-host.component';

class MockOrchestratorFacade {
  readonly runtimeState: WritableSignal<string> = signal('READY');
  readonly playState: WritableSignal<string> = signal('PLAYING');
  readonly currentTime: WritableSignal<number> = signal(1250);
  readonly frameNumber: WritableSignal<number> = signal(75);
  readonly playbackSpeed: WritableSignal<number> = signal(1.5);
  readonly isReady: WritableSignal<boolean> = signal(true);
  readonly isPlaying: WritableSignal<boolean> = signal(true);
  readonly isPaused: WritableSignal<boolean> = signal(false);
  readonly isLoading: WritableSignal<boolean> = signal(false);
  readonly lastError: WritableSignal<string | null> = signal(null);

  readonly load = vi.fn().mockImplementation(async () => Promise.resolve());
  readonly play = vi.fn();
  readonly pause = vi.fn();
  readonly resume = vi.fn();
  readonly seek = vi.fn().mockImplementation(async () => Promise.resolve());
  readonly stop = vi.fn();
  readonly destroy = vi.fn().mockImplementation(async () => Promise.resolve());
  readonly tick = vi.fn();
  readonly dispose = vi.fn().mockImplementation(async () => Promise.resolve());
}

describe('RuntimeHostComponent', () => {
  let fixture: ComponentFixture<RuntimeHostComponent>;
  let component: RuntimeHostComponent;
  let mockFacade: MockOrchestratorFacade;

  beforeEach(async () => {
    mockFacade = new MockOrchestratorFacade();

    await TestBed.configureTestingModule({
      imports: [RuntimeHostComponent],
      providers: [
        {
          provide: OrchestratorFacadeService,
          useValue: mockFacade,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RuntimeHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component successfully', () => {
    expect(component).toBeDefined();
  });

  it('injects the orchestrator facade correctly', () => {
    expect(component.facade).toBeDefined();
    expect(component.facade).toBe(mockFacade as unknown as OrchestratorFacadeService);
  });

  it('renders the runtime state and play state accurately', () => {
    const runtimeStateEl = fixture.nativeElement.querySelector('#runtime-state-value');
    const playStateEl = fixture.nativeElement.querySelector('#play-state-value');

    expect(runtimeStateEl?.textContent?.trim()).toBe('READY');
    expect(playStateEl?.textContent?.trim()).toBe('PLAYING');
  });

  it('renders virtual time accurately', () => {
    const timeEl = fixture.nativeElement.querySelector('#current-time-value');
    expect(timeEl?.textContent?.trim()).toBe('1250 ms');
  });

  it('renders current frame number accurately', () => {
    const frameEl = fixture.nativeElement.querySelector('#frame-number-value');
    expect(frameEl?.textContent?.trim()).toBe('75');
  });

  it('renders playback speed accurately', () => {
    const speedEl = fixture.nativeElement.querySelector('#playback-speed-value');
    expect(speedEl?.textContent?.trim()).toBe('1.5x');
  });

  it('delegates load action to the facade', async () => {
    await component.load('exp-test');
    expect(mockFacade.load).toHaveBeenCalledWith('exp-test');
  });

  it('delegates play action to the facade', () => {
    component.play();
    expect(mockFacade.play).toHaveBeenCalledTimes(1);
  });

  it('delegates pause action to the facade', () => {
    component.pause();
    expect(mockFacade.pause).toHaveBeenCalledTimes(1);
  });

  it('delegates resume action to the facade', () => {
    component.resume();
    expect(mockFacade.resume).toHaveBeenCalledTimes(1);
  });

  it('delegates seek action to the facade', async () => {
    await component.seek(2500);
    expect(mockFacade.seek).toHaveBeenCalledWith(2500);
  });

  it('delegates stop action to the facade', () => {
    component.stop();
    expect(mockFacade.stop).toHaveBeenCalledTimes(1);
  });

  it('delegates destroy action to the facade', async () => {
    await component.destroy();
    expect(mockFacade.destroy).toHaveBeenCalledTimes(1);
  });

  it('delegates tick action to the facade', () => {
    component.tick(33);
    expect(mockFacade.tick).toHaveBeenCalledWith(33);
  });

  it('delegates button clicks from the template to facade actions', async () => {
    const playBtn = fixture.nativeElement.querySelector('#btn-play');
    const pauseBtn = fixture.nativeElement.querySelector('#btn-pause');
    const resumeBtn = fixture.nativeElement.querySelector('#btn-resume');
    const seekBtn = fixture.nativeElement.querySelector('#btn-seek');
    const stopBtn = fixture.nativeElement.querySelector('#btn-stop');
    const tickBtn = fixture.nativeElement.querySelector('#btn-tick');
    const destroyBtn = fixture.nativeElement.querySelector('#btn-destroy');

    playBtn?.click();
    expect(mockFacade.play).toHaveBeenCalled();

    pauseBtn?.click();
    expect(mockFacade.pause).toHaveBeenCalled();

    resumeBtn?.click();
    expect(mockFacade.resume).toHaveBeenCalled();

    seekBtn?.click();
    expect(mockFacade.seek).toHaveBeenCalledWith(1000);

    stopBtn?.click();
    expect(mockFacade.stop).toHaveBeenCalled();

    tickBtn?.click();
    expect(mockFacade.tick).toHaveBeenCalledWith(16);

    destroyBtn?.click();
    expect(mockFacade.destroy).toHaveBeenCalled();
  });

  it('updates the view automatically when signals change', () => {
    mockFacade.runtimeState.set('PAUSED');
    mockFacade.playState.set('PAUSED');
    mockFacade.currentTime.set(4000);
    mockFacade.frameNumber.set(240);
    mockFacade.playbackSpeed.set(0.5);
    mockFacade.isReady.set(false);
    mockFacade.isPlaying.set(false);
    mockFacade.isPaused.set(true);

    fixture.detectChanges();

    const runtimeStateEl = fixture.nativeElement.querySelector('#runtime-state-value');
    const playStateEl = fixture.nativeElement.querySelector('#play-state-value');
    const timeEl = fixture.nativeElement.querySelector('#current-time-value');
    const frameEl = fixture.nativeElement.querySelector('#frame-number-value');
    const speedEl = fixture.nativeElement.querySelector('#playback-speed-value');
    const flagsEl = fixture.nativeElement.querySelector('#flags-value');

    expect(runtimeStateEl?.textContent?.trim()).toBe('PAUSED');
    expect(playStateEl?.textContent?.trim()).toBe('PAUSED');
    expect(timeEl?.textContent?.trim()).toBe('4000 ms');
    expect(frameEl?.textContent?.trim()).toBe('240');
    expect(speedEl?.textContent?.trim()).toBe('0.5x');
    expect(flagsEl?.textContent).toContain('Paused: true');
    expect(flagsEl?.textContent).toContain('Playing: false');
  });

  it('renders error alert when lastError signal contains a message', () => {
    mockFacade.lastError.set('Simulated pipeline error');
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('#last-error-value');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent?.trim()).toBe('Simulated pipeline error');
  });
});
