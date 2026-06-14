// Headless smoke test: boots the built site, captures console/page errors,
// drives the scroll through every scale, screenshots each, reports FPS.
import { createRequire } from 'module';
import { mkdirSync } from 'fs';

const require = createRequire('C:/Users/hp/Desktop/front-end/3Js/threeJs/');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = 'qa/shots';
mkdirSync(OUT, { recursive: true });

const errors = [];
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('requestfailed', (r) => errors.push('REQFAIL: ' + r.url() + ' ' + (r.failure()?.errorText || '')));

await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500)); // let loader clear + intro play

// confirm a WebGL canvas exists and has drawn
const canvasInfo = await page.evaluate(() => {
  const c = document.querySelector('#app canvas');
  if (!c) return { ok: false };
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  return { ok: !!c, w: c.width, h: c.height, gl: !!gl };
});

// scroll through the page in steps, screenshot each scale
const total = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
const steps = 6;
for (let i = 0; i < steps; i++) {
  const y = Math.round((total * i) / (steps - 1));
  await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' }), y);
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: `${OUT}/scale-${i}.png` });
}

// crude FPS sample over 2s
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const loop = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(loop); else res(Math.round((n / (performance.now() - t0)) * 1000)); };
  requestAnimationFrame(loop);
}));

await browser.close();

console.log('canvas:', JSON.stringify(canvasInfo));
console.log('approx FPS (headless swiftshader):', fps);
console.log('errors:', errors.length);
for (const e of errors) console.log('  -', e);
process.exit(errors.length ? 1 : 0);
