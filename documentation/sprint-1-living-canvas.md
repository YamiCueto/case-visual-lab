# Sprint 1 — Living Canvas: Arquitectura & Motor de Animación

> **CASE OS · Visual Learning Engine**  
> Plataforma interactiva para aprender Arquitectura de Software, Inteligencia Artificial, Agentes, RAG, MCP, DDD y Sistemas Distribuidos mediante tableros vivos y simulación temporal.

---

## 1. Visión y Desacoplamiento de Renderizadores

CASE Visual Lab **no es un editor de diagramas**: es el motor de aprendizaje visual de CASE Academy y el ecosistema CASE OS.

Para garantizar que el producto evolucione durante años sin acoplamiento a librerías de UI específicas, se implementó el patrón **Ports & Adapters (Arquitectura Hexagonal)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              DOMINIO                                   │
│                                                                        │
│   SceneDocument ──▶ LessonManifest ──▶ AnimationTimeline               │
│         │                  │                    │                      │
│         ▼                  ▼                    ▼                      │
│   [CanvasRendererPort]               [AnimationRendererPort]          │
└─────────┬───────────────────────────────────────┬──────────────────────┘
          │ implements                            │ implements
┌─────────┴───────────────────────────────┐ ┌─────┴──────────────────────┐
│       INFRAESTRUCTURA DE DIAGRAMA       │ │  INFRAESTRUCTURA ANIMACIÓN │
│                                         │ │                            │
│  ExcalidrawAdapter (React Island)       │ │  ThreeParticleAdapter      │
│  [Futuro: MermaidAdapter, C4Adapter...] │ │  (WebGL 3D Overlay Lazy)   │
└─────────────────────────────────────────┘ └────────────────────────────┘
```

- **El dominio jamás importa React, Excalidraw ni Three.js.**
- `CanvasRendererPort` define el contrato universal para diagramación (`mount`, `unmount`, `updateScene`, `exportAs`, `importScene`, `zoomToFit`).
- `AnimationRendererPort` define el contrato universal para motores de animación (`mount`, `unmount`, `renderFrame`, `resize`, `clear`).

---

## 2. Motor de Animación con Three.js (Capa WebGL Overlay)

Three.js se integra **no para reemplazar a Excalidraw**, sino como una **capa visual de animación viva** superpuesta transparentemente sobre el diagrama con `pointer-events: none`.

### Características Técnicas:

1. **Lazy Loading Estricto:**
   Three.js (~688 kB) no se incluye en el bundle principal. Se carga bajo demanda con `await import('three')` únicamente cuando se inicializa la animación. El bundle inicial de la aplicación se mantiene en **404 kB (91.9 kB transfer size)**.
2. **Cámara Ortográfica 1:1 con Coordenadas de Pantalla:**
   Utiliza `THREE.OrthographicCamera(0, width, height, 0, -100, 100)`, permitiendo que las coordenadas $(X, Y)$ de los nodos del diagrama se mapeen de forma directa a unidades de píxel.
3. **Trayectorias de Paquetes en Curvas de Bezier Cuadráticas:**
   Los paquetes que viajan entre nodos (p. ej., `node_client` a `node_gateway`) siguen curvas parabólicas energéticas $B(t) = (1-t)^2 P_0 + 2(1-t)t P_1 + t^2 P_2$, con halos de brillo pulsantes.
4. **Anillos y Ondas de Pulso en Nodos:**
   Los nodos activos generan ondas circulares (`THREE.RingGeometry`) que se expanden y desvanecen suavemente según el estado del runtime.
5. **Gestión de Recursos y Ciclo de Vida:**
   Al desmontar el componente o cerrar la animación, se cancela el bucle `requestAnimationFrame`, se liberan geometrías y materiales (`.dispose()`), y se destruye el contexto WebGL para evitar fugas de memoria en la GPU.

---

## 3. Timeline de Ejecución Temporal

El flujo temporal está orquestado por el servicio reactivo `TimelinePlayerService` mediante **Angular Signals**:

```
Frame 0 (Petición) ──▶ Frame 1 (Gateway/Auth) ──▶ Frame 2 (Use Case) ──▶ Frame 3 (Storage)
```

### Controles Disponibles:

- **Play / Pause:** Ejecución continua o congelamiento de fotograma.
- **Step Previous / Step Next:** Navegación paso a paso para que el estudiante inspeccione el estado exacto.
- **Scrubber / Barra deslizadora:** Búsqueda directa (seek) a cualquier instante temporal.
- **Selector de Velocidad:** Modulación de velocidad en tiempo real (`0.5x`, `1x`, `2x`).
- **Reset:** Reinicio del estado de la simulación y limpieza de partículas.

---

## 4. Playgrounds Vivos del Ecosistema CASE

Se incorporó un catálogo de playgrounds interactivos listos para ejecutar:

1. **HTTP Request Flow:**
   - Client (React) $\rightarrow$ API Gateway (Proxy inverso & Rate Limiting) $\rightarrow$ Order Service (Casos de uso en memoria) $\rightarrow$ PostgreSQL (Almacenamiento indexado).
2. **Agent Loop & Tool Calling (MCP):**
   - User Prompt $\rightarrow$ Planner Agent (Reasoning Loop) $\rightarrow$ Servidor MCP (Tool Calling) $\rightarrow$ Entorno Cloud (Kubernetes Action) $\rightarrow$ Síntesis.
3. **RAG Pipeline & Vector Search:**
   - Consulta $\rightarrow$ Modelo de Embeddings (Vectores 1536d) $\rightarrow$ Base de Datos Vectorial (HNSW / Cosine Similarity) $\rightarrow$ LLM con Contexto Aumentado.

---

## 5. Lesson Runtime Desacoplado (Preparado para Sprint 2)

El contrato `LessonManifest` define una estructura completamente agnóstica que se carga vía JSON sin necesidad de recompilar Angular:

- **Metadata:** Identificación, nivel (`Fundamentos`, `Intermedio`, `Avanzado`), categoría, tiempo estimado y tags.
- **Objetivos de Aprendizaje:** Metas pedagógicas claras para el estudiante.
- **Escenas Vectoriales:** Diagramas preconfigurados por paso.
- **Timelines de Animación:** Secuencias temporales enlazadas a cada paso.
- **Checkpoints:** Criterios de validación interactivos con pistas pedagógicas.
- **Code Snippets:** Ejemplos de código limpios con sintaxis y explicaciones.
- **Preguntas / Quizzes:** Comprobaciones rápidas con evaluación instantánea y feedback explicativo.

---

## 6. Verificación Automatizada

El proyecto satisface al 100% las métricas de calidad técnica:

- `Prettier`: Formato consistente verificado.
- `ESLint`: 0 errores y 0 advertencias.
- `Vitest`: 8 suites y 30 pruebas unitarias automatizadas pasando.
- `ng build --configuration production`: Compilación limpia con presupuesto de estilos y chunks respetados.
