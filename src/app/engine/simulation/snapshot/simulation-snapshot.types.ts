import { SimulationState } from '../contracts/simulation-state.types';

/**
 * Immutable checkpoint of a simulation at a discrete point in virtual time.
 * Captures full mathematical state for instant time-travel and rewind.
 */
export interface SimulationSnapshot<TProviderState = unknown> {
  readonly snapshotId: string;
  readonly time: number;
  readonly seed: number;
  readonly stateHash: string;
  readonly providerState: Readonly<TProviderState>;
  readonly sequence: number;
  readonly state: SimulationState;
}

/**
 * Computes a deterministic 32-bit FNV-1a hash formatted as hexadecimal.
 * Zero external libraries, zero non-deterministic APIs.
 */
export function computeDeterministicHash(data: unknown): string {
  const json = JSON.stringify(data, Object.keys(data ?? {}).sort());
  let hash = 0x811c9dc5;

  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
