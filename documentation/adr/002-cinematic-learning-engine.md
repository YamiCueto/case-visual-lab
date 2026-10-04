# ADR 002: Cinematic Learning Engine & Visual Behaviors Architecture

- **Status:** Accepted
- **Date:** 2026-10-04
- **Sprint:** Sprint 2 — Cinematic Learning Engine
- **Deciders:** Principal Software Architect, Senior Frontend Engineer, UX Architect

---

## 1. Context

CASE Visual Lab no es un editor de diagramas: es el motor visual y pedagógico del ecosistema **CASE OS** y **CASE Academy** para enseñar Ingeniería de Software, Arquitectura, Inteligencia Artificial, Agentes, RAG, MCP y Sistemas Distribuidos.

### El problema de la educación técnica tradicional:

Actualmente, los educadores y arquitectos se ven obligados a saltar entre herramientas fragmentadas:
$$\text{PowerPoint} + \text{PDF} + \text{Draw.io} + \text{Excalidraw} + \text{Videos} + \text{GIFs} + \text{Código}$$

Esto produce diagramas estáticos, desconectados del código y sin interactividad.

### La Solución de CASE Visual Lab:

Reemplazar este conjunto fragmentado por una **experiencia cinematográfica interactiva y unificada**:
$$\text{CASE Academy} \longrightarrow \text{CASE Visual Lab} \longrightarrow \text{Lección Viva} \longrightarrow \text{Narrativa} \longrightarrow \text{Animaciones 3D} \longrightarrow \text{Interacción} \longrightarrow \text{Evaluación}$$

---

## 2. Decisión Arquitectónica

Se diseñó e implementó la arquitectura del **Cinematic Learning Engine** basada en **Clean Architecture** y **Ports & Adapters**, asegurando que el dominio nunca dependa de librerías gráficas específicas (Excalidraw, Three.js, Mermaid, etc.).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DOMINIO CINEMÁTICO                              │
│                                                                        │
│   CinematicTimeline ──▶ CinematicFrame ──▶ NarrativeFrame              │
│            │                    │                                      │
│            ▼                    ▼                                      │
│   [VisualBehavior]       [AnimatedEntity]   [LiveStateMutation]        │
│            │                    │                    │                 │
│            └────────────────────┼────────────────────┘                 │
│                                 ▼                                      │
│                         [CameraPort]                                   │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ implements
┌─────────────────────────────────┴──────────────────────────────────────┐
│                    ADAPTADORES DE INFRAESTRUCTURA                      │
│                                                                        │
│   CameraControllerAdapter        ThreeParticleAdapter (WebGL 3D)       │
│   ExcalidrawAdapter (React Island)  [Futuro: WebAudioNarrativeAdapter] │
└────────────────────────────────────────────────────────────────────────┘
```

### Componentes Clave del Sistema:

1. **Visual Behaviors (`VisualBehavior`):**
   - Catálogo universal de comportamientos tipados (`packet-flow`, `node-pulse`, `request-response`, `cache-hit`, `database-write`, `agent-thinking`, `tool-call`, `token-generation`, `vector-match`, etc.).
   - Representan _intenciones pedagógicas_, no píxeles.
2. **Timeline Cinemático & Cinematic Frame:**
   - La unidad de ejecución no es solo Play/Pause, sino un **CinematicFrame** determinístico:
     $$\text{Frame} \longrightarrow \text{Narración} \longrightarrow \text{Animación} \longrightarrow \text{Estado} \longrightarrow \text{Código} \longrightarrow \text{Explicación} \longrightarrow \text{Pregunta} \longrightarrow \text{Checkpoint}$$
3. **Camera System (`CameraPort`):**
   - Contratos desacoplados para coreografía visual:
     `focus(node)`, `zoom(node, level)`, `highlight(node)`, `fade(node)`, `orbit(node)`, `shake()`, `fitScene()`, `follow(entity)`, `center()`.
4. **Animated Entities (`AnimatedEntity`):**
   - Modelos para entidades que viajan por el sistema: HTTP Request, JWT, SQL Query, Vector Embedding, Document Chunk, Agent Thought, Tool Call.
5. **Live State (`LiveStateMutation`):**
   - Mutaciones visuales temporales sobre nodos durante la reproducción (cambio de status: `idle` | `processing` | `success` | `error`, badges de rate-limit, métricas de latencia).
6. **Narrative Engine (`NarrativeFrame`):**
   - Guión explicativo paso a paso, código fuente sincronizado, preguntas de comprobación con feedback y notas pedagógicas para el instructor.
7. **Simulaciones 100% Determinísticas y Locales:**
   - Cero dependencia de LLMs o APIs externas de pago en runtime. Cada simulación es reproducible, offline-first y determinística.

---

## 3. Consecuencias y Beneficios

### Positivas

- **Extensibilidad a 3–5 años:** Incorporar nuevos renderizadores (Mermaid, Three.js 3D completo, C4 o canvas nativo) no modifica el dominio ni el catálogo de lecciones.
- **Enseñanza Activa:** El alumno puede pausar, inspeccionar el código, contestar la pregunta de comprobación y volver a reproducir a velocidad variable.
- **Rendimiento:** Three.js y WebGL permanecen en lazy chunks, cargándose únicamente cuando se activa la animación.
- **Cero Costo de Operación:** Sin llamadas a APIs pagadas; todo funciona en el cliente y es compatible con GitHub Pages.

---

## 4. Roadmap de Evolución

- **Sprint 2 (Actual):** Contratos, modelos de dominio, CameraPort, catálogo de behaviors y CinematicEngineService.
- **Sprint 3:** Live State visual badges dentro del canvas de Excalidraw / Three.js y editor visual de Timelines.
- **Sprint 4:** Carga de lecciones cinematográficas dinámicas desde repositorio remoto vía JSON sin recompilar la aplicación.
- **Sprint 5:** Modo Presentador para instructores (notas privadas del profesor, modo proyector y control por teclado).
