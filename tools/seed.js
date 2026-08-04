/**
 * seed.js — inventario de demostración para desarrollo.
 *
 *   node tools/seed.js          # crea cuentas, dealers y anuncios
 *   node tools/seed.js --vaciar # borra lo sembrado y no siembra
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * Antes el sitio traía dos docenas de equipos y cinco dealers escritos
 * en assets/data.js y los mezclaba con los anuncios reales al pintar
 * el catálogo. Eso hacía que la portada anunciara "24 equipos
 * publicados" con la base vacía, que el directorio mostrara empresas
 * inexistentes con sello de verificadas y que la ficha de esos equipos
 * no abriera. Un marketplace no puede publicar inventario que no
 * existe: es una promesa falsa al comprador.
 *
 * Ahora el sitio lee SOLO de la base. Para poder trabajar y demostrar
 * con el catálogo lleno, esto siembra registros de verdad —con su
 * organización, su sucursal, sus fotos y sus teléfonos— que se
 * comportan igual que los de un anunciante real: se abren, se
 * contactan, cuentan métricas y caducan.
 *
 * En producción no se ejecuta nunca. Todo lo que crea lleva el correo
 * en @demo.tuequipord.do, y --vaciar lo borra por ahí sin tocar una
 * sola cuenta real.
 */

const db = require('./db');

const DOMINIO = 'demo.tuequipord.do';
const CLAVE = 'demostracion2026';

/* ── Fotografías ────────────────────────────────────────────
   SVG en data URI, la misma forma en que el asistente de publicación
   guarda las imágenes que sube el anunciante. Se generan por categoría
   para que la rejilla no salga con veinte marcadores idénticos, y van
   rotuladas como demostración: nadie debe confundirlas con la foto
   real de una máquina en venta. */

const PALETAS = {
  excavadoras:      ['#F2B233', '#8A6A1E'],
  retroexcavadoras: ['#E8A029', '#7A5516'],
  cargadores:       ['#4E8FD1', '#1F4A78'],
  volteos:          ['#5FA45F', '#2C5C2C'],
  gruas:            ['#C96A4B', '#6E3320'],
  compactadoras:    ['#8C7BC1', '#453A6B'],
  montacargas:      ['#D06A8C', '#6B2C42'],
  generadores:      ['#4FA9A0', '#1E5A55'],
};

function fotoDemo(categoria, texto, indice) {
  const [claro, oscuro] = PALETAS[categoria] || ['#8FA0B0', '#3A4855'];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${claro}"/><stop offset="1" stop-color="${oscuro}"/>
    </linearGradient></defs>
    <rect width="800" height="600" fill="url(#g)"/>
    <g fill="none" stroke="#FFFFFF" stroke-opacity=".28" stroke-width="14"
       stroke-linecap="round" stroke-linejoin="round" transform="translate(400 300) scale(11) translate(-12 -12)">
      <path d="M3 19.5h11"/><path d="M4 13h6.5v3.8H4z"/><path d="m10.5 14 4.4-5.6 3.8 1.8"/>
    </g>
    <text x="400" y="545" text-anchor="middle" fill="#FFFFFF" fill-opacity=".85"
          font-family="Inter, Arial, sans-serif" font-size="30" font-weight="600">${texto}</text>
    <text x="400" y="580" text-anchor="middle" fill="#FFFFFF" fill-opacity=".55"
          font-family="Inter, Arial, sans-serif" font-size="20">Imagen de demostración · vista ${indice + 1}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
}

/* ── Anunciantes ───────────────────────────────────────────
   Tres empresas con membresía Dealer y dos particulares, que es la
   mezcla que va a tener el catálogo de verdad. */

