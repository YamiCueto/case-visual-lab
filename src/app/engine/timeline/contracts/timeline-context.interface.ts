/**
 * Execution context supplied to the timeline scheduler during discrete tick evaluation.
 */
export interface TimelineExecutionContext {
  readonly currentTimeMs: number;
  readonly previousTimeMs: number;
  readonly isSeeking: boolean;
}
