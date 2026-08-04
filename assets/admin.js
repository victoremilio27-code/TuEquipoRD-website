/* ═══════════════════════════════════════════════════════════
   TuEquipoRD · Revisión de solicitudes de dealer

   Pantalla interna. Quien no tenga el permiso recibe 404 de la API y
   aquí ve lo mismo: la página no revela que exista una cola de
   revisión detrás.

   El expediente completo —con el RNC— no se pide al cargar la lista,
   sino al desplegar una solicitud concreta. Así el número reservado
   solo viaja cuando alguien va a cotejarlo de verdad.
   ═══════════════════════════════════════════════════════════ */

let ESTADO = 'pendiente';
let ABIERTA = null;   // id de la solicitud desplegada

const ROTULO = {
  pendiente: { vacio: 'No hay solicitudes pendientes. Todo revisado.', clase: '' },
  aprobada: { vacio: 'Todavía no ha aprobado ninguna solicitud.', clase: 'sol--aprobada' },
  rechazada: { vacio: 'No hay solicitudes rechazadas.', clase: 'sol--rechazada' },
};

function avisar(mensaje, bien = false) {
  const aviso = $('#avisoAdmin');
  aviso.hidden = !mensaje;
  aviso.className = `acceso__aviso${bien ? ' acceso__aviso--bien' : ''}`;
  aviso.textContent = mensaje || '';
}

const cuando = (iso) => (iso ? new Date(iso).toLocaleDateString('es-DO', {
  day: 'numeric', month: 'short', year: 'numeric',
}) : '—');

/* ── Pintado ────────────────────────────────────────────── */

function solicitudHTML(s) {
  const detalle = ABIERTA === s.id;
  const pendiente = s.estado === 'pendiente';

  return `<li class="sol ${ROTULO[s.estado].clase}" data-id="${esc(s.id)}">
    <div class="sol__cabeza">
      <b class="sol__nombre">${esc(s.razon_social)}</b>
      ${s.nombre_comercial ? `<span class="sol__meta">opera como ${esc(s.nombre_comercial)}</span>` : ''}
      <span class="sol__fecha">${cuando(s.creada)}</span>
    </div>
    <p class="sol__meta">
      ${esc(s.encargado)}${s.cargo ? ` · ${esc(s.cargo)}` : ''} · ${esc(s.correo_solicitante)}
    </p>
    <p class="sol__meta">
      ${s.equipos_inventario != null ? `${miles(s.equipos_inventario)} en inventario` : 'Inventario sin indicar'}
      · ${s.equipos_publicar != null ? `${miles(s.equipos_publicar)} a publicar` : 'sin indicar cuántos publicará'}
    </p>
    ${s.estado === 'rechazada' && s.motivo ? `<p class="sol__meta"><b>Motivo:</b> ${esc(s.motivo)}</p>` : ''}

    <div class="sol__acciones">
      <button type="button" class="btn btn--linea btn--chico" data-accion="ver">
        ${detalle ? 'Ocultar' : 'Ver expediente'}
      </button>
      ${pendiente ? `
        <button type="button" class="btn btn--ambar btn--chico" data-accion="aprobar">Aprobar</button>
        <button type="button" class="btn btn--linea btn--chico" data-accion="rechazar">Rechazar</button>` : ''}
    </div>

    <div class="sol__detalle" id="detalle-${esc(s.id)}" ${detalle ? '' : 'hidden'}></div>
  </li>`;
}

function pintar(solicitudes) {
  const lista = $('#listaSolicitudes');
  const vacio = $('#colaVacia');

  lista.innerHTML = solicitudes.map(solicitudHTML).join('');
  vacio.hidden = solicitudes.length > 0;
  vacio.textContent = ROTULO[ESTADO].vacio;
}

/* Expediente. Es la única vista con el RNC entero, y por eso lleva su
   propio recordatorio: quien lo está viendo debe saber que ese dato no
   sale de aquí. */
