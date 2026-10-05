/**
 * Individual validation error in a manifest document.
 */
export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly code: string;
  readonly details?: unknown;
}

/**
 * Result of validating a manifest against its schema rules.
 */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly string[];
}
