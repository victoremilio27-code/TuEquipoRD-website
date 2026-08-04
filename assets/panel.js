/* ═══════════════════════════════════════════════════════════
   TuEquipoRD · Panel del anunciante
   Lo que un vendedor necesita saber sin llamar a nadie: cuántas
   visitas tiene cada equipo, cuántos contactos generó, cuánto le
   queda de vigencia y qué está publicado y qué no.

   Todo sale de /api/mis-anuncios: una sola llamada con las métricas
   ya agregadas por la base.
   ═══════════════════════════════════════════════════════════ */

let ANUNCIOS = [];
let FILTRO = 'todos';

const ESTADOS = {
  activo:   { nombre: 'Activo',    clase: 'estado--activo' },
  pausado:  { nombre: 'Pausado',   clase: 'estado--pausado' },
  vencido:  { nombre: 'Vencido',   clase: 'estado--vencido' },
  vendido:  { nombre: 'Vendido',   clase: 'estado--vendido' },
  retirado: { nombre: 'Retirado',  clase: 'estado--vencido' },
  borrador: { nombre: 'Borrador',  clase: 'estado--pausado' },
};

/* Días que faltan para una fecha ISO. Negativo si ya pasó. */
function diasHasta(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date()) / 86400000);
}

function textoVigencia(a) {
  if (a.estado === 'vendido' || a.estado === 'retirado') return '—';
  if (!a.vence) {
    return '<span class="vigencia vigencia--membresia">Sin caducidad · membresía</span>';
  }
  const dias = diasHasta(a.vence);
  if (dias < 0) return '<span class="vigencia vigencia--fin">Vencido</span>';
  // Cinco días es el margen con el que da tiempo a renovar sin que el
  // anuncio llegue a caerse del catálogo.
  const clase = dias <= 5 ? 'vigencia vigencia--pronto' : 'vigencia';
  return `<span class="${clase}">${dias} ${dias === 1 ? 'día' : 'días'}</span>`;
}

/* ── Métricas de cabecera ───────────────────────────────── */

function tarjetaMetrica(icono_, valor, rotulo, detalle) {
  return `<li class="metrica">
    <span class="metrica__ico">${icono(icono_)}</span>
    <span class="metrica__cuerpo">
      <b class="metrica__num num">${valor}</b>
      <span class="metrica__rotulo">${esc(rotulo)}</span>
      ${detalle ? `<span class="metrica__detalle">${esc(detalle)}</span>` : ''}
    </span>
  </li>`;
}

function pintarMetricas(resumen) {
  const t = resumen.totales || {};
  const activos = ANUNCIOS.filter((a) => a.estado === 'activo').length;
  const inactivos = ANUNCIOS.length - activos;
  const contactos = (t.telefono || 0) + (t.whatsapp || 0);

  /* La tasa de contacto es el dato que de verdad dice si un anuncio
     funciona: mil visitas sin una llamada es un problema de precio o
     de fotos, no de tráfico.

     Con muy pocas visitas no se publica el porcentaje. Sobre cuatro
     visitas, un solo contacto da "25 %", una cifra que parece precisa
     y no lo es; y cualquier variación la mueve de golpe. Por debajo
     del mínimo se dice el número en bruto, que no engaña a nadie. */
  const MINIMO_TASA = 20;
  const tasa = !t.vistas
    ? 'Aún sin visitas'
    : t.vistas < MINIMO_TASA
      ? `Sobre ${miles(t.vistas)} ${t.vistas === 1 ? 'visita' : 'visitas'}`
      : `${Math.round((contactos / t.vistas) * 100)} % de quienes vieron sus anuncios`;

  $('#metricas').innerHTML = [
    tarjetaMetrica('i-ojo', miles(t.vistas || 0), 'Visualizaciones', 'Últimos 30 días'),
    tarjetaMetrica('i-telefono', miles(contactos), 'Contactos', tasa),
    tarjetaMetrica('i-grafico', miles(activos), 'Anuncios activos', `${inactivos} inactivo${inactivos === 1 ? '' : 's'}`),
    tarjetaMetrica('i-estrella', miles(t.favoritos || 0), 'Guardados', 'Compradores que lo marcaron'),
  ].join('');
}

/* ── Estado del plan ────────────────────────────────────── */

