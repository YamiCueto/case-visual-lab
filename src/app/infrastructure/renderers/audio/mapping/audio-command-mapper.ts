import { RendererCommand } from '../../../../engine/behaviors/commands/renderer-command.types';
import { AudioCueState, AudioState, DEFAULT_AUDIO_STATE } from '../contracts/audio-state.interface';

export const SUPPORTED_AUDIO_COMMANDS = new Set<string>([
  'PLAY_AUDIO_CUE',
  'STOP_AUDIO_CUE',
  'SET_AUDIO_VOLUME',
  'MUTE_AUDIO',
  'UNMUTE_AUDIO',
]);

export interface PlayAudioCuePayload {
  readonly cueId?: string;
  readonly soundUri?: string;
  readonly soundType?: string;
  readonly uri?: string;
  readonly type?: string;
  readonly volume?: number;
  readonly loop?: boolean;
  readonly playbackRate?: number;
}

export interface StopAudioCuePayload {
  readonly cueId?: string;
}

export interface SetAudioVolumePayload {
  readonly volume?: number;
  readonly level?: number;
}

export class AudioCommandMapper {
  supports(command: RendererCommand): boolean {
    if (!command || !command.type) {
      return false;
    }
    return SUPPORTED_AUDIO_COMMANDS.has(command.type as string);
  }

  mapCommand(
    command: RendererCommand,
    currentState: AudioState = DEFAULT_AUDIO_STATE,
    virtualTime = 0,
  ): AudioState | null {
    if (!this.supports(command)) {
      return null;
    }

    const commandType = command.type as string;

    switch (commandType) {
      case 'PLAY_AUDIO_CUE':
        return this.mapPlayCue(command, currentState, virtualTime);
      case 'STOP_AUDIO_CUE':
        return this.mapStopCue(command, currentState);
      case 'SET_AUDIO_VOLUME':
        return this.mapSetVolume(command, currentState);
      case 'MUTE_AUDIO':
        return this.mapMute(currentState, true);
      case 'UNMUTE_AUDIO':
        return this.mapMute(currentState, false);
      default:
        return null;
    }
  }

  private mapPlayCue(
    command: RendererCommand,
    currentState: AudioState,
    virtualTime: number,
  ): AudioState {
    const payload = (command.payload || {}) as PlayAudioCuePayload;
    const cueId = payload.cueId ?? command.targetId;
    const rawVolume = payload.volume ?? 1.0;
    const volume = Math.max(0, Math.min(1, rawVolume));
    const loop = Boolean(payload.loop);
    const soundUri = payload.soundUri ?? payload.uri;
    const soundType = payload.soundType ?? payload.type;
    const playbackRate = payload.playbackRate ?? 1.0;

    const cue: AudioCueState = {
      cueId,
      soundUri,
      soundType,
      volume,
      loop,
      playbackRate,
      isPlaying: true,
      startedAtVirtualTime: virtualTime,
    };

    return {
      ...currentState,
      activeCues: {
        ...currentState.activeCues,
        [cueId]: cue,
      },
    };
  }

  private mapStopCue(command: RendererCommand, currentState: AudioState): AudioState {
    const payload = (command.payload || {}) as StopAudioCuePayload;
    const cueId = payload.cueId ?? command.targetId;

    if (!currentState.activeCues[cueId]) {
      return currentState;
    }

    const nextCues = { ...currentState.activeCues };
    delete nextCues[cueId];

    return {
      ...currentState,
      activeCues: nextCues,
    };
  }

  private mapSetVolume(command: RendererCommand, currentState: AudioState): AudioState {
    const payload = (command.payload || {}) as SetAudioVolumePayload;
    const rawVolume = payload.volume ?? payload.level ?? 1.0;
    const masterVolume = Math.max(0, Math.min(1, rawVolume));

    return {
      ...currentState,
      masterVolume,
    };
  }

  private mapMute(currentState: AudioState, muted: boolean): AudioState {
    return {
      ...currentState,
      muted,
    };
  }
}