const ANUNCIANTES = [
  {
    clave: 'caribe', tipo: 'dealer', plan: 'dealer', verificada: true,
    empresa: 'Maquinarias del Caribe', rnc: '131245678', contacto: 'Ramón Peña',
    telefono: '8095551201', provincia: 'Santo Domingo', municipio: 'Santo Domingo Este',
    direccion: 'Autopista de San Isidro km 12, Nave 4',
    web: 'https://maquinariasdelcaribe.do',
    descripcion: 'Distribuidor de maquinaria pesada con taller propio y repuestos en inventario. '
      + 'Vendemos equipo revisado por nuestros técnicos, con horómetro certificado y garantía escrita de 90 días en tren de rodaje y motor.',
    sucursales: [
      { nombre: 'Sucursal Santiago', provincia: 'Santiago', municipio: 'Santiago de los Caballeros',
        direccion: 'Carretera Duarte km 4, Zona Industrial', telefono: '8095551202',
        whatsapp: '8295551202', horario: 'Lunes a viernes de 8:00 a 17:00, sábados de 8:00 a 12:00' },
    ],
  },
  {
    clave: 'cibao', tipo: 'dealer', plan: 'dealer-premium', verificada: true,
    empresa: 'Cibao Equipos Pesados', rnc: '130998877', contacto: 'Luisa Fermín',
    telefono: '8295554410', provincia: 'Santiago', municipio: 'Santiago de los Caballeros',
    direccion: 'Av. Circunvalación Norte 210, Parque Industrial',
    web: 'https://cibaoequipos.do',
    descripcion: 'Importamos y comercializamos equipo de construcción y agrícola para todo el Cibao. '
      + 'Financiamiento propio hasta 48 meses y entrega en obra en cualquier punto del país.',
    sucursales: [
      { nombre: 'Sucursal La Vega', provincia: 'La Vega', municipio: 'La Vega',
        direccion: 'Autopista Duarte km 2, entrada sur', telefono: '8095554411',
        whatsapp: '8095554411', horario: 'Lunes a viernes de 8:00 a 17:30' },
      { nombre: 'Sucursal Puerto Plata', provincia: 'Puerto Plata', municipio: 'San Felipe',
        direccion: 'Carretera Luperón km 3', telefono: '8095554412',
        horario: 'Lunes a viernes de 8:00 a 17:00' },
    ],
  },
  {
    clave: 'surmaq', tipo: 'dealer', plan: 'dealer', verificada: false,
    empresa: 'Sur Maquinarias', rnc: '132667788', contacto: 'Andrés Matos',
    telefono: '8095557730', provincia: 'Barahona', municipio: 'Barahona',
    direccion: 'Av. Enriquillo 45, entrada a la zona franca',
    descripcion: 'Venta y alquiler de maquinaria para movimiento de tierra en la región Sur. '
      + 'Atendemos obra vial, minería no metálica y proyectos agrícolas.',
    sucursales: [],
  },
  {
    clave: 'jperez', tipo: 'particular', plan: 'destacado',
    nombre: 'Julio Pérez', telefono: '8296012244',
  },
  {
    clave: 'mrosario', tipo: 'particular', plan: 'estandar',
    nombre: 'Marisol Rosario', telefono: '8095518890',
  },
];

/* ── Inventario ─────────────────────────────────────────────
   Precios y horas coherentes con el mercado dominicano de equipo
   usado: es lo que hace que los filtros de precio y de horas se
   puedan probar de verdad. */

