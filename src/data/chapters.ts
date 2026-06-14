export interface Chapter {
  index: number;
  slug: string;
  label: string;
  /** telemetry name shown bottom-left */
  tele: string;
}

/** Chapters map 1:1 to the <section data-chapter> blocks in index.html. */
export const CHAPTERS: Chapter[] = [
  { index: 0, slug: '/', label: '00 · Origin', tele: '00 / ORIGIN' },
  { index: 1, slug: '/chip', label: '01 · Chip', tele: '01 / CHIP' },
  { index: 2, slug: '/device', label: '02 · Device', tele: '02 / DEVICE' },
  { index: 3, slug: '/network', label: '03 · Network', tele: '03 / NETWORK' },
  { index: 4, slug: '/data', label: '04 · Data', tele: '04 / DATA' },
  { index: 5, slug: '/outro', label: '05 · Grid', tele: '05 / THE GRID' },
];

export interface Spec {
  val: string;
  unit: string;
  key: string;
}

/** The "Data" chapter resolves the whole journey into numbers. */
export const SPECS: Spec[] = [
  { val: '5', unit: 'nm', key: 'GATE PITCH' },
  { val: '1.6', unit: 'B', key: 'TRANSISTORS / DIE' },
  { val: '0.7', unit: 'ns', key: 'HOP LATENCY' },
  { val: '40', unit: 'Gb/s', key: 'LINK THROUGHPUT' },
  { val: '4.2', unit: 'M', key: 'NODES ON GRAPH' },
  { val: '328', unit: 'EB', key: 'DAILY TRAFFIC' },
];
