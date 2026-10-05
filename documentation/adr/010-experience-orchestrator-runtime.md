# ADR 010: Experience Orchestrator Runtime — Coordinación y Ciclo de Vida del Motor Vivo

- **Estado:** Propuesto / Aceptado
- **Fecha:** 2026-10-05
- **Sprint:** Sprint 3 — Cierre de Arquitectura de Runtime y Plataforma
- **Autores / Decisores:** Principal Software Architect, Distinguished Engineer, Runtime Systems Architect, Game Engine Architect, Clean Architecture Reviewer
- **Contexto:** Habiendo completado y verificado físicamente el **Engine Core** (`v0.3-engine-core`: EventBus, VirtualClock, StateMachine, Simulation, Behaviors, Timeline, Renderer) y la **Plataforma de Infraestructura** (`v0.4-runtime-platform`: AssetEngine, ExperienceLoader, PluginEngine), este documento define el plano formal del **Runtime Vivo**. Especifica cómo cooperan todos los subsistemas sin acoplarse, cómo se garantiza el determinismo temporal absoluto, cómo se controlan las barreras de ejecución y cómo se previene cualquier fuga de memoria (RAM, GPU, Audio, Workers) en la orquestación de experiencias interactivas.

---

## 1. Contexto y Declaración del Problema

Hasta el Sprint 3 (Paso 10), CASE Visual Lab ha implementado sus subsistemas como módulos aislados y determinísticos en TypeScript puro (`src/app/engine/`):

```text
Platform Runtime (v0.4-runtime-platform)
│
├── Kernel
│   ├── RuntimeEventBus       (ADR-007: Prioridades, desacoplamiento pub/sub)
│   ├── VirtualClock          (ADR-002, ADR-005: Tiempo determinístico, ticks, speed, seek)
│   └── RuntimeStateMachine   (ADR-003, ADR-007: Máquina de estados atómica, tabla de transiciones)
│
├── Domain Execution Engines
│   ├── SimulationRuntime     (ADR-006: Discrete Event Simulation, providers SPI, snapshots)
│   ├── BehaviorRegistry      (ADR-002, ADR-005: Traductores semánticos Open/Closed, commands)
│   ├── TimelineEngine        (ADR-005: Scheduler paralelo, pistas concurrentes, marcadores)
│   └── RendererEngine        (ADR-001, ADR-005: Universal pipeline, dispatching, batches, ports)
│
└── Platform Infrastructure Engines
    ├── AssetEngine           (ADR-004, ADR-008: Manifest loading, cache, validator, migrations)
    └── PluginEngine          (ADR-006, ADR-009: Inverted index, orden topológico, extensions SPI)
```

### El Desafío Arquitectónico:

Los motores están construidos y probados al 100%, pero **no interactúan entre sí por sí mismos**.

- El `VirtualClock` avanza ticks, pero no sabe qué simulación avanzar.
- La `SimulationRuntime` emite eventos de dominio, pero no sabe qué handlers de comportamiento invocarlos.
- Los `BehaviorHandlers` producen `RendererCommands`, pero no saben en qué pista del `TimelineEngine` programarlos ni a qué puerto del `RendererEngine` despacharlos.
- El `AssetEngine` entrega un `ExperienceDescriptor`, pero no sabe quién debe inicializar las escenas o los plugins.

Se requiere un **Supervisor de Ejecución Central**: el `ExperienceOrchestrator`.
Si este orquestador se diseña incorrectamente, se convertirá instantáneamente en un **God Object** monolítico lleno de llamadas directas, fugas de memoria y dependencias circulares.

Este ADR define con rigor matemático y de sistemas el **Experience Orchestrator Runtime**: el plano maestro de cooperación, sincronización temporal, control de estados y gestión de ciclo de vida.

---

## 2. Principios de Diseño y Límites Estrictos de Responsabilidad

