/**
 * wire-transporte.js — cablea la página de transporte en las páginas
 * que ya existían: nav y pie.
 *
 * Idempotente: se puede correr las veces que haga falta. Cada cambio
 * declara su propia marca de "ya aplicado", que es un fragmento que
 * SOLO existe después del cambio.
 *
 * Escribe con fs (UTF-8 real), no con Set-Content de PowerShell, que
 * fue lo que dobló la codificación de los acentos la vez anterior.
 *
 * Uso: node tools/wire-transporte.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

/* "Directorio" sale del nav superior para hacerle sitio a "Transporte":
   ocho elementos no caben a 1280 px sin encoger la tipografía. Sigue
   accesible desde la portada y desde el pie. */
const CAMBIOS = [
  {
    nombre: 'nav',
    marca: '<a href="transporte.html">Transporte</a>',
    de: `        <a href="alquiler.html">Alquiler</a>
        <a href="importar.html">Importación</a>
        <a href="financiamiento.html">Financiamiento</a>
        <a href="dealers.html">Directorio</a>`,
    a: `        <a href="alquiler.html">Alquiler</a>
        <a href="transporte.html">Transporte</a>
        <a href="importar.html">Importación</a>
        <a href="financiamiento.html">Financiamiento</a>`,
  },
  {
    nombre: 'pie · ¿buscas otra cosa?',
    marca: '<a href="transporte.html">Transporte de equipos (lowboy)</a>',
    de: `        <li><a href="alquiler.html">Alquiler de equipos por día o semana</a></li>
        <li><a href="importar.html">Importación de maquinaria</a></li>`,
    a: `        <li><a href="alquiler.html">Alquiler de equipos por día o semana</a></li>
        <li><a href="transporte.html">Transporte de equipos (lowboy)</a></li>
        <li><a href="importar.html">Importación de maquinaria</a></li>`,
  },
  {
    nombre: 'pie · enlaces',
    marca: '<b>Cotizar transporte:</b>',
    de: `        <li><a href="alquiler.html"><b>Cotizar alquiler de equipo:</b> nuestra flota, por día o mes</a></li>`,
    a: `        <li><a href="transporte.html"><b>Cotizar transporte:</b> con seguimiento por GPS</a></li>
        <li><a href="alquiler.html"><b>Cotizar alquiler de equipo:</b> nuestra flota, por día o mes</a></li>`,
  },
];

let tocados = 0;
const faltantes = [];

for (const archivo of fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html'))) {
  if (archivo === 'transporte.html') continue;   // nació cableada
  const ruta = path.join(RAIZ, archivo);
  const original = fs.readFileSync(ruta, 'utf8');
  let texto = original;
  const hechos = [];

  for (const c of CAMBIOS) {
    if (texto.includes(c.marca)) continue;                 // ya aplicado
    if (!texto.includes(c.de)) { faltantes.push(`${archivo} · ${c.nombre}`); continue; }
    texto = texto.replace(c.de, c.a);
    hechos.push(c.nombre);
  }

  if (texto !== original) {
    fs.writeFileSync(ruta, texto, 'utf8');
    console.log(`${archivo}  →  ${hechos.join(', ')}`);
    tocados++;
  } else {
    console.log(`${archivo}  →  ya estaba al día`);
  }
}

console.log(`\n${tocados} archivo(s) modificados`);
if (faltantes.length) {
  console.log('\nNo encontré el fragmento (revisar a mano):');
  faltantes.forEach((f) => console.log('  · ' + f));
  process.exit(1);
}
