/**
 * ver-imagen.js — reduce una imagen para poder mirarla.
 *
 *   node tools/ver-imagen.js <archivo> [--ancho 1400] [--desde 0] [--alto 1200]
 *
 * POR QUÉ EXISTE
 * Las capturas de referencia que se comparten aquí llegan a 2016×6080.
 * Por encima de 2000 px de lado no se pueden inspeccionar, así que hay
 * que reducirlas o recortarlas antes.
 *
 * No hay librería de imagen en el proyecto —cero dependencias en
 * ejecución— así que el trabajo lo hace el navegador que ya viene con
 * Puppeteer: se abre el archivo, se escala y se captura el trozo
 * pedido. Sale un PNG en .tmp/vista-<nombre>.png.
 *
 *   --desde   píxel vertical del ORIGINAL donde empieza el recorte
 *   --alto    alto del recorte en el original; sin él, hasta el final
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const RAIZ = path.resolve(__dirname, '..');
const SALIDA = path.join(RAIZ, '.tmp');

function opcion(nombre, pordefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? Number(process.argv[i + 1]) : pordefecto;
}

async function main() {
  const archivo = process.argv[2];
  if (!archivo) {
    console.error('Uso: node tools/ver-imagen.js <archivo> [--ancho 1400] [--desde 0] [--alto 1200]');
    process.exit(1);
  }

  const completa = path.resolve(archivo);
  if (!fs.existsSync(completa)) {
    console.error(`No existe: ${completa}`);
    process.exit(1);
  }

  const anchoDestino = opcion('ancho', 1400);
  const desde = opcion('desde', 0);
  const altoRecorte = opcion('alto', 0);

  fs.mkdirSync(SALIDA, { recursive: true });
  const nav = await puppeteer.launch({ headless: true });
  const p = await nav.newPage();

  // La imagen se sirve como data URI: así funciona con rutas que llevan
  // espacios y acentos, que es lo normal en el escritorio de Windows.
  const ext = path.extname(completa).toLowerCase();
  const tipo = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const datos = `data:${tipo};base64,${fs.readFileSync(completa).toString('base64')}`;

  await p.setViewport({ width: anchoDestino, height: 1000, deviceScaleFactor: 1 });
  await p.setContent(`<style>html,body{margin:0;background:#fff}img{display:block;width:${anchoDestino}px}</style>
    <img src="${datos}">`, { waitUntil: 'load' });

  const medidas = await p.evaluate(() => {
    const img = document.querySelector('img');
    return { natural: [img.naturalWidth, img.naturalHeight], pintado: Math.round(img.getBoundingClientRect().height) };
  });

  const escala = anchoDestino / medidas.natural[0];
  const y = Math.round(desde * escala);
  const alto = altoRecorte ? Math.round(altoRecorte * escala) : medidas.pintado - y;

  await p.setViewport({ width: anchoDestino, height: Math.min(alto, 4000), deviceScaleFactor: 1 });
  const nombre = `vista-${path.basename(completa, ext).replace(/[^\w-]+/g, '-').slice(0, 40)}.png`;
  const destino = path.join(SALIDA, nombre);

  await p.screenshot({ path: destino, clip: { x: 0, y, width: anchoDestino, height: Math.min(alto, 4000) } });
  await nav.close();

  console.log(`original  ${medidas.natural[0]} × ${medidas.natural[1]}`);
  console.log(`recorte   desde ${desde} px, ${altoRecorte || 'hasta el final'}`);
  console.log(`salida    ${path.relative(RAIZ, destino)}  (${anchoDestino} × ${Math.min(alto, 4000)})`);
}

main().catch((e) => { console.error('Falló:', e.message); process.exit(1); });
