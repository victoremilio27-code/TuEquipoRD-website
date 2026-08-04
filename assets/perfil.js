/* ═══════════════════════════════════════════════════════════
   TuEquipoRD · Página pública del dealer
   La presencia de la empresa dentro de la plataforma: quién es, dónde
   está y todo lo que tiene publicado, en una sola dirección que puede
   compartir en su publicidad.
   ═══════════════════════════════════════════════════════════ */

function sucursalHTML(s) {
  const donde = [s.municipio, s.provincia].filter(Boolean).join(', ');
  return `<li class="sucursal">
    <span class="sucursal__ico">${icono('i-pin')}</span>
    <span>
      <b>${esc(s.nombre)}</b>${s.principal && !/principal/i.test(s.nombre)
        ? ' <span class="pastilla pastilla--azul">Principal</span>' : ''}
      <span class="sucursal__meta">${esc(donde || 'República Dominicana')}${s.direccion ? ` · ${esc(s.direccion)}` : ''}</span>
    </span>
    ${s.telefono ? `<a class="sucursal__tel num" href="tel:${esc(String(s.telefono).replace(/\D/g, ''))}">${esc(s.telefono)}</a>` : ''}
  </li>`;
}

function pintarPerfil(datos) {
  const d = datos.dealer;
  const anuncios = datos.anuncios || [];
  const sucursales = datos.sucursales || [];

  document.title = `${d.nombre} · TuEquipoRD`;

  // Lo que un comprador quiere saber de un vendedor antes de llamarlo:
  // desde cuándo opera, cuánto inventario tiene y de qué tipo.
  const desde = new Date(d.creada).getFullYear();
  const categorias = [...new Set(anuncios.map((a) => nombreCategoria(a.categoria)))];

  $('#perfilDealer').innerHTML = `
    <nav class="miga" aria-label="Ruta">
      <a href="index.html">Inicio</a> &rsaquo; <a href="dealers.html">Directorio</a> &rsaquo; <span>${esc(d.nombre)}</span>
    </nav>

    <header class="perfil">
      <div class="perfil__sello">${icono('i-edificio')}</div>
      <div class="perfil__cuerpo">
        <h1 class="perfil__nombre">${esc(d.nombre)}</h1>
        <p class="perfil__meta">
          ${d.verificada ? `<span class="pastilla pastilla--verde">${icono('i-check')} Anunciante verificado</span>` : ''}
          <!-- Aquí se imprimía el RNC. Es un dato fiscal reservado: se
               comprueba al aprobar la empresa y no se enseña a nadie.
               Lo que el comprador necesita saber —que la empresa fue
               revisada— lo dice el sello de verificada. -->
          <span>En TuEquipoRD desde ${desde}</span>
          <span><b class="num">${anuncios.length}</b> ${anuncios.length === 1 ? 'equipo publicado' : 'equipos publicados'}</span>
        </p>
        ${d.descripcion ? `<p class="perfil__texto">${esc(d.descripcion)}</p>` : ''}
        ${categorias.length ? `<p class="perfil__categorias">${categorias.map((c) => `<span>${esc(c)}</span>`).join('')}</p>` : ''}
      </div>
      <div class="perfil__acciones">
        ${d.telefono ? `<a class="btn btn--ambar" href="tel:${esc(String(d.telefono).replace(/\D/g, ''))}">${icono('i-telefono')} Llamar</a>` : ''}
        ${d.correo ? `<a class="btn btn--linea" href="mailto:${esc(d.correo)}">${icono('i-correo')} Escribir</a>` : ''}
        ${d.web ? `<a class="btn btn--linea" href="${esc(d.web)}" rel="noopener nofollow">Sitio web</a>` : ''}
      </div>
    </header>

    ${sucursales.length ? `
      <section class="panel" aria-labelledby="t-suc">
        <h2 class="panel__titulo" id="t-suc"><em>Sucursales</em></h2>
        <ul class="sucursales">${sucursales.map(sucursalHTML).join('')}</ul>
      </section>` : ''}`;

  const panel = $('#panelInventario');
  panel.hidden = false;
  $('#inventarioCuenta').textContent = anuncios.length;
  $('#inventarioDealer').innerHTML = anuncios.length
    ? anuncios.map((a) => avisoHTML(anuncioDeApi(a))).join('')
    : '<li class="tabla-vacia">Este dealer no tiene equipos publicados en este momento.</li>';
}

function noEncontrado() {
  $('#perfilDealer').innerHTML = `<div class="vacio">
    <h1 class="vacio__titulo">Ese perfil no existe</h1>
    <p class="vacio__texto">Puede que la empresa haya cerrado su cuenta o que la dirección esté mal escrita.</p>
    <div class="vacio__acciones">
      <a class="btn btn--ambar" href="dealers.html">Ver el directorio</a>
      <a class="btn btn--linea" href="equipos.html">Ver equipos publicados</a>
    </div>
  </div>`;
}

async function montarPerfil() {
  if (!$('#perfilDealer')) return;

  const slug = params().get('d');
  if (!slug) return noEncontrado();

  const datos = await api(`/dealers/${encodeURIComponent(slug)}`, { silencioso: true });
  if (!datos || !datos.dealer) return noEncontrado();
  pintarPerfil(datos);
}

document.addEventListener('DOMContentLoaded', montarPerfil);
