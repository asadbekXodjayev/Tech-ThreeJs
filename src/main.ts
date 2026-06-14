import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import Lenis from 'lenis';
import gsap from 'gsap';

import './style.css';
import { Env } from './three/env';
import { Substrate } from './three/substrate';
import { PerfManager } from './three/perf';
import {
  buildSpecs, buildGauge, observeReveals, setLoader, hideLoader, updateRail,
  updateChapter, updateReadout, updateGauge, setGaugeLive, resetAccent, bindMotionToggle,
} from './ui/hud';

/* ----------------------- small math helpers ----------------------- */
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ----------------------- camera keyframes ------------------------- */
/* The "zoom across scale" dolly: the camera pulls steadily back along Z as
 * scroll descends the ladder — transistor (close) → data field (far). */
interface Key { pos: [number, number, number]; tgt: [number, number, number]; fov: number; }
const KEYS: Key[] = [
  { pos: [0.0, 1.4, 4.2], tgt: [0, 0.4, 0], fov: 32 },   // 0 transistor (macro-close)
  { pos: [0.0, 5.5, 12.0], tgt: [0, 0, 0], fov: 40 },    // 1 chip die
  { pos: [5.0, 4.0, 11.0], tgt: [0, 0.6, 0], fov: 44 },  // 2 device (exploded)
  { pos: [0.0, 10.0, 34.0], tgt: [0, 0, 0], fov: 50 },   // 3 network
  { pos: [0.0, 6.0, 62.0], tgt: [0, 0, 0], fov: 55 },    // 4 data
  { pos: [22.0, 14.0, 70.0], tgt: [0, 0, 0], fov: 58 },  // 5 outro / grid
];

const _pos = new THREE.Vector3();
const _tgt = new THREE.Vector3();
function sampleCamera(s: number, pos: THREE.Vector3, tgt: THREE.Vector3, out: { fov: number }): void {
  const i = Math.max(0, Math.min(Math.floor(s), KEYS.length - 2));
  const f = s - i < 0 ? 0 : Math.min(s - i, 1);
  const e = f * f * (3 - 2 * f);
  const a = KEYS[i];
  const b = KEYS[i + 1];
  pos.set(lerp(a.pos[0], b.pos[0], e), lerp(a.pos[1], b.pos[1], e), lerp(a.pos[2], b.pos[2], e));
  tgt.set(lerp(a.tgt[0], b.tgt[0], e), lerp(a.tgt[1], b.tgt[1], e), lerp(a.tgt[2], b.tgt[2], e));
  out.fov = lerp(a.fov, b.fov, e);
}

