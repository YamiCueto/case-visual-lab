import {
  CanvasSceneData,
  ExportFormat,
  ExportResult,
  RendererEngineType,
} from '../../../../domain/canvas/canvas-engine.interface';
import { CanvasRendererPort } from '../../../../domain/canvas/canvas-renderer.port';

interface InstrumentableElement {
  id?: string;
  type?: string;
  text?: string;
  width?: number;
  height?: number;
  strokeColor?: string;
  containerId?: string | null;
}

function instrumentLog(step: string, elements?: readonly unknown[]) {
  if (!elements) return;
  const typedElements = elements as readonly InstrumentableElement[];
  const rectangles = typedElements.filter((e) => e?.type === 'rectangle').length;
  const texts = typedElements.filter((e) => e?.type === 'text').length;
  const arrows = typedElements.filter((e) => e?.type === 'arrow').length;
  const textDetails = typedElements
    .filter((e) => e?.type === 'text')
    .map((e) => ({
      id: e?.id,
      text: e?.text,
      width: e?.width,
      height: e?.height,
      strokeColor: e?.strokeColor,
      containerId: e?.containerId,
    }));
  console.log(`\n--- [INSTRUMENTATION] ${step} ---`);
  console.log(
    `Total: ${typedElements.length} | Rects: ${rectangles} | Texts: ${texts} | Arrows: ${arrows}`,
  );
  console.log('Texts:', JSON.stringify(textDetails, null, 2));
  console.log('------------------------------------\n');
}

function cleanAppState(rawState?: Record<string, unknown>, isDark = true): Record<string, unknown> {
  const defaultBg = isDark ? '#0b0d10' : '#ffffff';
  const result: Record<string, unknown> = {
    viewBackgroundColor: defaultBg,
    theme: isDark ? 'dark' : 'light',
  };

  if (!rawState) return result;

  const safeKeys = [
    'currentItemFontFamily',
    'currentItemFontSize',
    'currentItemStrokeColor',
    'currentItemBackgroundColor',
    'currentItemFillStyle',
    'currentItemStrokeWidth',
    'currentItemStrokeStyle',
    'currentItemRoughness',
    'currentItemOpacity',
    'scrollX',
    'scrollY',
    'zoom',
    'gridSize',
  ];

  for (const key of safeKeys) {
    if (key in rawState && rawState[key] !== undefined) {
      result[key] = rawState[key];
    }
  }

  // Prevent light background from persisting in dark mode and vice versa
  const rawBg = rawState['viewBackgroundColor'] as string | undefined;
  if (rawBg) {
    if (isDark && (rawBg === '#ffffff' || rawBg === '#fff' || rawBg === '#ececf0')) {
      result['viewBackgroundColor'] = '#0b0d10';
    } else if (!isDark && (rawBg === '#0b0d10' || rawBg === '#000000')) {
      result['viewBackgroundColor'] = '#ffffff';
    } else {
      result['viewBackgroundColor'] = rawBg;
    }
  } else {
    result['viewBackgroundColor'] = defaultBg;
  }

  result['theme'] = isDark ? 'dark' : 'light';
  return result;
}

/**
 * Ensures all elements have non-undefined backgroundColor and essential properties,
 * preventing Excalidraw's `isTransparent(el.backgroundColor)` hit-testing crash.
 */
function sanitizeElements(elements: readonly unknown[]): unknown[] {
  return elements.map((el) => {
    if (!el || typeof el !== 'object') return el;
    const item = el as Record<string, unknown>;
    return {
      ...item,
      backgroundColor: item['backgroundColor'] ?? 'transparent',
      fillStyle: item['fillStyle'] ?? 'solid',
      strokeWidth: item['strokeWidth'] ?? 2,
      roughness: item['roughness'] ?? 0,
      opacity: item['opacity'] ?? 100,
    };
  });
}

/**
 * Infrastructure adapter for @excalidraw/excalidraw.
 * Encapsulates React Island, lifecycle, API interactions, and export/import algorithms.
 */
export class ExcalidrawAdapter implements CanvasRendererPort {
  readonly engineType: RendererEngineType = 'excalidraw';

  private root: unknown | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private api: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private excalidrawModule: any = null;
  private container: HTMLElement | null = null;
  private isDark = true;
  private onChangeCallback: ((data: CanvasSceneData) => void) | null = null;

