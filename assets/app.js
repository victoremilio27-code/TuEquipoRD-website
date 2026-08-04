/* ═══════════════════════════════════════════════════════════
   TuEquipoRD · Render y comportamiento
   Depende de assets/data.js. Sin librerías.
   ═══════════════════════════════════════════════════════════ */

/* ── Iconografía ────────────────────────────────────────── */

/* Trazo de 1.75 px con esquinas y remates redondeados, según la guía.
   Se inyecta una sola vez para no repetir el sprite en cada página. */
const SPRITE = `
<symbol id="i-hex" viewBox="0 0 24 26"><path d="M12 1 22.4 7v12L12 25 1.6 19V7z"/></symbol>
<symbol id="i-hex-doble" viewBox="0 0 24 26"><path d="M12 1 22.4 7v12L12 25 1.6 19V7z"/><path d="M12 8.2 17.2 11v6L12 19.8 6.8 17v-6z"/></symbol>
<symbol id="i-excavadora" viewBox="0 0 24 24"><path d="M3 19.5h11"/><path d="M4 13h6.5v3.8H4z"/><path d="m10.5 14 4.4-5.6 3.8 1.8"/><path d="M17.4 12.6 21 11.2l-.9 4.6h-3.4z"/></symbol>
<symbol id="i-retro" viewBox="0 0 24 24"><circle cx="7" cy="17.5" r="2.6"/><circle cx="17.5" cy="17.5" r="2.6"/><path d="M4.5 14V9.5h7V14"/><path d="m11.5 11 4-4.5 3.5 2"/><path d="M18.5 9.5 22 8.2v4.3"/></symbol>
<symbol id="i-cargador" viewBox="0 0 24 24"><circle cx="8" cy="17.5" r="2.6"/><circle cx="17" cy="17.5" r="2.6"/><path d="M6 14V9h8v5"/><path d="m6 11-3 1.5v3.2h1.6"/><path d="M2 12.5 1.5 16h3"/></symbol>
<symbol id="i-volteo" viewBox="0 0 24 24"><circle cx="7" cy="17.5" r="2.4"/><circle cx="16.5" cy="17.5" r="2.4"/><path d="M3.5 15V9.5h5V15"/><path d="m9 15 1.5-7.5h9L21 15z"/></symbol>
<symbol id="i-grua" viewBox="0 0 24 24"><path d="M6 20V4"/><path d="M6 4h13"/><path d="M16 4v5"/><path d="M14.2 9h3.6l-1 3h-1.6z"/><path d="M3.5 20h5"/><path d="M6 7.5 12 4"/></symbol>
<symbol id="i-rodillo" viewBox="0 0 24 24"><circle cx="7.5" cy="15" r="5"/><circle cx="18" cy="17" r="3"/><path d="M11 10.5h5.5V14"/><path d="M12.5 10.5V7.5h4"/></symbol>
<symbol id="i-montacargas" viewBox="0 0 24 24"><circle cx="7" cy="18" r="2.2"/><path d="M4 15.5V9h6.5v6.5"/><path d="M14 4v13"/><path d="M14 17h6.5"/><path d="M17 17V9"/></symbol>
<symbol id="i-generador" viewBox="0 0 24 24"><rect x="3" y="7.5" width="18" height="10.5" rx="2"/><path d="M12.8 10.2 10 13.8h3.2L11.8 16.5"/><path d="M6.5 5.5v2"/><path d="M17.5 5.5v2"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
<symbol id="i-buscar" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></symbol>
<symbol id="i-reloj" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21.5s6.5-6.1 6.5-11a6.5 6.5 0 1 0-13 0c0 4.9 6.5 11 6.5 11z"/><circle cx="12" cy="10.5" r="2.4"/></symbol>
<symbol id="i-etiqueta" viewBox="0 0 24 24"><path d="M3 11.5V4h7.5l10 10-7.5 7.5z"/><circle cx="7.5" cy="8" r="1.4"/></symbol>
<symbol id="i-calc" viewBox="0 0 24 24"><rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><path d="M8 7h8"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/></symbol>
<symbol id="i-barco" viewBox="0 0 24 24"><path d="M3 15.5 4.5 10h15L21 15.5"/><path d="M7.5 10V6.5h9V10"/><path d="M12 4v2.5"/><path d="M2.5 18.5c1.6 0 1.6 1.5 3.2 1.5s1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5 1.6 1.5 3.2 1.5"/></symbol>
<symbol id="i-llave" viewBox="0 0 24 24"><path d="M15.5 3.2a5.5 5.5 0 0 0-4.9 8l-7 7L5 20.5l1.5-1.5.9.9 1.6-1.6-.9-.9 1.4-1.4a5.5 5.5 0 1 0 6-12.8z"/><circle cx="16.4" cy="7.6" r="1.5"/></symbol>
<symbol id="i-flecha" viewBox="0 0 24 24"><path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></symbol>
<symbol id="i-lowboy" viewBox="0 0 24 24"><path d="M2 15.5h1.5"/><path d="M2 12.5h5.5V15.5"/><path d="M7.5 10.5h3l1.5 2v3"/><circle cx="6" cy="17.5" r="2"/><circle cx="15" cy="17.5" r="2"/><circle cx="19.5" cy="17.5" r="2"/><path d="M8 15.5h5"/><path d="M17 15.5h.5"/><path d="M12 15.5V13h10v2.5"/></symbol>
<symbol id="i-satelite" viewBox="0 0 24 24"><circle cx="12" cy="17" r="2.5"/><path d="M12 12.5a4.5 4.5 0 0 1 4.5 4.5"/><path d="M12 8a9 9 0 0 1 9 9"/><path d="M12 12.5A4.5 4.5 0 0 0 7.5 17"/><path d="M12 8a9 9 0 0 0-9 9"/></symbol>
<symbol id="i-ruta" viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M6 8.5v4a3.5 3.5 0 0 0 3.5 3.5h5"/><path d="M12.5 13.5 15.5 16l-3 2.5"/></symbol>
<symbol id="i-peso" viewBox="0 0 24 24"><path d="M5.5 8.5h13l1.5 11H4z"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0"/><path d="M12 3.5v2.5"/></symbol>
<symbol id="i-regla" viewBox="0 0 24 24"><rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M7 8v3"/><path d="M12 8v4"/><path d="M17 8v3"/></symbol>
<symbol id="i-camara" viewBox="0 0 24 24"><path d="M3 8.5h3.5L8 6h8l1.5 2.5H21v10.5H3z"/><circle cx="12" cy="13" r="3.6"/></symbol>
<symbol id="i-subir" viewBox="0 0 24 24"><path d="M12 16.5V4"/><path d="m7 9 5-5 5 5"/><path d="M3.5 15v5.5h17V15"/></symbol>
<symbol id="i-tarjeta" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/><path d="M6 15h4"/></symbol>
<symbol id="i-candado" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></symbol>
<symbol id="i-telefono" viewBox="0 0 24 24"><path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/></symbol>
<symbol id="i-correo" viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/></symbol>
<symbol id="i-mas" viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></symbol>
<symbol id="i-equis" viewBox="0 0 24 24"><path d="m6 6 12 12"/><path d="m18 6-12 12"/></symbol>
<symbol id="i-estrella" viewBox="0 0 24 24"><path d="m12 3.5 2.7 5.6 6 .9-4.4 4.3 1.1 6.2L12 17.6l-5.4 2.9 1.1-6.2L3.3 10l6-.9z"/></symbol>
<symbol id="i-aviso" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5"/><path d="M12 16.3h.01"/></symbol>
<symbol id="i-usuario" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></symbol>
<symbol id="i-grafico" viewBox="0 0 24 24"><path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 20v-6"/><path d="M13 20V8"/><path d="M18 20v-9"/></symbol>
<symbol id="i-ojo" viewBox="0 0 24 24"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></symbol>
<symbol id="i-pausa" viewBox="0 0 24 24"><path d="M9 5v14"/><path d="M15 5v14"/></symbol>
<symbol id="i-edificio" viewBox="0 0 24 24"><path d="M4 21V5.5L13 3v18"/><path d="M13 9h7v12"/><path d="M7.5 8h2M7.5 12h2M7.5 16h2M16 13h1.5M16 17h1.5"/></symbol>
`;

