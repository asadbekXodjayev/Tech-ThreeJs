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
- **No third-party raster imagery is bundled.** All visuals are procedural geometry,
  GLSL shaders, a CSS scanline pattern, and an inline SVG favicon.
- `public/og/cover.svg` — original Open Graph cover, authored for this project.
- Reflection environment is generated at runtime from three.js's built-in
  `RoomEnvironment` (no HDRI download).

## Reference
Engineering spine adapted from the sibling reference app "VANTAGE / car"
(`cars-ThreeJs`) in the same series — perf manager, router pattern, loader, QA harness.
