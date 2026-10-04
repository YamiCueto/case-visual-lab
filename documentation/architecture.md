# Arquitectura · CASE Visual Lab

> Visual Learning Platform for Software Engineering. Excalidraw es el primer motor de renderizado;
> la arquitectura admite motores adicionales (Mermaid, C4, secuencia, flowcharts…).

## Capas

| Carpeta           | Responsabilidad                                                                     | Puede depender de      |
| ----------------- | ----------------------------------------------------------------------------------- | ---------------------- |
| `domain/`         | Modelos y reglas puras (escenas, migraciones, settings). Sin Angular.               | —                      |
| `application/`    | Casos de uso / repositorios que orquestan dominio + infraestructura.                | domain, infrastructure |
| `infrastructure/` | Adaptadores técnicos: LocalStorage, (futuro) puente Excalidraw, carga de contenido. | domain                 |
| `core/`           | Servicios singleton transversales: i18n, tema, settings.                            | domain, infrastructure |
| `presentation/`   | Layout de la app (shell, sidebar, navegación).                                      | core, shared           |
| `features/`       | Una carpeta por pantalla, cargada en lazy.                                          | todo lo anterior       |
| `shared/`         | UI genérica y reutilizable (icon, page-header, empty-state). Sin servicios.         | —                      |

## Contenido estático

`public/content/{lessons,templates,examples}` se sirve tal cual en GitHub Pages
y se cargará vía `fetch` relativo a `document.baseURI`. Así el contenido crece sin recompilar código.

`exports/` guarda diagramas `.excalidraw` / SVG exportados y versionados en el repo (no se publica).

## Versionado de escenas

`SceneDocument.schemaVersion` + `migrateScene()` (funciones puras, encadenadas `vN → vN+1`).
`SceneRepository` migra en cada lectura. Para cambiar el esquema:

1. Incrementar `CURRENT_SCENE_SCHEMA_VERSION`.
2. Registrar `{ from: N, migrate }` en `SCENE_MIGRATIONS`.
3. Añadir test.

## Integración con Motores de Canvas (Sprint 1 — Living Canvas)

Para desacoplar el dominio del motor gráfico, se implementó el patrón **Ports & Adapters** ([ADR 001](file:///c:/Users/YAMI/Documents/projects/mi-excalidraw-lab/documentation/adr/001-canvas-renderer-adapter.md)):

- `CanvasRendererPort` define el contrato agnóstico en el dominio (`src/app/domain/canvas/canvas-renderer.port.ts`).
- `ExcalidrawAdapter` (`src/app/infrastructure/canvas/adapters/excalidraw/excalidraw.adapter.ts`) implementa una **React Island** aislada:
  - Carga diferida mediante `import()` dinámico.
  - Ciclo de vida controlado con `createRoot()` y `unmount()`.
  - Sincronización automática de tema (Dark/Light).
  - Angular no depende de tipos ni componentes de React en su capa de dominio ni en sus plantillas.
- Auto-guardado transparente con debounce de 1 segundo tipo Notion (`SceneManagerService`).
- Runtime interactivo de lecciones (`LessonRuntimeService`) para cargar módulos educativos JSON.
- Motor de simulación y animaciones conceptuales con **Anime.js** (`FlowAnimationService`).
- El sistema está arquitectónicamente preparado para incorporar motores alternativos (`Mermaid`, `C4`, `Graphviz`, `D2`) sin alterar el dominio.