const INVENTARIO = [
  { de: 'caribe', categoria: 'excavadoras', sub: 'Excavadora mediana (6 a 25 t)', marca: 'Caterpillar', modelo: '320', anio: 2021, horas: 3842, condicion: 'Muy bueno', precio: 8750000, ofertas: true, destacado: true, provincia: 'Santo Domingo', municipio: 'Santo Domingo Este', potencia: '162 hp', peso: '22,300 kg', implementos: 'Cucharón de 1.2 m³, zapatas de 800 mm, martillo hidráulico', descripcion: 'Unidad de flota propia con mantenimiento documentado cada 250 horas. Tren de rodaje al 70 %, sin fugas hidráulicas. Se entrega con inspección de 42 puntos firmada por nuestro taller.' },
  { de: 'caribe', categoria: 'excavadoras', sub: 'Excavadora pesada (más de 25 t)', marca: 'Hitachi', modelo: 'ZX210', anio: 2023, horas: 980, condicion: 'Como nuevo', precio: 11200000, destacado: true, provincia: 'Distrito Nacional', potencia: '164 hp', peso: '21,100 kg', implementos: 'Cucharón de excavación 1.0 m³, cabina con aire acondicionado', descripcion: 'Importada nueva en 2023 y usada únicamente en un proyecto de urbanización. Horómetro certificado. Garantía de fábrica vigente en tren de potencia hasta 2027.' },
  { de: 'caribe', categoria: 'cargadores', sub: 'Cargador frontal de ruedas', marca: 'Doosan', modelo: 'DL250', anio: 2021, horas: 2380, condicion: 'Muy bueno', precio: 6100000, destacado: true, provincia: 'Santo Domingo', potencia: '166 hp', peso: '13,400 kg', implementos: 'Cucharón de 2.3 m³, cuchilla atornillada nueva', descripcion: 'Cargador de patio en excelente estado mecánico. Neumáticos al 80 %. Transmisión y convertidor revisados a las 2.000 horas.' },
  { de: 'caribe', categoria: 'cargadores', sub: 'Cargador frontal de ruedas', marca: 'John Deere', modelo: '644P', anio: 2023, horas: 620, condicion: 'Como nuevo', precio: 12800000, destacado: true, provincia: 'Distrito Nacional', potencia: '249 hp', peso: '20,900 kg', implementos: 'Cucharón de 3.5 m³ con dientes reemplazables', descripcion: 'Equipo prácticamente nuevo, disponible por cambio de proyecto. Incluye telemetría JDLink activa y contrato de mantenimiento transferible.' },

  { de: 'cibao', categoria: 'retroexcavadoras', sub: 'Retroexcavadora 4x4', marca: 'John Deere', modelo: '310SL', anio: 2019, horas: 5120, condicion: 'Bueno', precio: 4290000, provincia: 'Santiago', municipio: 'Santiago de los Caballeros', potencia: '99 hp', peso: '7,400 kg', implementos: 'Cucharón frontal 1.0 m³, cucharón trasero de 24", estabilizadores nuevos', descripcion: 'Retro de trabajo continuo en obra municipal. Motor sin consumo de aceite, transmisión powershift funcionando correctamente. Aceites y filtros recién cambiados.' },
  { de: 'cibao', categoria: 'cargadores', sub: 'Minicargador (skid steer)', marca: 'Bobcat', modelo: 'S650', anio: 2021, horas: 1240, condicion: 'Muy bueno', precio: 2180000, ofertas: true, destacado: true, provincia: 'Santiago', potencia: '74 hp', peso: '3,900 kg', implementos: 'Cucharón estándar, horquillas de paleta, cabina cerrada con calefacción', descripcion: 'Minicargador de alquiler retirado de flota con mantenimiento al día. Neumáticos nuevos. Acepta implementos de acople rápido universal.' },
  { de: 'cibao', categoria: 'excavadoras', sub: 'Excavadora mediana (6 a 25 t)', marca: 'Doosan', modelo: 'DX235LCR', anio: 2019, horas: 5240, condicion: 'Bueno', precio: 5900000, provincia: 'Santiago', potencia: '155 hp', peso: '23,800 kg', implementos: 'Cucharón de 1.1 m³, línea hidráulica para martillo instalada', descripcion: 'Radio de giro reducido, ideal para trabajo urbano. Bombas hidráulicas revisadas el año pasado con factura disponible.' },
  { de: 'cibao', categoria: 'compactadoras', sub: 'Rodillo vibratorio liso', marca: 'Bomag', modelo: 'BW211D', anio: 2018, horas: 4100, condicion: 'Bueno', precio: 3750000, provincia: 'La Vega', potencia: '130 hp', peso: '11,200 kg', implementos: 'Tambor liso de 2.13 m, raspadores nuevos', descripcion: 'Rodillo de un tambor para terracería y base granular. Vibración en las dos amplitudes funcionando. Sin filtraciones en el sistema hidráulico.' },
  { de: 'cibao', categoria: 'volteos', sub: 'Camión volteo de 12 a 16 m³', marca: 'Mack', modelo: 'Granite GU813', anio: 2017, horas: 218400, unidad: 'km', condicion: 'Bueno', precio: 5400000, ofertas: true, provincia: 'Santiago', potencia: '425 hp', peso: '15,800 kg', implementos: 'Cama de 14 m³ reforzada, lona automática', descripcion: 'Camión de acarreo con mantenimiento de flota documentado. Cauchos de tracción al 60 %. Documentos al día y traspaso inmediato.' },
  { de: 'cibao', categoria: 'montacargas', sub: 'Montacargas de combustión', marca: 'Manitou', modelo: 'MI25D', anio: 2020, horas: 2900, condicion: 'Muy bueno', precio: 1450000, provincia: 'Puerto Plata', potencia: '46 hp', peso: '3,600 kg', implementos: 'Horquillas de 1.2 m, torre triple de 4.7 m, desplazador lateral', descripcion: 'Montacargas diésel de 2.5 toneladas usado en almacén techado. Poco desgaste en mástil y cadenas.' },
  { de: 'cibao', categoria: 'generadores', sub: 'Planta insonorizada', marca: 'SANY', modelo: 'SGP150', anio: 2022, horas: 1120, condicion: 'Muy bueno', precio: 2350000, provincia: 'Santiago', potencia: '150 kW', peso: '2,100 kg', implementos: 'Tablero de transferencia automática, tanque de 400 galones', descripcion: 'Planta insonorizada de respaldo para nave industrial. Sustituida por una de mayor capacidad. Consumo y horas certificados por el tablero.' },

  { de: 'surmaq', categoria: 'volteos', sub: 'Volteo articulado (dumper)', marca: 'Caterpillar', modelo: '745C', anio: 2017, horas: 8400, condicion: 'Bueno', precio: 16900000, provincia: 'Barahona', potencia: '376 hp', peso: '33,900 kg', implementos: 'Cama de 25 m³, sistema de suspensión hidroneumática', descripcion: 'Camión articulado de minería no metálica. Trabajó en cantera de caliza. Tren de potencia sin intervenciones mayores.' },
  { de: 'surmaq', categoria: 'excavadoras', sub: 'Excavadora mediana (6 a 25 t)', marca: 'Komatsu', modelo: 'PC138US', anio: 2020, horas: 3050, condicion: 'Muy bueno', precio: 6400000, ofertas: true, provincia: 'Azua', potencia: '97 hp', peso: '13,500 kg', implementos: 'Cucharón de 0.5 m³, cuchilla frontal, línea de martillo', descripcion: 'Excavadora de radio corto en muy buen estado. Utilizada en canales de riego. Se entrega con inspección hidráulica reciente.' },
  { de: 'surmaq', categoria: 'compactadoras', sub: 'Rodillo pata de cabra', marca: 'Dynapac', modelo: 'CA2500', anio: 2015, horas: 6800, condicion: 'Regular', precio: 2100000, ofertas: true, provincia: 'Barahona', potencia: '110 hp', peso: '10,500 kg', implementos: 'Tambor pata de cabra, cabina abierta con toldo', descripcion: 'Rodillo para compactación de suelo arcilloso. Operativo, requiere pintura y cambio de asiento. Precio ajustado por condición estética.' },

  { de: 'jperez', categoria: 'retroexcavadoras', sub: 'Retroexcavadora 4x4', marca: 'JCB', modelo: '3CX', anio: 2017, horas: 6980, condicion: 'Bueno', precio: 2450000, ofertas: true, destacado: true, provincia: 'Puerto Plata', municipio: 'San Felipe', potencia: '92 hp', peso: '8,100 kg', implementos: 'Cucharón 4 en 1, cucharón trasero de 18", martillo hidráulico incluido', descripcion: 'Equipo de mi propiedad, usado en trabajos particulares de movimiento de tierra. Vendo por retiro de la actividad. Se puede inspeccionar y probar en Puerto Plata.' },
  { de: 'jperez', categoria: 'cargadores', sub: 'Cargador de oruga', marca: 'CASE', modelo: '1150M', anio: 2014, horas: 9600, condicion: 'Regular', precio: 3900000, ofertas: true, provincia: 'Puerto Plata', potencia: '141 hp', peso: '16,800 kg', implementos: 'Hoja topadora semi-U, ripper trasero', descripcion: 'Bulldozer de cadenas operativo. Tren de rodaje al 45 %, motor y transmisión en buen estado. Ideal para quien pueda hacerle el tren de rodaje.' },

  { de: 'mrosario', categoria: 'excavadoras', sub: 'Miniexcavadora (hasta 6 t)', marca: 'Bobcat', modelo: 'E50', anio: 2022, horas: 1080, condicion: 'Como nuevo', precio: 3290000, provincia: 'Santo Domingo', municipio: 'Villa Mella', potencia: '49 hp', peso: '4,900 kg', implementos: 'Cucharón de 600 mm, cuchilla niveladora, cabina cerrada', descripcion: 'Miniexcavadora comprada nueva para una obra que ya terminó. Guardada bajo techo. Sin uso desde hace ocho meses. Papeles de importación en regla.' },
  { de: 'mrosario', categoria: 'gruas', sub: 'Grúa articulada (hidrogrúa)', marca: 'XCMG', modelo: 'SQ8SK3Q', anio: 2019, horas: 2400, condicion: 'Bueno', precio: 4600000, ofertas: true, provincia: 'Santo Domingo', potencia: '8 t·m', peso: '3,200 kg', implementos: 'Pluma de 3 secciones, estabilizadores hidráulicos, control remoto', descripcion: 'Hidrogrúa de 8 toneladas-metro montada sobre chasis, se vende con o sin camión. Cables y poleas revisados. Certificación de carga vigente.' },
];