function detalleHTML(s) {
  const dato = (rotulo, valor, clase = '') =>
    (valor == null || valor === '' ? '' : `<div><dt>${esc(rotulo)}</dt><dd class="${clase}">${esc(valor)}</dd></div>`);

  const ubicacion = [s.direccion, s.municipio, s.provincia].filter(Boolean).join(', ');

  return `
    <dl class="sol__datos">
      ${dato('Razón social', s.razon_social)}
      ${dato('Nombre comercial', s.nombre_comercial)}
      ${dato('RNC', s.rnc, 'num')}
      ${dato('Años operando', s.anios_operando, 'num')}
      ${dato('Dirección', ubicacion)}
      ${dato('Teléfono', s.telefono, 'num')}
      ${dato('Web', s.web)}
      ${dato('Encargado', s.encargado)}
      ${dato('Cargo', s.cargo)}
      ${dato('Abrió la cuenta', s.solicitante)}
      ${dato('Correo', s.correo_solicitante)}
      ${dato('Equipos en inventario', s.equipos_inventario, 'num')}
      ${dato('Equipos a publicar', s.equipos_publicar, 'num')}
      ${dato('Tipos de equipo', s.tipos_equipo)}
      ${dato('Cómo nos conoció', s.origen)}
      ${dato('Comentario', s.comentario)}
      ${dato('Revisada', s.revisada ? `${cuando(s.revisada)}${s.revisor ? ` por ${s.revisor}` : ''}` : null)}
    </dl>
    <p class="sol__reservado">
      El RNC es un dato reservado. Sirve para comprobar la empresa contra el registro
      mercantil y no debe copiarse a ningún mensaje, ficha ni página pública.
    </p>`;
}

/* ── Acciones ───────────────────────────────────────────── */

async function cargar() {
  avisar('');
  let datos;
  try {
    // Sin `silencioso`: aquí un error sí debe verse. La sesión pudo
    // caducar mientras la pestaña estaba abierta.
    datos = await api(`/admin/solicitudes?estado=${ESTADO}`);
  } catch (e) {
    return avisar(e.message);
  }
  if (!datos) return avisar('No hay conexión con el servidor.');

  const n = datos.pendientes;
  $('#adminSub').textContent = n === 0
    ? 'No queda ninguna solicitud por revisar.'
    : `${n} ${n === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de revisión.`;

  pintar(datos.solicitudes || []);
}

async function alternarDetalle(id, caja, boton) {
  if (ABIERTA === id) {
    ABIERTA = null;
    caja.hidden = true;
    boton.textContent = 'Ver expediente';
    return;
  }

  try {
    const datos = await api(`/admin/solicitudes/${encodeURIComponent(id)}`);
    if (!datos) throw new Error('No hay conexión con el servidor.');
    ABIERTA = id;
    caja.innerHTML = detalleHTML(datos.solicitud);
    caja.hidden = false;
    boton.textContent = 'Ocultar';
  } catch (e) {
    avisar(e.message);
  }
}

/* Rechazar exige un motivo escrito: es lo que se le manda a la empresa
   por correo, y sin él la negativa genera una respuesta preguntando
   qué pasó que hay que contestar igual. */
function pedirMotivo(fila, alConfirmar) {
  if (fila.querySelector('.sol__motivo')) return;

  const caja = document.createElement('div');
  caja.className = 'sol__motivo';
  caja.innerHTML = `
    <textarea placeholder="Por qué no se aprueba. Se le envía a la empresa tal cual." aria-label="Motivo del rechazo"></textarea>
    <div class="sol__acciones">
      <button type="button" class="btn btn--ambar btn--chico" data-accion="confirmar-rechazo">Confirmar rechazo</button>
      <button type="button" class="btn btn--linea btn--chico" data-accion="cancelar-rechazo">Cancelar</button>
    </div>`;
  fila.appendChild(caja);
  caja.querySelector('textarea').focus();

  caja.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.accion === 'cancelar-rechazo') return caja.remove();

    const motivo = caja.querySelector('textarea').value.trim();
    if (!motivo) return avisar('Escriba el motivo del rechazo.');
    alConfirmar(motivo);
  });
}

async function resolver(id, decision, motivo) {
  try {
    const datos = await api(`/admin/solicitudes/${encodeURIComponent(id)}`, {
      metodo: 'POST',
      cuerpo: { decision, motivo },
    });
    if (!datos) throw new Error('No hay conexión con el servidor.');

    ABIERTA = null;
    // Recargar primero: `cargar` limpia el aviso al empezar, y hacerlo
    // al revés borraba la confirmación en cuanto se pintaba.
    await cargar();
    avisar(decision === 'aprobar'
      ? `${datos.solicitud.razon_social} quedó aprobada. Le avisamos por correo.`
      : `${datos.solicitud.razon_social} quedó rechazada. Le enviamos el motivo por correo.`, true);
  } catch (e) {
    avisar(e.message);
  }
}

