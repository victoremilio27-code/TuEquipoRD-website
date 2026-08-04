/* ═══════════════════════════════════════════════════════════
   TuEquipoRD · Catálogos fijos de la interfaz

   Aquí vive lo que es TEXTO y CLASIFICACIÓN: nombres de categorías y
   subcategorías, escala de condición, provincias, marcas admitidas y
   la descripción comercial de cada plan.

   Aquí NO vive nada de lo siguiente, y no debe volver:
   · Inventario ni dealers  → los sirve /api desde la base de datos.
   · Precios ni promociones → los sirve /api/planes, que lee la misma
     fila que después se cobra. `precio` de PLANES se sobreescribe al
     arrancar con el precio vigente del servidor (ver cargarPlanes en
     app.js). Con la promoción escrita aquí, la página llegó a ofrecer
     el plan Estándar sin costo mientras el servidor lo cobraba.
   ═══════════════════════════════════════════════════════════ */

/* La taxonomía —categorías, subcategorías, marcas y modelos— vive
   ahora en assets/taxonomia.js, que cargan tanto el navegador como el
   servidor. Aquí había una copia con una sola lista global de 22
   marcas que se ofrecía en todas las categorías: se podía publicar una
   excavadora marca Genie o un generador marca Mack.

   Se dejan aquí las listas que no forman parte de esa jerarquía:
   condiciones, provincias, planes y el resto del catálogo editorial. */


/* Escala de condición del equipo. El orden va de mejor a peor y así
   se muestra en el formulario y en la ficha. */
const CONDICIONES = [
  { id: 'nuevo',     nombre: 'Nuevo',      detalle: 'Sin uso, con garantía de fábrica' },
  { id: 'como-nuevo', nombre: 'Como nuevo', detalle: 'Uso mínimo, sin trabajos pendientes' },
  { id: 'muy-bueno', nombre: 'Muy bueno',  detalle: 'Operativo, mantenimiento al día' },
  { id: 'bueno',     nombre: 'Bueno',      detalle: 'Operativo, con desgaste normal de uso' },
  { id: 'regular',   nombre: 'Regular',    detalle: 'Operativo, requiere trabajos menores' },
  { id: 'reparar',   nombre: 'Para reparar', detalle: 'No operativo o con avería declarada' },
];

/* Modalidad de precio. Define cómo se presenta la cifra al comprador y
   si el anuncio habilita el botón de oferta.

   Todo anuncio publica una cifra. El "precio a consultar" se retiró a
   propósito: el comprador de maquinaria filtra por presupuesto, y un
   anuncio sin precio queda fuera de esas búsquedas y recibe menos
   contactos que uno con la cifra puesta. Quien no quiera cerrar el
   número usa "acepta ofertas". */
const MODALIDADES_PRECIO = [
  { id: 'fijo',    nombre: 'Precio fijo',    detalle: 'La cifra publicada no se negocia' },
  { id: 'ofertas', nombre: 'Acepta ofertas', detalle: 'Se publica la cifra y el comprador puede enviar una oferta' },
];

const MONEDAS = [
  { id: 'DOP', nombre: 'Peso dominicano (RD$)', simbolo: 'RD$' },
  { id: 'USD', nombre: 'Dólar estadounidense (US$)', simbolo: 'US$' },
];

/* Medios de contacto que puede declarar el anunciante. Puede añadir
   varios de cada uno: cada número se guarda con el uso que se le da. */
const TIPOS_CONTACTO = [
  { id: 'llamadas', nombre: 'Llamadas' },
  { id: 'whatsapp', nombre: 'WhatsApp' },
  { id: 'ambos',    nombre: 'Llamadas y WhatsApp' },
];

/* ITBIS vigente sobre servicios de publicidad. Se aplica al precio del
   plan en el resumen de pago; nunca se escribe a mano en la interfaz. */
const ITBIS = 0.18;

