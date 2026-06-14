import * as THREE from 'three';

/**
 * Runtime adaptive-quality manager. Samples FPS over a window; if it stays
 * below target, it steps the renderer pixel-ratio down a ladder. Recovers a
 * step if FPS is comfortably high. Keeps the experience smooth on weak GPUs.
 */
export class PerfManager {
  private renderer: THREE.WebGLRenderer;
  private samples: number[] = [];
  private last = performance.now();
  private cooldown = 0;
  private readonly ladder: number[];
  private tier: number;

  /** current FPS estimate (for the HUD readout). */
  fps = 60;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const cap = Math.min(window.devicePixelRatio || 1, 2);
    // DPR ladder from capped-native down to 0.75
    this.ladder = [cap, Math.min(cap, 1.5), 1, 0.85, 0.75].filter(
      (v, i, a) => a.indexOf(v) === i
    );
    this.tier = 0;
    renderer.setPixelRatio(this.ladder[0]);
  }

  /** call once per frame. Returns true when the tier changed. */
  tick(): boolean {
    const now = performance.now();
    const dt = now - this.last;
    this.last = now;
    if (dt <= 0) return false;

    const fps = 1000 / dt;
    this.samples.push(fps);
    if (this.samples.length > 60) this.samples.shift();
    if (this.cooldown > 0) {
      this.cooldown--;
      return false;
    }
    if (this.samples.length < 40) return false;

    const avg = this.samples.reduce((s, v) => s + v, 0) / this.samples.length;
    this.fps = avg;

    // step down when struggling
    if (avg < 48 && this.tier < this.ladder.length - 1) {
      this.tier++;
      this.renderer.setPixelRatio(this.ladder[this.tier]);
      this.reset();
      return true;
    }
    // recover when there's headroom
    if (avg > 58 && this.tier > 0) {
      this.tier--;
      this.renderer.setPixelRatio(this.ladder[this.tier]);
      this.reset();
      return true;
    }
    return false;
  }

  private reset(): void {
    this.samples.length = 0;
    this.cooldown = 90; // ~1.5s settle before re-evaluating
  }

  get pixelRatio(): number {
    return this.ladder[this.tier];
  }

  /** true once we've dropped at least one tier — used to disable post-FX. */
  get isDegraded(): boolean {
    return this.tier > 0;
  }
}
