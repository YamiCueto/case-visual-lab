/**
 * Context supplied to the rendering pipeline for a single render cycle or tick.
 */
export interface RenderExecutionContext {
  readonly virtualTime: number;
  readonly frameNumber: number;
  readonly deltaTimeMs: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
