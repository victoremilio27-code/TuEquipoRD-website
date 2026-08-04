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
 *   · 'brevo' — producción. Correo transaccional por la API HTTPS de
 *     Brevo. Ni la API ni las pantallas se enteran del cambio.
 *
 * Elegir con TUEQUIPO_CORREO=brevo y definir BREVO_API_KEY.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const BANDEJA = path.join(RAIZ, '.tmp', 'correos');

const REMITENTE = process.env.TUEQUIPO_REMITENTE || 'TuEquipoRD <no-responder@tuequipord.com>';
const TRANSPORTE = process.env.TUEQUIPO_CORREO || 'archivo';

// Buzón interno que recibe las solicitudes de dealer para revisar.
const REVISION = process.env.TUEQUIPO_REVISION || 'dealers@tuequipord.com';

// URL pública, para los enlaces que van dentro de los correos.
const SITIO = process.env.TUEQUIPO_SITIO || 'https://tuequipord.com';

/* Escapa lo que venga del usuario antes de meterlo en el HTML del
   correo: un nombre con "<script>" no debe llegar a la bandeja de
   nadie tal cual. */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Maquetación común ──────────────────────────────────── */

/* Un solo armazón para todos los correos. Antes cada plantilla se
   escribía suelta y solo la del código tenía HTML; las demás llegaban
   en texto plano y se veían pobres al lado.
 *
 * Reglas de maquetación de correo, que no son las de una página web:
 *
 *   · TABLAS, no flexbox ni grid. Outlook de escritorio usa el motor
 *     de Word y no entiende nada moderno; una tabla se ve igual en
 *     todas partes.
 *   · ESTILOS EN LÍNEA. Gmail descarta las hojas de estilo y buena
 *     parte de lo que haya en <style>.
 *   · ANCHO MÁXIMO 560 px, y todo se apila solo en pantalla estrecha.
 *   · COLORES EXPLÍCITOS en cada elemento. Sin esto, el modo oscuro de
 *     algunos clientes invierte el texto y lo deja ilegible.
 */

const AZUL = '#071A2B';
const AMBAR = '#F2A900';
const HUESO = '#F7F5EF';
const LINEA = '#DEDCD4';
const GRIS = '#33475A';
const GRIS_CLARO = '#60717D';

const TIPO = 'Inter,-apple-system,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif';

/* Botón «a prueba de balas»: el color de fondo va en la celda de la
   tabla y no en el enlace, porque varios clientes recortan el relleno
   de un <a> con fondo. */
const boton = (texto, url) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 4px">
    <tr><td align="center" bgcolor="${AMBAR}" style="border-radius:6px">
      <a href="${esc(url)}" style="display:inline-block;padding:14px 30px;font-family:${TIPO};font-size:15px;font-weight:700;color:${AZUL};text-decoration:none;border-radius:6px">${esc(texto)}</a>
    </td></tr>
  </table>`;

/* Tarjeta destacada: el dato que la persona ha venido a buscar. */
const tarjeta = (contenido, centrado = false) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0">
    <tr><td bgcolor="#FFFFFF" style="padding:20px;border:1px solid ${LINEA};border-left:3px solid ${AMBAR};border-radius:6px;${centrado ? 'text-align:center' : ''}">
      ${contenido}
    </td></tr>
  </table>`;

