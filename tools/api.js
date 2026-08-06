/**
 * api.js — API HTTP de TuEquipoRD. Sin dependencias.
 *
 * La monta serve.js bajo /api. Cada ruta valida su entrada, llama a
 * db.js y devuelve JSON. Aquí no hay SQL: solo reglas de negocio,
 * permisos y forma de la respuesta.
 *
 * Convenios:
 *  · Sesión por cookie httpOnly con un testigo aleatorio.
 *  · Los errores salen como { error: 'texto' } con su código HTTP.
 *  · El dinero viaja en pesos enteros, igual que se guarda.
 */

const db = require('./db');
const correo = require('./correo');
const fotos = require('./fotos');

/* El cálculo del importe es el MISMO módulo que carga el navegador.
   La cifra que se enseña y la que se cobra salen de la misma función:
   ya pasó una vez que el precio viviera solo en el JavaScript y la
   página anunciara un plan sin costo mientras el servidor cobraba. */
const precios = require('../assets/precios.js');

const { ITBIS } = precios;
const COOKIE = 'te_sesion';
const COOKIE_EQUIPO = 'te_equipo';

/* Topes de las operaciones sensibles. Son deliberadamente bajos: un
   humano no pide seis códigos en diez minutos, un guion sí. */
const LIMITES = {
  codigos:  { tope: 5,  minutos: 15 },   // códigos pedidos por correo
  acceso:   { tope: 10, minutos: 15 },   // contraseñas probadas por IP
  registro: { tope: 5,  minutos: 60 },   // cuentas creadas por IP
};

/* ── Utilidades de transporte ───────────────────────────── */

function responder(res, codigo, cuerpo, cabeceras = {}) {
  const datos = JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...cabeceras,
  });
  res.end(datos);
}

const fallo = (res, codigo, texto) => responder(res, codigo, { error: texto });

function leerCuerpo(req) {
  return new Promise((resolver, rechazar) => {
    let datos = '';
    let tamano = 0;
    req.on('data', (trozo) => {
      tamano += trozo.length;
      // Las fotos viajan como data URL dentro del JSON; 25 MB cubre
      // veinte imágenes ya reducidas en el navegador y corta de raíz
      // un envío que quiera agotar la memoria del proceso.
      if (tamano > 25 * 1024 * 1024) {
        rechazar(Object.assign(new Error('Cuerpo demasiado grande'), { codigo: 413 }));
        req.destroy();
        return;
      }
      datos += trozo;
    });
    req.on('end', () => {
      if (!datos) return resolver({});
      try { resolver(JSON.parse(datos)); } catch { rechazar(Object.assign(new Error('JSON inválido'), { codigo: 400 })); }
    });
    req.on('error', rechazar);
  });
}

function leerCookies(req) {
  const crudo = req.headers.cookie || '';
  const salida = {};
  crudo.split(';').forEach((par) => {
    const i = par.indexOf('=');
    if (i > 0) salida[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim());
  });
  return salida;
}

/* `Secure` solo cuando el sitio corre sobre HTTPS: en desarrollo, por
   http://localhost, el navegador descartaría la cookie y no se podría
   iniciar sesión. */
const SEGURA = process.env.TUEQUIPO_HTTPS === '1' ? '; Secure' : '';

const cookieSesion = (testigo, dias = 30) =>
  `${COOKIE}=${testigo}; Path=/; HttpOnly; SameSite=Lax${SEGURA}; Max-Age=${dias * 24 * 3600}`;

const cookieEquipo = (testigo, dias = 60) =>
  `${COOKIE_EQUIPO}=${testigo}; Path=/; HttpOnly; SameSite=Lax${SEGURA}; Max-Age=${dias * 24 * 3600}`;

/* Quién pide, para los límites por origen. Detrás de un proxy el
   cliente real va en X-Forwarded-For; se toma el primero. */
const origen = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  || req.socket.remoteAddress || 'desconocido';

const equipoDescrito = (req) => String(req.headers['user-agent'] || '').slice(0, 200);

/* ── Sesión y permisos ──────────────────────────────────── */

function contexto(req) {
  const testigo = leerCookies(req)[COOKIE];
  const s = db.sesion(testigo);
  if (!s) return null;
  const org = db.organizacionDe(s.usuario_id);
  return { testigo, usuario: { id: s.usuario_id, correo: s.correo, nombre: s.nombre }, organizacion: org };
}

/* Envuelve las rutas que exigen sesión. Devuelve 401 en vez de
   redirigir: quien llama es JavaScript, no un navegador siguiendo
   enlaces. */
const conSesion = (manejador) => (req, res, ctx, ...resto) => {
  if (!ctx) return fallo(res, 401, 'Necesita iniciar sesión');
  return manejador(req, res, ctx, ...resto);
};

/* Solo el personal de TuEquipoRD. La marca `es_admin` no se concede
   desde ninguna pantalla: se pone con tools/admin.js. Se comprueba
   contra la base en cada petición y no contra la cookie, para que
   quitar el permiso tenga efecto inmediato.

   Responde 404 y no 403: quien no es administrador no debe enterarse
   siquiera de que estas rutas existen. */
const conAdmin = (manejador) => conSesion((req, res, ctx, ...resto) => {
  const u = db.usuarioPorId(ctx.usuario.id);
  if (!u || !u.es_admin) return fallo(res, 404, 'No existe');
  return manejador(req, res, ctx, ...resto);
});

/* ── Validación ─────────────────────────────────────────── */

const texto = (v, max = 500) => (v == null ? null : String(v).trim().slice(0, max) || null);
const entero = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

/* El RNC dominicano tiene 9 dígitos. Se acepta escrito con guiones y
   se guarda solo con dígitos para que dos formatos del mismo número no
   burlen el control de duplicados.

   Antes también se admitían 11 dígitos, que es una cédula. Ya no: la
   cuenta de dealer es para empresas constituidas, y aceptar la cédula
   de una persona convertía la comprobación en un trámite sin valor. */
function rncValido(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 9 ? d : null;
}

/* El RNC nunca sale entero hacia el navegador, ni siquiera al dueño de
   la cuenta: se enseñan los últimos cuatro dígitos, suficientes para
   que reconozca cuál tiene registrado. Entero solo se ve en las rutas
   de administración y en el correo de revisión. */
const rncEnmascarado = (rnc) => (rnc ? `•••••${String(rnc).slice(-4)}` : null);

const telefonoValido = (v) => String(v || '').replace(/\D/g, '').length === 10;

/* ── Rutas: cuenta ──────────────────────────────────────── */

/* Fuerza mínima de la contraseña. No se exigen símbolos raros —eso
   produce contraseñas cortas llenas de sustituciones previsibles—
   sino longitud, que es lo que de verdad cuesta romper. */
function claveDebil(clave, correoUsuario) {
  const v = String(clave || '');
  if (v.length < 10) return 'La contraseña debe tener al menos 10 caracteres';
  if (/^\d+$/.test(v)) return 'La contraseña no puede ser solo números';
  // Se compara con la parte local del correo, pero solo si es lo
  // bastante larga: con un correo tipo "a@…" cualquier contraseña que
  // lleve una "a" quedaría rechazada.
  const usuarioCorreo = String(correoUsuario || '').split('@')[0].toLowerCase();
  if (usuarioCorreo.length >= 4 && v.toLowerCase().includes(usuarioCorreo)) {
    return 'La contraseña no puede contener su correo';
  }
  const comunes = ['contrasena', 'password', '12345678', 'qwerty', 'tuequipord', 'administrador'];
  if (comunes.some((p) => v.toLowerCase().includes(p))) return 'Esa contraseña es demasiado común';
  return null;
}

/* Emite un código y lo manda. La respuesta NUNCA dice si el correo
   existe: eso convertiría la pantalla en un detector de cuentas. */
function emitirCodigo({ correo: destino, tipo, idUsuario, nombre }) {
  if (!db.permitir(`codigo:${destino}`, LIMITES.codigos.tope, LIMITES.codigos.minutos)) {
    return { limitado: true };
  }
  const { codigo, minutos } = db.crearCodigo({ correo: destino, tipo, idUsuario });
  correo.enviarCodigo({ para: destino, codigo, tipo, nombre, minutos });
  return { limitado: false, minutos };
}

