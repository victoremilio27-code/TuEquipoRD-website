/**
 * verificar-taxonomia.js — comprueba la coherencia de la taxonomía.
 *
 *   node tools/verificar-taxonomia.js
 *
 * Busca lo que rompe la jerarquía en silencio: una marca escrita en
 * una subcategoría pero no registrada, modelos colgando de una marca
 * que no fabrica ese equipo, subcategorías sin marcas, ids repetidos.
 *
 * Se ejecuta con `npm run auditar`. Una taxonomía de este tamaño se
 * desordena sola en cuanto la tocan dos personas.
 */

const t = require('../assets/taxonomia.js');

const fallos = [];
const avisos = [];

/* ── Ids únicos ─────────────────────────────────────────── */

const idsCat = new Set();
const idsSub = new Set();

t.CATEGORIAS.forEach((c) => {
  if (idsCat.has(c.id)) fallos.push(`Categoría repetida: ${c.id}`);
  idsCat.add(c.id);

  if (!c.subcategorias || !c.subcategorias.length) {
    fallos.push(`La categoría "${c.id}" no tiene subcategorías`);
  }

  (c.subcategorias || []).forEach((s) => {
    if (idsSub.has(s.id)) fallos.push(`Subcategoría repetida: ${s.id}`);
    idsSub.add(s.id);
  });
});

/* ── Toda subcategoría necesita marcas ──────────────────── */

idsSub.forEach((id) => {
  const marcas = t.MARCAS_POR_SUB[id];
  if (!marcas || !marcas.length) {
    fallos.push(`La subcategoría "${id}" no declara marcas`);
  }
});

/* ── Marcas huérfanas en MARCAS_POR_SUB ─────────────────── */

Object.entries(t.MARCAS_POR_SUB).forEach(([sub, marcas]) => {
  if (!idsSub.has(sub)) {
    fallos.push(`MARCAS_POR_SUB tiene "${sub}", que no es ninguna subcategoría`);
  }
  marcas.forEach((m) => {
    if (!t.MARCAS[m]) fallos.push(`Marca no registrada: "${m}" en ${sub}`);
  });
  const vistas = new Set();
  marcas.forEach((m) => {
    if (vistas.has(m)) fallos.push(`Marca repetida: "${m}" en ${sub}`);
    vistas.add(m);
  });
});

/* ── Modelos colgando de donde no deben ─────────────────── */

Object.entries(t.MODELOS).forEach(([sub, porMarca]) => {
  if (!idsSub.has(sub)) {
    fallos.push(`MODELOS tiene "${sub}", que no es ninguna subcategoría`);
    return;
  }
  const permitidas = t.MARCAS_POR_SUB[sub] || [];
  Object.entries(porMarca).forEach(([marca, modelos]) => {
    if (!t.MARCAS[marca]) {
      fallos.push(`Modelos de una marca no registrada: "${marca}" en ${sub}`);
    } else if (!permitidas.includes(marca)) {
      // Esto es exactamente el fallo que se quería eliminar: modelos
      // de una marca que no fabrica ese tipo de equipo.
      fallos.push(`"${t.MARCAS[marca]}" tiene modelos en ${sub} pero no está entre sus marcas`);
    }
    if (!modelos.length) avisos.push(`Lista de modelos vacía: ${marca} en ${sub}`);
    const vistos = new Set();
    modelos.forEach((m) => {
      if (vistos.has(m)) fallos.push(`Modelo repetido: "${m}" en ${sub}/${marca}`);
      vistos.add(m);
    });
  });
});

/* ── Tren motriz solo en carretera ──────────────────────── */

t.SUBS_CON_TREN_MOTRIZ.forEach((sub) => {
  if (!idsSub.has(sub)) fallos.push(`SUBS_CON_TREN_MOTRIZ tiene "${sub}", que no existe`);
});

Object.entries(t.MOTORES).forEach(([id, m]) => {
  if (!m.nombre) fallos.push(`Motor sin nombre: ${id}`);
});
Object.entries(t.TRANSMISIONES).forEach(([id, m]) => {
  if (!m.nombre) fallos.push(`Transmisión sin nombre: ${id}`);
});

/* ── Cobertura ──────────────────────────────────────────── */

let sinModelos = 0;
let conModelos = 0;
idsSub.forEach((sub) => {
  (t.MARCAS_POR_SUB[sub] || []).filter((m) => m !== 'otra').forEach((m) => {
    if (t.modelosDe(sub, m).length) conModelos++;
    else sinModelos++;
  });
});

/* ── Informe ────────────────────────────────────────────── */

const totalModelos = Object.values(t.MODELOS)
  .reduce((n, porMarca) => n + Object.values(porMarca).reduce((k, l) => k + l.length, 0), 0);

console.log('\n── Taxonomía ──');
console.log(`  Categorías        ${t.CATEGORIAS.length}`);
console.log(`  Subcategorías     ${idsSub.size}`);
console.log(`  Marcas            ${Object.keys(t.MARCAS).length}`);
console.log(`  Modelos           ${totalModelos}`);
console.log(`  Motores           ${Object.keys(t.MOTORES).length} fabricantes`);
console.log(`  Transmisiones     ${Object.keys(t.TRANSMISIONES).length} fabricantes`);
console.log(`  Pares marca+subcategoría con modelos  ${conModelos} de ${conModelos + sinModelos}`);

if (avisos.length) {
  console.log(`\n── ${avisos.length} aviso(s) ──`);
  avisos.slice(0, 10).forEach((a) => console.log(`  · ${a}`));
}

if (fallos.length) {
  console.log(`\n══ ${fallos.length} FALLO(S) ══`);
  fallos.forEach((f) => console.log(`  ✗ ${f}`));
  process.exit(1);
}

console.log('\n  Sin incoherencias.\n');
