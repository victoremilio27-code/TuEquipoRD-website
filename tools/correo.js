/**
 * correo.js — envío de correo. Sin dependencias.
 *
 * Un único punto de salida para todo el correo del sitio, con dos
 * transportes:
 *
 *   · 'archivo' (por defecto en desarrollo) — no manda nada a nadie:
 *     escribe cada mensaje en .tmp/correos/ y saca el código por
 *     consola. Se puede probar el flujo entero sin cuenta de correo
 *     ni riesgo de escribirle a una dirección real por error.
 *
 *   · 'smtp' — el hueco para producción. Se implementa aquí y ni la
 *     API ni las pantallas se enteran del cambio.
 *
 * Elegir con TUEQUIPO_CORREO=smtp.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const BANDEJA = path.join(RAIZ, '.tmp', 'correos');

const REMITENTE = process.env.TUEQUIPO_REMITENTE || 'TuEquipoRD <no-responder@tuequipord.do>';
const TRANSPORTE = process.env.TUEQUIPO_CORREO || 'archivo';

/* Escapa lo que venga del usuario antes de meterlo en el HTML del
   correo: un nombre con "<script>" no debe llegar a la bandeja de
   nadie tal cual. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Plantillas ─────────────────────────────────────────── */

/* Un correo con código se lee en la notificación del teléfono: el
   código va en el asunto y en la primera línea, no al final. */
function plantillaCodigo({ codigo, tipo, nombre, minutos }) {
  const textos = {
    verificacion: {
      asunto: `${codigo} es su código de verificación · TuEquipoRD`,
      titulo: 'Confirme su correo',
      cuerpo: 'Use este código para terminar de crear su cuenta en TuEquipoRD.',
    },
    acceso: {
      asunto: `${codigo} es su código de acceso · TuEquipoRD`,
      titulo: 'Código de acceso',
      cuerpo: 'Alguien está iniciando sesión en su cuenta desde un equipo nuevo. Use este código para continuar.',
    },
    restablecer: {
      asunto: `${codigo} es su código para cambiar la contraseña · TuEquipoRD`,
      titulo: 'Cambio de contraseña',
      cuerpo: 'Use este código para establecer una contraseña nueva en su cuenta.',
    },
  };
  const t = textos[tipo] || textos.verificacion;
  const saludo = nombre ? `Hola, ${nombre}:` : 'Hola:';

  const texto = [
    saludo, '',
    `${t.cuerpo}`, '',
    `Código: ${codigo}`,
    `Vence en ${minutos} minutos y solo sirve una vez.`, '',
    'Si no fue usted, ignore este mensaje y no comparta el código con nadie.',
    'Nunca le pediremos este código por teléfono ni por WhatsApp.', '',
    'TuEquipoRD',
  ].join('\n');

  const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#071A2B">
  <div style="background:#071A2B;border-bottom:3px solid #F2A900;padding:18px 22px">
    <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-.02em">TuEquipo<span style="color:#F2A900">RD</span></span>
  </div>
  <div style="padding:26px 22px;background:#F7F5EF">
    <h1 style="margin:0 0 6px;font-size:20px">${esc(t.titulo)}</h1>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#33475A">${esc(saludo)} ${esc(t.cuerpo)}</p>
    <div style="background:#fff;border:1px solid #DEDCD4;border-left:3px solid #F2A900;border-radius:6px;padding:18px;text-align:center">
      <div style="font-size:34px;font-weight:800;letter-spacing:.32em;font-variant-numeric:tabular-nums">${esc(codigo)}</div>
      <div style="font-size:12px;color:#60717D;margin-top:6px">Vence en ${minutos} minutos · un solo uso</div>
    </div>
    <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#60717D">
      Si no fue usted, ignore este mensaje y no comparta el código con nadie.
      <b>Nunca le pediremos este código por teléfono ni por WhatsApp.</b>
    </p>
  </div>
</div>`;

  return { asunto: t.asunto, texto, html };
}

/* ── Transportes ────────────────────────────────────────── */

function porArchivo({ para, asunto, texto }) {
  fs.mkdirSync(BANDEJA, { recursive: true });
  const sello = new Date().toISOString().replace(/[:.]/g, '-');
  const archivo = path.join(BANDEJA, `${sello}-${para.replace(/[^\w.@-]/g, '_')}.txt`);
  fs.writeFileSync(archivo, `Para: ${para}\nDe: ${REMITENTE}\nAsunto: ${asunto}\n\n${texto}\n`, 'utf8');

  // En desarrollo el código se lee aquí, en la consola del servidor.
  const codigo = /Código: (\d+)/.exec(texto);
  console.log(`✉  ${para} · ${asunto}${codigo ? `  → CÓDIGO ${codigo[1]}` : ''}`);
  return { entregado: true, archivo };
}

function porSmtp(mensaje) {
  // Punto de integración: aquí va el proveedor (SES, Resend, Postmark
  // o el SMTP del dominio). Debe devolver una promesa y no lanzar por
  // un fallo puntual: el registro no puede caerse porque el correo
  // tarde. Encolar y reintentar es lo correcto a partir de cierto
  // volumen.
  throw new Error('Transporte SMTP sin configurar. Defina TUEQUIPO_CORREO=archivo o implemente porSmtp().');
}

/* ── Salida única ───────────────────────────────────────── */

/* Nunca lanza: un fallo del correo no debe tumbar la operación que lo
   provocó. Devuelve si se entregó para que quien llame decida. */
function enviar(mensaje) {
  try {
    return TRANSPORTE === 'smtp' ? porSmtp(mensaje) : porArchivo(mensaje);
  } catch (e) {
    console.error('correo: no se pudo enviar a', mensaje.para, '·', e.message);
    return { entregado: false, error: e.message };
  }
}

const enviarCodigo = ({ para, codigo, tipo, nombre, minutos }) =>
  enviar({ para, ...plantillaCodigo({ codigo, tipo, nombre, minutos }) });

/* Aviso de que la contraseña cambió. No lleva código ni enlace: su
   único fin es que el dueño se entere si el cambio no fue suyo. */
function enviarAvisoCambioClave({ para, nombre }) {
  return enviar({
    para,
    asunto: 'Su contraseña de TuEquipoRD cambió',
    texto: [
      nombre ? `Hola, ${nombre}:` : 'Hola:', '',
      'La contraseña de su cuenta de TuEquipoRD acaba de cambiar y se cerraron todas las sesiones abiertas.', '',
      'Si fue usted, no hay nada que hacer.',
      'Si no fue usted, escriba de inmediato a hola@tuequipord.do.', '',
      'TuEquipoRD',
    ].join('\n'),
  });
}

module.exports = { enviar, enviarCodigo, enviarAvisoCambioClave, BANDEJA };
