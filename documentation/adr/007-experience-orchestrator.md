# ADR 007: Experience Orchestrator — Cerebro y Supervisor del Runtime Universal

- **Estado:** Propuesto / Aceptado
- **Fecha:** 2026-10-05
- **Sprint:** Sprint 2 — Arquitectura del Orquestador de Runtime
- **Autores / Decisores:** Principal Software Architect, Distinguished Engineer, Runtime Systems Architect, Game Engine Architect, Software Design Reviewer
- **Contexto:** Definición del orquestador central y supervisor de ciclo de vida de CASE Visual Lab. Este componente actúa como el "director de orquesta" del runtime: coordina los diez motores especializados, administra el bus de eventos, gobierna la máquina de estados global, asegura la liberación determinística de recursos (GPU/Audio/Workers) y aísla los fallos sin ejecutar lógica de dominio.

---

## 1. Contexto y Declaración del Problema

A través de [ADR-001](001-canvas-renderer-adapter.md) a [ADR-006](006-simulation-engine.md), CASE Visual Lab fragmentó sus responsabilidades en diez motores especializados e independientes:

```text
Visual Execution Engine
│
├── Simulation Engine      (ADR-006: Dinámica de sistemas discretos determinísticos)
├── Timeline Engine        (ADR-005: Reloj virtual, pistas temporales concurrentes)
├── Behavior Engine        (ADR-002, ADR-005: Registry & Handlers de comportamientos)
├── Animation Engine       (ADR-001, ADR-002: Shaders, cinemática y trayectorias en GPU)
├── Camera Engine          (ADR-002, ADR-005: Enfoque, transformaciones y proyección)
├── Narrative Engine       (ADR-002, ADR-004: Teleprompter, guión y resaltado de código)
├── Evaluation Engine      (ADR-003, ADR-004: Verificación de invariantes y checkpoints)
├── Renderer Engine        (ADR-001, ADR-005: Adapters simétricos: Excalidraw, Three.js, Audio)
├── Asset Engine           (ADR-004: Caché, ASTs de diagramas y resolución de recursos)
└── Plugin Engine          (ADR-005, ADR-006: Registro dinámico de providers y extensiones)
```

Sin embargo, surgió un vacío estructural de primer orden:
> **El problema del vacío de coordinación (The Headless Engine Dilemma):**  
> Ninguno de los diez motores debe conocer a los otros nueve. Si el `TimelineEngine` llama directamente al `SimulationEngine`, o si el `BehaviorEngine` acopla referencias directas al `RendererEngine`, el sistema degenera en un grafo de dependencias $O(N^2)$ con dependencias circulares, fugas de memoria en WebGL/Audio, ciclos de vida no rastreados y una imposibilidad absoluta de probar los motores en aislamiento.

Hacía falta el **Cerebro del Sistema**: un componente de supervisión que no simule, no renderice, no anime y no evalúe, pero que **gobierne la creación, cableado, ejecución y destrucción de todos los subsistemas**.

Este componente es el **Experience Orchestrator**.

---

## 2. Discovery: Detección de Responsabilidades Huérfanas

Al auditar los ADRs 001 a 006, se detectaron responsabilidades críticas de runtime que carecían de propietario explícito. A continuación se asigna formalmente la titularidad al Orchestrator:

```
┌────────────────────────────────────────────────────────────────────────┐
│             MATRIZ DE PROPIEDAD DE RESPONSABILIDADES HUÉRFANAS         │
├──────────────────────────────┬───────────────────────────┬─────────────┤
│ Responsabilidad Crítica      │ ¿Dónde residía antes?     │ Propietario │
│                              │                           │ Definitivo  │
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 1. Cargar una Experience     │ CanvasPage / Fetch suelto │ Orchestrator│
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 2. Validar el Manifest       │ Sin dueño / Implícito ajv │ Orchestrator│
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 3. Instanciar los 10 Motores │ Angular DI (@Injectable)  │ Orchestrator│
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 4. Conectar Simulation ↔     │ Inexistente / Spaghetti   │ Orchestrator│
│    Timeline ↔ Behaviors      │                           │ (Event Bus) │
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 5. Inicializar Adapters      │ CanvasPage (ngAfterView)  │ Orchestrator│
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 6. Administrar VirtualClock  │ Flotante en ADR-005       │ Orchestrator│
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 7. Sincronizar Play/Seek     │ Disperso con setTimeouts  │ Orchestrator│
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 8. Destruir Recursos GPU/Aud │ DestroyRef parcial        │ Orchestrator│
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 9. Supervisar Errores        │ try/catch en componentes  │ Orchestrator│
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 10. Administrar Plugins      │ SPI sin ciclo de vida     │ Orchestrator│
├──────────────────────────────┼───────────────────────────┼─────────────┤
│ 11. Estado Global de Runtime │ Múltiples Signals rotas   │ Orchestrator│
└──────────────────────────────┴───────────────────────────┴─────────────┘
```