/* Lista de pares rótulo/valor, para comprobantes y resúmenes. */
const filas = (pares) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${TIPO};font-size:14px">
    ${pares.filter(([, v]) => v != null && v !== '').map(([k, v], i, todas) => `
      <tr>
        <td style="padding:9px 0;color:${GRIS_CLARO};${i < todas.length - 1 ? `border-bottom:1px solid ${LINEA};` : ''}">${esc(k)}</td>
        <td align="right" style="padding:9px 0;color:${AZUL};font-weight:600;${i < todas.length - 1 ? `border-bottom:1px solid ${LINEA};` : ''}">${esc(v)}</td>
      </tr>`).join('')}
  </table>`;

/* Armazón completo: banner, cuerpo y pie. */
function envoltura({ titulo, saludo, parrafos = [], extra = '', nota = '', accion }) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:#E7E6E0;font-family:${TIPO}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#E7E6E0">
<tr><td align="center" style="padding:24px 12px">

  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(7,26,43,.12)">

    <!-- Banner -->
    <tr><td bgcolor="${AZUL}" style="padding:26px 26px 24px;border-bottom:4px solid ${AMBAR}">
      <div style="font-family:${TIPO};font-size:27px;font-weight:800;letter-spacing:-.02em;color:#FFFFFF;line-height:1">
        TuEquipo<span style="color:${AMBAR}">RD</span>
      </div>
      <div style="margin-top:6px;font-family:${TIPO};font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:#8FA3B3">
        Maquinaria y equipo pesado
      </div>
    </td></tr>

    <!-- Cuerpo -->
    <tr><td bgcolor="${HUESO}" style="padding:30px 26px">
      <h1 style="margin:0 0 14px;font-family:${TIPO};font-size:23px;font-weight:800;line-height:1.25;letter-spacing:-.02em;color:${AZUL}">${esc(titulo)}</h1>
      ${saludo ? `<p style="margin:0 0 12px;font-family:${TIPO};font-size:15px;font-weight:600;color:${AZUL}">${esc(saludo)}</p>` : ''}
      ${parrafos.map((p) => `<p style="margin:0 0 12px;font-family:${TIPO};font-size:14.5px;line-height:1.65;color:${GRIS}">${p}</p>`).join('')}
      ${extra}
      ${accion ? boton(accion.texto, accion.url) : ''}
      ${nota ? `<p style="margin:22px 0 0;padding-top:16px;border-top:1px solid ${LINEA};font-family:${TIPO};font-size:12.5px;line-height:1.6;color:${GRIS_CLARO}">${nota}</p>` : ''}
    </td></tr>

    <!-- Pie -->
    <tr><td bgcolor="${AZUL}" style="padding:20px 26px">
      <p style="margin:0;font-family:${TIPO};font-size:12px;line-height:1.6;color:#8FA3B3">
        TuEquipoRD · República Dominicana<br>
        <a href="${SITIO}" style="color:${AMBAR};text-decoration:none">tuequipord.com</a>
      </p>
    </td></tr>

  </table>

</td></tr></table>
</body></html>`;
}

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

  const html = envoltura({
    titulo: t.titulo,
    saludo,
    parrafos: [esc(t.cuerpo)],
    extra: tarjeta(`
      <div style="font-family:${TIPO};font-size:38px;font-weight:800;letter-spacing:.3em;color:${AZUL};font-variant-numeric:tabular-nums;line-height:1.1">${esc(codigo)}</div>
      <div style="margin-top:8px;font-family:${TIPO};font-size:12.5px;color:${GRIS_CLARO}">Vence en ${minutos} minutos · un solo uso</div>`, true),
    nota: 'Si no fue usted, ignore este mensaje y no comparta el código con nadie. <b style="color:'
      + AZUL + '">Nunca le pediremos este código por teléfono ni por WhatsApp.</b>',
  });

  return { asunto: t.asunto, texto, html };
}

/* ── Transportes ────────────────────────────────────────── */

function porArchivo({ para, asunto, texto, html }) {
  fs.mkdirSync(BANDEJA, { recursive: true });
  const sello = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(BANDEJA, `${sello}-${para.replace(/[^\w.@-]/g, '_')}`);
  const archivo = `${base}.txt`;
  fs.writeFileSync(archivo, `Para: ${para}\nDe: ${REMITENTE}\nAsunto: ${asunto}\n\n${texto}\n`, 'utf8');

  // La versión HTML se guarda aparte para poder abrirla en el navegador
  // y ver cómo va a llegar, sin gastar un envío real.
  if (html) fs.writeFileSync(`${base}.html`, html, 'utf8');

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
  const saludo = nombre ? `Hola, ${nombre}:` : 'Hola:';
  return enviar({
    para,
    asunto: 'Su contraseña de TuEquipoRD cambió',
    texto: [
      saludo, '',
      'La contraseña de su cuenta de TuEquipoRD acaba de cambiar y se cerraron todas las sesiones abiertas.', '',
      'Si fue usted, no hay nada que hacer.',
      'Si no fue usted, escriba de inmediato a hola@tuequipord.com.', '',
      'TuEquipoRD',
    ].join('\n'),
    html: envoltura({
      titulo: 'Su contraseña cambió',
      saludo,
      parrafos: [
        'La contraseña de su cuenta acaba de cambiar y se cerraron todas las sesiones abiertas.',
        'Si fue usted, no hay nada que hacer.',
      ],
      nota: `Si <b style="color:${AZUL}">no</b> fue usted, escríbanos de inmediato a `
        + `<a href="mailto:hola@tuequipord.com" style="color:${AMBAR}">hola@tuequipord.com</a>.`,
    }),
  });
}

/* ── Alta de dealers ────────────────────────────────────── */