function pintarPlan(suscripcion) {
  const caja = $('#panelPlan');
  const org = SESION.organizacion || {};

  if (!suscripcion) {
    caja.innerHTML = `
      <h2 class="panel__titulo" id="t-plan"><em>Sin</em> plan contratado</h2>
      <p class="panel__texto">Todavía no ha contratado ningún plan. Elija uno al publicar su primer equipo.</p>
      <a class="btn btn--ambar" href="publicar.html">Publicar un equipo</a>`;
    return;
  }

  const membresia = suscripcion.modalidad === 'membresia';
  const cupo = suscripcion.anuncios_incluidos;
  const activos = ANUNCIOS.filter((a) => a.estado === 'activo').length;
  const dias = diasHasta(membresia ? suscripcion.proximo_cargo : suscripcion.fin);

  caja.innerHTML = `
    <div class="panel__cabeza">
      <h2 class="panel__titulo panel__titulo--limpio" id="t-plan">
        <em>Plan</em> ${esc(suscripcion.plan_nombre)}
        ${membresia ? '<span class="pastilla pastilla--azul">Membresía</span>' : ''}
      </h2>
      <p class="panel__meta">
        ${membresia
          ? `Próximo cargo en ${dias} ${dias === 1 ? 'día' : 'días'} · facturación ${esc(suscripcion.ciclo || 'mensual')}`
          : `Vigencia: ${dias > 0 ? `${dias} ${dias === 1 ? 'día' : 'días'} restantes` : 'vencida'}`}
      </p>
    </div>
    <dl class="plan-estado">
      <div><dt>Anuncios activos</dt>
        <dd class="num">${activos}${cupo != null ? ` de ${cupo}` : ' · sin límite'}</dd></div>
      <div><dt>Página pública</dt>
        <dd>${org.perfilPublico && org.slug
          ? `<a href="dealer.html?d=${encodeURIComponent(org.slug)}">Ver el perfil de la empresa</a>`
          : 'No incluida en este plan'}</dd></div>
      <div><dt>Sello de verificación</dt>
        <dd>${org.verificada ? 'Otorgado' : 'Pendiente de comprobar documentación'}</dd></div>
    </dl>
    ${cupo != null && activos >= cupo
      ? `<p class="realce">${icono('i-aviso')} <span>Ha ocupado las ${cupo} publicaciones del plan. Para publicar otro equipo, suba de plan o marque uno como vendido.</span></p>`
      : ''}`;
}

/* ── Tabla de anuncios ──────────────────────────────────── */

function filaAnuncio(a) {
  const estado = ESTADOS[a.estado] || ESTADOS.borrador;
  const contactos = (a.telefono || 0) + (a.whatsapp || 0);
  const precio = a.precio != null
    ? (a.moneda === 'USD' ? 'US$' : 'RD$') + miles(a.precio)
    : 'Sin precio';

  return `<tr data-id="${esc(a.id)}">
    <th scope="row" class="celda-equipo">
      <span class="celda-equipo__foto">${a.foto
        ? `<img src="${esc(a.foto)}" alt="">`
        : icono('i-hex-doble', 'fantasma fantasma--sm')}</span>
      <span>
        <a class="celda-equipo__nombre" href="equipo.html?id=${encodeURIComponent(a.id)}">${esc(`${a.anio} ${a.marca} ${a.modelo}`)}</a>
        <span class="celda-equipo__meta num">${esc(precio)}${a.provincia ? ` · ${esc(a.provincia)}` : ''}</span>
      </span>
    </th>
    <td><span class="estado ${estado.clase}">${estado.nombre}</span></td>
    <td class="col-num num">${miles(a.vistas || 0)}</td>
    <td class="col-num num">${miles(contactos)}</td>
    <td>${textoVigencia(a)}</td>
    <td class="col-acciones">
      ${a.estado === 'activo'
        ? '<button type="button" class="btn-tabla" data-accion="pausado">Pausar</button>'
        : a.estado === 'pausado'
          ? '<button type="button" class="btn-tabla" data-accion="activo">Reactivar</button>'
          : ''}
      ${a.estado !== 'vendido'
        ? '<button type="button" class="btn-tabla btn-tabla--fuerte" data-accion="vendido">Marcar vendido</button>'
        : ''}
    </td>
  </tr>`;
}

