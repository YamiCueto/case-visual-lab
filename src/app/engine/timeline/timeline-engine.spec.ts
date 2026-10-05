import { describe, expect, it } from 'vitest';
import { RendererCommand } from '../behaviors/commands/renderer-command.types';
import { TimelineMarker } from './contracts/timeline-marker.types';
import { TimelineTrackDefinition } from './contracts/timeline-track.types';
import { TimelineEngine } from './timeline-engine';

describe('Timeline Execution Engine (Parallel Scheduler)', () => {
  const createTestTracks = (): TimelineTrackDefinition[] => [
    {
      id: 'track_visual',
      type: 'VISUAL',
      name: 'Main Visual Track',
      frames: [
        {
          id: 'vf_1',
          time: 100,
          duration: 200,
          commands: [
            {
              id: 'cmd_spawn_1',
              type: 'SPAWN_PARTICLE',
              targetId: 'node_a',
              payload: { color: 'blue' },
              durationMs: 0,
              easing: 'linear',
              priority: 'NORMAL',
            },
          ],
        },
        {
          id: 'vf_2',
          time: 300,
          duration: 100,
          commands: [
            {
              id: 'cmd_move_1',
              type: 'MOVE_PARTICLE',
              targetId: 'node_b',
              payload: {},
              durationMs: 100,
              easing: 'ease-out',
              priority: 'NORMAL',
            },
          ],
        },
      ],
    },
    {
      id: 'track_camera',
      type: 'CAMERA',
      name: 'Cinematic Camera',
      frames: [
        {
          id: 'cf_1',
          time: 100,
          duration: 300,
          commands: [
            {
              id: 'cmd_cam_focus',
              type: 'FOCUS_CAMERA',
              targetId: 'node_a',
              payload: { zoom: 1.5 },
              durationMs: 300,
              easing: 'ease-in-out',
              priority: 'HIGH',
            },
          ],
        },
      ],
    },
    {
      id: 'track_audio',
      type: 'AUDIO',
      name: 'Sound Effects Track',
      frames: [
        {
          id: 'af_1',
          time: 100,
          duration: 100,
          commands: [
            {
              id: 'cmd_audio_whoosh',
              type: 'PLAY_AUDIO_CUE',
              targetId: 'audio',
              payload: { cue: 'packet_whoosh' },
              durationMs: 100,
              easing: 'linear',
              priority: 'LOW',
            },
          ],
        },
      ],
    },
    {
      id: 'track_subtitle',
      type: 'SUBTITLE',
      name: 'Narration Subtitles',
      frames: [
        {
          id: 'sf_1',
          time: 200,
          duration: 150,
          commands: [
            {
              id: 'cmd_sub_update',
              type: 'UPDATE_BADGE',
              targetId: 'sub_box',
              payload: { text: 'Enviando petición HTTP...' },
              durationMs: 150,
              easing: 'linear',
              priority: 'NORMAL',
            },
          ],
        },
      ],
    },
  ];

  describe('Lifecycle Management', () => {
    it('should load tracks and compute maximum total duration', () => {
      const engine = new TimelineEngine();
      engine.load(createTestTracks());

      expect(engine.time()).toBe(0);
      expect(engine.state()).toBe('STOPPED');
      expect(engine.duration()).toBe(400); // cf_1: 100 + 300 = 400ms, vf_2: 300 + 100 = 400ms
      expect(engine.tracks()).toHaveLength(4);
    });

    it('should transition between PLAYING, PAUSED, and STOPPED states', () => {
      const engine = new TimelineEngine();
      engine.load(createTestTracks());

      engine.play();
      expect(engine.state()).toBe('PLAYING');

      engine.pause();
      expect(engine.state()).toBe('PAUSED');

      engine.resume();
      expect(engine.state()).toBe('PLAYING');

      engine.stop();
      expect(engine.state()).toBe('STOPPED');
      expect(engine.time()).toBe(0);
    });

    it('should not advance time when paused or stopped on tick', () => {
      const engine = new TimelineEngine();
      engine.load(createTestTracks());

      const resStopped = engine.tick(50);
      expect(resStopped.commands).toEqual([]);
      expect(engine.time()).toBe(0);

      engine.play();
      engine.pause();
      const resPaused = engine.tick(50);
      expect(resPaused.commands).toEqual([]);
      expect(engine.time()).toBe(0);
    });
  });

  describe('Parallel Tracks & Deterministic Scheduling', () => {
    it('should execute concurrent tracks in parallel and order commands deterministically', () => {
      const engine = new TimelineEngine();
      engine.load(createTestTracks());
      engine.play();

      // Tick from 0 to 150ms: captures all frames scheduled at t=100 (CAMERA, AUDIO, VISUAL)
      const res = engine.tick(150);

      expect(engine.time()).toBe(150);
      expect(res.commands).toHaveLength(3);

      // Verify deterministic priority ordering:
      // CAMERA (priority 100) -> AUDIO (priority 90) -> VISUAL (priority 80)
      expect(res.commands[0].id).toBe('cmd_cam_focus');
      expect(res.commands[0].type).toBe('FOCUS_CAMERA');

      expect(res.commands[1].id).toBe('cmd_audio_whoosh');
      expect(res.commands[1].type).toBe('PLAY_AUDIO_CUE');

      expect(res.commands[2].id).toBe('cmd_spawn_1');
      expect(res.commands[2].type).toBe('SPAWN_PARTICLE');
    });

    it('should dispatch subtitle and visual commands as timeline advances', () => {
      const engine = new TimelineEngine();
      engine.load(createTestTracks());
      engine.play();

      engine.tick(150); // t=150

      // Advance from 150 to 250ms: triggers SUBTITLE frame at t=200
      const res2 = engine.tick(100);
      expect(engine.time()).toBe(250);
      expect(res2.commands).toHaveLength(1);
      expect(res2.commands[0].id).toBe('cmd_sub_update');

      // Advance from 250 to 350ms: triggers VISUAL frame at t=300
      const res3 = engine.tick(100);
      expect(engine.time()).toBe(350);
      expect(res3.commands).toHaveLength(1);
      expect(res3.commands[0].id).toBe('cmd_move_1');
    });
  });

  describe('Barriers, Checkpoints, and Markers', () => {
    it('should halt parallel execution at exact barrier timestamp and pause engine', () => {
      const engine = new TimelineEngine();
      const barrierMarker: TimelineMarker = {
        id: 'barrier_sync_1',
        name: 'Wait for Network Handshake',
        time: 250,
        kind: 'BARRIER',
      };

      engine.load(createTestTracks(), [barrierMarker]);
      engine.play();

      // Tick attempting to jump directly to 350ms
      const res = engine.tick(350);

      // Must be stopped exactly at barrier time (250ms)
      expect(engine.time()).toBe(250);
      expect(engine.state()).toBe('PAUSED');
      expect(res.hitBarrier).toBeDefined();
      expect(res.hitBarrier?.id).toBe('barrier_sync_1');

      // Must execute commands up to 250ms, but NOT the command at t=300
      const commandIds = res.commands.map((c) => c.id);
      expect(commandIds).toContain('cmd_sub_update'); // t=200
      expect(commandIds).not.toContain('cmd_move_1'); // t=300

      // Resuming unblocks barrier
      engine.resume();
      expect(engine.state()).toBe('PLAYING');

      // Subsequent tick continues past barrier to 350ms
      const resAfterResume = engine.tick(100);
      expect(engine.time()).toBe(350);
      expect(resAfterResume.commands).toHaveLength(1);
      expect(resAfterResume.commands[0].id).toBe('cmd_move_1');
    });

    it('should detect pedagogical checkpoints and cue markers within tick window', () => {
      const engine = new TimelineEngine();
      const checkpoint: TimelineMarker = {
        id: 'checkpoint_1',
        name: 'Quiz Gate',
        time: 120,
        kind: 'CHECKPOINT',
      };
      const cue: TimelineMarker = {
        id: 'cue_1',
        name: 'Slide 2',
        time: 180,
        kind: 'CUE',
      };

      engine.load(createTestTracks(), [checkpoint, cue]);
      engine.play();

      const res = engine.tick(200);
      expect(res.activeMarkers).toHaveLength(2);
      expect(res.activeMarkers[0].id).toBe('checkpoint_1');
      expect(res.activeMarkers[1].id).toBe('cue_1');
    });
  });

  describe('Seek Operations', () => {
    it('should seek forward and backward accurately without timer dependencies', () => {
      const engine = new TimelineEngine();
      engine.load(createTestTracks());

      // Seek forward to 250ms
      const resForward = engine.seek(250);
      expect(engine.time()).toBe(250);
      expect(resForward.currentTimeMs).toBe(250);

      const forwardIds = resForward.commands.map((c) => c.id);
      expect(forwardIds).toContain('cmd_cam_focus');
      expect(forwardIds).toContain('cmd_sub_update');
      expect(forwardIds).not.toContain('cmd_move_1'); // t=300 is after 250ms

      // Seek backward to 150ms
      const resBackward = engine.seek(150);
      expect(engine.time()).toBe(150);
      const backwardIds = resBackward.commands.map((c) => c.id);
      expect(backwardIds).toContain('cmd_cam_focus');
      expect(backwardIds).not.toContain('cmd_sub_update'); // t=200 is after 150ms
    });

    it('should clamp seek target to [0, duration]', () => {
      const engine = new TimelineEngine();
      engine.load(createTestTracks());

      engine.seek(-100);
      expect(engine.time()).toBe(0);

      engine.seek(99999);
      expect(engine.time()).toBe(engine.duration());
      expect(engine.time()).toBe(400);
    });
  });

  describe('Snapshots and State Restoration', () => {
    it('should capture intermediate snapshot and restore state accurately', () => {
      const engine = new TimelineEngine();
      engine.load(createTestTracks());
      engine.play();

      engine.tick(150);
      const snapAt150 = engine.snapshot();
      expect(snapAt150.time).toBe(150);
      expect(snapAt150.state).toBe('PLAYING');

      // Advance to end
      engine.tick(250);
      expect(engine.time()).toBe(400);

      // Restore to 150ms
      engine.restore(snapAt150);
      expect(engine.time()).toBe(150);
      expect(engine.state()).toBe('PLAYING');

      // Advance again from restored checkpoint
      const resumed = engine.tick(100);
      expect(engine.time()).toBe(250);
      expect(resumed.commands).toHaveLength(1);
      expect(resumed.commands[0].id).toBe('cmd_sub_update');
    });
  });

  describe('Mathematical Determinism', () => {
    it('should produce identical command sequences and snapshots across independent runs', () => {
      const engine1 = new TimelineEngine();
      const engine2 = new TimelineEngine();

      engine1.load(createTestTracks());
      engine2.load(createTestTracks());

      engine1.play();
      engine2.play();

      const deltas = [50, 50, 100, 50, 50, 100];
      const commands1: RendererCommand[] = [];
      const commands2: RendererCommand[] = [];

      for (const dt of deltas) {
        commands1.push(...engine1.tick(dt).commands);
        commands2.push(...engine2.tick(dt).commands);
      }

      expect(engine1.time()).toBe(engine2.time());
      expect(commands1.map((c) => c.id)).toEqual(commands2.map((c) => c.id));
      expect(engine1.snapshot()).toEqual(engine2.snapshot());
    });
  });

  describe('Disposal', () => {
    it('should clear all tracks and markers upon disposal', () => {
      const engine = new TimelineEngine();
      engine.load(createTestTracks());

      expect(engine.isDisposed()).toBe(false);
      engine.dispose();
      expect(engine.isDisposed()).toBe(true);

      expect(() => engine.play()).toThrow(/disposed/);
      expect(() => engine.tick(50)).toThrow(/disposed/);
      expect(() => engine.seek(100)).toThrow(/disposed/);
      expect(() => engine.snapshot()).toThrow(/disposed/);
    });
  });
});