const PROVINCIAS = [
  'Distrito Nacional', 'Santo Domingo', 'Santiago', 'La Vega', 'San Cristóbal',
  'La Romana', 'Puerto Plata', 'San Pedro de Macorís', 'La Altagracia', 'Duarte',
  'Espaillat', 'Monseñor Nouel', 'Barahona', 'Azua', 'Peravia', 'Sánchez Ramírez',
];

/* ── Lo que NO está aquí ──────────────────────────────────
   El inventario y el directorio de dealers vivían en este archivo como
   dos arreglos escritos a mano, y app.js los mezclaba con los anuncios
   reales al pintar el catálogo. Se retiraron:

   · La portada anunciaba "24 equipos publicados" con la base vacía, y
     el directorio mostraba cinco empresas inexistentes con sello de
     verificadas. Publicar inventario que no existe es una promesa
     falsa al comprador y un problema legal, no un detalle estético.
   · Sus fichas no abrían: el enlace llevaba a un anuncio que la API no
     conocía. Cada tarjeta de ejemplo era una vía muerta.
   · Ninguna cifra del sitio podía usarse para decidir nada.

   Ahora TODO sale de la base a través de /api, incluidos los conteos
   por categoría, marca y provincia (ver cargarEstadisticas en app.js).
   Para trabajar con el catálogo lleno, `node tools/seed.js` siembra
   anunciantes y anuncios de verdad, que se abren, se contactan y
   caducan como los de un cliente real.
   ──────────────────────────────────────────────────────── */


/* Flota propia de alquiler. No son anuncios de terceros: son los
   únicos equipos que se alquilan a través de la página. */
const EQUIPOS_ALQUILER = [
  { id: 'alq-exc-20t',  nombre: 'Excavadora 20 t',        detalle: 'Clase CAT 320 · brazo estándar · con operador', icono: 'i-excavadora',  unidad: 'día' },
  { id: 'alq-retro',    nombre: 'Retroexcavadora 4x4',    detalle: 'Clase JCB 3CX · martillo opcional',             icono: 'i-retro',       unidad: 'día' },
  { id: 'alq-cargador', nombre: 'Cargador frontal 3 m³',  detalle: 'Clase WA200 · ideal para acopio',               icono: 'i-cargador',    unidad: 'día' },
  { id: 'alq-volteo',   nombre: 'Camión volteo 16 m³',    detalle: 'Con chofer · movimiento de material',           icono: 'i-volteo',      unidad: 'viaje' },
  { id: 'alq-rodillo',  nombre: 'Rodillo compactador',    detalle: '11 t · vibratorio liso',                        icono: 'i-rodillo',     unidad: 'día' },
  { id: 'alq-planta',   nombre: 'Planta eléctrica 100 kW', detalle: 'Insonorizada · diésel · tablero incluido',     icono: 'i-generador',   unidad: 'semana' },
];

/* ── Transporte ───────────────────────────────────────────
   Flota propia de lowboys. Se transporta cualquier equipo, sea o no
   de la página. La capacidad manda: de ella sale qué cama se asigna.
   ──────────────────────────────────────────────────────── */
const FLOTA_TRANSPORTE = [
  { id: 'lowboy-40', nombre: 'Lowboy 40 t',        detalle: 'Excavadoras de 20 t en adelante, grúas y equipo de oruga', capacidad: 40, icono: 'i-lowboy' },
  { id: 'camabaja-25', nombre: 'Cama baja 25 t',   detalle: 'Retroexcavadoras, cargadores medianos y rodillos',         capacidad: 25, icono: 'i-lowboy' },
  { id: 'plataforma-15', nombre: 'Plataforma 15 t', detalle: 'Montacargas, plantas eléctricas y equipo compacto',       capacidad: 15, icono: 'i-lowboy' },
  { id: 'rampas-8', nombre: 'Cama con rampas 8 t', detalle: 'Minicargadores, miniexcavadoras y compactadoras chicas',   capacidad: 8,  icono: 'i-lowboy' },
];

/* Puntos de referencia con coordenadas reales. Sirven para situar
   origen y destino en el mapa y como paradas de referencia en la ruta.
   Los dos puertos enlazan con el servicio de importación. */
