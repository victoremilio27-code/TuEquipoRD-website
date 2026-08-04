/**
 * probar-correo.js — comprueba que el correo sale de verdad.
 *
 *   node tools/probar-correo.js tucorreo@gmail.com
 *   node tools/probar-correo.js tucorreo@gmail.com --todas
 *
 * Sin --todas manda solo la bienvenida. Con --todas manda una de cada
 * plantilla, para revisar de una vez cómo se ven todas en el móvil.
 *
 * Diagnostica antes de enviar: si falta la clave o el transporte está
 * en 'archivo', lo dice en vez de dejar el correo en un archivo local
 * y hacerte creer que salió.
 */

require('./entorno');

const correo = require('./correo');

const destino = process.argv.find((a) => a.includes('@'));
const todas = process.argv.includes('--todas');

if (!destino) {
  console.error('\nIndique a qué dirección enviar:');
  console.error('  node tools/probar-correo.js tucorreo@gmail.com\n');
  process.exit(1);
}

const transporte = process.env.TUEQUIPO_CORREO || 'archivo';

console.log('\n── Configuración ──');
console.log(`  Transporte:  ${transporte}`);
console.log(`  Remitente:   ${process.env.TUEQUIPO_REMITENTE || '(sin definir, se usa el de por defecto)'}`);
console.log(`  Revisión:    ${correo.REVISION}`);
console.log(`  Sitio:       ${correo.SITIO}`);
console.log(`  BREVO_API_KEY: ${process.env.BREVO_API_KEY ? 'definida' : 'SIN DEFINIR'}`);
console.log(`  Destino:     ${destino}\n`);

if (transporte === 'archivo') {
  console.log('  Aviso: el transporte es "archivo". Los correos se escriben en');
  console.log(`  ${correo.BANDEJA} y NO salen a internet.`);
  console.log('  Para probar Brevo de verdad: TUEQUIPO_CORREO=brevo en el .env\n');
}
if (transporte === 'brevo' && !process.env.BREVO_API_KEY) {
  console.error('  Falta BREVO_API_KEY. Póngala en el .env y repita.\n');
  process.exit(1);
}

/* Una muestra de cada plantilla, con datos inventados pero realistas:
   lo que se revisa es cómo se lee, no si los datos son ciertos. */
const MUESTRAS = [
  ['bienvenida', () => correo.enviarBienvenida({
    para: destino, nombre: 'Prueba', esDealer: false,
  })],
  ['código de verificación', () => correo.enviarCodigo({
    para: destino, codigo: '123456', tipo: 'verificacion', nombre: 'Prueba', minutos: 10,
  })],
  ['anuncio publicado', () => correo.enviarAnuncioPublicado({
    para: destino, nombre: 'Prueba', equipo: '2021 Caterpillar 320',
    idAnuncio: 'demo', vence: new Date(Date.now() + 30 * 86400000).toISOString(), plan: 'Destacado',
  })],
  ['aviso de vencimiento', () => correo.enviarAnuncioPorVencer({
    para: destino, nombre: 'Prueba', equipo: '2021 Caterpillar 320',
    idAnuncio: 'demo', vence: new Date(Date.now() + 5 * 86400000).toISOString(), dias: 5,
  })],
  ['anuncio vencido', () => correo.enviarAnuncioVencido({
    para: destino, nombre: 'Prueba', equipo: '2021 Caterpillar 320', idAnuncio: 'demo',
  })],
  ['comprobante de cobro', () => correo.enviarComprobante({
    para: destino, nombre: 'Prueba', plan: 'Destacado',
    subtotal: 2000, itbis: 360, total: 2360, referencia: 'TE-PRUEBA-001',
    fin: new Date(Date.now() + 60 * 86400000).toISOString(),
  })],
  ['contacto recibido', () => correo.enviarContactoRecibido({
    para: destino, nombre: 'Prueba', equipo: '2021 Caterpillar 320',
    idAnuncio: 'demo', via: 'whatsapp',
  })],
  ['cuenta de dealer aprobada', () => correo.enviarResolucionDealer({
    para: destino, nombre: 'Prueba', empresa: 'Equipos de Prueba SRL',
    aprobada: true, slug: 'equipos-de-prueba',
  })],
];

(async () => {
  const aEnviar = todas ? MUESTRAS : MUESTRAS.slice(0, 1);
  console.log(`── Enviando ${aEnviar.length} correo(s) ──`);

  let bien = 0;
  for (const [nombre, enviar] of aEnviar) {
    const r = await enviar();
    const salio = r && r.entregado;
    if (salio) bien++;
    console.log(`  ${salio ? '✓' : '✗'} ${nombre}${salio ? '' : ` — ${(r && r.error) || 'sin detalle'}`}`);
  }

  console.log(`\n${bien}/${aEnviar.length} entregado(s) al proveedor.`);
  if (bien && transporte === 'brevo') {
    console.log('\nRevise la bandeja de entrada Y la carpeta de spam.');
    console.log('Si llegó a spam, faltan los registros SPF, DKIM o DMARC del dominio.\n');
  }
  process.exit(bien === aEnviar.length ? 0 : 1);
})();