function inyectarSprite() {
  if (document.getElementById('sprite-tuequipord')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'sprite-tuequipord';
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.display = 'none';
  svg.innerHTML = SPRITE;
  document.body.prepend(svg);
}

/* Se llama de una vez: app.js va al final del <body>, así el sprite
   existe antes de que el navegador pinte los <use> del HTML estático. */
if (document.body) inyectarSprite();

/* ── Utilidades ─────────────────────────────────────────── */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const miles = (n) => Number(n).toLocaleString('en-US');
const pesos = (n) => 'RD$' + miles(Math.round(n));

const fmtUso = (uso) => `${miles(uso.valor)} ${uso.unidad}`;

/* Un anuncio puede publicarse sin cifra (precio a consultar) o en
   dólares. Toda la interfaz rotula el precio por aquí para que los
   tres casos se lean igual. */
function precioTexto(e) {
  if (e.precio == null) return 'Precio a consultar';
  const simbolo = e.moneda === 'USD' ? 'US$' : 'RD$';
  return simbolo + miles(Math.round(e.precio));
}

/* El anuncio guarda el id de la marca; el servidor añade el nombre
   visible en `marca_nombre`. Se cae al id por si llega un anuncio
   antiguo sin decorar. */
const nombreEquipo = (e) => `${e.anio} ${e.marca_nombre || e.marca} ${e.modelo}`;

const nombreCategoria = (id) =>
  (CATEGORIAS.find((c) => c.id === id) || {}).nombre || id;

const iconoCategoria = (id) =>
  (CATEGORIAS.find((c) => c.id === id) || {}).icono || 'i-hex';

const fechaLarga = (iso) => {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
};

const params = () => new URLSearchParams(location.search);

/* ── Catálogo ───────────────────────────────────────────────
   TODO lo que se muestra sale de la base de datos a través de /api.
   No hay inventario de ejemplo en el cliente: si no hay nada
   publicado, cada bloque lo dice y ofrece publicar. Un marketplace no
   puede anunciar equipos que no existen ni contar en la portada
   anuncios que nadie puso.
   ────────────────────────────────────────────────────────── */

/* Cifras vivas del catálogo: total de anuncios, cuántos van
   destacados, cuántos anunciantes y el conteo por categoría, marca y
   provincia. Se piden una vez por carga y las comparten todos los
   bloques de la página. */
let ESTADISTICAS = {
  anuncios: 0, anunciantes: 0, destacados: 0, dealers: 0,
  categorias: [], marcas: [], provincias: [],
};

async function cargarEstadisticas() {
  const datos = await api('/estadisticas', { silencioso: true });
  if (datos) ESTADISTICAS = datos;
  return ESTADISTICAS;
}

/* Quien compra solo ve marcas con al menos un equipo publicado: una
   marca sin inventario que devuelve cero resultados es una vía muerta.
   Quien vende ve, en cambio, las que fabrican el tipo de equipo que
   está publicando; de eso se encarga publicar.js con la taxonomía. */
const marcasConEquipos = () => ESTADISTICAS.marcas;

/* Nombre visible de una marca que el catálogo conoce, o null si no
   hay ningún equipo publicado de ella. */
const nombreMarcaCatalogo = (id) => {
  const m = ESTADISTICAS.marcas.find((x) => x.marca === id);
  return m ? (m.marca_nombre || m.marca) : null;
};

function conteoCategorias() {
  const cuenta = new Map(ESTADISTICAS.categorias.map((c) => [c.categoria, c.total]));
  return CATEGORIAS
    .map((c) => ({ ...c, total: cuenta.get(c.id) || 0 }))
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
}

/* ── Orden de los resultados ────────────────────────────────
   Los identificadores son los mismos que entiende el servidor
   (ORDENES_SQL en tools/db.js). Aquí solo vive el rótulo: ordenar es
   trabajo de la base, que es la única que ve el catálogo entero. */
const ORDENES = [
  { id: 'destacados',  etiqueta: 'Destacados primero' },
  { id: 'recientes',   etiqueta: 'Publicación más reciente' },
  { id: 'precio-asc',  etiqueta: 'Precio: de menor a mayor' },
  { id: 'precio-desc', etiqueta: 'Precio: de mayor a menor' },
  { id: 'anio-desc',   etiqueta: 'Año: del más reciente al más antiguo' },
  { id: 'anio-asc',    etiqueta: 'Año: del más antiguo al más reciente' },
  { id: 'uso-asc',     etiqueta: 'Horas de uso: de menor a mayor' },
  { id: 'uso-desc',    etiqueta: 'Horas de uso: de mayor a menor' },
];

const ORDEN_POR_DEFECTO = 'destacados';

/* Pide una página del catálogo. Devuelve siempre la misma forma, de
   modo que quien pinta no tiene que distinguir "sin resultados" de
   "servidor caído": ambos casos traen la lista vacía. */
async function buscarEquipos(parametros = {}) {
  const q = new URLSearchParams();
  Object.entries(parametros).forEach(([k, v]) => { if (v) q.set(k, v); });
  const datos = await api(`/anuncios${q.toString() ? '?' + q : ''}`, { silencioso: true });
  if (!datos) return { anuncios: [], total: 0, pagina: 1, paginas: 1, caido: true };
  return { ...datos, anuncios: datos.anuncios.map(anuncioDeApi) };
}

/* ── Plantillas ─────────────────────────────────────────── */

const icono = (id, clase = 'ico') =>
  `<svg class="${clase}" aria-hidden="true"><use href="#${id}"/></svg>`;

const foto = (e, claseFantasma = 'fantasma') => e.foto
  ? `<img src="${esc(e.foto)}" alt="${esc(nombreEquipo(e))}" loading="lazy">`
  : icono('i-hex-doble', claseFantasma);

/* Tarjeta del catálogo. Lleva lo que decide un clic en este mercado:
   qué máquina es, cuánto ha trabajado, en qué estado está, dónde se
   encuentra y a cuánto. El número de fotos y el sello de verificado
   van en la imagen porque son las dos señales de confianza que separan
   un anuncio serio de uno improvisado. */
function avisoHTML(e) {
  const ubicacion = [e.municipio, e.provincia].filter(Boolean).join(', ') || 'República Dominicana';
  return `<li class="aviso"><a href="equipo.html?id=${encodeURIComponent(e.id)}">
    <span class="aviso__foto">
      ${e.destacado ? '<span class="marca-esq">Destacado</span>' : ''}
      ${foto(e)}
      ${e.fotosTotal > 1 ? `<span class="aviso__fotos">${icono('i-camara')} ${e.fotosTotal}</span>` : ''}
    </span>
    <span class="aviso__nombre">${esc(nombreEquipo(e))}</span>
    <span class="aviso__specs num">${esc(fmtUso(e.uso))}${e.condicion ? ` · ${esc(e.condicion)}` : ''}</span>
    <span class="aviso__sitio">${icono('i-pin')} ${esc(ubicacion)}</span>
    <span class="aviso__pie">
      <span class="aviso__precio num">${precioTexto(e)}</span>
      ${e.ofertas ? '<span class="aviso__ofertas">Acepta ofertas</span>' : ''}
    </span>
    ${e.dealer && e.esEmpresa
      ? `<span class="aviso__vendedor">${esc(e.dealer)}${e.verificado ? ` ${icono('i-check', 'ico ico--sello')}` : ''}</span>`
      : '<span class="aviso__vendedor aviso__vendedor--particular">Vendedor particular</span>'}
  </a></li>`;
}

/* Fila compacta del panel Destacados: crece sin límite, la lista scrollea. */
function destacadoHTML(e) {
  return `<li><a class="dest" href="equipo.html?id=${encodeURIComponent(e.id)}">
    <span class="dest__foto">${foto(e, 'fantasma fantasma--sm')}</span>
    <span class="dest__cuerpo">
      <span class="dest__nombre">${esc(nombreEquipo(e))}</span>
      <span class="dest__meta num">${esc(fmtUso(e.uso))} · ${esc(e.condicion)} · ${esc(e.provincia)}</span>
      <span class="dest__fila">
        <span class="dest__precio num">${precioTexto(e)}</span>
        ${e.verificado ? `<span class="pastilla pastilla--verde">${icono('i-check')} Verificado</span>` : ''}
      </span>
    </span>
  </a></li>`;
}

function tipoHTML(c) {
  return `<li><a href="equipos.html?categoria=${encodeURIComponent(c.id)}">
    <span class="tipos__ico">${icono(c.icono)}</span> ${esc(c.nombre)}
    <b class="num">${c.total}</b>
  </a></li>`;
}

/* Una empresa del directorio. Todas vienen de la base con su `slug`,
   su conteo real de equipos activos y su sello, así que la tarjeta
   siempre lleva a una página que existe. */
function dealerHTML(d) {
  const total = d.equipos || 0;
  return `<li><a class="dealer" href="dealer.html?d=${encodeURIComponent(d.slug)}">
    <span class="dealer__sello">${icono('i-edificio')}</span>
    <span class="dealer__nombre">${esc(d.nombre)}</span>
    <span class="dealer__meta">${esc(d.provincia || 'República Dominicana')} · <span class="num">${total}</span> ${total === 1 ? 'equipo publicado' : 'equipos publicados'}</span>
    ${d.verificada ? `<span class="pastilla pastilla--verde">${icono('i-check')} Verificado</span>` : ''}
  </a></li>`;
}

/* ── Montaje por página ─────────────────────────────────── */

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

/* Bloque vacío con salida: nunca se deja un hueco mudo. Quien llega y
   no encuentra nada tiene que saber qué hacer a continuación. */
const vacioHTML = (texto, accion) =>
  `<li class="vacio-min">${esc(texto)}${accion ? ` <a href="${accion.href}">${esc(accion.texto)}</a>` : ''}</li>`;

async function montarDestacados() {
  const cont = $('#destacadosLista');
  if (!cont) return;

  const { anuncios } = await buscarEquipos({ destacados: '1', porPagina: 8 });
  cont.innerHTML = anuncios.length
    ? anuncios.map(destacadoHTML).join('')
    : vacioHTML('Todavía no hay equipos con plan destacado.',
      { href: 'publicar.html', texto: 'Destaque el suyo' });

  const cuenta = $('#destacadosCuenta');
  if (cuenta) cuenta.textContent = ESTADISTICAS.destacados;
}

/* Cifras del héroe. Se dibujan solo si hay algo que contar: anunciar
   "0 equipos publicados" en la primera pantalla es peor que no decir
   nada, y en apertura se sustituye por la invitación a publicar. */
function montarCifrasPortada() {
  const cont = $('#heroeCifras');
  if (!cont) return;

  const e = ESTADISTICAS;
  if (!e.anuncios) {
    cont.innerHTML = `<li class="heroe__apertura">Catálogo en apertura ·
      <a href="publicar.html">publique el primer equipo</a></li>`;
    return;
  }

  const cifras = [
    [e.anuncios, e.anuncios === 1 ? 'equipo publicado' : 'equipos publicados'],
    [e.anunciantes, e.anunciantes === 1 ? 'anunciante activo' : 'anunciantes activos'],
    [e.categorias.length, e.categorias.length === 1 ? 'categoría con inventario' : 'categorías con inventario'],
    [e.provincias.length, e.provincias.length === 1 ? 'provincia' : 'provincias del país'],
  ];
  cont.innerHTML = cifras
    .filter(([n]) => n > 0)
    .map(([n, rotulo]) => `<li><b class="num">${miles(n)}</b> ${esc(rotulo)}</li>`)
    .join('');
}

function montarTipos() {
  const cont = $('#tiposLista');
  if (!cont) return;
  const tope = Number(cont.dataset.top) || 5;
  const conteo = conteoCategorias().filter((c) => c.total > 0);

  cont.innerHTML = conteo.length
    ? conteo.slice(0, tope).map(tipoHTML).join('')
    : vacioHTML('Aún no hay equipos publicados en ninguna categoría.');

  const restantes = CATEGORIAS.length - Math.min(conteo.length, tope);
  const pie = $('#tiposResto');
  if (pie) {
    pie.textContent = restantes > 0
      ? `Ver las otras ${restantes} categorías →`
      : 'Ver todas las categorías →';
  }
}

function montarMarcas() {
  const cont = $('#marcasLista');
  if (!cont) return;
  const activas = marcasConEquipos();
  const bloque = cont.closest('.panel');

  // Sin marcas con inventario la tira no aporta nada y ocupa una
  // franja entera: se retira en vez de dejarla vacía.
  if (!activas.length) {
    if (bloque) bloque.hidden = true;
    return;
  }
  if (bloque) bloque.hidden = false;

  cont.innerHTML = activas
    .map(({ marca, total }) =>
      `<li><a href="equipos.html?marca=${encodeURIComponent(marca)}" title="${total} ${total === 1 ? 'equipo' : 'equipos'}">${esc(marca)}</a></li>`)
    .join('');
  const nota = $('#marcasNota');
  if (nota) {
    nota.textContent = `${activas.length} ${activas.length === 1 ? 'marca' : 'marcas'} con equipos publicados hoy`;
  }
}

async function montarRecientes() {
  const cont = $('#rejillaRecientes');
  if (!cont) return;
  const tope = Number(cont.dataset.tope) || 12;

  const { anuncios, caido } = await buscarEquipos({ orden: 'recientes', porPagina: tope });
  cont.innerHTML = anuncios.length
    ? anuncios.map(avisoHTML).join('')
    : `<li class="vacio-min vacio-min--ancho">${caido
      ? 'No pudimos cargar el catálogo. Actualice la página en un momento.'
      : 'Sea el primero en publicar. Su equipo aparecerá aquí y en los resultados de búsqueda.'}
      ${caido ? '' : '<a href="publicar.html">Publicar un equipo</a>'}</li>`;

  const total = $('#totalEquipos');
  if (total) {
    total.textContent = miles(ESTADISTICAS.anuncios);
    const rotulo = total.closest('.panel__meta');
    if (rotulo) {
      rotulo.innerHTML = ESTADISTICAS.anuncios
        ? `<span class="num">${miles(ESTADISTICAS.anuncios)}</span> ${ESTADISTICAS.anuncios === 1 ? 'equipo publicado' : 'equipos publicados'} de <span class="num">${ESTADISTICAS.anunciantes}</span> ${ESTADISTICAS.anunciantes === 1 ? 'anunciante' : 'anunciantes'}`
        : 'Catálogo en apertura';
    }
  }
}

/* Directorio de dealers. Solo empresas reales con perfil habilitado:
   inventar fichas de empresas para que el directorio se vea lleno le
   haría perder el tiempo a quien las contacte. */
async function montarDealers() {
  const cont = $('#dealersLista');
  if (!cont) return;

  const datos = await api('/dealers', { silencioso: true });
  const lista = (datos && datos.dealers) || [];

  cont.innerHTML = lista.length
    ? lista.map(dealerHTML).join('')
    : `<li class="vacio-min vacio-min--ancho">Todavía no hay empresas con perfil publicado.
        <a href="publicar.html?plan=dealer">Conozca la membresía Dealer</a></li>`;

  const cuenta = $('#dealersCuenta');
  if (cuenta) cuenta.textContent = lista.length;

  // El enlace "Ver los N dealers" no lleva a ningún sitio útil con el
  // directorio vacío, así que se apaga entero.
  const enlace = cont.parentElement && cont.parentElement.querySelector('.panel__meta');
  if (enlace && !lista.length) enlace.hidden = true;
}

/* Rótulos de la promoción de lanzamiento. La fecha sale del servidor;
   si no hay promoción viva, el aviso entero se retira en vez de
   quedarse anunciando algo que ya no rige. */
function montarPromo() {
  const fin = finPromoEstandar();
  $$('[data-promo-hasta]').forEach((el) => {
    const aviso = el.closest('.realce') || el;
    if (!fin) { aviso.hidden = true; return; }
    aviso.hidden = false;
    el.textContent = fechaLarga(fin);
  });
}

/* Rellena los <select> de marca, categoría y provincia.
   El selector de marca de quien PUBLICA no se arma aquí: lo encadena
   publicar.js a la subcategoría elegida. */
function montarSelects() {
  /* El filtro del catálogo solo ofrece marcas CON equipos publicados:
     una lista con las 146 del registro haría que casi toda elección
     devolviera cero resultados. */
  $$('select[data-marcas]').forEach((sel) => {
    marcasConEquipos().forEach((m) => sel.add(new Option(m.marca_nombre || m.marca, m.marca)));
  });
  $$('select[data-categorias]').forEach((sel) => {
    CATEGORIAS.forEach((c) => sel.add(new Option(c.nombre, c.id)));
  });
  $$('select[data-provincias]').forEach((sel) => {
    PROVINCIAS.forEach((p) => sel.add(new Option(p, p)));
  });
}

/* ── Buscador (index → equipos.html) ────────────────────── */

function montarBuscador() {
  const form = $('#buscador');
  if (!form) return;
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const q = new URLSearchParams();
    new FormData(form).forEach((valor, clave) => { if (valor) q.set(clave, valor); });
    location.href = 'equipos.html' + (q.toString() ? '?' + q : '');
  });
}

