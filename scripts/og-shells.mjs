// Post-build: emit a per-slug static shell at dist/<slug>/index.html with a
// swapped <title> and og:*/twitter meta + a distinct per-slug OG card, so each
// deep link gets correct social-share metadata even though the app is an SPA.
// Run AFTER `vite build`. The SPA rewrite in vercel.json still serves the app.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';
const BASE = 'https://substrate.vercel.app'; // canonical origin for absolute OG URLs

const SLUGS = [
  { slug: 'chip', title: 'The Chip — SUBSTRATE', desc: 'Billions of switches, one wafer. Copper traces route between logic blocks at the nanometre.' },
  { slug: 'device', title: 'The Device — SUBSTRATE', desc: 'The die, taken apart: silicon, substrate, memory, power and radio — exploded, then stacked.' },
  { slug: 'network', title: 'The Network — SUBSTRATE', desc: 'Every device is a node. Links ignite between millions of nodes as packets find their route.' },
  { slug: 'data', title: 'The Data — SUBSTRATE', desc: 'It all resolves to numbers — 328 EB a day, captured as plates and specs.' },
  { slug: 'about', title: 'About — SUBSTRATE', desc: 'A telescope for technology in the browser: procedural geometry, GLSL shaders, an adaptive render loop.' },
];

const html = readFileSync(join(DIST, 'index.html'), 'utf8');

function swap(src, title, desc, ogPath) {
  let out = src;
  // <title>
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  // standard description
  out = out.replace(/(<meta name="description"\s+content=")[\s\S]*?("\s*\/>)/, `$1${desc}$2`);
  // og:title / og:description / og:image
  out = out.replace(/(<meta property="og:title" content=")[\s\S]*?(" \/>)/, `$1${title}$2`);
  out = out.replace(/(<meta property="og:description"\s+content=")[\s\S]*?("\s*\/>)/, `$1${desc}$2`);
  out = out.replace(/(<meta property="og:image" content=")[\s\S]*?(" \/>)/, `$1${BASE}${ogPath}$2`);
  // twitter:image (add if absent, after twitter:card)
  if (!/twitter:image/.test(out)) {
    out = out.replace(/(<meta name="twitter:card"[\s\S]*?\/>)/, `$1\n  <meta name="twitter:image" content="${BASE}${ogPath}" />`);
  } else {
    out = out.replace(/(<meta name="twitter:image" content=")[\s\S]*?(" \/>)/, `$1${BASE}${ogPath}$2`);
  }
  // canonical url
  const ogUrl = `${BASE}/${ogPath.split('/')[2].replace('.svg', '')}`;
  if (!/og:url/.test(out)) {
    out = out.replace(/(<meta property="og:type"[\s\S]*?\/>)/, `$1\n  <meta property="og:url" content="${ogUrl}" />`);
  }
  return out;
}

let n = 0;
for (const s of SLUGS) {
  const ogPath = `/og/${s.slug}.svg`;
  const shell = swap(html, s.title, s.desc, ogPath);
  mkdirSync(join(DIST, s.slug), { recursive: true });
  writeFileSync(join(DIST, s.slug, 'index.html'), shell);
  n++;
  console.log(`og-shell: dist/${s.slug}/index.html  →  ${ogPath}`);
}

// also point the root index.html at the home OG card
const root = swap(html, 'SUBSTRATE — A Zoom Across Scale',
  'Transistor → chip → device → network → data. A Three.js experience that zooms across nine orders of magnitude as you scroll.',
  '/og/home.svg');
writeFileSync(join(DIST, 'index.html'), root);
console.log(`og-shell: dist/index.html  →  /og/home.svg`);
console.log(`og-shells: wrote ${n + 1} shells.`);