function pintarTabla() {
  const lista = FILTRO === 'todos'
    ? ANUNCIOS
    : FILTRO === 'activos'
      ? ANUNCIOS.filter((a) => a.estado === 'activo')
      : ANUNCIOS.filter((a) => a.estado !== 'activo');

  $('#filasAnuncios').innerHTML = lista.map(filaAnuncio).join('');

  const vacia = $('#tablaVacia');
  vacia.hidden = lista.length > 0;
  vacia.textContent = ANUNCIOS.length
    ? 'Ningún anuncio en este estado.'
    : 'Todavía no ha publicado ningún equipo.';
}

function pintarFiltros() {
  const activos = ANUNCIOS.filter((a) => a.estado === 'activo').length;
  const opciones = [
    ['todos', `Todos (${ANUNCIOS.length})`],
    ['activos', `Activos (${activos})`],
    ['inactivos', `Inactivos (${ANUNCIOS.length - activos})`],
  ];
  $('#filtrosPanel').innerHTML = opciones.map(([id, rotulo]) =>
    `<button type="button" class="filtro-panel${FILTRO === id ? ' filtro-panel--activo' : ''}" data-filtro="${id}">${esc(rotulo)}</button>`).join('');
}

/* ── Perfil de empresa ──────────────────────────────────── */

/* Un particular puede registrar su RNC desde aquí y convertirse en
   dealer sin abrir otra cuenta ni volver a publicar sus equipos: la
   organización ya existe, solo cambia de tipo. */
