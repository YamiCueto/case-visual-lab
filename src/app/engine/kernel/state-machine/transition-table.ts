import { RuntimeLifecycleState } from './runtime-state-machine.types';

/**
 * Declarative transition table governing all legal state transitions
 * in the Experience lifecycle.
 *
 * Enforces the strict transition rules defined in ADR-007 and ADR-009.
 */
export const ALLOWED_TRANSITIONS: Readonly<
  Record<RuntimeLifecycleState, ReadonlySet<RuntimeLifecycleState>>
> = Object.freeze({
  LOAD: new Set<RuntimeLifecycleState>(['VALIDATE', 'ERROR', 'DESTROYED']),
  VALIDATE: new Set<RuntimeLifecycleState>(['BUILD', 'ERROR', 'DESTROYED']),
  BUILD: new Set<RuntimeLifecycleState>(['INITIALIZE', 'ERROR', 'DESTROYED']),
  INITIALIZE: new Set<RuntimeLifecycleState>(['READY', 'ERROR', 'DESTROYED']),
  READY: new Set<RuntimeLifecycleState>(['PLAYING', 'SEEKING', 'STOPPED', 'ERROR', 'DESTROYED']),
  PLAYING: new Set<RuntimeLifecycleState>([
    'PAUSED',
    'SEEKING',
    'STOPPED',
    'READY',
    'ERROR',
    'DESTROYED',
  ]),
  PAUSED: new Set<RuntimeLifecycleState>([
    'PLAYING',
    'SEEKING',
    'STOPPED',
    'READY',
    'ERROR',
    'DESTROYED',
  ]),
  SEEKING: new Set<RuntimeLifecycleState>([
    'SEEKING', // Coalesced seek targets while scrub is active
    'PLAYING',
    'PAUSED',
    'READY',
    'STOPPED',
    'ERROR',
    'DESTROYED',
  ]),
  STOPPED: new Set<RuntimeLifecycleState>(['READY', 'PLAYING', 'SEEKING', 'ERROR', 'DESTROYED']),
  ERROR: new Set<RuntimeLifecycleState>(['READY', 'LOAD', 'DESTROYED']),
  DESTROYED: new Set<RuntimeLifecycleState>([]), // Terminal state
});
