/**
 * Universal discrete simulation event emitted by a SimulationProvider.
 * Represents a domain fact that occurred in the simulation model.
 *
 * Strictly free of graphical coordinates, colors, DOM or visual logic.
 */
export interface SimulationEvent<TPayload = unknown> {
  readonly eventId: string;
  readonly type: string;
  readonly sourceEntityId: string;
  readonly targetEntityId?: string;
  readonly virtualTimeMs: number;
  readonly stepIndex: number;
  readonly sequence: number;
  readonly payload: TPayload;
}
