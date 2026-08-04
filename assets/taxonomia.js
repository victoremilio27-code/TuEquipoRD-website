/* ═══════════════════════════════════════════════════════════
   TuEquipoRD · Taxonomía de equipos
   Categoría → Subcategoría → Marca → Modelo

   FUENTE ÚNICA. Este archivo lo carga el navegador con <script> y lo
   importa el servidor con require(). Antes había dos listas de
   categorías —una en assets/data.js y otra escrita a mano en
   tools/api.js— que ya se habían desincronizado: el servidor aceptaba
   ocho categorías y el navegador ofrecía otras.

   POR QUÉ LA JERARQUÍA IMPORTA
   Antes existía una sola lista global de 22 marcas que se ofrecía en
   todas las categorías. Se podía publicar una excavadora marca Genie
   (que fabrica plataformas de elevación) o un generador marca Mack
   (que fabrica camiones). Eso ensucia el catálogo, rompe el filtro por
   marca y hace que el comprador desconfíe.

   Ahora cada subcategoría declara qué marcas la fabrican de verdad, y
   cada par subcategoría+marca declara sus modelos.

   SIEMPRE HAY SALIDA
   Ninguna lista de modelos puede ser exhaustiva: hay máquinas de los
   años ochenta, series regionales y ediciones que no aparecerán aquí
   jamás. Por eso toda lista de modelos admite «Otro modelo», que abre
   un campo libre. Bloquear una publicación legítima por no tener el
   modelo en una lista es peor que aceptar un texto escrito a mano.

   CÓMO AÑADIR
   · Una marca a una subcategoría → añadir su id en `marcas`.
   · Un modelo → añadirlo en MODELOS[subcategoría][marca].
   · Una subcategoría → añadirla en `subcategorias` de su categoría.
   No hay que tocar nada más: las pantallas y la validación del
   servidor leen de aquí.
   ═══════════════════════════════════════════════════════════ */

/* ── Registro de marcas ─────────────────────────────────────
   El id nunca cambia (queda guardado en los anuncios); el nombre es
   lo que se muestra y sí se puede corregir. */
const MARCAS = {
  // Maquinaria de construcción
  caterpillar: 'Caterpillar',
  komatsu: 'Komatsu',
  hitachi: 'Hitachi',
  volvo_ce: 'Volvo CE',
  liebherr: 'Liebherr',
  hyundai_ce: 'Hyundai Construction',
  doosan: 'Doosan',
  develon: 'Develon',
  kobelco: 'Kobelco',
  sany: 'SANY',
  xcmg: 'XCMG',
  zoomlion: 'Zoomlion',
  liugong: 'LiuGong',
  sdlg: 'SDLG',
  lonking: 'Lonking',
  case_ce: 'CASE',
  new_holland: 'New Holland',
  jcb: 'JCB',
  john_deere: 'John Deere',
  kubota: 'Kubota',
  yanmar: 'Yanmar',
  takeuchi: 'Takeuchi',
  bobcat: 'Bobcat',
  wacker_neuson: 'Wacker Neuson',
  gehl: 'Gehl',
  asv: 'ASV',
  terex: 'Terex',
  manitou: 'Manitou',
  merlo: 'Merlo',
  genie: 'Genie',
  jlg: 'JLG',
  haulotte: 'Haulotte',
  skyjack: 'Skyjack',
  snorkel: 'Snorkel',
  bomag: 'BOMAG',
  dynapac: 'Dynapac',
  hamm: 'HAMM',
  ammann: 'Ammann',
  sakai: 'Sakai',
  wirtgen: 'Wirtgen',
  vogele: 'Vögele',
  astec: 'Astec',
  atlas_copco: 'Atlas Copco',
  epiroc: 'Epiroc',
  ingersoll_rand: 'Ingersoll Rand',
  sullair: 'Sullair',
  soilmec: 'Soilmec',
  bauer: 'Bauer',
  junttan: 'Junttan',
  sandvik: 'Sandvik',
  furukawa: 'Furukawa',
  kawasaki: 'Kawasaki',
  shantui: 'Shantui',
  bell: 'Bell',
  altec: 'Altec',
  kalmar: 'Kalmar',
  kaeser: 'Kaeser',
  sdmo: 'SDMO',
  lincoln_electric: 'Lincoln Electric',
  miller: 'Miller',
  tadano: 'Tadano',
  grove: 'Grove',
  link_belt: 'Link-Belt',
  kato: 'Kato',
  palfinger: 'Palfinger',
  hiab: 'Hiab',
  fassi: 'Fassi',
  potain: 'Potain',
  hyster: 'Hyster',
  yale: 'Yale',
  toyota_industrial: 'Toyota',
  mitsubishi_forklift: 'Mitsubishi',
  nissan_forklift: 'Nissan',
  crown: 'Crown',
  clark: 'Clark',
  linde: 'Linde',
  heli: 'Heli',
  hangcha: 'Hangcha',

  // Camiones, cabezotes y autobuses
  freightliner: 'Freightliner',
  peterbilt: 'Peterbilt',
  kenworth: 'Kenworth',
  international: 'International',
  mack: 'Mack',
  western_star: 'Western Star',
  volvo_trucks: 'Volvo Trucks',
  ford: 'Ford',
  chevrolet: 'Chevrolet',
  gmc: 'GMC',
  ram: 'RAM',
  isuzu: 'Isuzu',
  hino: 'Hino',
  fuso: 'Mitsubishi Fuso',
  ud_trucks: 'UD Trucks',
  mercedes_benz: 'Mercedes-Benz',
  man: 'MAN',
  scania: 'Scania',
  iveco: 'Iveco',
  daf: 'DAF',
  foton: 'Foton',
  jac: 'JAC',
  sinotruk: 'Sinotruk / HOWO',
  shacman: 'Shacman',
  faw: 'FAW',
  dongfeng: 'Dongfeng',
  blue_bird: 'Blue Bird',
  thomas: 'Thomas Built',
  ic_bus: 'IC Bus',
  marcopolo: 'Marcopolo',
  busscar: 'Busscar',
  yutong: 'Yutong',
  king_long: 'King Long',
  toyota: 'Toyota',
  nissan: 'Nissan',

  // Remolques y patanas
  great_dane: 'Great Dane',
  utility: 'Utility',
  wabash: 'Wabash',
  fontaine: 'Fontaine',
  trail_king: 'Trail King',
  talbert: 'Talbert',
  landoll: 'Landoll',
  east: 'East',
  mac_trailer: 'MAC Trailer',
  doonan: 'Doonan',
  load_king: 'Load King',

  // Agrícola
  massey_ferguson: 'Massey Ferguson',
  fendt: 'Fendt',
  valtra: 'Valtra',
  deutz_fahr: 'Deutz-Fahr',
  claas: 'CLAAS',
  mahindra: 'Mahindra',
  landini: 'Landini',
  same: 'SAME',

  // Generadores y plantas
  cummins_power: 'Cummins Power',
  kohler: 'Kohler',
  generac: 'Generac',
  fg_wilson: 'FG Wilson',
  perkins: 'Perkins',
  denyo: 'Denyo',
  multiquip: 'Multiquip',
  himoinsa: 'Himoinsa',
  pramac: 'Pramac',
  aksa: 'AKSA',
  mitsubishi_power: 'Mitsubishi',
  honda: 'Honda',
  stanadyne: 'Stanadyne',

  otra: 'Otra marca',
};

/* ── Categorías y subcategorías ─────────────────────────────
   El orden es el que se ve en el selector. Va de lo más común en el
   mercado dominicano a lo más específico. */