El `ExperienceOrchestrator` es un **Supervisor**, no un ejecutor de tareas de bajo nivel.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTERAS DEL EXPERIENCE ORCHESTRATOR               │
├───────────────────────────────────┬────────────────────────────────────┤
│ LO QUE HACE (Responsabilidades)   │ LO QUE TIENE PROHIBIDO HACER       │
├───────────────────────────────────┼────────────────────────────────────┤
│ 1. Orquesta el ciclo de vida      │ 1. NUNCA ejecuta lógica de dominio │
│    formal de 12 estados.          │    (cero parsing de HTTP, JWT...). │
│ 2. Sincroniza el tick del reloj   │ 2. NUNCA dibuja, renderiza ni toca │
│    con el pipeline de ejecución.  │    Canvas, WebGL o Three.js.       │
│ 3. Enlaza eventos de salida de un │ 3. NUNCA genera eventos de         │
│    motor con entradas del otro.   │    simulación por su cuenta.       │
│ 4. Supervisa barreras de tiempo   │ 4. NUNCA importa Angular (@angular)│
│    (Seek, Pause, Resume).         │    ni RxJS ni componentes web.     │
│ 5. Gestiona el orden topológico   │ 5. NUNCA accede al DOM, window o   │
│    de encendido y apagado.        │    localStorage.                   │
│ 6. Contiene fallas y aísla        │ 6. NUNCA almacena estado visual ni │
│    errores de plugins/renderers.  │    mallas 3D en su memoria.        │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Entidades Arquitectónicas y Contratos del Runtime

Para evitar acoplamientos, el orquestador trabaja con cinco estructuras fundamentales de datos y composición:

### 3.1 `ExperienceContext`

Información inmutable y metadatos de la experiencia cargada, derivada del `ExperienceDescriptor`:

```typescript
export interface ExperienceContext {
  readonly manifest: ExperienceManifest;
  readonly sessionKey: string;
  readonly originalFormat: 'experience' | 'legacy-lesson';
  readonly schemaVersion: string;
  readonly loadedAt: number;
}
```

### 3.2 `RuntimeContext`

Acceso unificado que el orquestador entrega a componentes autorizados (como plugins o inspectores de depuración):

```typescript
export interface RuntimeContext {
  readonly clock: IVirtualClock;
  readonly eventBus: IRuntimeEventBus;
  readonly stateMachine: IRuntimeStateMachine;
  readonly extensions: IExtensionAccessor;
  readonly sessionId: string;
}
```

### 3.3 `ExecutionSession`

Representa una sesión viva de reproducción. Contiene contadores determinísticos, snapshots acumulados y métricas:

```typescript
export interface ExecutionSession {
  readonly id: string;
  readonly experienceId: string;
  readonly startedAtTicks: number;
  frameSequence: number;
  lastTickVirtualTime: number;
  activeProfile: ExperienceProfileType;
}
```

### 3.4 `EngineComposition` & `EngineOwnership`

Define la jerarquía estricta de propiedad de los motores. **El Orchestrator posee los núcleos**, pero delega la ejecución interna:

```
ExperienceOrchestrator (Owner)
│
├── Kernel Components (Owned)
│   ├── RuntimeEventBus
│   ├── VirtualClock
│   └── RuntimeStateMachine
│
├── Pipeline Coordinators (Owned)
│   ├── SimulationRuntime
│   ├── BehaviorRegistry
│   ├── TimelineEngine
│   └── RendererEngine
│
└── Platform Managers (Owned)
    ├── AssetLoader
    └── PluginLoader
```

---

## 4. El Ciclo de Vida Formal de 12 Estados

El orquestador implementa una máquina de estados determinística gobernada por `RuntimeStateMachine` con 12 estados atómicos:

