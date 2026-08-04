/**
 * admin.js — concede o retira el permiso de revisar solicitudes.
 *
 *   node tools/admin.js conceder victor@tuequipord.do
 *   node tools/admin.js retirar  victor@tuequipord.do
 *   node tools/admin.js listar
 *
 * Deliberadamente fuera del sitio: no hay pantalla, ruta ni formulario
 * que otorgue este permiso. Se da desde el servidor, por alguien que
 * ya tiene acceso a él. Así, comprometer una cuenta del sitio nunca
 * alcanza para volverse administrador.
 *
 * La persona debe tener cuenta creada antes de concederle el permiso.
 */

const db = require('./db');

const [accion, correo] = process.argv.slice(2);

function uso(mensaje) {
  if (mensaje) console.error(`\n${mensaje}`);
  console.error(`
Uso:
  node tools/admin.js conceder <correo>
  node tools/admin.js retirar  <correo>
  node tools/admin.js listar
`);
  process.exit(mensaje ? 1 : 0);
}

db.abrir();

if (accion === 'listar') {
  const admins = db.abrir()
    .prepare('SELECT correo, nombre FROM usuarios WHERE es_admin = 1 ORDER BY correo').all();

  if (!admins.length) {
    console.log('No hay ningún administrador. Conceda el permiso con:');
    console.log('  node tools/admin.js conceder <correo>');
  } else {
    console.log(`${admins.length} administrador(es):`);
    admins.forEach((a) => console.log(`  ${a.correo}  ${a.nombre}`));
  }
  process.exit(0);
}

if (accion !== 'conceder' && accion !== 'retirar') uso('Indique conceder, retirar o listar.');
if (!correo) uso('Falta el correo.');

if (!db.usuarioPorCorreo(correo)) {
  console.error(`\nNo hay ninguna cuenta con el correo ${correo}.`);
  console.error('La persona debe registrarse en el sitio antes de recibir el permiso.\n');
  process.exit(1);
}

const conceder = accion === 'conceder';
db.marcarAdmin(correo, conceder);

console.log(conceder
  ? `\n${correo} ya puede revisar solicitudes en /admin.html\n`
  : `\n${correo} deja de ser administrador.\n`);
