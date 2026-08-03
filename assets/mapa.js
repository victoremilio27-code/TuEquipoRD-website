/* ═══════════════════════════════════════════════════════════
   TuEquipoRD · Mapa de seguimiento
   Mapa esquemático de República Dominicana en SVG, sin librerías.
   Depende de SILUETA_RD y CIUDADES_RD de data.js.

   La escala es provincia a provincia, que es la resolución real de un
   lowboy cruzando el país. Si algún día hace falta zoom a nivel de
   calle, se sustituye este archivo por un adaptador de Leaflet sin
   tocar el resto de la página: la interfaz que usa app.js es
   dibujarMapa() y nada más.
   ═══════════════════════════════════════════════════════════ */

/* Rectángulo geográfico que encierra el país, con un margen. */
const MAPA_LIMITES = { lonMin: -72.15, lonMax: -68.15, latMin: 17.45, latMax: 20.05 };
const MAPA_VISTA = { ancho: 1000, alto: 620 };

/* Proyección equirectangular corregida por la latitud media: a 19° N un
   grado de longitud mide ~0.945 de uno de latitud. Sin esa corrección el
   país sale estirado a lo ancho. */
const MAPA_COS_LAT = Math.cos((19 * Math.PI) / 180);

function proyectar(lon, lat) {
  const { lonMin, lonMax, latMin, latMax } = MAPA_LIMITES;

  const anchoGeo = (lonMax - lonMin) * MAPA_COS_LAT;
  const altoGeo = latMax - latMin;

  // Una sola escala para los dos ejes: así no se deforma la silueta.
  const escala = Math.min(MAPA_VISTA.ancho / anchoGeo, MAPA_VISTA.alto / altoGeo);
  const margenX = (MAPA_VISTA.ancho - anchoGeo * escala) / 2;
  const margenY = (MAPA_VISTA.alto - altoGeo * escala) / 2;

  return {
    x: margenX + (lon - lonMin) * MAPA_COS_LAT * escala,
    y: margenY + (latMax - lat) * escala,
  };
}

const ciudad = (id) => CIUDADES_RD.find((c) => c.id === id);

/* Distancia aproximada en km entre dos puntos (Haversine). */
function distanciaKm(a, b) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* Ruta completa como lista de puntos {lat, lon, nombre}. */
function puntosDeRuta(envio) {
  return [envio.origen, ...(envio.paso || []), envio.destino]
    .map(ciudad)
    .filter(Boolean);
}

/* Posición sobre la ruta para un avance de 0 a 1, interpolando por
   distancia real y no por número de tramos: si un tramo es más largo,
   el camión tarda más en recorrerlo. */
function posicionEnRuta(puntos, avance) {
  if (puntos.length < 2) return { ...puntos[0], rumbo: 0 };

  const tramos = [];
  let total = 0;
  for (let i = 0; i < puntos.length - 1; i++) {
    const d = distanciaKm(puntos[i], puntos[i + 1]);
    tramos.push(d);
    total += d;
  }

  let restante = Math.max(0, Math.min(1, avance)) * total;
  for (let i = 0; i < tramos.length; i++) {
    if (restante <= tramos[i] || i === tramos.length - 1) {
      const t = tramos[i] === 0 ? 0 : restante / tramos[i];
      const a = puntos[i];
      const b = puntos[i + 1];
      return {
        lat: a.lat + (b.lat - a.lat) * Math.min(t, 1),
        lon: a.lon + (b.lon - a.lon) * Math.min(t, 1),
        rumbo: (Math.atan2(b.lon - a.lon, b.lat - a.lat) * 180) / Math.PI,
      };
    }
    restante -= tramos[i];
  }
  return { ...puntos[puntos.length - 1], rumbo: 0 };
}

const largoRutaKm = (puntos) => puntos.reduce(
  (suma, p, i) => (i === 0 ? 0 : suma + distanciaKm(puntos[i - 1], p)), 0);

/* ── Dibujo ─────────────────────────────────────────────── */

const aXY = (p) => proyectar(p.lon, p.lat);
const traza = (pts) => pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

/**
 * Pinta el mapa dentro de `contenedor`.
 * @param {Element} contenedor
 * @param {{puntos: Array, posicion: Object, avance: number, descripcion: string}} datos
 */
function dibujarMapa(contenedor, datos) {
  const { puntos, posicion, avance, descripcion } = datos;

  const silueta = traza(SILUETA_RD.map(([lon, lat]) => proyectar(lon, lat)));
  const ruta = puntos.map(aXY);
  const aqui = aXY(posicion);

  // Tramo ya recorrido: la ruta hasta el punto actual, más el punto actual.
  const recorridos = [];
  for (let i = 0; i < puntos.length; i++) {
    const parcial = largoRutaKm(puntos.slice(0, i + 1)) / largoRutaKm(puntos);
    if (parcial <= avance) recorridos.push(ruta[i]);
  }
  recorridos.push(aqui);

  // Las ciudades que ya están en la ruta llevan su propio rótulo grande:
  // repetirlas como referencia las dibujaría dos veces.
  const enRuta = new Set(puntos.map((p) => p.id));
  const referencias = CIUDADES_RD.filter((c) => c.ancla && !enRuta.has(c.id));

  contenedor.innerHTML = `
<svg class="mapa__lienzo" viewBox="0 0 ${MAPA_VISTA.ancho} ${MAPA_VISTA.alto}"
     role="img" aria-label="${(descripcion || 'Mapa de seguimiento').replace(/"/g, '')}">

  <polygon class="mapa__pais" points="${silueta}"/>

  ${referencias.map((c) => {
    const p = proyectar(c.lon, c.lat);
    return `<circle class="mapa__ref" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5"/>
            <text class="mapa__ref-txt" x="${(p.x + 9).toFixed(1)}" y="${(p.y + 4).toFixed(1)}">${c.nombre}</text>`;
  }).join('')}

  <polyline class="mapa__ruta" points="${traza(ruta)}"/>
  <polyline class="mapa__recorrido" points="${traza(recorridos)}"/>

  ${ruta.map((p, i) => {
    const esFin = i === 0 || i === ruta.length - 1;
    return `<circle class="mapa__parada${esFin ? ' mapa__parada--fin' : ''}"
                    cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${esFin ? 7 : 4.5}"/>`;
  }).join('')}

  <text class="mapa__punta" x="${(ruta[0].x).toFixed(1)}" y="${(ruta[0].y - 14).toFixed(1)}">${puntos[0].nombre}</text>
  <text class="mapa__punta" x="${(ruta[ruta.length - 1].x).toFixed(1)}" y="${(ruta[ruta.length - 1].y + 24).toFixed(1)}">${puntos[puntos.length - 1].nombre}</text>

  <g class="mapa__camion" transform="translate(${aqui.x.toFixed(1)} ${aqui.y.toFixed(1)})">
    <circle class="mapa__halo" r="17"/>
    <path class="mapa__hex" d="M0 -12 10.4 -6 10.4 6 0 12 -10.4 6 -10.4 -6z"/>
    <path class="mapa__hex-int" d="M0 -5.5 4.8 -2.7 4.8 2.7 0 5.5 -4.8 2.7 -4.8 -2.7z"/>
  </g>
</svg>`;
}