async function registro(req, res) {
  const c = await leerCuerpo(req);
  const ip = origen(req);

  if (!db.permitir(`registro:${ip}`, LIMITES.registro.tope, LIMITES.registro.minutos)) {
    return fallo(res, 429, 'Demasiadas cuentas creadas desde esta conexión. Inténtelo más tarde.');
  }

  if (!correoValido(c.correo)) return fallo(res, 400, 'Escriba un correo válido');
  const debil = claveDebil(c.clave, c.correo);
  if (debil) return fallo(res, 400, debil);
  if (!texto(c.nombre, 120)) return fallo(res, 400, 'Escriba su nombre');

  const esDealer = c.tipo === 'dealer';
  let rnc = null;
  let solicitud = null;
  if (esDealer) {
    // Una cuenta de empresa sin dirección ni teléfono no sirve: su
    // página pública quedaría sin forma de visitarla ni de llamar.
    if (!texto(c.empresa, 160)) return fallo(res, 400, 'Escriba la razón social de la empresa');
    rnc = rncValido(c.rnc);
    if (!rnc) return fallo(res, 400, 'El RNC de la empresa tiene 9 dígitos');
    if (!telefonoValido(c.telefono)) return fallo(res, 400, 'Indique el teléfono principal de la empresa, de 10 dígitos');
    if (!texto(c.direccion, 200) || String(c.direccion).trim().length < 8) {
      return fallo(res, 400, 'Indique la dirección de la oficina principal');
    }
    if (!texto(c.provincia, 60)) return fallo(res, 400, 'Indique la provincia de la oficina principal');

    // Quién responde por la empresa. Es la persona con la que el
    // administrador habla si algo del expediente no cuadra, así que se
    // pide aparte de quien abre la cuenta.
    if (!texto(c.encargado, 120)) return fallo(res, 400, 'Indique el nombre del encargado o representante');

    solicitud = {
      nombreComercial: texto(c.nombreComercial, 160),
      aniosOperando: entero(c.aniosOperando),
      encargado: texto(c.encargado, 120),
      cargo: texto(c.cargo, 80),
      equiposInventario: entero(c.equiposInventario),
      equiposPublicar: entero(c.equiposPublicar),
      tiposEquipo: texto(c.tiposEquipo, 300),
      origen: texto(c.origen, 120),
      comentario: texto(c.comentario, 1000),
    };
  }

  if (db.usuarioPorCorreo(c.correo)) return fallo(res, 409, 'Ya existe una cuenta con ese correo');

  let idUsuario;
  let idOrg;
  try {
    ({ idUsuario, idOrg } = db.crearCuenta({
      correo: c.correo,
      clave: c.clave,
      nombre: texto(c.nombre, 120),
      telefono: texto(c.telefono, 40),
      tipo: esDealer ? 'dealer' : 'particular',
      empresa: texto(c.empresa, 160),
      rnc,
      direccion: texto(c.direccion, 200),
      provincia: texto(c.provincia, 60),
      municipio: texto(c.municipio, 60),
      solicitud,
    }));
  } catch (e) {
    if (String(e.message).includes('UNIQUE') && String(e.message).includes('rnc')) {
      return fallo(res, 409, 'Ese RNC ya está registrado por otra cuenta');
    }
    throw e;
  }

  // El expediente completo va al equipo que revisa. Se manda aquí y no
  // al verificar el correo porque `enviar` no lanza nunca: si el correo
  // falla, la solicitud sigue en la base y se ve en el panel.
  if (esDealer) avisarSolicitudDealer(idOrg);

  // La cuenta existe pero todavía no hay sesión: primero el código.
  emitirCodigo({ correo: c.correo, tipo: 'verificacion', idUsuario, nombre: texto(c.nombre, 120) });

  return responder(res, 201, {
    verificacion: 'verificacion',
    correo: String(c.correo).trim().toLowerCase(),
    mensaje: esDealer
      ? 'Le enviamos un código de 6 dígitos para confirmar su correo. Después revisaremos los datos de la empresa.'
      : 'Le enviamos un código de 6 dígitos para confirmar su correo.',
  });
}

async function entrar(req, res) {
  const c = await leerCuerpo(req);
  const ip = origen(req);

  if (!db.permitir(`acceso:${ip}`, LIMITES.acceso.tope, LIMITES.acceso.minutos)) {
    return fallo(res, 429, 'Demasiados intentos desde esta conexión. Espere unos minutos.');
  }

  const u = db.usuarioPorCorreo(c.correo);

  // Mismo mensaje para correo inexistente y contraseña incorrecta: si
  // se distinguen, la pantalla se convierte en un detector de qué
  // correos tienen cuenta.
  if (!u || !db.claveCorrecta(String(c.clave || ''), u.clave_hash, u.clave_sal)) {
    return fallo(res, 401, 'Correo o contraseña incorrectos');
  }

  db.limpiarIntentos(`acceso:${ip}`);

  // Correo sin confirmar: se retoma la verificación pendiente.
  if (!u.correo_verificado) {
    emitirCodigo({ correo: u.correo, tipo: 'verificacion', idUsuario: u.id, nombre: u.nombre });
    return responder(res, 200, {
      verificacion: 'verificacion',
      correo: u.correo,
      mensaje: 'Su correo aún no está confirmado. Le enviamos un código nuevo.',
    });
  }

  // Equipo ya conocido: la contraseña basta. En uno nuevo, código.
  if (db.dispositivoDeConfianza(leerCookies(req)[COOKIE_EQUIPO], u.id)) {
    const testigo = db.abrirSesion(u.id);
    return responder(res, 200, sesionPublica(u.id), { 'Set-Cookie': cookieSesion(testigo) });
  }

  emitirCodigo({ correo: u.correo, tipo: 'acceso', idUsuario: u.id, nombre: u.nombre });
  return responder(res, 200, {
    verificacion: 'acceso',
    correo: u.correo,
    mensaje: 'Le enviamos un código de acceso porque no reconocemos este equipo.',
  });
}

/* Comprueba el código y abre la sesión. Es el único sitio por el que
   se entra tras un registro o desde un equipo nuevo. */
async function verificar(req, res) {
  const c = await leerCuerpo(req);
  const tipo = ['verificacion', 'acceso'].includes(c.tipo) ? c.tipo : 'verificacion';
  const destino = String(c.correo || '').trim().toLowerCase();

  if (!db.permitir(`verificar:${origen(req)}`, 20, 15)) {
    return fallo(res, 429, 'Demasiados intentos. Espere unos minutos.');
  }

  const r = db.verificarCodigo({ correo: destino, tipo, codigo: c.codigo });
  if (!r.ok) {
    const mensajes = {
      inexistente: 'No hay ningún código pendiente. Solicite uno nuevo.',
      vencido: 'El código venció. Solicite uno nuevo.',
      agotado: 'Demasiados intentos con ese código. Solicite uno nuevo.',
      usado: 'Ese código ya se utilizó.',
      incorrecto: r.restantes > 0
        ? `Código incorrecto. Le quedan ${r.restantes} ${r.restantes === 1 ? 'intento' : 'intentos'}.`
        : 'Código incorrecto. Solicite uno nuevo.',
    };
    return fallo(res, 400, mensajes[r.motivo] || 'Código incorrecto');
  }

  const u = db.usuarioPorId(r.usuario_id);
  if (!u) return fallo(res, 400, 'La cuenta ya no existe');

  if (tipo === 'verificacion') {
    db.marcarCorreoVerificado(u.id);
    // Bienvenida solo al confirmar la cuenta, no en cada acceso desde
    // un equipo nuevo. Orienta sobre el siguiente paso, que es distinto
    // según se haya registrado como particular o como empresa.
    const org = db.organizacionDe(u.id);
    correo.enviarBienvenida({
      para: u.correo,
      nombre: u.nombre,
      esDealer: !!(org && org.tipo === 'dealer'),
    });
  }

  const cookies = [cookieSesion(db.abrirSesion(u.id))];
  if (c.recordar !== false) {
    cookies.push(cookieEquipo(db.recordarDispositivo(u.id, equipoDescrito(req))));
  }
  return responder(res, 200, sesionPublica(u.id), { 'Set-Cookie': cookies });
}

/* Reenvío. Responde igual exista o no la cuenta. */
async function reenviar(req, res) {
  const c = await leerCuerpo(req);
  const tipo = ['verificacion', 'acceso', 'restablecer'].includes(c.tipo) ? c.tipo : 'verificacion';
  const u = db.usuarioPorCorreo(c.correo);

  if (u) emitirCodigo({ correo: u.correo, tipo, idUsuario: u.id, nombre: u.nombre });

  return responder(res, 202, { mensaje: 'Si esa cuenta existe, le enviamos un código nuevo.' });
}

/* ── Recuperación de contraseña ─────────────────────────── */

async function recuperar(req, res) {
  const c = await leerCuerpo(req);
  if (!correoValido(c.correo)) return fallo(res, 400, 'Escriba un correo válido');

  const u = db.usuarioPorCorreo(c.correo);
  // Se responde lo mismo haya cuenta o no: es lo que impide averiguar
  // qué correos están registrados probándolos aquí uno a uno.
  if (u) emitirCodigo({ correo: u.correo, tipo: 'restablecer', idUsuario: u.id, nombre: u.nombre });

  return responder(res, 202, {
    verificacion: 'restablecer',
    correo: String(c.correo).trim().toLowerCase(),
    mensaje: 'Si esa cuenta existe, le enviamos un código para cambiar la contraseña.',
  });
}