function pintarEmpresa() {
  const caja = $('#panelEmpresa');
  const org = SESION.organizacion;
  if (!org) return;
  caja.hidden = false;

  if (org.tipo === 'dealer') {
    // Publicar exige las dos llaves: revisión aprobada y plan que
    // incluya perfil. Se dicen por separado para que quien espera sepa
    // cuál le falta en vez de ver un "no" sin explicación.
    const revision = {
      pendiente: {
        clase: 'pastilla--ambar',
        rotulo: 'En revisión',
        nota: 'Estamos comprobando los datos de la empresa. Le escribiremos al correo de la cuenta en cuanto terminemos, normalmente en menos de 24 horas hábiles. Mientras tanto puede preparar sus equipos: se publicarán al aprobarse la cuenta.',
      },
      aprobada: {
        clase: 'pastilla--verde',
        rotulo: 'Aprobada',
        nota: 'Su empresa está aprobada. La página pública aparece en el directorio mientras tenga un plan Dealer activo.',
      },
      rechazada: {
        clase: 'pastilla--roja',
        rotulo: 'No aprobada',
        nota: 'No pudimos confirmar los datos de la empresa. Escríbanos desde <a href="contacto.html">contacto</a> con la documentación corregida y la revisamos de nuevo.',
      },
    }[org.estadoRevision] || { clase: '', rotulo: '—', nota: '' };

    const aprobada = org.estadoRevision === 'aprobada';

    caja.innerHTML = `
      <h2 class="panel__titulo" id="t-empresa"><em>Perfil</em> de la empresa</h2>
      <dl class="plan-estado">
        <div><dt>Razón social</dt><dd>${esc(org.nombre)}</dd></div>
        <div><dt>RNC registrado</dt><dd class="num">${esc(org.rncMascara || '—')}</dd></div>
        <div><dt>Estado de la solicitud</dt>
          <dd><span class="pastilla ${revision.clase}">${esc(revision.rotulo)}</span></dd></div>
        <div><dt>Dirección pública</dt><dd>${aprobada && org.slug
          ? `<a href="dealer.html?d=${encodeURIComponent(org.slug)}">/dealer.html?d=${esc(org.slug)}</a>`
          : 'Al aprobarse la cuenta'}</dd></div>
        <div><dt>Visible en el directorio</dt><dd>${aprobada
          ? (org.perfilPublico ? 'Sí' : 'Al contratar un plan Dealer')
          : 'No, hasta que se apruebe'}</dd></div>
      </dl>
      <p class="panel__nota">${revision.nota}</p>
      <p class="panel__nota">Mostramos solo los últimos dígitos del RNC. Es un dato reservado: lo usamos para comprobar que la empresa existe y nunca aparece en su página pública ni en el directorio. Para cambiar la razón social o la descripción, escríbanos desde <a href="contacto.html">contacto</a>.</p>`;
    return;
  }

  caja.innerHTML = `
    <h2 class="panel__titulo" id="t-empresa"><em>¿Comercializa</em> maquinaria de forma habitual?</h2>
    <p class="panel__texto">Solicite la cuenta de empresa: revisamos los datos y, una vez aprobada, se genera su página pública con todo el inventario y aparece en el directorio al contratar un plan Dealer. Los equipos que ya publicó se mantienen.</p>
    <form class="form-rnc solicitud" id="formRnc" novalidate>
      <fieldset class="solicitud__bloque">
        <legend class="solicitud__titulo">La empresa</legend>
        <div class="campos">
          <label class="campo-v"><span>Razón social *</span>
            <input type="text" id="rnc-empresa" placeholder="Ej. Sur Maquinarias, SRL" autocomplete="organization">
          </label>
          <label class="campo-v"><span>RNC *</span>
            <input type="text" id="rnc-numero" inputmode="numeric" maxlength="11" placeholder="9 dígitos">
            <small class="campo-v__ayuda">Uso interno. No aparece en su página pública.</small>
          </label>
          <label class="campo-v"><span>Nombre comercial</span>
            <input type="text" id="rnc-comercial" placeholder="Si opera con otro nombre">
          </label>
          <label class="campo-v"><span>Años operando</span>
            <input type="number" id="rnc-anios" inputmode="numeric" min="0" max="120" placeholder="Ej. 8">
          </label>
        </div>
      </fieldset>

      <fieldset class="solicitud__bloque">
        <legend class="solicitud__titulo">Quién responde por la empresa</legend>
        <div class="campos">
          <label class="campo-v"><span>Encargado o representante *</span>
            <input type="text" id="rnc-encargado" placeholder="Nombre y apellido">
          </label>
          <label class="campo-v"><span>Cargo</span>
            <input type="text" id="rnc-cargo" placeholder="Ej. Gerente de ventas">
          </label>
        </div>
      </fieldset>

      <fieldset class="solicitud__bloque">
        <legend class="solicitud__titulo">Su operación</legend>
        <div class="campos">
          <label class="campo-v"><span>Equipos en inventario</span>
            <input type="number" id="rnc-inventario" inputmode="numeric" min="0" placeholder="Ej. 24">
          </label>
          <label class="campo-v"><span>Equipos que desea publicar</span>
            <input type="number" id="rnc-publicar" inputmode="numeric" min="0" placeholder="Ej. 12">
          </label>
          <label class="campo-v campo-v--ancho"><span>Tipos de equipo</span>
            <input type="text" id="rnc-tipos" placeholder="Ej. excavadoras, retroexcavadoras, plantas eléctricas">
          </label>
          <label class="campo-v campo-v--ancho"><span>Descripción de la empresa</span>
            <textarea id="rnc-descripcion" placeholder="A qué se dedica, desde cuándo opera y qué marcas maneja. Se muestra en su página pública."></textarea>
          </label>
        </div>
      </fieldset>

      <p class="acceso__aviso" id="avisoRnc" role="alert" hidden></p>
      <button class="btn btn--ambar btn--grande" type="submit">Enviar la solicitud</button>
      <p class="panel__nota">Al enviarla, su cuenta queda en revisión. Le escribimos al correo de la cuenta con el resultado.</p>
    </form>`;

  $('#formRnc').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const aviso = $('#avisoRnc');
    aviso.hidden = true;

    const fallar = (mensaje) => {
      aviso.hidden = false;
      aviso.textContent = mensaje;
    };

    if ($('#rnc-numero').value.replace(/\D/g, '').length !== 9) {
      return fallar('El RNC de la empresa tiene 9 dígitos.');
    }
    if (!$('#rnc-encargado').value.trim()) {
      return fallar('Indique quién responde por la empresa.');
    }

    try {
      const datos = await api('/dealer/registro', {
        metodo: 'POST',
        cuerpo: {
          empresa: $('#rnc-empresa').value.trim(),
          rnc: $('#rnc-numero').value.trim(),
          descripcion: $('#rnc-descripcion').value.trim(),
          nombreComercial: $('#rnc-comercial').value.trim(),
          aniosOperando: $('#rnc-anios').value,
          encargado: $('#rnc-encargado').value.trim(),
          cargo: $('#rnc-cargo').value.trim(),
          equiposInventario: $('#rnc-inventario').value,
          equiposPublicar: $('#rnc-publicar').value,
          tiposEquipo: $('#rnc-tipos').value.trim(),
        },
      });
      if (!datos) throw new Error('No hay conexión con el servidor.');
      SESION.organizacion = datos.organizacion;
      pintarEmpresa();
      pintarPlan(null);
      location.reload();
    } catch (e) {
      fallar(e.message);
    }
  });
}