/* ── Siembra ────────────────────────────────────────────────
   Todo pasa por las mismas funciones que usa la API: si una regla de
   negocio cambia, el inventario de demostración cambia con ella en vez
   de quedarse describiendo un sistema que ya no existe. */

function vaciar() {
  const d = db.abrir();
  const usuarios = d.prepare("SELECT id FROM usuarios WHERE correo LIKE ?").all('%@' + DOMINIO);
  if (!usuarios.length) return 0;

  // Las claves foráneas están en ON DELETE CASCADE: borrar la
  // organización se lleva sucursales, anuncios, fotos y métricas.
  const orgs = d.prepare(`SELECT DISTINCT organizacion_id AS id FROM miembros WHERE usuario_id IN (${
    usuarios.map(() => '?').join(',')})`).all(...usuarios.map((u) => u.id));

  d.prepare('BEGIN').run();
  try {
    orgs.forEach((o) => d.prepare('DELETE FROM organizaciones WHERE id = ?').run(o.id));
    usuarios.forEach((u) => d.prepare('DELETE FROM usuarios WHERE id = ?').run(u.id));
    d.prepare('COMMIT').run();
  } catch (e) {
    d.prepare('ROLLBACK').run();
    throw e;
  }
  return usuarios.length;
}

function sembrar() {
  const d = db.abrir();
  const porClave = new Map();

  for (const a of ANUNCIANTES) {
    const correo = `${a.clave}@${DOMINIO}`;
    if (db.usuarioPorCorreo(correo)) {
      console.log(`· ${correo} ya existe, se omite`);
      const u = db.usuarioPorCorreo(correo);
      porClave.set(a.clave, db.organizacionDe(u.id));
      continue;
    }

    const { idUsuario } = db.crearCuenta({
      correo,
      clave: CLAVE,
      nombre: a.contacto || a.nombre,
      telefono: a.telefono,
      tipo: a.tipo,
      empresa: a.empresa,
      rnc: a.rnc,
      direccion: a.direccion,
      provincia: a.provincia,
      municipio: a.municipio,
    });

    // La demostración entra directa: el código de correo ya se probó
    // en su propio recorrido y aquí solo estorbaría.
    db.marcarCorreoVerificado(idUsuario);

    const org = db.organizacionDe(idUsuario);
    porClave.set(a.clave, org);

    if (a.tipo === 'dealer') {
      // Los dealers de demostración nacen aprobados. `crearCuenta` los
      // deja 'pendiente', que es lo correcto en el sitio real, pero una
      // demostración con el directorio vacío no enseña nada: aquí se
      // simula que ya pasaron la revisión.
      d.prepare(`UPDATE organizaciones
                 SET web = ?, descripcion = ?, verificada = ?, estado_revision = 'aprobada'
                 WHERE id = ?`)
        .run(a.web || null, a.descripcion || null, a.verificada ? 1 : 0, org.id);
      (a.sucursales || []).forEach((s) => db.crearSucursal(org.id, s));
    }

    console.log(`✓ ${a.empresa || a.nombre} (${correo})`);
  }

  // Cada anunciante contrata su plan una sola vez. El cobro va marcado
  // como 'demo' en la tabla de pagos, igual que el simulado de la API.
  for (const a of ANUNCIANTES) {
    const org = porClave.get(a.clave);
    if (!org || db.suscripcionActiva(org.id)) continue;
    const plan = db.planPorId(a.plan);
    // El precio vigente ya trae aplicada la promoción que corra: así el
    // historial de pagos de la demostración coincide con lo que habría
    // cobrado la API.
    const subtotal = plan.precio_vigente;
    db.contratar({
      idOrg: org.id,
      idPlan: plan.id,
      dias: 60,
      ciclo: plan.modalidad === 'membresia' ? 'mensual' : null,
      cobro: {
        subtotal,
        itbis: Math.round(subtotal * 0.18),
        total: Math.round(subtotal * 1.18),
        referencia: `TE-DEMO-${a.clave.toUpperCase()}`,
        procesador: 'demo',
      },
    });
  }

  let creados = 0;
  for (const e of INVENTARIO) {
    const org = porClave.get(e.de);
    if (!org) continue;

    const titulo = `${e.anio} ${e.marca} ${e.modelo}`;
    const yaEsta = d.prepare(
      'SELECT 1 FROM anuncios WHERE organizacion_id = ? AND marca = ? AND modelo = ? AND anio = ?')
      .get(org.id, e.marca, e.modelo, e.anio);
    if (yaEsta) continue;

    const sucursales = db.sucursalesDe(org.id);
    // Se reparte el inventario entre las sucursales del dealer, que es
    // lo que permite comprobar que el perfil público las distingue.
    const sucursal = sucursales[creados % sucursales.length] || sucursales[0];
    const susc = db.suscripcionActiva(org.id);
    const membresia = susc && susc.modalidad === 'membresia';

    db.crearAnuncio({
      idOrg: org.id,
      idSucursal: sucursal && sucursal.id,
      idSuscripcion: susc && susc.id,
      categoria: e.categoria,
      subcategoria: e.sub,
      marca: e.marca,
      modelo: e.modelo,
      anio: e.anio,
      condicion: e.condicion,
      usoValor: e.horas,
      usoUnidad: e.unidad || 'h',
      potencia: e.potencia,
      peso: e.peso,
      implementos: e.implementos,
      descripcion: e.descripcion,
      provincia: e.provincia,
      municipio: e.municipio,
      precio: e.precio,
      moneda: 'DOP',
      modalidadPrecio: e.ofertas ? 'ofertas' : 'fijo',
      financiamiento: org.tipo === 'dealer',
      vence: membresia ? null : db.sumarDias(60),
      destacadoHasta: e.destacado ? db.sumarDias(30) : null,
      fotos: [0, 1, 2, 3].map((i) => fotoDemo(e.categoria, titulo, i)),
      telefonos: [
        { numero: sucursal && sucursal.telefono ? sucursal.telefono : '8090000000', tipo: 'ambos', nota: sucursal ? sucursal.nombre : null },
      ],
    });
    creados++;
  }

  return { anunciantes: porClave.size, anuncios: creados };
}

