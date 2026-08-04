/* ═══════════════════════════════════════════════════════════
   TuEquipoRD · Asistente de publicación
   Flujo directo: el anunciante completa la ficha, elige plan y,
   si el plan es de pago, liquida antes de que el anuncio quede
   activo. No hay solicitud previa ni revisión manual: la
   publicación es del anunciante y se activa al confirmarse el
   cobro.

   Depende de data.js y app.js (cargados antes): usa esc, pesos,
   miles, icono, $, $$, PLANES y el cálculo de precios.
   ═══════════════════════════════════════════════════════════ */

/* ── Configuración del flujo ────────────────────────────── */

/* Los rótulos van cortos a propósito: la columna del paso mide poco y
   los anteriores se cortaban a media palabra ("Monto y modali…"), que
   se lee como un error de la página. */
const PASOS = [
  { id: 'equipo',   nombre: 'Equipo',      detalle: 'Ficha técnica' },
  { id: 'fotos',    nombre: 'Fotografías', detalle: 'Fotos y video' },
  { id: 'precio',   nombre: 'Precio',      detalle: 'Monto' },
  { id: 'contacto', nombre: 'Contacto',    detalle: 'Teléfonos' },
  { id: 'plan',     nombre: 'Plan',        detalle: 'Vigencia' },
  { id: 'pago',     nombre: 'Pago',        detalle: 'Confirmación' },
];

const FOTOS_MINIMAS = 3;
const FOTOS_MAXIMAS = 20;

/* Las imágenes se reducen antes de guardarse: el original de una
   cámara de teléfono pesa varios megabytes y no aporta nada por
   encima de este ancho en la ficha. */
const ANCHO_MAXIMO_FOTO = 1600;
const CALIDAD_FOTO = 0.82;

/* Segundo tamaño, para las tarjetas del catálogo. Una tarjeta mide
   unos 400 px en pantalla, así que 900 cubre también las de retina sin
   mandar la de 1600, que sería tirar el 90 % de los bytes. */
const ANCHO_MINIATURA = 900;
const CALIDAD_MINIATURA = 0.78;

const CLAVE_BORRADOR = 'tuequipord:borrador';

/* ── Estado ─────────────────────────────────────────────── */

function estadoInicial() {
  return {
    paso: 0,
    equipo: {
      categoria: '', subcategoria: '', marca: '', modelo: '', anio: '',
      condicion: '', uso: '', unidad: 'h', serie: '', potencia: '', peso: '',
      provincia: '', ciudad: '', implementos: '', descripcion: '',
    },
    fotos: [],
    video: '',
    precio: {
      modalidad: 'fijo', monto: '', moneda: 'DOP', minimo: '',
      itbisIncluido: false, permuta: false, financiamiento: false,
    },
    // La razón social y el RNC ya no viven aquí: son de la
    // organización de la cuenta, se registran una vez y todos los
    // anuncios los heredan.
    contacto: {
      nombre: '', correo: '', sucursal: '',
      telefonos: [{ numero: '', tipo: 'ambos', nota: '' }],
      horario: '', web: '', preferencia: 'whatsapp',
    },
    // `dias` rige las compras puntuales; `ciclo`, la membresía Dealer.
    plan: { id: '', dias: 30, ciclo: 'mensual' },
    pago: { forma: 'tarjeta', guardar: true, autorenovar: false },
  };
}

let estado = estadoInicial();

/* El borrador sobrevive a un cierre de pestaña. Las fotos van dentro:
   ya están reducidas, y el navegador avisa por excepción si el cupo
   de almacenamiento se agota. En ese caso se guarda sin ellas antes
   que perder todo lo escrito. */
function guardarBorrador() {
  try {
    localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(estado));
  } catch (_) {
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ ...estado, fotos: [] }));
    } catch (__) { /* almacenamiento no disponible: se sigue en memoria */ }
  }
}

function leerBorrador() {
  try {
    const crudo = localStorage.getItem(CLAVE_BORRADOR);
    if (!crudo) return null;
    const datos = JSON.parse(crudo);
    const base = estadoInicial();
    // Fusión superficial por bloque: un borrador viejo al que le falte
    // un campo nuevo se completa con el valor por defecto.
    return {
      ...base, ...datos,
      equipo: { ...base.equipo, ...(datos.equipo || {}) },
      precio: { ...base.precio, ...(datos.precio || {}) },
      contacto: { ...base.contacto, ...(datos.contacto || {}) },
      plan: { ...base.plan, ...(datos.plan || {}) },
      pago: { ...base.pago, ...(datos.pago || {}) },
      fotos: Array.isArray(datos.fotos) ? datos.fotos : [],
    };
  } catch (_) {
    return null;
  }
}

const borrarBorrador = () => {
  try { localStorage.removeItem(CLAVE_BORRADOR); } catch (_) { /* nada que borrar */ }
};

/* ── Cálculo del pedido ─────────────────────────────────── */

const planElegido = () => planesVisibles().find((p) => p.id === estado.plan.id) || null;

/* Cuántas fotos admite el plan. El servidor recorta a este mismo tope
   al guardar: aquí es solo para avisar antes de llegar al cobro. */
const fotosDelPlan = (plan) => plan.fotosMaximas || (plan.nivel === 'estandar' ? 8 : 20);

/* Cuántas fotos admite el plan elegido. Mientras no haya plan se
   permite el máximo: el anunciante sube primero y decide después. */
function limiteFotos() {
  const plan = planElegido();
  return plan ? fotosDelPlan(plan) : FOTOS_MAXIMAS;
}

const esMembresia = () => !!(planElegido() || {}).membresia;

/* Desglose del cobro. Distingue los dos modelos: una compra puntual
   cobra una vigencia y se acaba; la membresía cobra un ciclo y vuelve
   a cobrar solo al vencer. El plan gratuito de la promoción devuelve
   cero en todo y el paso de pago se salta. */
function pedido() {
  const plan = planElegido();
  if (!plan) return null;

  const membresia = !!plan.membresia;
  const base = plan.enPromo ? 0
    : membresia ? precioMembresia(plan, estado.plan.ciclo)
      : precioPlan(plan, estado.plan.dias);
  const itbis = Math.round(base * ITBIS);

  return {
    plan,
    membresia,
    ciclo: membresia ? cicloPorId(estado.plan.ciclo) : null,
    mensual: membresia ? mensualEquivalente(plan, estado.plan.ciclo) : null,
    renueva: membresia ? proximoCargo(estado.plan.ciclo) : null,
    dias: estado.plan.dias,
    base,
    itbis,
    total: base + itbis,
    gratuito: base === 0,
  };
}

/* ── Utilidades de formato ──────────────────────────────── */

const soloDigitos = (s) => String(s || '').replace(/\D+/g, '');

const simboloMoneda = (id) => (MONEDAS.find((m) => m.id === id) || MONEDAS[0]).simbolo;

const montoConMoneda = (valor, moneda) =>
  `${simboloMoneda(moneda)}${miles(Number(soloDigitos(valor) || 0))}`;

/* Teléfono dominicano: (809) 000-0000. Se formatea mientras se
   escribe y se guarda con el mismo formato que se muestra. */
function formatearTelefono(valor) {
  const d = soloDigitos(valor).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

const telefonoValido = (valor) => soloDigitos(valor).length === 10;

const correoValido = (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor || '').trim());

/* Miles mientras se escribe en los campos de dinero. */
const formatearMonto = (valor) => {
  const d = soloDigitos(valor);
  return d ? miles(Number(d)) : '';
};

/* ── Errores de validación ──────────────────────────────── */

/* Marca el campo, escribe el motivo debajo y devuelve false para
   encadenar: `ok = exigir(...) && ok` recorre todo el paso y deja
   señalados todos los campos, no solo el primero. */
