/**
 * serve.js — servidor del sitio. Estáticos + API. Sin dependencias.
 *
 * Uso:
 *   npm start                        # http://localhost:8080
 *   node tools/serve.js --port 3000
 *   node tools/serve.js --sin-api    # solo estáticos
 *   node tools/serve.js --root archive/v1-aterrizaje --port 8081
 *
 * Con la API montada, /api/* lo atiende tools/api.js contra la base
 * SQLite de db/. El resto son archivos del proyecto.
 */

// Lo primero: el .env debe estar cargado antes de que nadie lea
// process.env, incluidos db y correo al importarse.
require('./entorno');

const http = require('http');
const fs = require('fs');
const path = require('path');

const fotos = require('./fotos');

const RAIZ_PROYECTO = path.resolve(__dirname, '..');

const PRODUCCION = process.env.NODE_ENV === 'production';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.pdf': 'application/pdf',
};

/* Cabeceras de seguridad. Van en todas las respuestas, también en las
   de la API y en los errores: una cabecera que solo se pone en el
   camino feliz no protege el camino que importa.

   La CSP puede ser estricta porque el sitio no tiene ni un solo
   <script> en línea ni un atributo onclick: todo el JavaScript vive en
   assets/ y se carga con src. Lo único de fuera son las fuentes de
   Google, declaradas una a una.

   `style-src` sí lleva 'unsafe-inline' porque quedan dos atributos
   style= en el HTML y dos asignaciones a element.style en el JS. Es la
   concesión mínima y solo afecta a estilos, no a scripts, que es donde
   está el riesgo real. */
const CABECERAS_SEGURIDAD = {
  // Nada de adivinar el tipo: un .txt subido no se ejecuta como script.
  'X-Content-Type-Options': 'nosniff',
  // El sitio no se embebe en iframes ajenos, así que no hay clickjacking.
  'X-Frame-Options': 'DENY',
  // No filtrar la URL completa —con sus filtros de búsqueda— a terceros.
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // El sitio no usa cámara, micrófono ni geolocalización del navegador.
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
};

function cabecerasDe(extra = {}) {
  const h = { ...CABECERAS_SEGURIDAD, ...extra };
  // HSTS solo con HTTPS activo. Enviarlo por HTTP no hace nada, y
  // enviarlo antes de tener certificado deja el dominio inaccesible en
  // los navegadores que ya lo hayan recordado.
  if (PRODUCCION && process.env.TUEQUIPO_HTTPS === '1') {
    h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }
  return h;
}

/* En desarrollo, nunca cachear: siempre quieres el archivo recién
   guardado. En producción sí, pero con cuidado: los nombres no llevan
   hash, así que un caché largo en styles.css o app.js dejaría a la
   gente con la versión vieja después de un despliegue. El HTML
   revalida siempre y el resto dura lo justo. */
function cacheDe(ext) {
  if (!PRODUCCION) return 'no-store';
  if (ext === '.html') return 'no-cache';
  if (ext === '.css' || ext === '.js') return 'public, max-age=3600';
  return 'public, max-age=604800';
}

/* QUÉ SE PUEDE PEDIR POR HTTP.
 *
 * Lista blanca, no lista negra. Antes se servía cualquier archivo bajo
 * la raíz del proyecto y eso dejaba a la vista:
 *
 *   /.env              la clave de Brevo y el secreto de sesión
 *   /db/tuequipord.db  la base entera: correos, hashes, RNC
 *   /.git/config       el repositorio
 *   /tools/db.js       el código del servidor
 *
 * Con una lista negra siempre se olvida algo —un .bak, un .env.old, un
 * volcado que alguien dejó en la carpeta—. Con una lista blanca, lo
 * que no está previsto no se sirve, y añadir un archivo público es una
 * línea aquí.
 *
 * Las fotografías NO están en esta lista: viven fuera del proyecto y
 * las atiende su propia rama, más arriba.
 */
const PUBLICO = [
  /^\/[\w-]+\.html$/,                       // páginas del sitio
  /^\/assets\/[\w.-]+\.(js|svg|css|woff2?)$/, // scripts e iconos
  /* Logotipos y las fotografías del héroe, que viven en
     brand_assets/portada. Se admite UN nivel de subcarpeta y su nombre
     solo puede llevar letras, dígitos y guiones: sin puntos no hay
     «..» que valga, así que no se sale de aquí. */
  /^\/brand_assets\/(?:[\w-]+\/)?[\w.-]+\.(png|svg|jpe?g|webp)$/,
  /^\/styles\.css$/,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/,
];

const esPublico = (ruta) => PUBLICO.some((p) => p.test(ruta));