/* ═══ Flota propia ═══════════════════════════════════════
   Los equipos de alquiler y las camas de transporte. Estaban escritos
   a mano en assets/data.js, así que quitar una excavadora del alquiler
   obligaba a editar código y volver a desplegar.

   Se desactiva en vez de borrarse: una cama retirada del servicio
   suele volver, y borrarla perdería el histórico de cotizaciones que
   la mencionan. El botón de eliminar existe para lo creado por error.
   ═══════════════════════════════════════════════════════ */

let SERVICIO = 'alquiler';

function avisarFlota(mensaje, bien = false) {
  const aviso = $('#avisoFlota');
  aviso.hidden = !mensaje;
  aviso.className = `acceso__aviso${bien ? ' acceso__aviso--bien' : ''}`;
  aviso.textContent = mensaje || '';
}

function flotaHTML(f) {
  const medida = SERVICIO === 'transporte'
    ? `hasta ${Number(f.capacidad) || '—'} t`
    : `por ${esc(f.unidad || 'día')}`;

  return `<li class="sol${f.activo ? '' : ' sol--rechazada'}" data-id="${esc(f.id)}">
    <div class="sol__cabeza">
      <b class="sol__nombre">${esc(f.nombre)}</b>
      <span class="sol__meta">${medida}</span>
      ${f.activo ? '' : '<span class="pastilla pastilla--roja">Fuera de servicio</span>'}
    </div>
    ${f.detalle ? `<p class="sol__meta">${esc(f.detalle)}</p>` : ''}
    <div class="sol__acciones">
      <button type="button" class="btn btn--linea btn--chico" data-flota="alternar">
        ${f.activo ? 'Retirar del servicio' : 'Volver a poner'}
      </button>
      <button type="button" class="btn btn--linea btn--chico" data-flota="subir">Subir</button>
      <button type="button" class="btn btn--linea btn--chico" data-flota="borrar">Eliminar</button>
    </div>
  </li>`;
}

async function cargarFlota() {
  avisarFlota('');
  try {
    const datos = await api(`/admin/flota/${SERVICIO}`);
    if (!datos) return avisarFlota('No hay conexión con el servidor.');
    $('#listaFlota').innerHTML = datos.flota.length
      ? datos.flota.map(flotaHTML).join('')
      : '<li class="revision__vacio">No hay nada en esta flota todavía.</li>';
  } catch (e) {
    avisarFlota(e.message);
  }
}

/* Sube un puesto intercambiando el orden con el de arriba. Mover con
   dos botones es más fiable que arrastrar, sobre todo desde el móvil,
   que es donde se administra esto la mitad de las veces. */
async function subirEnFlota(id) {
  const filas = [...document.querySelectorAll('#listaFlota .sol')];
  const i = filas.findIndex((f) => f.dataset.id === id);
  if (i <= 0) return;

  const anterior = filas[i - 1].dataset.id;
  await api(`/admin/flota/item/${encodeURIComponent(id)}`, { metodo: 'PATCH', cuerpo: { orden: i - 1 } });
  await api(`/admin/flota/item/${encodeURIComponent(anterior)}`, { metodo: 'PATCH', cuerpo: { orden: i } });
  await cargarFlota();
}