function exigir(campo, condicion, motivo) {
  const contenedor = campo && campo.closest('.campo-v, .campo-grupo');
  if (!contenedor) return condicion;

  contenedor.classList.toggle('campo-v--error', !condicion);
  let aviso = contenedor.querySelector('.campo-v__error');

  if (condicion) {
    if (aviso) aviso.remove();
    campo.removeAttribute('aria-invalid');
    return true;
  }

  if (!aviso) {
    aviso = document.createElement('span');
    aviso.className = 'campo-v__error';
    contenedor.appendChild(aviso);
  }
  aviso.textContent = motivo;
  campo.setAttribute('aria-invalid', 'true');
  return false;
}

function limpiarErrores(seccion) {
  $$('.campo-v--error', seccion).forEach((c) => c.classList.remove('campo-v--error'));
  $$('.campo-v__error', seccion).forEach((c) => c.remove());
  $$('[aria-invalid]', seccion).forEach((c) => c.removeAttribute('aria-invalid'));
}

/* Aviso de bloque, para lo que no cuelga de un campo concreto
   (faltan fotos, falta un plan). */
function avisoPaso(seccion, texto) {
  let caja = $('.paso__aviso', seccion);
  if (!texto) {
    if (caja) caja.remove();
    return;
  }
  if (!caja) {
    caja = document.createElement('p');
    caja.className = 'paso__aviso';
    caja.setAttribute('role', 'alert');
    seccion.insertBefore(caja, seccion.firstChild);
  }
  caja.innerHTML = `${icono('i-aviso')} <span>${esc(texto)}</span>`;
}

/* ── Paso 1 · Equipo ────────────────────────────────────── */

function montarPasoEquipo() {
  const cat = $('#e-categoria');
  const sub = $('#e-subcategoria');
  if (!cat || !sub) return;

  // Las condiciones salen del catálogo: la escala se cambia en data.js.
  const cond = $('#e-condicion');
  CONDICIONES.forEach((c) => cond.add(new Option(`${c.nombre} — ${c.detalle}`, c.nombre)));

  function pintarSub() {
    const lista = subcategoriasDe(cat.value);
    sub.innerHTML = '<option value="">Seleccione el tipo</option>';
    lista.forEach((s) => sub.add(new Option(s, s)));
    sub.disabled = lista.length === 0;
    sub.closest('.campo-v').classList.toggle('campo-v--inactivo', lista.length === 0);
    if (estado.equipo.subcategoria && lista.includes(estado.equipo.subcategoria)) {
      sub.value = estado.equipo.subcategoria;
    }
  }

  cat.addEventListener('change', () => {
    estado.equipo.subcategoria = '';
    pintarSub();
  });

  pintarSub();
}

function validarEquipo(seccion) {
  limpiarErrores(seccion);
  let ok = true;
  const anio = Number($('#e-anio').value);
  const limite = new Date().getFullYear() + 1;

  ok = exigir($('#e-categoria'), !!$('#e-categoria').value, 'Seleccione la categoría del equipo.') && ok;
  ok = exigir($('#e-subcategoria'), !!$('#e-subcategoria').value, 'Seleccione el tipo dentro de la categoría.') && ok;
  ok = exigir($('#e-marca'), !!$('#e-marca').value, 'Seleccione la marca.') && ok;
  ok = exigir($('#e-modelo'), $('#e-modelo').value.trim().length >= 2, 'Indique el modelo tal como aparece en la placa del equipo.') && ok;
  ok = exigir($('#e-anio'), anio >= 1970 && anio <= limite, `Año entre 1970 y ${limite}.`) && ok;
  ok = exigir($('#e-condicion'), !!$('#e-condicion').value, 'Seleccione la condición del equipo.') && ok;
  ok = exigir($('#e-uso'), soloDigitos($('#e-uso').value).length > 0, 'Indique las horas de horómetro o el kilometraje acumulado.') && ok;
  ok = exigir($('#e-provincia'), !!$('#e-provincia').value, 'Indique la provincia donde se encuentra el equipo.') && ok;
  ok = exigir($('#e-descripcion'), $('#e-descripcion').value.trim().length >= 40,
    'Describa el estado en al menos 40 caracteres: mantenimientos, trabajos pendientes y uso que se le dio.') && ok;

  return ok;
}

/* ── Paso 2 · Fotografías ───────────────────────────────── */

/* ¿Sabe este navegador CODIFICAR WebP con canvas?
 *
 * No basta con que sepa mostrarlo. Safari lo muestra desde hace años
 * pero tardó en poder generarlo, y cuando no puede, `toDataURL` no
 * avisa: devuelve un PNG. Un PNG de una foto pesa varias veces más que
 * el JPEG, así que dar por hecho el soporte empeoraría justo lo que se
 * quiere arreglar. Se comprueba una vez y se decide con el resultado. */
const ADMITE_WEBP = (() => {
  try {
    const c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch { return false; }
})();

const FORMATO_FOTO = ADMITE_WEBP ? 'image/webp' : 'image/jpeg';

/* Dibuja la imagen a un ancho dado y devuelve el data URL. */
function aDataUrl(img, ancho, calidad) {
  const escala = Math.min(1, ancho / img.width);
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(img.width * escala);
  lienzo.height = Math.round(img.height * escala);
  const ctx = lienzo.getContext('2d');
  // Fondo blanco: un PNG con transparencia sobre JPEG saldría negro.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  return lienzo.toDataURL(FORMATO_FOTO, calidad);
}

/* Reduce la imagen en el navegador y la sube al servidor. Devuelve las
   RUTAS de los dos tamaños, no la imagen.
 *
 * Antes esto devolvía el data URL y acababa guardado en la base. Una
 * foto de móvil ocupaba 697 KB así, una página de catálogo pesaba
 * 16 MB y nada de eso se podía cachear. Ahora el navegador manda los
 * bytes una vez y a partir de ahí pide archivos normales. */
function procesarImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    if (!archivo.type.startsWith('image/')) {
      rechazar(new Error('No es una imagen'));
      return;
    }
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => rechazar(new Error('Imagen dañada'));
      img.onload = async () => {
        const completa = aDataUrl(img, ANCHO_MAXIMO_FOTO, CALIDAD_FOTO);
        const miniatura = aDataUrl(img, ANCHO_MINIATURA, CALIDAD_MINIATURA);

        try {
          const r = await api('/fotos', { metodo: 'POST', cuerpo: { completa, miniatura } });
          if (!r) throw new Error('No hay conexión con el servidor');
          resolver({
            id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            nombre: archivo.name,
            url: r.completa,
            miniatura: r.miniatura,
          });
        } catch (e) {
          rechazar(new Error(`No se pudo subir «${archivo.name}»: ${e.message}`));
        }
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

function pintarFotos() {
  const lista = $('#listaFotos');
  const cuenta = $('#contadorFotos');
  if (!lista) return;

  const tope = limiteFotos();
  const sobran = estado.fotos.length - tope;

  lista.innerHTML = estado.fotos.map((f, i) => `
    <li class="foto${i === 0 ? ' foto--portada' : ''}${i >= tope ? ' foto--excedida' : ''}" data-id="${esc(f.id)}">
      <img src="${esc(f.url)}" alt="${esc(f.nombre)}">
      ${i === 0 ? '<span class="foto__sello">Portada</span>' : ''}
      ${i >= tope ? '<span class="foto__sello foto__sello--aviso">Fuera del plan</span>' : ''}
      <span class="foto__mandos">
        <button type="button" class="foto__btn" data-mover="-1" ${i === 0 ? 'disabled' : ''} aria-label="Mover la foto ${i + 1} hacia atrás">&larr;</button>
        <button type="button" class="foto__btn" data-portada aria-label="Usar la foto ${i + 1} como portada" ${i === 0 ? 'disabled' : ''}>${icono('i-estrella')}</button>
        <button type="button" class="foto__btn" data-mover="1" ${i === estado.fotos.length - 1 ? 'disabled' : ''} aria-label="Mover la foto ${i + 1} hacia delante">&rarr;</button>
        <button type="button" class="foto__btn foto__btn--quitar" data-quitar aria-label="Quitar la foto ${i + 1}">${icono('i-equis')}</button>
      </span>
    </li>`).join('');

  cuenta.innerHTML = estado.fotos.length
    ? `<b class="num">${estado.fotos.length}</b> de ${tope} fotografías${sobran > 0
        ? ` · <span class="cuenta-aviso">${sobran} quedarán fuera con el plan elegido</span>` : ''}`
    : `Mínimo ${FOTOS_MINIMAS} fotografías · máximo ${tope}`;

  pintarVistaPrevia();
}

function agregarArchivos(archivos) {
  const zona = $('#zonaFotos');
  const pendientes = [...archivos].filter((a) => a.type.startsWith('image/'));
  if (!pendientes.length) return;

  zona.classList.add('zona-fotos--cargando');
  Promise.allSettled(pendientes.map(procesarImagen)).then((salidas) => {
    salidas.forEach((s) => {
      if (s.status === 'fulfilled' && estado.fotos.length < FOTOS_MAXIMAS) {
        estado.fotos.push(s.value);
      }
    });
    zona.classList.remove('zona-fotos--cargando');
    pintarFotos();
    guardarBorrador();
  });
}

function montarPasoFotos() {
  const zona = $('#zonaFotos');
  const input = $('#inputFotos');
  const lista = $('#listaFotos');
  if (!zona || !input) return;

  input.addEventListener('change', () => {
    agregarArchivos(input.files);
    input.value = '';           // permite volver a elegir el mismo archivo
  });

  ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => {
    e.preventDefault();
    zona.classList.add('zona-fotos--activa');
  }));
  ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, (e) => {
    e.preventDefault();
    zona.classList.remove('zona-fotos--activa');
  }));
  zona.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files) agregarArchivos(e.dataTransfer.files);
  });

  lista.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const li = btn.closest('.foto');
    const i = estado.fotos.findIndex((f) => f.id === li.dataset.id);
    if (i < 0) return;

    if (btn.hasAttribute('data-quitar')) {
      estado.fotos.splice(i, 1);
    } else if (btn.hasAttribute('data-portada')) {
      const [f] = estado.fotos.splice(i, 1);
      estado.fotos.unshift(f);
    } else {
      const destino = i + Number(btn.dataset.mover);
      if (destino < 0 || destino >= estado.fotos.length) return;
      const [f] = estado.fotos.splice(i, 1);
      estado.fotos.splice(destino, 0, f);
    }
    pintarFotos();
    guardarBorrador();
  });

  pintarFotos();
}

