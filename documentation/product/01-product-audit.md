# 01 — Auditoría Integral de Producto, UX y Diseño

> **CASE Visual Lab**  
> _Auditoría de Identidad, Experiencia de Usuario y Coherencia de Producto_  
> **Fecha:** Octubre 2026 · **Sprint:** 0.1 (Fase de Consolidación)  
> **Roles de Auditoría:** Senior Product Designer · UX Architect · Design Systems Engineer

---

## 1. Resumen Ejecutivo del Estado Actual

En el Sprint 0 se sentó una base técnica impecable: Angular 22 standalone, reactividad mediante signals, arquitectura limpia desacoplada en cuatro capas (`domain`, `application`, `infrastructure`, `presentation`), compilación ultraligera (~69 kB iniciales) y despliegue automatizado en GitHub Pages.

Sin embargo, el producto se encuentra en una **encrucijada de identidad**:

- **Lo que fue concebido:** Un sandbox ligero alrededor de Excalidraw para desplegar diagramas.
- **Lo que debe ser:** El **motor de pensamiento y aprendizaje visual** del ecosistema **CASE OS**, donde la arquitectura de software, los modelos de IA, RAG, DDD y los sistemas complejos se exploran mediante interacción espacial.

Esta auditoría evalúa con rigor de clase mundial la distancia entre la implementación actual y el estándar de excelencia de productos de referencia como **Linear, Raycast, Notion, Zed y Figma**.

---

## 2. Auditoría Detallada por Dimensiones

### 2.1. Branding & Identidad de Marca

| Criterio                         | Estado Actual                                          | Diagnóstico                                                                                        | Oportunidad de Clase Mundial                                                          |
| :------------------------------- | :----------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| **Nombre**                       | `CASE Visual Lab`                                      | Potente y consistente con CASE OS. Transmite rigor, laboratorio e ingeniería.                      | Mantener y afianzar. Eliminar cualquier residuo semántico de "herramienta de dibujo". |
| **Tagline**                      | _Architecture, AI and Systems — Drawn._                | Excepcional. Sintético, memorable y define con exactitud la propuesta de valor.                    | Elevar su presencia jerárquica en los puntos de contacto iniciales.                   |
| **Manifiesto**                   | Incorporado en README, `/philosophy` y teaser en Home. | Tiene un impacto emocional muy fuerte ("Software is easier to understand when it becomes visual"). | Convertirlo en el eje que guía el diseño de cada lección y de cada interfaz.          |
| **Atribución de Renderizadores** | Correcta y desmarcada de Excalidraw.                   | Se cumple la regla ética: Excalidraw es solo el primer motor gráfico, no la identidad.             | Preparar la narrativa para la llegada de Mermaid, C4 y visualizadores DSL propios.    |

### 2.2. Experiencia de Aterrizaje (Landing & Dashboard)

- **Primera Impresión:** La interfaz oscura OLED con acento Cyan y el gradiente sutil provocan una impresión moderna, pero la estructura sigue respondiendo a un "dashboard administrativo" tradicional (rejilla de enlaces a páginas vacías).
- **Curiosidad & Engagement:** Un ingeniero que entra por primera vez ve tarjetas con títulos ("Lecciones", "Plantillas", "Canvas"), pero **no ve arquitectura interactiva inmediatamente**. El producto predica que "el software se entiende dibujando", pero la primera pantalla no dibuja nada.
- **Fricción Cognitiva:** El usuario tiene que hacer clic para entrar a `/canvas` o `/lessons` para entender qué hace el producto.
- **Recomendación:** La Home debe incluir un **Interactive Canvas Teaser** o una vista previa interactiva en vivo (un micro-diagrama que reaccione al hover o al clic directamente en el hero), transformando la página de un menú estático a una experiencia inmersiva inmediata.

### 2.3. Arquitectura de Información y Navegación

La barra lateral actual posee una lista plana:

```text
[Primaria]
- Inicio (dashboard)
- Lecciones (lessons)
- Plantillas (templates)
- Ejemplos (examples)
- Canvas (canvas)

[Secundaria]
- Filosofía (philosophy)
- Ajustes (settings)
- Acerca de (about)
```

**Problemas detectados:**

1. **Falta de agrupación conceptual:** "Lecciones", "Plantillas" y "Ejemplos" son modalidades de aprendizaje/contenido; "Canvas" es el entorno de creación y ejecución libre. Mezclarlos al mismo nivel confunde el modo mental del usuario (_Aprender_ vs. _Construir_).
2. **Jerarquía del Canvas:** Canvas es la joya de la corona del producto, pero hoy tiene el mismo peso visual que un catálogo de plantillas.
3. **Escalabilidad a 2 años:** Cuando existan talleres (_Workshops_), desafíos arquitectónicos (_Assessments_), copilotos de IA (_AI Tutors_) y librerías de patrones, la lista vertical colapsará visualmente.

