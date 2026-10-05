import { MigrationResult, MigrationStep } from '../contracts/migration.types';

/**
 * Migration Pipeline for Experience Manifest schemas.
 * Applies sequential pure migration transformations (v1 -> v2 -> v3)
 * without ever mutating the input document.
 */
export class MigrationPipeline {
  private _steps: MigrationStep[] = [];

  /**
   * Registers a discrete migration step.
   */
  registerStep(step: MigrationStep): void {
    this._steps.push(step);
  }

  /**
   * Returns all registered migration steps.
   */
  steps(): readonly MigrationStep[] {
    return this._steps;
  }

  /**
   * Migrates a document from its current schemaVersion to targetVersion.
   * Input document is guaranteed to remain completely untouched.
   */
  migrate(document: Readonly<Record<string, unknown>>, targetVersion: string): MigrationResult {
    const originalVersion = (document['schemaVersion'] as string) ?? '1.0.0';

    if (originalVersion === targetVersion) {
      return {
        originalVersion,
        finalVersion: targetVersion,
        appliedSteps: [],
        document: this.deepClone(document),
      };
    }

    // Work on an immutable deep clone
    let currentDoc = this.deepClone(document);
    let currentVersion = originalVersion;
    const appliedSteps: string[] = [];

    // Find and execute migration path
    let stepFound = true;
    while (currentVersion !== targetVersion && stepFound) {
      stepFound = false;

      for (const step of this._steps) {
        if (step.fromVersion === currentVersion) {
          currentDoc = step.migrate(currentDoc);
          currentVersion = step.toVersion;
          appliedSteps.push(`${step.fromVersion} -> ${step.toVersion}: ${step.description}`);
          stepFound = true;
          break;
        }
      }
    }

    return {
      originalVersion,
      finalVersion: currentVersion,
      appliedSteps,
      document: currentDoc,
    };
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }
}