/* ── Resultados (equipos.html) ──────────────────────────── */

/* Campos que viajan en la URL. La URL es el estado de la búsqueda:
   se puede compartir, marcar y volver atrás con el botón del
   navegador, que es lo que se espera de un catálogo. */
const CAMPOS_BUSQUEDA = ['q', 'categoria', 'subcategoria', 'marca', 'provincia',
  'condicion', 'anioMin', 'anioMax', 'precioMin', 'precioMax', 'horasMax'];

const ROTULO_FILTRO = {
  q: 'Búsqueda', categoria: 'Categoría', subcategoria: 'Tipo', marca: 'Marca',
  provincia: 'Provincia', condicion: 'Condición', anioMin: 'Desde', anioMax: 'Hasta',
  precioMin: 'Desde', precioMax: 'Hasta', horasMax: 'Hasta',
};

/* Enlaces de paginación. Se muestran ventanas de cinco páginas para
   que la tira no crezca sin fin cuando haya cientos. */
function paginacionHTML({ pagina, paginas }) {
  if (paginas < 2) return '';

  const enlace = (n, texto, clase = '') => {
    const q = new URLSearchParams(location.search);
    if (n === 1) q.delete('pagina'); else q.set('pagina', n);
    return `<a class="paginacion__it ${clase}" href="equipos.html${q.toString() ? '?' + q : ''}"
      ${n === pagina ? 'aria-current="page"' : ''}>${texto}</a>`;
  };

  const desde = Math.max(1, Math.min(pagina - 2, paginas - 4));
  const hasta = Math.min(paginas, desde + 4);
  const numeros = [];
  for (let n = desde; n <= hasta; n++) numeros.push(enlace(n, String(n), 'paginacion__it--num'));

  return `
    ${pagina > 1 ? enlace(pagina - 1, '‹ Anterior') : '<span class="paginacion__it paginacion__it--inerte">‹ Anterior</span>'}
    ${desde > 1 ? '<span class="paginacion__it paginacion__it--puntos">…</span>' : ''}
    ${numeros.join('')}
    ${hasta < paginas ? '<span class="paginacion__it paginacion__it--puntos">…</span>' : ''}
    ${pagina < paginas ? enlace(pagina + 1, 'Siguiente ›') : '<span class="paginacion__it paginacion__it--inerte">Siguiente ›</span>'}`;
}

