# 05 — Propuesta de Experiencia de Aterrizaje (Landing & Home)

> **CASE Visual Lab**  
> _Diseño de la Primera Impresión: Curiosidad, Foco y Asombro Técnico_  
> **Fecha:** Octubre 2026 · **Documento de Diseño de Landing**

---

## 1. El Reto Emocional del Primer Minuto

Cuando un ingeniero de software, arquitecto o estudiante abre CASE Visual Lab en su navegador:

- **No debe sentir:** _"Esta es otra aplicación web genérica con un menú a la izquierda y tarjetas vacías"_.
- **Debe sentir:** _"He entrado a un entorno de alta ingeniería donde la complejidad del software se vuelve transparente y hermosa ante mis ojos"_.

La landing debe generar tres sensaciones consecutivas:

1. **Segundo 0 a 5 (Curiosidad visual):** La estética OLED profunda y los contrastes vectoriales cyan transmiten precisión extrema.
2. **Segundo 5 a 15 (Claridad conceptual):** El titular (_"Architecture, AI and Systems — Drawn"_) y el teaser del manifiesto explican de inmediato la misión del producto.
3. **Segundo 15 en adelante (Impulso a la acción):** El usuario quiere tocar el lienzo o abrir una lección interactiva de inmediato.

---

## 2. Estructura Arquitectónica de la Home

```
┌────────────────────────────────────────────────────────────────────────┐
│ [1] HERO AREA                                                          │
│     • Badge de Ecosistema: "CASE OS · Visual Learning Engine"          │
│     • Título de Alto Impacto: "CASE Visual Lab"                        │
│     • Tagline: "Architecture, AI and Systems — Drawn."                 │
│     • Quick Actions: [ Abrir Canvas ]  [ Explorar Lecciones ]          │
├────────────────────────────────────────────────────────────────────────┤
│ [2] LIVE INTERACTIVE TEASER (El "Micro-Canvas" en Vivo)                │
│     • Una escena visual reducida e interactiva donde el usuario        │
│       puede arrastrar un nodo o pulsar "Simular Flujo" directamente.    │
├────────────────────────────────────────────────────────────────────────┤
│ [3] LOS TRES VERBOS DE APRENDIZAJE                                     │
│     ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│     │    [ DRAW ]      │  │   [ EXPLORE ]    │  │  [ UNDERSTAND ]  │  │
│     │ Pensar con las   │  │ Interactuar con  │  │ Validar reglas y │  │
│     │ manos en lienzo  │  │ arquitecturas    │  │ contratos sin    │  │
│     │ libre sin límites│  │ vivas y eventos  │  │ ambigüedades     │  │
│     └──────────────────┘  └──────────────────┘  └──────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│ [4] RUTAS DE APRENDIZAJE DESTACADAS (Featured Tracks)                  │
│     • RAG & Agentic AI Systems                                         │
│     • Clean Architecture & Domain-Driven Design                        │
│     • Distributed Systems & Event-Driven Patterns                      │
├────────────────────────────────────────────────────────────────────────┤
│ [5] EL MANIFIESTO & FILOSOFÍA                                          │
│     • Extracto tipográfico editorial de alto impacto con enlace directo │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detalle de Componentes Clave

### 3.1. El Interactive Teaser (El Micro-Lienzo)

En lugar de una captura de pantalla estática, el Hero incluye un **lienzo vectorial interactivo de demostración**:

- Muestra una arquitectura de microservicio mínima: `[Client] → [API Gateway] → [Auth Service] & [Order Service]`.
- Al pasar el cursor, las líneas de conexión se iluminan con un haz de partículas cyan simulando una petición HTTP.
- Un botón sutil _"Modificar en Canvas"_ traslada ese diagrama directamente al editor completo para que el usuario comience a experimentar.

### 3.2. Los Tres Verbos de Aprendizaje (Tríptico)

Tres tarjetas interactivas construidas con glassmorphism refinado:

1. **DRAW:** Muestra una pequeña animación de mano alzada transformándose automáticamente en un nodo estructurado.
2. **EXPLORE:** Muestra un pipeline RAG donde al hacer clic en un botón _"Vector Query"_ se iluminan los 3 chunks más cercanos.
3. **UNDERSTAND:** Muestra un círculo de Clean Architecture señalando con un check verde una inversión de dependencias correcta.

### 3.3. Rutas de Aprendizaje Destacadas

Tarjetas compactas con metadata técnica enriquecida:

- Título técnico de alto nivel (ej. _"RAG Internals: From Vector Search to Generation"_).
- Nivel de profundidad: `Arquitectura Avanzada` · `Tiempo estimado: 15 min`.
- Indicador de interactividad: `Lienzo Interactivo Incluido`.

---

## 4. Métricas de Éxito de la Landing

- **Time to First Draw (TTFD):** El tiempo que transcurre desde que el usuario abre la página hasta que realiza su primera interacción sobre un diagrama debe ser **menor a 20 segundos**.
- **Tasa de Retención en Filosofía:** Al menos un 35% de los primeros visitantes deben visitar `/philosophy`, consolidando la relación emocional con el movimiento CASE.
- **Rendimiento de Carga:** 100/100 en Google Lighthouse, LCP menor a 0.8s en redes de escritorio y 1.2s en conexiones móviles.
