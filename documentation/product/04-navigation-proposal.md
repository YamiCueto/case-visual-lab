# 04 — Propuesta de Arquitectura de Información y Navegación

> **CASE Visual Lab**  
> _Taxonomía Cognitiva, Jerarquía Espacial y Ergonomía de Navegación_  
> **Fecha:** Octubre 2026 · **Documento de Diseño de Experiencia (UX)**

---

## 1. Problema de la Navegación Plana Actual

La navegación actual en la barra lateral lista ocho elementos en orden secuencial:

```text
Inicio → Lecciones → Plantillas → Ejemplos → Canvas → Filosofía → Ajustes → Acerca de
```

### Síntomas detectados:

1. **Parálisis de elección:** El usuario no sabe si el producto es un editor de diagramas (Canvas), un curso online (Lecciones) o un catálogo de recursos (Plantillas/Ejemplos).
2. **Dilución del Core:** El Canvas, que es la herramienta donde se pasa el 80% del tiempo de aprendizaje o trabajo, está oculto en la quinta posición.
3. **Falta de escalabilidad:** Cuando se incorporen _Workshops_, _Assessments_ o integraciones con _CASE Academy_, la lista excederá la altura de pantallas compactas sin criterio editorial.

---

## 2. Nueva Taxonomía Cognitiva

Proponemos estructurar la navegación según el **modo mental** del ingeniero:

- **CREAR (Build & Think):** Entrar al lienzo sin distracciones.
- **APRENDER (Explore & Master):** Descubrir y experimentar con sistemas guiados.
- **FUNDAMENTOS (Mindset & System):** Entender la filosofía y configurar el entorno.

```
┌────────────────────────────────────────────────────────┐
│                    CASE VISUAL LAB                     │
│                 Architecture & Systems                 │
└────────────────────────────────────────────────────────┘

  [ CREAR ]
  ★ Canvas                  [Atajo: G then C]
    Lienzo libre activo

  [ APRENDER ]
  ◆ Lecciones (Lessons)     Rutas guiadas por concepto
  ▨ Plantillas (Templates)  Puntos de partida arquitectónicos
  ◈ Ejemplos (Playgrounds)  Diagramas interactivos vivos

  [ FUNDAMENTOS ]
  ◇ Filosofía               El Manifiesto de CASE
  ⚙ Ajustes                 Preferencias del entorno
  ℹ Acerca de               Licenciamiento y ecosistema
```

---

## 3. Detalle de Secciones y Modos de Navegación

### 3.1. Acceso Directo al Canvas (Core Mode)

El ítem **Canvas** debe tener un tratamiento visual destacado:

- Posee un micro-indicador de estado en tiempo real (por ejemplo: un punto cyan tenue que indica _"Lienzo listo"_ o el número de elementos de la escena activa).
- Posee atajo de teclado global: pulsar `G` luego `C` en cualquier pantalla lleva directamente al Canvas.

### 3.2. Bloque "Aprender"

- **Lecciones (`/lessons`):** Organizadas por _Tracks_ de ingeniería:
  - Track 1: _Sistemas Distribuidos & Resiliencia_ (Sagas, Outbox Pattern, Circuit Breakers).
  - Track 2: _Inteligencia Artificial & RAG_ (Vector search, Chunking, Re-ranking, Context Windows).
  - Track 3: _Arquitectura Limpia & DDD_ (Hexagonal, Event Storming, Bounded Contexts).
- **Plantillas (`/templates`):** Diagramas preconfigurados listos para clonar y adaptar en proyectos reales.
- **Playgrounds / Ejemplos (`/examples`):** Escenarios de simulación (ej. _"¿Qué ocurre si el nodo de pagos falla? Simular con click"_).

### 3.3. Bloque "Fundamentos"

- Agrupa la identidad (`/philosophy`), la personalización (`/settings`) y la transparencia legal (`/about`).
- Ocupa la parte inferior de la barra lateral, permaneciendo visible sin invadir la zona de trabajo primaria.

---

## 4. El Command Palette (Cmd+K / Ctrl+K)

Para que CASE Visual Lab se sienta al nivel de **Raycast o VS Code**, se propone incorporar en etapas tempranas un **Command Palette** global:

```
┌──────────────────────────────────────────────────────────────────┐
│  Search lessons, templates, concepts or commands...       ESC   │
├──────────────────────────────────────────────────────────────────┤
│  ACCIONES RÁPIDAS                                                │
│  ★ Abrir nuevo Canvas en blanco                         (G then C)│
│  ◈ Buscar lección sobre RAG Internals                  (Enter)   │
│                                                                  │
│  LECCIONES RECIENTES                                             │
│  ◆ Clean Architecture: Inversión de Dependencias                 │
│  ◆ Agentic Workflows: Patrón ReAct paso a paso                   │
│                                                                  │
│  PLANTILLAS CANÓNICAS                                            │
│  ▨ Microservicios Event-Driven con Kafka                         │
│  ▨ API Gateway + BFF Architecture                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Ergonomía Responsive (Mobile vs. Desktop)

### 5.1. Escritorio (Desktop > 900px)

- Barra lateral fija con ancho óptimo de 248px.
- Soporte para colapso a barra compacta (modo íconos con tooltips de 60px) para maximizar el área de dibujo en pantallas medianas.

### 5.2. Móvil y Tablet (< 900px)

- **Top Bar Glassmorphism:** Logo de CASE Visual Lab a la izquierda, botón de menú a la derecha.
- **Drawer con Gestos:** Deslizar desde el borde izquierdo para abrir la navegación; cerrar con tap en el fondo oscuro difuminado (_scrim_).
- **Canvas Mobile:** En pantallas táctiles, los controles flotantes se agrupan en un carrusel inferior (_bottom sheet_) para permitir dibujar con dos dedos sin tapar la UI.