async function montarResultados() {
  const cont = $('#resultados');
  if (!cont) return;

  const p = params();
  const filtros = {};
  CAMPOS_BUSQUEDA.forEach((k) => { filtros[k] = p.get(k) || ''; });

  const form = $('#filtros');
  const mando = $('#ordenResultados');
  const vacio = $('#sinResultados');
  const resumen = $('#resumenBusqueda');

  // Devuelve los filtros al formulario para que se vean aplicados. Un
  // valor puede no estar entre las opciones (una marca sin inventario
  // hoy): se añade para que el campo no aparezca en blanco mintiendo
  // sobre lo que se está filtrando.
  if (form) {
    Object.entries(filtros).forEach(([k, v]) => {
      const campo = form.elements[k];
      if (!campo || !v) return;
      if (campo.tagName === 'SELECT' && ![...campo.options].some((o) => o.value === v)) {
        campo.add(new Option(v, v));
      }
      campo.value = v;
    });
    // La subcategoría depende de la categoría elegida.
    sincronizarSubcategorias(form, filtros.subcategoria);
    form.addEventListener('change', (ev) => {
      if (ev.target.name === 'categoria') sincronizarSubcategorias(form, '');
    });
  }

  if (mando) {
    ORDENES.forEach((o) => mando.add(new Option(o.etiqueta, o.id)));
    const pedido = p.get('orden');
    mando.value = ORDENES.some((o) => o.id === pedido) ? pedido : ORDEN_POR_DEFECTO;

    // El formulario de filtros arrastra el orden vigente al enviarse,
    // para no perderlo al refinar la búsqueda.
    const oculto = form && form.elements.orden;
    if (oculto) oculto.value = mando.value;

    mando.addEventListener('change', () => {
      const q = new URLSearchParams(location.search);
      if (mando.value === ORDEN_POR_DEFECTO) q.delete('orden');
      else q.set('orden', mando.value);
      q.delete('pagina');            // otro orden es otra primera página
      location.href = 'equipos.html' + (q.toString() ? '?' + q : '');
    });
  }

  // Los chips quitan un filtro conservando los demás y el orden.
  const chips = $('#chipsFiltros');
  const activos = Object.entries(filtros).filter(([, v]) => v);
  if (chips) {
    chips.innerHTML = activos.map(([k, v]) => {
      const q = new URLSearchParams(location.search);
      q.delete(k);
      q.delete('pagina');
      const valor = k === 'categoria' ? nombreCategoria(v)
        : /precio/i.test(k) ? pesos(v)
        : k === 'horasMax' ? `${miles(v)} h`
        : v;
      return `<a class="chip" href="equipos.html${q.toString() ? '?' + q : ''}"
        title="Quitar este filtro"><span class="chip__clave">${esc(ROTULO_FILTRO[k] || k)}</span>
        ${esc(valor)} <span aria-hidden="true">&times;</span>
        <span class="visualmente-oculto">Quitar filtro</span></a>`;
    }).join('');
    if (activos.length > 1) {
      chips.innerHTML += '<a class="chip chip--limpiar" href="equipos.html">Limpiar todo</a>';
    }
  }

  cont.setAttribute('aria-busy', 'true');
  const r = await buscarEquipos({ ...filtros, orden: p.get('orden'), pagina: p.get('pagina') });
  cont.setAttribute('aria-busy', 'false');

  if (resumen) {
    resumen.innerHTML = r.total
      ? `<b class="num">${miles(r.total)}</b> ${r.total === 1 ? 'equipo' : 'equipos'}${
        r.paginas > 1 ? ` <span class="resumen__pagina">· página ${r.pagina} de ${r.paginas}</span>` : ''}`
      : '<b class="num">0</b> equipos';
  }

  const paginacion = $('#paginacion');
  if (paginacion) paginacion.innerHTML = paginacionHTML(r);

  if (r.anuncios.length) {
    if (vacio) vacio.hidden = true;
    if (mando) mando.disabled = false;
    cont.innerHTML = r.anuncios.map(avisoHTML).join('');
    return;
  }

  cont.innerHTML = '';
  if (mando) mando.disabled = true;
  if (!vacio) return;
  vacio.hidden = false;

  const titulo = $('#sinResultadosTitulo');
  const texto = $('#sinResultadosTexto');
  if (r.caido) {
    titulo.textContent = 'No pudimos cargar el catálogo';
    texto.textContent = 'Hubo un problema de conexión con el servidor. Actualice la página en unos segundos.';
    return;
  }
  // Sin filtros aplicados no hay "criterios" que aflojar: el catálogo
  // está vacío, y decir lo contrario haría que el visitante buscara un
  // error suyo que no existe.
  if (!activos.length) {
    titulo.textContent = 'Todavía no hay equipos publicados';
    texto.textContent = 'El catálogo está en apertura. Si tiene maquinaria en venta, publicarla ahora la deja de primera ante los compradores que ya nos visitan.';
    return;
  }

  // Caso explícito: la marca existe en el registro pero nadie tiene
  // equipos de ella. Decirlo evita que se lea como un fallo del sitio.
  const registrada = filtros.marca && !!nombreMarcaCatalogo(filtros.marca);
  titulo.textContent = registrada
    ? `No hay equipos ${filtros.marca} publicados ahora mismo`
    : 'No encontramos equipos con esos criterios';
  texto.textContent = registrada
    ? `${filtros.marca} figura en nuestro registro de marcas, pero hoy no hay ninguna unidad publicada. Si dispone de una, puede publicarla y aparecerá en esta misma búsqueda.`
    : 'Quite algún filtro, amplíe el rango de años o de precio, o pruebe con menos palabras en la búsqueda.';
}

/* Rellena el desplegable de subcategorías con las de la categoría
   elegida. Sin categoría no se ofrece: listar los cuarenta tipos de
   las ocho familias juntas no ayuda a nadie a filtrar. */
function sincronizarSubcategorias(form, elegida) {
  const sel = form.elements.subcategoria;
  if (!sel) return;
  const categoria = form.elements.categoria ? form.elements.categoria.value : '';
  const cat = CATEGORIAS.find((c) => c.id === categoria);
  const lista = cat ? cat.subcategorias : [];

  sel.length = 1;
  lista.forEach((s) => sel.add(new Option(s.nombre, s.id)));
  sel.disabled = !lista.length;
  sel.value = elegida && lista.includes(elegida) ? elegida : '';

  const campo = sel.closest('.campo');
  if (campo) campo.hidden = !lista.length;
}

/* ── Detalle (equipo.html) ──────────────────────────────── */

/* Galería secundaria: solo la traen los anuncios publicados desde el
   asistente, que guardan todas sus fotos. Al pulsar una se intercambia
   con la principal. */
function galeriaHTML(e) {
  if (!Array.isArray(e.fotos) || e.fotos.length < 2) return '';
  return `<ul class="galeria" id="galeria">
    ${e.fotos.map((f, i) => `<li>
      <button type="button" class="galeria__it${i === 0 ? ' galeria__it--activa' : ''}" data-foto="${esc(f)}">
        <img src="${esc(f)}" alt="Fotografía ${i + 1} del equipo" loading="lazy">
      </button></li>`).join('')}
  </ul>`;
}

/* Medios de contacto declarados al publicar.

   Cada número se ofrece por los canales que el anunciante habilitó, y
   WhatsApp va como enlace propio con el mensaje ya redactado: en este
   mercado la mayoría de los contactos entran por ahí, y obligar a
   copiar el número a mano pierde la mitad de esas conversaciones. */
function contactosHTML(e) {
  const validos = (e.telefonos || []).filter((t) => t && t.numero);
  if (!validos.length) return '';

  // Los números dominicanos viajan a diez dígitos; WhatsApp los quiere
  // en formato internacional.
  const soloDigitos = (n) => String(n).replace(/\D/g, '');
  const internacional = (n) => {
    const d = soloDigitos(n);
    return d.length === 10 ? '1' + d : d;
  };
  const mensaje = encodeURIComponent(
    `Hola, le escribo por el ${nombreEquipo(e)} publicado en TuEquipoRD (${precioTexto(e)}).`);

  return `<div class="contactos">
    <p class="etiqueta etiqueta--bloque">Contacto directo con el anunciante</p>
    ${validos.map((t) => {
      const tipo = t.tipo || 'ambos';
      const llamada = tipo === 'llamadas' || tipo === 'ambos';
      const whats = tipo === 'whatsapp' || tipo === 'ambos';
      return `<div class="contactos__fila">
        <span class="contactos__num">
          <b class="num">${esc(t.numero)}</b>
          ${t.nota ? `<span class="contactos__nota">${esc(t.nota)}</span>` : ''}
        </span>
        <span class="contactos__acciones">
          ${llamada ? `<a class="contactos__it" data-canal="telefono" href="tel:+1${esc(soloDigitos(t.numero))}">
            ${icono('i-telefono')} Llamar</a>` : ''}
          ${whats ? `<a class="contactos__it contactos__it--whatsapp" data-canal="whatsapp" rel="noopener"
            href="https://wa.me/${esc(internacional(t.numero))}?text=${mensaje}">
            ${icono('i-telefono')} WhatsApp</a>` : ''}
        </span>
      </div>`;
    }).join('')}
  </div>`;
}

