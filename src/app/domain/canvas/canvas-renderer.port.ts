import {
  CanvasSceneData,
  ExportFormat,
  ExportResult,
  RendererEngineType,
} from './canvas-engine.interface';

/**
 * Port contract for diagram renderers.
 * The domain and application layers only interact with this port,
 * decoupling CASE Visual Lab from specific libraries (Excalidraw, Mermaid, etc.).
 */
export interface CanvasRendererPort {
  readonly engineType: RendererEngineType;

  mount(
    container: HTMLElement,
    initialData: CanvasSceneData,
    isDark: boolean,
    onChange: (data: CanvasSceneData) => void,
  ): Promise<void>;

  unmount(): void;

  updateScene(data: Partial<CanvasSceneData>): void;

  setTheme(isDark: boolean): void;

  exportAs(format: ExportFormat, sceneName?: string): Promise<ExportResult>;

  importScene(raw: string | Record<string, unknown>): Promise<CanvasSceneData>;

  clear(): void;

  zoomToFit(): void;

  /**
   * Projects canvas scene/world coordinates into viewport (screen pixel) coordinates,
   * accounting for canvas panning and zoom.
   */
  projectSceneToScreen?(coord: { x: number; y: number }): { x: number; y: number };
}
