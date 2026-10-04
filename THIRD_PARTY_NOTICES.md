# Third-Party Notices

CASE Visual Lab incorporates or will incorporate third-party open source software.
Each component remains under its original license.

> This project is **not affiliated with, sponsored or endorsed by Excalidraw** or its maintainers.
> "Excalidraw" is used only to identify the open source library this project builds upon.
> No official Excalidraw logos or branding are used as this project's identity.

## Excalidraw (`@excalidraw/excalidraw`)

- Status: planned integration (Sprint 1). Not yet a dependency.
- Source: https://github.com/excalidraw/excalidraw
- License: MIT
- Copyright (c) 2020 Excalidraw

When integrated, the full license text shipped in
`node_modules/@excalidraw/excalidraw/LICENSE` must be reproduced here verbatim.
Excalidraw also bundles fonts (e.g. Excalifont, Virgil, Nunito, Lilita One, Comic Shanns, Liberation)
under their own licenses (OFL‑1.1 / MIT). If fonts are self-hosted from
`dist/prod/fonts`, their license files must be shipped alongside them.

## React / React DOM

- Status: planned (required peer dependency of `@excalidraw/excalidraw`).
- License: MIT — Copyright (c) Meta Platforms, Inc. and affiliates.

## Angular

- Source: https://github.com/angular/angular
- License: MIT — Copyright (c) 2010-2026 Google LLC.

## Fonts loaded from Google Fonts

- Inter — SIL Open Font License 1.1
- JetBrains Mono — SIL Open Font License 1.1

## Build-time license extraction

Production builds emit `3rdpartylicenses.txt` (Angular `extractLicenses`), which lists
licenses of every bundled npm package and is deployed with the site.
