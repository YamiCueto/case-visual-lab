# 07 — Roadmap Estratégico de Producto

> **CASE Visual Lab**  
> _Plan de Entregas, Hitos Evolutivos y Criterios de Éxito_  
> **Fecha:** Octubre 2026 · **Documento de Planificación de Producto**

---

## 1. Visión Global de los Hitos

```
[ Sprint 0 ]  Fundación Técnica, Identidad y Arquitectura Limpia           (Completado ✅)
[ Sprint 0.1] Consolidación de Identidad, ADN y Sistema de Diseño          (En curso 🚀)
      │
      ▼
[ Sprint 1 ]  El Canvas Vivo: Integración de Excalidraw y Persistencia
[ Sprint 2 ]  El Motor de Lecciones: Rutas Guiadas e Interactividad
[ Sprint 3 ]  Arquitectura Multirrenderizador: Soporte de Mermaid y C4
[ Sprint 4 ]  Playgrounds Interactivos y Validación de Reglas de Software
[ Sprint 5 ]  El Copiloto Visual y Conexión con CASE Agents
```

---

## 2. Detalle por Hito

### Sprint 1: El Canvas Vivo (Graphic Foundation)

- **Objetivo:** Transformar `/canvas` en una experiencia de diagramación fluida, de pantalla completa y persistente.
- **Entregables:**
  - Componente anfitrión de React (_React Island_) cargado de forma dinámica mediante `import()`.
  - Integración transparente de `@excalidraw/excalidraw` sin acoplar el dominio de Angular.
  - Sincronización bidireccional de tema (OLED Dark / Claro).
  - Auto-guardado con debounce en `SceneRepository` (con soporte para migración de esquemas v1 $\rightarrow$ v2).
  - Exportación local de diagramas en formato `.excalidraw`, `.svg` y `.png`.
- **Criterio de Éxito:** Dibujar un diagrama de 50 elementos, recargar el navegador y recuperarlo íntegro en menos de 300ms.

### Sprint 2: El Motor de Lecciones (Structured Learning)

- **Objetivo:** Permitir al usuario seguir lecciones técnicas paso a paso con el diagrama transformándose ante sus ojos.
- **Entregables:**
  - Esquema formal de lecciones (`LessonManifest`, `Step`, `Checkpoint`).
  - Lector estático de lecciones desde `public/content/lessons/`.
  - Panel lateral de contenido pedagógico plegable (_Lesson Drawer_).
  - Primeras 3 lecciones fundacionales:
    1. _Clean Architecture: Desacoplando el Núcleo del Dominio._
    2. _RAG Fundamentals: El Viaje de un Query Vectorial._
    3. _Event Sourcing: El Libro Contable Inmutable._

### Sprint 3: Multirrenderizador y Código a Diagrama (Multi-Engine)

- **Objetivo:** Superar la limitación de un solo motor gráfico y permitir crear diagramas a partir de texto estructurado.
- **Entregables:**
  - Abstracción `DiagramRendererAdapter` en la capa de infraestructura.
  - Motor de renderizado Mermaid para diagramas de secuencia y flujos algorítmicos.
  - Generador visual de arquitectura en formato C4 (Contexto, Contenedores, Componentes).
  - Selector de motor gráfico dentro del Canvas sin cambiar de vista.

### Sprint 4: Playgrounds & Validación Arquitectónica (Interactive Simulation)

- **Objetivo:** Convertir los diagramas en herramientas de validación de reglas de ingeniería.
- **Entregables:**
  - Nodos interactivos con estado: encendido, apagado, fallando, latencia alta.
  - Verificador de reglas arquitectónicas básicas:
    - _Alerta:_ "Capa de Dominio importando directamente módulo de Infraestructura".
    - _Alerta:_ "Ciclo de dependencia detectado entre Microservicio A y B".
  - Modo presentación interactiva para revisiones de diseño técnico (_Tech Talks / ADRs_).

### Sprint 5: Ecosistema CASE & Copiloto Agentico (Agentic Studio)

- **Objetivo:** Conectar el laboratorio visual con los agentes autónomos de CASE OS.
- **Entregables:**
  - Interfaz de comando para agentes (_Tool Calling visual_): el agente puede leer el canvas y proponer refactorizaciones visuales.
  - Generación de diagramas a partir de prompts técnicos complejos.
  - Sincronización con el currículo de CASE Academy.
