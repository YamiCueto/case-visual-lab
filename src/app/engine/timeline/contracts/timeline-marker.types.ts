/**
 * Semantic classification of timeline markers.
 */
export type TimelineMarkerKind = 'CHECKPOINT' | 'BARRIER' | 'CUE';

/**
 * Named semantic marker anchored at a specific virtual timestamp.
 */
export interface TimelineMarker {
  readonly id: string;
  readonly name: string;
  readonly time: number;
  readonly kind: TimelineMarkerKind;
  readonly payload?: Readonly<Record<string, unknown>>;
}