```
  ┌─────────┐
  │  LOAD   │ ──► [AssetLoader resuelve y recupera JSON/recursos]
  └────┬────┘
       ▼
 ┌───────────┐
 │ VALIDATE  │ ──► [SchemaValidator + Compatibility check de Plugins]
 └─────┬─────┘
       ▼
   ┌───────┐
   │ BUILD │ ──► [PluginResolver: orden topológico + Wiring de motores]
   └───┬───┘
       ▼
┌──────────────┐
│  INITIALIZE  │ ──► [Lifecycle: initialize() en Plugins, Simulation, Renderer]
└──────┬───────┘
       ▼
   ┌───────┐
   │ READY │ ◄──────────────────────┐
   └───┬───┘                        │
       ▼                            │
   ┌───────┐      Pause Barrier     │ Stop
   │ PLAY  │ ─────────────────► ┌───┴───┐
   └───┬───┘                    │ PAUSE │
       ▲                        └───┬───┘
       │          Resume Barrier    │
       ├────────────────────────────┘
       ▼
   ┌───────┐
   │ SEEK  │ ──► [Seek Barrier: Rewind determinístico de Simulación y Timeline]
   └───┬───┘
       │ Retorna a PLAY o PAUSE
       ▼
   ┌───────┐
   │ STOP  │ ──► [Flush de pipelines + Reset a tiempo 0]
   └───┬───┘
       ▼
  ┌─────────┐
  │ DESTROY │ ──► [Teardown inverso: liberación de GPU, Audio, Memory]
  └─────────┘
```

### 4.1 Matriz de Operaciones por Estado

| Estado           | Motores que Participan     | Eventos Publicados en `RuntimeEventBus`     | Dependencias que se Inicializan         | Posibles Errores / Fallas                             |
| :--------------- | :------------------------- | :------------------------------------------ | :-------------------------------------- | :---------------------------------------------------- |
| **`LOAD`**       | `AssetEngine`              | `EXPERIENCE_LOADING`, `ASSET_LOADED`        | `AssetProvider`, `AssetCache`           | Archivo no encontrado, I/O timeout, formato corrupto. |
| **`VALIDATE`**   | `AssetEngine.Validator`    | `EXPERIENCE_VALIDATED`                      | Reglas de schema, checks de versión     | `INVALID_SCHEMA`, `UNSUPPORTED_VERSION`.              |
| **`BUILD`**      | `PluginEngine.Resolver`    | `TOPOLOGY_RESOLVED`, `ENGINES_WIRED`        | Grafo de dependencias de plugins        | `CIRCULAR_DEPENDENCY`, `MISSING_DEPENDENCY`.          |
| **`INITIALIZE`** | Todos los motores          | `PLUGINS_INITIALIZED`, `SYSTEM_INITIALIZED` | Ports de Render, Provider de Simulación | Falla en handshake de WebGL/WebAudio.                 |
| **`READY`**      | StateMachine               | `EXPERIENCE_READY`                          | Frame 0 preparado en Timeline           | Estado inválido de inicio.                            |
| **`PLAY`**       | Clock, Sim, Timeline, Rend | `EXPERIENCE_STARTED`, `TICK_EMITTED`        | Loop de frames activo                   | Excepción no capturada en Behavior.                   |
| **`PAUSE`**      | Clock, Renderer            | `EXPERIENCE_PAUSED`                         | Reloj congelado en VirtualTime actual   | Desincronización de barrera.                          |
| **`SEEK`**       | Clock, Sim, Timeline, Rend | `SEEK_STARTED`, `SEEK_COMPLETED`            | Restauración de snapshots históricos    | Time delta negativo no soportado por simulación.      |
| **`RESUME`**     | Clock                      | `EXPERIENCE_RESUMED`                        | Descongelamiento de reloj               | Reanudación sin estar pausado.                        |
| **`STOP`**       | Todos los motores          | `EXPERIENCE_STOPPED`                        | Reseteo a tiempo virtual 0              | Falla en drenado de comandos pendientes.              |
| **`DESTROY`**    | Todos los motores          | `RUNTIME_DISPOSED`                          | Destrucción en orden inverso            | Memory leak o recurso colgado.                        |
| **`ERROR`**      | StateMachine, EventBus     | `RUNTIME_ERROR`                             | Aislamiento de fallas / Degradación     | Falla crítica irrecuperable.                          |

---

## 5. Barreras de Ejecución y Sincronización Temporal

Una **Barrera** es un mecanismo determinístico que congela temporalmente la tubería de datos para garantizar consistencia antes de permitir que el sistema avance.

### 5.1 Seek Barrier (Rewind y Fast-Forward Determinístico)

