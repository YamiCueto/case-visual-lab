export type RendererEngineType = 'excalidraw' | 'mermaid' | 'c4' | 'graphviz';

export type ExportFormat = 'excalidraw' | 'svg' | 'png' | 'json';

export interface CanvasSceneData {
  readonly elements: readonly unknown[];
  readonly appState: Readonly<Record<string, unknown>>;
  readonly files: Readonly<Record<string, unknown>>;
}

export interface ExportResult {
  readonly blob?: Blob;
  readonly text?: string;
  readonly filename: string;
  readonly mimeType: string;
}

export interface SceneHeader {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly elementsCount: number;
}
