# Changelog

All notable changes to the CASE Visual Lab platform are documented in this file.

## [v0.5-presentation-shell] - 2026-10-05

### Milestone Summary

Official consolidation of the complete architectural stack: from the deterministic Engine Core and multi-backend Infrastructure Adapters up to the reactive Angular Presentation Shell.

### Included Subsystems

#### Engine Core

- **RuntimeEventBus:** High-performance, synchronous, zero-dependency event bus with FIFO ordering.
- **VirtualClock:** Deterministic virtual timeline clock supporting variable speeds, pause, resume, step ticks, and zero-drift seeking.
- **RuntimeStateMachine:** Strict lifecycle state machine enforcing valid transitions (`LOAD -> VALIDATE -> BUILD -> INITIALIZE -> READY -> PLAYING <-> PAUSED -> STOPPED -> DESTROYED -> DISPOSED`).
- **SimulationRuntime:** Domain-agnostic deterministic simulation execution engine with pluggable simulation providers (HTTP simulation provider included).
- **BehaviorRegistry:** Type-safe registry for behavioral handlers and runtime event processing.
- **TimelineEngine:** Deterministic track/frame timeline scheduling with marker managers and zero-drift frame interpolation.
- **RendererEngine:** Multi-target rendering coordinator translating higher-level scene instructions into concrete render commands.
- **ExperienceCompositionRoot:** Canonical assembly root constructing and connecting the runtime platform deterministically.

#### Asset Engine

- Contract-driven manifest loader and validator for schema v2.0 experiences with asset caching and bundle resolution.

#### Plugin Engine

- Open-ended plugin registry and extensions SPI for external capabilities and lifecycle-hooked behaviors.

#### Experience Orchestrator

- Central supervisor orchestrating lifecycle, simulation clock synchronization, barrier coordination (SeekBarrier), and multi-renderer sessions according to ADR-010.

#### Infrastructure Adapters

- **ExcalidrawRendererAdapter:** Translates visual render commands into 2D canvas scene states and element diffs.
- **CameraRendererAdapter:** Translates camera position, zoom, and orientation commands into spatial coordinate spaces.
- **WebAudioRendererAdapter:** Abstract audio scene synthesizer and spatial audio command dispatcher without direct browser dependencies.
- **ThreeJsRendererAdapter:** High-density 3D particle state mapper, interpolator, and diff engine for 3D visual effects.

#### Application Layer

- **OrchestratorFacadeService:** Singleton (`providedIn: 'root'`) Angular facade exposing the runtime exclusively via readonly Angular Signals (`runtimeState`, `playState`, `currentTime`, `frameNumber`, `playbackSpeed`, `isReady`, `isPlaying`, `isPaused`, `isLoading`, `lastError`). Zero RxJS in the engine or facade.

#### Presentation Shell

- **RuntimeHostComponent:** Isolated diagnostic and execution host component connected to the facade.
- **ToolbarComponent:** Primary transport header with title, telemetry badges, transport actions, and dual speed selector.
- **TimelinePanelComponent:** Interactive playback timeline featuring a visual scrubber, playhead marker, transport controls, and speed presets.
- **InspectorPanelComponent:** Real-time modular telemetry panel displaying lifecycle states, metrics, active flags, and health diagnostic alerts.
- **LessonPlayerComponent:** Unified presentation container with CSS Grid layout hosting Toolbar, Viewport (RuntimeHost), Inspector, and Timeline, with overlay infrastructure for loading and notifications.

### Verification Status

- **Test Suites:** 31 suites passed (100%)
- **Unit Tests:** 406 tests passed (100%)
- **Linter (ESLint):** All files pass linting (0 errors)
- **Code Style (Prettier):** 100% compliant
- **Build Status:** Production bundle compiled successfully (`ng build` exit code 0)