El seek temporal es una de las operaciones más complejas en un motor interactivo. No basta con cambiar el número del reloj; el estado del mundo debe reconstruirse fielmente:

```text
Usuario solicita seek(T_destino)
    │
    ▼
1. Emitir 'SEEK_STARTED' (Pausar virtual clock inmediatamente)
    │
    ▼
2. Drenar comandos en tránsito en RendererEngine y TimelineEngine
    │
    ▼
3. Si T_destino < T_actual (Rewind):
   a. Restaurar SimulationSnapshot del punto de control previo más cercano
   b. Ejecutar micro-ticks de simulación rápida sin renderizar hasta alcanzar T_destino
   Si T_destino >= T_actual (Fast-Forward):
   a. Avanzar simulación determinísticamente hasta T_destino
    │
    ▼
4. Reposicionar TimelineEngine en T_destino y evaluar marcadores
    │
    ▼
5. Generar RendererBatch para el frame estático en T_destino
    │
    ▼
6. Despachar al RendererEngine para pintar el frame congelado
    │
    ▼
7. Emitir 'SEEK_COMPLETED' y restaurar estado previo (PLAY o PAUSE)
```

### 5.2 Pause Barrier

- Congela el `VirtualClock` inmediatamente.
- Permite que los comandos que ya se encuentran en los `RendererPorts` terminen su fotograma actual.
- No descarta el estado de animación; solo detiene la generación de nuevos deltas de tiempo.

### 5.3 Resume Barrier

- Valida que el runtime se encuentre en estado `PAUSED`.
- Recalcula el `lastFrameTimestamp` real para evitar saltos temporales gigantes (time leap).
- Reactiva el `VirtualClock` y continúa la emisión fluida de ticks.

---

## 6. El Ciclo de Tick Determinístico (Frame Generation Pipeline)

Durante el estado `PLAY`, cada fotograma o paso temporal recorre una tubería unidireccional y estrictamente desacoplada:

```
VirtualClock.tick(dtMs)
      │
      ▼ (virtualTime, deltaTimeMs, frameNumber)
SimulationRuntime.step(deltaTimeMs)
      │
      ▼ Emite SimulationEvents (e.g. PACKET_SENT, NODE_RECEIVED)
BehaviorRegistry.translate(simulationEvent, context)
      │
      ▼ Traduce a RendererCommands (e.g. SPAWN_PARTICLE, FOCUS_CAMERA)
TimelineEngine.schedule(commands, virtualTime)
      │
      ▼ Agrupa y programa en tracks concurrentes
RendererEngine.dispatch(timelineBatch, renderContext)
      │
      ▼ Particiona por target renderer y crea RendererBatches
RendererPorts (ExcalidrawPort, ThreePort, AudioPort)
      │
      ▼ Ejecución de lotes sin conocimiento del motor
FRAME COMPLETE ──► Notifica 'FRAME_RENDERED' en RuntimeEventBus
```

---

## 7. Secuencia de Inicialización (Startup) y Destrucción (Shutdown)

Para prevenir fugas de memoria en WebGL, WebAudio o WebWorkers, el encendido y el apagado siguen órdenes algebraicamente opuestos:

### 7.1 Secuencia de Inicialización (Forward Topological)

```text
1. Kernel Base: RuntimeEventBus + RuntimeStateMachine
2. Clock: VirtualClock (congelado en 0)
3. Platform: AssetEngine + PluginEngine
4. Extension Registration: Plugins registran capacidades y namespaces
5. Domain Engines: SimulationRuntime + TimelineEngine + BehaviorRegistry
6. Render Engine: RendererEngine registra RendererPorts
7. Handshake: Todos los puertos ejecutan initialize()
8. State: Transición a READY
```

### 7.2 Secuencia de Destrucción (Reverse Topological)