const CATEGORIAS = [
  {
    id: 'excavadoras',
    nombre: 'Excavadoras',
    icono: 'i-excavadora',
    portada: null,
    subcategorias: [
      { id: 'exc-mini', nombre: 'Miniexcavadora (hasta 6 t)' },
      { id: 'exc-mediana', nombre: 'Excavadora mediana (6 a 25 t)' },
      { id: 'exc-pesada', nombre: 'Excavadora pesada (más de 25 t)' },
      { id: 'exc-ruedas', nombre: 'Excavadora de ruedas' },
      { id: 'exc-demolicion', nombre: 'Excavadora de demolición' },
      { id: 'exc-anfibia', nombre: 'Excavadora anfibia' },
    ],
  },
  {
    id: 'retroexcavadoras',
    nombre: 'Retroexcavadoras',
    icono: 'i-retro',
    portada: null,
    subcategorias: [
      { id: 'retro-4x2', nombre: 'Retroexcavadora 4x2' },
      { id: 'retro-4x4', nombre: 'Retroexcavadora 4x4' },
      { id: 'retro-extensible', nombre: 'Retroexcavadora con brazo extensible' },
    ],
  },
  {
    id: 'cargadores',
    nombre: 'Cargadores',
    icono: 'i-cargador',
    portada: null,
    subcategorias: [
      { id: 'car-ruedas', nombre: 'Cargador frontal de ruedas' },
      { id: 'car-mini', nombre: 'Minicargador (skid steer)' },
      { id: 'car-oruga', nombre: 'Minicargador de oruga' },
      { id: 'car-telescopico', nombre: 'Manipulador telescópico' },
    ],
  },
  {
    id: 'bulldozers',
    nombre: 'Bulldozers y topadoras',
    icono: 'i-hex',
    portada: null,
    subcategorias: [
      { id: 'dozer-oruga', nombre: 'Bulldozer de oruga' },
      { id: 'dozer-ruedas', nombre: 'Topadora de ruedas' },
    ],
  },
  {
    id: 'motoniveladoras',
    nombre: 'Motoniveladoras',
    icono: 'i-hex',
    portada: null,
    subcategorias: [
      { id: 'moto-estandar', nombre: 'Motoniveladora estándar' },
      { id: 'moto-articulada', nombre: 'Motoniveladora articulada' },
    ],
  },
  {
    id: 'compactadoras',
    nombre: 'Compactadoras',
    icono: 'i-rodillo',
    portada: null,
    subcategorias: [
      { id: 'comp-liso', nombre: 'Rodillo vibratorio liso' },
      { id: 'comp-pata', nombre: 'Rodillo pata de cabra' },
      { id: 'comp-neumatico', nombre: 'Rodillo neumático' },
      { id: 'comp-asfalto', nombre: 'Compactadora de asfalto (tándem)' },
      { id: 'comp-manual', nombre: 'Compactadora manual (bailarina o plancha)' },
    ],
  },
  {
    id: 'pavimentacion',
    nombre: 'Pavimentación y asfalto',
    icono: 'i-hex',
    portada: null,
    subcategorias: [
      { id: 'pav-finisher', nombre: 'Pavimentadora (finisher)' },
      { id: 'pav-fresadora', nombre: 'Fresadora de asfalto' },
      { id: 'pav-planta', nombre: 'Planta de asfalto' },
      { id: 'pav-recicladora', nombre: 'Recicladora / estabilizadora' },
    ],
  },
  {
    id: 'gruas',
    nombre: 'Grúas',
    icono: 'i-grua',
    portada: null,
    subcategorias: [
      { id: 'grua-camion', nombre: 'Grúa telescópica sobre camión' },
      { id: 'grua-todoterreno', nombre: 'Grúa todo terreno' },
      { id: 'grua-oruga', nombre: 'Grúa sobre oruga' },
      { id: 'grua-articulada', nombre: 'Grúa articulada (hidrogrúa)' },
      { id: 'grua-torre', nombre: 'Torre grúa' },
    ],
  },
  {
    id: 'elevacion',
    nombre: 'Plataformas de elevación',
    icono: 'i-hex',
    portada: null,
    subcategorias: [
      { id: 'elev-tijera', nombre: 'Plataforma de tijera' },
      { id: 'elev-articulada', nombre: 'Plataforma articulada (brazo)' },
      { id: 'elev-telescopica', nombre: 'Plataforma telescópica' },
      { id: 'elev-canasto', nombre: 'Canasto elevador sobre camión' },
    ],
  },
  {
    id: 'montacargas',
    nombre: 'Montacargas',
    icono: 'i-montacargas',
    portada: null,
    subcategorias: [
      { id: 'mont-combustion', nombre: 'Montacargas de combustión' },
      { id: 'mont-electrico', nombre: 'Montacargas eléctrico' },
      { id: 'mont-todoterreno', nombre: 'Montacargas todo terreno' },
      { id: 'mont-contenedor', nombre: 'Manipulador de contenedores' },
    ],
  },
  {
    id: 'camiones',
    nombre: 'Camiones y cabezotes',
    icono: 'i-volteo',
    portada: null,
    subcategorias: [
      { id: 'cam-cabezote', nombre: 'Cabezote / tractocamión' },
      { id: 'cam-volteo', nombre: 'Camión volteo' },
      { id: 'cam-articulado', nombre: 'Volteo articulado (dumper)' },
      { id: 'cam-rigido', nombre: 'Volteo rígido de obra' },
      { id: 'cam-plataforma', nombre: 'Camión de plataforma' },
      { id: 'cam-cisterna', nombre: 'Camión cisterna' },
      { id: 'cam-mixer', nombre: 'Camión hormigonera (mixer)' },
      { id: 'cam-grua', nombre: 'Camión con grúa' },
      { id: 'cam-carga', nombre: 'Camión de carga / furgón' },
      { id: 'cam-recoleccion', nombre: 'Camión recolector' },
    ],
  },
  {
    id: 'autobuses',
    nombre: 'Autobuses y minibuses',
    icono: 'i-hex',
    portada: null,
    subcategorias: [
      { id: 'bus-interurbano', nombre: 'Autobús interurbano' },
      { id: 'bus-urbano', nombre: 'Autobús urbano' },
      { id: 'bus-escolar', nombre: 'Autobús escolar' },
      { id: 'bus-minibus', nombre: 'Minibús' },
    ],
  },
  {
    id: 'remolques',
    nombre: 'Remolques y patanas',
    icono: 'i-lowboy',
    portada: null,
    subcategorias: [
      { id: 'rem-lowboy', nombre: 'Lowboy / cama baja' },
      { id: 'rem-plataforma', nombre: 'Plataforma (flatbed)' },
      { id: 'rem-furgon', nombre: 'Furgón seco' },
      { id: 'rem-refrigerado', nombre: 'Furgón refrigerado' },
      { id: 'rem-tolva', nombre: 'Tolva / volteo' },
      { id: 'rem-cisterna', nombre: 'Cisterna' },
      { id: 'rem-portacontenedor', nombre: 'Portacontenedor (chasis)' },
    ],
  },
  {
    id: 'agricola',
    nombre: 'Maquinaria agrícola',
    icono: 'i-hex',
    portada: null,
    subcategorias: [
      { id: 'agr-tractor', nombre: 'Tractor agrícola' },
      { id: 'agr-cosechadora', nombre: 'Cosechadora' },
      { id: 'agr-implemento', nombre: 'Implemento agrícola' },
    ],
  },
  {
    id: 'perforacion',
    nombre: 'Perforación y pilotaje',
    icono: 'i-hex',
    portada: null,
    subcategorias: [
      { id: 'perf-pozo', nombre: 'Perforadora de pozos' },
      { id: 'perf-pilote', nombre: 'Pilotadora' },
      { id: 'perf-roca', nombre: 'Perforadora de roca' },
    ],
  },
  {
    id: 'generadores',
    nombre: 'Generadores y compresores',
    icono: 'i-generador',
    portada: null,
    subcategorias: [
      { id: 'gen-diesel', nombre: 'Planta eléctrica diésel' },
      { id: 'gen-gas', nombre: 'Planta eléctrica a gas' },
      { id: 'gen-portatil', nombre: 'Generador portátil' },
      { id: 'gen-compresor', nombre: 'Compresor de aire' },
      { id: 'gen-soldadora', nombre: 'Soldadora / motosoldadora' },
    ],
  },
];

/* ── Marcas por subcategoría ────────────────────────────────
   Solo fabricantes que hacen ese tipo de equipo. Esta es la tabla que
   impide una excavadora marca Genie o un generador marca Mack. */
const MARCAS_POR_SUB = {
  // Excavadoras
  'exc-mini': ['kubota', 'takeuchi', 'bobcat', 'yanmar', 'caterpillar', 'komatsu', 'jcb', 'hitachi', 'volvo_ce', 'case_ce', 'new_holland', 'wacker_neuson', 'sany', 'hyundai_ce', 'doosan', 'develon', 'xcmg', 'john_deere', 'gehl', 'otra'],
  'exc-mediana': ['caterpillar', 'komatsu', 'hitachi', 'volvo_ce', 'hyundai_ce', 'doosan', 'develon', 'kobelco', 'sany', 'xcmg', 'liugong', 'jcb', 'case_ce', 'new_holland', 'john_deere', 'liebherr', 'zoomlion', 'sdlg', 'otra'],
  'exc-pesada': ['caterpillar', 'komatsu', 'hitachi', 'volvo_ce', 'liebherr', 'hyundai_ce', 'doosan', 'develon', 'kobelco', 'sany', 'xcmg', 'zoomlion', 'john_deere', 'otra'],
  'exc-ruedas': ['caterpillar', 'komatsu', 'hitachi', 'volvo_ce', 'liebherr', 'hyundai_ce', 'doosan', 'develon', 'case_ce', 'new_holland', 'jcb', 'sany', 'xcmg', 'otra'],
  'exc-demolicion': ['caterpillar', 'komatsu', 'hitachi', 'volvo_ce', 'liebherr', 'hyundai_ce', 'kobelco', 'sany', 'otra'],
  'exc-anfibia': ['sany', 'xcmg', 'hitachi', 'caterpillar', 'otra'],

  // Retroexcavadoras
  'retro-4x2': ['jcb', 'caterpillar', 'case_ce', 'new_holland', 'john_deere', 'komatsu', 'terex', 'xcmg', 'otra'],
  'retro-4x4': ['jcb', 'caterpillar', 'case_ce', 'new_holland', 'john_deere', 'komatsu', 'volvo_ce', 'terex', 'xcmg', 'sany', 'otra'],
  'retro-extensible': ['jcb', 'caterpillar', 'case_ce', 'new_holland', 'john_deere', 'otra'],

  // Cargadores
  'car-ruedas': ['caterpillar', 'komatsu', 'volvo_ce', 'john_deere', 'case_ce', 'new_holland', 'hyundai_ce', 'doosan', 'develon', 'liugong', 'sdlg', 'xcmg', 'sany', 'lonking', 'jcb', 'liebherr', 'kawasaki', 'otra'],
  'car-mini': ['bobcat', 'caterpillar', 'case_ce', 'new_holland', 'john_deere', 'jcb', 'kubota', 'takeuchi', 'gehl', 'asv', 'wacker_neuson', 'sany', 'otra'],
  'car-oruga': ['bobcat', 'caterpillar', 'asv', 'takeuchi', 'john_deere', 'case_ce', 'new_holland', 'kubota', 'jcb', 'otra'],
  'car-telescopico': ['manitou', 'jcb', 'merlo', 'caterpillar', 'genie', 'bobcat', 'new_holland', 'case_ce', 'xcmg', 'otra'],

  // Bulldozers
  'dozer-oruga': ['caterpillar', 'komatsu', 'john_deere', 'liebherr', 'sany', 'xcmg', 'shantui', 'case_ce', 'otra'],
  'dozer-ruedas': ['caterpillar', 'komatsu', 'xcmg', 'otra'],

  // Motoniveladoras
  'moto-estandar': ['caterpillar', 'komatsu', 'john_deere', 'volvo_ce', 'case_ce', 'new_holland', 'xcmg', 'sany', 'liugong', 'sdlg', 'otra'],
  'moto-articulada': ['caterpillar', 'komatsu', 'john_deere', 'volvo_ce', 'case_ce', 'xcmg', 'otra'],

  // Compactadoras
  'comp-liso': ['bomag', 'dynapac', 'hamm', 'caterpillar', 'ammann', 'sakai', 'volvo_ce', 'xcmg', 'sany', 'case_ce', 'jcb', 'otra'],
  'comp-pata': ['bomag', 'dynapac', 'hamm', 'caterpillar', 'ammann', 'sakai', 'volvo_ce', 'xcmg', 'otra'],
  'comp-neumatico': ['bomag', 'dynapac', 'hamm', 'caterpillar', 'ammann', 'sakai', 'xcmg', 'otra'],
  'comp-asfalto': ['bomag', 'dynapac', 'hamm', 'caterpillar', 'ammann', 'sakai', 'volvo_ce', 'wacker_neuson', 'otra'],
  'comp-manual': ['wacker_neuson', 'bomag', 'multiquip', 'dynapac', 'ammann', 'honda', 'otra'],

  // Pavimentación
  'pav-finisher': ['vogele', 'caterpillar', 'bomag', 'dynapac', 'volvo_ce', 'sany', 'xcmg', 'astec', 'otra'],
  'pav-fresadora': ['wirtgen', 'caterpillar', 'bomag', 'sany', 'xcmg', 'astec', 'otra'],
  'pav-planta': ['astec', 'ammann', 'sany', 'xcmg', 'otra'],
  'pav-recicladora': ['wirtgen', 'caterpillar', 'bomag', 'otra'],

  // Grúas
  'grua-camion': ['tadano', 'grove', 'link_belt', 'kato', 'terex', 'liebherr', 'xcmg', 'sany', 'zoomlion', 'manitou', 'otra'],
  'grua-todoterreno': ['liebherr', 'grove', 'tadano', 'terex', 'xcmg', 'sany', 'zoomlion', 'otra'],
  'grua-oruga': ['liebherr', 'link_belt', 'kobelco', 'hitachi', 'terex', 'sany', 'xcmg', 'zoomlion', 'otra'],
  'grua-articulada': ['palfinger', 'hiab', 'fassi', 'xcmg', 'sany', 'otra'],
  'grua-torre': ['potain', 'liebherr', 'terex', 'sany', 'xcmg', 'zoomlion', 'otra'],

  // Elevación
  'elev-tijera': ['genie', 'jlg', 'skyjack', 'haulotte', 'snorkel', 'sany', 'xcmg', 'otra'],
  'elev-articulada': ['genie', 'jlg', 'haulotte', 'snorkel', 'manitou', 'otra'],
  'elev-telescopica': ['genie', 'jlg', 'haulotte', 'snorkel', 'otra'],
  'elev-canasto': ['altec', 'terex', 'palfinger', 'otra'],

  // Montacargas
  'mont-combustion': ['toyota_industrial', 'hyster', 'yale', 'caterpillar', 'mitsubishi_forklift', 'nissan_forklift', 'clark', 'komatsu', 'crown', 'heli', 'hangcha', 'linde', 'doosan', 'otra'],
  'mont-electrico': ['toyota_industrial', 'crown', 'hyster', 'yale', 'linde', 'clark', 'mitsubishi_forklift', 'heli', 'hangcha', 'otra'],
  'mont-todoterreno': ['manitou', 'jcb', 'caterpillar', 'merlo', 'bobcat', 'otra'],
  'mont-contenedor': ['kalmar', 'hyster', 'terex', 'sany', 'otra'],

  // Camiones
  'cam-cabezote': ['freightliner', 'peterbilt', 'kenworth', 'international', 'mack', 'volvo_trucks', 'western_star', 'mercedes_benz', 'scania', 'man', 'daf', 'iveco', 'hino', 'ud_trucks', 'sinotruk', 'shacman', 'faw', 'dongfeng', 'foton', 'otra'],
  'cam-volteo': ['mack', 'freightliner', 'international', 'kenworth', 'peterbilt', 'western_star', 'volvo_trucks', 'isuzu', 'hino', 'fuso', 'mercedes_benz', 'sinotruk', 'shacman', 'faw', 'dongfeng', 'foton', 'jac', 'ford', 'otra'],
  'cam-articulado': ['caterpillar', 'volvo_ce', 'komatsu', 'john_deere', 'doosan', 'develon', 'bell', 'terex', 'sany', 'otra'],
  'cam-rigido': ['caterpillar', 'komatsu', 'hitachi', 'volvo_ce', 'sany', 'xcmg', 'otra'],
  'cam-plataforma': ['isuzu', 'hino', 'fuso', 'international', 'freightliner', 'ford', 'chevrolet', 'gmc', 'mercedes_benz', 'foton', 'jac', 'dongfeng', 'otra'],
  'cam-cisterna': ['international', 'freightliner', 'mack', 'kenworth', 'isuzu', 'hino', 'fuso', 'mercedes_benz', 'sinotruk', 'foton', 'otra'],
  'cam-mixer': ['mack', 'international', 'freightliner', 'kenworth', 'peterbilt', 'sinotruk', 'shacman', 'sany', 'xcmg', 'foton', 'otra'],
  'cam-grua': ['international', 'freightliner', 'hino', 'isuzu', 'fuso', 'mercedes_benz', 'foton', 'otra'],
  'cam-carga': ['isuzu', 'hino', 'fuso', 'ford', 'chevrolet', 'gmc', 'ram', 'international', 'freightliner', 'mercedes_benz', 'iveco', 'jac', 'foton', 'dongfeng', 'toyota', 'nissan', 'otra'],
  'cam-recoleccion': ['international', 'freightliner', 'mack', 'peterbilt', 'isuzu', 'hino', 'sinotruk', 'otra'],

  // Autobuses
  'bus-interurbano': ['mercedes_benz', 'volvo_trucks', 'scania', 'man', 'marcopolo', 'busscar', 'yutong', 'king_long', 'hino', 'iveco', 'otra'],
  'bus-urbano': ['mercedes_benz', 'volvo_trucks', 'yutong', 'king_long', 'man', 'scania', 'hino', 'iveco', 'otra'],
  'bus-escolar': ['blue_bird', 'thomas', 'ic_bus', 'international', 'freightliner', 'ford', 'chevrolet', 'otra'],
  'bus-minibus': ['toyota', 'nissan', 'hino', 'isuzu', 'fuso', 'mercedes_benz', 'ford', 'chevrolet', 'jac', 'foton', 'king_long', 'yutong', 'otra'],

  // Remolques
  'rem-lowboy': ['trail_king', 'talbert', 'landoll', 'fontaine', 'load_king', 'doonan', 'xcmg', 'otra'],
  'rem-plataforma': ['great_dane', 'utility', 'wabash', 'fontaine', 'mac_trailer', 'east', 'doonan', 'otra'],
  'rem-furgon': ['great_dane', 'utility', 'wabash', 'otra'],
  'rem-refrigerado': ['great_dane', 'utility', 'wabash', 'otra'],
  'rem-tolva': ['mac_trailer', 'east', 'great_dane', 'otra'],
  'rem-cisterna': ['mac_trailer', 'fontaine', 'otra'],
  'rem-portacontenedor': ['wabash', 'utility', 'great_dane', 'otra'],

  // Agrícola
  'agr-tractor': ['john_deere', 'massey_ferguson', 'new_holland', 'case_ce', 'kubota', 'fendt', 'valtra', 'deutz_fahr', 'landini', 'same', 'mahindra', 'yanmar', 'otra'],
  'agr-cosechadora': ['john_deere', 'case_ce', 'new_holland', 'claas', 'massey_ferguson', 'deutz_fahr', 'otra'],
  'agr-implemento': ['john_deere', 'massey_ferguson', 'new_holland', 'case_ce', 'kubota', 'otra'],

  // Perforación
  'perf-pozo': ['atlas_copco', 'epiroc', 'soilmec', 'xcmg', 'sany', 'otra'],
  'perf-pilote': ['bauer', 'soilmec', 'junttan', 'sany', 'xcmg', 'liebherr', 'otra'],
  'perf-roca': ['atlas_copco', 'epiroc', 'sandvik', 'furukawa', 'otra'],

  // Generadores
  'gen-diesel': ['caterpillar', 'cummins_power', 'kohler', 'generac', 'fg_wilson', 'perkins', 'denyo', 'himoinsa', 'pramac', 'aksa', 'mitsubishi_power', 'sdmo', 'otra'],
  'gen-gas': ['generac', 'kohler', 'caterpillar', 'cummins_power', 'otra'],
  'gen-portatil': ['honda', 'generac', 'multiquip', 'denyo', 'pramac', 'otra'],
  'gen-compresor': ['atlas_copco', 'ingersoll_rand', 'sullair', 'doosan', 'kaeser', 'epiroc', 'otra'],
  'gen-soldadora': ['lincoln_electric', 'miller', 'denyo', 'multiquip', 'otra'],
};

