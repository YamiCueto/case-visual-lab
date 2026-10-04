# 03 — Directrices de Marca y Sistema de Identidad

> **CASE Visual Lab**  
> _Guía de Marca, Voz, Tono y Sistemas Visuales_  
> **Fecha:** Octubre 2026 · **Manual de Marca Oficial**

---

## 1. Naming y Arquitectura de Nombre

### 1.1. Nombre Oficial

- **Nombre Canónico:** `CASE Visual Lab`
- **Variante Breve / Monograma:** `CVL`
- **Sufijo de Ecosistema:** `part of CASE OS`

### 1.2. Reglas Estrictas de Denominación

- **SÍ:** _CASE Visual Lab_, _Visual Lab_, _El Canvas de CASE Visual Lab_.
- **NUNCA:** _Excalidraw Lab_, _CASE Excalidraw_, _Clon de Excalidraw_, _Editor de diagramas_.
- **Justificación:** Excalidraw es un detalle de implementación e infraestructura técnica de renderizado para uno de los modos gráficos. La marca es propiedad del ecosistema CASE.

---

## 2. Declaración de Propósito y Tagline

```text
Nombre:     CASE Visual Lab
Tagline:    Architecture, AI and Systems — Drawn.
Propósito:  Transformar conceptos complejos de ingeniería en experiencias visuales interactivas.
Misión:     Democratizar la intuición espacial y arquitectónica para ingenieros de software.
```

---

## 3. Personalidad, Voz y Tono

La personalidad de CASE Visual Lab está inspirada en las grandes obras maestras de herramientas técnicas: **UNIX, TeX, Figma, Linear y Smalltalk**.

```
    [ INTELECTUAL ]           [ PRECISO ]           [ MINIMALISTA ]
   No subestima al        Habla el lenguaje de    Elimina lo superfluo;
     ingeniero              la arquitectura        cada píxel tiene razón
```

| Dimensión                | Cómo suena CASE Visual Lab                                                   | Cómo NUNCA debe sonar                                                               |
| :----------------------- | :--------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| **Tono General**         | Seguro, cerebral, sobrio, elegante, pedagógico.                              | Festivo, corporativo vacío, estilo infomercial o "ed-tech" infantil.                |
| **Uso de Jerga**         | Preciso: _"Límites de contexto en DDD"_, _"Pipeline de embeddings RAG"_.     | Vacío: _"¡Dibuja fácil y divertido!"_, _"La app para hacer dibujitos rápidos"_.     |
| **Instrucciones**        | Claras, minimalistas: _"Presiona Space para moverte. Dibuja para explorar."_ | Verbosas y paternalistas: _"¡Hola amigo! Haz clic aquí para comenzar tu aventura"_. |
| **Feedback del Sistema** | Conciso: _"Escena guardada localmente (v1)"_, _"Esquema migrado"_.           | Ruidoso: _"¡Hurra! Tu increíble diagrama se ha guardado con éxito 🎉"_.             |

---

## 4. Paleta Cromática y Sistema Semántico

La paleta está calibrada para sesiones de trabajo prolongadas, monitores profesionales de alta gama (OLED/HDR) y máxima legibilidad nocturna con descanso visual.

```
       #000000             #0B0D10             #00F2FE             #9AA3AE
   [ OLED BLACK ]     [ DEEP OBSIDIAN ]   [ VECTOR CYAN ]     [ SYSTEM SLATE ]
    Fondo infinito       Superficie          Acento de foco      Tipografía media
```

### 4.1. Escala Base

- **Pure OLED Black (`#000000`):** El lienzo infinito. Elimina la fatiga de emisión de luz y resalta los trazos vectoriales.
- **Deep Obsidian Surface (`#0B0D10`):** Superficie de paneles, tarjetas flotantes y barras de herramientas.
- **Surface Hover (`rgba(255, 255, 255, 0.05)`):** Interacción suave al pasar el cursor.
- **Border Subtle (`rgba(255, 255, 255, 0.08)`):** Delimitación precisa de 1px sin distracción.
- **Border Highlight (`rgba(255, 255, 255, 0.16)`):** Estado activo o seleccionado.

### 4.2. Colores Semánticos de Dominio (Arquitectura & Sistemas)

- **Vector Cyan (`hsl(186 100% 50%)` / `#00F2FE`):** Acento primario de la marca. Energía, precisión, foco y vectorización.
- **Architecture Emerald (`hsl(152 75% 48%)`):** Representa integridad, contratos válidos, dominio puro y transacciones completadas con éxito.
- **Coupling Amber (`hsl(38 95% 54%)`):** Alertas arquitectónicas, deuda técnica, acoplamiento eferente excesivo o latencia en nodos.
- **Agentic Violet (`hsl(265 85% 66%)`):** Flujos de Inteligencia Artificial, agentes autónomos, embeddings vectoriales y memoria de contexto.
- **Failure Crimson (`hsl(350 85% 58%)`):** Ruptura de invariantes, cuellos de botella y fallos en sistemas distribuidos.

---

## 5. Tipografía y Estilo de Renderizado

1. **Tipografía Principal de Interfaz:** `Inter` (Google Fonts / Self-hosted en Sprint 1).
   - Peso regular (400) para párrafos.
   - Medium (500) para navegación y acciones secundarias.
   - SemiBold (600) para encabezados técnicos y títulos.
   - `letter-spacing: -0.02em` en títulos para tensión tipográfica contemporánea.
2. **Tipografía Técnica & Código:** `JetBrains Mono`.
   - Utilizada en esquemas, identificadores de lecciones, atajos de teclado, métricas de latencia y código fuente embebido.
   - Proporción numérica tabular (`font-variant-numeric: tabular-nums`).

---

## 6. El Símbolo Gráfico (Brand Mark)

El isotipo oficial de CASE Visual Lab se construye a partir de la superposición de planos ortogonales que forman un nodo conectado:

- Representa un **cubo isométrico desplegándose en un plano bidimensional** (el paso del sistema abstracto al lienzo).
- En CSS actual está resuelto mediante un gradiente cónico angular (`conic-gradient(from 210deg, var(--color-accent), #6d5dfc, var(--color-accent))`) con resplandor difuso (_glow_).
- **Regla de uso:** Nunca debe ser deformado ni acompañado de degradados de baja calidad que rompan la armonía OLED.
