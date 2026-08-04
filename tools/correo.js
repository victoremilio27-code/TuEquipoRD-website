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

/* Brevo, por su API HTTPS de correo transaccional.
 *
 * Se usa la API y no el SMTP a propósito: no hace falta abrir el
 * puerto 587 (muchos proveedores de VPS lo bloquean de salida para
 * frenar el spam), la respuesta dice si el mensaje se aceptó, y no se
 * arrastra una dependencia de cliente SMTP.
 *
 * Sin `node:https` extra: viene con Node.
 *
 * Configuración:
 *   TUEQUIPO_CORREO=brevo
 *   BREVO_API_KEY=xkeysib-…
 *
 * El remitente debe estar verificado en Brevo y el dominio necesita
 * SPF, DKIM y DMARC publicados, o el correo acaba en spam. Ver
 * deploy/README.md.
 */
const https = require('https');

/* Separa "Nombre <correo@dominio>" en las dos partes que pide la API. */
function partirRemitente(cadena) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(String(cadena));
  return m ? { name: m[1] || undefined, email: m[2] } : { email: String(cadena).trim() };
}

function porBrevo({ para, asunto, texto, html }) {
  const clave = process.env.BREVO_API_KEY;
  if (!clave) throw new Error('Falta BREVO_API_KEY');

  const cuerpo = JSON.stringify({
    sender: partirRemitente(REMITENTE),
    to: [{ email: para }],
    subject: asunto,
    textContent: texto,
    ...(html ? { htmlContent: html } : {}),
  });

  return new Promise((resolver) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'api-key': clave,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(cuerpo),
      },
      timeout: 10000,
    }, (res) => {
      let datos = '';
      res.on('data', (c) => { datos += c; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolver({ entregado: true, id: (JSON.parse(datos || '{}') || {}).messageId });
        } else {
          // No se lanza: quien llama ya trata `entregado: false`, y una
          // caída de Brevo no puede tumbar un registro que sí se guardó.
          console.error(`correo: Brevo devolvió ${res.statusCode} · ${datos.slice(0, 200)}`);
          resolver({ entregado: false, error: `Brevo ${res.statusCode}` });
        }
      });
    });

    req.on('timeout', () => { req.destroy(); resolver({ entregado: false, error: 'tiempo agotado' }); });
    req.on('error', (e) => resolver({ entregado: false, error: e.message }));
    req.write(cuerpo);
    req.end();
  });
}

/* ── Salida única ───────────────────────────────────────── */

const TRANSPORTES = { archivo: porArchivo, brevo: porBrevo };

/* Nunca lanza: un fallo del correo no debe tumbar la operación que lo
   provocó. Devuelve si se entregó para que quien llame decida.

   Con Brevo devuelve una promesa. Quien llama puede ignorarla —el
   correo es accesorio a la operación— o esperarla si necesita saber si
   salió; por eso el `catch` cubre los dos casos. */
