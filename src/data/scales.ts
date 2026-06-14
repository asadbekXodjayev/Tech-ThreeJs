export interface Scale {
  /** short tick label on the gauge */
  tick: string;
  /** physical unit shown in the readout */
  unit: string;
  /** the domain name (transistor, die, ...) */
  domain: string;
  /** order-of-magnitude exponent used for the ×magnification readout */
  exp: number;
  /** accent colour as the camera passes through this scale */
  accent: string;
}

/**
 * The six rungs of the "zoom across scale" ladder. Scroll progress maps onto
 * this ladder; the Scale Gauge (signature element) ticks through them and the
 * accent colour shifts from the cool teal "volt" at the micro end to the warm
 * amber "data-heat" at the macro end.
 */
export const SCALES: Scale[] = [
  { tick: 'nm', unit: '10 nm', domain: 'TRANSISTOR', exp: 8, accent: '#36e0c4' },
  { tick: 'µm', unit: '0.4 mm', domain: 'LOGIC DIE', exp: 6, accent: '#3fd8d0' },
  { tick: 'mm', unit: '12 cm', domain: 'DEVICE', exp: 4, accent: '#5fcad6' },
  { tick: 'm', unit: '40 km', domain: 'NETWORK', exp: 2, accent: '#86b6d8' },
  { tick: 'km', unit: '6,371 km', domain: 'GRID', exp: 0, accent: '#ffb86b' },
  { tick: 'Mm', unit: 'PLANET', domain: 'DATA', exp: -1, accent: '#ff9e3d' },
];

const _h = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Linear blend between two scale accents (smooth scroll-driven tinting). */
export function lerpAccent(a: string, b: string, t: number): string {
  const ca = _h(a);
  const cb = _h(b);
  const out = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