const CIUDADES_RD = [
  { id: 'santo-domingo', nombre: 'Santo Domingo',        lat: 18.4861, lon: -69.9312, ancla: true },
  { id: 'santiago',      nombre: 'Santiago',             lat: 19.4517, lon: -70.6970, ancla: true },
  { id: 'puerto-plata',  nombre: 'Puerto Plata',         lat: 19.7808, lon: -70.6871, ancla: true },
  { id: 'la-romana',     nombre: 'La Romana',            lat: 18.4273, lon: -68.9728, ancla: true },
  { id: 'higuey',        nombre: 'Higüey',               lat: 18.6157, lon: -68.7079, ancla: true },
  { id: 'barahona',      nombre: 'Barahona',             lat: 18.2085, lon: -71.1008, ancla: true },
  { id: 'samana',        nombre: 'Samaná',               lat: 19.2058, lon: -69.3364, ancla: true },
  { id: 'monte-cristi',  nombre: 'Monte Cristi',         lat: 19.8520, lon: -71.6461, ancla: true },
  { id: 'la-vega',       nombre: 'La Vega',              lat: 19.2214, lon: -70.5288, ancla: false },
  { id: 'bonao',         nombre: 'Bonao',                lat: 18.9386, lon: -70.4097, ancla: false },
  { id: 'azua',          nombre: 'Azua',                 lat: 18.4531, lon: -70.7350, ancla: false },
  { id: 'san-pedro',     nombre: 'San Pedro de Macorís', lat: 18.4539, lon: -69.2970, ancla: false },
  { id: 'san-francisco', nombre: 'San Francisco de Macorís', lat: 19.3009, lon: -70.2529, ancla: false },
  { id: 'nagua',         nombre: 'Nagua',                lat: 19.3831, lon: -69.8475, ancla: false },
  { id: 'dajabon',       nombre: 'Dajabón',              lat: 19.5500, lon: -71.7083, ancla: false },
  { id: 'pedernales',    nombre: 'Pedernales',           lat: 18.0381, lon: -71.7444, ancla: false },
  { id: 'bani',          nombre: 'Baní',                 lat: 18.2833, lon: -70.3311, ancla: false },
  { id: 'puerto-haina',  nombre: 'Puerto de Haina',      lat: 18.4200, lon: -70.0200, ancla: false, puerto: true },
  { id: 'puerto-caucedo', nombre: 'Puerto de Caucedo',   lat: 18.4283, lon: -69.6333, ancla: false, puerto: true },
];

/* Contorno simplificado del país, en pares [lon, lat], en sentido horario
   desde el noroeste. Es un mapa esquemático para situar un camión entre
   provincias: NO es un levantamiento catastral ni sirve para linderos. */
const SILUETA_RD = [
  [-71.68, 19.88], [-71.30, 19.85], [-71.10, 19.90], [-70.95, 19.74], [-70.69, 19.80],
  [-70.40, 19.72], [-70.10, 19.68], [-69.90, 19.64], [-69.83, 19.38], [-69.60, 19.30],
  [-69.45, 19.32], [-69.15, 19.30], [-69.24, 19.16], [-69.55, 19.12], [-69.85, 19.06],
  [-69.98, 18.96], [-69.60, 18.98], [-69.30, 19.00], [-69.04, 18.98], [-68.70, 18.90],
  [-68.42, 18.75], [-68.33, 18.61], [-68.42, 18.42], [-68.70, 18.38], [-68.95, 18.40],
  [-69.30, 18.42], [-69.62, 18.40], [-69.88, 18.45], [-70.10, 18.35], [-70.33, 18.25],
  [-70.55, 18.30], [-70.75, 18.35], [-71.00, 18.30], [-71.10, 18.20], [-71.25, 18.00],
  [-71.40, 17.80], [-71.42, 17.60], [-71.58, 17.72], [-71.65, 17.90], [-71.75, 18.02],
  [-71.72, 18.25], [-71.85, 18.49], [-71.70, 18.72], [-71.72, 19.00], [-71.65, 19.28],
  [-71.71, 19.55], [-71.75, 19.72], [-71.68, 19.88],
];