---

## 3. Filosofía Arquitectónica del Experience Orchestrator

El Orchestrator adopta el patrón de **Composición de Raíz (Composition Root)** y el rol de **Supervisor de Procesos (Erlang OTP Supervisor)** típico de motores como Unreal Engine (`FEngineLoop`), Unity (`PlayerLoop`) o Godot (`MainLoop`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   LÍMITES Y FRONTERAS DEL ORCHESTRATOR                 │
├───────────────────────────────────┬────────────────────────────────────┤
│ Lo que el Orchestrator HACE       │ Lo que tiene ESTRICTAMENTE PROHIBIDO│
├───────────────────────────────────┼────────────────────────────────────┤
│ • Gobierna el ciclo de vida       │ • NO ejecuta simulaciones de red   │
│   (Load -> Ready -> Play -> Disp) │   ni evalúa reglas de protocolos.  │
│ • Instancia y ensambla motores.   │ • NO calcula matrices Three.js ni  │
│ • Administra el Virtual Clock.    │   dibuja trazos de Excalidraw.     │
│ • Enruta eventos por el EventBus. │ • NO evalúa respuestas de quizzes. │
│ • Sincroniza barreras atómicas en │ • NO parsea narrativa Markdown.    │
│   operaciones de Seek / Scrub.    │ • NO contiene código Angular,      │
│ • Ejecuta recolección de basura   │   React ni componentes visuales.   │
│   determinística de GPU y Audio.  │ • NO accede al DOM directamente.   │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Regla de Dependencia Estricta:
- **El Orchestrator conoce los contratos abstractos de los 10 motores.**
- **Ningún motor conoce al Orchestrator ni a los demás motores.**
- Los motores solo conocen el `RuntimeEventBus` y sus propios contratos de dominio.

---

## 4. Interacción con los Diez Motores Especializados

```mermaid
graph TB
    subgraph "Cerebro Central"
        Orchestrator[Experience Orchestrator]
        Bus[Runtime Event Bus]
        Clock[Virtual Clock Controller]
    end

    subgraph "Motores Satélites (Desacoplados entre sí)"
        M_Sim[Simulation Engine]
        M_Time[Timeline Engine]
        M_Beh[Behavior Engine]
        M_Anim[Animation Engine]
        M_Cam[Camera Engine]
        M_Narr[Narrative Engine]
        M_Eval[Evaluation Engine]
        M_Rend[Renderer Engine]
        M_Asset[Asset Engine]
        M_Plug[Plugin Engine]
    end

    Orchestrator -->|Supervisa Ciclo de Vida| M_Sim
    Orchestrator -->|Supervisa Ciclo de Vida| M_Time
    Orchestrator -->|Supervisa Ciclo de Vida| M_Beh
    Orchestrator -->|Supervisa Ciclo de Vida| M_Anim
    Orchestrator -->|Supervisa Ciclo de Vida| M_Cam
    Orchestrator -->|Supervisa Ciclo de Vida| M_Narr
    Orchestrator -->|Supervisa Ciclo de Vida| M_Eval
    Orchestrator -->|Supervisa Ciclo de Vida| M_Rend
    Orchestrator -->|Supervisa Ciclo de Vida| M_Asset
    Orchestrator -->|Supervisa Ciclo de Vida| M_Plug

    Orchestrator -->|Gobierna| Clock
    Clock -->|Tick sincronizado| M_Time
    Clock -->|Tick sincronizado| M_Sim

    M_Sim -.->|Publica SimulationEvents| Bus
    M_Eval -.->|Publica CheckpointEvents| Bus
    Bus -.->|Entrega a| M_Beh
    Bus -.->|Entrega a| M_Narr
    Bus -.->|Entrega a| M_Cam
    Bus -.->|Entrega a| M_Rend
```

---

## 5. Ciclo de Vida Formal de una Experiencia (11 Fases)

El ciclo de vida de una experiencia no es un booleano `isPlaying`. Es una máquina de estados finita con 11 fases rigurosas:

$$\text{LOAD} \to \text{VALIDATE} \to \text{BUILD} \to \text{INITIALIZE} \to \text{READY} \to \text{PLAY} \rightleftarrows \text{PAUSE} \to \text{SEEK} \to \text{RESUME} \to \text{STOP} \to \text{DESTROY}$$

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      MATRIZ DETALLADA DEL EXPERIENCE LIFECYCLE                         │
├────────────┬─────────────────────────────┬──────────────────────────────┬──────────────┤
│ Estado     │ ¿Qué ocurre internamente?   │ Motores que participan       │ Evento       │
│            │                             │                              │ Emitido      │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ LOAD       │ Descarga manifest y assets  │ Asset Engine                 │ `ExpLoading` │
│            │ brutos (JSON, SVG, Audio).  │                              │              │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ VALIDATE   │ Valida contra JSON Schema   │ Asset Engine,                │ `ExpValidated`
│            │ y chequea referencias AST.  │ Plugin Engine                │              │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ BUILD      │ Instancia motores requeridos│ Plugin Engine,               │ `ExpBuilt`   │
│            │ y resuelve providers/plugins│ Simulation Engine            │              │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ INITIALIZE │ Monta Adapters en el DOM,   │ Renderer, Camera, WebGL,     │ `ExpInited`  │
│            │ crea WebGL context y audio. │ Web Audio API                │              │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ READY      │ Estado $S_0$ calculado,     │ Todos los motores en reposo. │ `ExpReady`   │
│            │ cámara encuadrada, listo.   │                              │              │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ PLAY       │ Arranca el VirtualClock;    │ VirtualClock, Timeline,      │ `ExpStarted` │
│            │ despacho continuo de frames.│ Simulation, Renderers        │              │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ PAUSE      │ Congela el VirtualClock;    │ VirtualClock, Renderers,     │ `ExpPaused`  │
│            │ preserva buffers de GPU.    │ Audio (suspends context)     │              │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ SEEK       │ Barrera atómica: rebobina   │ Simulation (restaura snap),  │ `ExpSeeked`  │
│            │ simulación, limpia partículas Timeline, Renderers, Camera │              │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ RESUME     │ Descongela clock tras pausa │ VirtualClock, AudioContext   │ `ExpResumed` │
│            │ o tras resolución de gate.  │                              │              │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ STOP       │ Cancela bucle temporal;     │ VirtualClock, Simulation     │ `ExpStopped` │
│            │ retorna el sistema a $t=0$. │ (reset to S0)                │              │
├────────────┼─────────────────────────────┼──────────────────────────────┼──────────────┤
│ DESTROY    │ Libera texturas GPU, cierra │ Renderers, GPU, Audio,       │ `ExpDisposed`│
│            │ AudioContext y Workers.     │ Subscriptions, Workers       │              │
└────────────┴─────────────────────────────┴──────────────────────────────┴──────────────┘
```

---

## 6. Runtime Event Bus: Topología, Prioridades y Backpressure

Para erradicar el acoplamiento cruzado, los motores se comunican exclusivamente a través del **`RuntimeEventBus`**.

### 6.1 Clasificación de Eventos por Alcance

```typescript
export type EventScope = 'internal' | 'public' | 'private';

export interface RuntimeEventEnvelope<T = unknown> {
  readonly id: string;
  readonly scope: EventScope;
  readonly priority: EventPriority;
  readonly channel: string;
  readonly type: string;
  readonly timestamp: number;
  readonly virtualTimeMs: number;
  readonly senderEngine: string;
  readonly payload: T;
  readonly isCancellable: boolean;
}
```

1. **Eventos Privados (`private`):** Confinados estrictamente dentro del Orchestrator y un motor específico (p. ej., mensajes de heartbeat, comandos de teardown de GPU).
2. **Eventos Internos (`internal`):** Visibles para todos los diez motores del runtime, pero invisibles para la UI del host Angular (p. ej., `sim:event-emitted`, `timeline:track-boundary-reached`).
3. **Eventos Públicos (`public`):** Expuestos hacia la capa de presentación (Angular Signals / UI) para reflejar progreso, badges, errores o cambios de estado (`exp:ready`, `eval:checkpoint-satisfied`).

### 6.2 Jerarquía de Prioridades

$$\text{CRITICAL (0)} \quad > \quad \text{HIGH (1)} \quad > \quad \text{NORMAL (2)} \quad > \quad \text{LOW (3)}$$

- **`CRITICAL` (Prioridad 0):** Errores fatales de hardware (pérdida de contexto WebGL), abortos de seguridad y comandos de detención de emergencia (`DESTROY`). Procesados de inmediato de forma síncrona.
- **`HIGH` (Prioridad 1):** Barreras de sincronización de `SEEK`, saltos de cámara y cambios de estado del scheduler.
- **`NORMAL` (Prioridad 2):** Eventos regulares de simulación, transiciones de timeline y batches de renderizado.
- **`LOW` (Prioridad 3):** Telemetría analítica, logging de diagnóstico y métricas de rendimiento (FPS, memoria).

### 6.3 Mecanismo de Backpressure (Control de Saturación)
Si el bus acumula más de **1,000 eventos no procesados** en un tick (por ejemplo, durante una simulación masiva de paquetes en red):
1. El Orchestrator **congela temporalmente el VirtualClock**.
2. Realiza un vaciado atómico (*drain*) de la cola en orden de prioridad.
3. Aplica **Coalescencia de Eventos (Event Coalescing)**: eventos repetidos de mutación visual sobre el mismo nodo se colapsan en el último estado emitido.
4. Reanuda el reloj virtual sin pérdida de datos ni desincronización de audio.

---

## 7. Máquina de Estados del Runtime

La máquina de estados del Orchestrator garantiza que sea imposible invocar operaciones ilegales (como hacer `SEEK` antes de `INITIALIZE` o `PLAY` sobre un recurso en `ERROR`).

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : load(manifestUri)
    Loading --> Validating : manifestLoaded
    Loading --> ErrorState : loadFailed
    Validating --> Building : schemaValid
    Validating --> ErrorState : schemaInvalid
    Building --> Initializing : enginesConstructed
    Building --> ErrorState : pluginMissing
    Initializing --> Ready : hardwareMounted
    Initializing --> ErrorState : webGlFailed

    state Operativo {
        Ready --> Playing : play()
        Playing --> Paused : pause()
        Paused --> Playing : resume()
        Playing --> Seeking : seek(t)
        Paused --> Seeking : seek(t)
        Seeking --> Paused : seekCompleted
        Playing --> Completed : timelineFinished
        Completed --> Ready : reset()
    }

    Operativo --> Stopping : stop()
    Stopping --> Ready : stoppedAtT0

    Operativo --> ErrorState : runtimePanic
    ErrorState --> Recovering : attemptRecovery()
    Recovering --> Ready : recovered
    Recovering --> Destroying : recoveryFailed

    Operativo --> Destroying : destroy()
    Ready --> Destroying : destroy()
    ErrorState --> Destroying : destroy()
    Destroying --> [*] : resourcesDisposed
```

### Tabla de Transiciones Prohibidas:
- `Loading` $\to$ `Playing`: **ILEGAL**. Lanza excepción `RuntimeNotReadyException`.
- `Seeking` $\to$ `Seeking`: **COALESCIDO**. Si llega un segundo seek antes de terminar el primero, se descarta el anterior y se actualiza el target.
- `Destroying` $\to$ `*`: **TERMINAL**. Un runtime destruido no puede revivir; debe instanciarse un nuevo Orchestrator.

---

## 8. Gestión Estricta de Recursos y Jerarquía de Ownership

Para garantizar que CASE Visual Lab pueda ejecutar 100 lecciones continuas en un aula sin reiniciar el navegador, el Orchestrator implementa un **Árbol de Propiedad Jerárquico (Ownership Tree)** estricto:

```mermaid
graph TD
    subgraph "Nivel 1: Propietario Raíz"
        Orch[Experience Orchestrator]
    end

    subgraph "Nivel 2: Motores Hijos"
        E_Rend[Renderer Engine]
        E_Audio[Audio Adapter]
        E_Sim[Simulation Engine]
        E_Asset[Asset Engine]
    end

    subgraph "Nivel 3: Recursos de Hardware & SO"
        R_WebGL[WebGL Context / GPU Shaders / Textures]
        R_AudioCtx[Web Audio AudioContext / GainNodes]
        R_Workers[WebWorkers / Simulation Threads]
        R_DOM[DOM Canvas Elements / Subtitle Containers]
        R_Blob[Blob URLs / Object URLs]
    end

    Orch -->|Posee & Destruye| E_Rend
    Orch -->|Posee & Destruye| E_Audio
    Orch -->|Posee & Destruye| E_Sim
    Orch -->|Posee & Destruye| E_Asset

    E_Rend -->|Posee| R_WebGL
    E_Rend -->|Posee| R_DOM
    E_Audio -->|Posee| R_AudioCtx
    E_Sim -->|Posee| R_Workers
    E_Asset -->|Posee| R_Blob
```

### Protocolo Determinístico de Dispose:
Al transicionar a `DESTROY`, el Orchestrator ejecuta una limpieza ordenada en orden inverso de dependencia:
1. **Pausa y desconexión:** Detiene el `VirtualClock` y cancela los `requestAnimationFrame`.
2. **GPU Cleanup:** Invoca `renderer.dispose()`, liberando `THREE.BufferGeometry`, texturas, shaders (`gl.deleteProgram`) y destruye el canvas WebGL.
3. **Audio Cleanup:** Cierra el `AudioContext` (`audioCtx.close()`), silenciando buffers de sonido.
4. **Worker Termination:** Termina los `WebWorkers` de cálculo con `.terminate()`.
5. **Memory & URLs:** Revoca `URL.revokeObjectURL()` de todos los blobs en caché del `AssetEngine`.
6. **Subscripciones:** Desuscribe todos los listeners del `EventBus` y purga las colas de memoria.

---

## 9. Estrategia de Supervisión y Resiliencia ante Errores

El Orchestrator opera bajo el principio de **Aislamiento de Fallos (Fault Containment)**: el fallo de un componente no debe colapsar la experiencia.

```mermaid
flowchart TD
    Error[Error Detectado en el Runtime] --> Classifier{Clasificación de Severidad}
    
    Classifier -->|Menor / Transitorio| Recoverable[Nivel 1: Recuperable]
    Classifier -->|Degradación de Hardware| Fallback[Nivel 2: Degradación Graciosa]
    Classifier -->|Corrupción Irrecuperable| Fatal[Nivel 3: Fatal]

    Recoverable --> LogRetry[Log de Advertencia & Reintento de Frame]
    
    Fallback --> CheckContext{¿Pérdida de Contexto WebGL?}
    CheckContext -->|Sí| RecreateWebGL[Recrear Canvas 3D & Re-hidratar Shaders]
    CheckContext -->|Fallo de Audio| DisableAudio[Silenciar Pista de Voz & Continuar Visual]
    
    Fatal --> RollbackState[Rollback a Último Snapshot Estable]
    RollbackState --> NotifyUI[Notificar al Host Angular con Diagnóstico]
    NotifyUI --> SafeShutdown[Ejecución de Shutdown Seguro]
```

1. **Nivel 1 (Recuperable):** Error en un action handler (p. ej., timeout en una animación de partículas). Se descarta la acción, se notifica en consola y el timeline avanza al siguiente fotograma.
2. **Nivel 2 (Degradación Graciosa / Fallback):** 
   - Si WebGL pierde el contexto (`webglcontextlost`), el Orchestrator suspende el render 3D e intenta restaurarlo; si no es posible, desactiva Three.js y mantiene el canvas 2D de Excalidraw intacto.
   - Si el navegador bloquea el `AudioContext` por falta de interacción del usuario, silencia el audio y activa automáticamente los subtítulos DOM (`DOMSubtitleAdapter`).
3. **Nivel 3 (Fatal / Panic):** Error de corrupción de memoria o schema roto. Realiza un rollback al estado $S_0$, emite `exp:panic` con trazabilidad completa y ejecuta un shutdown seguro sin dejar fugas en memoria.

---

## 10. Arquitectura de Plugins: Descubrimiento, Aislamiento y Ciclo de Vida

El `PluginEngine` es supervisado por el Orchestrator mediante un ciclo de vida en cuatro fases:

$$\text{DISCOVERY} \longrightarrow \text{VERIFICATION} \longrightarrow \text{REGISTRATION} \longrightarrow \text{TEARDOWN}$$

```typescript
export interface VisualLabPlugin {
  readonly id: string;
  readonly version: string;
  readonly requiredEngines: readonly string[]; // P. ej. ['simulation', 'renderer']
  
  install(context: PluginInstallationContext): Promise<void>;
  uninstall(): Promise<void>;
}
```

1. **Descubrimiento:** El Orchestrator escanea los plugins declarados en el manifiesto (`plugins: ["@case/kafka-provider", "@case/mermaid-renderer"]`).
2. **Verificación:** Comprueba compatibilidad semántica de versiones (`semver`) y verifica que los motores requeridos estén activos.
3. **Aislamiento (Sandboxing):** Los plugins solo reciben interfaces restringidas (`PluginContext`). Tienen prohibido acceder a las instancias privadas de otros plugins o al DOM directo.
4. **Teardown:** Cuando se destruye la experiencia, cada plugin ejecuta su método `uninstall()`.

---

## 11. Los Diez Diagramas de Arquitectura (Mermaid)

### 11.1 Diagrama 1: Arquitectura General

```mermaid
classDiagram
    class ExperienceOrchestrator {
        -VirtualClock clock
        -RuntimeEventBus eventBus
        -RuntimeStateMachine stateMachine
        -EngineRegistry engines
        +loadExperience(manifestUri)
        +play()
        +pause()
        +seek(virtualTimeMs)
        +stop()
        +destroy()
    }
    class RuntimeEventBus {
        +publish(envelope)
        +subscribe(channel, handler)
        +drain()
    }
    class RuntimeStateMachine {
        +currentState: RuntimeState
        +transitionTo(newState)
    }

    ExperienceOrchestrator *-- RuntimeEventBus
    ExperienceOrchestrator *-- RuntimeStateMachine
```

### 11.2 Diagrama 2: Experience Lifecycle (11 Fases)

```mermaid
flowchart LR
    L[LOAD] --> V[VALIDATE]
    V --> B[BUILD]
    B --> I[INITIALIZE]
    I --> R[READY]
    R --> P[PLAY]
    P --> PA[PAUSE]
    PA --> P
    P --> S[SEEK]
    PA --> S
    S --> PA
    P --> RES[RESUME]
    P --> ST[STOP]
    ST --> R
    Operativo --> D[DESTROY]
```

### 11.3 Diagrama 3: Runtime State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : load()
    Loading --> Ready : success
    Loading --> Error : fail
    Ready --> Running : play()
    Running --> Paused : pause()
    Paused --> Running : resume()
    Running --> Destroyed : destroy()
    Paused --> Destroyed : destroy()
    Error --> Destroyed : cleanup()
    Destroyed --> [*]
```

### 11.4 Diagrama 4: Event Bus & Prioridades

```mermaid
queue EventBusQueue
    subgraph "Runtime Event Bus"
        Q0[Cola CRITICAL: Abortos, GPU Loss]
        Q1[Cola HIGH: Seek Barrier, Camera Pan]
        Q2[Cola NORMAL: Sim Events, Frame Actions]
        Q3[Cola LOW: Telemetría, FPS Metrics]
    end

    Dispatcher[Priority Dispatcher & Coalescer]
    Q0 --> Dispatcher
    Q1 --> Dispatcher
    Q2 --> Dispatcher
    Q3 --> Dispatcher
```

### 11.5 Diagrama 5: Resource Ownership Tree

```mermaid
graph TD
    Orch[Orchestrator] --> EngRend[Renderer Engine]
    Orch --> EngAudio[Audio Engine]
    Orch --> EngSim[Simulation Engine]
    
    EngRend --> WebGL[Three.js GPU Resources]
    EngRend --> Canvas[Excalidraw React Root]
    EngAudio --> Ctx[AudioContext & Buffers]
    EngSim --> Worker[Simulation WebWorkers]
```

### 11.6 Diagrama 6: Error Flow & Supervisión

```mermaid
sequenceDiagram
    autonumber
    participant Engine as Engine Fallido (p. ej. Three.js)
    participant Bus as RuntimeEventBus
    participant Orch as ExperienceOrchestrator
    participant UI as Host Presentation Shell

    Engine->>Bus: publish(ErrorEnvelope{severity: 'HARDWARE_LOST'})
    Bus->>Orch: handleCriticalError(error)
    Orch->>Orch: evaluatePolicy(FallbackTo2DOnly)
    Orch->>Engine: detach(ThreeJsAdapter)
    Orch->>Bus: publish(Notice{'Continuando en modo 2D sin WebGL'})
    Orch-->>UI: emitStatusDegraded()
```

### 11.7 Diagrama 7: Plugin Loading Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Orch as ExperienceOrchestrator
    participant PlugEng as PluginEngine
    participant Plugin as ExternalPlugin (KafkaProvider)

    Orch->>PlugEng: loadPluginDeclaration("@case/kafka")
    PlugEng->>PlugEng: verifyDependencies()
    PlugEng->>Plugin: install(IsolatedContext)
    Plugin-->>PlugEng: registrationCompleted
    PlugEng-->>Orch: pluginReady
```

### 11.8 Diagrama 8: Startup Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Host as Angular Shell
    participant Orch as ExperienceOrchestrator
    participant Asset as AssetEngine
    participant Rend as RendererEngine
    participant Sim as SimulationEngine

    Host->>Orch: loadExperience("content/http-flow.json")
    Orch->>Asset: fetchAndValidate()
    Asset-->>Orch: ValidatedAST
    Orch->>Sim: initializeProvider(S0)
    Orch->>Rend: mount(containerElements)
    Rend-->>Orch: mountedSuccessfully
    Orch-->>Host: onExperienceReady()
```

### 11.9 Diagrama 9: Shutdown Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Host as Angular Shell
    participant Orch as ExperienceOrchestrator
    participant Clock as VirtualClock
    participant Rend as RendererEngine
    participant Audio as AudioEngine

    Host->>Orch: destroy()
    Orch->>Clock: stop()
    Orch->>Audio: closeAudioContext()
    Orch->>Rend: unmountAndDisposeGPU()
    Orch->>Orch: clearEventBus()
    Orch-->>Host: onExperienceDestroyed()
```

### 11.10 Diagrama 10: Experience Coordinator (Atomic Seek Barrier)

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Orch as ExperienceOrchestrator
    participant Clock as VirtualClock
    participant Sim as SimulationEngine
    participant Time as TimelineEngine
    participant Rend as RendererEngine

    Usuario->>Orch: seek(targetTime: 2500ms)
    critical Barrera Atómica de Seek
        Orch->>Clock: pauseTemporarily()
        Orch->>Sim: restoreSnapshotAt(2500ms)
        Orch->>Time: advanceTracksTo(2500ms)
        Orch->>Rend: flushAndRedrawImmediately()
        Orch->>Clock: resumeIfWasPlaying()
    end
    Orch-->>Usuario: seekCompletedAt(2500ms)
```

---

## 12. Decisiones Tomadas, Alternativas Descartadas y Trade-offs

### 12.1 Decisiones Tomadas
1. **El Orchestrator es el único punto de control del ciclo de vida:** Ningún motor se instancia a sí mismo ni se destruye por su cuenta.
2. **Cero dependencias cruzadas entre motores:** Toda comunicación inter-motor se ejecuta a través del `RuntimeEventBus`.
3. **Control Centralizado del Tiempo:** El `VirtualClock` vive en el Orchestrator y emite ticks hacia la Simulación y el Timeline simultáneamente.

### 12.2 Alternativas Descartadas
1. **Descartado: Arquitectura Peer-to-Peer sin orquestador.**  
   *Razón:* Provoca dependencia circular entre Timeline y Simulation, y hace imposible asegurar la recolección de basura de GPU.
2. **Descartado: Ubicar la orquestación dentro de componentes Angular (`CanvasPage`).**  
   *Razón:* Destruye la portabilidad a Node.js, CLI, WebWorkers y escritorios nativos (Tauri/Electron).
3. **Descartado: Usar RxJS Subjects globales no tipados.**  
   *Razón:* Propenso a fugas de memoria por subscripciones olvidadas. Se diseñó el `RuntimeEventBus` con canales formales y recolección automática en `DESTROY`.

---

## 13. Impacto sobre ADR-001 a ADR-006 y Orden para Sprint 3

### Impacto en la Arquitectura Previa:
- **ADR-001 (Canvas Renderer):** `CanvasRendererPort` ahora es supervisado por el Orchestrator durante `INITIALIZE` y `DESTROY`.
- **ADR-002 / ADR-003 (Cinematic / Runtime):** Quedan formalmente sustituidos en el rol de coordinación por el `ExperienceOrchestrator`. Los conceptos pedagógicos se aíslan en el `EvaluationEngine`.
- **ADR-004 (Lesson Manifest):** El manifiesto es validado e instanciado por el Orchestrator a través del `AssetEngine`.
- **ADR-005 (Visual Execution Engine):** El Orchestrator asume el control del `VirtualClock` y la coordinación de acciones paralelas.
- **ADR-006 (Simulation Engine):** El Orchestrator inicializa los `SimulationProviders` y puentea los `SimulationEvents` hacia el `BehaviorEngine`.

### Orden Recomendado de Implementación para Sprint 3:

```
┌────────────────────────────────────────────────────────────────────────┐
│             ORDEN DE IMPLEMENTACIÓN RECOMENDADO (SPRINT 3)             │
├───────┬──────────────────────────────────┬─────────────────────────────┤
│ Paso  │ Entregable Técnico               │ Justificación Arquitectónica│
├───────┼──────────────────────────────────┼─────────────────────────────┤
│ 1     │ `RuntimeEventBus` puro en TS     │ Base de comunicación para   │
│       │                                  │ todos los motores.          │
├───────┼──────────────────────────────────┼─────────────────────────────┤
│ 2     │ `ExperienceOrchestrator` &       │ Define la máquina de estados│
│       │ `VirtualClockController`         │ y la jerarquía de ownership.│
├───────┼──────────────────────────────────┼─────────────────────────────┤
│ 3     │ Integración del `SimulationEng.` │ Conecta el primer provider  │
│       │ con el EventBus (ADR-006)        │ (HTTP) con el orquestador.  │
├───────┼──────────────────────────────────┼─────────────────────────────┤
│ 4     │ Conexión de `RendererAdapters`    │ Three.js y Excalidraw       │
│       │ al ciclo de vida formal          │ limpian texturas en DESTROY.│
├───────┼──────────────────────────────────┼─────────────────────────────┤
│ 5     │ Fachada Angular liviana          │ La UI solo consume signals  │
│       │ (`ExperienceFacadeService`)      │ emitidas por el Orchestrator│
└───────┴──────────────────────────────────┴─────────────────────────────┘
```

---

## 14. Decisión Final

Se aprueba y adopta formalmente **ADR-007: Experience Orchestrator**.

A partir de esta decisión:
1. El **Experience Orchestrator** se consagra como el cerebro único y coordinador maestro de CASE Visual Lab.
2. Queda prohibida cualquier comunicación directa no mediada entre motores satélites.
3. Se mantiene la directriz de **no modificar código en esta fase de diseño**, constituyendo este documento el contrato inmutable para la ejecución del Sprint 3 y la evolución de la plataforma en los próximos diez años.