/* Buzón del equipo que revisa las solicitudes de empresa. */

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
    html: envoltura({
      titulo: 'Solicitud de dealer',
      parrafos: [`<b style="color:${AZUL}">${esc(s.razon_social)}</b> pide cuenta de empresa.`],
      extra: tarjeta(filas([
        ['Razón social', s.razon_social],
        ['Nombre comercial', s.nombre_comercial],
        ['RNC', s.rnc],
        ['Años operando', s.anios_operando],
        ['Ubicación', ubicacion],
        ['Teléfono', s.telefono],
        ['Encargado', s.encargado],
        ['Cargo', s.cargo],
        ['Abrió la cuenta', s.solicitante],
        ['Correo', s.correo_solicitante],
        ['En inventario', s.equipos_inventario],
        ['Desea publicar', s.equipos_publicar],
        ['Tipos de equipo', s.tipos_equipo],
        ['Cómo nos conoció', s.origen],
        ['Comentario', s.comentario],
      ])),
      accion: { texto: 'Revisar la solicitud', url: `${SITIO}/admin.html` },
      nota: `El RNC es un dato reservado: sirve para comprobar la empresa contra el registro `
        + `mercantil y no debe copiarse a ninguna ficha ni página pública. Solicitud ${esc(s.id)}.`,
    }),
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
      slug ? `Su dirección será: https://tuequipord.com/dealer.html?d=${slug}` : null,
      '',
      'TuEquipoRD',
    ]
    : [
      nombre ? `Hola, ${nombre}:` : 'Hola:', '',
      `Revisamos la solicitud de ${empresa} y por ahora no podemos aprobarla.`, '',
      motivo ? `Motivo: ${motivo}` : 'No pudimos confirmar los datos de la empresa.',
      '',
      'Su cuenta sigue activa y puede escribirnos a dealers@tuequipord.com con la',
      'documentación corregida para que la revisemos de nuevo.',
      '',
      'TuEquipoRD',
    ];

  const saludo = nombre ? `Hola, ${nombre}:` : 'Hola:';

  return enviar({
    para,
    asunto: aprobada
      ? `Su cuenta de dealer quedó aprobada · TuEquipoRD`
      : `Sobre su solicitud de cuenta de dealer · TuEquipoRD`,
    texto: texto.filter((l) => l !== null).join('\n'),
    html: aprobada
      ? envoltura({
        titulo: 'Su cuenta de dealer quedó aprobada',
        saludo,
        parrafos: [
          `Revisamos los datos de <b style="color:${AZUL}">${esc(empresa)}</b> y su cuenta de empresa está aprobada.`,
          'Ya puede publicar equipos. Su página de empresa aparecerá en el directorio en cuanto contrate un plan que la incluya.',
        ],
        extra: slug ? tarjeta(`
          <div style="font-family:${TIPO};font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${GRIS_CLARO}">Su página pública</div>
          <div style="margin-top:6px;font-family:${TIPO};font-size:15px;font-weight:600;color:${AZUL};word-break:break-all">${SITIO}/dealer.html?d=${esc(slug)}</div>`) : '',
        accion: { texto: 'Publicar un equipo', url: `${SITIO}/publicar.html` },
      })
      : envoltura({
        titulo: 'Sobre su solicitud',
        saludo,
        parrafos: [
          `Revisamos la solicitud de <b style="color:${AZUL}">${esc(empresa)}</b> y por ahora no podemos aprobarla.`,
        ],
        extra: tarjeta(`
          <div style="font-family:${TIPO};font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${GRIS_CLARO}">Motivo</div>
          <div style="margin-top:6px;font-family:${TIPO};font-size:14.5px;line-height:1.6;color:${AZUL}">${esc(motivo || 'No pudimos confirmar los datos de la empresa.')}</div>`),
        nota: 'Su cuenta sigue activa. Escríbanos a '
          + `<a href="mailto:${esc(REVISION)}" style="color:${AMBAR}">${esc(REVISION)}</a>`
          + ' con la documentación corregida y la revisamos de nuevo.',
      }),
  });
}