/* Ficha técnica. Solo se dibuja la fila que tiene dato: una tabla con
   la mitad de los campos en blanco parece una publicación incompleta
   aunque el anunciante haya puesto todo lo que aplica a su máquina. */
function fichaTecnicaHTML(e) {
  const filas = [
    ['Año', e.anio, 'num'],
    [e.uso.unidad === 'h' ? 'Horas de uso' : 'Kilometraje', e.uso.valor ? fmtUso(e.uso) : null, 'num'],
    ['Condición', e.condicion],
    ['Marca', `<a href="equipos.html?marca=${encodeURIComponent(e.marca)}">${esc(e.marca_nombre || e.marca)}</a>`, '', true],
    ['Modelo', e.modelo],
    ['Tipo', e.subcategoria_nombre || e.subcategoria],
    ['Motor', e.motor_marca ? `${e.motor_marca_nombre || e.motor_marca}${e.motor_modelo ? ` ${e.motor_modelo}` : ''}` : ''],
    ['Transmisión', e.transmision_marca ? `${e.transmision_marca_nombre || e.transmision_marca}${e.transmision_modelo ? ` ${e.transmision_modelo}` : ''}` : ''],
    ['Potencia', e.potencia, 'num'],
    ['Peso operativo', e.peso, 'num'],
    ['Ubicación', [e.municipio, e.provincia].filter(Boolean).join(', ')],
  ];
  return `<dl class="ficha-tecnica">
    ${filas.filter(([, valor]) => valor).map(([rotulo, valor, clase, crudo]) =>
      `<div><dt>${esc(rotulo)}</dt><dd class="${clase || ''}">${crudo ? valor : esc(valor)}</dd></div>`).join('')}
  </dl>`;
}

/* Condiciones comerciales que el anunciante marcó al publicar. Son las
   que responden las preguntas que si no se hacen por teléfono. */
function condicionesHTML(e) {
  const puntos = [
    e.ofertas && 'Evalúa ofertas sobre el precio publicado',
    e.permuta && 'Acepta permuta por otro equipo',
    e.financiamiento && 'El anunciante ofrece o gestiona financiamiento',
    e.itbisIncluido && 'Precio con ITBIS incluido',
  ].filter(Boolean);
  if (!puntos.length) return '';
  return `<ul class="detalle__condiciones">
    ${puntos.map((p) => `<li>${icono('i-check')} ${esc(p)}</li>`).join('')}
  </ul>`;
}

async function montarDetalle() {
  const cont = $('#detalle');
  if (!cont) return;

  const idPedido = params().get('id');

  // La ficha pide su anuncio entero —descripción, galería, teléfonos y
  // ficha técnica—, que es información que el listado no trae para no
  // cargar la rejilla con datos que allí no se ven.
  const datos = idPedido
    ? await api(`/anuncios/${encodeURIComponent(idPedido)}`, { silencioso: true })
    : null;
  const e = datos && datos.anuncio ? anuncioDeApi(datos.anuncio) : null;

  if (!e) {
    cont.innerHTML = `<div class="vacio">
      <h1 class="vacio__titulo">El anuncio ya no está disponible</h1>
      <p class="vacio__texto">Es posible que el equipo se haya vendido o que el anunciante retirara la publicación.</p>
      <a class="btn btn--ambar" href="equipos.html">Ver equipos publicados</a>
    </div>`;
    return;
  }

  document.title = `${nombreEquipo(e)} · TuEquipoRD`;

  cont.innerHTML = `
    <nav class="miga" aria-label="Ruta"><a href="index.html">Inicio</a> › <a href="equipos.html?categoria=${e.categoria}">${esc(nombreCategoria(e.categoria))}</a> › <span>${esc(nombreEquipo(e))}</span></nav>

    <div class="detalle">
      <div>
        <div class="detalle__foto">
          ${e.destacado ? '<span class="marca-esq">Destacado</span>' : ''}
          ${foto(e, 'fantasma fantasma--xl')}
        </div>
        ${galeriaHTML(e)}
        ${e.descripcion ? `<div class="detalle__bloque">
            <h2 class="panel__titulo"><em>Descripción</em> del anunciante</h2>
            <p class="panel__texto">${esc(e.descripcion)}</p>
          </div>` : ''}
      </div>

      <aside class="detalle__panel">
        <p class="detalle__cat">${esc(nombreCategoria(e.categoria))}${e.subcategoria ? ` · ${esc(e.subcategoria_nombre || e.subcategoria)}` : ''}</p>
        <h1 class="detalle__titulo">${esc(nombreEquipo(e))}</h1>
        <p class="detalle__sitio">${icono('i-pin')} ${esc([e.municipio, e.provincia].filter(Boolean).join(', ') || 'República Dominicana')}</p>

        <p class="etiqueta">Precio</p>
        <p class="detalle__precio num">${precioTexto(e)}</p>
        ${condicionesHTML(e)}

        ${fichaTecnicaHTML(e)}

        ${e.verificado ? `<p class="nota-verificado"><span class="pastilla pastilla--verde">${icono('i-check')} Anunciante verificado</span> Identidad y titularidad del equipo comprobadas por TuEquipoRD.</p>` : ''}

        ${contactosHTML(e)}

        <p class="detalle__dealer">${e.dealerSlug
          ? `Publicado por <a href="dealer.html?d=${encodeURIComponent(e.dealerSlug)}">${esc(e.dealer)}</a>`
          : 'Publicado por un anunciante particular.'}</p>

        <p class="etiqueta etiqueta--bloque">Servicios de TuEquipoRD</p>
        ${e.precio != null ? `<a class="btn btn--linea btn--bloque" href="financiamiento.html?monto=${e.precio}">Calcular el financiamiento</a>` : ''}
        <a class="btn btn--linea btn--bloque" href="transporte.html?equipo=${encodeURIComponent(e.id)}">Cotizar el traslado</a>

        <p class="detalle__aviso">Verifique el equipo y su documentación antes de pagar.
          TuEquipoRD publica el anuncio pero no interviene en la transacción ni retiene fondos.
          <a href="contacto.html?equipo=${encodeURIComponent(e.id)}&amp;motivo=reporte">Reportar este anuncio</a>.</p>
      </aside>
    </div>`;

  // Métricas de la ficha: una vista al abrirla y un clic cada vez que
  // alguien va a llamar o a escribir. Se anota justo donde ocurre, que
  // es lo que el anunciante ve después en su panel. El canal se lee de
  // data-canal para que "llamar" y "WhatsApp" no se cuenten iguales.
  anotar(e.id, 'vista');
  $$('.contactos__it', cont).forEach((a) => {
    a.addEventListener('click', () => anotar(e.id, a.dataset.canal || 'telefono'));
  });

  const galeria = $('#galeria');
  if (galeria) {
    galeria.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-foto]');
      if (!btn) return;
      const principal = $('.detalle__foto img');
      if (principal) principal.src = btn.dataset.foto;
      $$('.galeria__it', galeria).forEach((b) => b.classList.toggle('galeria__it--activa', b === btn));
    });
  }

  // Equipos parecidos: misma categoría, sin repetir el que se está
  // viendo. Es la vía por la que un comprador que no cierra con esta
  // máquina se queda dentro del catálogo en vez de irse.
  const similares = $('#similares');
  if (similares) {
    const { anuncios } = await buscarEquipos({ categoria: e.categoria, porPagina: 7 });
    const otros = anuncios.filter((x) => x.id !== e.id).slice(0, 6);
    similares.innerHTML = otros.map(avisoHTML).join('');
    if (!otros.length) $('#similaresPanel')?.remove();
  }
}

/* ── Categorías (categorias.html) ───────────────────────── */

function montarCategoriasPagina() {
  const cont = $('#categoriasTodas');
  if (!cont) return;
  cont.innerHTML = conteoCategorias().map((c) => {
    const hay = c.total > 0;
    return `<li><a class="cat-tarjeta${hay ? '' : ' cat-tarjeta--vacia'}" href="equipos.html?categoria=${encodeURIComponent(c.id)}">
      <span class="cat-tarjeta__foto">
        ${c.portada
          ? `<img src="${esc(c.portada)}" alt="${esc(c.nombre)}" loading="lazy">`
          : icono('i-hex-doble', 'fantasma')}
        <span class="cat-tarjeta__ico">${icono(c.icono)}</span>
      </span>
      <span class="cat-tarjeta__cuerpo">
        <span class="cat-tarjeta__nombre">${esc(c.nombre)}</span>
        <span class="cat-tarjeta__meta num">${hay ? `${c.total} ${c.total === 1 ? 'equipo publicado' : 'equipos publicados'}` : 'Sin equipos publicados'}</span>
      </span>
    </a></li>`;
  }).join('');
}

