/**
 * Core event envelope and scope types for the Runtime Event Bus.
 * 100% pure TypeScript - zero framework dependencies.
 */

export type EventScope = 'internal' | 'public' | 'private';

export enum EventPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export interface RuntimeEventEnvelope<T = unknown> {
  readonly id: string;
  readonly scope: EventScope;
  readonly priority: EventPriority;
  readonly channel: string;
  readonly type: string;
  readonly timestamp: number;
  readonly virtualTimeMs: number;
  readonly senderEngine: string;
  readonly payload: T;
  readonly isCancellable?: boolean;
  isCancelled?: boolean;
}

export type RuntimeEventHandler<T = unknown> = (event: RuntimeEventEnvelope<T>) => void;
export type UnsubscribeFn = () => void;