/* ── Flota propia ───────────────────────────────────────── */

/* Los equipos de alquiler y las camas de transporte, tal como estaban
   escritos a mano en assets/data.js antes de que se pudieran
   administrar. No es demostración: es el inventario real de partida, y
   por eso se siembra siempre y no se toca si ya existe. */
const FLOTA_INICIAL = [
  ['alquiler', 'Excavadora 20 t', 'Clase CAT 320 · brazo estándar · con operador', 'i-excavadora', 'día', null],
  ['alquiler', 'Retroexcavadora 4x4', 'Clase JCB 3CX · martillo opcional', 'i-retro', 'día', null],
  ['alquiler', 'Cargador frontal 3 m³', 'Clase WA200 · ideal para acopio', 'i-cargador', 'día', null],
  ['alquiler', 'Camión volteo 16 m³', 'Con chofer · movimiento de material', 'i-volteo', 'viaje', null],
  ['alquiler', 'Rodillo compactador', '11 t · vibratorio liso', 'i-rodillo', 'día', null],
  ['alquiler', 'Planta eléctrica 100 kW', 'Insonorizada · diésel · tablero incluido', 'i-generador', 'semana', null],

  ['transporte', 'Lowboy 40 t', 'Excavadoras de 20 t en adelante, grúas y equipo de oruga', 'i-lowboy', null, 40],
  ['transporte', 'Cama baja 25 t', 'Retroexcavadoras, cargadores medianos y rodillos', 'i-lowboy', null, 25],
  ['transporte', 'Plataforma 15 t', 'Montacargas, plantas eléctricas y equipo compacto', 'i-lowboy', null, 15],
  ['transporte', 'Cama con rampas 8 t', 'Minicargadores, miniexcavadoras y compactadoras chicas', 'i-lowboy', null, 8],
];