```text
1. Stop: Clock se apaga, loop de frames se detiene.
2. Flush: RendererEngine y TimelineEngine vacían batches pendientes.
3. Renderers Teardown: RendererEngine.dispose() -> Ports liberan WebGL contexts, texturas y Canvas.
4. Behavior Teardown: BehaviorRegistry.clear().
5. Timeline Teardown: TimelineEngine.dispose().
6. Simulation Teardown: SimulationRuntime.dispose() -> Providers cierran conexiones de red mock/sockets.
7. Plugins Teardown: PluginLoader.dispose() -> Plugins ejecutan dispose() en orden inverso a sus dependencias.
8. Cache Cleanup: AssetCache.clear().
9. Bus Teardown: RuntimeEventBus.clear().
10. State: Transición final e irreversible a DESTROYED.
```

---

## 8. Diagramas Mermaid Arquitectónicos (10 Diagramas)

### Diagrama 1: Máquina de Estados del Runtime (12 Estados)

```mermaid
stateDiagram-v2
    [*] --> LOAD
    LOAD --> VALIDATE: Assets Cargados
    LOAD --> ERROR: Falla de I/O

    VALIDATE --> BUILD: Schema Válido
    VALIDATE --> ERROR: Schema Inválido

    BUILD --> INITIALIZE: Grafo Resuelto
    BUILD --> ERROR: Dependencia Circular

    INITIALIZE --> READY: Motores Listos
    INITIALIZE --> ERROR: Falla de Handshake

    READY --> PLAY: play()
    PLAY --> PAUSE: pause()
    PAUSE --> PLAY: resume()

    PLAY --> SEEK: seek(time)
    PAUSE --> SEEK: seek(time)
    SEEK --> PLAY: Destino Alcanzado (si venía de Play)
    SEEK --> PAUSE: Destino Alcanzado (si venía de Pause)

    PLAY --> STOP: stop()
    PAUSE --> STOP: stop()
    STOP --> READY: reset()

    READY --> DESTROY: dispose()
    STOP --> DESTROY: dispose()
    ERROR --> DESTROY: dispose()

    DESTROY --> [*]
```

---

### Diagrama 2: Jerarquía de Propiedad y Composición (Ownership Tree)

```mermaid
classDiagram
    class ExperienceOrchestrator {
      -session: ExecutionSession
      -stateMachine: RuntimeStateMachine
      -eventBus: RuntimeEventBus
      -clock: VirtualClock
      -assetLoader: AssetLoader
      -pluginLoader: PluginLoader
      -simulation: SimulationRuntime
      -timeline: TimelineEngine
      -behaviors: BehaviorRegistry
      -renderer: RendererEngine
      +load(uri): Promise~void~
      +play(): void
      +pause(): void
      +seek(timeMs): Promise~void~
      +stop(): void
      +dispose(): Promise~void~
    }

    class Kernel {
      <<Boundary>>
      RuntimeEventBus
      VirtualClock
      RuntimeStateMachine
    }

    class ExecutionEngines {
      <<Boundary>>
      SimulationRuntime
      BehaviorRegistry
      TimelineEngine
      RendererEngine
    }

    class PlatformServices {
      <<Boundary>>
      AssetLoader
      PluginLoader
    }

    ExperienceOrchestrator *-- Kernel: Posee y gobierna
    ExperienceOrchestrator *-- ExecutionEngines: Supervisa y conecta
    ExperienceOrchestrator *-- PlatformServices: Consume
```

---

### Diagrama 3: Secuencia de Inicio y Ensamblaje (Startup Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host Shell / UI
    participant Orch as ExperienceOrchestrator
    participant Assets as AssetEngine
    participant Plugins as PluginLoader
    participant Sim as SimulationRuntime
    participant Behav as BehaviorRegistry
    participant Time as TimelineEngine
    participant Rend as RendererEngine
    participant Clock as VirtualClock

    Host->>Orch: load("exp_http_lifecycle")
    activate Orch
    Orch->>Assets: loadExperience("exp_http_lifecycle")
    Assets-->>Orch: ExperienceDescriptor (Manifest validado)

    Orch->>Plugins: loadAndResolve(manifest.plugins)
    Plugins-->>Orch: Plugins ordenados topológicamente

    Orch->>Plugins: initializeAll(context)
    Orch->>Sim: setProvider(manifest.simulation.provider)
    Orch->>Time: loadTracks(manifest.timeline.tracks)
    Orch->>Rend: initialize()

    Orch->>Clock: reset(0)
    Orch->>Host: StateChanged(READY)
    deactivate Orch
