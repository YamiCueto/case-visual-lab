import { Injectable } from '@angular/core';
import { AnimationRendererPort } from '../../domain/animation/animation-engine.port';
import { ThreeParticleAdapter } from './three/three-particle.adapter';

export type AnimationEngineType = 'threejs';

@Injectable({ providedIn: 'root' })
export class AnimationRendererFactory {
  createRenderer(type: AnimationEngineType = 'threejs'): AnimationRendererPort {
    switch (type) {
      case 'threejs':
        return new ThreeParticleAdapter();
      default:
        throw new Error(`Unsupported animation engine type: ${type}`);
    }
  }
}
