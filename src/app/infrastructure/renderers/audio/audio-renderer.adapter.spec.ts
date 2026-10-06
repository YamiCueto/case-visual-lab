import { beforeEach, describe, expect, it } from 'vitest';
import { RendererCommand } from '../../../engine/behaviors/commands/renderer-command.types';
import { RendererBatch } from '../../../engine/rendering/contracts/renderer-batch.types';
import { WebAudioRendererAdapter } from './adapter/web-audio-renderer.adapter';
import { AudioRenderContext } from './contracts/audio-render-context.interface';
import { AudioScene } from './contracts/audio-scene.interface';
import { AudioCueState, AudioState, DEFAULT_AUDIO_STATE } from './contracts/audio-state.interface';
import { AudioCommandMapper } from './mapping/audio-command-mapper';
import { AudioDiff } from './mapping/audio-diff';

class FakeAudioScene implements AudioScene {
  private state: AudioState = { ...DEFAULT_AUDIO_STATE };
  readonly playedCues: AudioCueState[] = [];
  readonly stoppedCues: string[] = [];
  readonly volumeCalls: number[] = [];
  readonly muteCalls: boolean[] = [];
  resetCount = 0;

  getState(): AudioState {
    return { ...this.state };
  }

  playCue(cue: AudioCueState): void {
    this.playedCues.push({ ...cue });
    this.state = {
      ...this.state,
      activeCues: {
        ...this.state.activeCues,
        [cue.cueId]: { ...cue },
      },
    };
  }

  stopCue(cueId: string): void {
    this.stoppedCues.push(cueId);
    const next = { ...this.state.activeCues };
    delete next[cueId];
    this.state = {
      ...this.state,
      activeCues: next,
    };
  }

  setMasterVolume(volume: number): void {
    this.volumeCalls.push(volume);
    this.state = {
      ...this.state,
      masterVolume: volume,
    };
  }

  setMuted(muted: boolean): void {
    this.muteCalls.push(muted);
    this.state = {
      ...this.state,
      muted,
    };
  }

  reset(): void {
    this.resetCount++;
    this.state = { ...DEFAULT_AUDIO_STATE };
  }
}

