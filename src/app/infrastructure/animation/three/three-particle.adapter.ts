import {
  AnimationFrame,
  AnimationNodeCoordinate,
  ParticlePacket,
} from '../../../domain/animation/animation.interface';
import {
  AnimationMountOptions,
  AnimationRendererPort,
} from '../../../domain/animation/animation-engine.port';

interface ActiveParticleFlight {
  readonly packet: ParticlePacket;
  readonly startCoord: AnimationNodeCoordinate;
  readonly endCoord: AnimationNodeCoordinate;
  readonly midCoord: AnimationNodeCoordinate;
  readonly durationMs: number;
  startTime: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mesh: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trailPoints: any[];
}

interface ActiveRingPulse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mesh: any;
  startTime: number;
  durationMs: number;
  maxScale: number;
}

/**
 * Three.js WebGL Particle and Trajectory Animation Engine.
 * Dynamically loads Three.js on demand.
 * Runs as a transparent WebGL overlay canvas atop the diagram.
 */
export class ThreeParticleAdapter implements AnimationRendererPort {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private three: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private renderer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scene: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private camera: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private container: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animFrameId: number | null = null;

  private isDark = true;
  private activeFlights: ActiveParticleFlight[] = [];
  private activePulses: ActiveRingPulse[] = [];

  async mount(container: HTMLElement, options?: AnimationMountOptions): Promise<void> {
    this.container = container;
    this.isDark = options?.isDark ?? true;

    // Dynamically import Three.js only when animation is mounted
    this.three = await import('three');

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'three-animation-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '5';
    container.appendChild(this.canvas);

    this.renderer = new this.three.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.scene = new this.three.Scene();

    // Orthographic camera: maps 1:1 with screen/container pixel coordinates
    // Top-left is (0,0), bottom-right is (width, height)
    this.camera = new this.three.OrthographicCamera(0, width, 0, height, -100, 100);
    this.camera.position.z = 10;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          this.resize(w, h);
        }
      }
    });
    this.resizeObserver.observe(container);

    this.startRenderLoop();
  }

  unmount(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.clear();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
      this.canvas = null;
    }

    this.scene = null;
    this.camera = null;
    this.container = null;
    this.three = null;
  }

  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    this.renderer.setSize(width, height);
    this.camera.right = width;
    this.camera.top = 0;
    this.camera.bottom = height;
    this.camera.updateProjectionMatrix();
  }

  renderFrame(
    frame: AnimationFrame,
    nodePositions: Record<string, AnimationNodeCoordinate>,
    speedMultiplier = 1,
  ): void {
    if (!this.scene || !this.three) return;

    this.clear();
    const now = performance.now();

    // 1. Create packet flights along curved bezier paths
    for (const packet of frame.packets) {
      const from = nodePositions[packet.fromNodeId];
      const to = nodePositions[packet.toNodeId];
      if (!from || !to) continue;

      const midCoord: AnimationNodeCoordinate = {
        x: (from.x + to.x) / 2,
        y: Math.min(from.y, to.y) - 45, // Arc curvature
      };

      const packetDuration = Math.max(400, (packet.durationMs ?? 1600) / speedMultiplier);

      // Sphere mesh for the packet head
      const geometry = new this.three.SphereGeometry(7, 16, 16);
      const color = new this.three.Color(packet.color || '#00F2FE');
      const material = new this.three.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
      });

      const mesh = new this.three.Mesh(geometry, material);
      mesh.position.set(from.x, from.y, 0);
      this.scene.add(mesh);

      // Trajectory curve line visualization
      const curve = new this.three.QuadraticBezierCurve3(
        new this.three.Vector3(from.x, from.y, -1),
        new this.three.Vector3(midCoord.x, midCoord.y, -1),
        new this.three.Vector3(to.x, to.y, -1),
      );
      const points = curve.getPoints(30);
      const lineGeo = new this.three.BufferGeometry().setFromPoints(points);
      const lineMat = new this.three.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.35,
      });
      const pathLine = new this.three.Line(lineGeo, lineMat);
      this.scene.add(pathLine);

      this.activeFlights.push({
        packet,
        startCoord: from,
        endCoord: to,
        midCoord,
        durationMs: packetDuration,
        startTime: now,
        mesh,
        trailPoints: [pathLine],
      });
    }

    // 2. Create pulsing rings on active nodes
    const pulsedNodes =
      frame.pulses ??
      frame.activeNodeIds.map((id) => ({ nodeId: id, color: '#00F2FE', scale: 2.2 }));
    for (const pulse of pulsedNodes) {
      const coord = nodePositions[pulse.nodeId];
      if (!coord) continue;

      const ringGeo = new this.three.RingGeometry(18, 24, 32);
      const ringMat = new this.three.MeshBasicMaterial({
        color: new this.three.Color(pulse.color || '#00F2FE'),
        transparent: true,
        opacity: 0.8,
        side: this.three.DoubleSide,
      });

      const ringMesh = new this.three.Mesh(ringGeo, ringMat);
      ringMesh.position.set(coord.x, coord.y, 1);
      this.scene.add(ringMesh);

      this.activePulses.push({
        mesh: ringMesh,
        startTime: now,
        durationMs: 1400 / speedMultiplier,
        maxScale: pulse.scale ?? 2.2,
      });
    }
  }

  clear(): void {
    if (!this.scene) return;

    for (const flight of this.activeFlights) {
      this.scene.remove(flight.mesh);
      flight.mesh.geometry?.dispose();
      flight.mesh.material?.dispose();

      for (const item of flight.trailPoints) {
        this.scene.remove(item);
        item.geometry?.dispose();
        item.material?.dispose();
      }
    }
    this.activeFlights = [];

    for (const pulse of this.activePulses) {
      this.scene.remove(pulse.mesh);
      pulse.mesh.geometry?.dispose();
      pulse.mesh.material?.dispose();
    }
    this.activePulses = [];
  }

  setTheme(isDark: boolean): void {
    this.isDark = isDark;
  }

  private startRenderLoop(): void {
    const loop = (timestamp: number) => {
      this.animFrameId = requestAnimationFrame(loop);
      this.updateAnimations(timestamp);
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateAnimations(now: number): void {
    // Animate active flights along quadratic bezier curves
    for (let i = this.activeFlights.length - 1; i >= 0; i--) {
      const flight = this.activeFlights[i];
      const elapsed = now - flight.startTime;
      let t = elapsed / flight.durationMs;

      if (t >= 1) {
        t = 1;
        // Keep mesh at target or loop until frame changes
      }

      // Quadratic Bezier interpolation: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
      const u = 1 - t;
      const x =
        u * u * flight.startCoord.x + 2 * u * t * flight.midCoord.x + t * t * flight.endCoord.x;
      const y =
        u * u * flight.startCoord.y + 2 * u * t * flight.midCoord.y + t * t * flight.endCoord.y;

      flight.mesh.position.set(x, y, 2);

      // Pulse packet scale
      const pulseScale = 1 + Math.sin(t * Math.PI * 4) * 0.25;
      flight.mesh.scale.set(pulseScale, pulseScale, 1);
    }

    // Animate expanding node pulses
    for (let i = this.activePulses.length - 1; i >= 0; i--) {
      const pulse = this.activePulses[i];
      const elapsed = now - pulse.startTime;
      const cycle = (elapsed % pulse.durationMs) / pulse.durationMs;

      const scale = 1 + cycle * (pulse.maxScale - 1);
      pulse.mesh.scale.set(scale, scale, 1);

      if (pulse.mesh.material) {
        pulse.mesh.material.opacity = Math.max(0, 0.8 * (1 - cycle));
      }
    }
  }
}