/* ── Seguimiento GPS ──────────────────────────────────────
   PROVEEDOR_GPS gobierna todo. Mientras sea null NO hay rastreo real:
   la página corre un envío de ejemplo y lo rotula como demostración en
   tres lugares, para que nadie lo tome por un envío suyo.

   Cuando se contrate el proveedor, poner aquí { nombre, url, token } y
   escribir la llamada en posicionEnvio() de app.js. Es el único punto
   del sitio que toca el GPS. */
const PROVEEDOR_GPS = null;

/* Envío de ejemplo para la demostración del mapa. El código lleva
   "DEMO" a propósito: que nadie lo confunda con un envío real. */
const ENVIO_DEMO = {
  codigo: 'TE-DEMO-01',
  equipo: '2021 Caterpillar 320',
  cama: 'Lowboy 40 t',
  unidad: 'Lowboy TE-04',
  origen: 'santiago',
  destino: 'santo-domingo',
  // Puntos intermedios reales de la Autopista Duarte.
  paso: ['la-vega', 'bonao'],
  salida: '08:10',
  llegadaEstimada: '11:40',
  distanciaKm: 155,
};


/* Entidades que financian maquinaria.
   Los contactos van vacíos a propósito: hay que confirmarlos con cada
   entidad antes de publicarlos. contactoPendiente() los marca en la UI. */
const FINANCIADORAS = [
  { id: 'banco-a',   nombre: 'Banca múltiple',        tipo: 'Banco',              enfoque: 'Préstamo comercial con el equipo en garantía. Plazos largos y tasa fija o variable.', requisitos: ['RNC o cédula', 'Estados financieros o ITBIS', 'Inicial desde 20 %'], telefono: null, correo: null, web: null },
  { id: 'leasing-a', nombre: 'Arrendamiento (leasing)', tipo: 'Compañía de leasing', enfoque: 'La entidad compra el equipo y tú pagas cuotas con opción de compra al final.', requisitos: ['RNC activo', 'Un año de operación', 'Sin inicial en algunos casos'], telefono: null, correo: null, web: null },
  { id: 'coop-a',    nombre: 'Cooperativa',           tipo: 'Cooperativa',        enfoque: 'Montos menores y aprobación más rápida. Buena vía para equipo compacto.', requisitos: ['Ser socio', 'Aporte inicial', 'Codeudor según monto'], telefono: null, correo: null, web: null },
  { id: 'dealer-a',  nombre: 'Financiamiento del dealer', tipo: 'Directo',        enfoque: 'Algunos dealers del directorio financian de su cartera, sobre todo en equipo nuevo.', requisitos: ['Varía por dealer', 'Inicial negociable'], telefono: null, correo: null, web: null },
];

/* ── Planes de publicación ───────────────────────────────
   Conviven dos modelos de cobro:

   · Compra puntual — Estándar, Destacado y sus múltiples. Se paga
     una vigencia de 30 o 60 días y el anuncio caduca al vencer.
     `precio` es siempre el de 30 días; el de 60 sale de RECARGO_60.

   · Membresía — Dealer. Cuota recurrente, mensual o anual, con la
     tarjeta tokenizada en el archivo del anunciante. No hay vigencia
     por anuncio: las publicaciones siguen activas mientras la
     membresía esté al día. `precio` es la cuota MENSUAL.

   Lo distingue `membresia: true`. Ningún porcentaje se escribe a
   mano: el ahorro de 60 días y el del ciclo anual se calculan.
   ──────────────────────────────────────────────────────── */

/* 60 días cuestan 80 % más que 30, no el doble. */
const RECARGO_60 = 1.8;

/* Meses que no se cobran al pagar la membresía por año adelantado. */
const MESES_GRATIS_ANUAL = 2;

/* Ciclos de facturación de la membresía. `meses` es lo que dura el
   ciclo; lo que se cobra sale de restarle MESES_GRATIS_ANUAL al
   anual, nunca de un precio escrito aparte. */