async function restablecer(req, res) {
  const c = await leerCuerpo(req);
  const destino = String(c.correo || '').trim().toLowerCase();

  if (!db.permitir(`restablecer:${origen(req)}`, 20, 15)) {
    return fallo(res, 429, 'Demasiados intentos. Espere unos minutos.');
  }

  const debil = claveDebil(c.clave, destino);
  if (debil) return fallo(res, 400, debil);

  const r = db.verificarCodigo({ correo: destino, tipo: 'restablecer', codigo: c.codigo });
  if (!r.ok) {
    return fallo(res, 400, r.motivo === 'vencido'
      ? 'El código venció. Solicite uno nuevo.'
      : 'Código incorrecto o vencido. Solicite uno nuevo.');
  }

  const u = db.usuarioPorId(r.usuario_id);
  if (!u) return fallo(res, 400, 'La cuenta ya no existe');

  db.cambiarClave(u.id, c.clave);
  // Cambiar la contraseña echa fuera a todo el mundo, incluido quien
  // hubiera entrado sin permiso. Es el sentido de recuperarla.
  db.cerrarTodoDe(u.id);
  db.marcarCorreoVerificado(u.id);
  correo.enviarAvisoCambioClave({ para: u.correo, nombre: u.nombre });

  const testigo = db.abrirSesion(u.id);
  return responder(res, 200, sesionPublica(u.id), { 'Set-Cookie': cookieSesion(testigo) });
}

