# 06 — Lenguaje de Diseño y Fundamentos de Design System

> **CASE Visual Lab**  
> _Sistemas Visuales, Tipografía, Espaciado, Superficies y Micro-Animación_  
> **Fecha:** Octubre 2026 · **Especificación para Design Systems Engineers**

---

## 1. Filosofía del Lenguaje Visual: Precisión Vectorial OLED

El lenguaje de diseño de CASE Visual Lab no es meramente estético; es una **herramienta ergonómica de reducción de fatiga cognitiva**.

```text
PRINCIPIO BASE:
Cada píxel en pantalla compite por la atención del ingeniero.
El fondo negro absoluto no es ausencia de color; es el vacío fértil donde la arquitectura brilla.
```

---

## 2. Sistema de Tipografía y Jerarquía Editorial

Se implementa una jerarquía estricta basada en dos fuentes optimizadas:

- **UI & Títulos:** `Inter` (sans-serif moderno con tracking ceñido).
- **Código, Métricas y Datos:** `JetBrains Mono` (monoespaciada con caracteres técnicos legibles).

### 2.1. Escala Modular y Ritmo Vertical

| Nivel              | Variable Token | Tamaño (px / rem)               | Line Height | Tracking   | Uso Principal                        |
| :----------------- | :------------- | :------------------------------ | :---------- | :--------- | :----------------------------------- |
| **Display Hero**   | `--text-2xl`   | `clamp(2.25rem, 3.5vw, 3.5rem)` | `1.08`      | `-0.035em` | Título del Hero en Home              |
| **Page Title**     | `--text-xl`    | `clamp(1.75rem, 2vw, 2.25rem)`  | `1.15`      | `-0.025em` | Encabezados de página (`PageHeader`) |
| **Section Title**  | `--text-lg`    | `1.25rem (20px)`                | `1.3`       | `-0.02em`  | Subsecciones, títulos de bloques     |
| **Body Large**     | `--text-md`    | `1.0rem (16px)`                 | `1.6`       | `-0.01em`  | Textos del manifiesto, resúmenes     |
| **Body UI**        | `--text-sm`    | `0.875rem (14px)`               | `1.5`       | `0`        | Navegación, botones, selectores      |
| **Caption / Mono** | `--text-xs`    | `0.75rem (12px)`                | `1.4`       | `+0.04em`  | Badges, atajos de teclado, metadatos |

---

## 3. Sistema de Espaciado y Malla de 8 Puntos

El ritmo espacial sigue un sistema estricto de múltiplos de 4 y 8 píxeles:

```scss
--space-1: 0.25rem; //  4px — Separaciones mínimas en badges e iconos
--space-2: 0.5rem; //  8px — Padding interno de botones y enlaces de nav
--space-3: 0.75rem; // 12px — Gaps entre icono y etiqueta de texto
--space-4: 1rem; // 16px — Espaciado estándar entre elementos de lista
--space-6: 1.5rem; // 24px — Padding de tarjetas y paneles
--space-8: 2rem; // 32px — Márgenes entre bloques de contenido
--space-12: 3rem; // 48px — Separación entre secciones mayores
--space-16: 4rem; // 64px — Padding de estados vacíos y finales de página
```

---

## 4. Arquitectura de Superficies y Elevaciones (OLED Layers)

En pantallas OLED, el uso de sombras difusas pesadas luce borroso y sucio. En su lugar, el sistema de elevación se construye mediante **luminancia de superficie y bordes con transparencia**:

```
[Nivel 4: Overlays & Palette]  rgba(15, 18, 24, 0.85) + Blur 24px + Border rgba(255,255,255, 0.16)
               ▲
[Nivel 3: Floating Panels]     #0B0D10 sólido + Border rgba(255,255,255, 0.12)
               ▲
[Nivel 2: Surface Cards]       rgba(255, 255, 255, 0.03) + Border rgba(255,255,255, 0.08)
               ▲
[Nivel 1: Substrato Activo]    Fondo de la aplicación con grid técnico tenue (16px)
               ▲
[Nivel 0: Fondo Infinito]      Pure OLED Black (#000000)
```

---

## 5. Disciplina de Glassmorphism

El efecto de vidrio debe ser quirúrgico:

1. **Regla del Blur:** No exceder `24px` para evitar degradación de rendimiento en GPUs móviles.
2. **Saturación:** Aplicar `saturate(140%)` detrás del vidrio para que los elementos arquitectónicos que pasan por debajo mantengan viveza cromática.
3. **Bordes:** Nunca usar blanco sólido. Siempre `rgba(255, 255, 255, 0.08)` a `0.14` con grosor constante de `1px`.

---

## 6. Curvas de Movimiento y Animación

El movimiento en CASE Visual Lab comunica causa y efecto; **nunca es adorno**.

### 6.1. Curva Primaria (The Engineering Ease)

```scss
--ease-out: cubic-bezier(0.16, 1, 0.3, 1); // Desaceleración suave y firme (estilo Linear)
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); // Transición de estado simétrica
```

### 6.2. Duraciones Estándar

- **Microinteracciones (hover, focus, botones):** `150ms`. Sensación de respuesta táctil instantánea.
- **Transición de Paneles y Drawers:** `280ms`. Movimiento perceptible pero sin retrasar la productividad.
- **Fade-in de Elementos:** `240ms` escalonado (_staggered_) a razón de `40ms` por elemento en listas.

### 6.3. Accesibilidad y Modo Reducido

Cumplimiento estricto con `prefers-reduced-motion` a nivel de sistema operativo y switch manual en `/settings`:

```scss
@media (prefers-reduced-motion: reduce), [data-reduced-motion] {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