### 2.4. La Página de Filosofía (`/philosophy`)

- **Lo brillante:** El manifiesto de 5 estrofas y las 5 convicciones ("We believe...") le dan un alma única al proyecto. No parece un software genérico; parece un movimiento intelectual de ingeniería.
- **Lo mejorable:** Hoy es puramente texto estático en tarjetas. Para ser un laboratorio visual, **la filosofía misma debe ser visual**.
- **Oportunidad:** Cada principio de la filosofía debe ilustrarse con un micro-diagrama conceptual interactivo (por ejemplo: ilustrar "The best engineers think visually" con un interruptor que transforme un bloque de código crudo en un diagrama arquitectónico limpio).

### 2.5. Lenguaje de Diseño y Sistema de Tokens

1. **Paleta Cromática (OLED Dark & Cyan):**
   - El fondo `#000000` con superficies en `rgba(255, 255, 255, 0.03)` es una base impecable para pantallas modernas.
   - El acento `hsl(186, 100%, 50%)` tiene alta luminancia y vibra con energía, pero requiere acentos semánticos auxiliares (verde para verificaciones arquitectónicas, ámbar para advertencias de acoplamiento, violeta para agentes/IA).
2. **Tipografía:**
   - La combinación `Inter` (UI) + `JetBrains Mono` (código y elementos estructurales) es el estándar dorado para herramientas de desarrolladores.
   - Falta introducir una escala de peso más intencional en títulos display (`letter-spacing: -0.03em`, line-height más ceñido en pantallas grandes).
3. **Glassmorphism & Superficies:**
   - El uso actual de `backdrop-filter: blur(16px)` es sobrio y no satura. Se deben estandarizar tres niveles estrictos de elevación para ventanas flotantes, canvas overlays y toolbars.

### 2.6. Coherencia con el Ecosistema CASE OS

CASE Visual Lab no opera en el vacío. Pertenece a una constelación:

- **CASE OS:** Sistema operativo y plataforma base.
- **CASE Algorithms:** Fundamentos algorítmicos y estructuras de datos.
- **CASE Academy:** Rutas pedagógicas estructuradas.
- **CASE Agents:** Inteligencia agentica y orquestación.

_Diagnóstico de integración:_ Actualmente no existe señalética ni navegación cruzada que ubique a Visual Lab dentro de esta constelación. Se debe incorporar un selector o breadcrumb sutil del ecosistema CASE.

---

## 3. Matriz de Hallazgos y Prioridades

| ID       | Hallazgo                                                                                  | Severidad | Dimensión         | Impacto en el Producto                                         |
| :------- | :---------------------------------------------------------------------------------------- | :-------- | :---------------- | :------------------------------------------------------------- |
| **H-01** | La Home se comporta como un dashboard administrativo, no como un laboratorio interactivo. | Alta      | UX / Landing      | Reduce el "efecto asombro" inicial en nuevos ingenieros.       |
| **H-02** | Navegación plana sin división entre Modos de Aprendizaje y Espacio de Creación.           | Media     | UX Architecture   | Dificultará el crecimiento orgánico de nuevas secciones.       |
| **H-03** | Canvas no tiene protagonismo diferenciado en la navegación.                               | Alta      | Product Hierarchy | Desdibuja el núcleo de valor donde ocurre la acción.           |
| **H-04** | Filosofía es puramente estática, carece de diagramas interactivos que la demuestren.      | Baja      | Brand Experience  | Desaprovecha la oportunidad de predicar con el ejemplo visual. |
| **H-05** | Ausencia de un sistema de Command Palette (Cmd+K / Raycast style).                        | Media     | Ergonomía Pro     | Limita la velocidad de navegación de ingenieros senior.        |
| **H-06** | Aislamiento visual del resto del ecosistema CASE OS.                                      | Baja      | Ecosistema        | Desaprovecha la sinergia de marca y navegación integrada.      |

---

## 4. Conclusión de la Auditoría

CASE Visual Lab tiene el ADN conceptual, la base técnica y la filosofía correctos para convertirse en un referente mundial. Para dar el salto cualitativo de "prototipo bien estructurado" a **producto de culto para ingenieros de software**, necesita estructurar su arquitectura de información alrededor de dos verbos fundamentales: **Aprender** y **Construir**, convirtiendo cada rincón de la aplicación en una experiencia viva donde el conocimiento se dibuja y se ejecuta.
