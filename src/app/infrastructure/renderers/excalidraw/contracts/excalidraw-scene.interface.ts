/**
 * Pure TypeScript representation of an Excalidraw scene element.
 * Completely decoupled from React, DOM, and @excalidraw/excalidraw library imports.
 */
export interface ExcalidrawSceneElement {
  readonly id: string;
  readonly type: string;
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly strokeColor?: string;
  readonly backgroundColor?: string;
  readonly strokeWidth?: number;
  readonly strokeStyle?: string;
  readonly roughness?: number;
  readonly opacity?: number;
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontFamily?: number;
  readonly textAlign?: string;
  readonly verticalAlign?: string;
  readonly containerId?: string | null;
  readonly isDeleted?: boolean;
  readonly customData?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

/**
 * Partial mutation payload targeted at a specific element.
 */
export type ExcalidrawElementMutation = Partial<ExcalidrawSceneElement> & {
  readonly id: string;
};

/**
 * Contract representing an Excalidraw scene target capable of reading
 * and applying incremental updates without full scene recreation.
 */
export interface ExcalidrawScene {
  /**
   * Retrieves all elements currently tracked in the scene.
   */
  getElements(): readonly ExcalidrawSceneElement[];

  /**
   * Queries a single element by its unique identifier.
   */
  getElementById(id: string): ExcalidrawSceneElement | undefined;

  /**
   * Updates or merges modified elements into the scene.
   */
  updateElements(elements: readonly ExcalidrawSceneElement[]): void;

  /**
   * Optional helper to insert a new element into the scene.
   */
  addElement?(element: ExcalidrawSceneElement): void;

  /**
   * Optional helper to remove an element by id.
   */
  removeElement?(id: string): void;
}
