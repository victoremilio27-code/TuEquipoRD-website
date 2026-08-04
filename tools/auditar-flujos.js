/* Recorrido de auditoría · vendedor particular, dealer y administrador.
   Usa el sitio como lo usaría una persona: formularios reales, códigos
   leídos del buzón de archivo, sin tocar la base por debajo. */

const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE = 'http://localhost:8080';
const CLAVE = 'Retroexcavadora77RD';
const BUZON = '.tmp/correos';

const fallos = [];
const anota = (donde, tipo, detalle) => {
  fallos.push({ donde, tipo, detalle });
  console.log(`    ⚠ [${tipo}] ${detalle}`);
};
const ok = (t) => console.log(`    ✓ ${t}`);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function codigoDe(fragmento) {
  const archivos = fs.readdirSync(BUZON).filter((f) => f.includes(fragmento)).sort();
  if (!archivos.length) return null;
  const texto = fs.readFileSync(`${BUZON}/${archivos[archivos.length - 1]}`, 'utf8');
  const m = /Código: (\d+)/.exec(texto);
  return m && m[1];
}

function vigilar(p, etiqueta) {
  p.removeAllListeners('pageerror');
  p.removeAllListeners('response');
  p.on('pageerror', (e) => anota(etiqueta, 'excepción', String(e.message).slice(0, 140)));
  p.on('response', (r) => {
    if (r.status() >= 500) anota(etiqueta, `HTTP ${r.status()}`, r.url().replace(BASE, ''));
  });
}

async function escribir(p, sel, valor) {
  await p.click(sel);
  await p.type(sel, valor);
}

/* Registro + verificación del correo. Devuelve true si acabó con sesión. */
async function registrar(p, { tipo, correo, nombre, extra = {} }) {
  await p.goto(`${BASE}/cuenta.html?crear=1`, { waitUntil: 'networkidle0' });
  await esperar(400);
  if (tipo === 'dealer') {
    await p.click('input[name="tipoCuenta"][value="dealer"]');
    await esperar(300);
  }
  await escribir(p, '#new-nombre', nombre);
  await escribir(p, '#new-telefono', extra.telefono || '8095551234');
  await escribir(p, '#new-correo', correo);
  await escribir(p, '#new-clave', CLAVE);

  if (tipo === 'dealer') {
    await escribir(p, '#new-empresa', extra.empresa);
    await escribir(p, '#new-rnc', extra.rnc);
    await escribir(p, '#new-encargado', nombre);
    await escribir(p, '#new-direccion', extra.direccion || 'Av. Principal 45, nave 2');
    await p.select('#new-provincia', extra.provincia || 'Santo Domingo');
  }

  await p.click('#btnCrear');
  await esperar(1200);

  const aviso = await p.$eval('#avisoAcceso', (el) => (el.hidden ? '' : el.textContent.trim())).catch(() => '');
  if (aviso) { anota('registro', 'lógica', `${correo}: ${aviso}`); return false; }

  const codigo = codigoDe(correo.split('@')[0]);
  if (!codigo) { anota('registro', 'correo', `no llegó código a ${correo}`); return false; }

  await p.type('#cod-codigo', codigo);
  await esperar(1800);
  return p.url().includes('panel.html');
}