function validarFotos(seccion) {
  limpiarErrores(seccion);
  if (estado.fotos.length < FOTOS_MINIMAS) {
    avisoPaso(seccion, `Cargue al menos ${FOTOS_MINIMAS} fotografías. Los anuncios con menos de tres imágenes reciben la mitad de contactos.`);
    return false;
  }
  avisoPaso(seccion, '');
  return true;
}

/* ── Paso 3 · Precio ────────────────────────────────────── */

function montarPasoPrecio() {
  const grupo = $('#modalidadPrecio');
  if (!grupo) return;

  grupo.innerHTML = MODALIDADES_PRECIO.map((m) => `
    <label class="opcion">
      <input type="radio" name="modalidad" value="${esc(m.id)}"${m.id === estado.precio.modalidad ? ' checked' : ''}>
      <span class="opcion__cuerpo">
        <b class="opcion__nombre">${esc(m.nombre)}</b>
        <span class="opcion__detalle">${esc(m.detalle)}</span>
      </span>
    </label>`).join('');

  const moneda = $('#p-moneda');
  MONEDAS.forEach((m) => moneda.add(new Option(m.nombre, m.id)));
  moneda.value = estado.precio.moneda;

  // Toda modalidad publica cifra: lo único que cambia es si además se
  // pide el mínimo privado con el que filtrar las ofertas.
  function pintarModalidad() {
    const valor = (grupo.querySelector('input:checked') || {}).value || 'fijo';
    estado.precio.modalidad = valor;
    $('#bloqueMinimo').hidden = valor !== 'ofertas';
    pintarVistaPrevia();
  }

  grupo.addEventListener('change', () => { pintarModalidad(); guardarBorrador(); });

  ['#p-monto', '#p-minimo'].forEach((sel) => {
    const campo = $(sel);
    campo.addEventListener('input', () => { campo.value = formatearMonto(campo.value); });
  });

  pintarModalidad();
}

function validarPrecio(seccion) {
  limpiarErrores(seccion);
  let ok = true;

  const monto = Number(soloDigitos($('#p-monto').value));
  ok = exigir($('#p-monto'), monto > 0, 'Indique el precio solicitado. Los anuncios sin cifra publicada reciben menos contactos calificados.') && ok;

  if (estado.precio.modalidad === 'ofertas' && $('#p-minimo').value.trim()) {
    const minimo = Number(soloDigitos($('#p-minimo').value));
    ok = exigir($('#p-minimo'), minimo > 0 && minimo <= monto,
      'El mínimo aceptable no puede superar el precio publicado.') && ok;
  }
  return ok;
}

/* ── Paso 4 · Contacto ──────────────────────────────────── */

function filaTelefonoHTML(tel, i) {
  return `<li class="telefono" data-i="${i}">
    <span class="telefono__ico">${icono('i-telefono')}</span>
    <label class="campo-v">
      <span class="visualmente-oculto">Número ${i + 1}</span>
      <input type="tel" class="tel-numero" value="${esc(tel.numero)}" placeholder="(809) 000-0000" autocomplete="tel">
    </label>
    <label class="campo-v">
      <span class="visualmente-oculto">Uso del número ${i + 1}</span>
      <select class="tel-tipo">
        ${TIPOS_CONTACTO.map((t) => `<option value="${esc(t.id)}"${t.id === tel.tipo ? ' selected' : ''}>${esc(t.nombre)}</option>`).join('')}
      </select>
    </label>
    <label class="campo-v">
      <span class="visualmente-oculto">Nota del número ${i + 1}</span>
      <input type="text" class="tel-nota" value="${esc(tel.nota)}" placeholder="Ej. Departamento de ventas">
    </label>
    <button type="button" class="telefono__quitar" data-quitar-tel aria-label="Quitar el número ${i + 1}"${i === 0 && estado.contacto.telefonos.length === 1 ? ' disabled' : ''}>${icono('i-equis')}</button>
  </li>`;
}

function pintarTelefonos() {
  const lista = $('#listaTelefonos');
  if (!lista) return;
  lista.innerHTML = estado.contacto.telefonos.map(filaTelefonoHTML).join('');
  $('#btnAgregarTelefono').disabled = estado.contacto.telefonos.length >= 5;
}

function leerTelefonos() {
  estado.contacto.telefonos = $$('#listaTelefonos .telefono').map((li) => ({
    numero: $('.tel-numero', li).value,
    tipo: $('.tel-tipo', li).value,
    nota: $('.tel-nota', li).value.trim(),
  }));
}

function montarPasoContacto() {
  const lista = $('#listaTelefonos');
  if (!lista) return;

  pintarTelefonos();

  $('#btnAgregarTelefono').addEventListener('click', () => {
    leerTelefonos();
    estado.contacto.telefonos.push({ numero: '', tipo: 'ambos', nota: '' });
    pintarTelefonos();
    const ultimo = $$('#listaTelefonos .tel-numero').pop();
    if (ultimo) ultimo.focus();
    guardarBorrador();
  });

  lista.addEventListener('input', (e) => {
    if (e.target.classList.contains('tel-numero')) {
      e.target.value = formatearTelefono(e.target.value);
    }
    leerTelefonos();
  });

  lista.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quitar-tel]');
    if (!btn) return;
    leerTelefonos();
    const i = Number(btn.closest('.telefono').dataset.i);
    estado.contacto.telefonos.splice(i, 1);
    if (!estado.contacto.telefonos.length) {
      estado.contacto.telefonos.push({ numero: '', tipo: 'ambos', nota: '' });
    }
    pintarTelefonos();
    guardarBorrador();
  });

  pintarIdentidad();
  pintarSucursales();
}

