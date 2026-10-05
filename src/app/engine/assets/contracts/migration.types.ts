/**
 * Pure migration function signature.
 * Must never mutate the input document. Returns a new migrated object.
 */
export type MigrationFn = (
  document: Readonly<Record<string, unknown>>,
) => Readonly<Record<string, unknown>>;

/**
 * Discrete migration step definition between two schema versions.
 */
export interface MigrationStep {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly description: string;
  readonly migrate: MigrationFn;
}

/**
 * Result of executing the migration pipeline.
 */
export interface MigrationResult {
  readonly originalVersion: string;
  readonly finalVersion: string;
  readonly appliedSteps: readonly string[];
  readonly document: Readonly<Record<string, unknown>>;
}