(async () => {
  const nav = await puppeteer.launch({ headless: 'new' });
  const p = await nav.newPage();
  await p.setViewport({ width: 1440, height: 950 });

  /* ═══ VENDEDOR PARTICULAR ═══ */
  console.log('\n═══ Vendedor particular ═══');
  vigilar(p, 'particular');
  const entro = await registrar(p, {
    tipo: 'particular', correo: 'vendedor@auditoria.do', nombre: 'José Almonte',
  });
  console.log(`  registro + verificación → panel: ${entro ? 'sí' : 'NO'}`);
  if (!entro) anota('particular', 'flujo', 'no llegó al panel tras verificar el correo');

  // Publicar un equipo
  console.log('\n  ── Publicar un equipo ──');
  await p.goto(`${BASE}/publicar.html`, { waitUntil: 'networkidle0' });
  await esperar(1200);
  const pasos = await p.$$eval('.paso, [data-paso], .asistente__paso', (n) => n.length).catch(() => 0);
  console.log(`  asistente con ${pasos} paso(s) detectados`);

  const campos = await p.evaluate(() => {
    const v = [];
    document.querySelectorAll('input,select,textarea').forEach((el) => {
      if (el.offsetParent !== null && el.id) v.push(el.id);
    });
    return v;
  });
  console.log(`  campos visibles: ${campos.slice(0, 14).join(', ')}`);

  // Intentar avanzar en blanco: debe frenar y explicar
  const avanzar = await p.$('#btnSiguiente, [data-siguiente], button[type="submit"]');
  if (avanzar) {
    await avanzar.click();
    await esperar(700);
    const textoErr = await p.$$eval('.campo-v__error, .paso__aviso, [role="alert"]',
      (n) => n.filter((x) => x.offsetParent !== null).map((x) => x.textContent.trim()).join(' | '));
    console.log(`  validación en vacío: ${textoErr ? 'frena ✓' : 'NO FRENA ⚠'}`);
    if (!textoErr) anota('publicar', 'validación', 'el asistente avanza con el formulario vacío');
    else ok(`avisa: ${textoErr.slice(0, 90)}`);
  } else {
    anota('publicar', 'ux', 'no se encontró el botón para avanzar');
  }

  // Panel del particular
  await p.goto(`${BASE}/panel.html`, { waitUntil: 'networkidle0' });
  await esperar(900);
  const subP = await p.$eval('#panelSub', (el) => el.textContent.trim()).catch(() => '');
  console.log(`  panel: ${subP}`);
  const ofreceDealer = await p.$eval('body', (b) => b.innerText.includes('Comercializa maquinaria'));
  console.log(`  ofrece pasar a dealer: ${ofreceDealer ? 'sí' : 'NO'}`);

  // El particular no debe ver el panel de administración
  await p.goto(`${BASE}/admin.html`, { waitUntil: 'networkidle0' });
  await esperar(800);
  const bloqueado = await p.$eval('#adminSinAcceso', (el) => !el.hidden).catch(() => false);
  console.log(`  /admin.html bloqueado para particular: ${bloqueado ? 'sí ✓' : 'NO ⚠'}`);
  if (!bloqueado) anota('particular', 'SEGURIDAD', 'un particular ve el panel de administración');

  /* ═══ DEALER ═══ */
  console.log('\n═══ Dealer ═══');
  await p.goto(`${BASE}/api/cuenta/salir`, { waitUntil: 'networkidle0' }).catch(() => {});
  await p.evaluate(() => fetch('/api/cuenta/salir', { method: 'POST', credentials: 'same-origin' })).catch(() => {});
  await esperar(500);

  vigilar(p, 'dealer');
  const entroD = await registrar(p, {
    tipo: 'dealer', correo: 'dealer@auditoria.do', nombre: 'Carmen Objio',
    extra: { empresa: 'Auditoría Equipos SRL', rnc: '131909090', provincia: 'La Vega' },
  });
  console.log(`  alta de dealer → panel: ${entroD ? 'sí' : 'NO'}`);

  await p.goto(`${BASE}/panel.html`, { waitUntil: 'networkidle0' });
  await esperar(900);
  const cuerpoD = await p.$eval('body', (b) => b.innerText);
  console.log(`  estado mostrado: ${/En revisión/.test(cuerpoD) ? 'En revisión ✓' : 'NO aparece ⚠'}`);
  if (!/En revisión/.test(cuerpoD)) anota('dealer', 'ux', 'el panel no indica que está en revisión');
  if (/RNC\s*1319/.test(cuerpoD)) anota('dealer', 'PRIVACIDAD', 'el RNC completo se ve en el panel');
  else ok('el RNC aparece enmascarado');

  // Sucursales
  const btnSuc = await p.$('#btnNuevaSucursal, [data-nueva-sucursal]');
  console.log(`  puede añadir sucursales: ${btnSuc ? 'sí' : 'NO'}`);

  // Un dealer pendiente no debe salir en el directorio
  await p.goto(`${BASE}/dealers.html`, { waitUntil: 'networkidle0' });
  await esperar(800);
  const dir = await p.$eval('body', (b) => b.innerText);
  if (dir.includes('Auditoría Equipos')) anota('dealer', 'LÓGICA', 'un dealer pendiente aparece en el directorio');
  else ok('el dealer pendiente no sale en el directorio');

  /* ═══ ADMINISTRADOR ═══ */
  console.log('\n═══ Administrador ═══');
  await p.evaluate(() => fetch('/api/cuenta/salir', { method: 'POST', credentials: 'same-origin' })).catch(() => {});
  await esperar(400);

  vigilar(p, 'admin');
  await p.goto(`${BASE}/cuenta.html`, { waitUntil: 'networkidle0' });
  await escribir(p, '#ent-correo', 'caribe@demo.tuequipord.do');
  await escribir(p, '#ent-clave', 'demostracion2026');
  await p.click('#formEntrar button[type="submit"]');
  await esperar(1200);

  if (await p.$eval('#formCodigo', (el) => !el.hidden).catch(() => false)) {
    const c = codigoDe('caribe');
    if (c) { await p.type('#cod-codigo', c); await esperar(1800); }
  }
  console.log(`  sesión de administrador: ${p.url().includes('panel') ? 'sí' : 'NO'}`);

  await p.goto(`${BASE}/admin.html`, { waitUntil: 'networkidle0' });
  await esperar(1000);
  const verCola = await p.$eval('#adminContenido', (el) => !el.hidden).catch(() => false);
  console.log(`  ve la cola de revisión: ${verCola ? 'sí ✓' : 'NO ⚠'}`);
  if (!verCola) anota('admin', 'flujo', 'el administrador no ve la cola');

  const nSol = await p.$$eval('.sol', (n) => n.length).catch(() => 0);
  console.log(`  solicitudes pendientes: ${nSol}`);

  if (nSol) {
    await p.click('button[data-accion="ver"]');
    await esperar(800);
    const exp = await p.$eval('.sol__detalle', (el) => el.innerText).catch(() => '');
    console.log(`  expediente muestra RNC: ${/131909090/.test(exp) ? 'sí ✓' : 'NO ⚠'}`);
    if (!/131909090/.test(exp)) anota('admin', 'flujo', 'el expediente no muestra el RNC');

    await p.click('button[data-accion="aprobar"]');
    await esperar(1500);
    const restantes = await p.$$eval('.sol', (n) => n.length).catch(() => 0);
    console.log(`  tras aprobar: ${nSol} → ${restantes} pendientes`);
    if (restantes >= nSol) anota('admin', 'flujo', 'aprobar no saca la solicitud de la cola');
  }

  // Tras aprobar, ¿aparece en el directorio? Sin plan NO debe salir.
  await p.goto(`${BASE}/dealers.html`, { waitUntil: 'networkidle0' });
  await esperar(800);
  const dir2 = await p.$eval('body', (b) => b.innerText);
  console.log(`  aprobado sin plan en el directorio: ${dir2.includes('Auditoría Equipos') ? 'SÍ ⚠' : 'no ✓'}`);
  if (dir2.includes('Auditoría Equipos')) anota('admin', 'lógica', 'sale en el directorio sin plan contratado');

  await nav.close();

  console.log(`\n══════ ${fallos.length} hallazgo(s) en flujos autenticados ══════`);
  fallos.forEach((f) => console.log(`  [${f.tipo}] ${f.donde}: ${f.detalle}`));
})();
