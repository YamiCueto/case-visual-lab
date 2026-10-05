export interface ManifestResolverOptions {
  readonly experiencesBasePath?: string;
  readonly lessonsBasePath?: string;
}

export type ManifestKind = 'experience' | 'legacy-lesson';

/**
 * Manifest Resolver.
 * Resolves logical identifiers, slugs, and URIs to canonical storage paths,
 * and determines manifest format characteristics without loading external tools.
 */
export class ManifestResolver {
  private readonly _experiencesBasePath: string;
  private readonly _lessonsBasePath: string;

  constructor(options?: ManifestResolverOptions) {
    this._experiencesBasePath = options?.experiencesBasePath ?? 'content/experiences';
    this._lessonsBasePath = options?.lessonsBasePath ?? 'content/lessons';
  }

  /**
   * Resolves an identifier, slug, or relative path to a canonical asset URI.
   */
  resolveUri(identifierOrUri: string): string {
    const trimmed = identifierOrUri.trim();

    // If it's already a full path with json extension
    if (trimmed.endsWith('.json')) {
      return trimmed;
    }

    // If explicitly prefixed as a legacy lesson
    if (
      trimmed.startsWith('lessons/') ||
      trimmed.startsWith('lesson-') ||
      trimmed.startsWith('lesson_')
    ) {
      const slug = trimmed.replace(/^(lessons\/|lesson[-_])/, '');
      return `${this._lessonsBasePath}/${slug}.json`;
    }

    // Default canonical experience resolution
    const cleanId = trimmed.replace(/^experiences\//, '');
    return `${this._experiencesBasePath}/${cleanId}.experience.json`;
  }

  /**
   * Identifies whether raw loaded document follows the legacy ADR-004 Lesson format.
   */
  isLegacyLesson(document: unknown): boolean {
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      return false;
    }

    const doc = document as Record<string, unknown>;

    // Legacy ADR-004 lessons have 'steps' array and lack 'profile' object
    if (Array.isArray(doc['steps']) && doc['profile'] === undefined) {
      return true;
    }

    // Explicit legacy schemaVersion 1.0 without ADR-008 profile
    if (doc['schemaVersion'] === '1.0.0' && doc['profile'] === undefined) {
      return true;
    }

    return false;
  }

  /**
   * Identifies whether raw loaded document follows the ADR-008 Experience format.
   */
  isModernExperience(document: unknown): boolean {
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      return false;
    }

    const doc = document as Record<string, unknown>;
    return (
      doc['profile'] !== undefined &&
      typeof doc['profile'] === 'object' &&
      doc['schemaVersion'] !== undefined
    );
  }
}