/* ── Modelos por subcategoría y marca ───────────────────────
   Familias de modelo reales, escritas como las nombra el fabricante.
   No se listan todas las variantes de sufijo (D, GC, LC, -7, -8…):
   quien publica elige la familia y detalla el resto en la descripción,
   que es como se anuncia en el mercado.

   Una marca sin entrada aquí muestra solo «Otro modelo», y el anuncio
   se publica igual. Es preferible a bloquear una venta legítima. */
const MODELOS = {
  // ── Excavadoras ──
  'exc-mini': {
    kubota: ['U17', 'U25', 'U35', 'U48', 'U55', 'KX018', 'KX033', 'KX040', 'KX057', 'KX080'],
    takeuchi: ['TB216', 'TB225', 'TB230', 'TB235', 'TB240', 'TB250', 'TB260', 'TB290'],
    bobcat: ['E20', 'E26', 'E32', 'E35', 'E42', 'E50', 'E55', 'E60'],
    yanmar: ['ViO17', 'ViO25', 'ViO35', 'ViO50', 'ViO55', 'SV17', 'SV26', 'SV40'],
    caterpillar: ['301.7', '302', '303', '304', '305', '306', '307', '308'],
    komatsu: ['PC18', 'PC26', 'PC30', 'PC35', 'PC45', 'PC55', 'PC58'],
    jcb: ['8018', '8026', '8030', '8035', '8050', '8055', '8060'],
    hitachi: ['ZX17U', 'ZX26U', 'ZX35U', 'ZX50U', 'ZX55U'],
    volvo_ce: ['EC15', 'EC18', 'EC20', 'EC27', 'EC35', 'EC55'],
    case_ce: ['CX17', 'CX26', 'CX37', 'CX57', 'CX60'],
    new_holland: ['E18', 'E26', 'E37', 'E57'],
    wacker_neuson: ['EZ17', 'EZ26', 'EZ36', 'EZ50', 'ET65'],
    sany: ['SY16', 'SY26', 'SY35', 'SY50', 'SY60'],
    hyundai_ce: ['R17Z', 'R25Z', 'R35Z', 'R55', 'R60'],
    doosan: ['DX17', 'DX27', 'DX35', 'DX55', 'DX63'],
    develon: ['DX20', 'DX35', 'DX55', 'DX62'],
    xcmg: ['XE15', 'XE27', 'XE35', 'XE55', 'XE60'],
    john_deere: ['17G', '26G', '30G', '35G', '50G', '60G'],
    gehl: ['Z17', 'Z27', 'Z35', 'Z45', 'Z55'],
  },
  'exc-mediana': {
    caterpillar: ['312', '313', '315', '316', '318', '320', '323', '325', '326', '330'],
    komatsu: ['PC78', 'PC110', 'PC130', 'PC138', 'PC160', 'PC170', 'PC200', 'PC210', 'PC220', 'PC240'],
    hitachi: ['ZX130', 'ZX135', 'ZX160', 'ZX190', 'ZX200', 'ZX210', 'ZX225', 'ZX240'],
    volvo_ce: ['EC140', 'EC160', 'EC200', 'EC210', 'EC220', 'EC230', 'EC250'],
    hyundai_ce: ['R140', 'R145', 'R160', 'R180', 'R210', 'R220', 'R235'],
    doosan: ['DX140', 'DX160', 'DX180', 'DX210', 'DX225', 'DX235'],
    develon: ['DX140', 'DX170', 'DX210', 'DX225', 'DX235'],
    kobelco: ['SK130', 'SK140', 'SK170', 'SK200', 'SK210', 'SK230', 'SK260'],
    sany: ['SY75', 'SY135', 'SY155', 'SY195', 'SY215', 'SY235'],
    xcmg: ['XE135', 'XE150', 'XE200', 'XE215', 'XE235'],
    liugong: ['906', '908', '915', '922', '925'],
    jcb: ['JS130', 'JS145', 'JS160', 'JS200', 'JS220', 'JS235'],
    case_ce: ['CX130', 'CX145', 'CX160', 'CX210', 'CX220', 'CX245'],
    new_holland: ['E135', 'E145', 'E175', 'E215', 'E235'],
    john_deere: ['130G', '135G', '160G', '180G', '210G', '245G'],
    liebherr: ['R914', 'R918', 'R920', 'R922', 'R924'],
    zoomlion: ['ZE135', 'ZE205', 'ZE215', 'ZE230'],
    sdlg: ['E6135', 'E6210', 'E6225'],
  },
  'exc-pesada': {
    caterpillar: ['336', '340', '349', '352', '374', '390', '395', '6015', '6020'],
    komatsu: ['PC290', 'PC300', 'PC350', 'PC390', 'PC450', 'PC490', 'PC800', 'PC1250'],
    hitachi: ['ZX300', 'ZX350', 'ZX400', 'ZX470', 'ZX490', 'ZX670', 'ZX870'],
    volvo_ce: ['EC300', 'EC350', 'EC380', 'EC480', 'EC530', 'EC750'],
    liebherr: ['R936', 'R938', 'R945', 'R950', 'R960', 'R970', 'R980'],
    hyundai_ce: ['R260', 'R300', 'R330', 'R380', 'R480', 'R520'],
    doosan: ['DX300', 'DX340', 'DX380', 'DX420', 'DX490', 'DX530'],
    develon: ['DX300', 'DX350', 'DX420', 'DX490', 'DX530'],
    kobelco: ['SK300', 'SK350', 'SK380', 'SK500', 'SK850'],
    sany: ['SY265', 'SY305', 'SY365', 'SY425', 'SY500', 'SY750'],
    xcmg: ['XE270', 'XE305', 'XE370', 'XE490', 'XE690'],
    zoomlion: ['ZE305', 'ZE370', 'ZE490'],
    john_deere: ['300G', '350G', '380G', '470G', '670G'],
  },
  'exc-ruedas': {
    caterpillar: ['M314', 'M316', 'M318', 'M320', 'M322'],
    komatsu: ['PW118', 'PW148', 'PW158', 'PW180', 'PW200'],
    hitachi: ['ZX140W', 'ZX170W', 'ZX190W', 'ZX210W'],
    volvo_ce: ['EW140', 'EW160', 'EW180', 'EW200', 'EW240'],
    liebherr: ['A910', 'A912', 'A914', 'A918', 'A920'],
    hyundai_ce: ['R140W', 'R170W', 'R180W', 'R210W'],
    doosan: ['DX140W', 'DX160W', 'DX190W', 'DX210W'],
    develon: ['DX140W', 'DX190W', 'DX210W'],
    case_ce: ['WX148', 'WX155', 'WX168', 'WX188'],
    new_holland: ['WE150', 'WE170', 'WE190', 'WE210'],
    jcb: ['JS145W', 'JS160W', 'JS175W', 'JS200W'],
    sany: ['SY155W', 'SY175W', 'SY215W'],
    xcmg: ['XE150W', 'XE210W'],
  },
  'exc-demolicion': {
    caterpillar: ['323 UHD', '340 UHD', '352 UHD', '365 UHD'],
    komatsu: ['PC290 UHD', 'PC350 UHD', 'PC490 UHD'],
    hitachi: ['ZX225 UHD', 'ZX350 UHD', 'ZX490 UHD'],
    volvo_ce: ['EC380 HR', 'EC480 HR', 'EC750 HR'],
    liebherr: ['R940 Demolition', 'R950 Demolition', 'R960 Demolition'],
    hyundai_ce: ['R300 UHD', 'R380 UHD'],
    kobelco: ['SK350 DLC', 'SK500 DLC'],
    sany: ['SY365 UHD', 'SY500 UHD'],
  },
  'exc-anfibia': {
    sany: ['SY135 Anfibia', 'SY215 Anfibia'],
    xcmg: ['XE215 Anfibia'],
    hitachi: ['ZX200 Anfibia'],
    caterpillar: ['320 Anfibia'],
  },

  // ── Retroexcavadoras ──
  'retro-4x2': {
    jcb: ['3CX', '4CX', '1CX'],
    caterpillar: ['416', '420', '430', '432'],
    case_ce: ['580N', '580SN', '590SN'],
    new_holland: ['B90B', 'B95B', 'B110B'],
    john_deere: ['310L', '310SL', '315SL', '410L'],
    komatsu: ['WB93', 'WB97'],
    terex: ['TLB840', 'TLB890'],
    xcmg: ['XT870', 'XT876'],
  },
  'retro-4x4': {
    jcb: ['3CX', '4CX', '3CX Super', '4CX Super'],
    caterpillar: ['416F2', '420F2', '430F2', '432F2', '440', '450'],
    case_ce: ['580N EP', '580SN', '590SN', '695ST'],
    new_holland: ['B95B 4WD', 'B110B 4WD', 'B115B'],
    john_deere: ['310SL', '315SL', '410L', '710L'],
    komatsu: ['WB93R', 'WB97R', 'WB146'],
    volvo_ce: ['BL60', 'BL71'],
    terex: ['TLB840', 'TLB890', 'TLB990'],
    xcmg: ['XT870', 'XT876', 'XT880'],
    sany: ['SLB95'],
  },
  'retro-extensible': {
    jcb: ['3CX Sitemaster', '4CX Sitemaster'],
    caterpillar: ['420F2 IT', '430F2 IT', '450 E-Stick'],
    case_ce: ['580SN Extendahoe', '590SN Extendahoe'],
    new_holland: ['B110B Extendahoe'],
    john_deere: ['310SL Extendible', '410L Extendible'],
  },

  // ── Cargadores ──
  'car-ruedas': {
    caterpillar: ['906', '908', '910', '914', '926', '930', '938', '950', '962', '966', '972', '980', '988'],
    komatsu: ['WA70', 'WA100', 'WA200', 'WA270', 'WA320', 'WA380', 'WA470', 'WA500', 'WA600'],
    volvo_ce: ['L45', 'L60', 'L70', 'L90', 'L110', 'L120', 'L150', 'L180', 'L220'],
    john_deere: ['244', '324', '444', '524', '544', '624', '644', '724', '844'],
    case_ce: ['321F', '421F', '521G', '621G', '721G', '821G', '921G'],
    new_holland: ['W110', 'W130', 'W170', 'W190', 'W230'],
    hyundai_ce: ['HL730', 'HL740', 'HL757', 'HL760', 'HL770', 'HL780'],
    doosan: ['DL200', 'DL250', 'DL300', 'DL420', 'DL550'],
    develon: ['DL280', 'DL320', 'DL420'],
    liugong: ['835', '842', '848', '856', '862', '877'],
    sdlg: ['LG918', 'LG936', 'LG946', 'LG956', 'LG958', 'LG968'],
    xcmg: ['LW300', 'LW400', 'LW500', 'LW600', 'ZL50'],
    sany: ['SYL956', 'SYL953', 'SW405'],
    lonking: ['CDM835', 'CDM856', 'CDM860'],
    jcb: ['409', '411', '417', '427', '437', '457'],
    liebherr: ['L506', 'L508', 'L514', 'L526', 'L538', 'L550', 'L566'],
    kawasaki: ['65Z', '70Z', '80Z', '90Z'],
  },
  'car-mini': {
    bobcat: ['S64', 'S66', 'S70', 'S76', 'S185', 'S205', 'S550', 'S570', 'S590', 'S630', 'S650', 'S740', 'S770', 'S850'],
    caterpillar: ['226', '232', '236', '242', '246', '262', '272', '279', '289', '299'],
    case_ce: ['SR160', 'SR175', 'SR210', 'SR240', 'SR270', 'SV280', 'SV340'],
    new_holland: ['L213', 'L216', 'L218', 'L220', 'L228', 'L234'],
    john_deere: ['312GR', '316GR', '318G', '324G', '330G', '332G'],
    jcb: ['135', '155', '175', '205', '215', '225', '270', '300'],
    kubota: ['SSV65', 'SSV75'],
    takeuchi: ['TS60', 'TS70', 'TS80'],
    gehl: ['R135', 'R165', 'R190', 'R220', 'R260'],
    asv: ['VS-60', 'VS-75'],
    wacker_neuson: ['SW16', 'SW20', 'SW24', 'SW28'],
    sany: ['SSL65'],
  },
  'car-oruga': {
    bobcat: ['T64', 'T66', 'T76', 'T450', 'T550', 'T590', 'T595', 'T630', 'T650', 'T740', 'T770', 'T870'],
    caterpillar: ['239', '249', '257', '259', '265', '275', '279', '289', '299'],
    asv: ['RT-25', 'RT-40', 'RT-50', 'RT-65', 'RT-75', 'RT-120'],
    takeuchi: ['TL6R', 'TL8R', 'TL10', 'TL12'],
    john_deere: ['317G', '325G', '331G', '333G'],
    case_ce: ['TR270', 'TR310', 'TR340', 'TV370', 'TV450'],
    new_holland: ['C227', 'C232', 'C234', 'C245'],
    kubota: ['SVL65', 'SVL75', 'SVL95', 'SVL97'],
    jcb: ['150T', '205T', '225T', '300T', '320T'],
  },
  'car-telescopico': {
    manitou: ['MT625', 'MT732', 'MT933', 'MT1030', 'MT1135', 'MT1440', 'MT1840', 'MLT625', 'MLT735'],
    jcb: ['505', '507', '509', '510', '512', '514', '525', '531', '535', '540', '541', '555', '560'],
    merlo: ['P25.6', 'P27.6', 'P32.6', 'P38.10', 'P40.17', 'P50.18'],
    caterpillar: ['TL642', 'TL943', 'TL1055', 'TH255', 'TH357', 'TH408'],
    genie: ['GTH-636', 'GTH-844', 'GTH-1056', 'GTH-5519'],
    bobcat: ['TL519', 'TL619', 'TL723', 'TL943'],
    new_holland: ['LM6.32', 'LM7.35', 'LM9.35'],
    case_ce: ['TX140', 'TX170', 'TX742', 'TX945'],
    xcmg: ['XC6-3506', 'XC6-4517'],
  },

  // ── Bulldozers ──
  'dozer-oruga': {
    caterpillar: ['D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11'],
    komatsu: ['D31', 'D37', 'D39', 'D51', 'D61', 'D65', 'D85', 'D155', 'D275', 'D375'],
    john_deere: ['450K', '550K', '650K', '700K', '750K', '850K', '950K'],
    liebherr: ['PR716', 'PR726', 'PR736', 'PR746', 'PR756', 'PR776'],
    sany: ['SD16', 'SD22', 'SD32'],
    xcmg: ['SD13', 'SD16', 'SD22', 'SD32'],
    shantui: ['SD16', 'SD22', 'SD32', 'DH17'],
    case_ce: ['650M', '750M', '850M', '1150M', '2050M'],
  },
  'dozer-ruedas': {
    caterpillar: ['814', '824', '834', '844', '854'],
    komatsu: ['WD500', 'WD600'],
    xcmg: ['DL560'],
  },

  // ── Motoniveladoras ──
  'moto-estandar': {
    caterpillar: ['120', '12M', '140', '14M', '150', '160', '16M', '18M', '24M'],
    komatsu: ['GD505', 'GD511', 'GD555', 'GD655', 'GD675', 'GD705'],
    john_deere: ['620G', '622G', '670G', '672G', '770G', '772G', '870G', '872G'],
    volvo_ce: ['G930', 'G940', 'G946', 'G960', 'G970', 'G976', 'G990'],
    case_ce: ['836C', '845B', '865B', '885B'],
    new_holland: ['RG140', 'RG170', 'RG200'],
    xcmg: ['GR135', 'GR165', 'GR180', 'GR215', 'GR230'],
    sany: ['SMG200', 'SMG220'],
    liugong: ['4180', '4215'],
    sdlg: ['G9165', 'G9190', 'G9220'],
  },
  'moto-articulada': {
    caterpillar: ['140 AWD', '160 AWD', '16M3', '18M3'],
    komatsu: ['GD655 AWD', 'GD675 AWD'],
    john_deere: ['670GP', '772GP', '872GP'],
    volvo_ce: ['G940 AWD', 'G960 AWD', 'G976 AWD'],
    case_ce: ['865B AWD', '885B AWD'],
    xcmg: ['GR215A', 'GR300'],
  },

  // ── Compactadoras ──
  'comp-liso': {
    bomag: ['BW177', 'BW211', 'BW213', 'BW216', 'BW219', 'BW226'],
    dynapac: ['CA1500', 'CA2500', 'CA3500', 'CA4600', 'CA6000'],
    hamm: ['H7i', 'H11i', 'H13i', 'H16i', 'H18i', 'H20i', '3410', '3411'],
    caterpillar: ['CS44', 'CS54', 'CS56', 'CS64', 'CS68', 'CS74', 'CS78', 'CS79'],
    ammann: ['ASC70', 'ASC110', 'ASC130', 'ASC150', 'ASC200'],
    sakai: ['SV410', 'SV510', 'SV520', 'SV540', 'SV610'],
    volvo_ce: ['SD75', 'SD110', 'SD115', 'SD135', 'SD160'],
    xcmg: ['XS123', 'XS143', 'XS163', 'XS203', 'XS263'],
    sany: ['SSR120', 'SSR160', 'SSR200', 'SSR220'],
    case_ce: ['SV208', 'SV210', 'SV212', 'SV216'],
    jcb: ['VM115', 'VM132', 'VM146', 'VM166'],
  },
  'comp-pata': {
    bomag: ['BW211 PD', 'BW213 PD', 'BW216 PD', 'BW219 PD'],
    dynapac: ['CA2500 PD', 'CA3500 PD', 'CA4600 PD'],
    hamm: ['3411 P', '3412 P', '3516 P'],
    caterpillar: ['CP44', 'CP54', 'CP56', 'CP68', 'CP74', 'CP78'],
    ammann: ['ASC110 PD', 'ASC150 PD'],
    sakai: ['SV510 TF', 'SV610 TF'],
    volvo_ce: ['SD110 PD', 'SD115 PD', 'SD135 PD'],
    xcmg: ['XS163 PD', 'XS203 PD'],
  },
  'comp-neumatico': {
    bomag: ['BW11 RH', 'BW24 RH', 'BW27 RH'],
    dynapac: ['CP2100', 'CP2700', 'CP275'],
    hamm: ['GRW10', 'GRW18', 'GRW280'],
    caterpillar: ['CW14', 'CW16', 'CW34'],
    ammann: ['ART240'],
    sakai: ['TZ700', 'TS200'],
    xcmg: ['XP163', 'XP263', 'XP303'],
  },
  'comp-asfalto': {
    bomag: ['BW100', 'BW120', 'BW138', 'BW151', 'BW161', 'BW174'],
    dynapac: ['CC1200', 'CC1300', 'CC2200', 'CC3200', 'CC4200'],
    hamm: ['HD8', 'HD10', 'HD12', 'HD14', 'HD+90', 'HD+110'],
    caterpillar: ['CB2.5', 'CB2.7', 'CB7', 'CB8', 'CB10', 'CB13', 'CB15'],
    ammann: ['ARX26', 'ARX40', 'ARX90', 'AV70', 'AV110'],
    sakai: ['SW352', 'SW652', 'SW884'],
    volvo_ce: ['DD25', 'DD70', 'DD90', 'DD110', 'DD120'],
    wacker_neuson: ['RD12', 'RD16', 'RD18', 'RD27'],
  },
  'comp-manual': {
    wacker_neuson: ['BS50', 'BS60', 'BS70', 'DPU2540', 'DPU3050', 'DPU4045', 'VP1030', 'VP1550', 'BPU3050'],
    bomag: ['BT60', 'BT65', 'BP18', 'BP20', 'BPR35', 'BPR45', 'BVP18'],
    multiquip: ['MTX60', 'MTX70', 'MVC88', 'MVH208'],
    dynapac: ['LT6000', 'LT7000', 'LG500', 'LH700'],
    ammann: ['ATR60', 'ATR68', 'APR2220', 'APF1250'],
    honda: ['Plancha GX160', 'Plancha GX270'],
  },

  // ── Pavimentación ──
  'pav-finisher': {
    vogele: ['Super 700', 'Super 1300', 'Super 1600', 'Super 1800', 'Super 2100'],
    caterpillar: ['AP300', 'AP355', 'AP500', 'AP555', 'AP600', 'AP655', 'AP1000', 'AP1055'],
    bomag: ['BF200', 'BF300', 'BF600', 'BF700', 'BF800'],
    dynapac: ['F1000', 'F1250', 'F1800', 'SD2500'],
    volvo_ce: ['P4370', 'P6820', 'P7820', 'P8820'],
    sany: ['SAP90', 'SAP120', 'SAP150'],
    xcmg: ['RP453', 'RP603', 'RP753', 'RP953'],
    astec: ['Roadtec RP-190', 'Roadtec RP-195', 'Roadtec SB-3000'],
  },
  'pav-fresadora': {
    wirtgen: ['W35', 'W50', 'W100', 'W120', 'W150', 'W200', 'W210', 'W220', 'W250'],
    caterpillar: ['PM310', 'PM312', 'PM620', 'PM622', 'PM820', 'PM822', 'PM825'],
    bomag: ['BM1000', 'BM1200', 'BM1300', 'BM2000'],
    sany: ['SMS500', 'SMS1000'],
    xcmg: ['XM101', 'XM200', 'XM503'],
    astec: ['Roadtec RX-405', 'Roadtec RX-600', 'Roadtec RX-700'],
  },
  'pav-planta': {
    astec: ['Double Barrel', 'Six Pack', 'M-Pack'],
    ammann: ['ABP HRT', 'ABT UniBatch', 'ABM QuickBatch'],
    sany: ['SAP3000', 'SAP4000'],
    xcmg: ['XAP80', 'XAP120', 'XAP160'],
  },
  'pav-recicladora': {
    wirtgen: ['WR200', 'WR240', 'WR250', 'W380 CR'],
    caterpillar: ['RM300', 'RM400', 'RM500'],
    bomag: ['MPH125', 'MPH600'],
  },

  // ── Grúas ──
  'grua-camion': {
    tadano: ['GT-300', 'GT-550', 'GT-600', 'GT-800', 'GT-1000', 'TM-ZE', 'TR-500'],
    grove: ['TMS500', 'TMS700', 'TMS800', 'TMS900', 'TMS9000'],
    link_belt: ['HTC-8650', 'HTC-8660', 'HTC-8675', 'HTC-86100', 'HTC-86110'],
    kato: ['NK-200', 'NK-250', 'NK-300', 'NK-450', 'NK-500'],
    terex: ['T340', 'T560', 'T780', 'RT555'],
    liebherr: ['LTF 1035', 'LTF 1045', 'LTF 1060'],
    xcmg: ['QY25', 'QY30', 'QY50', 'QY70', 'QY100', 'XCT25', 'XCT55'],
    sany: ['STC250', 'STC300', 'STC500', 'STC750', 'STC1000'],
    zoomlion: ['QY25V', 'QY50V', 'QY70V', 'ZTC250'],
    manitou: ['MC18', 'MC30'],
  },
  'grua-todoterreno': {
    liebherr: ['LTM 1030', 'LTM 1050', 'LTM 1070', 'LTM 1090', 'LTM 1100', 'LTM 1150', 'LTM 1200', 'LTM 1300'],
    grove: ['GMK3050', 'GMK4100', 'GMK5150', 'GMK5250', 'GMK6300'],
    tadano: ['ATF 60', 'ATF 90', 'ATF 130', 'ATF 220', 'AC 4.080'],
    terex: ['AC 40', 'AC 55', 'AC 100', 'AC 160', 'Challenger 3160'],
    xcmg: ['XCA60', 'XCA100', 'XCA220', 'XCA300'],
    sany: ['SAC600', 'SAC1000', 'SAC2200'],
    zoomlion: ['ZAT600', 'ZAT1200', 'ZAT2200'],
  },
  'grua-oruga': {
    liebherr: ['LR 1100', 'LR 1160', 'LR 1250', 'LR 1300', 'LR 1600', 'HS 8070'],
    link_belt: ['138 HSL', '218 HSL', '248 HSL', '298 HSL', '348 HYLAB'],
    kobelco: ['CK850', 'CK1000', 'CK1100', 'CK1600', 'CK2500', 'SL6000'],
    hitachi: ['SCX400', 'SCX550', 'SCX900', 'SCX1200'],
    terex: ['CC 2400', 'CC 2800', 'HC 110', 'HC 165'],
    sany: ['SCC500', 'SCC800', 'SCC1000', 'SCC1500', 'SCC2600'],
    xcmg: ['XGC55', 'XGC85', 'XGC130', 'XGC260'],
    zoomlion: ['ZCC550', 'ZCC1100', 'ZCC2600'],
  },
  'grua-articulada': {
    palfinger: ['PK 6500', 'PK 10000', 'PK 12000', 'PK 15500', 'PK 23500', 'PK 34000', 'PK 42500'],
    hiab: ['X-HiDuo 118', 'X-HiDuo 138', 'X-HiPro 192', 'X-HiPro 232', 'X-HiPro 302'],
    fassi: ['F110', 'F155', 'F215', 'F275', 'F365', 'F485'],
    xcmg: ['SQ5', 'SQ8', 'SQ10', 'SQ12', 'SQ16'],
    sany: ['SPS8000', 'SPS10000'],
  },
  'grua-torre': {
    potain: ['MDT 178', 'MDT 219', 'MDT 268', 'MC 85', 'MC 125', 'MC 175', 'MCT 85'],
    liebherr: ['85 EC-B', '110 EC-B', '125 EC-B', '150 EC-B', '202 EC-B'],
    terex: ['CTT 121', 'CTT 181', 'CTT 202', 'SK 415'],
    sany: ['SYT80', 'SYT100', 'SYT125'],
    xcmg: ['XGT80', 'XGT100', 'XGT160'],
    zoomlion: ['T6013', 'T7020', 'T8030'],
  },

  // ── Plataformas de elevación ──
  'elev-tijera': {
    genie: ['GS-1930', 'GS-2032', 'GS-2632', 'GS-2646', 'GS-3232', 'GS-3246', 'GS-4047', 'GS-5390'],
    jlg: ['1930ES', '2030ES', '2646ES', '3246ES', '4045R', '530LRT', '600S'],
    skyjack: ['SJIII 3219', 'SJIII 3226', 'SJIII 4626', 'SJ6826 RT', 'SJ9241'],
    haulotte: ['Compact 8', 'Compact 10', 'Compact 12', 'Optimum 8', 'H15 SX'],
    snorkel: ['S3010', 'S3219', 'S3226', 'S4726', 'S9070'],
    sany: ['SSA1012', 'SSA1414'],
    xcmg: ['GTJZ0608', 'GTJZ1012', 'GTJZ1412'],
  },
  'elev-articulada': {
    genie: ['Z-30/20', 'Z-34/22', 'Z-45/25', 'Z-51/30', 'Z-60/37', 'Z-80/60', 'Z-135/70'],
    jlg: ['E300AJ', 'E400AJ', 'E450AJ', '450AJ', '600AJ', '800AJ', '1250AJP'],
    haulotte: ['HA16', 'HA20', 'HA26', 'HA32', 'HA41'],
    snorkel: ['A38E', 'A46JE', 'AB60J', 'AB85J'],
    manitou: ['160 ATJ', '180 ATJ', '200 ATJ', '260 TJ'],
  },
  'elev-telescopica': {
    genie: ['S-40', 'S-45', 'S-60', 'S-65', 'S-80', 'S-85', 'S-125'],
    jlg: ['400S', '460SJ', '600S', '660SJ', '800S', '860SJ', '1350SJP'],
    haulotte: ['HT23', 'HT28', 'HT43', 'HT67'],
    snorkel: ['T46JRT', 'T66J', 'T126J'],
  },
  'elev-canasto': {
    altec: ['AT37G', 'AT40G', 'AT41M', 'TA41M', 'AA55', 'LR760'],
    terex: ['LT40', 'TL37M', 'TL41M', 'HRX55', 'XT55'],
    palfinger: ['P200', 'P280', 'P370', 'P480'],
  },

  // ── Montacargas ──
  'mont-combustion': {
    toyota_industrial: ['8FG25', '8FD30', '8FGU25', '8FGU30', '02-8FDF30', '52-8FDF25'],
    hyster: ['H50FT', 'H60FT', 'H70FT', 'H80FT', 'H100FT', 'H120FT', 'H155FT'],
    yale: ['GLP050', 'GLP060', 'GLP080', 'GDP100', 'GDP120', 'GDP155'],
    caterpillar: ['GP25N', 'GP30N', 'DP35N', 'DP40N', 'DP50N', 'DP70N'],
    mitsubishi_forklift: ['FG25N', 'FG30N', 'FD35N', 'FD40N', 'FD50N'],
    nissan_forklift: ['MP1F2A25', 'MP1F2A30', 'PF50', 'PF70'],
    clark: ['C25', 'C30', 'C35', 'C40', 'C50', 'C60'],
    komatsu: ['FG25T', 'FG30T', 'FD35T', 'FD50T'],
    crown: ['C-5 4000', 'C-5 5000', 'C-5 6000'],
    heli: ['CPCD25', 'CPCD30', 'CPCD35', 'CPCD50'],
    hangcha: ['CPCD25', 'CPCD30', 'CPCD35', 'XF25'],
    linde: ['H25', 'H30', 'H35', 'H40', 'H50'],
    doosan: ['D25S', 'D30S', 'D35C', 'D50C'],
  },
  'mont-electrico': {
    toyota_industrial: ['8FBE15', '8FBE20', '8FBMT25', '8FBMT30', '7FBEU20'],
    crown: ['SC 6000', 'FC 5200', 'RR 5700', 'RC 5500', 'SP 3500'],
    hyster: ['E45XN', 'E50XN', 'E60XN', 'E80XN', 'J35XN', 'J40XN'],
    yale: ['ERP040', 'ERP050', 'ERP060', 'ERC080'],
    linde: ['E16', 'E20', 'E25', 'E30', 'E35'],
    clark: ['GEX20', 'GEX25', 'GEX30', 'EPX20'],
    mitsubishi_forklift: ['FB16N', 'FB20N', 'FB25N', 'FB30N'],
    heli: ['CPD15', 'CPD20', 'CPD25', 'CPD30'],
    hangcha: ['CPD15', 'CPD20', 'CPD25', 'A3W20'],
  },
  'mont-todoterreno': {
    manitou: ['M30-4', 'M40-4', 'M50-4', 'MH25-4', 'MSI30', 'MSI35'],
    jcb: ['926', '930', '940', '950', 'Teletruk TLT30'],
    caterpillar: ['TH255C', 'RT60', 'RT80', 'RT100'],
    merlo: ['P27.6 Plus', 'P40.17'],
    bobcat: ['V417', 'V519', 'V723'],
  },
  'mont-contenedor': {
    kalmar: ['DRF450', 'DRG450', 'DCG90', 'DCG100', 'DCG180'],
    hyster: ['RS45', 'RS46', 'H1150HD', 'H1050HD'],
    terex: ['TFC45', 'TFC46'],
    sany: ['SRSC45', 'SDCY90', 'SDCY100'],
  },

  // ── Camiones ──
  'cam-cabezote': {
    freightliner: ['Cascadia', 'Cascadia Evolution', 'Columbia', 'Coronado', 'Century Class', 'FLD120', 'M2 112'],
    peterbilt: ['579', '589', '567', '386', '387', '388', '389', '379', '378', '359'],
    kenworth: ['T680', 'T880', 'W900', 'W990', 'T800', 'T660', 'T600', 'T2000'],
    international: ['LT', 'LoneStar', 'RH', 'ProStar', 'Prostar+', '9400i', '9900i', '8600'],
    mack: ['Anthem', 'Pinnacle', 'Granite', 'Vision', 'CH613', 'CHN613', 'CXU613'],
    volvo_trucks: ['VNL 760', 'VNL 860', 'VNL 300', 'VNR', 'VNM', 'VN 780', 'FH', 'FM'],
    western_star: ['4900', '5700XE', '47X', '49X', '57X'],
    mercedes_benz: ['Actros', 'Axor', 'Atego', 'Arocs'],
    scania: ['R450', 'R500', 'G410', 'G450', 'P360', 'S500'],
    man: ['TGX', 'TGS', 'TGM'],
    daf: ['XF', 'CF', 'XG'],
    iveco: ['Stralis', 'S-Way', 'Trakker'],
    hino: ['700 Series', 'SS', 'ZS'],
    ud_trucks: ['Quon', 'Quester'],
    sinotruk: ['HOWO A7', 'HOWO T7H', 'HOWO Sitrak C7H', 'HOWO 380', 'HOWO 420'],
    shacman: ['X3000', 'F3000', 'H3000', 'M3000'],
    faw: ['J6P', 'J6M', 'JH6'],
    dongfeng: ['KL', 'KX', 'GX'],
    foton: ['Auman EST', 'Auman GTL', 'Auman ETX'],
  },
  'cam-volteo': {
    mack: ['Granite', 'Granite MHD', 'Pinnacle', 'RD688', 'DM690', 'RM690'],
    freightliner: ['114SD', '108SD', 'M2 106', 'M2 112', 'FLD112', 'Cascadia 116'],
    international: ['HX520', 'HX620', 'HV507', 'HV607', 'WorkStar 7400', 'WorkStar 7600', '4300', '7300'],
    kenworth: ['T880', 'T800', 'W900S', 'T470', 'T370'],
    peterbilt: ['567', '548', '520', '365', '348', '337'],
    western_star: ['4700SF', '4900SF', '47X', '49X'],
    volvo_trucks: ['VHD', 'VNX'],
    isuzu: ['NPR', 'NQR', 'NRR', 'FTR', 'FVR', 'FVZ', 'CYZ'],
    hino: ['300 Series', '500 Series', '600 Series', 'FC', 'FG', 'FM', 'GH'],
    fuso: ['Canter FE', 'Canter FG', 'Fighter FK', 'Fighter FM', 'Super Great'],
    mercedes_benz: ['Actros 3336', 'Axor 3131', 'Atego 1725', 'Arocs 3340'],
    sinotruk: ['HOWO 336', 'HOWO 371', 'HOWO 380', 'HOWO 8x4'],
    shacman: ['F3000 volteo', 'X3000 volteo', 'H3000 volteo'],
    faw: ['J5P volteo', 'J6P volteo'],
    dongfeng: ['KC volteo', 'KL volteo'],
    foton: ['Auman volteo', 'Forland volteo'],
    jac: ['Gallop volteo', 'HFC volteo'],
    ford: ['F-750', 'F-650', 'Cargo 1723', 'Cargo 2632'],
  },
  'cam-articulado': {
    caterpillar: ['725', '730', '735', '740', '745'],
    volvo_ce: ['A25G', 'A30G', 'A35G', 'A40G', 'A45G', 'A60H'],
    komatsu: ['HM300', 'HM400'],
    john_deere: ['260E', '310E', '410E', '460E'],
    doosan: ['DA30', 'DA40', 'DA45'],
    develon: ['DA30', 'DA45'],
    bell: ['B25E', 'B30E', 'B40E', 'B45E', 'B50E'],
    terex: ['TA300', 'TA400'],
    sany: ['SRT55', 'SRT95'],
  },
  'cam-rigido': {
    caterpillar: ['770', '772', '773', '775', '777', '785', '789', '793', '797'],
    komatsu: ['HD325', 'HD405', 'HD465', 'HD605', 'HD785', '830E', '930E'],
    hitachi: ['EH1100', 'EH3500', 'EH4000', 'EH5000'],
    volvo_ce: ['R45D', 'R60D', 'R70D', 'R100E'],
    sany: ['SRT45', 'SKT90'],
    xcmg: ['XDE130', 'XDE240', 'XDR80'],
  },
  'cam-plataforma': {
    isuzu: ['NPR', 'NQR', 'NRR', 'FTR', 'FVR', 'ELF'],
    hino: ['155', '195', '258', '268', '338', '500 Series'],
    fuso: ['Canter FE160', 'Canter FE180', 'FG4x4', 'Fighter'],
    international: ['MV607', 'CV515', 'DuraStar 4300', 'WorkStar 7500'],
    freightliner: ['M2 106', 'M2 112', 'SD108'],
    ford: ['F-450', 'F-550', 'F-600', 'F-650', 'F-750', 'Cargo'],
    chevrolet: ['Silverado 4500HD', 'Silverado 5500HD', 'Silverado 6500HD'],
    gmc: ['Sierra 4500HD', 'Sierra 5500HD'],
    mercedes_benz: ['Atego', 'Accelo', 'Axor'],
    foton: ['Aumark', 'Ollin', 'Forland'],
    jac: ['HFC1040', 'HFC1060', 'N-Series'],
    dongfeng: ['Captain', 'Duolika'],
  },
  'cam-cisterna': {
    international: ['HV507', 'WorkStar 7400', 'DuraStar 4400'],
    freightliner: ['114SD', 'M2 112', 'Cascadia 113'],
    mack: ['Granite', 'Pinnacle'],
    kenworth: ['T370', 'T470', 'T880'],
    isuzu: ['FTR', 'FVR', 'FVZ'],
    hino: ['500 Series', '600 Series'],
    fuso: ['Fighter', 'Super Great'],
    mercedes_benz: ['Actros', 'Axor', 'Atego'],
    sinotruk: ['HOWO cisterna 20 m³', 'HOWO cisterna 25 m³'],
    foton: ['Auman cisterna'],
  },
  'cam-mixer': {
    mack: ['Granite mixer', 'TerraPro mixer'],
    international: ['HX620 mixer', 'WorkStar mixer', 'PayStar 5500'],
    freightliner: ['114SD mixer', '122SD mixer'],
    kenworth: ['T880 mixer', 'W900S mixer'],
    peterbilt: ['567 mixer', '365 mixer'],
    sinotruk: ['HOWO 8 m³', 'HOWO 10 m³', 'HOWO 12 m³'],
    shacman: ['F3000 mixer', 'X3000 mixer'],
    sany: ['SY308', 'SY310', 'SY412'],
    xcmg: ['G09V', 'G12V', 'G14V'],
    foton: ['Auman mixer'],
  },
  'cam-grua': {
    international: ['DuraStar con grúa', 'WorkStar con grúa', 'MV607'],
    freightliner: ['M2 106 con grúa', 'M2 112 con grúa'],
    hino: ['268 con grúa', '338 con grúa', '500 Series'],
    isuzu: ['FTR con grúa', 'FVR con grúa'],
    fuso: ['Fighter con grúa', 'Canter con grúa'],
    mercedes_benz: ['Atego con grúa', 'Axor con grúa'],
    foton: ['Auman con grúa'],
  },
  'cam-carga': {
    isuzu: ['ELF 100', 'ELF 300', 'NPR', 'NQR', 'NRR', 'FTR', 'Reward'],
    hino: ['155', '195', '258', '268', '300 Series', '500 Series', 'Dutro'],
    fuso: ['Canter FE71', 'Canter FE85', 'Canter 515', 'Canter 815', 'Fighter'],
    ford: ['Transit', 'E-350', 'E-450', 'F-350', 'F-450', 'F-550', 'Cargo'],
    chevrolet: ['Express', 'Silverado 3500HD', 'NPR', 'LCF'],
    gmc: ['Savana', 'Sierra 3500HD'],
    ram: ['ProMaster 1500', 'ProMaster 2500', 'ProMaster 3500', '4500', '5500'],
    international: ['CV515', 'MV607', 'DuraStar'],
    freightliner: ['Sprinter', 'M2 106'],
    mercedes_benz: ['Sprinter 311', 'Sprinter 415', 'Sprinter 515', 'Accelo', 'Atego'],
    iveco: ['Daily 35', 'Daily 50', 'Daily 70', 'Eurocargo'],
    jac: ['X200', 'HFC1035', 'Sunray', 'N-Series'],
    foton: ['Aumark', 'Ollin', 'View', 'Forland'],
    dongfeng: ['Captain C', 'Duolika D6', 'Forthing'],
    toyota: ['Dyna', 'Coaster carga', 'Hiace carga'],
    nissan: ['Cabstar', 'NV350', 'NV400'],
  },
  'cam-recoleccion': {
    international: ['HV507 recolector', 'WorkStar recolector'],
    freightliner: ['114SD recolector', 'M2 106 recolector'],
    mack: ['LR', 'TerraPro', 'MRU'],
    peterbilt: ['520 recolector', '348 recolector'],
    isuzu: ['FTR recolector', 'FVR recolector'],
    hino: ['500 Series recolector'],
    sinotruk: ['HOWO recolector'],
  },

  // ── Autobuses ──
  'bus-interurbano': {
    mercedes_benz: ['O500', 'O500RS', 'OF-1721', 'OF-1519', 'Tourismo'],
    volvo_trucks: ['B7R', 'B9R', 'B11R', 'B270F'],
    scania: ['K360', 'K410', 'F250', 'Irizar i6'],
    man: ['Lion’s Coach', 'RR2', 'RR4'],
    marcopolo: ['Paradiso 1200', 'Paradiso 1800 DD', 'Viaggio 1050', 'Andare 1000'],
    busscar: ['Vissta Buss', 'Jum Buss', 'El Buss 340'],
    yutong: ['ZK6122', 'ZK6127', 'ZK6899', 'ZK6107'],
    king_long: ['XMQ6127', 'XMQ6900', 'XMQ6113'],
    hino: ['RK8', 'AK8', 'RN8'],
    iveco: ['Crossway', 'Evadys'],
  },
  'bus-urbano': {
    mercedes_benz: ['OF-1519', 'OH-1621', 'OH-1721', 'Citaro'],
    volvo_trucks: ['B7RLE', 'B8RLE', 'B215RH'],
    yutong: ['ZK6118', 'ZK6105', 'E12', 'U12'],
    king_long: ['XMQ6106', 'XMQ6110'],
    man: ['Lion’s City'],
    scania: ['K250 UB', 'K280 UB'],
    hino: ['RK1J', 'HR'],
    iveco: ['Urbanway', 'Daily Urbano'],
  },
  'bus-escolar': {
    blue_bird: ['Vision', 'All American', 'Micro Bird', 'TX4'],
    thomas: ['Saf-T-Liner C2', 'Saf-T-Liner HDX', 'Minotour'],
    ic_bus: ['CE Series', 'RE Series', 'AC Series', 'BE Series'],
    international: ['3000 Series', 'CE300'],
    freightliner: ['B2 escolar', 'S2C'],
    ford: ['E-450 escolar', 'F-550 escolar'],
    chevrolet: ['Express escolar'],
  },
  'bus-minibus': {
    toyota: ['Coaster', 'Hiace', 'Granvia'],
    nissan: ['Civilian', 'Urvan NV350'],
    hino: ['Liesse', 'Melpha', '155 minibus'],
    isuzu: ['Journey', 'ELF minibus'],
    fuso: ['Rosa'],
    mercedes_benz: ['Sprinter City', 'Sprinter 516', 'Sprinter Travel'],
    ford: ['Transit 350', 'Transit 15 pasajeros'],
    chevrolet: ['Express 3500 pasajeros'],
    jac: ['Sunray minibus'],
    foton: ['View Traveller', 'Toano'],
    king_long: ['Kingo', 'Placer'],
    yutong: ['ZK6609', 'ZK6729'],
  },

  // ── Remolques ──
  'rem-lowboy': {
    trail_king: ['TK80HT', 'TK70HT', 'TK110HDG', 'TK40LP', 'Advantage'],
    talbert: ['55SA', '55CC', '60SA', '70SA-RC', '5553TA'],
    landoll: ['930C', '440B', '855E', '317'],
    fontaine: ['Magnitude 55', 'Magnitude 60', 'Renegade LXC40'],
    load_king: ['503', '603', '803', 'Voyager'],
    doonan: ['Lowboy 35 t', 'Lowboy 55 t'],
    xcmg: ['Lowboy 60 t', 'Lowboy 80 t'],
  },
  'rem-plataforma': {
    great_dane: ['Freedom LT', 'Freedom SE', 'Freedom XP'],
    utility: ['4000A', '4000AE'],
    wabash: ['Plataforma de aluminio', 'Plataforma combinada'],
    fontaine: ['Infinity', 'Revolution', 'Velocity'],
    mac_trailer: ['Plataforma 48', 'Plataforma 53'],
    east: ['Genesis', 'Beast'],
    doonan: ['Plataforma extensible'],
  },
  'rem-furgon': {
    great_dane: ['Champion SE', 'Champion CP', 'Everest'],
    utility: ['4000D-X', '4000DX Composite'],
    wabash: ['DuraPlate', 'DuraPlate HD', 'Composite'],
  },
  'rem-refrigerado': {
    great_dane: ['Everest SS', 'Everest TL', 'Everest CL'],
    utility: ['3000R', '3000R Multi-Temp'],
    wabash: ['ArcticLite', 'Molded Structural Composite'],
  },
  'rem-tolva': {
    mac_trailer: ['Tolva de aluminio', 'Tolva de acero'],
    east: ['Genesis Dump', 'Ultimate Dump'],
    great_dane: ['Tolva 34', 'Tolva 40'],
  },
  'rem-cisterna': {
    mac_trailer: ['Cisterna de combustible', 'Cisterna de agua'],
    fontaine: ['Cisterna 9000 gal'],
  },
  'rem-portacontenedor': {
    wabash: ['Chasis 20', 'Chasis 40', 'Chasis extensible 20-40'],
    utility: ['Chasis 40', 'Chasis 45'],
    great_dane: ['Chasis intermodal'],
  },

  // ── Agrícola ──
  'agr-tractor': {
    john_deere: ['5045', '5055', '5075', '5090', '6110', '6125', '6145', '6155', '7200', '8245'],
    massey_ferguson: ['MF 240', 'MF 275', 'MF 290', 'MF 4707', 'MF 4709', 'MF 5710', 'MF 6713', 'MF 7719'],
    new_holland: ['TT75', 'TD5', 'TS6', 'T4', 'T5', 'T6', 'T7'],
    case_ce: ['Farmall 75', 'Farmall 90', 'Farmall 110', 'Maxxum 115', 'Puma 150'],
    kubota: ['L3301', 'L4701', 'M5-091', 'M6-111', 'M7-172', 'MX5200'],
    fendt: ['200 Vario', '300 Vario', '500 Vario', '700 Vario', '900 Vario'],
    valtra: ['A Series', 'G Series', 'N Series', 'T Series'],
    deutz_fahr: ['5D', '5G', '6C', '6G', 'Agrotron'],
    landini: ['Serie 4', 'Serie 5', 'Rex 4', 'Powerfarm'],
    same: ['Explorer', 'Frutteto', 'Virtus'],
    mahindra: ['575 DI', '265 DI', '6075', '9125'],
    yanmar: ['YT235', 'YT347', 'YT359'],
  },
  'agr-cosechadora': {
    john_deere: ['S550', 'S660', 'S760', 'S780', 'T550', 'CH570'],
    case_ce: ['Axial-Flow 5150', 'Axial-Flow 7150', 'Axial-Flow 8250', 'Austoft 8010'],
    new_holland: ['CR6.80', 'CR7.90', 'CX5.90', 'TC5.30'],
    claas: ['Tucano 320', 'Tucano 470', 'Lexion 620', 'Lexion 760'],
    massey_ferguson: ['MF 5650', 'MF 9500'],
    deutz_fahr: ['C6205', 'C7206'],
  },
  'agr-implemento': {
    john_deere: ['Arado de discos', 'Rastra', 'Sembradora', 'Fumigadora'],
    massey_ferguson: ['Arado', 'Rastra de discos', 'Sembradora'],
    new_holland: ['Rastra', 'Empacadora', 'Segadora'],
    case_ce: ['Arado', 'Rastra', 'Sembradora'],
    kubota: ['Rotocultivador', 'Segadora'],
  },

  // ── Perforación ──
  'perf-pozo': {
    atlas_copco: ['TH60', 'T4W', 'RD20', 'Predator'],
    epiroc: ['Christensen CT14', 'Christensen CS14', 'Diamec'],
    soilmec: ['SM-401', 'SM-405', 'SR-30'],
    xcmg: ['XSC series', 'XR150'],
    sany: ['SR155', 'SR205', 'SR285'],
  },
  'perf-pilote': {
    bauer: ['BG 15', 'BG 20', 'BG 28', 'BG 36', 'BG 45'],
    soilmec: ['SR-40', 'SR-60', 'SR-75', 'SR-95'],
    junttan: ['PM20', 'PM25', 'PMx22', 'PMx24'],
    sany: ['SR155', 'SR235', 'SR285', 'SR365'],
    xcmg: ['XR180', 'XR220', 'XR280', 'XR360'],
    liebherr: ['LB 16', 'LB 20', 'LB 25', 'LB 28'],
  },
  'perf-roca': {
    atlas_copco: ['ROC D7', 'ROC L8', 'PowerROC T35', 'SmartROC T35'],
    epiroc: ['SmartROC T35', 'SmartROC D65', 'PowerROC T50', 'FlexiROC T35'],
    sandvik: ['DP1500i', 'DI550', 'Ranger DX800', 'Pantera DP1500'],
    furukawa: ['HCR900', 'HCR1200', 'HCR1500'],
  },

  // ── Generadores y compresores ──
  'gen-diesel': {
    caterpillar: ['C4.4 (60 kW)', 'C7.1 (150 kW)', 'C9 (250 kW)', 'C15 (400 kW)', 'C18 (500 kW)', 'C32 (1000 kW)', '3512 (1500 kW)'],
    cummins_power: ['C60 D6', 'C100 D6', 'C150 D6', 'C250 D6', 'C400 D6', 'C600 D6', 'C900 D6'],
    kohler: ['30REOZK', '60REOZK', '100REOZJ', '150REOZJ', '300REOZJ', '500REOZJ'],
    generac: ['SD060', 'SD100', 'SD150', 'SD200', 'SD300', 'SD500'],
    fg_wilson: ['P50', 'P88', 'P110', 'P165', 'P275', 'P450', 'P660'],
    perkins: ['4000 Series', '2500 Series', '1100 Series'],
    denyo: ['DCA-25', 'DCA-45', 'DCA-60', 'DCA-125', 'DCA-220'],
    himoinsa: ['HFW-45', 'HFW-100', 'HFW-200', 'HFW-400'],
    pramac: ['GSW45', 'GSW110', 'GSW200', 'GSW330'],
    aksa: ['APD 50', 'APD 100', 'APD 200', 'APD 400'],
    mitsubishi_power: ['MGS0300', 'MGS0500', 'MGS1000'],
    sdmo: ['J44', 'J110', 'J220', 'J440'],
  },
  'gen-gas': {
    generac: ['SG050', 'SG100', 'SG150', 'SG250', 'Protector 25 kW'],
    kohler: ['38RCL', '48RCL', '80RCL', '150RCL'],
    caterpillar: ['G3406', 'G3412', 'G3516'],
    cummins_power: ['GGHH', 'GGMA', 'C60 N6'],
  },
  'gen-portatil': {
    honda: ['EU2200i', 'EU3000is', 'EU7000is', 'EB5000', 'EB10000'],
    generac: ['GP3000i', 'GP6500', 'GP8000E', 'XG10000E'],
    multiquip: ['GA-3.6', 'GA-6HZ', 'DCA-25'],
    denyo: ['GA-2.6', 'GA-6', 'TLW-300'],
    pramac: ['PX 4000', 'ES 5000', 'E 6000'],
  },
  'gen-compresor': {
    atlas_copco: ['XAS 88', 'XAS 110', 'XAS 185', 'XATS 350', 'XRVS 476'],
    ingersoll_rand: ['P185', 'P250', 'P375', 'P425', 'HP450', 'HP675'],
    sullair: ['185', '260', '375', '750', '900'],
    doosan: ['P185', 'P250', 'P425', 'HP450', 'XP375'],
    kaeser: ['M50', 'M100', 'M170', 'M250', 'M350'],
    epiroc: ['XAS 88', 'XAS 185', 'XAHS 447'],
  },
  'gen-soldadora': {
    lincoln_electric: ['Ranger 250', 'Ranger 305', 'Vantage 300', 'Vantage 580', 'Air Vantage 600'],
    miller: ['Bobcat 250', 'Bobcat 260', 'Big Blue 400', 'Trailblazer 325'],
    denyo: ['DLW-300', 'DLW-400', 'DAW-500'],
    multiquip: ['DAW-300', 'DLW-400'],
  },
};

