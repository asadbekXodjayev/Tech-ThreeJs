# CREDITS

## Concept, design & code
SUBSTRATE — original design system ("Lab Instrument"), narrative, copy, procedural
3D scene, and shaders authored for this project.

## Software libraries
| Library | Version | License | Use |
|---|---|---|---|
| [three.js](https://threejs.org) | ^0.166.1 | MIT | WebGL renderer, geometry, materials, `RoomEnvironment`, `UnrealBloomPass` |
| [GSAP](https://gsap.com) | ^3.12.5 | GreenSock Standard "No Charge" License | About-overlay transitions, intro ease |
| [Lenis](https://github.com/darkroomengineering/lenis) | ^1.1.13 | MIT | Smooth scroll → camera choreography |
| [Vite](https://vitejs.dev) | ^5.4.11 | MIT | Build tooling |
| [TypeScript](https://www.typescriptlang.org) | ^5.5.4 | Apache-2.0 | Type-safe source |
| [puppeteer-core](https://pptr.dev) | (sibling install) | Apache-2.0 | Headless QA smoke harness |

## Fonts (Google Fonts — Open Font License, SIL OFL 1.1)
- **Space Grotesk** — display (Florian Karsten)
- **IBM Plex Sans** — body (IBM / Mike Abbink, Bold Monday)
- **IBM Plex Mono** — utility / data (IBM / Mike Abbink, Bold Monday)

## Imagery / assets
- **Raster imagery — owned / self-captured.** The plate gallery in the Data chapter
  and the device "screen" 3D texture use screenshots of the author's **own** projects,
  copied from the sibling repo `../threeJs/public/previews/`:
  - `public/img/data-algorithms.jpg` — author's data-structures/algorithms visualiser
  - `public/img/price-predictor.jpg` — author's price-prediction model dashboard
  - `public/img/digit-recognizer.jpg` — author's digit-recognition demo (also the 3D screen texture)
  - `public/img/facescan-app.jpg` — author's face-detection app
  - `public/img/appgraph.jpg` — author's app dependency-graph explorer
  - `public/img/spotify-stats.jpg` — author's listening-stats dashboard

  All six are the author's own work; no third-party stock or licensed photography is
  bundled. They are decoded `loading="lazy"` so they stay out of the initial payload.
- Procedural visuals remain the backbone: a custom circuit-trace GLSL shader, a CSS
  scanline pattern, an inline SVG favicon, and a runtime `RoomEnvironment` reflection map.
- **Open Graph cards (self-generated).** Six distinct 1200×630 `public/og/*.svg`
  (`home`, `chip`, `device`, `network`, `data`, `about`) authored for this project via
  `scripts/og-shells.mjs` (run after `vite build`); each is rendered from on-brand vector
  primitives (no external imagery). The legacy `public/og/cover.svg` is retained.
- Reflection environment is generated at runtime from three.js's built-in
  `RoomEnvironment` (no HDRI download).

## Reference
Engineering spine adapted from the sibling reference app "VANTAGE / car"
(`cars-ThreeJs`) in the same series — perf manager, router pattern, loader, QA harness.
