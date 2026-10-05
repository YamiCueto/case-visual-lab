import { ExperienceProfileType } from '../contracts/experience-manifest.types';
import { ValidationError, ValidationResult } from '../contracts/validation.types';

const VALID_PROFILES: readonly ExperienceProfileType[] = [
  'lesson',
  'workshop',
  'presentation',
  'playground',
  'interactive-book',
  'simulation',
  'certification',
  'assessment',
  'live-demo',
];

export type CustomVersionValidator = (
  document: Readonly<Record<string, unknown>>,
) => ValidationResult;

/**
 * Universal Schema Validator for Experience Manifests.
 * Enforces contracts from ADR-008 and enables forward compatibility with future schema versions.
 */
export class SchemaValidator {
  private _versionValidators = new Map<string, CustomVersionValidator>();

  /**
   * Registers a custom validator for a specific future schema version.
   */
  registerVersionValidator(version: string, validator: CustomVersionValidator): void {
    this._versionValidators.set(version, validator);
  }

  /**
   * Validates a document against the Experience Manifest contract.
   */
  validate(document: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      return {
        isValid: false,
        errors: [
          {
            path: '/',
            message: 'Manifest must be a non-null object',
            code: 'INVALID_ROOT_TYPE',
          },
        ],
        warnings,
      };
    }

    const doc = document as Record<string, unknown>;

    // 1. schemaVersion validation
    if (!doc['schemaVersion'] || typeof doc['schemaVersion'] !== 'string') {
      errors.push({
        path: '/schemaVersion',
        message: 'Missing or invalid schemaVersion (must be string, e.g. "2.0.0")',
        code: 'MISSING_SCHEMA_VERSION',
      });
    }

    const schemaVersion = (doc['schemaVersion'] as string) ?? '';

    // Check if custom version validator is registered
    if (this._versionValidators.has(schemaVersion)) {
      const customValidator = this._versionValidators.get(schemaVersion)!;
      return customValidator(doc);
    }

    // 2. metadata validation
    if (!doc['metadata'] || typeof doc['metadata'] !== 'object' || Array.isArray(doc['metadata'])) {
      errors.push({
        path: '/metadata',
        message: 'Missing or invalid metadata block',
        code: 'MISSING_METADATA',
      });
    } else {
      const meta = doc['metadata'] as Record<string, unknown>;
      if (!meta['id'] || typeof meta['id'] !== 'string' || meta['id'].trim() === '') {
        errors.push({
          path: '/metadata/id',
          message: 'metadata.id is required and must be a non-empty string',
          code: 'INVALID_METADATA_ID',
        });
      }
      if (!meta['title'] || typeof meta['title'] !== 'string' || meta['title'].trim() === '') {
        errors.push({
          path: '/metadata/title',
          message: 'metadata.title is required and must be a non-empty string',
          code: 'INVALID_METADATA_TITLE',
        });
      }
    }

    // 3. profile validation
    if (!doc['profile'] || typeof doc['profile'] !== 'object' || Array.isArray(doc['profile'])) {
      errors.push({
        path: '/profile',
        message: 'Missing or invalid profile block',
        code: 'MISSING_PROFILE',
      });
    } else {
      const profile = doc['profile'] as Record<string, unknown>;
      const type = profile['type'] as ExperienceProfileType;
      if (!type || !VALID_PROFILES.includes(type)) {
        errors.push({
          path: '/profile/type',
          message: `Invalid profile.type "${String(type)}". Must be one of: ${VALID_PROFILES.join(', ')}`,
          code: 'INVALID_PROFILE_TYPE',
          details: { validProfiles: VALID_PROFILES },
        });
      }
    }

    // 4. simulation validation (optional, but if present must be valid)
    if (doc['simulation'] !== undefined) {
      if (
        !doc['simulation'] ||
        typeof doc['simulation'] !== 'object' ||
        Array.isArray(doc['simulation'])
      ) {
        errors.push({
          path: '/simulation',
          message: 'simulation block must be an object',
          code: 'INVALID_SIMULATION_BLOCK',
        });
      } else {
        const sim = doc['simulation'] as Record<string, unknown>;
        if (!sim['provider'] || typeof sim['provider'] !== 'string') {
          errors.push({
            path: '/simulation/provider',
            message: 'simulation.provider must be a valid provider identifier string',
            code: 'MISSING_SIMULATION_PROVIDER',
          });
        }
      }
    }

    // 5. timeline validation (optional, but if present must be valid)
    if (doc['timeline'] !== undefined) {
      if (
        !doc['timeline'] ||
        typeof doc['timeline'] !== 'object' ||
        Array.isArray(doc['timeline'])
      ) {
        errors.push({
          path: '/timeline',
          message: 'timeline block must be an object',
          code: 'INVALID_TIMELINE_BLOCK',
        });
      } else {
        const tl = doc['timeline'] as Record<string, unknown>;
        if (
          tl['durationMs'] !== undefined &&
          (typeof tl['durationMs'] !== 'number' || (tl['durationMs'] as number) < 0)
        ) {
          errors.push({
            path: '/timeline/durationMs',
            message: 'timeline.durationMs must be a non-negative number',
            code: 'INVALID_TIMELINE_DURATION',
          });
        }
      }
    }

    // 6. evaluation validation (optional)
    if (doc['evaluation'] !== undefined) {
      if (
        !doc['evaluation'] ||
        typeof doc['evaluation'] !== 'object' ||
        Array.isArray(doc['evaluation'])
      ) {
        errors.push({
          path: '/evaluation',
          message: 'evaluation block must be an object',
          code: 'INVALID_EVALUATION_BLOCK',
        });
      } else {
        const ev = doc['evaluation'] as Record<string, unknown>;
        if (ev['checkpoints'] !== undefined && !Array.isArray(ev['checkpoints'])) {
          errors.push({
            path: '/evaluation/checkpoints',
            message: 'evaluation.checkpoints must be an array',
            code: 'INVALID_CHECKPOINTS',
          });
        }
        if (ev['quizzes'] !== undefined && !Array.isArray(ev['quizzes'])) {
          errors.push({
            path: '/evaluation/quizzes',
            message: 'evaluation.quizzes must be an array',
            code: 'INVALID_QUIZZES',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