function montarFlota() {
  if (!document.getElementById('listaFlota')) return;

  // Alquiler pide unidad de cobro; transporte, capacidad.
  const pintarCampos = () => {
    $('#campoUnidad').hidden = SERVICIO !== 'alquiler';
    $('#campoCapacidad').hidden = SERVICIO !== 'transporte';
  };

  $$('[data-servicio]').forEach((boton) => {
    boton.addEventListener('click', () => {
      SERVICIO = boton.dataset.servicio;
      $$('[data-servicio]').forEach((b) => {
        b.setAttribute('aria-selected', String(b === boton));
        b.classList.toggle('btn--ambar', b === boton);
        b.classList.toggle('btn--linea', b !== boton);
      });
      pintarCampos();
      cargarFlota();
    });
  });
  pintarCampos();

  $('#listaFlota').addEventListener('click', async (ev) => {
    const boton = ev.target.closest('button[data-flota]');
    if (!boton) return;
    const fila = boton.closest('.sol');
    const id = fila.dataset.id;

    try {
      switch (boton.dataset.flota) {
        case 'alternar': {
          const activo = !fila.classList.contains('sol--rechazada');
          await api(`/admin/flota/item/${encodeURIComponent(id)}`, {
            metodo: 'PATCH', cuerpo: { activo: !activo },
          });
          await cargarFlota();
          avisarFlota(activo ? 'Retirado del servicio.' : 'De vuelta en servicio.', true);
          break;
        }
        case 'subir':
          await subirEnFlota(id);
          break;
        case 'borrar': {
          const nombre = fila.querySelector('.sol__nombre').textContent;
          // eslint-disable-next-line no-alert
          if (!confirm(`¿Eliminar «${nombre}» de la flota? Esto no se puede deshacer.`)) return;
          await api(`/admin/flota/item/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
          await cargarFlota();
          avisarFlota('Eliminado.', true);
          break;
        }
        default:
      }
    } catch (e) {
      avisarFlota(e.message);
    }
  });

  $('#formFlota').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const cuerpo = {
      nombre: $('#fl-nombre').value.trim(),
      detalle: $('#fl-detalle').value.trim(),
      icono: $('#fl-icono').value,
    };
    if (SERVICIO === 'alquiler') cuerpo.unidad = $('#fl-unidad').value;
    else cuerpo.capacidad = $('#fl-capacidad').value;

    try {
      const r = await api(`/admin/flota/${SERVICIO}`, { metodo: 'POST', cuerpo });
      if (!r) throw new Error('No hay conexión con el servidor.');
      $('#formFlota').reset();
      $('#altaFlota').open = false;
      await cargarFlota();
      avisarFlota(`«${r.elemento.nombre}» añadido a ${SERVICIO}.`, true);
    } catch (e) {
      avisarFlota(e.message);
    }
  });

  cargarFlota();
}

/* ── Arranque ───────────────────────────────────────────── */

async function montarAdmin() {
  if (!document.getElementById('adminContenido')) return;

  await cargarSesion();

  /* Una sola llamada decide si esta página existe para quien la abre.
     `silencioso` devuelve null tanto si la API dice 404 como si el
     servidor no responde; ambos casos acaban igual, enseñando la
     página de no encontrada. Equivocarse hacia el lado de no mostrar
     la cola es el error barato. */
  if (!await api('/admin/solicitudes', { silencioso: true })) {
    $('#adminCargando').hidden = true;
    $('#adminSinAcceso').hidden = false;
    return;
  }

  $('#adminCargando').hidden = true;
  $('#adminContenido').hidden = false;

  /* Se filtra por `data-estado` y no por la clase del contenedor: hay
     dos bloques de filtros en la página —el de solicitudes y el de la
     flota— y engancharse a `.revision__filtros button` a secas ponía
     este manejador también en los botones de la flota, que dejaban
     ESTADO en undefined al pulsarlos. */
  $$('[data-estado]').forEach((boton) => {
    boton.addEventListener('click', () => {
      ESTADO = boton.dataset.estado;
      ABIERTA = null;
      $$('.revision__filtros button').forEach((b) => {
        b.setAttribute('aria-selected', String(b === boton));
        b.classList.toggle('btn--ambar', b === boton);
        b.classList.toggle('btn--linea', b !== boton);
      });
      cargar();
    });
  });

  $('#listaSolicitudes').addEventListener('click', (ev) => {
    const boton = ev.target.closest('button[data-accion]');
    if (!boton) return;

    const fila = boton.closest('.sol');
    if (!fila) return;
    const id = fila.dataset.id;

    switch (boton.dataset.accion) {
      case 'ver':
        return alternarDetalle(id, fila.querySelector('.sol__detalle'), boton);
      case 'aprobar':
        return resolver(id, 'aprobar');
      case 'rechazar':
        return pedirMotivo(fila, (motivo) => resolver(id, 'rechazar', motivo));
      default:
    }
  });

  await cargar();
  montarFlota();
}

document.addEventListener('DOMContentLoaded', montarAdmin);