```

---

### Diagrama 4: El Bucle de Tick Determinístico (Tick Loop)

```mermaid
sequenceDiagram
    autonumber
    participant Clock as VirtualClock
    participant Orch as ExperienceOrchestrator
    participant Sim as SimulationRuntime
    participant Behav as BehaviorRegistry
    participant Time as TimelineEngine
    participant Rend as RendererEngine
    participant Bus as RuntimeEventBus

    Clock->>Orch: onTick(virtualTime, dtMs, frameNum)
    activate Orch

    Orch->>Sim: step(dtMs)
    Sim-->>Orch: readonly SimulationEvent[]

    loop Para cada SimulationEvent
        Orch->>Behav: translate(simEvent, context)
        Behav-->>Orch: RendererCommand[]
        Orch->>Time: schedule(commands, virtualTime)
    end

    Orch->>Time: evaluateFrame(virtualTime)
    Time-->>Orch: TimelineFrame (active commands)

    Orch->>Rend: dispatch(activeCommands, context)
    Rend-->>Orch: Batches despachados a Ports

    Orch->>Bus: publish("FRAME_RENDERED", { frameNum, virtualTime })
    deactivate Orch
```

---

### Diagrama 5: Barrera de Seek y Rebobinado Determinístico (Seek Barrier)

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario / UI
    participant Orch as ExperienceOrchestrator
    participant Clock as VirtualClock
    participant Rend as RendererEngine
    participant Sim as SimulationRuntime
    participant Time as TimelineEngine

    User->>Orch: seek(2500ms)
    activate Orch
    Orch->>Clock: pause()
    Orch->>Rend: drainPendingBatches()

    alt Seek Hacia Atrás (Rewind: 2500ms < tiempo actual)
        Orch->>Sim: restoreClosestSnapshot(2500ms)
        Orch->>Sim: fastForwardSimulationTo(2500ms)
    else Seek Hacia Adelante (Fast-Forward: 2500ms > tiempo actual)
        Orch->>Sim: fastForwardSimulationTo(2500ms)
    end

    Orch->>Time: seekTo(2500ms)
    Orch->>Clock: setTime(2500ms)

    Orch->>Time: evaluateFrame(2500ms)
    Time-->>Orch: staticFrameCommands
    Orch->>Rend: dispatch(staticFrameCommands, { virtualTime: 2500 })

    Orch-->>User: seekCompleted(2500ms)
    deactivate Orch
```

---

### Diagrama 6: Sincronización de Pausa y Reanudación (Pause / Resume Barriers)

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host Shell
    participant Orch as ExperienceOrchestrator
    participant Clock as VirtualClock
    participant Time as TimelineEngine
    participant Rend as RendererEngine
    participant Bus as RuntimeEventBus

    rect rgb(30, 40, 60)
    note right of Host: BARRERA DE PAUSA
    Host->>Orch: pause()
    activate Orch
    Orch->>Clock: pause()
    Orch->>Time: freeze()
    Orch->>Rend: flushCurrentFrame()
    Orch->>Bus: publish("EXPERIENCE_PAUSED", { time: Clock.time })
    deactivate Orch
    end

    rect rgb(40, 50, 30)
    note right of Host: BARRERA DE REANUDACIÓN
    Host->>Orch: resume()
    activate Orch
    Orch->>Clock: resume()
    Orch->>Time: unfreeze()
    Orch->>Bus: publish("EXPERIENCE_RESUMED", { time: Clock.time })
    deactivate Orch
    end