/* ── Sucursales ─────────────────────────────────────────── */

let SUCURSALES = [];
let editando = null;      // id de la sucursal en edición, o null si es nueva

const telefonoDominicano = (v) => {
  const d = String(v || '').replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

function sucursalAdminHTML(s) {
  const donde = [s.municipio, s.provincia].filter(Boolean).join(', ');
  return `<li class="suc-admin${s.principal ? ' suc-admin--principal' : ''}" data-id="${esc(s.id)}">
    <span class="suc-admin__ico">${icono('i-pin')}</span>
    <span class="suc-admin__cuerpo">
      <b class="suc-admin__nombre">${esc(s.nombre)}
        ${s.principal && !/principal/i.test(s.nombre)
          ? '<span class="pastilla pastilla--azul">Oficina principal</span>' : ''}</b>
      <span class="suc-admin__meta">${esc(s.direccion || 'Sin dirección')}${donde ? ` · ${esc(donde)}` : ''}</span>
      <span class="suc-admin__meta num">${esc(s.telefono || 'Sin teléfono')}${s.whatsapp ? ` · WhatsApp ${esc(s.whatsapp)}` : ''}${s.horario ? ` · ${esc(s.horario)}` : ''}</span>
    </span>
    <span class="suc-admin__acciones">
      <button type="button" class="btn-tabla" data-editar>Editar</button>
      ${s.principal
        ? ''
        : `<button type="button" class="btn-tabla" data-principal>Hacer principal</button>
           <button type="button" class="btn-tabla btn-tabla--quitar" data-quitar>Retirar</button>`}
    </span>
  </li>`;
}

function pintarSucursales() {
  const caja = $('#panelSucursales');
  const org = SESION.organizacion || {};
  // Las sucursales son de las cuentas de empresa: un particular no
  // tiene nada que administrar aquí.
  caja.hidden = org.tipo !== 'dealer';
  if (caja.hidden) return;

  $('#listaSucursalesAdmin').innerHTML = SUCURSALES.map(sucursalAdminHTML).join('');
}

function abrirFormularioSucursal(s) {
  editando = s ? s.id : null;
  $('#tituloSucursal').textContent = s ? `Editar ${s.nombre}` : 'Nueva sucursal';
  $('#suc-nombre').value = s ? s.nombre : '';
  $('#suc-telefono').value = s ? (s.telefono || '') : '';
  $('#suc-direccion').value = s ? (s.direccion || '') : '';
  $('#suc-provincia').value = s ? (s.provincia || '') : '';
  $('#suc-municipio').value = s ? (s.municipio || '') : '';
  $('#suc-whatsapp').value = s ? (s.whatsapp || '') : '';
  $('#suc-horario').value = s ? (s.horario || '') : '';
  $('#avisoSucursal').hidden = true;
  $('#formSucursal').hidden = false;
  $('#suc-nombre').focus();
}

const cerrarFormularioSucursal = () => {
  $('#formSucursal').hidden = true;
  editando = null;
};

async function montarSucursales() {
  const caja = $('#panelSucursales');
  if (!caja || (SESION.organizacion || {}).tipo !== 'dealer') return;

  const datos = await api('/sucursales', { silencioso: true });
  SUCURSALES = (datos && datos.sucursales) || [];
  pintarSucursales();

  ['#suc-telefono', '#suc-whatsapp'].forEach((sel) => {
    const campo = $(sel);
    campo.addEventListener('input', () => { campo.value = telefonoDominicano(campo.value); });
  });

  $('#btnNuevaSucursal').addEventListener('click', () => abrirFormularioSucursal(null));
  $('#btnCancelarSucursal').addEventListener('click', cerrarFormularioSucursal);

  $('#listaSucursalesAdmin').addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    const idSucursal = btn.closest('.suc-admin').dataset.id;
    const s = SUCURSALES.find((x) => x.id === idSucursal);

    if (btn.hasAttribute('data-editar')) return abrirFormularioSucursal(s);

    if (btn.hasAttribute('data-principal')) {
      const r = await api(`/sucursales/${encodeURIComponent(idSucursal)}`, {
        metodo: 'PATCH', cuerpo: { principal: true }, silencioso: true,
      });
      if (r) { SUCURSALES = r.sucursales; pintarSucursales(); }
      return;
    }

    if (btn.hasAttribute('data-quitar')) {
      if (!confirm(`¿Retirar la sucursal ${s.nombre}? Sus anuncios publicados no se borran.`)) return;
      const r = await api(`/sucursales/${encodeURIComponent(idSucursal)}`, { metodo: 'DELETE', silencioso: true });
      if (r) { SUCURSALES = r.sucursales; pintarSucursales(); }
    }
  });

  $('#formSucursal').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const aviso = $('#avisoSucursal');
    aviso.hidden = true;

    const cuerpo = {
      nombre: $('#suc-nombre').value.trim(),
      telefono: $('#suc-telefono').value.trim(),
      direccion: $('#suc-direccion').value.trim(),
      provincia: $('#suc-provincia').value,
      municipio: $('#suc-municipio').value.trim(),
      whatsapp: $('#suc-whatsapp').value.trim(),
      horario: $('#suc-horario').value,
    };

    try {
      const r = editando
        ? await api(`/sucursales/${encodeURIComponent(editando)}`, { metodo: 'PATCH', cuerpo })
        : await api('/sucursales', { metodo: 'POST', cuerpo });
      if (!r) throw new Error('No hay conexión con el servidor.');

      const lista = await api('/sucursales', { silencioso: true });
      SUCURSALES = (lista && lista.sucursales) || SUCURSALES;
      pintarSucursales();
      cerrarFormularioSucursal();
    } catch (e) {
      aviso.hidden = false;
      aviso.textContent = e.message;
    }
  });
}

