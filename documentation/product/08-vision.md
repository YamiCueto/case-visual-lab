# 08 — Visión Técnica de Producto a Largo Plazo

> **CASE Visual Lab**  
> _Principios Arquitectónicos para Resistir Cinco Años de Evolución sin Deuda_  
> **Fecha:** Octubre 2026 · **Documento de Arquitectura de Sistemas**

---

## 1. La Promesa de Inmutabilidad Arquitectónica

Una plataforma educativa de código abierto fracasa cuando rehace su arquitectura cada doce meses por seguir modas de frameworks.

Para que CASE Visual Lab evolucione durante los próximos cinco años de forma sostenida, la arquitectura debe obedecer a cuatro garantías inmutables:

1. **Garantía de Desacoplamiento de Renderizadores:** Ninguna parte del dominio de la aplicación (`domain/`, `application/`) sabrá jamás qué biblioteca dibuja las líneas. Si Excalidraw queda obsoleto o surge un motor WebGL/WebGPU superior en 2028, se reemplaza únicamente un adaptador en `infrastructure/` sin tocar una sola regla de negocio ni una sola lección.
2. **Garantía de Migración de Esquemas (Contrato Eterno):** Un diagrama dibujado en octubre de 2026 debe abrirse sin errores en 2031. El pipeline de migraciones puras (`migrateScene()`) garantiza que cada versión del esquema (`v1 → v2 → vN`) sea una función pura probada en tests unitarios.
3. **Garantía Local-First:** El usuario es dueño de su conocimiento. La aplicación no requiere inicio de sesión obligatorio ni base de datos remota para funcionar al 100%. Toda la lógica corre en el cliente.
4. **Garantía de Contenido Estático Extensible:** Agregar 100 nuevas lecciones o 500 plantillas jamás requerirá recompilar el código fuente. El contenido reside como recursos estáticos independientes (JSON/Markdown) en `public/content/`.

---

## 2. Diagrama de Fronteras y Contratos

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN                            │
│         Layout, Shell, Navegación, Componentes Standalone UI           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ usa
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE APLICACIÓN                              │
│       SceneRepository · LessonEngineService · SettingsCoordinator      │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ implementa                      │ opera sobre
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        INFRAESTRUCTURA               │  │           DOMINIO            │
│  • StorageAdapter (Local / IndexedDB)│  │ • SceneDocument              │
│  • DiagramRenderer (React / Canvas)  │  │ • SceneMigration Pipeline    │
│  • ContentLoader (Fetch / Cache)     │  │ • AppSettings & ThemeModels  │
│  • Exporters (SVG / JSON / PNG)      │  │ (Puro TypeScript - 0 Deps)   │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## 3. Evolución del Almacenamiento en Cliente

```text
2026: LocalStorage Namespaced (cvl:*)
└── Ideal para Sprint 0 y 1. Límite de 5 MB, rápido y suficiente para escenas de texto y vectores.

2027: IndexedDB Substrate (WASM SQLite / Dexie)
└── Almacenamiento de escenas masivas, histórico de versiones (undo/redo infinito en disco),
    archivos embebidos y caché offline de lecciones completas.

2028: Motor de Sincronización CRDT Local-First
└── Soporte para colaboración peer-to-peer opcional o exportación git-friendly.
```

---

## 4. Filosofía de Dependencias Cero en el Núcleo

- El dominio de la aplicación (`src/app/domain`) jamás importará módulos de `@angular/*`, `@excalidraw/*` ni ninguna otra biblioteca de terceros.
- Toda interacción externa se modelará como un puerto (_Port_) y un adaptador (_Adapter_).
- Esto permite probar las reglas más complejas del laboratorio (migraciones, validaciones de arquitectura, evaluaciones) en milisegundos mediante pruebas unitarias puras.