/* ── Tren motriz ────────────────────────────────────────────
   Solo se pide en vehículos de carretera. En una excavadora el motor
   es parte de la máquina y no se elige; en un cabezote es lo primero
   que pregunta el comprador. */
const SUBS_CON_TREN_MOTRIZ = [
  'cam-cabezote', 'cam-volteo', 'cam-plataforma', 'cam-cisterna',
  'cam-mixer', 'cam-grua', 'cam-carga', 'cam-recoleccion',
  'bus-interurbano', 'bus-urbano', 'bus-escolar', 'bus-minibus',
];

const MOTORES = {
  cummins: { nombre: 'Cummins', modelos: ['X15', 'ISX15', 'ISX12', 'X12', 'ISM11', 'ISL9', 'L9', 'ISB6.7', 'B6.7', 'ISC8.3', 'N14', 'M11', '855 Big Cam', '6BT 5.9', '4BT 3.9'] },
  detroit: { nombre: 'Detroit Diesel', modelos: ['DD16', 'DD15', 'DD13', 'DD8', 'DD5', 'Series 60', 'Series 50', 'Series 71', 'Series 92'] },
  caterpillar: { nombre: 'Caterpillar', modelos: ['C18', 'C15', 'C13', 'C12', 'C11', 'C9', 'C7', 'C7.1', '3406E', '3406B', '3306', '3126'] },
  paccar: { nombre: 'PACCAR', modelos: ['MX-13', 'MX-11', 'PX-9', 'PX-7'] },
  volvo_penta: { nombre: 'Volvo', modelos: ['D16', 'D13', 'D11', 'D7'] },
  mack_motor: { nombre: 'Mack', modelos: ['MP10', 'MP8', 'MP7', 'E7', 'E9', 'AI-427'] },
  international_motor: { nombre: 'International / Navistar', modelos: ['A26', 'MaxxForce 13', 'MaxxForce 11', 'MaxxForce DT', 'DT466', 'DT530', 'N13', 'N9'] },
  mercedes_motor: { nombre: 'Mercedes-Benz', modelos: ['OM 471', 'OM 460 LA', 'OM 457 LA', 'OM 906 LA', 'OM 904 LA', 'OM 366'] },
  hino_motor: { nombre: 'Hino', modelos: ['J08E', 'J05E', 'P11C', 'A09C', 'W04D'] },
  isuzu_motor: { nombre: 'Isuzu', modelos: ['6HK1', '4HK1', '4JJ1', '6WG1', '6UZ1', '4BD1'] },
  fuso_motor: { nombre: 'Mitsubishi Fuso', modelos: ['6M60', '4M50', '4P10', '6D16', '6D22'] },
  scania_motor: { nombre: 'Scania', modelos: ['DC13', 'DC16', 'DC09', 'DC12'] },
  man_motor: { nombre: 'MAN', modelos: ['D2676', 'D2066', 'D0836', 'D2868'] },
  iveco_motor: { nombre: 'Iveco / FPT', modelos: ['Cursor 13', 'Cursor 11', 'Cursor 9', 'NEF 6', 'Tector 7'] },
  weichai: { nombre: 'Weichai', modelos: ['WP12', 'WP10', 'WP7', 'WD615'] },
  yuchai: { nombre: 'Yuchai', modelos: ['YC6L', 'YC6M', 'YC6J', 'YC4E'] },
  perkins_motor: { nombre: 'Perkins', modelos: ['1104', '1106', '1204', '2506'] },
  ford_motor: { nombre: 'Ford', modelos: ['Power Stroke 6.7', 'Power Stroke 7.3', 'Power Stroke 6.0', 'Godzilla 7.3 gas'] },
  duramax: { nombre: 'Duramax (GM)', modelos: ['6.6 L5P', '6.6 LML', '6.6 LBZ', '6.6 LB7'] },
  otro_motor: { nombre: 'Otro fabricante', modelos: [] },
};