/* Desde qué sucursal se ofrece el equipo. Solo aparece si hay más de
   una: con una sola, preguntarlo es ruido y el servidor ya la asigna
   por defecto. */
function pintarSucursales() {
  const bloque = $('#bloqueSucursal');
  const sel = $('#c-sucursal');
  if (!bloque) return;

  const lista = (SESION.sucursales || []).filter((s) => s.activa !== 0);
  bloque.hidden = lista.length < 2;
  if (bloque.hidden) return;

  sel.innerHTML = lista.map((s) => {
    const donde = [s.municipio, s.provincia].filter(Boolean).join(', ');
    return `<option value="${esc(s.id)}"${s.principal ? ' selected' : ''}>${esc(s.nombre)}${donde ? ` — ${esc(donde)}` : ''}</option>`;
  }).join('');

  if (estado.contacto.sucursal && lista.some((s) => s.id === estado.contacto.sucursal)) {
    sel.value = estado.contacto.sucursal;
  }
  estado.contacto.sucursal = sel.value;
}

/* Quién firma el anuncio. Sale de la cuenta y no de un formulario:
   el RNC solo se enseña —y solo existe— para organizaciones de tipo
   dealer, y es el mismo que ya está asociado de forma permanente a la
   cuenta y que sostiene su página pública. */
function pintarIdentidad() {
  const caja = $('#identidadAnunciante');
  if (!caja) return;
  const org = SESION.organizacion;

  if (!haySesion()) {
    caja.className = 'identidad identidad--anonima';
    caja.innerHTML = `
      ${icono('i-usuario')}
      <span>
        <b>Publicará con una cuenta de TuEquipoRD.</b>
        Puede completar la ficha ahora y entrar al final: lo que escriba se guarda.
        La cuenta es lo que le permite después editar el anuncio, medir sus visitas y renovarlo.
      </span>`;
    return;
  }

  if (org.tipo === 'dealer') {
    caja.className = 'identidad identidad--dealer';
    caja.innerHTML = `
      <span class="identidad__sello">${icono('i-edificio')}</span>
      <span class="identidad__cuerpo">
        <b class="identidad__nombre">${esc(org.nombre)}
          ${org.verificada ? `<span class="pastilla pastilla--verde">${icono('i-check')} Verificado</span>` : ''}
        </b>
        <span class="identidad__meta">Cuenta de empresa · RNC <b class="num">${esc(org.rncMascara || '—')}</b></span>
        <span class="identidad__nota">${org.estadoRevision === 'aprobada'
    ? `El anuncio se publica bajo esta empresa y aparece en ${org.slug ? `<a href="dealer.html?d=${encodeURIComponent(org.slug)}">su página pública</a>` : 'su página pública'}.`
    : 'El anuncio se publica bajo esta empresa. Su página pública se activa cuando aprobemos la cuenta.'}</span>
      </span>`;
    return;
  }

  caja.className = 'identidad';
  caja.innerHTML = `
    <span class="identidad__sello">${icono('i-usuario')}</span>
    <span class="identidad__cuerpo">
      <b class="identidad__nombre">${esc(org.nombre)}</b>
      <span class="identidad__meta">Cuenta particular</span>
      <span class="identidad__nota">¿Comercializa maquinaria de forma habitual?
        <a href="panel.html">Registre el RNC de su empresa</a> para obtener página pública y perfil en el directorio.</span>
    </span>`;
}

function validarContacto(seccion) {
  limpiarErrores(seccion);
  leerTelefonos();
  let ok = true;

  ok = exigir($('#c-nombre'), $('#c-nombre').value.trim().length >= 3, 'Indique el nombre de la persona que atiende las llamadas.') && ok;
  ok = exigir($('#c-correo'), correoValido($('#c-correo').value), 'Indique un correo válido: allí se envían la factura y los avisos del anuncio.') && ok;

  const primero = $('#listaTelefonos .tel-numero');
  const validos = estado.contacto.telefonos.filter((t) => telefonoValido(t.numero));
  ok = exigir(primero, validos.length > 0, 'Registre al menos un teléfono operativo de 10 dígitos.') && ok;

  // Un número escrito a medias es un error, no un campo opcional vacío.
  $$('#listaTelefonos .telefono').forEach((li) => {
    const campo = $('.tel-numero', li);
    const valor = campo.value.trim();
    if (valor && !telefonoValido(valor)) {
      ok = exigir(campo, false, 'Número incompleto.') && ok;
    }
  });

  return ok;
}

/* ── Paso 5 · Plan ──────────────────────────────────────── */

/* Un solo distintivo por tarjeta, y un hueco de la misma altura
   cuando no lleva ninguno, para que todas las tarjetas alineen. */
function distintivoPlan(plan) {
  if (plan.enPromo) return '<span class="plan-op__cinta plan-op__cinta--promo">Sin costo</span>';
  if (plan.membresia) return '<span class="plan-op__cinta plan-op__cinta--membresia">Membresía</span>';
  if (plan.recomendado) return '<span class="plan-op__cinta">Más contratado</span>';
  return '<span class="plan-op__hueco" aria-hidden="true"></span>';
}

/* Precio y periodo de la tarjeta. Es lo único que cambia entre los
   dos modelos de cobro; el resto de la tarjeta es idéntico. */
function cifraPlan(plan) {
  if (plan.enPromo) {
    return { precio: 'Gratis', periodo: 'durante la promoción de lanzamiento', extra: null };
  }
  if (plan.membresia) {
    const ciclo = cicloPorId(estado.plan.ciclo);
    const mensual = mensualEquivalente(plan, ciclo.id);
    return {
      precio: pesos(precioMembresia(plan, ciclo.id)),
      periodo: ciclo.id === 'anual' ? 'al año, por adelantado' : 'al mes',
      extra: ciclo.id === 'anual'
        ? `Equivale a ${pesos(mensual)} al mes · ${MESES_GRATIS_ANUAL} meses sin costo`
        : 'Se renueva cada mes · sin permanencia',
    };
  }
  return {
    precio: pesos(precioPlan(plan, estado.plan.dias)),
    periodo: `vigencia de ${estado.plan.dias} días`,
    extra: null,
  };
}

function tarjetaPlanHTML(plan) {
  const elegido = plan.id === estado.plan.id;
  const cifra = cifraPlan(plan);
  const comp = plan.enPromo || plan.membresia ? null : comparativa(plan, estado.plan.dias);

  const cuantas = plan.publicaciones === null
    ? 'Anuncios ilimitados'
    : `${plan.publicaciones} ${plan.publicaciones === 1 ? 'anuncio activo' : 'anuncios activos'}`;

  return `<li>
    <label class="plan-op${elegido ? ' plan-op--elegido' : ''}${plan.recomendado ? ' plan-op--sugerido' : ''}${plan.membresia ? ' plan-op--membresia' : ''}">
      <input type="radio" name="plan" value="${esc(plan.id)}"${elegido ? ' checked' : ''}>
      <span class="plan-op__cabeza">
        ${distintivoPlan(plan)}
        <span class="plan-op__nombre">${esc(plan.nombre)}</span>
      </span>
      <span class="plan-op__precio num">${cifra.precio}</span>
      <span class="plan-op__periodo">${esc(cifra.periodo)}</span>
      ${cifra.extra ? `<span class="plan-op__extra">${esc(cifra.extra)}</span>` : ''}
      ${comp ? `<span class="plan-op__ahorro">${comp.texto}</span>` : ''}
      <span class="plan-op__cuantas">${esc(cuantas)}</span>
      <ul class="plan-op__incluye">
        ${plan.incluye.slice(0, 4).map((i) => `<li>${icono('i-check')} ${esc(i)}</li>`).join('')}
      </ul>
    </label>
  </li>`;
}