function sembrarFlota() {
  const d = db.abrir();
  const hay = d.prepare('SELECT COUNT(*) AS n FROM flota').get().n;
  if (hay) return 0;

  const ins = d.prepare(`INSERT INTO flota
    (id, servicio, nombre, detalle, icono, unidad, capacidad, activo, orden, creado)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`);
  const t = db.ahora();
  FLOTA_INICIAL.forEach(([servicio, nombre, detalle, icono, unidad, capacidad], i) => {
    ins.run(db.id(), servicio, nombre, detalle, icono, unidad, capacidad, i, t);
  });
  return FLOTA_INICIAL.length;
}

if (require.main === module) {
  db.abrir();
  if (process.argv.includes('--vaciar')) {
    const n = vaciar();
    console.log(n ? `Retirados ${n} anunciantes de demostración.` : 'No había nada de demostración.');
  } else {
    const nf = sembrarFlota();
    if (nf) console.log(`Flota propia: ${nf} elementos sembrados (alquiler y transporte).`);
    const r = sembrar();
    const total = db.estadisticas();
    console.log(`\n${r.anuncios} anuncios nuevos. El catálogo tiene ${total.anuncios} activos `
      + `de ${total.anunciantes} anunciantes, ${total.dealers} con perfil público.`);
    console.log(`Acceso de prueba: caribe@${DOMINIO} · contraseña ${CLAVE}`);
  }
}

module.exports = { sembrar, vaciar, sembrarFlota };
