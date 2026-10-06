import { ParticleState, Vector3D } from '../contracts/particle-state.interface';

export class ParticleInterpolator {
  interpolate(
    start: ParticleState,
    end: ParticleState,
    progress: number,
    customEasing?: ParticleState['easing'],
  ): ParticleState {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const easing = customEasing ?? end.easing ?? 'linear';
    const easedT = this.applyEasing(clampedProgress, easing);

    const position: Vector3D = {
      x: this.lerp(start.position.x, end.position.x, easedT),
      y: this.lerp(start.position.y, end.position.y, easedT),
      z: this.lerp(start.position.z, end.position.z, easedT),
    };

    const scale: Vector3D = {
      x: this.lerp(start.scale.x, end.scale.x, easedT),
      y: this.lerp(start.scale.y, end.scale.y, easedT),
      z: this.lerp(start.scale.z, end.scale.z, easedT),
    };

    const rotation: Vector3D = {
      x: this.lerp(start.rotation.x, end.rotation.x, easedT),
      y: this.lerp(start.rotation.y, end.rotation.y, easedT),
      z: this.lerp(start.rotation.z, end.rotation.z, easedT),
    };

    const opacity = this.lerp(start.opacity, end.opacity, easedT);
    const color = this.interpolateColor(start.color, end.color, easedT);

    return {
      ...end,
      position,
      scale,
      rotation,
      opacity,
      color,
    };
  }

  interpolatePosition(start: Vector3D, end: Vector3D, t: number): Vector3D {
    const clamped = Math.max(0, Math.min(1, t));
    return {
      x: this.lerp(start.x, end.x, clamped),
      y: this.lerp(start.y, end.y, clamped),
      z: this.lerp(start.z, end.z, clamped),
    };
  }

  interpolateColor(colorA: string, colorB: string, t: number): string {
    const rgbA = this.parseHexColor(colorA);
    const rgbB = this.parseHexColor(colorB);

    if (!rgbA || !rgbB) {
      return t >= 0.5 ? colorB : colorA;
    }

    const r = Math.round(this.lerp(rgbA.r, rgbB.r, t));
    const g = Math.round(this.lerp(rgbA.g, rgbB.g, t));
    const b = Math.round(this.lerp(rgbA.b, rgbB.b, t));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private applyEasing(t: number, easing: ParticleState['easing']): number {
    switch (easing) {
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return t * (2 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'linear':
      default:
        return t;
    }
  }

  private parseHexColor(hex: string): { r: number; g: number; b: number } | null {
    if (!hex || typeof hex !== 'string') return null;
    const cleanHex = hex.replace('#', '').trim();
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
    }
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
    }
    return null;
  }
}
