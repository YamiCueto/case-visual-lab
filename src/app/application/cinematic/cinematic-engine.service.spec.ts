import { TestBed } from '@angular/core/testing';
import { CameraPort } from '../../domain/cinematic/camera.interface';
import { CinematicTimeline } from '../../domain/cinematic/cinematic-frame.interface';
import { CinematicEngineService } from './cinematic-engine.service';

const MOCK_CINEMATIC_TIMELINE: CinematicTimeline = {
  id: 'timeline_saga',
  title: 'Distributed Saga Pattern',
  sceneId: 'scene_saga_1',
  defaultSpeed: 1,
  frames: [
    {
      id: 'frame_1',
      frameIndex: 0,
      durationMs: 1500,
      narrative: {
        title: 'Order Placed',
        description: 'Client triggers order saga',
        narrative: { text: 'Iniciando coreografía del patrón Saga.' },
        explanation: 'El orquestador emite el comando de reserva de fondos.',
      },
      camera: { type: 'focus', targetNodeId: 'node_order' },
      behaviors: [
        { id: 'b_1', type: 'event-publish', targetNodeId: 'node_order', durationMs: 1000 },
      ],
      entities: [],
      stateMutations: [{ nodeId: 'node_order', status: 'processing', badgeText: 'PENDING' }],
    },
    {
      id: 'frame_2',
      frameIndex: 1,
      durationMs: 1500,
      narrative: {
        title: 'Payment Processed',
        description: 'Payment microservice reserves funds',
        narrative: { text: 'El microservicio de pagos responde afirmativamente.' },
        explanation: 'Transacción completada satisfactoriamente en Stripe.',
      },
      camera: { type: 'zoom', targetNodeId: 'node_payment', zoomLevel: 1.8 },
      behaviors: [{ id: 'b_2', type: 'success', targetNodeId: 'node_payment', durationMs: 1000 }],
      entities: [],
      stateMutations: [
        { nodeId: 'node_order', status: 'processing', badgeText: 'PENDING' },
        { nodeId: 'node_payment', status: 'success', badgeText: 'PAID' },
      ],
    },
  ],
};

describe('CinematicEngineService', () => {
  let engine: CinematicEngineService;
  let mockCamera: CameraPort;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    engine = TestBed.inject(CinematicEngineService);

    mockCamera = {
      focus: vi.fn(),
      zoom: vi.fn(),
      highlight: vi.fn(),
      fade: vi.fn(),
      orbit: vi.fn(),
      shake: vi.fn(),
      fitScene: vi.fn(),
      follow: vi.fn(),
      center: vi.fn(),
      execute: vi.fn(),
      reset: vi.fn(),
    };
    engine.registerCameraPort(mockCamera);
  });

  afterEach(() => {
    engine.reset();
  });

  it('initializes with null timeline and frame 0', () => {
    expect(engine.timeline()).toBeNull();
    expect(engine.currentFrameIndex()).toBe(0);
    expect(engine.isPlaying()).toBe(false);
  });

  it('loads timeline, dispatches camera action and applies live state mutations', () => {
    engine.loadTimeline(MOCK_CINEMATIC_TIMELINE);

    expect(engine.timeline()?.id).toBe('timeline_saga');
    expect(engine.totalFrames()).toBe(2);
    expect(engine.currentFrame()?.id).toBe('frame_1');
    expect(mockCamera.execute).toHaveBeenCalledWith({ type: 'focus', targetNodeId: 'node_order' });

    const liveStates = engine.liveStateMap();
    expect(liveStates.has('node_order')).toBe(true);
    expect(liveStates.get('node_order')?.status).toBe('processing');
  });

  it('steps forward and applies frame 2 mutations and camera zoom', () => {
    engine.loadTimeline(MOCK_CINEMATIC_TIMELINE);
    engine.stepNext();

    expect(engine.currentFrameIndex()).toBe(1);
    expect(engine.currentFrame()?.id).toBe('frame_2');
    expect(mockCamera.execute).toHaveBeenCalledWith({
      type: 'zoom',
      targetNodeId: 'node_payment',
      zoomLevel: 1.8,
    });

    const liveStates = engine.liveStateMap();
    expect(liveStates.get('node_payment')?.status).toBe('success');
    expect(liveStates.get('node_payment')?.badgeText).toBe('PAID');
  });

  it('modulates playback speed within bounds', () => {
    engine.loadTimeline(MOCK_CINEMATIC_TIMELINE);

    engine.setSpeed(2);
    expect(engine.speed()).toBe(2);

    engine.setSpeed(0.5);
    expect(engine.speed()).toBe(0.5);
  });

  it('resets state and triggers camera reset', () => {
    engine.loadTimeline(MOCK_CINEMATIC_TIMELINE);
    engine.stepNext();
    expect(engine.currentFrameIndex()).toBe(1);

    engine.reset();
    expect(engine.currentFrameIndex()).toBe(0);
    expect(mockCamera.reset).toHaveBeenCalled();
  });
});