describe('WebAudioRendererAdapter Subsystem', () => {
  let scene: FakeAudioScene;
  let adapter: WebAudioRendererAdapter;
  let mapper: AudioCommandMapper;
  let diff: AudioDiff;

  beforeEach(() => {
    scene = new FakeAudioScene();
    adapter = new WebAudioRendererAdapter(scene);
    adapter.initialize();
    mapper = new AudioCommandMapper();
    diff = new AudioDiff();
  });

  describe('Contract and Command Support', () => {
    it('should implement RendererPort properties and default priority', () => {
      expect(adapter.id).toBe('web-audio-renderer');
      expect(adapter.priority).toBe(30);
      expect(adapter.isDisposed()).toBe(false);
      expect(adapter.getCurrentState()).toEqual(DEFAULT_AUDIO_STATE);
    });

    it('should support audio discrete commands', () => {
      const supported = [
        'PLAY_AUDIO_CUE',
        'STOP_AUDIO_CUE',
        'SET_AUDIO_VOLUME',
        'MUTE_AUDIO',
        'UNMUTE_AUDIO',
      ];

      for (const type of supported) {
        const cmd = {
          id: 'c1',
          type,
          targetId: 'cue_1',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        } as unknown as RendererCommand;

        expect(adapter.supports(cmd)).toBe(true);
      }
    });

    it('should reject foreign commands for graphics, camera, or particles', () => {
      const foreign = [
        'SPAWN_PARTICLE',
        'MOVE_PARTICLE',
        'DESTROY_PARTICLE',
        'HIGHLIGHT_NODE',
        'UPDATE_BADGE',
        'FOCUS_CAMERA',
        'MOVE_CAMERA',
        'ZOOM_CAMERA',
      ];

      for (const type of foreign) {
        const cmd = {
          id: 'c_foreign',
          type,
          targetId: 't1',
          payload: {},
          durationMs: 0,
          easing: 'linear',
          priority: 'NORMAL',
        } as unknown as RendererCommand;

        expect(adapter.supports(cmd)).toBe(false);
        expect(mapper.mapCommand(cmd)).toBeNull();
      }
    });

    it('should return false for null or malformed commands', () => {
      expect(adapter.supports(null as unknown as RendererCommand)).toBe(false);
      expect(adapter.supports({} as unknown as RendererCommand)).toBe(false);
    });
  });

  describe('AudioCommandMapper', () => {
    it('should map PLAY_AUDIO_CUE with volume clamping, loop and soundUri', () => {
      const cmd: RendererCommand = {
        id: 'cmd_play',
        type: 'PLAY_AUDIO_CUE',
        targetId: 'channel_sfx',
        payload: {
          cueId: 'packet_send_ch',
          soundUri: '/assets/sounds/send.mp3',
          soundType: 'sfx',
          volume: 1.5,
          loop: true,
          playbackRate: 1.2,
        },
        durationMs: 200,
        easing: 'linear',
        priority: 'NORMAL',
      };

      const result = mapper.mapCommand(cmd, DEFAULT_AUDIO_STATE, 500);
      expect(result).not.toBeNull();
      const cue = result?.activeCues['packet_send_ch'];
      expect(cue).toBeDefined();
      expect(cue?.cueId).toBe('packet_send_ch');
      expect(cue?.soundUri).toBe('/assets/sounds/send.mp3');
      expect(cue?.volume).toBe(1.0);
      expect(cue?.loop).toBe(true);
      expect(cue?.playbackRate).toBe(1.2);
      expect(cue?.isPlaying).toBe(true);
      expect(cue?.startedAtVirtualTime).toBe(500);
    });

    it('should map STOP_AUDIO_CUE removing cue from activeCues', () => {
      const stateWithCue: AudioState = {
        masterVolume: 1.0,
        muted: false,
        activeCues: {
          ch1: {
            cueId: 'ch1',
            volume: 1.0,
            loop: false,
            isPlaying: true,
          },
        },
      };

      const cmd = {
        id: 'cmd_stop',
        type: 'STOP_AUDIO_CUE' as unknown as RendererCommand['type'],
        targetId: 'ch1',
        payload: {},
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const result = mapper.mapCommand(cmd, stateWithCue);
      expect(result?.activeCues['ch1']).toBeUndefined();
    });

    it('should map SET_AUDIO_VOLUME clamping to [0, 1]', () => {
      const cmd1 = {
        id: 'c1',
        type: 'SET_AUDIO_VOLUME' as unknown as RendererCommand['type'],
        targetId: '',
        payload: { volume: 0.6 },
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const res1 = mapper.mapCommand(cmd1, DEFAULT_AUDIO_STATE);
      expect(res1?.masterVolume).toBe(0.6);

      const cmd2 = {
        id: 'c2',
        type: 'SET_AUDIO_VOLUME' as unknown as RendererCommand['type'],
        targetId: '',
        payload: { level: -0.5 },
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const res2 = mapper.mapCommand(cmd2, DEFAULT_AUDIO_STATE);
      expect(res2?.masterVolume).toBe(0.0);
    });

    it('should map MUTE_AUDIO and UNMUTE_AUDIO commands', () => {
      const muteCmd = {
        id: 'm1',
        type: 'MUTE_AUDIO' as unknown as RendererCommand['type'],
        targetId: '',
        payload: {},
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const mutedState = mapper.mapCommand(muteCmd, DEFAULT_AUDIO_STATE);
      expect(mutedState?.muted).toBe(true);

      const unmuteCmd = {
        id: 'u1',
        type: 'UNMUTE_AUDIO' as unknown as RendererCommand['type'],
        targetId: '',
        payload: {},
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      } as unknown as RendererCommand;

      const unmutedState = mapper.mapCommand(unmuteCmd, mutedState!);
      expect(unmutedState?.muted).toBe(false);
    });
  });

  describe('AudioDiff', () => {
    it('should detect zero changes for identical audio states', () => {
      const state1: AudioState = {
        masterVolume: 0.8,
        muted: false,
        activeCues: {
          ch1: { cueId: 'ch1', volume: 0.5, loop: false, isPlaying: true },
        },
      };
      const state2: AudioState = {
        masterVolume: 0.8,
        muted: false,
        activeCues: {
          ch1: { cueId: 'ch1', volume: 0.5, loop: false, isPlaying: true },
        },
      };

      const result = diff.computeDiff(state1, state2);
      expect(result.hasChanges).toBe(false);
      expect(result.masterVolumeChanged).toBe(false);
      expect(result.mutedChanged).toBe(false);
      expect(result.cuesToPlay.length).toBe(0);
      expect(result.cuesToStop.length).toBe(0);
    });

    it('should detect volume change and mute toggle', () => {
      const state1: AudioState = {
        masterVolume: 1.0,
        muted: false,
        activeCues: {},
      };
      const state2: AudioState = {
        masterVolume: 0.4,
        muted: true,
        activeCues: {},
      };

      const result = diff.computeDiff(state1, state2);
      expect(result.hasChanges).toBe(true);
      expect(result.masterVolumeChanged).toBe(true);
      expect(result.mutedChanged).toBe(true);
    });

    it('should detect cues to play and cues to stop', () => {
      const state1: AudioState = {
        masterVolume: 1.0,
        muted: false,
        activeCues: {
          c_old: { cueId: 'c_old', volume: 1.0, loop: false, isPlaying: true },
        },
      };
      const state2: AudioState = {
        masterVolume: 1.0,
        muted: false,
        activeCues: {
          c_new: { cueId: 'c_new', volume: 0.7, loop: true, isPlaying: true },
        },
      };

      const result = diff.computeDiff(state1, state2);
      expect(result.hasChanges).toBe(true);
      expect(result.cuesToPlay.length).toBe(1);
      expect(result.cuesToPlay[0].cueId).toBe('c_new');
      expect(result.cuesToStop.length).toBe(1);
      expect(result.cuesToStop[0]).toBe('c_old');
    });
  });

  describe('WebAudioRendererAdapter Rendering and Integration', () => {
    it('should render PLAY_AUDIO_CUE batch and invoke scene.playCue', () => {
      const batch: RendererBatch = {
        batchId: 'b_audio_1',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 100,
        commands: [
          {
            id: 'c1',
            type: 'PLAY_AUDIO_CUE',
            targetId: 'snd_click',
            payload: { soundUri: '/sfx/click.ogg', volume: 0.8 },
            durationMs: 50,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      adapter.render(batch);

      expect(scene.playedCues.length).toBe(1);
      expect(scene.playedCues[0].cueId).toBe('snd_click');
      expect(scene.playedCues[0].volume).toBe(0.8);
      expect(adapter.getRenderCount()).toBe(1);
      expect(adapter.getLastRenderedBatchId()).toBe('b_audio_1');
    });

    it('should render STOP_AUDIO_CUE batch and invoke scene.stopCue', () => {
      // First play cue
      adapter.render({
        batchId: 'b_play',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'PLAY_AUDIO_CUE',
            targetId: 'ambient_loop',
            payload: { loop: true },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(scene.playedCues.length).toBe(1);

      // Now stop cue
      adapter.render({
        batchId: 'b_stop',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 500,
        commands: [
          {
            id: 'c2',
            type: 'STOP_AUDIO_CUE' as unknown as RendererCommand['type'],
            targetId: 'ambient_loop',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
        ],
      });

      expect(scene.stoppedCues.length).toBe(1);
      expect(scene.stoppedCues[0]).toBe('ambient_loop');
    });

    it('should render SET_AUDIO_VOLUME and MUTE/UNMUTE batches', () => {
      adapter.render({
        batchId: 'b_vol',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'v1',
            type: 'SET_AUDIO_VOLUME' as unknown as RendererCommand['type'],
            targetId: '',
            payload: { volume: 0.25 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
          {
            id: 'm1',
            type: 'MUTE_AUDIO' as unknown as RendererCommand['type'],
            targetId: '',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
        ],
      });

      expect(scene.volumeCalls).toContain(0.25);
      expect(scene.muteCalls).toContain(true);
      expect(adapter.getCurrentState().muted).toBe(true);
      expect(adapter.getCurrentState().masterVolume).toBe(0.25);
    });

    it('should safely ignore non-audio commands leaving scene untouched', () => {
      const batch: RendererBatch = {
        batchId: 'b_graphics',
        rendererId: 'excalidraw-renderer',
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'g1',
            type: 'HIGHLIGHT_NODE',
            targetId: 'n1',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      };

      adapter.render(batch);
      expect(scene.playedCues.length).toBe(0);
      expect(scene.volumeCalls.length).toBe(0);
      expect(adapter.getLastRenderedBatchId()).toBe('b_graphics');
    });

    it('should be idempotent when receiving identical audio commands', () => {
      const batch: RendererBatch = {
        batchId: 'b_vol_idem',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'v1',
            type: 'SET_AUDIO_VOLUME' as unknown as RendererCommand['type'],
            targetId: '',
            payload: { volume: 0.5 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
        ],
      };

      adapter.render(batch);
      expect(scene.volumeCalls.length).toBe(1);

      // Duplicate batch
      adapter.render(batch);
      expect(scene.volumeCalls.length).toBe(1); // No redundant volume call
    });

    it('should process multi-command audio batches deterministically in sequence', () => {
      const batch: RendererBatch = {
        batchId: 'b_seq',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'PLAY_AUDIO_CUE',
            targetId: 'sfx_1',
            payload: { volume: 0.9 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
          {
            id: 'c2',
            type: 'SET_AUDIO_VOLUME' as unknown as RendererCommand['type'],
            targetId: '',
            payload: { volume: 0.7 },
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
          {
            id: 'c3',
            type: 'STOP_AUDIO_CUE' as unknown as RendererCommand['type'],
            targetId: 'sfx_1',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
        ],
      };

      adapter.render(batch);

      expect(scene.playedCues.length).toBe(1);
      expect(scene.volumeCalls).toContain(0.7);
      expect(scene.stoppedCues).toContain('sfx_1');
      expect(adapter.getCurrentState().activeCues['sfx_1']).toBeUndefined();
    });
  });

  describe('Lifecycle and Disposal', () => {
    it('should initialize and attach scene via AudioRenderContext', () => {
      const altScene = new FakeAudioScene();
      const fresh = new WebAudioRendererAdapter();
      expect(fresh.getScene()).toBeUndefined();

      const context: AudioRenderContext = {
        virtualTime: 0,
        frameNumber: 0,
        deltaTimeMs: 16,
        audioScene: altScene,
      };

      fresh.initialize(context);
      expect(fresh.getScene()).toBe(altScene);
    });

    it('should initialize and attach scene via metadata fallback', () => {
      const altScene = new FakeAudioScene();
      const fresh = new WebAudioRendererAdapter();

      fresh.initialize({
        virtualTime: 0,
        frameNumber: 0,
        deltaTimeMs: 16,
        metadata: { audioScene: altScene },
      });

      expect(fresh.getScene()).toBe(altScene);
    });

    it('should delegate reset() to scene and restore DEFAULT_AUDIO_STATE', () => {
      adapter.render({
        batchId: 'b1',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'm1',
            type: 'MUTE_AUDIO' as unknown as RendererCommand['type'],
            targetId: '',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          } as unknown as RendererCommand,
        ],
      });

      expect(adapter.getCurrentState().muted).toBe(true);

      adapter.reset();
      expect(scene.resetCount).toBe(1);
      expect(adapter.getCurrentState()).toEqual(DEFAULT_AUDIO_STATE);
    });

    it('should dispose resources cleanly and block subsequent renders', () => {
      adapter.dispose();

      expect(adapter.isDisposed()).toBe(true);
      expect(adapter.getScene()).toBeUndefined();

      adapter.render({
        batchId: 'b_post',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'PLAY_AUDIO_CUE',
            targetId: 'test',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(scene.playedCues.length).toBe(0);

      expect(() => adapter.initialize()).toThrowError(/Cannot initialize disposed audio renderer/);
    });

    it('should safely no-op when rendering with empty batch or commands', () => {
      adapter.render({
        batchId: 'b_empty',
        rendererId: adapter.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [],
      });

      expect(scene.playedCues.length).toBe(0);
      expect(adapter.getLastRenderedBatchId()).toBe('b_empty');
    });

    it('should safely no-op when rendering without attached scene', () => {
      const orphan = new WebAudioRendererAdapter();
      orphan.render({
        batchId: 'b_orphan',
        rendererId: orphan.id,
        priority: 'NORMAL',
        virtualTime: 0,
        commands: [
          {
            id: 'c1',
            type: 'PLAY_AUDIO_CUE',
            targetId: 'snd',
            payload: {},
            durationMs: 0,
            easing: 'linear',
            priority: 'NORMAL',
          },
        ],
      });

      expect(orphan.getRenderCount()).toBe(0);
    });

    it('should preserve immutability of batch and command payloads', () => {
      const payload = Object.freeze({ cueId: 'frozen_cue', volume: 0.5 });
      const cmd: RendererCommand = Object.freeze({
        id: 'cmd_frozen',
        type: 'PLAY_AUDIO_CUE',
        targetId: 'frozen_cue',
        payload,
        durationMs: 0,
        easing: 'linear',
        priority: 'NORMAL',
      });
      const batch: RendererBatch = Object.freeze({
        batchId: 'b_frozen',
        rendererId: adapter.id,
        commands: Object.freeze([cmd]),
        priority: 'NORMAL',
        virtualTime: 0,
      });

      expect(() => adapter.render(batch)).not.toThrow();
      expect(cmd.targetId).toBe('frozen_cue');
      expect(payload.volume).toBe(0.5);
    });
  });
});