/* ── Ciclo de vida del anuncio ──────────────────────────── */

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
  html: envoltura({
    titulo: 'Su equipo ya está publicado',
    saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
    parrafos: ['Su anuncio está visible en el catálogo y cualquiera puede encontrarlo.'],
    extra: tarjeta(`
      <div style="font-family:${TIPO};font-size:18px;font-weight:700;color:${AZUL};line-height:1.3">${esc(equipo)}</div>
      ${filas([
    ['Plan', plan],
    ['Vigente hasta', vence ? fecha(vence) : 'Mientras la membresía siga activa'],
  ])}`),
    accion: { texto: 'Ver el anuncio', url: `${SITIO}/equipo.html?id=${idAnuncio}` },
    nota: `Desde <a href="${SITIO}/panel.html" style="color:${AMBAR}">su panel</a> puede editarlo, `
      + 'pausarlo, marcarlo como vendido y ver cuánta gente lo está mirando.',
  }),
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
  html: envoltura({
    titulo: `Su anuncio vence en ${dias} ${dias === 1 ? 'día' : 'días'}`,
    saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
    parrafos: ['Si todavía no lo ha vendido, renuévelo y sigue apareciendo en el catálogo sin perder las visitas acumuladas.'],
    extra: tarjeta(`
      <div style="font-family:${TIPO};font-size:18px;font-weight:700;color:${AZUL};line-height:1.3">${esc(equipo)}</div>
      <div style="margin-top:10px;font-family:${TIPO};font-size:13px;color:${GRIS_CLARO}">Deja de publicarse el</div>
      <div style="margin-top:2px;font-family:${TIPO};font-size:20px;font-weight:800;color:${AMBAR}">${esc(fecha(vence))}</div>`),
    accion: { texto: 'Renovar el anuncio', url: `${SITIO}/panel.html` },
    nota: 'Si ya lo vendió, márquelo como vendido en el panel y así no le volvemos a escribir por este equipo.',
  }),
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
  html: envoltura({
    titulo: 'Su anuncio dejó de publicarse',
    saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
    parrafos: ['Llegó al final de su vigencia y ya no aparece en el catálogo.'],
    extra: tarjeta(`
      <div style="font-family:${TIPO};font-size:18px;font-weight:700;color:${AZUL};line-height:1.3">${esc(equipo)}</div>`),
    accion: { texto: 'Volver a publicarlo', url: `${SITIO}/panel.html` },
    nota: 'Sus fotos, su descripción y sus estadísticas siguen guardadas. Renovarlo lo publica de nuevo tal como estaba.',
  }),
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
  html: envoltura({
    titulo: 'Comprobante de su plan',
    saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
    parrafos: [`Confirmamos la contratación del plan <b style="color:${AZUL}">${esc(plan)}</b>.`],
    extra: tarjeta(`
      ${filas([
    ['Subtotal', `RD$${Number(subtotal).toLocaleString('en-US')}`],
    ['ITBIS 18%', `RD$${Number(itbis).toLocaleString('en-US')}`],
  ])}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;padding-top:12px;border-top:2px solid ${AZUL}">
        <tr>
          <td style="font-family:${TIPO};font-size:15px;font-weight:700;color:${AZUL}">Total</td>
          <td align="right" style="font-family:${TIPO};font-size:21px;font-weight:800;color:${AZUL}">RD$${Number(total).toLocaleString('en-US')}</td>
        </tr>
      </table>
      ${filas([
    ['Referencia', referencia],
    ['Vigente hasta', fin ? fecha(fin) : null],
  ])}`),
    accion: { texto: 'Ver mi historial de pagos', url: `${SITIO}/panel.html` },
    nota: 'Este comprobante confirma lo contratado y su importe. No sustituye a la factura fiscal.',
  }),
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
  html: envoltura({
    titulo: 'Alguien pidió su contacto',
    saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
    parrafos: [
      `Una persona interesada pidió su <b style="color:${AZUL}">${via === 'whatsapp' ? 'WhatsApp' : 'teléfono'}</b> desde este anuncio.`,
    ],
    extra: tarjeta(`
      <div style="font-family:${TIPO};font-size:18px;font-weight:700;color:${AZUL};line-height:1.3">${esc(equipo)}</div>`),
    accion: { texto: 'Ver sus estadísticas', url: `${SITIO}/panel.html` },
    nota: 'No tenemos los datos de esa persona: el contacto ocurre directamente entre ustedes. '
      + 'Le avisamos para que esté pendiente de la llamada o del mensaje.',
  }),
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
  html: envoltura({
    titulo: 'Su cuenta está lista',
    saludo: nombre ? `Hola, ${nombre}:` : 'Hola:',
    parrafos: [
      'Su correo quedó confirmado y ya puede usar su cuenta.',
      esDealer
        ? 'Como pidió una cuenta de empresa, revisaremos los datos que nos dio y le escribiremos con el resultado, normalmente en menos de 24 horas hábiles. Mientras tanto puede ir preparando sus equipos.'
        : 'Para publicar un equipo necesita sus fotos, el año, las horas de uso y el precio. El asistente le guía paso a paso y toma unos minutos.',
    ],
    accion: { texto: 'Publicar un equipo', url: `${SITIO}/publicar.html` },
    nota: `Su panel está en <a href="${SITIO}/panel.html" style="color:${AMBAR}">${SITIO}/panel.html</a>. `
      + 'Ahí verá sus anuncios, cuánta gente los mira y cuántos piden su contacto.',
  }),
});

module.exports = {
  enviar, enviarCodigo, enviarAvisoCambioClave,
  enviarSolicitudDealer, enviarResolucionDealer,
  enviarAnuncioPublicado, enviarAnuncioPorVencer, enviarAnuncioVencido,
  enviarComprobante, enviarContactoRecibido, enviarBienvenida,
  BANDEJA, REVISION, SITIO,
};
