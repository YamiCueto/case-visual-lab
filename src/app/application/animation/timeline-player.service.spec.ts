import { TestBed } from '@angular/core/testing';
import { AnimationTimeline } from '../../domain/animation/animation.interface';
import { TimelinePlayerService } from './timeline-player.service';

const MOCK_TIMELINE: AnimationTimeline = {
  id: 'test_timeline',
  title: 'Test Timeline',
  description: 'Testing timeline engine',
  totalFrames: 3,
  defaultSpeed: 1,
  nodePositions: {
    node_a: { x: 100, y: 100 },
    node_b: { x: 200, y: 200 },
  },
  frames: [
    {
      frameIndex: 0,
      title: 'Frame 0',
      description: 'First frame',
      activeNodeIds: ['node_a'],
      durationMs: 1000,
      packets: [],
    },
    {
      frameIndex: 1,
      title: 'Frame 1',
      description: 'Second frame',
      activeNodeIds: ['node_b'],
      durationMs: 1000,
      packets: [],
    },
    {
      frameIndex: 2,
      title: 'Frame 2',
      description: 'Third frame',
      activeNodeIds: ['node_a', 'node_b'],
      durationMs: 1000,
      packets: [],
    },
  ],
};

describe('TimelinePlayerService', () => {
  let player: TimelinePlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    player = TestBed.inject(TimelinePlayerService);
  });

  afterEach(() => {
    player.reset();
  });

  it('initializes with idle state and null timeline', () => {
    expect(player.timeline()).toBeNull();
    expect(player.currentFrameIndex()).toBe(0);
    expect(player.status()).toBe('idle');
    expect(player.isPlaying()).toBe(false);
  });

  it('loads timeline and emits frame 0', () => {
    player.loadTimeline(MOCK_TIMELINE);

    expect(player.timeline()?.id).toBe('test_timeline');
    expect(player.totalFrames()).toBe(3);
    expect(player.currentFrame()?.title).toBe('Frame 0');
    expect(player.progressPct()).toBe(0);
  });

  it('steps forward and backward through frames', () => {
    player.loadTimeline(MOCK_TIMELINE);

    player.stepNext();
    expect(player.currentFrameIndex()).toBe(1);
    expect(player.currentFrame()?.title).toBe('Frame 1');
    expect(player.progressPct()).toBe(50);

    player.stepNext();
    expect(player.currentFrameIndex()).toBe(2);
    expect(player.currentFrame()?.title).toBe('Frame 2');
    expect(player.progressPct()).toBe(100);

    // Bounded at last frame
    player.stepNext();
    expect(player.currentFrameIndex()).toBe(2);

    player.stepPrevious();
    expect(player.currentFrameIndex()).toBe(1);
  });

  it('seeks directly to specified frame index', () => {
    player.loadTimeline(MOCK_TIMELINE);

    player.seek(2);
    expect(player.currentFrameIndex()).toBe(2);

    player.seek(0);
    expect(player.currentFrameIndex()).toBe(0);
  });

  it('adjusts playback speed within valid bounds', () => {
    player.loadTimeline(MOCK_TIMELINE);

    player.setSpeed(2);
    expect(player.speed()).toBe(2);

    player.setSpeed(0.5);
    expect(player.speed()).toBe(0.5);
  });

  it('resets back to frame 0 and idle status', () => {
    player.loadTimeline(MOCK_TIMELINE);
    player.stepNext();
    expect(player.currentFrameIndex()).toBe(1);

    player.reset();
    expect(player.currentFrameIndex()).toBe(0);
    expect(player.status()).toBe('idle');
  });
});
