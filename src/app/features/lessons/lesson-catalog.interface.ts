export interface LessonCatalogItem {
  readonly slug: string;
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly category: string;
  readonly level: string;
  readonly estimatedMinutes: number;
  readonly tags?: readonly string[];
  readonly icon?: string;
  readonly assetUri?: string;
}

export interface LessonCatalog {
  readonly lessons: readonly LessonCatalogItem[];
}
