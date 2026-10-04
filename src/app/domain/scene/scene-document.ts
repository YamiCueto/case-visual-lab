/**
 * Persisted scene document owned by this application.
 *
 * Excalidraw payloads (`elements`, `appState`, `files`) are stored as opaque
 * JSON so the domain does not depend on `@excalidraw/excalidraw` types.
 */
export interface SceneDocument {
  readonly schemaVersion: number;
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly elements: readonly unknown[];
  readonly appState: Readonly<Record<string, unknown>>;
  readonly files: Readonly<Record<string, unknown>>;
}

/** Current schema version. Bump together with a new migration step. */
export const CURRENT_SCENE_SCHEMA_VERSION = 1;
