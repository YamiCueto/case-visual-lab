# ADR 001: Canvas Renderer Adapter Pattern & Engine Decoupling

- **Status:** Accepted
- **Date:** 2026-10-04
- **Sprint:** Sprint 1 — Living Canvas
- **Deciders:** Technical Lead, Architecture Architect

---

## 1. Context

CASE Visual Lab exists as a visual learning laboratory within the CASE OS ecosystem to teach Software Architecture, Artificial Intelligence, and System Design through interactive diagrams.

Excalidraw is integrated as the initial diagramming engine. However:

1. **Multi-Engine Evolution:** The long-term vision requires supporting multiple rendering engines (Mermaid, C4, Graphviz, D2, custom vector renderers).
2. **Framework Isolation:** The host application is built on Angular 20 (standalone, signals, zoneless-ready), whereas Excalidraw is a React library. Angular components and domain logic must never directly couple to React or Excalidraw types.
3. **Domain Agnosticism:** Core entities (`SceneDocument`, `SceneManagerService`, `LessonRuntimeService`, `FlowAnimationService`) must remain pure TypeScript domain objects with zero dependency on third-party UI libraries.

---

## 2. Decision

We implemented the **Hexagonal / Ports & Adapters Architecture** for canvas rendering:

```
┌─────────────────────────────────────────────────────────────┐
│                        Domain Layer                         │
│                                                             │
│   SceneDocument ──▶ SceneManagerService ──▶ LessonRuntime   │
│                             │                               │
│                   [CanvasRendererPort]                      │
│                             ▲                               │
└─────────────────────────────┼───────────────────────────────┘
                              │ implements
┌─────────────────────────────┴───────────────────────────────┐
│                     Infrastructure Layer                    │
│                                                             │
│                 CanvasRendererFactory                       │
│                           │                                 │
│                           ▼                                 │
│                   ExcalidrawAdapter                         │
│             (Isolated React Island via                      │
│          dynamic import() & createRoot())                   │
│                                                             │
│         [Future: MermaidAdapter, C4Adapter...]              │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Key Points:

1. **Port Definition (`CanvasRendererPort`):**
   Located in `src/app/domain/canvas/canvas-renderer.port.ts`. Exposes high-level operations: `mount()`, `unmount()`, `updateScene()`, `getSceneData()`, `exportAs()`, `importScene()`, `zoomToFit()`, `clear()`, `setTheme()`.
2. **Isolated React Island (`ExcalidrawAdapter`):**
   Located in `src/app/infrastructure/canvas/adapters/excalidraw/excalidraw.adapter.ts`.
   - Loads React and Excalidraw dynamically via ECMAScript dynamic imports (`import('react')`, `import('react-dom/client')`, `import('@excalidraw/excalidraw')`).
   - Mounts via `createRoot()` into an isolated DOM container.
   - Cleans up via `root.unmount()` when the Angular host component is destroyed (`DestroyRef.onDestroy`).
   - Synchronizes dark/light themes automatically.
3. **Renderer Factory (`CanvasRendererFactory`):**
   Provides engine discovery and instantiation by ID (`'excalidraw' | 'mermaid' | 'c4' | 'graphviz'`).

---

## 3. Registered Technical Debt (Sprint 1)

While the renderer contract and adapter isolation are in place, the following technical debt is formally registered:

### TD-001: Canonical Scene AST vs. Native Engine Payload

- **Current State (v1):** `SceneDocument.elements` stores the raw vector element objects used by Excalidraw (`readonly unknown[]`).
- **Target State (Sprint 2+):** Introduce a canonical, engine-agnostic diagram AST:
  ```typescript
  export interface CanonicalDiagramAST {
    nodes: CanonicalNode[];
    edges: CanonicalEdge[];
    clusters: CanonicalCluster[];
    annotations: CanonicalAnnotation[];
  }
  ```
  And bidirectional converters for each adapter:
  - `CanonicalAST <-> ExcalidrawElements`
  - `CanonicalAST <-> MermaidSyntax`
  - `CanonicalAST <-> C4DSL`

---

## 4. Consequences

### Positive

- **No Framework Leakage:** Angular views and services have zero React imports or typings.
- **Extensibility:** Adding Mermaid or C4 diagrams will require writing a new adapter implementing `CanvasRendererPort` without altering the domain or application services.
- **Client-Side Portability:** Works completely in-browser without server rendering.
- **Resilience:** If Excalidraw changes its internal React API, only `ExcalidrawAdapter` is updated.

### Negative / Trade-offs

- Slight latency on the very first mount while `import('@excalidraw/excalidraw')` chunk is loaded (mitigated by lazy chunking and bundle caching).
- Dual runtime (Angular + React) in memory while on the canvas route (isolated strictly to the canvas component).