const CICLOS_MEMBRESIA = [
  { id: 'mensual', nombre: 'Mensual', meses: 1 },
  { id: 'anual',   nombre: 'Anual',   meses: 12 },
];

const PLANES = [
  {
    id: 'estandar',
    nombre: 'Estándar',
    nivel: 'estandar',
    precio: 2000,
    publicaciones: 1,
    portada: null,
    incluye: [
      'Un anuncio activo',
      'Hasta 8 fotografías del equipo',
      'Ficha técnica completa con horas y condición',
      'Contacto directo por teléfono y WhatsApp',
    ],
  },
  {
    id: 'multi-estandar',
    nombre: 'Múltiple Estándar',
    nivel: 'estandar',
    precio: 8000,
    publicaciones: 5,
    compararCon: 'estandar',
    portada: null,
    incluye: [
      'Cinco anuncios activos de forma simultánea',
      'Todas las prestaciones del plan Estándar en cada uno',
      'Sustitución sin costo del equipo vendido por otro',
      'Facturación única por los cinco anuncios',
    ],
  },
  {
    id: 'destacado',
    nombre: 'Destacado',
    nivel: 'destacado',
    precio: 3500,
    publicaciones: 1,
    recomendado: true,
    portada: { dias: 15 },
    incluye: [
      'Un anuncio activo',
      'Hasta 20 fotografías y un video del equipo en operación',
      'Distintivo "Destacado" en el catálogo',
      'Posición preferente en los resultados de búsqueda',
      'Documentación adjunta: factura, matrícula o certificado de importación',
      'Estadísticas de visualizaciones y de clics en el teléfono',
      'Difusión en las redes sociales de TuEquipoRD',
    ],
  },
  {
    id: 'multi-destacado',
    nombre: 'Múltiple Destacados',
    nivel: 'destacado',
    precio: 14000,
    publicaciones: 5,
    compararCon: 'destacado',
    portada: { dias: 15 },
    incluye: [
      'Cinco anuncios activos con todas las prestaciones de Destacado',
      'Los cinco en el panel de Destacados de la portada',
      'Sustitución sin costo del equipo vendido por otro',
      'Estadísticas comparadas entre los cinco equipos',
    ],
  },
  {
    id: 'dealer',
    nombre: 'Dealer',
    nivel: 'dealer',
    membresia: true,
    soloDealer: true,
    perfilPublico: true,
    precio: 40000,          // cuota mensual, no compra de 30 días
    publicaciones: 20,
    fotosMaximas: 20,
    portada: { diasTodas: 7, permanentes: 5 },
    incluye: [
      'Hasta 20 anuncios activos de forma simultánea',
      'Sin vigencia por anuncio: permanecen publicados mientras la membresía esté al día',
      'Página pública de la empresa y perfil en el directorio de dealers',
      'Cada anuncio nuevo sale destacado durante sus primeros 7 días',
      'Estadísticas de visualizaciones y llamadas por equipo',
      'Sin permanencia mínima: puede cancelar en cualquier momento',
    ],
  },
  {
    id: 'dealer-premium',
    nombre: 'Dealer Premium',
    nivel: 'dealer',
    membresia: true,
    soloDealer: true,
    perfilPublico: true,
    precio: 60000,
    publicaciones: null,    // sin límite
    fotosMaximas: 30,
    portada: { diasTodas: 7, permanentes: 5 },
    incluye: [
      'Anuncios activos sin límite',
      'Sin vigencia por anuncio: permanecen publicados mientras la membresía esté al día',
      'Página pública de la empresa con posición preferente en el directorio',
      'Hasta 30 fotografías y video por equipo',
      'Cada anuncio nuevo sale destacado durante sus primeros 7 días',
      'Estadísticas por equipo, por sucursal y por vendedor',
      'Varios usuarios administradores sobre la misma cuenta',
      'Sin permanencia mínima: puede cancelar en cualquier momento',
    ],
  },
];
