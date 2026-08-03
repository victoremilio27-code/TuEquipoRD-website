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

const http = require('http');
const fs = require('fs');
const path = require('path');

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

  if (ruta.endsWith('/')) ruta += 'index.html';

  const archivo = path.join(RAIZ, ruta);

  // No servir nada fuera de la raíz declarada.
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
