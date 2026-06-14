// Full QA cross-device matrix. Boots the production preview on port 4184,
// loads / at four widths (320/768/1440/3840), captures console + pageerror +
// requestfailed, asserts NO horizontal overflow (scrollWidth <= innerWidth+2),
// screenshots each, then deep-links every slug and asserts 0 errors.
// Writes qa/QA-REPORT.md. Exit non-zero on ANY error or overflow.
import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';

const require = createRequire('C:/Users/hp/Desktop/front-end/3Js/threeJs/');
const puppeteer = require('puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 4184;
const BASE = `http://localhost:${PORT}`;
const OUT = 'qa/shots';
mkdirSync(OUT, { recursive: true });

const WIDTHS = [320, 768, 1440, 3840];
const SLUGS = ['/', '/chip', '/device', '/network', '/data', '/about'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- start vite preview on the unique strict port ---- */
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(), shell: true, stdio: 'ignore',
});
process.on('exit', () => server.kill());

async function waitForServer(timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(BASE + '/');
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(400);
  }
  throw new Error('preview server did not start on ' + BASE);
}

function attach(page, sink) {
  page.on('console', (m) => { if (m.type() === 'error') sink.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', (e) => sink.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', (r) => sink.push('REQFAIL: ' + r.url() + ' ' + (r.failure()?.errorText || '')));
}

const report = [];
const allErrors = [];
let overflowFails = 0;

await waitForServer();

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});

/* ===== PASS 1: width matrix on / ===== */
report.push('## Width matrix (route `/`)\n');
report.push('| Width | Errors | scrollWidth | innerWidth | Overflow |');
report.push('|---|---|---|---|---|');
for (const w of WIDTHS) {
  const errs = [];
  const page = await browser.newPage();
  attach(page, errs);
  await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 40000 });
  await sleep(2600); // loader clear + intro
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, iw: window.innerWidth,
  }));
  const overflow = m.sw > m.iw + 2;
  if (overflow) overflowFails++;
  await page.screenshot({ path: `${OUT}/matrix-${w}.png` });
  errs.forEach((e) => allErrors.push(`[w=${w}] ${e}`));
  report.push(`| ${w} | ${errs.length} | ${m.sw} | ${m.iw} | ${overflow ? '❌ OVERFLOW' : '✅ none'} |`);
  await page.close();
}

/* ===== PASS 2: deep-link each slug, assert 0 errors ===== */
report.push('\n## Deep-link slugs (1440×900)\n');
report.push('| Slug | Errors | scrollWidth | Overflow |');
report.push('|---|---|---|---|');
for (const slug of SLUGS) {
  const errs = [];
  const page = await browser.newPage();
  attach(page, errs);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(BASE + slug, { waitUntil: 'networkidle2', timeout: 40000 });
  await sleep(2400);
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, iw: window.innerWidth,
  }));
  const overflow = m.sw > m.iw + 2;
  if (overflow) overflowFails++;
  const name = slug === '/' ? 'root' : slug.slice(1);
  await page.screenshot({ path: `${OUT}/slug-${name}.png` });
  errs.forEach((e) => allErrors.push(`[${slug}] ${e}`));
  report.push(`| \`${slug}\` | ${errs.length} | ${m.sw} | ${overflow ? '❌ OVERFLOW' : '✅ none'} |`);
  await page.close();
}

await browser.close();

/* ===== write report ===== */
const pass = allErrors.length === 0 && overflowFails === 0;
const head = [
  '# QA Cross-Device Matrix — SUBSTRATE',
  '',
  `Generated ${new Date().toISOString()} · preview \`${BASE}\` (strict port ${PORT}).`,
  `Widths: ${WIDTHS.join(', ')}. Slugs: ${SLUGS.map((s) => '`' + s + '`').join(', ')}.`,
  '',
  `**Result: ${pass ? '✅ PASS' : '❌ FAIL'}** — ${allErrors.length} error(s), ${overflowFails} overflow failure(s).`,
  '',
  'Overflow rule: `document.documentElement.scrollWidth <= window.innerWidth + 2`.',
  '',
];
const errSection = ['', '## Errors', '', allErrors.length ? allErrors.map((e) => '- ' + e).join('\n') : '_None — zero console / pageerror / requestfailed across all widths and slugs._'];
writeFileSync('qa/QA-REPORT.md', [...head, ...report, ...errSection, ''].join('\n'));

console.log(`QA matrix: ${pass ? 'PASS' : 'FAIL'} — ${allErrors.length} errors, ${overflowFails} overflow.`);
for (const e of allErrors) console.log('  -', e);
process.exit(pass ? 0 : 1);
