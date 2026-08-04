/**
 * tareas.js — mantenimiento automático de la plataforma.
 *
 *   node tools/tareas.js            # todas las tareas
 *   node tools/tareas.js caducar    # una sola
 *   node tools/tareas.js --seco     # dice qué haría, sin hacerlo
 *
 * Pensado para un temporizador de systemd (ver deploy/) que lo
 * despierte una vez al día. Se ejecuta y termina: no queda un proceso
 * vivo que haya que vigilar, y si una ejecución falla, la siguiente
 * recoge lo que quedó pendiente.
 *
 * Toda tarea es idempotente. Correrlo dos veces seguidas no manda dos
 * correos ni hace dos respaldos del mismo minuto: lo que ya se hizo
 * queda anotado en la base.
 */

require('./entorno');

const fs = require('fs');
const path = require('path');

const db = require('./db');
const correo = require('./correo');

const SECO = process.argv.includes('--seco');
const DIAS_AVISO = Number(process.env.TUEQUIPO_DIAS_AVISO) || 5;
const RESPALDOS = process.env.TUEQUIPO_RESPALDOS || path.resolve(__dirname, '..', '.tmp', 'respaldos');
const RESPALDOS_MAX = Number(process.env.TUEQUIPO_RESPALDOS_MAX) || 14;

const registro = [];
const anotar = (tarea, mensaje) => {
  registro.push({ tarea, mensaje });
  console.log(`  ${SECO ? '[seco] ' : ''}${mensaje}`);
};

/* ── Tareas ─────────────────────────────────────────────── */

/* Pasa a 'vencido' lo que llegó a su fecha. El servidor ya lo hace al
   consultar el catálogo, pero eso solo ocurre si alguien entra: sin
   esta tarea, un sitio sin visitas de madrugada deja anuncios
   caducados marcados como activos hasta la primera visita. */
function caducar() {
  if (SECO) {
    const n = db.abrir().prepare(
      "SELECT COUNT(*) AS n FROM anuncios WHERE estado = 'activo' AND vence IS NOT NULL AND vence < ?")
      .get(db.ahora()).n;
    return anotar('caducar', `${n} anuncio(s) pasarían a vencidos`);
  }
  const r = db.caducarAnuncios();
  anotar('caducar', `${r.changes} anuncio(s) marcados como vencidos`);
}

/* Aviso antes del corte. Se manda una sola vez por anuncio: la marca
   se pone solo si el correo salió, así un fallo del proveedor no
   consume el aviso y el intento se repite mañana. */
async function avisarPorVencer() {
  const pendientes = db.anunciosPorVencer(DIAS_AVISO);
  if (!pendientes.length) return anotar('por-vencer', 'sin anuncios próximos a vencer');

  let enviados = 0;
  for (const a of pendientes) {
    const dias = Math.max(1, Math.ceil((new Date(a.vence) - Date.now()) / 86400000));
    if (SECO) { enviados++; continue; }

    const r = await correo.enviarAnuncioPorVencer({
      para: a.correo,
      nombre: a.nombre,
      equipo: `${a.anio} ${a.marca} ${a.modelo}`,
      idAnuncio: a.id,
      vence: a.vence,
      dias,
    });
    if (r && r.entregado) { db.marcarAviso(a.id, 'por-vencer'); enviados++; }
  }
  anotar('por-vencer', `${enviados} de ${pendientes.length} aviso(s) de vencimiento`);
}

async function avisarVencidos() {
  const pendientes = db.anunciosVencidosSinAvisar();
  if (!pendientes.length) return anotar('vencidos', 'sin vencidos por avisar');

  let enviados = 0;
  for (const a of pendientes) {
    if (SECO) { enviados++; continue; }
    const r = await correo.enviarAnuncioVencido({
      para: a.correo,
      nombre: a.nombre,
      equipo: `${a.anio} ${a.marca} ${a.modelo}`,
      idAnuncio: a.id,
    });
    if (r && r.entregado) { db.marcarAviso(a.id, 'vencido'); enviados++; }
  }
  anotar('vencidos', `${enviados} de ${pendientes.length} aviso(s) de corte`);
}

