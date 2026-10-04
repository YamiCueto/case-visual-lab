# CASE Visual Lab

> **Architecture, AI and Systems — Drawn.**

An open visual learning platform within the CASE ecosystem for teaching Software Engineering, Artificial Intelligence and System Design through interactive diagrams.

CASE Visual Lab is not just a diagram editor.

It is a visual learning engine where concepts become interactive experiences. Every lesson, template, workshop and playground is designed to help engineers understand complex systems by drawing, exploring and experimenting.

Built as part of the **CASE OS** ecosystem.

> [!NOTE]
> Proyecto independiente. **No está afiliado, patrocinado ni respaldado por Excalidraw.**
> Excalidraw es el primer motor de renderizado integrado; en el futuro se sumarán Mermaid, C4, secuencias y otros.

## Manifesto

```text
Software is easier to understand when it becomes visual.

Architecture is not memorized.
It is explored.

Artificial Intelligence is not only explained.
It is experimented with.

Systems are not only documented.
They are drawn.

CASE Visual Lab exists to transform complex engineering concepts into
interactive visual experiences that anyone can understand.
```

### We believe...

- **The best engineers think visually.**
- **Learning should be interactive.**
- **Diagrams are executable knowledge.**
- **AI should accelerate understanding, not replace it.**
- **Every concept deserves a playground.**

## Live Demo

Publicada en GitHub Pages: **https://yamicueto.github.io/case-visual-lab/**

## Stack

| Área      | Elección                                                              |
| --------- | --------------------------------------------------------------------- |
| Framework | Angular 22 · Standalone · Signals · Zoneless · OnPush                 |
| Lenguaje  | TypeScript estricto (`strict`, `strictTemplates`)                     |
| Estilos   | SCSS + design tokens (CSS custom properties), Dark OLED + acento cyan |
| Build     | `@angular/build:application` (esbuild)                                |
| Routing   | Hash Location (`/#/ruta`)                                             |
| Calidad   | ESLint (angular-eslint) · Prettier · Vitest                           |
| Deploy    | GitHub Actions → GitHub Pages                                         |

## Arquitectura

```
src/app/
├── domain/          Modelos puros (escenas, migraciones, settings)
├── application/     Repositorios / casos de uso
├── infrastructure/  Adaptadores (LocalStorage; futuro puente Excalidraw)
├── core/            i18n, tema, settings (singletons)
├── presentation/    Shell, sidebar, navegación
├── features/        Una pantalla por carpeta, lazy-loaded
└── shared/ui/       Componentes genéricos
public/content/      lessons · templates · examples (servidos estáticamente)
documentation/       Decisiones técnicas
exports/             Diagramas exportados (no se publica)
```

Detalles en [documentation/architecture.md](documentation/architecture.md).

## Cómo ejecutar

```bash
npm ci
npm start          # http://localhost:4200/#/dashboard
npm run verify     # format + lint + tests + build
```

## Cómo desplegar

1. En GitHub → _Settings → Pages_ → **Source: GitHub Actions**.
2. Push a `main`: [deploy.yml](.github/workflows/deploy.yml) ejecuta lint, tests y build y publica
   `dist/case-visual-lab/browser`.

`<base href="./">` relativo + hash routing ⇒ funciona bajo `https://<user>.github.io/<repo>/`
sin configurar el nombre del repo ni `404.html`.

## Roadmap

- **Sprint 0** — Base: arquitectura, layout, navegación, servicios, CI/CD. ✅
- **Sprint 1** — Integración de `@excalidraw/excalidraw` (React island) en Workspace, persistencia de escenas.
- **Sprint 2** — Formato de lecciones y carga de contenido estático.
- **Sprint 3** — Plantillas y ejemplos (RAG, Agentic AI, Clean Architecture, DDD).
- **Sprint 4** — Animaciones con AnimeJS, traducción EN completa, exportación.

## Licencias

- Código: [MIT](LICENSE).
- Dependencias de terceros: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Créditos

- [Excalidraw](https://github.com/excalidraw/excalidraw) — MIT, © Excalidraw.
- [Angular](https://angular.dev) — MIT, © Google LLC.
- Fuentes Inter y JetBrains Mono — SIL OFL 1.1.
