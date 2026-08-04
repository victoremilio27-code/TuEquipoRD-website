/**
 * entorno.js — carga el archivo .env en process.env. Sin dependencias.
 *
 * Se importa lo primero, antes que db o correo:
 *
 *   require('./entorno');
 *
 * Reglas, a propósito estrictas y pocas:
 *   · Lo que ya venga en el entorno MANDA sobre el archivo. En el VPS
 *     las variables llegan por systemd y un .env olvidado en el
 *     servidor no debe pisarlas.
 *   · Las líneas vacías y las que empiezan por # se ignoran.
 *   · Se admiten comillas alrededor del valor y se quitan.
 *   · Si el archivo no existe no pasa nada: en producción no se usa.
 *
 * El .env NUNCA se sube al repositorio: está en .gitignore. Es donde
 * viven las claves en desarrollo.
 */

const fs = require('fs');
const path = require('path');

const RUTA = process.env.TUEQUIPO_ENV || path.resolve(__dirname, '..', '.env');

function cargar(ruta = RUTA) {
  let crudo;
  try {
    crudo = fs.readFileSync(ruta, 'utf8');
  } catch {
    return 0;                       // sin archivo, nada que hacer
  }

  let puestas = 0;
  for (const linea of crudo.split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;

    const corte = limpia.indexOf('=');
    if (corte < 1) continue;

    const clave = limpia.slice(0, corte).trim();
    let valor = limpia.slice(corte + 1).trim();

    // Quitar comillas envolventes, si las hay.
    if ((valor.startsWith('"') && valor.endsWith('"'))
      || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }

    // El entorno real gana siempre.
    if (process.env[clave] === undefined) {
      process.env[clave] = valor;
      puestas++;
    }
  }
  return puestas;
}

cargar();

module.exports = { cargar, RUTA };
