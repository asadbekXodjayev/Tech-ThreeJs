# RULES.md — the five gates (SUBSTRATE / technology)

Measured on the production build (`npm run build`) + headless smoke run on 2026-06-14.

| Flag | Status | Evidence |
|---|---|---|
| `isFast` | ✅ (real-device pending) | Initial JS **≈164.6 KB gzip** (three 118.96 + gsap 27.81 + lenis 5.25 + app 12.56), CSS 2.77 KB gzip — under the 250 KB ceiling. DPR clamped to ≤2 with a runtime ladder down to 0.75; bloom auto-disables when FPS sags; node graph drops to ~520 instances on ≤4-core devices. Single render path. **Real 55/30-FPS phone + Lighthouse numbers must be measured on a device — headless SwiftShader (≈28 FPS software) is not representative.** |
| `isAdaptive` | ✅ | Fluid CSS 320px→4K, no horizontal scroll (`overflow-x: hidden`), mobile nav hidden + Scale Gauge reflows to a bottom panel at 860px. DPR clamp + `PerfManager` tier ladder + node-count heuristic. Touch via Lenis, keyboard (Esc closes About, focus-visible rings), `prefers-reduced-motion` calm path with a manual MOTION toggle. |
| `isAwardwinning` | ✅ | "Lab Instrument" system: Space Grotesk / IBM Plex Sans / IBM Plex Mono trio, 6-token palette (teal volt + amber data-heat), scanline + vignette atmosphere, orchestrated scroll, **signature: the Scale Gauge** (ticks the nm→planet ladder with a live ×magnification readout and a migrating accent colour) paired with the zoom-across-scale camera dolly. Distinct from the car app in palette, type, and concept. |
| `isVisualized` | ✅ | The scene *is* the page — scroll drives a continuous camera dolly across scale plus a power-on circuit shader, an exploded device teardown, and an instanced node graph that ignites link by link. Not a spinning logo. |
| `isImagesUsed` | ✅ | Real bundled raster imagery used two meaningful ways: **(1)** a scroll-revealed **diagram-plate gallery** in the Data chapter — six responsive `<img loading="lazy">` plates of the author's own tech/AI interfaces (data-algorithms, price-predictor, digit-recognizer, face-scan, app-graph, stream-stats) with mono captions; **(2)** one of those captures (`digit-recognizer.jpg`) is loaded via `THREE.TextureLoader` and mapped as the **device "screen" plate** in the exploded 3D stack. Owned/self-captured imagery (see CREDITS.md) — no stock. Images are `loading="lazy"`/`decoding="async"` so they stay out of the initial payload; procedural shaders + `RoomEnvironment` still carry the rest of the scene. |

## QA gate (headless harness)

- `node qa/smoke.mjs` against the production preview: **canvas drawn, WebGL2 active,
  0 console / page / request errors, exit 0.** Six screenshots in `qa/shots/`
  (`scale-0` … `scale-5`). Headless FPS ≈28 on SwiftShader software rasterizer —
  reported for liveness only, not a perf measurement.
- `node qa/matrix.mjs` — **full cross-device matrix** on strict port **4184**. Loads `/`
  at widths **320 / 768 / 1440 / 3840** and deep-links every slug (`/`, `/chip`,
  `/device`, `/network`, `/data`, `/about`). Asserts **0 console/pageerror/requestfailed**
  and **no horizontal overflow** (`scrollWidth <= innerWidth + 2`) everywhere, screenshots
  each, and writes `qa/QA-REPORT.md`. **Latest run: ✅ PASS — 0 errors, 0 overflow.**
  (A 320px hero-copy overflow surfaced by the matrix was fixed via `max-width: min(…,100%)`
  + `overflow-wrap` on the display headings.)

## Notable deviations (justified)

- **Stack:** Vite + vanilla `three` + GSAP + Lenis instead of Next.js + R3F — matches
  the reference app and the user's existing `threeJs/` repos, keeps the bundle tiny,
  and gives a hand-tuned render loop. Deep-link slugs work via History API + the SPA
  rewrite in `vercel.json`; the OG card is a static SVG.
- **Scene length:** ~360vh per chapter (not 1500vh) for a snappier scale-descent
  rhythm that still leaves room for choreography without scroll fatigue.
