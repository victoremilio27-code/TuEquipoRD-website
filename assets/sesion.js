/* ═══════════════════════════════════════════════════════════
   TuEquipoRD · Cliente de la API y estado de sesión
   Se carga antes que app.js en todas las páginas. Deja dos cosas
   globales: `api()` para hablar con el servidor y `SESION` con quién
   ha iniciado sesión.

   Todo el sitio sigue funcionando si la API no responde: `api()`
   devuelve null en vez de reventar, y cada pantalla decide qué
   enseñar cuando no hay datos.
   ═══════════════════════════════════════════════════════════ */

/* Estado de sesión. `cargando` distingue "todavía no sé" de "no hay
   nadie": sin eso, la cabecera parpadea mostrando «Entrar» a alguien
   que sí tiene la sesión abierta. */
let SESION = {
  cargando: true, usuario: null, organizacion: null, suscripcion: null,
  sucursales: [], verificado: false,
};

/* Envoltura de fetch contra /api.
   · Lanza un Error con `.codigo` y el mensaje del servidor en 4xx.
   · Devuelve null si el servidor no está: quien llama decide.
   `credentials: same-origin` manda la cookie de sesión. */
async function api(ruta, { metodo = 'GET', cuerpo, silencioso = false } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch (_) {
    return null;              // servidor apagado o sin red
  }

  let datos = null;
  try { datos = await respuesta.json(); } catch (_) { datos = null; }

  if (!respuesta.ok) {
    if (silencioso) return null;
    const err = new Error((datos && datos.error) || 'No se pudo completar la operación');
    err.codigo = respuesta.status;
    throw err;
  }
  return datos;
}

async function cargarSesion() {
  const datos = await api('/sesion', { silencioso: true });
  SESION = {
    cargando: false,
    usuario: (datos && datos.usuario) || null,
    organizacion: (datos && datos.organizacion) || null,
    suscripcion: (datos && datos.suscripcion) || null,
    // Las sucursales viajan con la sesión porque el asistente de
    // publicación las necesita para preguntar desde cuál se ofrece
    // el equipo, sin una segunda llamada.
    sucursales: (datos && datos.sucursales) || [],
    verificado: !!(datos && datos.verificado),
  };
  return SESION;
}

const haySesion = () => !!(SESION.usuario);
const esDealer = () => !!(SESION.organizacion && SESION.organizacion.tipo === 'dealer');

/* Enlace de cuenta en la cabecera. Se inyecta por script en vez de
   escribirlo en las doce páginas: así el estado de sesión se pinta en
   un solo sitio y no hay doce copias que se desincronicen. */
function montarEnlaceCuenta() {
  const nav = document.querySelector('.cab__nav');
  if (!nav || nav.querySelector('.cab__cuenta')) return;

  const enlace = document.createElement('a');
  enlace.className = 'cab__cuenta';
  enlace.href = 'cuenta.html';
  enlace.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-usuario"/></svg><span>Entrar</span>';
  nav.insertBefore(enlace, nav.querySelector('.cab__nav-cta'));

  cargarSesion().then(() => {
    if (!haySesion()) return;
    const nombre = SESION.organizacion ? SESION.organizacion.nombre : SESION.usuario.nombre;
    enlace.href = 'panel.html';
    enlace.classList.add('cab__cuenta--activa');
    enlace.querySelector('span').textContent = nombre.split(/[\s,]+/)[0];
    enlace.title = `Panel de ${nombre}`;
  });
}

document.addEventListener('DOMContentLoaded', montarEnlaceCuenta);
