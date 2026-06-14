# SUBSTRATE — A Zoom Across Scale

A scroll-driven 3D web experience on the theme of **technology**. Scroll is a zoom
level: the camera dollies across roughly nine orders of magnitude — from a single
**transistor** to a planet-scale **network of data** — and the scene assembles
itself at every rung of the ladder.

It is app 4 of 5 in a series of award-winning Three.js scroll experiences and
reuses the engineering spine of the reference "car" app (Vite + TypeScript +
three + GSAP + Lenis, adaptive-DPR perf manager, History-API slug router, branded
loader, IntersectionObserver reveals, accessible About overlay, reduced-motion
path, headless QA harness) with an entirely original design system and 3D scene.

## The journey (slugs)

| Slug | Scale | What you see |
|---|---|---|
| `/` | Origin | A single transistor; the gate flips on and glows. |
| `/chip` | Logic die | Procedural circuit traces power on radially; signal dots race the interconnect. |
| `/device` | Device | The package explodes into layers — PCB, substrate, silicon, memory, power. |
| `/network` | Network | The device becomes one node; an instanced node-graph ignites link by link. |
| `/data` | Data | Everything resolves to numbers; a far data-field surrounds the grid. |
| `/about` | — | Credits, tech, and how it is built. |

All slugs are deep-linkable (History API + SPA rewrite in `vercel.json`).

## Design

- **System:** "Lab Instrument" — a precise, scientific instrument panel.
- **Palette (6 tokens):** `--ink #060810`, `--graphite #11141f`, `--slate #5b6678`,
  `--paper #e6ebf2`, `--volt #36e0c4` (teal signal, the signature), `--amber #ff9e3d`
  (data-heat). No purple gradients, no acid-green-on-black.
- **Type:** Space Grotesk (display) / IBM Plex Sans (body) / IBM Plex Mono (utility).
- **Signature element:** the **Scale Gauge** — a vertical instrument readout that ticks
  through the scale ladder (nm → µm → mm → m → km → planet) with a live magnification
  factor that counts up as you descend, while the accent colour migrates from the cool
  teal at the micro end to the warm amber at the macro end. Paired with the
  zoom-across-scale camera dolly itself.

## 3D scene

Fully procedural — **no downloaded models**. Built from geometry and GLSL:

- A transistor (boxes + an emissive gate).
- A chip die with a custom **circuit-trace shader** (manhattan routing + a sweeping
  signal pulse + a radial power-on reveal) and `Points` signal dots.
- An exploded **device stack** (five material layers + an instanced pin ring).
- An **`InstancedMesh` node network** (one draw call for ~1,400 nodes) with additive
  link lines that ignite progressively, plus a far `Points` data-field.
- `UnrealBloom` for the signal/node glow (auto-disabled when the perf manager degrades
  or reduced-motion is on).

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc (zero errors) + vite build → dist/
npm run preview   # serve dist/ on http://localhost:4173
```

## QA

```bash
npm run build
npm run preview        # leave running
node qa/smoke.mjs      # headless Chrome: console/page/request errors + screenshots
```

The harness uses `puppeteer-core` resolved via `createRequire` from the sibling
`threeJs/` folder, launches Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`,
boots the built site, scrolls through every scale, screenshots each into `qa/shots/`,
and reports an FPS estimate. Headless FPS uses SwiftShader (software) and is **not**
representative of real-GPU performance.

## Stack & deployment

Vite + vanilla `three` + GSAP + Lenis. Deploy target:
`https://github.com/asadbekXodjayev/Tech-ThreeJs` (Vercel; `vercel.json` rewrites all
routes to `/` for SPA slug routing).

See `RULES.md` for the five acceptance gates with measured numbers and `CREDITS.md`
for asset licenses.
