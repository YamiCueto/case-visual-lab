import { CompositionContext, PlatformRuntime } from './composition-context.interface';

export type CompositionErrorCode =
  | 'MISSING_DEPENDENCY'
  | 'DUPLICATE_REGISTRATION'
  | 'INCOMPATIBLE_PLUGIN'
  | 'MISSING_PROVIDER'
  | 'MISSING_RENDERER_PORT'
  | 'MISSING_HANDLER';

/**
 * Specialized error thrown when the composition root encounters invalid wiring,
 * missing dependencies, duplicate registrations, or incompatible plugins.
 */
export class CompositionError extends Error {
  constructor(
    readonly code: CompositionErrorCode,
    message: string,
  ) {
    super(`[CompositionError:${code}] ${message}`);
    this.name = 'CompositionError';
    Object.setPrototypeOf(this, CompositionError.prototype);
  }
}

/**
 * Contract for the platform composition root.
 * Sole authorized component responsible for assembling and validating the entire object graph.
 */
export interface IExperienceCompositionRoot {
  /**
   * Composes and returns the fully assembled, wired, and validated platform runtime.
   */
  compose(context?: CompositionContext): PlatformRuntime;

  /**
   * Validates that the assembled runtime contains all mandatory engines, handlers,
   * providers, and renderer ports.
   */
  validate(runtime: PlatformRuntime): void;
}