/* =========================== boot ================================= */
async function boot(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('missing #app');

  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* renderer */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  app.appendChild(renderer.domElement);

  const perf = new PerfManager(renderer);

  /* scene + camera */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.05, 400);
  camera.position.set(0, 1.4, 4.2);
  scene.add(camera);

  const env = new Env(scene, renderer);
  // low-poly node graph on weak GPUs (cores heuristic)
  const lowEnd = (navigator.hardwareConcurrency || 8) <= 4;
  const substrate = new Substrate(lowEnd ? 'low' : 'high');
  scene.add(substrate.group);

  // load a real captured interface as a 3D texture for the device screen plate
  new THREE.TextureLoader().load('/img/digit-recognizer.jpg', (tex) => {
    tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    substrate.setScreenTexture(tex);
  });

  /* post-processing (bloom for the signal/node glow) */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55, 0.85, 0.82
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ----------------------------- UI ----------------------------- */
  buildSpecs();
  buildGauge();
  observeReveals();
  reducedMotion = bindMotionToggle((r) => {
    reducedMotion = r;
    bloom.enabled = !r;
  });

  /* --------------------------- lenis ---------------------------- */
  const lenis = new Lenis({ lerp: reducedMotion ? 1 : 0.09, smoothWheel: !reducedMotion });
  let progress = 0; // 0..1 across the whole page
  let velocity = 0;
  lenis.on('scroll', (e: { progress: number; velocity: number }) => {
    progress = clamp01(e.progress);
    velocity = e.velocity;
  });

  /* --------------------------- router --------------------------- */
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.chapter'));
  const aboutPage = document.getElementById('about')!;
  let aboutOpen = false;

  function openAbout(push = true): void {
    if (aboutOpen) return;
    aboutOpen = true;
    aboutPage.setAttribute('aria-hidden', 'false');
    document.body.dataset.route = 'about';
    if (push) history.pushState(null, '', '/about');
    gsap.set(aboutPage, { visibility: 'visible' });
    gsap.fromTo(aboutPage, { clipPath: 'inset(100% 0 0 0)' },
      { clipPath: 'inset(0% 0 0 0)', duration: reducedMotion ? 0.001 : 0.8, ease: 'expo.inOut' });
    aboutPage.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
  }
  function closeAbout(push = true): void {
    if (!aboutOpen) return;
    aboutOpen = false;
    aboutPage.setAttribute('aria-hidden', 'true');
    document.body.dataset.route = 'home';
    if (push) history.pushState(null, '', currentSlug());
    gsap.to(aboutPage, {
      clipPath: 'inset(0 0 100% 0)', duration: reducedMotion ? 0.001 : 0.65, ease: 'expo.inOut',
      onComplete: () => gsap.set(aboutPage, { visibility: 'hidden' }),
    });
  }

  function scrollToSlug(slug: string, immediate = false): void {
    const el = sections.find((s) => s.dataset.slug === slug);
    if (!el) return;
    const target = el.offsetTop + el.offsetHeight * 0.4 - window.innerHeight * 0.5;
    lenis.scrollTo(Math.max(0, target), { immediate, duration: immediate ? 0 : 1.1 });
  }

  function currentSlug(): string {
    const idx = Math.round(progress * (sections.length - 1));
    return sections[Math.min(idx, sections.length - 1)]?.dataset.slug ?? '/';
  }

  function navigate(href: string): void {
    if (href === '/about') { openAbout(); return; }
    if (aboutOpen) closeAbout(false);
    history.pushState(null, '', href);
    scrollToSlug(href);
  }

  document.querySelectorAll<HTMLAnchorElement>('a[data-route-link]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); navigate(a.getAttribute('href') ?? '/'); });
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && aboutOpen) closeAbout(); });
  window.addEventListener('popstate', () => {
    const path = location.pathname;
    if (path === '/about') openAbout(false);
    else { if (aboutOpen) closeAbout(false); scrollToSlug(path); }
  });

  /* ----------------------- mouse parallax ----------------------- */
  const mouse = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  /* --------------------------- loading -------------------------- */
  // textures are procedural, so "loading" is the env/PMREM warmup + fonts
  await document.fonts.ready.catch(() => undefined);
  for (let i = 0; i <= 100; i += 8) { setLoader(i); await frame(); }
  setLoader(100);
  hideLoader();

  // deep-link on first load
  const initial = location.pathname;
  if (initial === '/about') openAbout(false);
  else if (initial !== '/') scrollToSlug(initial, true);

  // intro: camera eases in from further back
  if (!reducedMotion) {
    camera.position.set(0, 2.4, 8.0);
    gsap.to(camera.position, { x: 0, y: 1.4, z: 4.2, duration: 2.0, ease: 'expo.out' });
  }

  /* --------------------------- render --------------------------- */
  const clock = new THREE.Clock();
  const fovObj = { fov: 36 };
  const parallax = new THREE.Vector3();

  renderer.setAnimationLoop((time) => {
    lenis.raf(time);
    const dt = Math.min(clock.getDelta(), 0.05);

    // scene-space progress in chapter units (0 .. N-1)
    const s = progress * (sections.length - 1);

    // camera from keyframes (the zoom-across-scale dolly)
    sampleCamera(s, _pos, _tgt, fovObj);

    // gentle drift + mouse parallax (skipped in reduced motion)
    if (!reducedMotion) {
      const drift = Math.sin(time * 0.00012) * 0.4;
      parallax.set(mouse.x * 0.8, -mouse.y * 0.5, 0);
      _pos.x += drift + parallax.x;
      _pos.y += parallax.y;
    }
    camera.position.lerp(_pos, reducedMotion ? 1 : 0.08);
    camera.lookAt(_tgt);
    if (Math.abs(camera.fov - fovObj.fov) > 0.01) {
      camera.fov = lerp(camera.fov, fovObj.fov, 0.1);
      camera.updateProjectionMatrix();
    }

    // the scene assembles itself across the scales
    substrate.update(s, time, dt, reducedMotion);

    // signature: the Scale Gauge (live from ~chapter 0.5 to 4.6)
    const inScale = s > 0.4 && s < 4.7;
    setGaugeLive(inScale);
    if (inScale) {
      const { accent } = updateGauge(progress);
      substrate.setAccent(accent);
      env.setAccent(accent);
    } else if (s <= 0.4) {
      resetAccent();
      substrate.setAccent('#36e0c4');
      env.setAccent('#36e0c4');
    }

    // HUD
    updateRail(progress);
    updateChapter(Math.round(s));
    // latency falls as we descend; node count rises as the graph ignites
    const latency = 0.7 + Math.min(Math.abs(velocity) * 0.04, 3);
    updateReadout(latency, substrate.igniteCount(s));

    // adaptive quality → toggle bloom off when degraded
    if (perf.tick()) bloom.enabled = !perf.isDegraded && !reducedMotion;

    if (bloom.enabled) composer.render();
    else renderer.render(scene, camera);
  });

  /* --------------------------- resize --------------------------- */
  window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  });
}

function frame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

void boot();