/* El mando de arriba a la derecha cambia según el plan elegido: la
   compra puntual se mide en días de vigencia y la membresía en ciclos
   de facturación. Son magnitudes distintas, así que no comparten
   control: se muestra el que aplica. */
function pintarMandoCobro() {
  const membresia = esMembresia();
  $('#duracionPublicacion').hidden = membresia;
  $('#cicloMembresia').hidden = !membresia;
  $('#notaMembresiaPlan').hidden = !membresia;
}

/* Los planes Dealer solo se ofrecen a cuentas de empresa con RNC
   registrado. A quien no lo es no se le esconden: se le enseña qué
   son y cómo acceder, que es información comercial útil. */
const planesOfrecidos = () => planesVisibles().filter((p) => !p.soloDealer || esDealer());

function pintarPlanes() {
  const cont = $('#planesSeleccion');
  if (!cont) return;
  cont.innerHTML = planesOfrecidos().map(tarjetaPlanHTML).join('');
  $('#invitacionDealer').hidden = esDealer();
  pintarMandoCobro();
  pintarResumenPedido();
  pintarFotos();
}

function montarPasoPlan() {
  const cont = $('#planesSeleccion');
  const mando = $('#duracionPublicacion');
  const ciclos = $('#cicloMembresia');
  if (!cont || !mando) return;

  $('#ahorro60Plan').textContent = `Ahorra ${ahorro60()} %`;
  $('#ahorroAnualPlan').textContent = `Ahorra ${ahorroAnual()} %`;
  mando.querySelectorAll('input').forEach((r) => { r.checked = Number(r.value) === estado.plan.dias; });
  ciclos.querySelectorAll('input').forEach((r) => { r.checked = r.value === estado.plan.ciclo; });

  mando.addEventListener('change', () => {
    const marcado = mando.querySelector('input:checked');
    estado.plan.dias = marcado ? Number(marcado.value) : 30;
    pintarPlanes();
    guardarBorrador();
  });

  ciclos.addEventListener('change', () => {
    const marcado = ciclos.querySelector('input:checked');
    estado.plan.ciclo = marcado ? marcado.value : 'mensual';
    pintarPlanes();
    guardarBorrador();
  });

  cont.addEventListener('change', (e) => {
    if (e.target.name !== 'plan') return;
    estado.plan.id = e.target.value;
    pintarPlanes();
    guardarBorrador();
  });

  // Un plan traído por la URL desde la portada llega ya marcado.
  const p = params();
  const pedidoUrl = p.get('plan') && planPorId(p.get('plan'));
  if (pedidoUrl) {
    const visible = planesVisibles().find((v) => v.id === pedidoUrl.id || v.nivel === pedidoUrl.nivel);
    if (visible) estado.plan.id = visible.id;
  }
  if (p.get('dias') === '60') estado.plan.dias = 60;
  if (p.get('ciclo') === 'anual') estado.plan.ciclo = 'anual';
  mando.querySelectorAll('input').forEach((r) => { r.checked = Number(r.value) === estado.plan.dias; });
  ciclos.querySelectorAll('input').forEach((r) => { r.checked = r.value === estado.plan.ciclo; });

  pintarPlanes();
}

function validarPlan(seccion) {
  if (!estado.plan.id) {
    avisoPaso(seccion, 'Seleccione el plan con el que desea publicar el anuncio.');
    return false;
  }
  avisoPaso(seccion, '');
  return true;
}

/* ── Paso 6 · Pago ──────────────────────────────────────── */

/* Marca de la tarjeta por prefijo. Solo sirve para rotularla en
   pantalla: la validación real la hace el procesador. */
function marcaTarjeta(numero) {
  const d = soloDigitos(numero);
  if (/^4/.test(d)) return 'Visa';
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return 'Mastercard';
  if (/^3[47]/.test(d)) return 'American Express';
  return '';
}

const esAmex = (numero) => /^3[47]/.test(soloDigitos(numero));

function formatearTarjeta(valor) {
  const d = soloDigitos(valor).slice(0, esAmex(valor) ? 15 : 16);
  const grupos = esAmex(valor) ? [4, 6, 5] : [4, 4, 4, 4];
  const salida = [];
  let i = 0;
  grupos.forEach((g) => {
    if (i < d.length) { salida.push(d.slice(i, i + g)); i += g; }
  });
  return salida.join(' ');
}

/* Algoritmo de Luhn: descarta números mal tecleados antes de gastar
   una llamada al procesador. No dice si la tarjeta tiene fondos. */
function luhn(numero) {
  const d = soloDigitos(numero);
  if (d.length < 13) return false;
  let suma = 0;
  let doble = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (doble) { n *= 2; if (n > 9) n -= 9; }
    suma += n;
    doble = !doble;
  }
  return suma % 10 === 0;
}

function vencimientoValido(valor) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(valor).trim());
  if (!m) return false;
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  const hoy = new Date();
  // Vale hasta el último día del mes indicado.
  return new Date(anio, mes, 1) > hoy;
}

const fechaCorta = (d) =>
  d.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });

function pintarResumenPago() {
  const caja = $('#resumenPago');
  const ped = pedido();
  if (!caja || !ped) return;

  // La compra puntual vence; la membresía renueva. Es la misma fecha
  // en el calendario y significa lo contrario, así que se rotula
  // distinto para que nadie confunda un corte con un cobro.
  let filaPeriodo;
  if (ped.membresia) {
    filaPeriodo = `
      <div><dt>Ciclo de facturación</dt><dd>${esc(ped.ciclo.nombre)}</dd></div>
      <div><dt>Cuota mensual equivalente</dt><dd class="num">${pesos(ped.mensual)}</dd></div>
      <div><dt>Próximo cargo</dt><dd class="num">${fechaCorta(ped.renueva)}</dd></div>`;
  } else {
    const vence = new Date();
    vence.setDate(vence.getDate() + ped.dias);
    filaPeriodo = `<div><dt>Vigencia</dt><dd class="num">${ped.dias} días · hasta el ${fechaCorta(vence)}</dd></div>`;
  }

  caja.innerHTML = `
    <h3 class="pedido__titulo">${ped.membresia ? 'Detalle de la membresía' : 'Detalle del cobro'}</h3>
    <dl class="pedido__lista">
      <div><dt>Plan</dt><dd>${esc(ped.plan.nombre)}${ped.membresia ? ' · membresía' : ''}</dd></div>
      ${filaPeriodo}
      <div><dt>Subtotal</dt><dd class="num">${pesos(ped.base)}</dd></div>
      <div><dt>ITBIS (${Math.round(ITBIS * 100)} %)</dt><dd class="num">${pesos(ped.itbis)}</dd></div>
      <div class="pedido__total"><dt>${ped.membresia ? 'Cargo de hoy' : 'Total a pagar'}</dt><dd class="num">${pesos(ped.total)}</dd></div>
    </dl>`;

  $('#bloquePago').hidden = ped.gratuito;
  $('#bloqueGratis').hidden = !ped.gratuito;
  pintarBloquesMembresia(ped);

  $('#btnPublicar').textContent = ped.gratuito
    ? 'Publicar anuncio'
    : ped.membresia
      ? `Activar membresía por ${pesos(ped.total)}`
      : `Pagar ${pesos(ped.total)} y publicar`;
}

/* La membresía se cobra sola cada ciclo, así que exige una tarjeta
   tokenizada: una transferencia no se puede repetir sin intervención
   del anunciante, y dejar que la contrate por esa vía sería prometer
   una renovación automática que no podríamos cumplir. */
