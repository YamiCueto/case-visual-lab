# 10 — Plan Táctico de Siguientes Iteraciones (Sprint 1 & Sprint 2)

> **CASE Visual Lab**  
> _Checklist de Transición de Diseño a Implementación Técnica_  
> **Fecha:** Octubre 2026 · **Guía Operativa para Technical Leads**

---

## 1. Alcance Inmediato: Sprint 1 (El Canvas Vivo)

Una vez aprobada esta consolidación de identidad y diseño, el Sprint 1 debe abordar exclusivamente la activación del **Canvas** con rigor de ingeniería:

### 1.1. Tareas de Implementación en Sprint 1

1. **React Island (`CanvasHostComponent`):**
   - Montar `@excalidraw/excalidraw` dentro del ciclo de vida de Angular usando `createRoot` y `unmount` en `DestroyRef`.
   - Lazy load mediante `import()` dinámico para no penalizar el bundle inicial de la aplicación.
2. **Sincronización de Tema:**
   - Enlazar la señal `theme.isDark()` de Angular con la propiedad `theme` de Excalidraw (`"dark"` / `"light"`).
3. **Persistencia Transparente:**
   - Enlazar el evento `onChange` con un operador debounce de 500ms hacia `SceneRepository`.
   - Asegurar que la escena se guarde en `localStorage` bajo el namespace `cvl:scene:<id>`.
4. **Controles Flotantes Mínimos:**
   - Botón de pantalla completa (_Zen Mode_).
   - Botón de exportación rápida a `.excalidraw` y `.svg`.

### 1.2. Criterios de Aceptación de UX para Sprint 1

- [ ] Al entrar a `#/canvas`, el lienzo ocupa el 100% del área disponible sin desbordamientos de scroll indeseados.
- [ ] El cambio de tema OLED/Claro en `#/settings` se refleja inmediatamente en el lienzo sin recargar la página.
- [ ] Al dibujar un rectángulo o texto en el Canvas y presionar F5 (recargar), el contenido reaparece intacto.
- [ ] No hay fugas de memoria en cambios de ruta repetidos entre `#/dashboard` y `#/canvas`.

---

## 2. Preparación para Sprint 2 (El Motor de Lecciones)

Durante el Sprint 1, el equipo de diseño y producto dejará preparados los siguientes activos para el Sprint 2:

1. **Esquema JSON de Lección (`lesson-manifest.schema.json`):**
   - Definición de metadatos (título, autor, nivel, tags).
   - Secuencia de pasos (`steps`), cada uno con una explicación en Markdown y una escena vectorial asociada.
2. **Primera Lección Piloto:**
   - _Clean Architecture & Inversión de Dependencias:_ Un diagrama interactivo de 4 pasos que ilustra la regla de dependencia hacia el núcleo.