```

---

### Diagrama 7: Flujo de Datos Extremo a Extremo (End-to-End Pipeline)

```mermaid
flowchart TD
    subgraph Storage ["Infraestructura Externa"]
        ManifestFile["Experience Manifest (.json)"]
    end

    subgraph Preparation ["Fase 1: Preparación (Asset & Plugin Engine)"]
        AssetLoader["AssetLoader & SchemaValidator"]
        PluginLoader["PluginLoader (Topological Sort)"]
    end

    subgraph DynamicCore ["Fase 2: Ejecución Dinámica (Kernel & Simulation)"]
        Clock["VirtualClock (Ticks determinísticos)"]
        Sim["SimulationRuntime (DES State Transitions)"]
        SimEvents["Simulation Events (Semántica Pura)"]
    end

    subgraph TranslationLayer ["Fase 3: Traducción & Planificación"]
        Behaviors["BehaviorRegistry (Handlers Desacoplados)"]
        Commands["Renderer Commands (Intenciones Visuales)"]
        Timeline["TimelineEngine (Tracks & Scheduling)"]
    end

    subgraph DispatchLayer ["Fase 4: Distribución & Salida"]
        Renderer["RendererEngine (Batching & Priorities)"]
        ThreePort["Three.js Port (3D Scene)"]
        ExcalidrawPort["Excalidraw Port (2D Diagram)"]
        AudioPort["WebAudio Port (Sound Cues)"]
    end

    ManifestFile --> AssetLoader
    AssetLoader --> PluginLoader
    PluginLoader --> Clock
    Clock --> Sim
    Sim --> SimEvents
    SimEvents --> Behaviors
    Behaviors --> Commands
    Commands --> Timeline
    Timeline --> Renderer
    Renderer --> ThreePort
    Renderer --> ExcalidrawPort
    Renderer --> AudioPort
```

---

### Diagrama 8: Aislamiento de Fallas y Recuperación (Error Recovery)

```mermaid
flowchart TD
    subgraph RuntimeSupervisor ["Supervisión del Orchestrator"]
        ExecutionMonitor{"¿Excepción en subsistema?"}
        FaultClassifier{"Tipo de Falla"}
    end

    subgraph Actions ["Políticas de Contención"]
        IsolatePlugin["Aislar Plugin defectuoso y continuar"]
        DegradeRender["Fallback: Desactivar Three.js y mantener Excalidraw 2D"]
        CriticalHalt["Transición atómica a ERROR y drenar buffers"]
    end

    ExecutionMonitor -- Sí --> FaultClassifier
    FaultClassifier -- "Plugin secundario falla" --> IsolatePlugin
    FaultClassifier -- "Falla de contexto WebGL" --> DegradeRender
    FaultClassifier -- "Corrupción de Kernel o Estado" --> CriticalHalt

    CriticalHalt --> EmiteErrorBus["Publicar RUNTIME_ERROR en EventBus"]
```

---

### Diagrama 9: Secuencia de Apagado y Prevención de Fugas (Shutdown Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host Shell
    participant Orch as ExperienceOrchestrator
    participant Clock as VirtualClock
    participant Rend as RendererEngine
    participant Time as TimelineEngine
    participant Sim as SimulationRuntime
    participant Plugins as PluginLoader
    participant Bus as RuntimeEventBus

    Host->>Orch: dispose()
    activate Orch

    note over Orch: 1. Detener tiempo y congelar bucle
    Orch->>Clock: reset(0)

    note over Orch: 2. Liberar recursos de GPU y Audio en Renderers
    Orch->>Rend: dispose()

    note over Orch: 3. Limpiar pistas de Timeline
    Orch->>Time: dispose()

    note over Orch: 4. Liberar estado de Simulación
    Orch->>Sim: dispose()

    note over Orch: 5. Desactivar Plugins en orden topológico inverso
    Orch->>Plugins: dispose()

    note over Orch: 6. Limpiar listeners del Bus
    Orch->>Bus: clear()

    note over Orch: 7. Transición final a DESTROYED
    Orch-->>Host: RuntimeDisposed()
    deactivate Orch
```

---

### Diagrama 10: Vista Previa del Composition Root y Facade de Angular

