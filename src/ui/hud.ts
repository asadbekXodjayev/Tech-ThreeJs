import { CHAPTERS, SPECS } from '../data/chapters';
import { SCALES, lerpAccent, type Scale } from '../data/scales';

const $ = <T extends Element = HTMLElement>(id: string) => document.getElementById(id) as unknown as T | null;

/** Inject the data spec cards. */
export function buildSpecs(): void {
  const grid = $('spec-grid');
  if (!grid) return;
  grid.innerHTML = SPECS.map(
    (s) => `<li class="reveal"><span class="spec-val">${s.val}<span class="spec-unit">${s.unit}</span></span><span class="spec-key">${s.key}</span></li>`
  ).join('');
}

/** Inject the scale-gauge ticks (the signature element). */
export function buildGauge(): void {
  const ticks = $('gauge-ticks');
  if (!ticks) return;
  ticks.innerHTML = SCALES.map((sc, i) => `<li data-i="${i}">${sc.tick}</li>`).join('');
}

/** Reveal-on-enter using IntersectionObserver (cheap, no scroll handler). */
export function observeReveals(): void {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.2 }
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

/* ----------------------------- loader ----------------------------- */
export function setLoader(pct: number): void {
  const num = $('loader-num');
  const fill = $<HTMLElement>('loader-fill');
  const v = Math.round(pct);
  if (num) num.textContent = String(v);
  if (fill) fill.style.width = `${v}%`;
}

export function hideLoader(): void {
  $('loader')?.classList.add('is-done');
}

/* --------------------------- HUD updates -------------------------- */
const railFill = $<HTMLElement>('rail-fill');
const teleChapter = $('tele-chapter');
const teleReadout = $('tele-readout');

/** progress 0..1 across the whole experience. */
export function updateRail(progress: number): void {
  if (railFill) railFill.style.height = `${(progress * 100).toFixed(1)}%`;
}

let activeChapter = -1;
export function updateChapter(index: number): void {
  if (index === activeChapter) return;
  activeChapter = index;
  const ch = CHAPTERS[index];
  if (ch && teleChapter) teleChapter.textContent = ch.tele;

  CHAPTERS.forEach((c) => {
    const el = document.getElementById(`nav-${c.slug === '/' ? 'home' : c.slug.slice(1)}`);
    el?.classList.toggle('is-active', c.index === index);
  });
}

/** telemetry readout tied to the active scale: latency + ignited node count. */
export function updateReadout(latencyNs: number, nodes: number): void {
  if (teleReadout) {
    teleReadout.textContent = `LATENCY ${latencyNs.toFixed(2)} ns · ${nodes.toLocaleString()} NODES`;
  }
}

/* ----------------- signature: the Scale Gauge --------------------- */
const gauge = $('gauge');
const gaugeMag = $('gauge-mag');
const gaugeUnit = $('gauge-unit');
const gaugeDomain = $('gauge-domain');

export interface ScaleState {
  accent: string;
}

/**
 * Map whole-page progress (0..1) onto the scale ladder. Updates the gauge
 * UI + the global --accent var, and returns the live accent for the 3D scene.
 */
export function updateGauge(progress: number): ScaleState {
  const t = clamp01(progress) * (SCALES.length - 1);
  const i = Math.min(Math.floor(t), SCALES.length - 2);
  const frac = t - i;
  const a: Scale = SCALES[i];
  const b: Scale = SCALES[i + 1];
  const accent = lerpAccent(a.accent, b.accent, frac);
  const cur = frac < 0.5 ? a : b;

  // magnification counts up across the descent (exponential feel)
  const expNow = a.exp + (b.exp - a.exp) * frac;
  const mag = Math.pow(10, Math.max(0, 8 - expNow));
  if (gaugeMag) gaugeMag.textContent = `×${formatMag(mag)}`;
  if (gaugeUnit) gaugeUnit.textContent = cur.unit;
  if (gaugeDomain) gaugeDomain.textContent = cur.domain;

  // light the active tick
  document.querySelectorAll<HTMLElement>('.gauge-ticks li').forEach((li) => {
    li.classList.toggle('is-on', Number(li.dataset.i) === Math.round(t));
  });

  document.documentElement.style.setProperty('--accent', accent);
  return { accent };
}

export function setGaugeLive(live: boolean): void {
  gauge?.classList.toggle('is-live', live);
}

/** reset accent to the brand volt colour (outside the live region). */
export function resetAccent(): void {
  document.documentElement.style.setProperty('--accent', SCALES[0].accent);
}

function formatMag(m: number): string {
  if (m >= 1e6) return `${(m / 1e6).toFixed(1)}M`;
  if (m >= 1e3) return `${(m / 1e3).toFixed(0)}k`;
  return String(Math.round(m));
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ------------------------- motion toggle -------------------------- */
export function bindMotionToggle(onChange: (reduced: boolean) => void): boolean {
  const btn = $<HTMLButtonElement>('motion-toggle');
  const state = $('motion-state');
  let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sync = () => {
    if (state) state.textContent = reduced ? '[CALM]' : '[FULL]';
    btn?.setAttribute('aria-pressed', String(reduced));
  };
  btn?.addEventListener('click', () => {
    reduced = !reduced;
    sync();
    onChange(reduced);
  });
  sync();
  return reduced;
}