/* ── Arranque ───────────────────────────────────────────── */

async function montarPanel() {
  if (!$('#panelContenido')) return;

  await cargarSesion();
  $('#panelCargando').hidden = true;

  if (!haySesion()) {
    $('#panelSinSesion').hidden = false;
    return;
  }

  const datos = await api('/mis-anuncios', { silencioso: true });
  if (!datos) {
    $('#panelSinSesion').hidden = false;
    return;
  }

  ANUNCIOS = datos.anuncios || [];
  $('#panelContenido').hidden = false;

  const org = SESION.organizacion || {};
  $('#panelTitulo').innerHTML = `<em>${esc((org.nombre || SESION.usuario.nombre).split(/[\s,]+/)[0])}</em> ${esc((org.nombre || '').replace(/^\S+\s*/, ''))}`;
  // Atajo a la cola de revisión para quien la atiende. El permiso lo
  // comprueba la API en cada llamada; esto solo evita teclear la URL.
  if (SESION.usuario.esAdmin) $('#enlaceAdmin').hidden = false;

  const estadoEmpresa = { pendiente: 'en revisión', rechazada: 'no aprobada' }[org.estadoRevision];
  $('#panelSub').textContent = org.tipo === 'dealer'
    ? `Cuenta de empresa${estadoEmpresa ? ` (${estadoEmpresa})` : ''} · ${SESION.usuario.correo}`
    : `Cuenta particular · ${SESION.usuario.correo}`;

  pintarMetricas(datos.resumen || {});
  pintarPlan(datos.suscripcion);
  pintarFiltros();
  pintarTabla();
  pintarEmpresa();
  await montarSucursales();

  $('#filtrosPanel').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-filtro]');
    if (!btn) return;
    FILTRO = btn.dataset.filtro;
    pintarFiltros();
    pintarTabla();
  });

  // Cambiar el estado de un anuncio: se pide al servidor y se refleja
  // en memoria, sin recargar toda la página.
  $('#filasAnuncios').addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-accion]');
    if (!btn) return;
    const fila = btn.closest('tr');
    const idAnuncio = fila.dataset.id;
    const estado = btn.dataset.accion;

    if (estado === 'vendido' && !confirm('¿Marcar este equipo como vendido? El anuncio deja de aparecer en el catálogo.')) return;

    btn.disabled = true;
    const r = await api(`/anuncios/${encodeURIComponent(idAnuncio)}`, {
      metodo: 'PATCH', cuerpo: { estado }, silencioso: true,
    });
    if (!r) { btn.disabled = false; return; }

    const anuncio = ANUNCIOS.find((a) => a.id === idAnuncio);
    if (anuncio) anuncio.estado = estado;
    pintarFiltros();
    pintarTabla();
    pintarMetricas(datos.resumen || {});
    pintarPlan(datos.suscripcion);
  });

  $('#btnSalir').addEventListener('click', async () => {
    await api('/cuenta/salir', { metodo: 'POST', silencioso: true });
    location.href = 'index.html';
  });
}

document.addEventListener('DOMContentLoaded', montarPanel);