const TRANSMISIONES = {
  eaton: { nombre: 'Eaton Fuller', modelos: ['RTLO-18918B', 'RTLO-16918B', 'RTLO-16913A', 'RTLO-14918B', 'RT-11609A', 'FRO-16210C', 'FRO-15210C', 'Ultrashift Plus', 'Endurant HD', 'Endurant XD'] },
  allison: { nombre: 'Allison', modelos: ['1000', '2000', '2500', '3000', '3500', '4000', '4500', '5000', '6000', 'B500'] },
  volvo_trans: { nombre: 'Volvo', modelos: ['I-Shift AT2612D', 'I-Shift ATO3112D', 'I-Shift ATO2612D', 'VTO-2214B'] },
  mack_trans: { nombre: 'Mack', modelos: ['mDRIVE HD', 'mDRIVE', 'T310M', 'T318', 'Maxitorque ES'] },
  detroit_trans: { nombre: 'Detroit', modelos: ['DT12-O', 'DT12-D', 'DT12-V'] },
  paccar_trans: { nombre: 'PACCAR', modelos: ['TX-12', 'TX-18 Pro', 'TX-8'] },
  zf: { nombre: 'ZF', modelos: ['TraXon', 'AS-Tronic', 'Ecolife', 'Ecomat', '16S 2230', '12AS'] },
  meritor: { nombre: 'Meritor', modelos: ['MO-14G10A', 'MO-16G10A', 'Engineered 14'] },
  mercedes_trans: { nombre: 'Mercedes-Benz', modelos: ['PowerShift 3', 'G211-12', 'G281-12', 'G85-6'] },
  hino_trans: { nombre: 'Hino', modelos: ['LX06', 'MF06S', 'EH06'] },
  isuzu_trans: { nombre: 'Isuzu', modelos: ['MYY6S', 'MZW6P', 'MJT7S'] },
  aisin: { nombre: 'Aisin', modelos: ['A465', 'A460', 'AMT6'] },
  fast_gear: { nombre: 'Fast Gear', modelos: ['12JS200T', '9JS135', '10JS90'] },
  otra_trans: { nombre: 'Otro fabricante', modelos: [] },
};

