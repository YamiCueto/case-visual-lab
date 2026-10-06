import { AudioCueState, AudioState } from '../contracts/audio-state.interface';

export interface AudioDiffResult {
  readonly hasChanges: boolean;
  readonly masterVolumeChanged: boolean;
  readonly mutedChanged: boolean;
  readonly cuesToPlay: readonly AudioCueState[];
  readonly cuesToStop: readonly string[];
}

export class AudioDiff {
  private readonly volumeEpsilon = 1e-4;

  computeDiff(stateA: AudioState, stateB: AudioState): AudioDiffResult {
    const masterVolumeChanged =
      Math.abs(stateA.masterVolume - stateB.masterVolume) > this.volumeEpsilon;
    const mutedChanged = stateA.muted !== stateB.muted;

    const cuesToPlay: AudioCueState[] = [];
    const cuesToStop: string[] = [];

    for (const [cueId, nextCue] of Object.entries(stateB.activeCues)) {
      const prevCue = stateA.activeCues[cueId];
      if (!prevCue) {
        cuesToPlay.push(nextCue);
      } else {
        const isModified =
          prevCue.isPlaying !== nextCue.isPlaying ||
          Math.abs(prevCue.volume - nextCue.volume) > this.volumeEpsilon ||
          prevCue.loop !== nextCue.loop ||
          prevCue.soundUri !== nextCue.soundUri ||
          prevCue.playbackRate !== nextCue.playbackRate;
        if (isModified && nextCue.isPlaying) {
          cuesToPlay.push(nextCue);
        }
      }
    }

    for (const cueId of Object.keys(stateA.activeCues)) {
      const prevCue = stateA.activeCues[cueId];
      const nextCue = stateB.activeCues[cueId];
      if (prevCue.isPlaying && (!nextCue || !nextCue.isPlaying)) {
        cuesToStop.push(cueId);
      }
    }

    const hasChanges =
      masterVolumeChanged || mutedChanged || cuesToPlay.length > 0 || cuesToStop.length > 0;

    return {
      hasChanges,
      masterVolumeChanged,
      mutedChanged,
      cuesToPlay,
      cuesToStop,
    };
  }
}
