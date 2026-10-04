import { Injectable } from '@angular/core';
import { RendererEngineType } from '../../domain/canvas/canvas-engine.interface';
import { CanvasRendererPort } from '../../domain/canvas/canvas-renderer.port';
import { ExcalidrawAdapter } from './adapters/excalidraw/excalidraw.adapter';

/**
 * Factory providing renderer adapters.
 * Decouples the application from a single engine and prepares the ground for
 * Mermaid, C4, Graphviz, D2 and future graphic engines.
 */
@Injectable({ providedIn: 'root' })
export class CanvasRendererFactory {
  createRenderer(type: RendererEngineType = 'excalidraw'): CanvasRendererPort {
    switch (type) {
      case 'excalidraw':
        return new ExcalidrawAdapter();
      case 'mermaid':
      case 'c4':
      case 'graphviz':
        throw new Error(`Renderer engine '${type}' will be integrated in future sprints.`);
      default:
        return new ExcalidrawAdapter();
    }
  }
}