function enviar(mensaje) {
  const transporte = TRANSPORTES[TRANSPORTE];
  if (!transporte) {
    console.error(`correo: transporte "${TRANSPORTE}" desconocido; use archivo o brevo`);
    return { entregado: false, error: 'transporte desconocido' };
  }
  try {
    const r = transporte(mensaje);
    return r && typeof r.catch === 'function'
      ? r.catch((e) => {
        console.error('correo: no se pudo enviar a', mensaje.para, '·', e.message);
        return { entregado: false, error: e.message };
      })
      : r;
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

/* ── Alta de dealers ────────────────────────────────────── */

/* Buzón del equipo que revisa las solicitudes de empresa. */
const REVISION = process.env.TUEQUIPO_REVISION || 'dealers@tuequipord.do';

/* Expediente para quien revisa. Va en texto plano y ordenado por
   bloques: se lee entero desde el teléfono y se compara contra el
   registro mercantil sin abrir el panel.
 *
 * Este es el único correo que lleva el RNC completo, y va a una
 * dirección interna. No se reenvía al dealer ni aparece en ningún
 * mensaje que reciba un tercero. */
function enviarSolicitudDealer(s) {
  const linea = (rotulo, valor) => (valor == null || valor === '' ? null : `${rotulo}: ${valor}`);
  const ubicacion = [s.direccion, s.municipio, s.provincia].filter(Boolean).join(', ');

  const cuerpo = [
    'Solicitud de cuenta de dealer pendiente de revisión.',
    '',
    '── Empresa ──',
    linea('Razón social', s.razon_social),
    linea('Nombre comercial', s.nombre_comercial),
    linea('RNC', s.rnc),
    linea('Años operando', s.anios_operando),
    linea('Dirección', ubicacion),
    linea('Teléfono', s.telefono),
    linea('Web', s.web),
    '',
    '── Responsable ──',
    linea('Encargado', s.encargado),
    linea('Cargo', s.cargo),
    linea('Abrió la cuenta', s.solicitante),
    linea('Correo', s.correo_solicitante),
    '',
    '── Operación ──',
    linea('Equipos en inventario', s.equipos_inventario),
    linea('Equipos que desea publicar', s.equipos_publicar),
    linea('Tipos de equipo', s.tipos_equipo),
    '',
    '── Contexto ──',
    linea('Cómo nos conoció', s.origen),
    linea('Comentario', s.comentario),
    '',
    `Solicitud ${s.id}`,
    'Apruébela o recházela en /admin.html',
  ].filter((l) => l !== null).join('\n');

  return enviar({
    para: REVISION,
    asunto: `Solicitud de dealer · ${s.razon_social}`,
    texto: cuerpo,
  });
}

/* Resultado de la revisión, para la empresa. Un rechazo explica por
   qué y cómo volver a intentarlo: una negativa sin motivo genera una
   respuesta preguntando qué pasó, que hay que contestar igual. */
function enviarResolucionDealer({ para, nombre, empresa, aprobada, motivo, slug }) {
  const texto = aprobada
    ? [
      nombre ? `Hola, ${nombre}:` : 'Hola:', '',
      `Revisamos los datos de ${empresa} y su cuenta de dealer quedó aprobada.`, '',
      'Ya puede publicar equipos y su página de empresa aparecerá en el directorio',
      'en cuanto contrate un plan que la incluya.',
      slug ? `Su dirección será: https://tuequipord.do/dealer.html?d=${slug}` : null,
      '',
      'TuEquipoRD',
    ]
    : [
      nombre ? `Hola, ${nombre}:` : 'Hola:', '',
      `Revisamos la solicitud de ${empresa} y por ahora no podemos aprobarla.`, '',
      motivo ? `Motivo: ${motivo}` : 'No pudimos confirmar los datos de la empresa.',
      '',
      'Su cuenta sigue activa y puede escribirnos a dealers@tuequipord.do con la',
      'documentación corregida para que la revisemos de nuevo.',
      '',
      'TuEquipoRD',
    ];

  return enviar({
    para,
    asunto: aprobada
      ? `Su cuenta de dealer quedó aprobada · TuEquipoRD`
      : `Sobre su solicitud de cuenta de dealer · TuEquipoRD`,
    texto: texto.filter((l) => l !== null).join('\n'),
  });
}

/* ── Ciclo de vida del anuncio ──────────────────────────── */

const SITIO = process.env.TUEQUIPO_SITIO || 'https://tuequipord.do';
const fecha = (iso) => (iso
  ? new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
  : null);

/* Confirmación de publicación. Lleva el enlace a la ficha porque es lo
   primero que quiere hacer quien acaba de publicar: verla y
   compartirla. */
const enviarAnuncioPublicado = ({ para, nombre, equipo, idAnuncio, vence, plan }) => enviar({
  para,
  asunto: `Su ${equipo} ya está publicado · TuEquipoRD`,
  texto: [
    nombre ? `Hola, ${nombre}:` : 'Hola:', '',
    `Su anuncio de ${equipo} está publicado y visible en el catálogo.`, '',
    `Verlo: ${SITIO}/equipo.html?id=${idAnuncio}`,
    plan ? `Plan: ${plan}` : null,
    vence ? `Vigente hasta el ${fecha(vence)}.` : 'Se mantiene publicado mientras la membresía siga activa.',
    '',
    'Desde su panel puede editarlo, pausarlo, marcarlo como vendido y ver',
    `cuánta gente lo está mirando: ${SITIO}/panel.html`, '',
    'TuEquipoRD',
  ].filter((l) => l !== null).join('\n'),
});

/* Aviso previo al vencimiento. Se manda una sola vez por anuncio; de
   eso se encarga quien llama, anotándolo en la base. */
const enviarAnuncioPorVencer = ({ para, nombre, equipo, idAnuncio, vence, dias }) => enviar({
  para,
  asunto: `Su ${equipo} vence en ${dias} ${dias === 1 ? 'día' : 'días'} · TuEquipoRD`,
  texto: [
    nombre ? `Hola, ${nombre}:` : 'Hola:', '',
    `Su anuncio de ${equipo} deja de publicarse el ${fecha(vence)}.`, '',
    'Si todavía no lo ha vendido, puede renovarlo desde el panel y sigue',
    'apareciendo en el catálogo sin perder las visitas acumuladas:',
    `${SITIO}/panel.html`, '',
    'Si ya lo vendió, márquelo como vendido y así no le volvemos a escribir.', '',
    'TuEquipoRD',
  ].join('\n'),
});

const enviarAnuncioVencido = ({ para, nombre, equipo, idAnuncio }) => enviar({
  para,
  asunto: `Su ${equipo} dejó de publicarse · TuEquipoRD`,
  texto: [
    nombre ? `Hola, ${nombre}:` : 'Hola:', '',
    `El anuncio de ${equipo} llegó al final de su vigencia y ya no aparece en el catálogo.`, '',
    'Sus fotos, su descripción y sus estadísticas siguen guardadas: renovarlo',
    `lo vuelve a publicar tal como estaba. ${SITIO}/panel.html`, '',
    'TuEquipoRD',
  ].join('\n'),
});

/* Comprobante del cobro. No sustituye a la factura fiscal; sirve para
   que el anunciante tenga por escrito qué contrató y por cuánto. */
const enviarComprobante = ({ para, nombre, plan, subtotal, itbis, total, referencia, fin }) => enviar({
  para,
  asunto: `Comprobante de su plan ${plan} · TuEquipoRD`,
  texto: [
    nombre ? `Hola, ${nombre}:` : 'Hola:', '',
    `Confirmamos la contratación del plan ${plan}.`, '',
    `Subtotal:   RD$${Number(subtotal).toLocaleString('en-US')}`,
    `ITBIS 18%:  RD$${Number(itbis).toLocaleString('en-US')}`,
    `Total:      RD$${Number(total).toLocaleString('en-US')}`,
    `Referencia: ${referencia}`,
    fin ? `Vigente hasta el ${fecha(fin)}.` : null,
    '',
    `Su historial de pagos está en ${SITIO}/panel.html`, '',
    'TuEquipoRD',
  ].filter((l) => l !== null).join('\n'),
});

/* Aviso al vendedor de que alguien pidió su contacto. Es la señal de
   que el anuncio está funcionando, y la razón principal por la que
   alguien renueva. */
const enviarContactoRecibido = ({ para, nombre, equipo, idAnuncio, via }) => enviar({
  para,
  asunto: `Alguien pidió su contacto por el ${equipo} · TuEquipoRD`,
  texto: [
    nombre ? `Hola, ${nombre}:` : 'Hola:', '',
    `Una persona interesada pidió su ${via === 'whatsapp' ? 'WhatsApp' : 'teléfono'}`,
    `desde el anuncio de ${equipo}.`, '',
    'No tenemos sus datos: el contacto ocurre directamente entre ustedes.',
    'Le avisamos para que esté pendiente de la llamada o del mensaje.', '',
    `Ver el anuncio y sus estadísticas: ${SITIO}/panel.html`, '',
    'TuEquipoRD',
  ].join('\n'),
});

/* Bienvenida, tras confirmar el correo. Orienta sobre el primer paso
   en vez de limitarse a celebrar el registro. */
const enviarBienvenida = ({ para, nombre, esDealer }) => enviar({
  para,
  asunto: 'Su cuenta de TuEquipoRD está lista',
  texto: [
    nombre ? `Hola, ${nombre}:` : 'Hola:', '',
    'Su correo quedó confirmado y ya puede usar su cuenta.', '',
    esDealer
      ? [
        'Como pidió una cuenta de empresa, revisaremos los datos que nos dio',
        'y le escribiremos con el resultado, normalmente en menos de 24 horas',
        'hábiles. Mientras tanto puede ir preparando sus equipos.',
      ].join('\n')
      : [
        'Para publicar un equipo necesita sus fotos, el año, las horas de uso',
        'y el precio. El asistente le guía paso a paso y toma unos minutos.',
      ].join('\n'),
    '',
    `Publicar un equipo: ${SITIO}/publicar.html`,
    `Su panel:           ${SITIO}/panel.html`, '',
    'TuEquipoRD',
  ].join('\n'),
});

module.exports = {
  enviar, enviarCodigo, enviarAvisoCambioClave,
  enviarSolicitudDealer, enviarResolucionDealer,
  enviarAnuncioPublicado, enviarAnuncioPorVencer, enviarAnuncioVencido,
  enviarComprobante, enviarContactoRecibido, enviarBienvenida,
  BANDEJA, REVISION, SITIO,
};