function leerArgs(argv) {
  const args = { port: Number(process.env.PORT) || 8080, root: '.', api: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port' || argv[i] === '-p') args.port = Number(argv[++i]);
    else if (argv[i] === '--root' || argv[i] === '-r') args.root = argv[++i];
    else if (argv[i] === '--sin-api') args.api = false;
  }
  return args;
}

const args = leerArgs(process.argv.slice(2));
const RAIZ = path.resolve(RAIZ_PROYECTO, args.root);

/* La API se carga solo si se pide y solo si su base arranca. Si algo
   falla, el sitio sigue sirviéndose como estático en vez de no
   levantar: es un entorno de desarrollo, no conviene un todo o nada. */
let api = null;
if (args.api) {
  try {
    api = require('./api');
    const db = require('./db');
    db.abrir();
    // Sesiones, códigos y contadores caducados se barren cada hora.
    // `unref` evita que este temporizador mantenga vivo el proceso.
    db.purgar();
    setInterval(() => db.purgar(), 3600 * 1000).unref();
  } catch (e) {
    /* En producción esto no es recuperable: sin API no hay cuentas ni
       publicaciones, y un sitio a medias es peor que uno caído porque
       systemd no lo reinicia y nadie se entera. */
    if (PRODUCCION) {
      console.error('API no disponible:', e.message);
      process.exit(1);
    }
    console.warn('API no disponible, se sirve solo el sitio estático:', e.message);
    api = null;
  }
}

const servidor = http.createServer((req, res) => {
  /* Las cabeceras de seguridad se fijan antes de mirar siquiera qué se
     pide, de modo que las lleven también el 400, el 403 y el 404. Con
     `setHeader` sobreviven a cualquier `writeHead` posterior, incluido
     el de la API, que no sabe nada de esto. */
  Object.entries(cabecerasDe()).forEach(([k, v]) => res.setHeader(k, v));

  let ruta;
  try {
    ruta = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('URL inválida');
    return;
  }

  if (api && ruta.startsWith('/api/')) {
    api.manejar(req, res, ruta).catch((e) => {
      console.error('API', e);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end('{"error":"Error del servidor"}');
    });
    return;
  }

  /* Fotografías de los anuncios. Viven fuera del proyecto —en el VPS,
     en /var/lib— así que no las alcanza el servidor de estáticos de
     más abajo y necesitan su propia rama.

     Caché de un año e `immutable`: el nombre de cada archivo es
     aleatorio y nunca se reescribe, así que una foto descargada no hay
     que volver a pedirla jamás. Es lo que convierte la segunda visita
     al catálogo en instantánea. */
  if (ruta.startsWith('/fotos/')) {
    const archivo = fotos.archivoDe(ruta);
    if (!archivo) {
      res.writeHead(404).end('No existe');
      return;
    }
    fs.readFile(archivo, (err, datos) => {
      if (err) {
        res.writeHead(404).end('No existe');
        return;
      }
      res.writeHead(200, {
        'Content-Type': fotos.tipoDe(archivo),
        'Cache-Control': PRODUCCION ? 'public, max-age=31536000, immutable' : 'no-store',
      });
      res.end(datos);
    });
    return;
  }

  if (ruta.endsWith('/')) ruta += 'index.html';

  /* Solo lo declarado público. Se comprueba ANTES de tocar el disco:
     así el servidor ni siquiera revela, por la diferencia entre un 403
     y un 404, qué archivos existen fuera de la lista. */
  if (!esPublico(ruta)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p>No existe.</p>');
    console.log(`404  ${ruta}  (fuera de la lista pública)`);
    return;
  }

  const archivo = path.join(RAIZ, ruta);

  // Cinturón y tirantes: aunque la lista blanca ya lo impide, no
  // servir nada que quede fuera de la raíz declarada.
  if (!archivo.startsWith(RAIZ + path.sep) && archivo !== RAIZ) {
    res.writeHead(403).end('Prohibido');
    return;
  }

  fs.readFile(archivo, (err, datos) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404</h1><p>No existe <code>' + ruta.replace(/[<>&]/g, '') + '</code></p>');
      console.log(`404  ${ruta}`);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': cacheDe(path.extname(archivo).toLowerCase()),
    });
    res.end(datos);
    console.log(`200  ${ruta}`);
  });
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`El puerto ${args.port} está ocupado. Prueba: node tools/serve.js --port ${args.port + 1}`);
    process.exit(1);
  }
  throw e;
});

servidor.listen(args.port, () => {
  console.log(`TuEquipoRD en http://localhost:${args.port}`);
  console.log(`Sirviendo   ${RAIZ}`);
  console.log(`API         ${api ? 'activa en /api' : 'desactivada'}`);
  console.log('Ctrl+C para detener.\n');
});