/* ── Alquiler, financiamiento, planes ───────────────────── */

/* La flota de alquiler viene de la base, no del código: el equipo la
   administra desde /admin.html sin tocar un archivo ni desplegar.
   EQUIPOS_ALQUILER queda como reserva por si la API no responde, para
   que la página no salga vacía. */
async function montarAlquiler() {
  const cont = $('#alquilerLista');
  if (!cont) return;

  const datos = await api('/flota/alquiler', { silencioso: true });
  const flota = (datos && datos.flota && datos.flota.length)
    ? datos.flota
    : (typeof EQUIPOS_ALQUILER !== 'undefined' ? EQUIPOS_ALQUILER : []);

  cont.innerHTML = flota.map((a) => `<li>
    <label class="alq">
      <input type="checkbox" name="equipo" value="${esc(a.nombre)}">
      <span class="alq__ico">${icono(a.icono || 'i-hex')}</span>
      <span class="alq__cuerpo">
        <span class="alq__nombre">${esc(a.nombre)}</span>
        <span class="alq__detalle">${esc(a.detalle || '')}</span>
      </span>
      <span class="alq__unidad">por ${esc(a.unidad || 'día')}</span>
    </label>
  </li>`).join('');
}

function montarFinanciadoras() {
  const cont = $('#financiadoras');
  if (!cont) return;
  cont.innerHTML = FINANCIADORAS.map((f) => `<li class="fin">
    <div class="fin__cabeza">
      <span class="fin__tipo etiqueta">${esc(f.tipo)}</span>
      <h3 class="fin__nombre">${esc(f.nombre)}</h3>
    </div>
    <p class="fin__enfoque">${esc(f.enfoque)}</p>
    <p class="etiqueta">Piden</p>
    <ul class="fin__req">${f.requisitos.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
    <dl class="fin__contacto">
      <div><dt>Teléfono</dt><dd>${f.telefono ? `<a href="tel:${esc(f.telefono)}" class="num">${esc(f.telefono)}</a>` : '<span class="pendiente">por confirmar</span>'}</dd></div>
      <div><dt>Correo</dt><dd>${f.correo ? `<a href="mailto:${esc(f.correo)}">${esc(f.correo)}</a>` : '<span class="pendiente">por confirmar</span>'}</dd></div>
      <div><dt>Web</dt><dd>${f.web ? `<a href="${esc(f.web)}" rel="noopener">${esc(f.web)}</a>` : '<span class="pendiente">por confirmar</span>'}</dd></div>
    </dl>
  </li>`).join('');
}

/* ── Planes ─────────────────────────────────────────────── */

const planPorId = (id) => PLANES.find((p) => p.id === id);

/* EL PRECIO LO MANDA EL SERVIDOR.

   PLANES (assets/data.js) aporta lo que es texto de venta —el nombre,
   la lista de prestaciones, con qué plan compararlo—, pero la cifra y
   la promoción vigente vienen de /api/planes, que las lee de la misma
   fila que después se cobra.

   Antes la promoción de lanzamiento estaba escrita solo aquí: la
   página ofrecía el plan Estándar sin costo y el servidor cobraba
   RD$2,000 más ITBIS igual. Con el precio en un solo sitio, esa
   discrepancia no puede volver a existir. */
async function cargarPlanes() {
  const datos = await api('/planes', { silencioso: true });
  if (!datos || !Array.isArray(datos.planes)) return PLANES;

  datos.planes.forEach((p) => {
    const local = PLANES.find((x) => x.id === p.id);
    if (!local) return;
    local.precio = p.precio_vigente;
    local.precioNormal = p.precio_normal;
    local.enPromo = !!p.en_promo;
    local.promoHasta = p.promo_hasta;
    // El cupo de anuncios también manda desde la base: es lo que el
    // servidor comprueba al publicar.
    local.publicaciones = p.anuncios_incluidos;
    local.fotosMaximas = p.fotos_maximas;
  });
  return PLANES;
}

/* Hay promoción mientras algún plan del nivel Estándar la tenga viva.
   No se calcula contra una fecha escrita en el cliente: se lee de lo
   que respondió el servidor. */
const promoEstandarActiva = () =>
  PLANES.some((p) => p.nivel === 'estandar' && p.enPromo);

const finPromoEstandar = () =>
  (PLANES.find((p) => p.nivel === 'estandar' && p.enPromo) || {}).promoHasta || null;

/* Durante la promoción, los dos planes Estándar se presentan como uno
   solo: ofrecer "1 anuncio" y "5 anuncios" cuando ambos valen cero
   sería ofrecer dos veces lo mismo. Terminada, vuelven los seis planes
   con sus tarifas sin tocar una línea de código. */
function planesVisibles() {
  if (!promoEstandarActiva()) return PLANES;

  const nivel = PLANES.filter((p) => p.nivel === 'estandar');
  const resto = PLANES.filter((p) => p.nivel !== 'estandar');
  const base = nivel[0];
  if (!base) return PLANES;

  const fusionado = {
    ...base,
    nombre: 'Estándar',
    publicaciones: null,          // null = sin límite
    enPromo: true,
    incluye: [
      'Anuncios activos sin límite mientras dure la promoción',
      ...base.incluye.slice(1),
    ],
    // Lo que costará cuando la promoción termine, para que nadie se
    // encuentre con una tarifa distinta a la que vio al registrarse.
    despues: nivel.map((p) => ({
      nombre: p.nombre,
      publicaciones: p.publicaciones,
      precio: p.precioNormal != null ? p.precioNormal : p.precio,
    })),
  };

  return [fusionado, ...resto];
}

/* Precio del plan para la duración pedida. 60 días = 80 % más que 30.
   No aplica a la membresía: esa se cobra por ciclo, no por vigencia. */
const precioPlan = (plan, dias) => Math.round(plan.precio * (dias === 60 ? RECARGO_60 : 1));

/* Ahorro de contratar 60 días de una vez en lugar de dos veces 30. */
const ahorro60 = () => Math.round((1 - RECARGO_60 / 2) * 100);

/* ── Membresía ──────────────────────────────────────────── */

const cicloPorId = (id) =>
  CICLOS_MEMBRESIA.find((c) => c.id === id) || CICLOS_MEMBRESIA[0];

/* Lo que se cobra en un ciclo. El anual dura doce meses pero cobra
   MESES_GRATIS_ANUAL menos: ahí está el incentivo a pagar por año. */
function precioMembresia(plan, idCiclo) {
  const ciclo = cicloPorId(idCiclo);
  const cobrados = ciclo.meses === 12 ? ciclo.meses - MESES_GRATIS_ANUAL : ciclo.meses;
  return Math.round(plan.precio * cobrados);
}

/* Cuota mensual equivalente del ciclo, para poder compararlos. */
const mensualEquivalente = (plan, idCiclo) =>
  Math.round(precioMembresia(plan, idCiclo) / cicloPorId(idCiclo).meses);

const ahorroAnual = () => Math.round((MESES_GRATIS_ANUAL / 12) * 100);

/* Fecha del próximo cargo de una membresía contratada hoy. */
function proximoCargo(idCiclo, desde = new Date()) {
  const d = new Date(desde);
  d.setMonth(d.getMonth() + cicloPorId(idCiclo).meses);
  return d;
}

/* Comparación de un plan múltiple contra comprar sus publicaciones sueltas.
   Se calcula, no se escribe: si cambian los precios, el texto se ajusta. */
function comparativa(plan, dias) {
  if (!plan.compararCon || plan.publicaciones < 2) return null;
  const base = planPorId(plan.compararCon);
  if (!base) return null;

  const suelto = precioPlan(base, dias) * plan.publicaciones;
  const propio = precioPlan(plan, dias);
  const diferencia = suelto - propio;

  if (diferencia > 0) {
    return {
      clase: 'plan__ahorro',
      texto: `Ahorro de ${pesos(diferencia)} · ${Math.round((diferencia / suelto) * 100)} %`,
      detalle: `Por separado costarían ${pesos(suelto)}`,
    };
  }
  if (diferencia === 0) {
    return {
      clase: 'plan__ahorro plan__ahorro--par',
      texto: `Mismo precio que ${plan.publicaciones} planes ${esc(base.nombre)}`,
      detalle: 'Con los destacados y el perfil corporativo incluidos',
    };
  }
  return null;
}

function textoPortada(plan, dias) {
  if (!plan.portada) return null;
  if (plan.membresia) {
    return `Cada anuncio, ${plan.portada.diasTodas} días en portada · ${plan.portada.permanentes} destacados de forma permanente`;
  }
  const factor = dias === 60 ? 2 : 1;
  if (plan.portada.permanentes) {
    return `Las ${plan.publicaciones} destacadas ${plan.portada.diasTodas} días · ${plan.portada.permanentes} destacadas los ${dias} días`;
  }
  return `${plan.portada.dias * factor} días en la portada`;
}

/* La portada también anuncia el ahorro; sale del mismo cálculo. */
function montarAhorroPortada() {
  const el = $('#ahorroPortada');
  if (el) el.textContent = `ahorras ${ahorro60()} %`;
}