function salir(req, res, ctx) {
  if (ctx) db.cerrarSesion(ctx.testigo);
  return responder(res, 200, { ok: true }, { 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; Max-Age=0` });
}

/* Retrato de la sesión que consume el navegador: quién es, en qué
   organización trabaja y qué tiene contratado. */
function sesionPublica(idUsuario) {
  const u = db.usuarioPorId(idUsuario);
  const org = db.organizacionDe(idUsuario);
  const susc = org ? db.suscripcionActiva(org.id) : null;

  return {
    usuario: { id: u.id, nombre: u.nombre, correo: u.correo, telefono: u.telefono, esAdmin: !!u.es_admin },
    organizacion: org && {
      id: org.id, tipo: org.tipo, nombre: org.nombre, rncMascara: rncEnmascarado(org.rnc), slug: org.slug,
      verificada: !!org.verificada, perfilPublico: !!org.perfil_publico, rol: org.rol,
      estadoRevision: org.estado_revision, descripcion: org.descripcion, web: org.web,
      exentaPago: !!org.exenta_pago,
    },
    suscripcion: susc && {
      id: susc.id, plan: susc.plan_id, planNombre: susc.plan_nombre, modalidad: susc.modalidad,
      ciclo: susc.ciclo, estado: susc.estado, fin: susc.fin, proximoCargo: susc.proximo_cargo,
      anunciosIncluidos: susc.anuncios_incluidos,
    },
    // El asistente de publicación necesita saber desde qué sucursal
    // se ofrece el equipo, así que viajan con la sesión.
    sucursales: org ? db.sucursalesDe(org.id) : [],
    verificado: !!u.correo_verificado,
  };
}

const verSesion = (req, res, ctx) =>
  ctx ? responder(res, 200, sesionPublica(ctx.usuario.id)) : responder(res, 200, { usuario: null });

/* ── Rutas: dealer ──────────────────────────────────────── */

/* Registrar el RNC es lo que convierte una cuenta en dealer. Se hace
   aquí y no en el formulario de publicación para que el dato quede
   asociado a la organización de forma permanente: se escribe una vez
   y todos los anuncios futuros lo heredan. */
const registrarDealer = conSesion(async (req, res, ctx) => {
  if (ctx.organizacion.rol !== 'propietario') {
    return fallo(res, 403, 'Solo el propietario de la cuenta puede registrar el RNC');
  }
  const c = await leerCuerpo(req);
  const rnc = rncValido(c.rnc);
  if (!rnc) return fallo(res, 400, 'El RNC de la empresa tiene 9 dígitos');
  if (!texto(c.empresa, 160)) return fallo(res, 400, 'Escriba la razón social de la empresa');
  if (!texto(c.encargado, 120)) return fallo(res, 400, 'Indique el nombre del encargado o representante');

  try {
    db.registrarDealer(ctx.organizacion.id, ctx.usuario.id, {
      rnc,
      empresa: texto(c.empresa, 160),
      web: texto(c.web, 200),
      descripcion: texto(c.descripcion, 2000),
      solicitud: {
        nombreComercial: texto(c.nombreComercial, 160),
        aniosOperando: entero(c.aniosOperando),
        encargado: texto(c.encargado, 120),
        cargo: texto(c.cargo, 80),
        equiposInventario: entero(c.equiposInventario),
        equiposPublicar: entero(c.equiposPublicar),
        tiposEquipo: texto(c.tiposEquipo, 300),
        origen: texto(c.origen, 120),
        comentario: texto(c.comentario, 1000),
      },
    });
  } catch (e) {
    return fallo(res, e.codigo || 500, e.message);
  }

  avisarSolicitudDealer(ctx.organizacion.id);
  return responder(res, 200, sesionPublica(ctx.usuario.id));
});

/* ── Rutas: fotografías ─────────────────────────────────── */

/* Sube un par de imágenes ya reducidas por el navegador y devuelve sus
   rutas. Se guardan en disco y la base solo se queda con la ruta: ver
   el porqué, con los números medidos, en la cabecera de fotos.js.
 *
 * Exige sesión. Subir archivos sin identificar a quien sube convierte
 * el servidor en alojamiento gratuito para cualquiera. */
const subirFoto = conSesion(async (req, res, ctx) => {
  if (!db.permitir(`fotos:${ctx.usuario.id}`, 120, 60)) {
    return fallo(res, 429, 'Demasiadas fotos seguidas. Espere unos minutos.');
  }

  const c = await leerCuerpo(req);
  try {
    // La miniatura es opcional: si el navegador no pudo generarla, la
    // completa sirve para las dos cosas y se ve igual, solo pesa más.
    const completa = fotos.guardar(c.completa);
    const miniatura = c.miniatura ? fotos.guardar(c.miniatura) : completa;
    return responder(res, 201, { completa, miniatura });
  } catch (e) {
    return fallo(res, e.codigo || 500, e.message);
  }
});

/* ── Rutas: portada ─────────────────────────────────────────
   Lo que la portada y la página de categorías necesitan para enseñar
   máquinas de verdad: la fotografía del héroe y unas cuantas de cada
   categoría. Va aparte de /api/estadisticas porque las fotos pesan y
   solo hacen falta en esas dos pantallas. */
/* Fotografías del héroe de la portada.

   Son archivos del sitio, no anuncios del catálogo. Se probó con las
   últimas máquinas publicadas y el resultado dependía de quién hubiera
   subido algo esa mañana: una foto de móvil mal encuadrada acababa de
   portada. Estas están elegidas para eso y no cambian solas.

   La pantalla toma UNA al azar en cada visita. El equipo puede fijar
   otra desde /admin.html y entonces manda esa. */
const FONDOS_HEROE = [
  { imagen: '/brand_assets/portada/heroe-1.jpg', alt: 'Maquinaria pesada de movimiento de tierra en obra' },
  { imagen: '/brand_assets/portada/heroe-2.jpg', alt: 'Excavadora trabajando sobre terreno abierto' },
  { imagen: '/brand_assets/portada/heroe-3.jpg', alt: 'Flota de equipo pesado alineada en un patio' },
  { imagen: '/brand_assets/portada/heroe-4.jpg', alt: 'Equipo de construcción en plena faena' },
  { imagen: '/brand_assets/portada/heroe-5.jpg', alt: 'Maquinaria de construcción al pie de obra' },
];

function verPortada(req, res) {
  const heroe = db.heroePortada(10);

  /* Se descarta lo que ya no está en disco. Un anuncio puede haber
     perdido su archivo —una restauración a medias, una limpieza— y
     entonces el navegador pide una imagen que da 404 y el héroe se
     queda sin fondo. Comprobarlo aquí cuesta unos stat y evita
     mandarle al visitante una foto rota.

     Las guardadas como data URI se dejan pasar: no son archivos. */
  const existe = (ruta) => !String(ruta).startsWith('/fotos/') || !!fotos.rutaExiste(ruta);

  return responder(res, 200, {
    heroe: {
      imagen: heroe.imagen && existe(heroe.imagen) ? heroe.imagen : null,
      alt: heroe.alt,
      opciones: FONDOS_HEROE,
      // Las del catálogo siguen ofreciéndose en /admin.html para poder
      // fijar una máquina concreta; ya no entran en la rotación.
      delCatalogo: heroe.opciones.filter((o) => existe(o.imagen)),
    },
    categorias: db.fotosPorCategoria(4),
  });
}

/* Fija —o quita— la fotografía del héroe. Solo administración.

   La ruta tiene que ser una de /fotos, que es lo que sirve el propio
   sitio. Aceptar una URL cualquiera dejaría la portada cargando una
   imagen de un tercero: se la saltaría la política de contenido, y
   quien la aloja podría cambiarla o retirarla cuando quisiera. */
const editarPortada = conAdmin(async (req, res) => {
  const c = await leerCuerpo(req);

  if (c.imagen !== undefined) {
    const ruta = String(c.imagen || '');
    if (ruta && !fotos.archivoDe(ruta)) {
      return fallo(res, 400, 'La imagen tiene que ser una que se haya subido al sitio');
    }
    db.guardarAjuste('heroe_imagen', ruta);
  }

  if (c.alt !== undefined) db.guardarAjuste('heroe_alt', texto(c.alt, 160) || '');

  return responder(res, 200, { heroe: db.heroePortada() });
});

/* ── Rutas: taxonomía ───────────────────────────────────── */

/* La jerarquía completa, para que la pantalla de publicación arme sus
   selectores. Se sirve desde el servidor —en vez de que el navegador
   cargue assets/taxonomia.js directamente— para que haya una sola
   respuesta cacheable y para poder recortar en el futuro lo que no
   necesite el cliente sin tocar las pantallas. */
function verTaxonomia(req, res) {
  return responder(res, 200, {
    categorias: taxonomia.CATEGORIAS,
    marcas: taxonomia.MARCAS,
    marcasPorSub: taxonomia.MARCAS_POR_SUB,
    modelos: taxonomia.MODELOS,
    motores: taxonomia.MOTORES,
    transmisiones: taxonomia.TRANSMISIONES,
    subsConTrenMotriz: taxonomia.SUBS_CON_TREN_MOTRIZ,
  });
}

/* ── Rutas: publicidad ──────────────────────────────────── */

const ESPACIOS = ['superior', 'lateral-izq', 'lateral-der', 'bloque'];

/* Lo que ve el visitante, agrupado por espacio. La impresión se cuenta
   aquí y no en el navegador: un contador que depende de que el cliente
   avise se pierde con cualquier bloqueador. */
function listarPublicidad(req, res) {
  const vigentes = db.publicidadVigente();
  db.sumarImpresiones(vigentes.map((p) => p.id));

  const porEspacio = {};
  vigentes.forEach((p) => { (porEspacio[p.espacio] ||= []).push(p); });
  return responder(res, 200, { publicidad: porEspacio });
}

/* Registra el clic y redirige. Se pasa por aquí en vez de enlazar
   directo para poder decirle al anunciante cuántos clics recibió.

   Se redirige con 302 y no se devuelve JSON para que el enlace siga
   siendo un enlace: se abre en pestaña nueva, se copia y funciona sin
   JavaScript. */
function clicPublicidad(req, res, ctx, idPub) {
  const p = db.publicidadPorId(idPub);
  if (!p || !p.enlace) return fallo(res, 404, 'No existe');

  db.sumarClic(idPub);
  res.writeHead(302, { Location: p.enlace });
  res.end();
}

function datosPublicidad(c, { parcial = false } = {}) {
  const d = {};

  if (c.espacio !== undefined || !parcial) {
    if (!ESPACIOS.includes(String(c.espacio))) return { error: 'Espacio inválido' };
    d.espacio = String(c.espacio);
  }
  if (c.nombre !== undefined || !parcial) {
    if (!texto(c.nombre, 80)) return { error: 'Escriba un nombre para reconocer la campaña' };
    d.nombre = texto(c.nombre, 80);
  }
  if (c.imagen !== undefined || !parcial) {
    if (!texto(c.imagen, 300)) return { error: 'Cargue la imagen del anuncio' };
    d.imagen = texto(c.imagen, 300);
  }
  if (c.alt !== undefined || !parcial) {
    // Obligatorio: sin esto, quien usa lector de pantalla oye «imagen».
    if (!texto(c.alt, 160)) return { error: 'Escriba qué dice la imagen, para quien no puede verla' };
    d.alt = texto(c.alt, 160);
  }
  if (c.anunciante !== undefined) d.anunciante = texto(c.anunciante, 120);

  if (c.enlace !== undefined) {
    const url = texto(c.enlace, 300);
    // Solo http(s): un `javascript:` en el enlace de un banner es un
    // XSS servido desde la portada.
    if (url && !/^https?:\/\//i.test(url)) return { error: 'El enlace debe empezar por http:// o https://' };
    d.enlace = url;
  }

  const fecha = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);
  if (c.desde !== undefined) d.desde = fecha(c.desde);
  if (c.hasta !== undefined) d.hasta = fecha(c.hasta);
  if (d.desde && d.hasta && d.hasta < d.desde) return { error: 'La fecha de fin va después de la de inicio' };

  if (c.activo !== undefined) d.activo = c.activo ? 1 : 0;
  if (c.orden !== undefined) d.orden = entero(c.orden) ?? 0;

  return { datos: d };
}

const listarPublicidadAdmin = conAdmin((req, res) =>
  responder(res, 200, { publicidad: db.publicidadCompleta(), espacios: ESPACIOS }));

const crearPublicidad = conAdmin(async (req, res) => {
  const c = await leerCuerpo(req);
  const { error, datos } = datosPublicidad(c);
  if (error) return fallo(res, 400, error);
  return responder(res, 201, { anuncio: db.crearPublicidad(datos) });
});

const editarPublicidad = conAdmin(async (req, res, ctx, idPub) => {
  const c = await leerCuerpo(req);
  const { error, datos } = datosPublicidad(c, { parcial: true });
  if (error) return fallo(res, 400, error);
  try {
    return responder(res, 200, { anuncio: db.actualizarPublicidad(idPub, datos) });
  } catch (e) {
    return fallo(res, e.codigo || 500, e.message);
  }
});

const eliminarPublicidad = conAdmin((req, res, ctx, idPub) => {
  if (!db.publicidadPorId(idPub)) return fallo(res, 404, 'Ese anuncio no existe');
  db.borrarPublicidad(idPub);
  return responder(res, 200, { ok: true });
});

/* ── Rutas: flota propia ────────────────────────────────── */

const SERVICIOS = ['alquiler', 'transporte'];

/* Pública: la usan alquiler.html y transporte.html. Solo lo activo. */
function listarFlota(req, res, ctx, servicio) {
  if (!SERVICIOS.includes(servicio)) return fallo(res, 404, 'No existe');
  return responder(res, 200, { servicio, flota: db.flotaPublica(servicio) });
}

/* Valida lo que llega del formulario de administración. Devuelve el
   objeto ya limpio o el error, para no repetir esto en alta y edición. */
function datosFlota(c, servicio, { parcial = false } = {}) {
  const d = {};

  if (c.nombre !== undefined || !parcial) {
    if (!texto(c.nombre, 80)) return { error: 'Escriba el nombre del equipo' };
    d.nombre = texto(c.nombre, 80);
  }
  if (c.detalle !== undefined) d.detalle = texto(c.detalle, 240);
  if (c.icono !== undefined) d.icono = texto(c.icono, 40);
  if (c.foto !== undefined) d.foto = texto(c.foto, 300);

  if (servicio === 'alquiler') {
    if (c.unidad !== undefined || !parcial) {
      const u = String(c.unidad || 'día').toLowerCase();
      if (!['día', 'dia', 'semana', 'mes', 'viaje', 'hora'].includes(u)) {
        return { error: 'La unidad debe ser día, semana, mes, hora o viaje' };
      }
      d.unidad = u === 'dia' ? 'día' : u;
    }
  } else {
    // La capacidad es lo que decide qué cama se asigna a cada equipo,
    // así que en transporte no es opcional.
    if (c.capacidad !== undefined || !parcial) {
      const cap = entero(c.capacidad);
      if (!cap || cap <= 0) return { error: 'Indique la capacidad en toneladas' };
      d.capacidad = cap;
    }
  }

  if (c.activo !== undefined) d.activo = c.activo ? 1 : 0;
  if (c.orden !== undefined) d.orden = entero(c.orden) ?? 0;

  return { datos: d };
}

const listarFlotaAdmin = conAdmin((req, res, ctx, servicio) => {
  if (!SERVICIOS.includes(servicio)) return fallo(res, 404, 'No existe');
  return responder(res, 200, { servicio, flota: db.flotaCompleta(servicio) });
});

const crearFlota = conAdmin(async (req, res, ctx, servicio) => {
  if (!SERVICIOS.includes(servicio)) return fallo(res, 404, 'No existe');
  const c = await leerCuerpo(req);
  const { error, datos } = datosFlota(c, servicio);
  if (error) return fallo(res, 400, error);
  return responder(res, 201, { elemento: db.crearFlota({ ...datos, servicio }) });
});

const editarFlota = conAdmin(async (req, res, ctx, idFlota) => {
  const actual = db.flotaPorId(idFlota);
  if (!actual) return fallo(res, 404, 'Ese elemento no existe');

  const c = await leerCuerpo(req);
  const { error, datos } = datosFlota(c, actual.servicio, { parcial: true });
  if (error) return fallo(res, 400, error);

  try {
    return responder(res, 200, { elemento: db.actualizarFlota(idFlota, datos) });
  } catch (e) {
    return fallo(res, e.codigo || 500, e.message);
  }
});

/* Borra de verdad. Desactivar es lo habitual —y lo que hace el
   interruptor de la pantalla—, pero un elemento creado por error no
   tiene por qué quedarse ahí para siempre. */
const eliminarFlota = conAdmin((req, res, ctx, idFlota) => {
  const actual = db.flotaPorId(idFlota);
  if (!actual) return fallo(res, 404, 'Ese elemento no existe');
  db.borrarFlota(idFlota);
  return responder(res, 200, { ok: true });
});

/* ── Rutas: revisión de solicitudes ─────────────────────── */

/* Manda el expediente al equipo de revisión. No devuelve nada ni
   propaga errores: `correo.enviar` ya se traga los suyos, y un fallo
   de correo no puede tumbar un registro que sí quedó guardado. La
   solicitud está en la base y se ve igual en el panel. */
function avisarSolicitudDealer(idOrg) {
  const s = db.solicitudCompleta(idOrg, { porOrganizacion: true });
  if (s) correo.enviarSolicitudDealer(s);
}

const listarSolicitudes = conAdmin((req, res, ctx, consulta) => {
  const estado = ['pendiente', 'aprobada', 'rechazada'].includes(consulta?.get('estado'))
    ? consulta.get('estado') : 'pendiente';
  return responder(res, 200, {
    estado,
    pendientes: db.contarPendientes(),
    solicitudes: db.solicitudes(estado),
  });
});

/* Expediente completo, con el RNC. Es la única ruta que lo entrega, y
   exige sesión de administrador. */
const verSolicitud = conAdmin((req, res, ctx, idSolicitud) => {
  const s = db.solicitudCompleta(idSolicitud);
  if (!s) return fallo(res, 404, 'Esa solicitud no existe');
  return responder(res, 200, { solicitud: s });
});

const resolverSolicitud = conAdmin(async (req, res, ctx, idSolicitud) => {
  const c = await leerCuerpo(req);
  const aprobar = c.decision === 'aprobar';
  if (!aprobar && c.decision !== 'rechazar') {
    return fallo(res, 400, 'La decisión debe ser aprobar o rechazar');
  }
  const motivo = texto(c.motivo, 500);
  if (!aprobar && !motivo) return fallo(res, 400, 'Escriba el motivo del rechazo');

  let s;
  try {
    s = db.resolverSolicitud(idSolicitud, { aprobar, idRevisor: ctx.usuario.id, motivo });
  } catch (e) {
    return fallo(res, e.codigo || 500, e.message);
  }

  correo.enviarResolucionDealer({
    para: s.correo_solicitante,
    nombre: s.solicitante,
    empresa: s.razon_social,
    aprobada: aprobar,
    motivo,
    slug: s.slug,
  });

  return responder(res, 200, { solicitud: s, pendientes: db.contarPendientes() });
});

/* ── Rutas: sucursales ──────────────────────────────────── */

/* Publicar y editar sucursales queda en manos de quien administra la
   organización: un vendedor puede publicar equipos, pero no cambiar
   dónde dice la empresa que está. */
const puedeAdministrar = (ctx) =>
  ['propietario', 'administrador'].includes(ctx.organizacion.rol);

function datosSucursal(c) {
  if (!texto(c.nombre, 80)) return { error: 'Escriba un nombre para la sucursal' };
  if (!texto(c.provincia, 60)) return { error: 'Indique la provincia' };
  if (!texto(c.direccion, 200) || String(c.direccion).trim().length < 8) {
    return { error: 'Indique la dirección de la sucursal' };
  }
  if (!telefonoValido(c.telefono)) return { error: 'Indique un teléfono de 10 dígitos' };
  if (c.whatsapp && !telefonoValido(c.whatsapp)) return { error: 'El WhatsApp debe tener 10 dígitos' };

  return {
    datos: {
      nombre: texto(c.nombre, 80),
      provincia: texto(c.provincia, 60),
      municipio: texto(c.municipio, 60),
      direccion: texto(c.direccion, 200),
      telefono: texto(c.telefono, 40),
      whatsapp: texto(c.whatsapp, 40),
      horario: texto(c.horario, 80),
    },
  };
}

const listarSucursales = conSesion((req, res, ctx) =>
  responder(res, 200, { sucursales: db.sucursalesDe(ctx.organizacion.id) }));

const crearSucursal = conSesion(async (req, res, ctx) => {
  if (!puedeAdministrar(ctx)) return fallo(res, 403, 'No tiene permiso para administrar sucursales');
  if (ctx.organizacion.tipo !== 'dealer') {
    return fallo(res, 403, 'Las sucursales son para cuentas de empresa. Registre el RNC primero.');
  }
  const v = datosSucursal(await leerCuerpo(req));
  if (v.error) return fallo(res, 400, v.error);

  // Tope defensivo: mil sucursales es un error de guion, no un dealer.
  if (db.sucursalesDe(ctx.organizacion.id).length >= 50) {
    return fallo(res, 409, 'Ha alcanzado el máximo de sucursales. Escríbanos si necesita más.');
  }

  const idSucursal = db.crearSucursal(ctx.organizacion.id, v.datos);
  return responder(res, 201, { sucursal: db.sucursal(idSucursal, ctx.organizacion.id) });
});

const editarSucursal = conSesion(async (req, res, ctx, idSucursal) => {
  if (!puedeAdministrar(ctx)) return fallo(res, 403, 'No tiene permiso para administrar sucursales');
  const c = await leerCuerpo(req);

  if (c.principal === true) {
    if (!db.marcarPrincipal(idSucursal, ctx.organizacion.id)) return fallo(res, 404, 'Esa sucursal no existe');
    return responder(res, 200, { sucursales: db.sucursalesDe(ctx.organizacion.id) });
  }

  const v = datosSucursal(c);
  if (v.error) return fallo(res, 400, v.error);
  const r = db.actualizarSucursal(idSucursal, ctx.organizacion.id, v.datos);
  if (!r.changes) return fallo(res, 404, 'Esa sucursal no existe');
  return responder(res, 200, { sucursal: db.sucursal(idSucursal, ctx.organizacion.id) });
});

const borrarSucursal = conSesion((req, res, ctx, idSucursal) => {
  if (!puedeAdministrar(ctx)) return fallo(res, 403, 'No tiene permiso para administrar sucursales');
  const r = db.desactivarSucursal(idSucursal, ctx.organizacion.id);
  if (!r.ok) {
    return fallo(res, r.motivo === 'principal' ? 409 : 404,
      r.motivo === 'principal'
        ? 'No se puede retirar la oficina principal. Marque otra como principal primero.'
        : 'Esa sucursal no existe');
  }
  return responder(res, 200, { sucursales: db.sucursalesDe(ctx.organizacion.id) });
});

const listarDealers = (req, res) => responder(res, 200, { dealers: db.dealersPublicos() });

function verDealer(req, res, ctx, slug) {
  const d = db.dealerPorSlug(slug);
  if (!d) return fallo(res, 404, 'Ese dealer no existe');
  return responder(res, 200, {
    dealer: { ...d, verificada: !!d.verificada },
    sucursales: db.sucursalesDe(d.id),
    anuncios: db.anunciosPublicos({ organizacion: d.id }),
  });
}

/* ── Rutas: planes y cobro ──────────────────────────────── */

const listarPlanes = (req, res) => responder(res, 200, {
  planes: db.planes(),
  itbis: precios.ITBIS,
  duraciones: precios.DURACIONES,
  cuposPorUnoGratis: precios.CUPOS_POR_UNO_GRATIS,
  cupoMaximo: precios.CUPO_MAXIMO,
});

/* Lo que cuesta un cupo de este nivel durante treinta días.
   `precio_vigente` ya trae aplicada la promoción que esté corriendo
   (ver conPrecioVigente en db.js). Nunca se toma `plan.precio` a
   secas: era la vía por la que la página anunciaba un nivel sin costo
   y el cobro salía por la tarifa completa. */
const precioUnitario = (plan) =>
  plan.precio_vigente != null ? plan.precio_vigente : plan.precio;

const esExenta = (idUsuario) => !!(db.organizacionDe(idUsuario) || {}).exenta_pago;

const SIN_COSTO = { subtotal: 0, itbis: 0, total: 0 };

const referenciaCobro = () =>
  `TE-${new Date().getFullYear()}-${db.id().slice(0, 6).toUpperCase()}`;

/* ── Rutas: membresías ──────────────────────────────────────
   Se compra capacidad y después se publica. Antes se publicaba y el
   cobro salía al final, con el plan pegado a ese anuncio para
   siempre: quien compraba cinco Destacados no podía mover a ellos un
   equipo que ya tenía publicado en Estándar. */

const misPlanes = conSesion((req, res, ctx) => {
  const lista = db.suscripcionesDe(ctx.organizacion.id);
  return responder(res, 200, {
    membresias: lista.map((s) => ({
      ...s,
      // Qué costaría el siguiente cupo, para poder decirlo en el panel
      // sin que haya que abrir el formulario. Cuando toca el gratis de
      // la regla, saberlo cambia la decisión.
      siguiente: s.anuncios_incluidos == null ? null : precios.siguienteCupo({
        precioUnitario: s.precio_unitario,
        cupoActual: s.anuncios_incluidos,
        dias: s.dias_ciclo || 30,
        diasRestantes: precios.diasRestantes(s.fin) ?? (s.dias_ciclo || 30),
      }),
    })),
    exenta: esExenta(ctx.usuario.id),
  });
});

const comprarMembresia = conSesion(async (req, res, ctx) => {
  const c = await leerCuerpo(req);
  const org = ctx.organizacion;

  const plan = db.planPorId(String(c.plan || ''));
  if (!plan || !plan.activo) return fallo(res, 400, 'Seleccione un nivel válido');

  const cupo = Math.min(Math.max(entero(c.cupo) || 1, 1), precios.CUPO_MAXIMO);
  const dias = Number(c.dias) === 60 ? 60 : 30;

  /* La exención se comprueba contra la BASE y no contra `ctx`, para
     que retirarla tenga efecto en la compra siguiente sin esperar a
     que caduque ninguna sesión. */
  const cobro = esExenta(ctx.usuario.id)
    ? { ...SIN_COSTO, referencia: referenciaCobro(), procesador: 'interna' }
    : {
      ...precios.precioCompra({ precioUnitario: precioUnitario(plan), cupo, dias }),
      referencia: referenciaCobro(),
      procesador: 'demo',
    };

  const membresia = db.comprarCupos({ idOrg: org.id, idPlan: plan.id, cupo, dias, cobro });

  if (cobro.total > 0) {
    correo.enviarComprobante({
      para: ctx.usuario.correo,
      nombre: ctx.usuario.nombre,
      plan: `${plan.nombre} · ${cupo} ${cupo === 1 ? 'cupo' : 'cupos'}`,
      subtotal: cobro.subtotal,
      itbis: cobro.itbis,
      total: cobro.total,
      referencia: cobro.referencia,
      fin: membresia.fin,
    });
  }

  return responder(res, 201, { membresia, cobro, sesion: sesionPublica(ctx.usuario.id) });
});

const ampliarMembresia = conSesion(async (req, res, ctx, idSusc) => {
  const c = await leerCuerpo(req);
  const org = ctx.organizacion;

  const s = db.suscripcion(idSusc, org.id);
  if (!s) return fallo(res, 404, 'Esa membresía no es suya o no existe');
  if (s.anuncios_incluidos == null) {
    return fallo(res, 400, 'Esa membresía ya no tiene límite de equipos');
  }

  const cupoNuevo = Math.min(Math.max(entero(c.cupo) || 0, 1), precios.CUPO_MAXIMO);
  if (cupoNuevo <= s.anuncios_incluidos) {
    return fallo(res, 400, 'Indique una cantidad mayor a la que ya tiene');
  }

  const dias = s.dias_ciclo || 30;
  const cobro = esExenta(ctx.usuario.id)
    ? { ...SIN_COSTO, referencia: referenciaCobro(), procesador: 'interna' }
    : {
      ...precios.precioAmpliacion({
        precioUnitario: s.precio_unitario,
        cupoActual: s.anuncios_incluidos,
        cupoNuevo,
        dias,
        diasRestantes: precios.diasRestantes(s.fin) ?? dias,
      }),
      referencia: referenciaCobro(),
      procesador: 'demo',
    };

  const membresia = db.ampliarCupos({ idSusc, idOrg: org.id, cupoNuevo, cobro });
  return responder(res, 200, { membresia, cobro });
});

/* Mover un equipo de una membresía a otra: lo que el anunciante
   entiende como "pasar este camión a Destacado". */
const cambiarPlanDeAnuncio = conSesion(async (req, res, ctx, idAnuncio) => {
  const c = await leerCuerpo(req);
  const org = ctx.organizacion;

  const a = db.anuncio(idAnuncio);
  if (!a || a.organizacion_id !== org.id) {
    return fallo(res, 404, 'Ese anuncio no es suyo o no existe');
  }

  const destino = db.suscripcion(String(c.membresia || ''), org.id);
  if (!destino) return fallo(res, 404, 'Esa membresía no es suya o no existe');

  if (destino.id === a.suscripcion_id) {
    return responder(res, 200, { anuncio: a, sinCambio: true });
  }

  // El cupo tiene que estar libre. Cuenta solo lo que ocupa sitio, así
  // que un equipo vendido no bloquea el suyo.
  if (destino.libres !== null && destino.libres < 1) {
    return fallo(res, 409, `Su membresía ${destino.plan_nombre} no tiene cupos libres. Amplíela o libere uno marcando un equipo como vendido.`);
  }

  // Bajar de nivel puede dejar fuera fotografías ya publicadas. Se
  // dice antes y no se recorta nada por sorpresa.
  const fotos = (a.fotos || []).length;
  if (fotos > destino.fotos_maximas) {
    return fallo(res, 409, `Este anuncio tiene ${fotos} fotografías y ${destino.plan_nombre} admite ${destino.fotos_maximas}. Quite ${fotos - destino.fotos_maximas} antes de moverlo.`);
  }

  const movido = db.moverAnuncioDeSuscripcion({ idAnuncio, idOrg: org.id, idSusc: destino.id });
  return responder(res, 200, { anuncio: movido, membresia: db.suscripcion(destino.id, org.id) });
});

/* ── Rutas: anuncios ────────────────────────────────────── */

/* La taxonomía es la MISMA que carga el navegador. Antes había aquí
   una lista de ocho categorías escrita a mano que ya no coincidía con
   la de assets/data.js: el servidor aceptaba unas y la pantalla
   ofrecía otras. */
const taxonomia = require('../assets/taxonomia.js');

/* Publicar: valida el equipo y lo pone en un cupo ya comprado.
   Aquí NO se cobra. La capacidad se compra antes, en
   POST /api/membresias, y publicar solo la ocupa. Esa separación es
   la que permite mover después un equipo de un nivel a otro: el cupo
   es de la organización, no del anuncio. */
const publicar = conSesion(async (req, res, ctx) => {
  const c = await leerCuerpo(req);
  const org = ctx.organizacion;

  /* Qué membresía sostiene este anuncio. Si el anunciante eligió una
     se respeta; si no, la de nivel más alto con sitio libre, que es la
     que más hace por el equipo. */
  const exenta = esExenta(ctx.usuario.id);
  const membresia = exenta
    ? db.membresiaInterna(org.id)
    : (c.membresia
      ? db.suscripcion(String(c.membresia), org.id)
      : db.suscripcionConHueco(org.id));

  /* Sin sitio donde publicar. Se distingue no tener nada contratado de
     tenerlo lleno: son dos situaciones distintas y la salida de cada
     una también. Decirle "contrate un plan" a quien ya pagó cinco
     cupos y los tiene ocupados es mandarlo a comprar de nuevo cuando
     lo que necesita es ampliar o liberar uno. */
  if (!membresia) {
    const tiene = db.suscripcionesDe(org.id).length;
    return fallo(res, 402, tiene
      ? 'Sus cupos están ocupados. Añada cupos desde su panel —solo paga los días que le queden— o libere uno marcando un equipo como vendido.'
      : 'Todavía no tiene cupos. Contrate un plan para publicar este equipo.');
  }
  if (membresia.libres !== null && membresia.libres < 1) {
    return fallo(res, 409, `Su membresía ${membresia.plan_nombre} no tiene cupos libres. Amplíela o libere uno marcando un equipo como vendido.`);
  }

  const plan = db.planPorId(membresia.plan_id);
  if (!plan) return fallo(res, 400, 'La membresía apunta a un nivel que ya no existe');

  /* La cadena completa: categoría → subcategoría → marca. Se valida
     aquí y no solo en la pantalla porque el navegador puede mandar
     cualquier cosa, y una jerarquía que solo se respeta en el
     formulario no impide nada. */
  const errorCadena = taxonomia.validarCadena({
    categoria: String(c.categoria || ''),
    subcategoria: String(c.subcategoria || ''),
    marca: String(c.marca || ''),
  });
  if (errorCadena) return fallo(res, 400, errorCadena);

  if (!texto(c.modelo, 60)) return fallo(res, 400, 'Indique el modelo');

  const anio = entero(c.anio);
  const limite = new Date().getFullYear() + 1;
  if (!anio || anio < 1970 || anio > limite) return fallo(res, 400, `Año entre 1970 y ${limite}`);

  const modalidadPrecio = c.modalidadPrecio === 'ofertas' ? 'ofertas' : 'fijo';
  const precio = entero(c.precio);
  if (!precio || precio <= 0) return fallo(res, 400, 'Indique el precio solicitado');

  /* Tren motriz: solo se acepta en las subcategorías que lo piden, y
     solo de las listas. Guardarlo en una excavadora ensuciaría la
     ficha con campos que no significan nada ahí. */
  let tren = {};
  if (taxonomia.pideTrenMotriz(String(c.subcategoria))) {
    const motor = taxonomia.MOTORES[String(c.motorMarca || '')];
    const trans = taxonomia.TRANSMISIONES[String(c.transmisionMarca || '')];

    if (c.motorMarca && !motor) return fallo(res, 400, 'Marca de motor no reconocida');
    if (c.transmisionMarca && !trans) return fallo(res, 400, 'Marca de transmisión no reconocida');

    // El modelo es opcional, pero si viene tiene que ser de esa marca.
    if (c.motorModelo && motor && motor.modelos.length && !motor.modelos.includes(String(c.motorModelo))) {
      return fallo(res, 400, 'Ese modelo de motor no es de esa marca');
    }
    if (c.transmisionModelo && trans && trans.modelos.length
      && !trans.modelos.includes(String(c.transmisionModelo))) {
      return fallo(res, 400, 'Ese modelo de transmisión no es de esa marca');
    }

    tren = {
      motorMarca: motor ? String(c.motorMarca) : null,
      motorModelo: texto(c.motorModelo, 60),
      transmisionMarca: trans ? String(c.transmisionMarca) : null,
      transmisionModelo: texto(c.transmisionModelo, 60),
    };
  }

  const fotos = Array.isArray(c.fotos) ? c.fotos.slice(0, plan.fotos_maximas) : [];
  if (fotos.length < 3) return fallo(res, 400, 'Cargue al menos 3 fotografías');

  const telefonos = (Array.isArray(c.telefonos) ? c.telefonos : [])
    .filter((t) => String(t.numero || '').replace(/\D/g, '').length === 10)
    .slice(0, 5);
  if (!telefonos.length) return fallo(res, 400, 'Registre al menos un teléfono de 10 dígitos');

  // El anuncio se ancla a una sucursal. Si se pide una concreta se
  // comprueba que sea de esta organización; si no, va a la principal.
  const sucursal = (c.sucursal && db.sucursal(String(c.sucursal), org.id))
    || db.sucursalPrincipal(org.id);

  const idAnuncio = db.crearAnuncio({
    idOrg: org.id,
    idSucursal: sucursal && sucursal.id,
    idUsuario: ctx.usuario.id,
    idSuscripcion: membresia.id,
    categoria: String(c.categoria),
    subcategoria: texto(c.subcategoria, 80),
    marca: texto(c.marca, 60),
    modelo: texto(c.modelo, 60),
    anio,
    condicion: texto(c.condicion, 40),
    usoValor: entero(c.usoValor),
    usoUnidad: c.usoUnidad === 'km' ? 'km' : 'h',
    serie: texto(c.serie, 60),
    potencia: texto(c.potencia, 40),
    peso: texto(c.peso, 40),
    implementos: texto(c.implementos, 500),
    descripcion: texto(c.descripcion, 4000),
    provincia: texto(c.provincia, 60),
    municipio: texto(c.municipio, 60),
    precio,
    moneda: c.moneda === 'USD' ? 'USD' : 'DOP',
    modalidadPrecio,
    precioMinimo: entero(c.precioMinimo),
    itbisIncluido: !!c.itbisIncluido,
    permuta: !!c.permuta,
    financiamiento: !!c.financiamiento,
    video: texto(c.video, 300),
    ...tren,
    /* Las dos fechas salen de la membresía, no de lo que pida el
       navegador. El anuncio se publica mientras el cupo esté pagado;
       si la membresía no tiene fin —una cuenta interna— el anuncio
       tampoco caduca. Al mover el equipo a otra membresía se
       recalculan las dos en db.moverAnuncioDeSuscripcion. */
    vence: membresia.fin,
    destacadoHasta: plan.destacado ? membresia.fin : null,
    fotos,
    telefonos: telefonos.map((t) => ({ numero: t.numero, tipo: t.tipo, nota: t.nota })),
  });

  /* Confirmación al anunciante. Va después de responder
     conceptualmente —el anuncio ya existe— y no puede fallar de forma
     que afecte a la publicación: `enviar` nunca lanza.

     El comprobante ya no sale aquí: se emitió al comprar el cupo.
     Publicar no cobra nada. */
  const publicado = db.anuncio(idAnuncio);
  correo.enviarAnuncioPublicado({
    para: ctx.usuario.correo,
    nombre: ctx.usuario.nombre,
    equipo: `${publicado.anio} ${publicado.marca} ${publicado.modelo}`,
    idAnuncio,
    vence: publicado.vence,
    plan: plan.nombre,
  });

  return responder(res, 201, {
    anuncio: publicado,
    membresia: db.suscripcion(membresia.id, org.id),
    sesion: sesionPublica(ctx.usuario.id),
  });
});

const misAnuncios = conSesion((req, res, ctx) => {
  db.caducarAnuncios();
  return responder(res, 200, {
    anuncios: db.anunciosDeOrganizacion(ctx.organizacion.id),
    resumen: db.resumenOrganizacion(ctx.organizacion.id),
    // En plural: una cuenta puede tener varias membresías vivas, y
    // enseñar solo una era lo que dejaba cupos pagados fuera de la
    // vista del anunciante.
    membresias: db.suscripcionesDe(ctx.organizacion.id),
    exenta: esExenta(ctx.usuario.id),
  });
});

const cambiarEstado = conSesion(async (req, res, ctx, idAnuncio) => {
  const c = await leerCuerpo(req);
  const permitidos = ['activo', 'pausado', 'vendido', 'retirado'];
  if (!permitidos.includes(c.estado)) return fallo(res, 400, 'Estado inválido');

  const r = db.cambiarEstadoAnuncio(idAnuncio, ctx.organizacion.id, c.estado);
  if (!r.changes) return fallo(res, 404, 'Ese anuncio no es suyo o no existe');
  return responder(res, 200, { ok: true, estado: c.estado });
});

/* Eliminar un anuncio propio. Libera su cupo, que vuelve a estar
   disponible sin pagar de nuevo. */
const eliminarAnuncio = conSesion((req, res, ctx, idAnuncio) => {
  const rutas = db.borrarAnuncio(idAnuncio, ctx.organizacion.id);
  if (rutas === null) return fallo(res, 404, 'Ese anuncio no es suyo o no existe');

  /* Los archivos se borran DESPUÉS de que la fila se haya ido. Si se
     hiciera antes y la transacción fallara, el anuncio se quedaría
     publicado apuntando a fotos que ya no están. `borrar` no lanza si
     el archivo falta. */
  rutas.forEach((r) => { try { fotos.borrar(r); } catch (_) { /* ya no estaba */ } });

  return responder(res, 200, {
    ok: true,
    membresias: db.suscripcionesDe(ctx.organizacion.id),
  });
});

/* Motor y transmisión de un anuncio ya publicado.

   Existe porque el asistente los preguntaba y no los mandaba: hay
   anuncios de camión publicados con el hueco en blanco. Obligar a
   republicarlos costaría sus visitas y su antigüedad por un fallo que
   no cometió el anunciante.

   Se valida igual que al publicar y contra las mismas listas: en un
   equipo que no lleva tren motriz no se acepta, y una marca inventada
   tampoco. */
const editarTrenMotriz = conSesion(async (req, res, ctx, idAnuncio) => {
  const c = await leerCuerpo(req);
  const a = db.anuncio(idAnuncio);
  if (!a || a.organizacion_id !== ctx.organizacion.id) {
    return fallo(res, 404, 'Ese anuncio no es suyo o no existe');
  }
  if (!taxonomia.pideTrenMotriz(String(a.subcategoria))) {
    return fallo(res, 400, 'Este tipo de equipo no lleva motor ni transmisión declarados');
  }

  const motor = taxonomia.MOTORES[String(c.motorMarca || '')];
  const trans = taxonomia.TRANSMISIONES[String(c.transmisionMarca || '')];
  if (c.motorMarca && !motor) return fallo(res, 400, 'Marca de motor no reconocida');
  if (c.transmisionMarca && !trans) return fallo(res, 400, 'Marca de transmisión no reconocida');

  if (c.motorModelo && motor && motor.modelos.length && !motor.modelos.includes(String(c.motorModelo))) {
    return fallo(res, 400, 'Ese modelo de motor no es de esa marca');
  }
  if (c.transmisionModelo && trans && trans.modelos.length
    && !trans.modelos.includes(String(c.transmisionModelo))) {
    return fallo(res, 400, 'Ese modelo de transmisión no es de esa marca');
  }

  db.guardarTrenMotriz(idAnuncio, ctx.organizacion.id, {
    motorMarca: motor ? String(c.motorMarca) : null,
    motorModelo: motor ? texto(c.motorModelo, 60) : null,
    transmisionMarca: trans ? String(c.transmisionMarca) : null,
    transmisionModelo: trans ? texto(c.transmisionModelo, 60) : null,
  });

  return responder(res, 200, { anuncio: db.anuncio(idAnuncio) });
});

/* Catálogo. Busca, filtra, ordena y pagina en el servidor: el
   navegador ya no recibe el inventario entero para cribarlo, que era
   lo que iba a romperse al llegar a los miles de anuncios. */
function catalogo(req, res, ctx, consulta) {
  db.caducarAnuncios();
  const q = consulta || new URLSearchParams();
  const v = (clave) => q.get(clave) || undefined;

  const resultado = db.buscarAnuncios({
    q: texto(v('q'), 80),
    categoria: v('categoria'),
    subcategoria: v('subcategoria'),
    marca: v('marca'),
    provincia: v('provincia'),
    condicion: v('condicion'),
    precioMin: v('precioMin'),
    precioMax: v('precioMax'),
    anioMin: v('anioMin'),
    anioMax: v('anioMax'),
    horasMax: v('horasMax'),
    soloDestacados: v('destacados') === '1',
    orden: v('orden'),
    pagina: v('pagina'),
    porPagina: v('porPagina'),
  });

  return responder(res, 200, resultado);
}

/* Cifras públicas de la portada. Salen de la base en cada petición:
   ninguna cuenta del sitio está escrita a mano. */
const estadisticas = (req, res) => {
  db.caducarAnuncios();
  return responder(res, 200, db.estadisticas());
};

function verAnuncio(req, res, ctx, idAnuncio) {
  const a = db.anuncio(idAnuncio);
  if (!a) return fallo(res, 404, 'Ese anuncio no existe');
  return responder(res, 200, { anuncio: a });
}

/* Registro de una interacción. Va sin sesión a propósito: lo llama
   cualquier visitante del catálogo. */
async function evento(req, res, ctx) {
  const c = await leerCuerpo(req);
  const ip = req.socket.remoteAddress || '';
  const agente = req.headers['user-agent'] || '';
  const tipo = String(c.tipo || '');
  const idAnuncio = String(c.anuncio || '');
  const ok = db.anotarEvento(idAnuncio, tipo, db.huella(ip, agente));

  /* Un contacto es la señal de que el anuncio funciona, y la razón
     principal por la que alguien renueva. `anotarEvento` devuelve
     false cuando ya se contó a ese visitante hoy, así que esto no
     manda un correo por cada pulsación: uno por persona y día.

     Las vistas no avisan; serían decenas de correos diarios. */
  if (ok && (tipo === 'telefono' || tipo === 'whatsapp')) {
    const dueno = db.duenoDeAnuncio(idAnuncio);
    if (dueno) {
      correo.enviarContactoRecibido({
        para: dueno.correo,
        nombre: dueno.nombre,
        equipo: `${dueno.anio} ${dueno.marca} ${dueno.modelo}`,
        idAnuncio,
        via: tipo,
      });
    }
  }

  return responder(res, ok ? 202 : 400, { ok });
}

/* ── Enrutador ──────────────────────────────────────────── */

const RUTAS = [
  ['POST', /^\/api\/cuenta\/registro$/,     registro],
  ['POST', /^\/api\/cuenta\/entrar$/,       entrar],
  ['POST', /^\/api\/cuenta\/verificar$/,    verificar],
  ['POST', /^\/api\/cuenta\/reenviar$/,     reenviar],
  ['POST', /^\/api\/cuenta\/recuperar$/,    recuperar],
  ['POST', /^\/api\/cuenta\/restablecer$/,  restablecer],
  ['POST', /^\/api\/cuenta\/salir$/,        salir],
  ['GET',  /^\/api\/sesion$/,               verSesion],
  ['POST', /^\/api\/dealer\/registro$/,     registrarDealer],
  ['GET',  /^\/api\/sucursales$/,           listarSucursales],
  ['POST', /^\/api\/sucursales$/,           crearSucursal],
  ['PATCH', /^\/api\/sucursales\/([\w-]+)$/, editarSucursal],
  ['DELETE', /^\/api\/sucursales\/([\w-]+)$/, borrarSucursal],
  ['GET',  /^\/api\/dealers$/,           listarDealers],
  ['GET',  /^\/api\/dealers\/([\w-]+)$/, verDealer],
  ['GET',  /^\/api\/planes$/,            listarPlanes],
  ['GET',  /^\/api\/estadisticas$/,      estadisticas],
  ['POST', /^\/api\/anuncios$/,          publicar],
  ['GET',  /^\/api\/anuncios$/,          catalogo],
  ['GET',  /^\/api\/mis-anuncios$/,      misAnuncios],
  ['GET',  /^\/api\/anuncios\/([\w-]+)$/, verAnuncio],
  ['PATCH', /^\/api\/anuncios\/([\w-]+)\/plan$/, cambiarPlanDeAnuncio],
  ['PATCH', /^\/api\/anuncios\/([\w-]+)\/tren-motriz$/, editarTrenMotriz],
  ['PATCH', /^\/api\/anuncios\/([\w-]+)$/, cambiarEstado],
  ['DELETE', /^\/api\/anuncios\/([\w-]+)$/, eliminarAnuncio],

  // Capacidad: se compra antes de publicar y se amplía prorrateada.
  ['GET',  /^\/api\/membresias$/,                    misPlanes],
  ['POST', /^\/api\/membresias$/,                    comprarMembresia],
  ['POST', /^\/api\/membresias\/([\w-]+)\/ampliar$/, ampliarMembresia],
  ['POST', /^\/api\/eventos$/,           evento],
  ['POST', /^\/api\/fotos$/,             subirFoto],

  // Flota propia de alquiler y transporte. La lectura es pública;
  // todo lo que la modifica exige sesión con es_admin.
  ['GET',  /^\/api\/taxonomia$/,                        verTaxonomia],

  // Portada: fotografía del héroe y fotos por categoría.
  ['GET',   /^\/api\/portada$/,                         verPortada],
  ['PATCH', /^\/api\/admin\/portada$/,                  editarPortada],

  // Publicidad. La lectura y el clic son públicos; la gestión, no.
  ['GET',  /^\/api\/publicidad$/,                       listarPublicidad],
  ['GET',  /^\/api\/publicidad\/([\w-]+)\/ir$/,         clicPublicidad],
  ['GET',  /^\/api\/admin\/publicidad$/,                listarPublicidadAdmin],
  ['POST', /^\/api\/admin\/publicidad$/,                crearPublicidad],
  ['PATCH', /^\/api\/admin\/publicidad\/([\w-]+)$/,     editarPublicidad],
  ['DELETE', /^\/api\/admin\/publicidad\/([\w-]+)$/,    eliminarPublicidad],
  ['GET',  /^\/api\/flota\/(\w+)$/,                     listarFlota],
  ['GET',  /^\/api\/admin\/flota\/(\w+)$/,              listarFlotaAdmin],
  ['POST', /^\/api\/admin\/flota\/(\w+)$/,              crearFlota],
  ['PATCH', /^\/api\/admin\/flota\/item\/([\w-]+)$/,    editarFlota],
  ['DELETE', /^\/api\/admin\/flota\/item\/([\w-]+)$/,   eliminarFlota],

  // Revisión de solicitudes. Todas exigen sesión con es_admin.
  ['GET',  /^\/api\/admin\/solicitudes$/,               listarSolicitudes],
  ['GET',  /^\/api\/admin\/solicitudes\/([\w-]+)$/,     verSolicitud],
  ['POST', /^\/api\/admin\/solicitudes\/([\w-]+)$/,     resolverSolicitud],
];

async function manejar(req, res, ruta) {
  // Los parámetros de consulta llegan al manejador después de lo que
  // capture su patrón, así que una ruta sin capturas los recibe en el
  // cuarto argumento y una con una captura, en el quinto.
  let consulta;
  try {
    consulta = new URL(req.url, 'http://localhost').searchParams;
  } catch {
    consulta = new URLSearchParams();
  }

  for (const [metodo, patron, manejador] of RUTAS) {
    if (req.method !== metodo) continue;
    const m = patron.exec(ruta);
    if (!m) continue;
    try {
      return await manejador(req, res, contexto(req), ...m.slice(1), consulta);
    } catch (e) {
      const codigo = e.codigo || 500;
      if (codigo >= 500) console.error('API', ruta, e);
      return fallo(res, codigo, codigo >= 500 ? 'Error del servidor' : e.message);
    }
  }
  return fallo(res, 404, 'Ruta inexistente');
}

module.exports = { manejar, ITBIS };