/* Sesiones, códigos y contadores caducados. */
function limpiar() {
  if (SECO) return anotar('limpiar', 'purgaría sesiones, códigos e intentos caducados');
  db.purgar();
  anotar('limpiar', 'purgadas sesiones, códigos e intentos caducados');
}

/* Respaldo de la base.
 *
 * Se usa la API `.backup()` de SQLite y no `cp`: copiar el archivo
 * mientras hay una escritura en curso produce un respaldo corrupto que
 * solo se descubre el día que hace falta restaurarlo.
 *
 * Se prueba abrir la copia antes de darla por buena. Un respaldo que
 * nunca se verifica es una carpeta que ocupa disco. */
function respaldar() {
  const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const destino = path.join(RESPALDOS, `tuequipord-${sello}.db`);

  if (SECO) return anotar('respaldo', `escribiría ${destino}`);

  fs.mkdirSync(RESPALDOS, { recursive: true });
  const d = db.abrir();

  // VACUUM INTO produce un archivo compacto y consistente, y a
  // diferencia de .backup deja el resultado ya desfragmentado.
  d.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);

  const { DatabaseSync } = require('node:sqlite');
  const prueba = new DatabaseSync(destino, { readOnly: true });
  const n = prueba.prepare('SELECT COUNT(*) AS n FROM anuncios').get().n;
  const integridad = prueba.prepare('PRAGMA integrity_check').get();
  prueba.close();

  const bien = Object.values(integridad)[0] === 'ok';
  if (!bien) {
    fs.rmSync(destino, { force: true });
    throw new Error('el respaldo no pasó integrity_check y se descartó');
  }

  const kb = Math.round(fs.statSync(destino).size / 1024);
  anotar('respaldo', `${path.basename(destino)} · ${kb} KB · ${n} anuncios · íntegro`);

  // Rotación: se conservan los últimos RESPALDOS_MAX.
  const viejos = fs.readdirSync(RESPALDOS)
    .filter((f) => f.startsWith('tuequipord-') && f.endsWith('.db'))
    .sort().reverse().slice(RESPALDOS_MAX);
  viejos.forEach((f) => fs.rmSync(path.join(RESPALDOS, f), { force: true }));
  if (viejos.length) anotar('respaldo', `${viejos.length} respaldo(s) antiguos eliminados`);
}

/* Deja la base compacta y con las estadísticas del planificador al
   día. Sin esto, las consultas se degradan lentamente a medida que se
   borran filas. */
function optimizar() {
  if (SECO) return anotar('optimizar', 'ejecutaría ANALYZE y PRAGMA optimize');
  const d = db.abrir();
  d.exec('ANALYZE');
  d.exec('PRAGMA optimize');
  anotar('optimizar', 'estadísticas del planificador actualizadas');
}

/* ── Orquestación ───────────────────────────────────────── */

const TAREAS = {
  caducar,
  'por-vencer': avisarPorVencer,
  vencidos: avisarVencidos,
  limpiar,
  respaldo: respaldar,
  optimizar,
};

(async () => {
  const pedidas = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const aEjecutar = pedidas.length ? pedidas : Object.keys(TAREAS);

  const desconocidas = aEjecutar.filter((t) => !TAREAS[t]);
  if (desconocidas.length) {
    console.error(`Tarea desconocida: ${desconocidas.join(', ')}`);
    console.error(`Disponibles: ${Object.keys(TAREAS).join(', ')}`);
    process.exit(1);
  }

  console.log(`\nTuEquipoRD · mantenimiento ${new Date().toISOString()}${SECO ? ' (simulación)' : ''}\n`);
  db.abrir();

  let fallos = 0;
  for (const nombre of aEjecutar) {
    try {
      await TAREAS[nombre]();
    } catch (e) {
      fallos++;
      // Una tarea que falla no detiene a las demás: que el respaldo
      // falle no es razón para no purgar ni avisar.
      console.error(`  ✗ ${nombre}: ${e.message}`);
    }
  }

  console.log(`\n${aEjecutar.length - fallos}/${aEjecutar.length} tarea(s) completadas\n`);
  process.exit(fallos ? 1 : 0);
})();