function pintarBloquesMembresia(ped) {
  const membresia = ped.membresia && !ped.gratuito;

  $('#opcionTransferencia').hidden = membresia;
  $('#notaMembresiaPago').hidden = !membresia;
  $('#casillasCompra').hidden = membresia;

  if (membresia) {
    const formas = $('#formaPago');
    const tarjeta = formas.querySelector('input[value="tarjeta"]');
    if (tarjeta && !tarjeta.checked) {
      tarjeta.checked = true;
      estado.pago.forma = 'tarjeta';
      $('#bloqueTarjeta').hidden = false;
      $('#bloqueTransferencia').hidden = true;
    }
    // En membresía no son opcionales: se guardan por definición.
    $('#t-guardar').checked = true;
    $('#t-autorenovar').checked = true;
    estado.pago.guardar = true;
    estado.pago.autorenovar = true;

    $('#renovacionTexto').textContent =
      `Se cargarán ${pesos(ped.total)} cada ${ped.ciclo.id === 'anual' ? 'año' : 'mes'}, a partir del ${fechaCorta(ped.renueva)}.`;
  }
}

function montarPasoPago() {
  const formas = $('#formaPago');
  if (!formas) return;

  formas.addEventListener('change', () => {
    const valor = (formas.querySelector('input:checked') || {}).value || 'tarjeta';
    estado.pago.forma = valor;
    $('#bloqueTarjeta').hidden = valor !== 'tarjeta';
    $('#bloqueTransferencia').hidden = valor !== 'transferencia';
    guardarBorrador();
  });

  // Aceptar las condiciones retira el aviso de inmediato: dejarlo en
  // rojo después de cumplirlo confunde.
  $('#aceptaCondiciones').addEventListener('change', (e) => {
    if (e.target.checked) avisoPaso($('.paso[data-paso="pago"]'), '');
  });

  const numero = $('#t-numero');
  numero.addEventListener('input', () => {
    numero.value = formatearTarjeta(numero.value);
    const marca = marcaTarjeta(numero.value);
    $('#marcaTarjeta').textContent = marca;
    $('#t-cvv').maxLength = esAmex(numero.value) ? 4 : 3;
  });

  const exp = $('#t-exp');
  exp.addEventListener('input', () => {
    const d = soloDigitos(exp.value).slice(0, 4);
    exp.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  });

  $('#t-cvv').addEventListener('input', (e) => {
    e.target.value = soloDigitos(e.target.value).slice(0, esAmex(numero.value) ? 4 : 3);
  });
}

function validarPago(seccion) {
  limpiarErrores(seccion);
  const ped = pedido();
  if (!ped || ped.gratuito) return true;

  if (estado.pago.forma === 'transferencia') {
    return exigir($('#tr-referencia'), soloDigitos($('#tr-referencia').value).length >= 4,
      'Indique el número de referencia de la transferencia.');
  }

  let ok = true;
  ok = exigir($('#t-nombre'), $('#t-nombre').value.trim().length >= 5, 'Indique el nombre tal como aparece impreso en la tarjeta.') && ok;
  ok = exigir($('#t-numero'), luhn($('#t-numero').value), 'Verifique el número de la tarjeta.') && ok;
  ok = exigir($('#t-exp'), vencimientoValido($('#t-exp').value), 'Vencimiento en formato MM/AA y posterior a hoy.') && ok;
  ok = exigir($('#t-cvv'), soloDigitos($('#t-cvv').value).length >= 3, 'Código de seguridad incompleto.') && ok;
  return ok;
}

/* El cobro ya no se simula aquí: lo resuelve el servidor dentro de
   POST /api/anuncios, en la misma transacción que crea el anuncio.

   Cuando se conecte el procesador real (Azul o CardNET), estos campos
   de tarjeta se sustituyen por el iframe del procesador: devuelve un
   token, el token viaja al servidor en lugar del número, y el sitio
   nunca llega a tocar el PAN. La validación de Luhn de más arriba se
   queda igual porque solo evita gastar una llamada con un número mal
   tecleado. */

/* ── Publicación ────────────────────────────────────────── */

/* El borrador, con la forma que espera POST /api/anuncios. El precio
   del plan NO viaja: lo calcula el servidor a partir del plan y del
   ciclo, para que nadie pueda publicar un Dealer Premium por cero
   editando la petición. */
function anuncioParaApi() {
  const e = estado.equipo;
  return {
    plan: estado.plan.id,
    dias: estado.plan.dias,
    ciclo: estado.plan.ciclo,

    categoria: e.categoria,
    subcategoria: e.subcategoria,
    marca: e.marca,
    modelo: e.modelo,
    anio: Number(e.anio),
    condicion: e.condicion,
    usoValor: Number(soloDigitos(e.uso)) || null,
    usoUnidad: e.unidad,
    serie: e.serie,
    potencia: e.potencia,
    peso: e.peso,
    implementos: e.implementos,
    descripcion: e.descripcion,
    provincia: e.provincia,
    municipio: e.ciudad,

    precio: Number(soloDigitos(estado.precio.monto)) || null,
    moneda: estado.precio.moneda,
    modalidadPrecio: estado.precio.modalidad,
    precioMinimo: Number(soloDigitos(estado.precio.minimo)) || null,
    itbisIncluido: estado.precio.itbisIncluido,
    permuta: estado.precio.permuta,
    financiamiento: estado.precio.financiamiento,
    video: estado.video,

    // Van los dos tamaños: el catálogo pinta la miniatura y la ficha
    // la completa. Son rutas, no imágenes; las subió procesarImagen().
    fotos: estado.fotos.slice(0, limiteFotos()).map((f) => ({ url: f.url, miniatura: f.miniatura })),
    telefonos: estado.contacto.telefonos.filter((t) => telefonoValido(t.numero)),
    sucursal: estado.contacto.sucursal || null,
  };
}

function fechaVencimiento() {
  const d = new Date();
  d.setDate(d.getDate() + estado.plan.dias);
  return d;
}