```mermaid
flowchart LR
    subgraph AngularApp ["Capa de Presentación (Angular UI)"]
        CanvasComponent["ExperienceCanvasComponent"]
        PlaybarComponent["ExperienceControlsComponent"]
        AngularFacade["ExperienceFacade (Service / Injectable)"]
    end

    subgraph CompositionRoot ["Composition Root (Pure TS Factory)"]
        Factory["ExperienceFactory / RuntimeBuilder"]
    end

    subgraph PureCore ["Núcleo Agnóstico (Pure TypeScript Engine)"]
        Orchestrator["ExperienceOrchestrator"]
        Kernels["EventBus / Clock / StateMachine"]
        Engines["Sim / Timeline / Behaviors / Renderer"]
    end

    CanvasComponent --> AngularFacade
    PlaybarComponent --> AngularFacade
    AngularFacade --> Factory
    Factory --> Orchestrator
    Orchestrator --> Kernels
    Orchestrator --> Engines
```

---

## 9. Materialización de ADR-001 a ADR-009

| Documento   | Principio Arquitectónico             | Cómo lo Materializa ADR-010                                                                          |
| :---------- | :----------------------------------- | :--------------------------------------------------------------------------------------------------- |
| **ADR-001** | Canvas Renderer Adapter agnóstico    | El orquestador nunca conoce Canvas; solo despacha comandos a través de `RendererEngine`.             |
| **ADR-002** | Cinematic Learning Engine            | Integra el tiempo virtual con la narrativa y la traslación de cámaras de forma declarativa.          |
| **ADR-003** | Runtime State Machine & Transiciones | Gobierna la sesión con la máquina atómica formal de 12 estados sin booleanos ad-hoc.                 |
| **ADR-004** | Pedagogical DSL & Lesson Manifest    | Admite lecciones legacy transformadas transparentemente vía `LegacyLessonAdapter`.                   |
| **ADR-005** | Universal Canvas & Parallel Timeline | Coordina la ejecución simultánea de múltiples pistas y canales de renderizado.                       |
| **ADR-006** | Simulation Engine (DES)              | Conecta la salida de `SimulationRuntime` con el `BehaviorRegistry` en cada tick.                     |
| **ADR-007** | Experience Orchestrator (Visión)     | Convierte la especificación de supervisor de ADR-007 en un diseño físico y ejecutable.               |
| **ADR-008** | Experience Manifest Contract         | Consume exclusivamente `ExperienceDescriptor` con validación y versionado dinámico.                  |
| **ADR-009** | Implementation Strategy              | Respeta la frontera física estricta: TypeScript puro en `engine/`, adaptadores en `infrastructure/`. |

---

## 10. Estrategia de Implementación para el Paso 11

En el **Paso 11 (Sprint 3 — Paso 11)**, se implementará el `ExperienceOrchestrator` físico en `src/app/engine/orchestrator/`:

```text
src/app/engine/orchestrator/
├── contracts/
│   ├── experience-context.interface.ts     # ExperienceContext
│   ├── runtime-context.interface.ts        # RuntimeContext
│   ├── execution-session.interface.ts      # ExecutionSession
│   ├── orchestrator-options.interface.ts   # Configuración de composición
│   └── index.ts
├── barriers/
│   ├── seek-barrier.ts                     # Manejo determinístico de rewind y fast-forward
│   ├── pause-barrier.ts                    # Sincronización de pausa y congelamiento
│   └── index.ts
├── supervisor/
│   ├── fault-isolator.ts                   # Contención de errores y degradación elegante
│   └── index.ts
├── experience-orchestrator.ts               # Clase supervisora principal
├── experience-orchestrator.spec.ts          # Cobertura unitaria integral >95%
└── index.ts                                # Barrel export
```

### Reglas para la Implementación del Paso 11:

1. **Zero Framework Pollution**: 100% TypeScript puro, sin `@angular/*`, sin `three`, sin `excalidraw`.
2. **Inversión de Control Absoluta**: Los motores (`SimulationRuntime`, `TimelineEngine`, etc.) se inyectan en el constructor o se ensamblan mediante un factory limpio con defaults sensatos.
3. **Determinismo Temporal**: Toda la simulación y animación avanzan únicamente cuando el `VirtualClock` avanza. Cero `setInterval` o `Date.now()` en el bucle principal.

---

Este ADR sella formalmente el diseño del **Runtime Vivo** de CASE Visual Lab. Con este plano consolidado, la implementación del orquestador es directa, robusta y libre de ambigüedades.