/* ── Transporte y seguimiento GPS ───────────────────────── */

/**
 * Posición actual de un envío. ESTE ES EL ÚNICO PUNTO DEL SITIO QUE
 * TOCA EL GPS: cuando se contrate el proveedor, se escribe aquí la
 * llamada a su API y todo lo demás sigue funcionando igual.
 *
 * Debe devolver una promesa con:
 *   { lat, lon, rumbo, velocidad, estado, actualizado, avance }
 *   estado: 'cargando' | 'en-ruta' | 'entregado' | 'desconocido'
 *   avance: 0 a 1 sobre la ruta
 *
 * Con PROVEEDOR_GPS en null no hay rastreo real: se devuelve una
 * posición simulada sobre la ruta de ENVIO_DEMO, y la interfaz la
 * rotula como demostración.
 */
async function posicionEnvio(codigo) {
  if (PROVEEDOR_GPS) {
    // Aquí va la llamada real. Ejemplo de la forma esperada:
    //   const r = await fetch(`${PROVEEDOR_GPS.url}/posicion/${codigo}`,
    //     { headers: { Authorization: `Bearer ${PROVEEDOR_GPS.token}` } });
    //   return normalizar(await r.json());
    throw new Error('Proveedor de GPS configurado pero sin implementar');
  }

  if (codigo.trim().toUpperCase() !== ENVIO_DEMO.codigo) {
    return { estado: 'desconocido' };
  }

  // Simulación: el avance se deriva de la hora, para que el camión
  // esté en un punto distinto cada vez que se abre la página.
  const puntos = puntosDeRuta(ENVIO_DEMO);
  const ciclo = 6 * 60 * 1000;                       // una vuelta cada 6 min
  const avance = (Date.now() % ciclo) / ciclo;
  const p = posicionEnRuta(puntos, avance);

  return {
    lat: p.lat,
    lon: p.lon,
    rumbo: p.rumbo,
    velocidad: 62,
    estado: avance < 0.02 ? 'cargando' : avance > 0.98 ? 'entregado' : 'en-ruta',
    actualizado: new Date(),
    avance,
  };
}

const ESTADOS_ENVIO = {
  'cargando':    { texto: 'Cargando en origen', clase: 'estado--cargando' },
  'en-ruta':     { texto: 'En ruta',            clase: 'estado--ruta' },
  'entregado':   { texto: 'Entregado',          clase: 'estado--entregado' },
  'desconocido': { texto: 'Sin señal',          clase: 'estado--sin' },
};

/* 24 horas, para que todas las horas del panel se lean igual. */
const hhmm = (d) => d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: false });

/* Suma minutos a un "HH:MM" y devuelve otro "HH:MM". */
function sumarMinutos(hora, minutos) {
  const [h, m] = hora.split(':').map(Number);
  const t = new Date(2000, 0, 1, h, m + Math.round(minutos));
  return hhmm(t);
}

function montarSeguimiento() {
  const panel = $('#panelSeguimiento');
  if (!panel) return;

  const lienzo = $('#mapaEnvio');
  const datos = $('#seguimientoDatos');
  const forma = $('#formSeguimiento');
  const campo = $('#codigoEnvio');
  if (!lienzo || !datos) return;

  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let temporizador = null;

  async function refrescar(codigo) {
    const pos = await posicionEnvio(codigo);

    if (pos.estado === 'desconocido') {
      lienzo.innerHTML = '';
      datos.innerHTML = `<p class="seguimiento__vacio">
        No encontramos el envío <b>${esc(codigo)}</b>. Revisa el código o escríbenos
        y lo localizamos: el código figura en el correo de confirmación de la reserva.</p>`;
      return;
    }

    const puntos = puntosDeRuta(ENVIO_DEMO);
    const total = largoRutaKm(puntos);
    const faltan = Math.max(0, Math.round(total * (1 - pos.avance)));
    const minutosFaltan = pos.velocidad ? (faltan / pos.velocidad) * 60 : 0;
    const est = ESTADOS_ENVIO[pos.estado];

    const viajeMin = pos.velocidad ? (total / pos.velocidad) * 60 : 0;
    /* En la demo las horas salen del horario del envío, no del reloj de
       quien mira: mezclar ambos daría una señal de las 3 a.m. en un viaje
       que salió a las 8:10. Con proveedor real manda su marca de tiempo. */
    const ultimaSenal = PROVEEDOR_GPS
      ? hhmm(pos.actualizado)
      : sumarMinutos(ENVIO_DEMO.salida, viajeMin * pos.avance);

    const origen = puntos[0].nombre;
    const destino = puntos[puntos.length - 1].nombre;
    const descripcion = `Mapa de República Dominicana. El equipo va de ${origen} a ${destino}; ` +
      `ha recorrido el ${Math.round(pos.avance * 100)} % de la ruta y le faltan ${faltan} kilómetros.`;

    dibujarMapa(lienzo, { puntos, posicion: pos, avance: pos.avance, descripcion });

    datos.innerHTML = `
      <div class="seguimiento__campo seguimiento__campo--estado">
        <span class="etiqueta">Estado</span>
        <b class="estado ${est.clase}">${est.texto}</b>
      </div>
      <div class="seguimiento__campo">
        <span class="etiqueta">Equipo</span>
        <b>${esc(ENVIO_DEMO.equipo)}</b>
      </div>
      <div class="seguimiento__campo">
        <span class="etiqueta">Unidad</span>
        <b>${esc(ENVIO_DEMO.unidad)} · ${esc(ENVIO_DEMO.cama)}</b>
      </div>
      <div class="seguimiento__campo">
        <span class="etiqueta">Salió</span>
        <b class="num">${esc(ENVIO_DEMO.salida)}</b>
      </div>
      <div class="seguimiento__campo">
        <span class="etiqueta">Llegada estimada</span>
        <b class="num">${sumarMinutos(ENVIO_DEMO.salida, viajeMin)}</b>
      </div>
      <div class="seguimiento__campo">
        <span class="etiqueta">Faltan</span>
        <b class="num">${miles(faltan)} km · ${Math.round(minutosFaltan)} min</b>
      </div>
      <div class="seguimiento__campo">
        <span class="etiqueta">Velocidad</span>
        <b class="num">${pos.velocidad} km/h</b>
      </div>
      <div class="seguimiento__campo">
        <span class="etiqueta">Última señal</span>
        <b class="num">${ultimaSenal}</b>
      </div>`;
  }

  function seguir(codigo) {
    clearInterval(temporizador);
    refrescar(codigo);
    // Con movimiento reducido no se refresca solo: se ve la posición y ya.
    if (!quieto) temporizador = setInterval(() => refrescar(codigo), 15000);
  }

  if (forma) {
    forma.addEventListener('submit', (ev) => {
      ev.preventDefault();
      seguir(campo.value || ENVIO_DEMO.codigo);
    });
  }

  if (campo && !campo.value) campo.value = ENVIO_DEMO.codigo;
  seguir(ENVIO_DEMO.codigo);
}

/* Formulario de reserva: llena los select propios de transporte y
   precarga el equipo cuando se llega desde una ficha. */
async function montarTransporte() {
  const forma = $('#formTransporte');
  if (!forma) return;

  /* Las camas vienen de la base. Se piden una sola vez y alimentan el
     selector del formulario y la lista de la flota, que son la misma
     información en dos sitios. */
  const datosFlota = await api('/flota/transporte', { silencioso: true });
  const camas = (datosFlota && datosFlota.flota && datosFlota.flota.length)
    ? datosFlota.flota
    : (typeof FLOTA_TRANSPORTE !== 'undefined' ? FLOTA_TRANSPORTE : []);

  const cama = forma.querySelector('select[name="Tipo de cama"]');
  if (cama) {
    camas.forEach((f) =>
      cama.add(new Option(`${f.nombre} — ${f.detalle || ''}`.trim(), f.nombre)));
  }

  const lista = $('#flotaLista');
  if (lista) {
    lista.innerHTML = camas.map((f) => `<li class="cama">
      <span class="cama__ico">${icono(f.icono || 'i-lowboy')}</span>
      <span class="cama__cuerpo">
        <span class="cama__nombre">${esc(f.nombre)}</span>
        <span class="cama__detalle">${esc(f.detalle || '')}</span>
      </span>
      <span class="cama__cap num">hasta ${Number(f.capacidad) || '—'} t</span>
    </li>`).join('');
  }

  // Llegada desde una ficha de equipo: se precarga lo que ya sabemos
  // para que no haya que volver a escribirlo.
  const idEquipo = params().get('equipo');
  if (!idEquipo) return;
  const datos = await api(`/anuncios/${encodeURIComponent(idEquipo)}`, { silencioso: true });
  if (!datos || !datos.anuncio) return;
  const e = anuncioDeApi(datos.anuncio);

  const poner = (nombre, valor) => {
    const campo = forma.elements[nombre];
    if (campo && valor) campo.value = valor;
  };
  poner('Equipo', nombreEquipo(e));
  poner('Tipo de equipo', nombreCategoria(e.categoria));
  poner('Origen', e.provincia);

  const aviso = $('#transporteDesdeFicha');
  if (aviso) {
    aviso.hidden = false;
    aviso.innerHTML = `${icono('i-lowboy')} <span>Cotizando el transporte de
      <b>${esc(nombreEquipo(e))}</b>, publicado en ${esc(e.provincia)}.
      <a href="equipo.html?id=${encodeURIComponent(e.id)}">Ver la ficha</a></span>`;
  }
}