function pintarConfirmacion(respuesta) {
  const ped = pedido();
  const anuncio = respuesta.anuncio;
  const cobro = respuesta.cobro;
  const susc = respuesta.suscripcion;
  const equipo = esc(`${anuncio.anio} ${anuncio.marca} ${anuncio.modelo}`);
  const membresia = susc && susc.modalidad === 'membresia';
  const cupo = susc && susc.anuncios_incluidos;

  const cabecera = membresia
    ? `<h2 class="publicado__titulo">${cobro ? 'Membresía activa' : 'Anuncio publicado'}</h2>
       <p class="publicado__texto">
         ${equipo} ya está visible en el catálogo. Con la membresía ${esc(ped.plan.nombre)} puede
         mantener ${cupo == null ? 'todos los anuncios que necesite' : `hasta ${cupo} anuncios activos`},
         y ninguno caduca mientras la membresía esté al día.
       </p>`
    : `<h2 class="publicado__titulo">Anuncio publicado</h2>
       <p class="publicado__texto">
         ${equipo} ya está visible en el catálogo y empieza a recibir contactos.
         ${anuncio.vence ? `La vigencia vence el ${fechaCorta(new Date(anuncio.vence))}.` : ''}
       </p>`;

  const filasCobro = cobro
    ? `<div><dt>Comprobante de pago</dt><dd class="num">${esc(cobro.referencia)}</dd></div>
       <div><dt>Monto liquidado</dt><dd class="num">${pesos(cobro.total)}</dd></div>
       ${membresia ? `<div><dt>Próximo cargo</dt><dd class="num">${fechaCorta(new Date(susc.proximo_cargo))}</dd></div>` : ''}`
    : `<div><dt>Costo</dt><dd>${membresia ? 'Incluido en su membresía activa' : 'Sin costo · promoción de lanzamiento'}</dd></div>`;

  $('#publicar').hidden = true;
  const caja = $('#publicado');
  caja.hidden = false;
  caja.innerHTML = `
    <div class="publicado__sello">${icono('i-check')}</div>
    ${cabecera}

    <dl class="publicado__datos">
      <div><dt>Referencia del anuncio</dt><dd class="num">${esc(anuncio.id.slice(0, 8).toUpperCase())}</dd></div>
      <div><dt>Plan</dt><dd>${esc(ped.plan.nombre)}${membresia ? ` · facturación ${esc(ped.ciclo.nombre.toLowerCase())}` : ` · ${ped.dias} días`}</dd></div>
      ${filasCobro}
      <div><dt>Fotografías publicadas</dt><dd class="num">${anuncio.fotos.length}</dd></div>
    </dl>

    <p class="publicado__nota">
      Enviamos la confirmación y la factura a <b>${esc(estado.contacto.correo)}</b>.
      Desde <a href="panel.html">su panel</a> puede seguir las visitas del anuncio, pausarlo
      o marcarlo como vendido${membresia ? ', y administrar la membresía' : ''}.
    </p>

    <div class="acciones acciones--pie">
      <a class="btn btn--ambar btn--grande" href="equipo.html?id=${encodeURIComponent(anuncio.id)}">Ver el anuncio</a>
      <a class="btn btn--linea btn--grande" href="panel.html">Ir a mi panel</a>
      <a class="btn btn--linea btn--grande" href="publicar.html">Publicar otro equipo</a>
    </div>`;
  caja.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Publica de verdad: la petición lleva la ficha y el plan elegido, y
   el servidor cobra y crea el anuncio en una sola transacción. Si no
   hay sesión, se guarda el borrador y se manda a crear la cuenta:
   volverá aquí con todo lo escrito intacto. */
async function publicar() {
  const btn = $('#btnPublicar');
  const seccion = $('.paso[data-paso="pago"]');
  const ped = pedido();
  if (!ped) return;

  if (!haySesion()) {
    guardarBorrador();
    location.href = 'cuenta.html?destino=publicar.html&crear=1';
    return;
  }

  btn.disabled = true;
  btn.classList.add('btn--ocupado');
  btn.textContent = ped.gratuito ? 'Publicando…'
    : ped.membresia ? 'Activando la membresía…' : 'Procesando el pago…';

  const restaurar = (mensaje) => {
    btn.disabled = false;
    btn.classList.remove('btn--ocupado');
    avisoPaso(seccion, mensaje);
    pintarResumenPago();
    seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  try {
    const respuesta = await api('/anuncios', { metodo: 'POST', cuerpo: anuncioParaApi() });
    // El anuncio solo existe si el servidor confirmó el cobro.
    if (!respuesta) return restaurar('No hay conexión con el servidor. Vuelva a intentarlo; su borrador está guardado.');
    borrarBorrador();
    pintarConfirmacion(respuesta);
  } catch (e) {
    restaurar(e.message);
  }
}

/* ── Vista previa y resumen lateral ─────────────────────── */

function textoPrecioPreview() {
  const monto = Number(soloDigitos(estado.precio.monto));
  if (!monto) return 'Precio pendiente';
  return montoConMoneda(estado.precio.monto, estado.precio.moneda);
}

function pintarVistaPrevia() {
  const caja = $('#vistaPrevia');
  if (!caja) return;

  const e = estado.equipo;
  const titulo = [e.anio, e.marca, e.modelo].filter(Boolean).join(' ') || 'Tu equipo';
  const uso = soloDigitos(e.uso) ? `${miles(Number(soloDigitos(e.uso)))} ${e.unidad}` : 'Uso pendiente';
  const plan = planElegido();

  caja.innerHTML = `
    <p class="vista-previa__rotulo">${icono('i-buscar')} Así se verá en el catálogo</p>
    <div class="aviso aviso--previa">
      <span class="aviso__foto">
        ${plan && plan.nivel !== 'estandar' ? '<span class="marca-esq">Destacado</span>' : ''}
        ${estado.fotos.length
          ? `<img src="${esc(estado.fotos[0].url)}" alt="Portada del anuncio">`
          : icono('i-hex-doble', 'fantasma')}
      </span>
      <span class="aviso__nombre">${esc(titulo)}</span>
      <span class="aviso__specs num">${esc(uso)}${e.provincia ? ` · ${esc(e.provincia)}` : ''}</span>
      <span class="aviso__precio num">${esc(textoPrecioPreview())}</span>
      ${estado.precio.modalidad === 'ofertas' ? '<span class="pastilla pastilla--ambar">Acepta ofertas</span>' : ''}
    </div>
    ${e.subcategoria ? `<p class="vista-previa__nota">${esc(nombreCategoria(e.categoria))} · ${esc(e.subcategoria)}</p>` : ''}`;
}

function pintarResumenPedido() {
  const caja = $('#resumenPedido');
  if (!caja) return;
  const ped = pedido();

  if (!ped) {
    caja.innerHTML = `
      <p class="pedido__vacio">${icono('i-etiqueta')} Seleccione un plan en el paso 5 para ver el costo de la publicación.</p>`;
    return;
  }

  caja.innerHTML = `
    <h3 class="pedido__titulo">${ped.membresia ? 'Resumen de la membresía' : 'Resumen del pedido'}</h3>
    <dl class="pedido__lista">
      <div><dt>${esc(ped.plan.nombre)}</dt><dd class="num">${ped.gratuito ? 'Gratis' : pesos(ped.base)}</dd></div>
      ${ped.membresia
        ? `<div><dt>Facturación</dt><dd>${esc(ped.ciclo.nombre)}</dd></div>
           <div><dt>Próximo cargo</dt><dd class="num">${fechaCorta(ped.renueva)}</dd></div>`
        : `<div><dt>Vigencia</dt><dd class="num">${ped.dias} días</dd></div>`}
      ${ped.gratuito ? '' : `<div><dt>ITBIS</dt><dd class="num">${pesos(ped.itbis)}</dd></div>`}
      <div class="pedido__total"><dt>${ped.membresia ? 'Cargo de hoy' : 'Total'}</dt><dd class="num">${ped.gratuito ? 'RD$0' : pesos(ped.total)}</dd></div>
    </dl>`;
}

/* ── Navegación entre pasos ─────────────────────────────── */

const VALIDADORES = {
  equipo: validarEquipo,
  fotos: validarFotos,
  precio: validarPrecio,
  contacto: validarContacto,
  plan: validarPlan,
  pago: validarPago,
};

function pintarPasos() {
  const nav = $('#pasosNav');
  nav.innerHTML = PASOS.map((p, i) => `
    <li class="pasos__it${i === estado.paso ? ' pasos__it--activo' : ''}${i < estado.paso ? ' pasos__it--hecho' : ''}">
      <button type="button" class="pasos__btn" data-ir="${i}"${i > estado.paso ? ' disabled' : ''}
        ${i === estado.paso ? 'aria-current="step"' : ''}>
        <span class="pasos__num num">${i < estado.paso ? '✓' : i + 1}</span>
        <span class="pasos__cuerpo">
          <b>${esc(p.nombre)}</b>
          <span>${esc(p.detalle)}</span>
        </span>
      </button>
    </li>`).join('');

  $$('.paso').forEach((s) => { s.hidden = s.dataset.paso !== PASOS[estado.paso].id; });

  const ultimo = estado.paso === PASOS.length - 1;
  $('#btnAtras').hidden = estado.paso === 0;
  $('#btnSiguiente').hidden = ultimo;
  $('#btnPublicar').hidden = !ultimo;
  $('#progresoTexto').textContent = `Paso ${estado.paso + 1} de ${PASOS.length}`;
  $('#progresoBarra').style.setProperty('--avance', `${((estado.paso + 1) / PASOS.length) * 100}%`);

  if (ultimo) pintarResumenPago();
}

function irAPaso(i) {
  estado.paso = Math.max(0, Math.min(PASOS.length - 1, i));
  pintarPasos();
  guardarBorrador();
  const caja = $('#publicar');
  if (caja.getBoundingClientRect().top < 0) caja.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Vuelca los campos del paso visible al estado. Se hace al avanzar y
   no en cada tecla: el borrador se guarda igual y el DOM no se toca
   más de lo necesario. */
function leerPaso(id) {
  if (id === 'equipo') {
    Object.assign(estado.equipo, {
      categoria: $('#e-categoria').value,
      subcategoria: $('#e-subcategoria').value,
      marca: $('#e-marca').value,
      modelo: $('#e-modelo').value.trim(),
      anio: $('#e-anio').value,
      condicion: $('#e-condicion').value,
      uso: $('#e-uso').value,
      unidad: $('#e-unidad').value,
      serie: $('#e-serie').value.trim(),
      potencia: $('#e-potencia').value.trim(),
      peso: $('#e-peso').value.trim(),
      provincia: $('#e-provincia').value,
      ciudad: $('#e-ciudad').value.trim(),
      implementos: $('#e-implementos').value.trim(),
      descripcion: $('#e-descripcion').value.trim(),
    });
  } else if (id === 'fotos') {
    estado.video = $('#e-video').value.trim();
  } else if (id === 'precio') {
    Object.assign(estado.precio, {
      monto: $('#p-monto').value,
      moneda: $('#p-moneda').value,
      minimo: $('#p-minimo').value,
      itbisIncluido: $('#p-itbis').checked,
      permuta: $('#p-permuta').checked,
      financiamiento: $('#p-financiamiento').checked,
    });
  } else if (id === 'contacto') {
    leerTelefonos();
    Object.assign(estado.contacto, {
      nombre: $('#c-nombre').value.trim(),
      correo: $('#c-correo').value.trim(),
      sucursal: $('#c-sucursal').value,
      horario: $('#c-horario').value,
      web: $('#c-web').value.trim(),
      preferencia: $('#c-preferencia').value,
    });
  } else if (id === 'pago') {
    estado.pago.guardar = $('#t-guardar').checked;
    estado.pago.autorenovar = $('#t-autorenovar').checked;
  }
}

/* Vuelve a poner el borrador en los campos al recargar la página. */
function volcarEstadoAlFormulario() {
  const e = estado.equipo;
  $('#e-categoria').value = e.categoria;
  $('#e-modelo').value = e.modelo;
  $('#e-anio').value = e.anio;
  $('#e-uso').value = e.uso;
  $('#e-unidad').value = e.unidad;
  $('#e-serie').value = e.serie;
  $('#e-potencia').value = e.potencia;
  $('#e-peso').value = e.peso;
  $('#e-ciudad').value = e.ciudad;
  $('#e-implementos').value = e.implementos;
  $('#e-descripcion').value = e.descripcion;
  $('#e-video').value = estado.video;
  // marca, provincia y condición se llenan por script: se asignan
  // después de que app.js haya poblado sus <option>.
  $('#e-marca').value = e.marca;
  $('#e-provincia').value = e.provincia;
  $('#e-condicion').value = e.condicion;

  $('#p-monto').value = estado.precio.monto;
  $('#p-minimo').value = estado.precio.minimo;
  $('#p-itbis').checked = estado.precio.itbisIncluido;
  $('#p-permuta').checked = estado.precio.permuta;
  $('#p-financiamiento').checked = estado.precio.financiamiento;

  const c = estado.contacto;
  $('#c-nombre').value = c.nombre;
  $('#c-correo').value = c.correo;
  $('#c-horario').value = c.horario;
  $('#c-web').value = c.web;
  $('#c-preferencia').value = c.preferencia;

  $('#t-guardar').checked = estado.pago.guardar;
  $('#t-autorenovar').checked = estado.pago.autorenovar;
}

/* ── Arranque ───────────────────────────────────────────── */

async function montarPublicador() {
  const caja = $('#publicar');
  if (!caja) return;

  // La sesión decide qué planes se ofrecen y qué identidad firma el
  // anuncio; las tarifas vienen del servidor, que es quien cobra. Las
  // dos cosas se resuelven ANTES de pintar: si las tarjetas de plan se
  // dibujaran con los precios del archivo local, podrían anunciar un
  // importe distinto del que se cobra al confirmar.
  await Promise.all([cargarSesion(), cargarPlanes()]);
  montarPromo();

  const guardado = leerBorrador();
  if (guardado) {
    estado = guardado;
    estado.paso = 0;    // se retoma desde el principio, con todo lleno
  }

  montarPasoEquipo();
  montarPasoFotos();
  montarPasoPrecio();
  montarPasoContacto();
  montarPasoPlan();
  montarPasoPago();

  if (guardado) {
    volcarEstadoAlFormulario();
    // El change repuebla las subcategorías de la categoría guardada;
    // su manejador limpia la elección, así que se repone después.
    const sub = estado.equipo.subcategoria;
    $('#e-categoria').dispatchEvent(new Event('change'));
    estado.equipo.subcategoria = sub;
    $('#e-subcategoria').value = sub;
    $('#avisoBorrador').hidden = false;
  }

  // Los datos de contacto se rellenan con los de la cuenta: nadie
  // debería reescribir su propio nombre y correo en cada anuncio.
  if (haySesion()) {
    if (!$('#c-nombre').value) $('#c-nombre').value = SESION.usuario.nombre;
    if (!$('#c-correo').value) $('#c-correo').value = SESION.usuario.correo;
    if (!$('#listaTelefonos .tel-numero').value && SESION.usuario.telefono) {
      $('#listaTelefonos .tel-numero').value = formatearTelefono(SESION.usuario.telefono);
      leerTelefonos();
    }
  }

  $('#btnSiguiente').addEventListener('click', () => {
    const id = PASOS[estado.paso].id;
    const seccion = $(`.paso[data-paso="${id}"]`);
    leerPaso(id);
    if (!VALIDADORES[id](seccion)) {
      const primero = $('[aria-invalid], .paso__aviso', seccion);
      if (primero) primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    irAPaso(estado.paso + 1);
  });

  $('#btnAtras').addEventListener('click', () => {
    leerPaso(PASOS[estado.paso].id);
    irAPaso(estado.paso - 1);
  });

  $('#pasosNav').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ir]');
    if (!btn || btn.disabled) return;
    leerPaso(PASOS[estado.paso].id);
    irAPaso(Number(btn.dataset.ir));
  });

  $('#btnPublicar').addEventListener('click', () => {
    const seccion = $('.paso[data-paso="pago"]');
    leerPaso('pago');
    if (!$('#aceptaCondiciones').checked) {
      avisoPaso(seccion, 'Debe aceptar las condiciones de publicación antes de continuar.');
      return;
    }
    if (!validarPago(seccion)) return;
    avisoPaso(seccion, '');
    publicar();
  });

  $('#btnDescartar').addEventListener('click', () => {
    borrarBorrador();
    location.href = 'publicar.html';
  });

  // La vista previa se actualiza mientras se escribe la ficha, y el
  // error de un campo desaparece en cuanto se corrige: mantenerlo en
  // rojo mientras se teclea la solución es ruido.
  caja.addEventListener('input', (ev) => {
    const contenedor = ev.target.closest('.campo-v--error, .campo-grupo');
    if (contenedor && contenedor.classList.contains('campo-v--error')) {
      contenedor.classList.remove('campo-v--error');
      const aviso = contenedor.querySelector('.campo-v__error');
      if (aviso) aviso.remove();
      ev.target.removeAttribute('aria-invalid');
    }
    leerPaso(PASOS[estado.paso].id);
    pintarVistaPrevia();
  });
  caja.addEventListener('change', () => {
    leerPaso(PASOS[estado.paso].id);
    pintarVistaPrevia();
    guardarBorrador();
  });

  // Enter no debe disparar un envío: el flujo lo manda la botonera.
  $('#formPublicar').addEventListener('submit', (ev) => ev.preventDefault());

  pintarPasos();
  pintarVistaPrevia();
  pintarResumenPedido();
}

document.addEventListener('DOMContentLoaded', montarPublicador);