  async mount(
    container: HTMLElement,
    initialData: CanvasSceneData,
    isDark: boolean,
    onChange: (data: CanvasSceneData) => void,
  ): Promise<void> {
    this.container = container;
    this.isDark = isDark;
    this.onChangeCallback = onChange;

    // Polyfill process.env in browser if needed by React/Excalidraw internals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    win.process = win.process || { env: { NODE_ENV: 'production' } };

    // Lazy load React and Excalidraw dynamically to keep initial bundle tiny
    const [React, { createRoot }, ExcalidrawModule] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('@excalidraw/excalidraw'),
    ]);

    this.excalidrawModule = ExcalidrawModule;
    const ExcalidrawComponent = ExcalidrawModule.Excalidraw;
    const sanitizedBeforeMount = sanitizeElements(initialData.elements);
    instrumentLog('MOUNT - BEFORE restoreElements', sanitizedBeforeMount);
    const sanitizedElements = ExcalidrawModule.restoreElements(sanitizedBeforeMount, null);
    instrumentLog('MOUNT - AFTER restoreElements', sanitizedElements);

    const render = () => {
      const props = {
        excalidrawAPI: (apiInstance: unknown) => {
          this.api = apiInstance;
          if (initialData.elements.length > 0) {
            setTimeout(() => {
              try {
                this.api?.scrollToContent();
              } catch {
                // Ignore any scroll calculation errors during unmount/init
              }
            }, 80);
          }
        },
        theme: this.isDark ? 'dark' : 'light',
        initialData: {
          elements: sanitizedElements,
          appState: cleanAppState(initialData.appState as Record<string, unknown>, this.isDark),
          files: initialData.files,
        },
        onChange: (
          elements: readonly unknown[],
          appState: Record<string, unknown>,
          files: Record<string, unknown>,
        ) => {
          instrumentLog('onChange (Excalidraw Native)', elements);
          if (this.onChangeCallback) {
            this.onChangeCallback({
              elements,
              appState: cleanAppState(appState, this.isDark),
              files,
            });
          }
        },
        UIOptions: {
          canvasActions: {
            theme: true,
            export: false, // Managed by CASE Visual Lab toolbar
            loadScene: false, // Managed by CASE Visual Lab toolbar
            saveToActiveFile: false,
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const element = React.createElement(ExcalidrawComponent as any, props);
      this.root = this.root ?? createRoot(this.container!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.root as any).render(element);
    };

    render();
  }

  unmount(): void {
    if (this.root) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.root as any).unmount();
      this.root = null;
    }
    this.api = null;
    this.excalidrawModule = null;
    this.container = null;
    this.onChangeCallback = null;
  }

  updateScene(data: Partial<CanvasSceneData>): void {
    if (!this.api) return;

    instrumentLog('updateScene - INCOMING', data.elements);

    const sanitized = data.elements ? sanitizeElements(data.elements) : undefined;
    if (sanitized) instrumentLog('updateScene - AFTER sanitizeElements', sanitized);

    const restored = sanitized
      ? (this.excalidrawModule?.restoreElements(sanitized, null) ?? data.elements)
      : undefined;

    if (restored) instrumentLog('updateScene - AFTER restoreElements', restored);

    const elementsToUpdate = restored ?? data.elements;

    this.api.updateScene({
      elements: elementsToUpdate,
      appState: data.appState
        ? cleanAppState(data.appState as Record<string, unknown>, this.isDark)
        : undefined,
      files: data.files,
    });
  }

  setTheme(isDark: boolean): void {
    this.isDark = isDark;
    if (this.api) {
      this.api.updateScene({
        appState: {
          theme: isDark ? 'dark' : 'light',
          viewBackgroundColor: isDark ? '#0b0d10' : '#ffffff',
        },
      });
    }
  }

  projectSceneToScreen(coord: { x: number; y: number }): { x: number; y: number } {
    if (!this.api) return coord;
    try {
      const appState = this.api.getAppState();
      const zoom = appState.zoom?.value ?? 1;
      const scrollX = appState.scrollX ?? 0;
      const scrollY = appState.scrollY ?? 0;
      return {
        x: (coord.x + scrollX) * zoom,
        y: (coord.y + scrollY) * zoom,
      };
    } catch {
      return coord;
    }
  }

  async exportAs(format: ExportFormat, sceneName = 'case-diagram'): Promise<ExportResult> {
    if (!this.api) {
      throw new Error('Canvas not mounted');
    }

    const elements = this.api.getSceneElements();
    const appState = this.api.getAppState();
    const files = this.api.getFiles();

    const cleanName = sceneName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const ExcalidrawModule = await import('@excalidraw/excalidraw');

    switch (format) {
      case 'excalidraw':
      case 'json': {
        const json = ExcalidrawModule.serializeAsJSON(elements, appState, files, 'local');
        const ext = format === 'excalidraw' ? '.excalidraw' : '.json';
        const blob = new Blob([json], { type: 'application/json' });
        return {
          blob,
          text: json,
          filename: `${cleanName}${ext}`,
          mimeType: 'application/json',
        };
      }
      case 'svg': {
        const svgElement = await ExcalidrawModule.exportToSvg({
          elements,
          appState: {
            ...appState,
            exportWithDarkMode: this.isDark,
            exportBackground: true,
          },
          files,
        });
        const svgString = svgElement.outerHTML;
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        return {
          blob,
          text: svgString,
          filename: `${cleanName}.svg`,
          mimeType: 'image/svg+xml',
        };
      }
      case 'png': {
        const blob = await ExcalidrawModule.exportToBlob({
          elements,
          appState: {
            ...appState,
            exportWithDarkMode: this.isDark,
            exportBackground: true,
          },
          files,
          mimeType: 'image/png',
        });
        return {
          blob,
          filename: `${cleanName}.png`,
          mimeType: 'image/png',
        };
      }
    }
  }

  async importScene(raw: string | Record<string, unknown>): Promise<CanvasSceneData> {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const elements = (data.elements as readonly unknown[]) ?? [];
    const appState = (data.appState as Record<string, unknown>) ?? {};
    const files = (data.files as Record<string, unknown>) ?? {};

    this.updateScene({ elements, appState, files });
    setTimeout(() => this.zoomToFit(), 60);

    return { elements, appState, files };
  }

  clear(): void {
    if (!this.api) return;
    this.api.resetScene();
  }

  zoomToFit(): void {
    if (!this.api) return;
    this.api.scrollToContent(undefined, { fitToViewport: true });
  }
}