/* ── Consultas ──────────────────────────────────────────────
   Todo lo que necesitan las pantallas y la validación del servidor.
   Nada de recorrer las estructuras a mano fuera de aquí. */

const categoria = (idCat) => CATEGORIAS.find((c) => c.id === idCat) || null;

const subcategoriasDe = (idCat) => (categoria(idCat) || {}).subcategorias || [];

function subcategoria(idSub) {
  for (const c of CATEGORIAS) {
    const s = c.subcategorias.find((x) => x.id === idSub);
    if (s) return { ...s, categoria: c.id };
  }
  return null;
}

/* Marcas de una subcategoría, ya con su nombre para mostrar y
   ordenadas alfabéticamente salvo «Otra marca», que va al final
   porque es la salida, no una opción más. */
function marcasDe(idSub) {
  const ids = MARCAS_POR_SUB[idSub] || [];
  return ids
    .filter((id) => MARCAS[id] && id !== 'otra')
    .map((id) => ({ id, nombre: MARCAS[id] }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .concat(ids.includes('otra') ? [{ id: 'otra', nombre: MARCAS.otra }] : []);
}

const modelosDe = (idSub, idMarca) => ((MODELOS[idSub] || {})[idMarca] || []);

const pideTrenMotriz = (idSub) => SUBS_CON_TREN_MOTRIZ.includes(idSub);

/* Comprueba la cadena completa. Es lo que usa el servidor: el
   navegador puede mandar cualquier cosa, y una jerarquía que solo se
   respeta en la pantalla no sirve de nada. */
function validarCadena({ categoria: cat, subcategoria: sub, marca }) {
  const c = categoria(cat);
  if (!c) return 'Categoría inválida';

  const s = c.subcategorias.find((x) => x.id === sub);
  if (!s) return 'La subcategoría no pertenece a esa categoría';

  // La marca se admite vacía solo si la subcategoría no tiene lista.
  const permitidas = MARCAS_POR_SUB[sub] || [];
  if (permitidas.length && !permitidas.includes(marca)) {
    return 'Esa marca no fabrica ese tipo de equipo';
  }
  return null;
}

const nombreMarca = (id) => MARCAS[id] || id || '';

/* Nombre legible de una subcategoría a partir de su id. Los anuncios
   guardan el id; las fichas y los correos muestran esto. */
const nombreSubcategoria = (idSub) => (subcategoria(idSub) || {}).nombre || idSub || '';

/* En Node se importa; en el navegador quedan como globales. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MARCAS, CATEGORIAS, MARCAS_POR_SUB, MODELOS, MOTORES, TRANSMISIONES,
    SUBS_CON_TREN_MOTRIZ,
    categoria, subcategoriasDe, subcategoria, marcasDe, modelosDe,
    pideTrenMotriz, validarCadena, nombreMarca, nombreSubcategoria,
  };
}
