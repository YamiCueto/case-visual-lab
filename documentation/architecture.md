# Arquitectura · CASE Visual Lab

> Visual Learning Platform for Software Engineering. Excalidraw es el primer motor de renderizado;
> la arquitectura admite motores adicionales (Mermaid, C4, secuencia, flowcharts…).

## Capas

| Carpeta | Responsabilidad | Puede depender de |
| --- | --- | --- |
| `domain/` | Modelos y reglas puras (escenas, migraciones, settings). Sin Angular. | — |
| `application/` | Casos de uso / repositorios que orquestan dominio + infraestructura. | domain, infrastructure |
| `infrastructure/` | Adaptadores técnicos: LocalStorage, (futuro) puente Excalidraw, carga de contenido. | domain |
| `core/` | Servicios singleton transversales: i18n, tema, settings. | domain, infrastructure |
| `presentation/` | Layout de la app (shell, sidebar, navegación). | core, shared |
| `features/` | Una carpeta por pantalla, cargada en lazy. | todo lo anterior |
| `shared/` | UI genérica y reutilizable (icon, page-header, empty-state). Sin servicios. | — |

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

## Integración futura con Excalidraw (Sprint 1)

`@excalidraw/excalidraw` es **un componente React** (peer deps `react`/`react-dom` 17–19).
No existe binding oficial para Angular. Estrategia recomendada:

- *React island*: un componente Angular `CanvasHost` crea `createRoot(hostElement)` y renderiza
  `<Excalidraw />`; se desmonta en `DestroyRef.onDestroy`.
- Cargar el módulo con `import()` dinámico solo en `/canvas` (el paquete pesa varios MB).
- Importar `@excalidraw/excalidraw/index.css`.
- El contenedor debe tener ancho/alto no nulos (Excalidraw ocupa 100% del padre).
- Fuentes: por defecto se descargan de CDN (esm.run). Para modo offline, copiar
  `node_modules/@excalidraw/excalidraw/dist/prod/fonts` a los assets y definir
  `window.EXCALIDRAW_ASSET_PATH` **antes** de cargar el paquete, calculado desde `document.baseURI`
  (no `/`, porque GitHub Pages sirve bajo `/<repo>/`).
- Comunicación: `excalidrawAPI` (`updateScene`, `getSceneElements`, `getAppState`) envuelta en un servicio
  de infraestructura; `onChange` con debounce hacia `SceneRepository`.
- Tema: `theme={isDark ? 'dark' : 'light'}` desde `ThemeService`.
