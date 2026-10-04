import { Injectable, signal } from '@angular/core';
import { PlaygroundPreset } from '../../domain/playground/playground.interface';
import { PLAYGROUND_PRESETS } from './playground-catalog';

@Injectable({ providedIn: 'root' })
export class PlaygroundService {
  readonly presets = signal<readonly PlaygroundPreset[]>(PLAYGROUND_PRESETS);
  private readonly activePresetState = signal<PlaygroundPreset>(PLAYGROUND_PRESETS[0]);

  readonly activePreset = this.activePresetState.asReadonly();

  selectPlayground(id: string): PlaygroundPreset | null {
    const found = this.presets().find((p) => p.id === id);
    if (found) {
      this.activePresetState.set(found);
      return found;
    }
    return null;
  }
}