/* Llegada al formulario de contacto desde una ficha: se rellena el
   motivo y se identifica el anuncio. Sin esto, quien pulsa "reportar
   este anuncio" tiene que explicar de memoria cuál era. */
async function montarContactoDesdeFicha() {
  const form = $('form[data-cotizacion="resumenContacto"]');
  if (!form) return;

  const p = params();
  const idEquipo = p.get('equipo');
  const motivo = form.elements.Motivo;

  if (p.get('motivo') === 'reporte' && motivo) motivo.value = 'Reportar un anuncio';
  if (!idEquipo) return;

  const datos = await api(`/anuncios/${encodeURIComponent(idEquipo)}`, { silencioso: true });
  if (!datos || !datos.anuncio) return;
  const e = anuncioDeApi(datos.anuncio);

  const mensaje = form.elements.Mensaje;
  if (mensaje && !mensaje.value) {
    mensaje.value = `Sobre el anuncio "${nombreEquipo(e)}" (${precioTexto(e)}), publicado en ${e.provincia || 'República Dominicana'}.\nReferencia: ${e.id}\n\n`;
    mensaje.focus();
    mensaje.setSelectionRange(mensaje.value.length, mensaje.value.length);
  }

  const aviso = $('#contactoDesdeFicha');
  if (aviso) {
    aviso.hidden = false;
    aviso.innerHTML = `${icono('i-etiqueta')} <span>Su mensaje hace referencia a
      <b>${esc(nombreEquipo(e))}</b>. <a href="equipo.html?id=${encodeURIComponent(e.id)}">Ver la ficha</a></span>`;
  }
}

/* ── Calculadora de cuota ───────────────────────────────── */

const TASA_ANUAL = 0.14;

function montarCalculadora() {
  const form = $('#calc');
  if (!form) return;
  const valor = $('#c-valor');
  const plazo = $('#c-plazo');
  const salida = $('#calcCuota');

  const aNumero = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;

  function calcular() {
    const p = aNumero(valor.value);
    const n = Number(plazo.value);
    if (p <= 0) { salida.textContent = '—'; return; }
    const i = TASA_ANUAL / 12;
    salida.textContent = pesos((p * i) / (1 - Math.pow(1 + i, -n)));
  }

  valor.addEventListener('blur', () => {
    const n = aNumero(valor.value);
    valor.value = n ? miles(n) : '';
    calcular();
  });
  plazo.addEventListener('change', calcular);
  form.addEventListener('submit', (ev) => { ev.preventDefault(); calcular(); });

  // El monto puede venir de un anuncio: equipo.html → financiamiento
  const monto = params().get('monto');
  if (monto) valor.value = miles(Number(monto));
  calcular();
}

/* ── Cabecera ───────────────────────────────────────────── */

function montarNav() {
  const toggle = $('#navToggle');
  const menu = $('#navMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const abierto = menu.classList.toggle('is-abierto');
      toggle.setAttribute('aria-expanded', String(abierto));
      toggle.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    });
  }
  // Marca el enlace de la página actual.
  const aqui = location.pathname.split('/').pop() || 'index.html';
  $$('.cab__nav a').forEach((a) => {
    if (a.getAttribute('href') === aqui) a.setAttribute('aria-current', 'page');
  });
}

/* ── Formularios de cotización ──────────────────────────── */

/* Sin backend todavía: confirmamos en pantalla y dejamos el resumen
   listo para enviar por WhatsApp o correo. No fingimos un envío. */
function montarCotizaciones() {
  $$('form[data-cotizacion]').forEach((form) => {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const destino = $('#' + form.dataset.cotizacion);
      if (!destino) return;

      const datos = [];
      new FormData(form).forEach((valor, clave) => {
        if (!valor) return;
        const existente = datos.find((d) => d.clave === clave);
        if (existente) existente.valor += ', ' + valor;
        else datos.push({ clave, valor });
      });

      const etiquetaDe = (clave) => {
        const campo = form.querySelector(`[name="${clave}"]`);
        const lab = campo && (campo.closest('label') || form.querySelector(`label[for="${campo.id}"]`));
        return lab ? lab.textContent.trim().replace(/\s+/g, ' ') : clave;
      };

      destino.hidden = false;
      destino.innerHTML = `
        <h3 class="resumen__titulo">Resumen de la solicitud</h3>
        <dl class="resumen__lista">
          ${datos.map((d) => `<div><dt>${esc(etiquetaDe(d.clave))}</dt><dd>${esc(d.valor)}</dd></div>`).join('')}
        </dl>
        <p class="resumen__nota">Copie este resumen y remítalo por WhatsApp al <a href="https://wa.me/18090000000" rel="noopener">(809) 000-0000</a> o al correo <a href="mailto:hola@tuequipord.com">hola@tuequipord.com</a>. Le respondemos con precio y disponibilidad.</p>`;
      destino.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

/* ── Catálogo desde la API ──────────────────────────────── */

/* Traduce un anuncio de la base al objeto que usan las plantillas.
   Existe para que el resto del código no dependa de los nombres de las
   columnas: si mañana cambia una, se ajusta esta función y nada más. */
function anuncioDeApi(a) {
  return {
    id: a.id,
    anio: a.anio,
    marca: a.marca,
    modelo: a.modelo,
    categoria: a.categoria,
    subcategoria: a.subcategoria,
    uso: { valor: a.uso_valor || 0, unidad: a.uso_unidad || 'h' },
    condicion: a.condicion,
    precio: a.precio,
    moneda: a.moneda,
    provincia: a.provincia,
    municipio: a.municipio,
    potencia: a.potencia,
    peso: a.peso,
    implementos: a.implementos,
    destacado: !!a.destacado_hasta && a.destacado_hasta > new Date().toISOString(),
    verificado: !!a.verificada,
    ofertas: a.modalidad_precio === 'ofertas',
    permuta: !!a.permuta,
    financiamiento: !!a.financiamiento,
    itbisIncluido: !!a.itbis_incluido,
    esEmpresa: a.org_tipo === 'dealer',
    dealer: a.dealer,
    dealerSlug: a.dealer_slug,
    // El listado resuelve la portada en SQL (`foto`); la ficha trae la
    // galería entera y ninguna portada aparte. Se toma la primera para
    // que las dos vistas usen el mismo campo.
    foto: a.foto || (Array.isArray(a.fotos) ? a.fotos[0] : null),
    fotosTotal: a.fotos_total != null ? a.fotos_total : (a.fotos || []).length,
    descripcion: a.descripcion,
    fotos: a.fotos,
    telefonos: a.telefonos,
    publicado: a.publicado,
  };
}

/* Las marcas que se ofrecen a quien busca son las que hoy tienen
   inventario. Se rellenan cuando llegan las estadísticas, no antes:
   ofrecer una marca sin equipos manda al comprador a una lista vacía. */
function refrescarMarcasActivas() {
  $$('select[data-marcas="activas"]').forEach((sel) => {
    const elegida = sel.value;
    sel.length = 1;                       // conserva «Todas las marcas»
    marcasConEquipos().forEach((m) => sel.add(new Option(m.marca, m.marca)));
    if (elegida) {
      if (![...sel.options].some((o) => o.value === elegida)) sel.add(new Option(elegida, elegida));
      sel.value = elegida;
    }
  });
}

/* Registro de interacciones. No bloquea nada ni interrumpe al usuario:
   si falla, se pierde una métrica y ya. */
const anotar = (idAnuncio, tipo) =>
  api('/eventos', { metodo: 'POST', cuerpo: { anuncio: idAnuncio, tipo }, silencioso: true });

/* ── Arranque ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  // Primero lo que no depende del catálogo, para que la página sea
  // utilizable desde el primer instante y el asistente de publicación
  // encuentre los <select> ya poblados al arrancar.
  inyectarSprite();
  montarNav();
  montarSelects();
  montarAlquiler();
  montarFinanciadoras();
  montarAhorroPortada();
  montarCalculadora();
  montarSeguimiento();
  montarCotizaciones();
  montarBuscador();

  // Las cifras del catálogo las comparten varios bloques, así que se
  // piden una sola vez y después se pinta todo en paralelo: cada
  // sección hace su consulta sin esperar a la de al lado.
  // Las tarifas y las cifras del catálogo las comparten varios bloques
  // (y el asistente de publicación depende de las tarifas), así que se
  // piden una vez, en paralelo, antes de pintar nada que las use.
  await Promise.all([cargarPlanes(), cargarEstadisticas()]);
  montarPromo();
  refrescarMarcasActivas();
  montarCifrasPortada();
  montarTipos();
  montarMarcas();
  montarCategoriasPagina();

  await Promise.all([
    montarDestacados(),
    montarRecientes(),
    montarDealers(),
    montarResultados(),
    montarDetalle(),
    montarTransporte(),
    montarContactoDesdeFicha(),
  ]);
});
