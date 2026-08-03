/**
 * screenshot.js — captura la página en varios anchos con Puppeteer.
 *
 * Uso:
 *   node tools/screenshot.js                      # index.html, los 3 anchos
 *   node tools/screenshot.js --width 1440         # un solo ancho
 *   node tools/screenshot.js --url http://...     # cualquier URL
 *   node tools/screenshot.js --out .tmp/shots     # carpeta de salida
 *   node tools/screenshot.js --clip hero          # solo el primer viewport
 *   node tools/screenshot.js --selector .placa    # recorta a un elemento
 *   node tools/screenshot.js --quieto             # simula prefers-reduced-motion
 *
 * Salida: PNG en .tmp/shots/ (o --out). Los archivos se sobrescriben.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const RAIZ = path.resolve(__dirname, '..');

// ── Argumentos ────────────────────────────────────────────
function leerArgs(argv) {
  const args = { widths: null, url: null, out: null, clip: false, selector: null, scale: 1, quieto: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--width' || a === '-w') args.widths = argv[++i].split(',').map(Number);
    else if (a === '--url' || a === '-u') args.url = argv[++i];
    else if (a === '--out' || a === '-o') args.out = argv[++i];
    else if (a === '--selector' || a === '-s') args.selector = argv[++i];
    else if (a === '--scale') args.scale = Number(argv[++i]);
    else if (a === '--clip') args.clip = true;
    else if (a === '--quieto') args.quieto = true;
    else if (a === '--help' || a === '-h') { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(0); }
    else if (!a.startsWith('-')) args.url = a;
  }
  return args;
}

// Anchos por defecto: escritorio, tableta, teléfono.
const ANCHOS = [
  { nombre: 'escritorio', width: 1440, height: 900 },
  { nombre: 'tableta',    width: 900,  height: 1000 },
  { nombre: 'movil',      width: 390,  height: 844 },
];

/**
 * Puppeteer descarga su propio Chrome en el postinstall. Si npm lo bloqueó
 * (política allow-scripts), usamos el Edge o Chrome ya instalado en Windows.
 *
 * Ojo: desde Puppeteer 24, executablePath() devuelve una promesa.
 */
async function rutaNavegador() {
  try {
    const p = await puppeteer.executablePath();
    if (typeof p === 'string' && fs.existsSync(p)) return p;
  } catch { /* sin navegador empaquetado */ }

  const candidatos = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  const encontrado = candidatos.find((c) => fs.existsSync(c));
  if (!encontrado) {
    throw new Error(
      'No hay navegador disponible. Ejecuta: npx puppeteer browsers install chrome'
    );
  }
  console.warn('Aviso: sin Chrome de Puppeteer, uso el navegador del sistema.');
  return encontrado;
}

async function main() {
  const args = leerArgs(process.argv.slice(2));

  const destino = path.resolve(RAIZ, args.out || '.tmp/shots');
  fs.mkdirSync(destino, { recursive: true });

  const url = args.url
    ? (/^https?:|^file:/.test(args.url) ? args.url : 'file://' + path.resolve(RAIZ, args.url).replace(/\\/g, '/'))
    : 'file://' + path.join(RAIZ, 'index.html').replace(/\\/g, '/');

  const vistas = args.widths
    ? args.widths.map((w) => ({ nombre: String(w), width: w, height: Math.round(w * 0.66) }))
    : ANCHOS;

  const executablePath = await rutaNavegador();
  const navegador = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text'],
  });

  const generados = [];

  try {
    for (const vista of vistas) {
      const pagina = await navegador.newPage();
      await pagina.setViewport({
        width: vista.width,
        height: vista.height,
        deviceScaleFactor: args.scale,
      });

      // Para comprobar que las animaciones respetan la preferencia del sistema.
      if (args.quieto) {
        await pagina.emulateMediaFeatures([
          { name: 'prefers-reduced-motion', value: 'reduce' },
        ]);
      }

      await pagina.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

      // Espera a que las fuentes web estén listas para no capturar el fallback.
      await pagina.evaluate(() => document.fonts.ready);

      // Congela la cinta para que la captura sea reproducible.
      await pagina.addStyleTag({
        content: '.cinta__track{animation:none !important}*{transition:none !important}',
      });

      await new Promise((r) => setTimeout(r, 250));

      const archivo = path.join(destino, `${vista.nombre}.png`);
      const objetivo = args.selector ? await pagina.$(args.selector) : pagina;
      if (args.selector && !objetivo) throw new Error(`No existe el selector: ${args.selector}`);

      await objetivo.screenshot({
        path: archivo,
        fullPage: args.selector ? undefined : !args.clip,
      });

      const { size } = fs.statSync(archivo);
      generados.push(`${vista.nombre.padEnd(11)} ${String(vista.width).padStart(5)}px  ${Math.round(size / 1024)} KB  ${archivo}`);
      await pagina.close();
    }
  } finally {
    await navegador.close();
  }

  console.log(`Navegador: ${executablePath}`);
  console.log(`Página:    ${url}\n`);
  console.log(generados.join('\n'));
}

main().catch((e) => {
  console.error('Falló la captura:', e.message);
  process.exit(1);
});
