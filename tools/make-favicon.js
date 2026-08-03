/**
 * make-favicon.js — rasteriza assets/favicon.svg y arma favicon.ico.
 *
 * Los navegadores piden /favicon.ico aunque la página declare un icono
 * SVG, así que conviene tener los dos. Se corre una sola vez, o cuando
 * cambie el hexágono de marca.
 *
 * Uso: node tools/make-favicon.js
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const RAIZ = path.resolve(__dirname, '..');
const LADO = 32;

/* ICO con un único PNG embebido (permitido desde Vista). */
function empaquetarIco(png, lado) {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0);   // reservado
  cabecera.writeUInt16LE(1, 2);   // tipo 1 = icono
  cabecera.writeUInt16LE(1, 4);   // cantidad de imágenes

  const entrada = Buffer.alloc(16);
  entrada.writeUInt8(lado === 256 ? 0 : lado, 0); // ancho
  entrada.writeUInt8(lado === 256 ? 0 : lado, 1); // alto
  entrada.writeUInt8(0, 2);                       // colores de paleta
  entrada.writeUInt8(0, 3);                       // reservado
  entrada.writeUInt16LE(1, 4);                    // planos
  entrada.writeUInt16LE(32, 6);                   // bits por pixel
  entrada.writeUInt32LE(png.length, 8);           // tamaño del PNG
  entrada.writeUInt32LE(22, 12);                  // offset del PNG

  return Buffer.concat([cabecera, entrada, png]);
}

async function main() {
  const svg = fs.readFileSync(path.join(RAIZ, 'assets', 'favicon.svg'), 'utf8');

  const navegador = await puppeteer.launch({ headless: true });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: LADO, height: LADO, deviceScaleFactor: 1 });
  await pagina.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}
     svg{display:block;width:${LADO}px;height:${LADO}px}</style>${svg}`
  );
  const png = await pagina.screenshot({ omitBackground: true, type: 'png' });
  await navegador.close();

  const ico = empaquetarIco(png, LADO);
  fs.writeFileSync(path.join(RAIZ, 'favicon.ico'), ico);
  console.log(`favicon.ico escrito · ${LADO}×${LADO} · ${ico.length} bytes`);
}

main().catch((e) => { console.error('Falló:', e.message); process.exit(1); });
