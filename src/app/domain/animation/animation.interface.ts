export type PacketType =
  'http' | 'event' | 'token' | 'embedding' | 'tool_call' | 'query' | 'stream' | 'ack';

export interface AnimationNodeCoordinate {
  readonly x: number;
  readonly y: number;
}

export interface ParticlePacket {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly type: PacketType;
  readonly label: string;
  readonly color: string;
  readonly durationMs?: number;
  readonly payloadPreview?: string;
}

export interface NodePulse {
  readonly nodeId: string;
  readonly color: string;
  readonly intensity?: number;
  readonly scale?: number;
}

export interface AnimationFrame {
  readonly frameIndex: number;
  readonly title: string;
  readonly description: string;
  readonly activeNodeIds: readonly string[];
  readonly packets: readonly ParticlePacket[];
  readonly pulses?: readonly NodePulse[];
  readonly durationMs?: number;
}

export interface AnimationTimeline {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly totalFrames: number;
  readonly defaultSpeed?: number;
  readonly frames: readonly AnimationFrame[];
  readonly nodePositions: Record<string, AnimationNodeCoordinate>;
}

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'completed';

export interface TimelinePlaybackState {
  readonly status: PlaybackStatus;
  readonly currentFrameIndex: number;
  readonly progressPct: number;
  readonly speed: number;
}
