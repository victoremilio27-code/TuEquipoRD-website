/**
 * facturas.js — emisión de comprobantes. Sin dependencias.
 *
 * QUÉ SE EMITE Y CUÁNDO
 *
 * Todo pago aprobado genera un comprobante. Siempre, lo pida el cliente
 * o no: es la constancia de lo que se cobró, y no tenerla es lo que
 * convierte una reclamación en la palabra de uno contra la del otro.
 *
 * Qué tipo depende de si el cliente pidió comprobante fiscal:
 *
 *   · Pide RNC          → FACTURA DE CRÉDITO FISCAL, con NCF B01.
 *   · No pide RNC       → lo correcto sería una factura de consumo con
 *                         NCF B02… que TODAVÍA NO EXISTE. Mientras la
 *                         DGII no apruebe esa secuencia, se emite un
 *                         RECIBO DE PAGO rotulado como NO FISCAL.
 *   · Devolución        → NOTA DE CRÉDITO con NCF B04, enlazada al
 *                         comprobante original, que no se toca.
 *
 * LO DEL B02 NO ES UN DETALLE. El sitio va a vender sobre todo a
 * particulares y a empresas pequeñas que no piden crédito fiscal: es
 * decir, a la mayoría le corresponde justo la secuencia que falta. El
 * código ya sabe emitirla; en cuanto se cargue el rango en
 * `secuencias_ncf` con usa_sitio = 1, deja de salir el recibo y empieza
 * a salir la factura. No hay que tocar nada más.
 *
 * UN COMPROBANTE EMITIDO NO SE MODIFICA NI SE BORRA. Si hay que anular,
 * se emite una nota de crédito. El PDF tampoco se regenera: el archivo
 * que se le mandó al cliente y el que queda guardado son el mismo.
 */

const fs = require('fs');
const path = require('path');

const db = require('./db');
const pdf = require('./pdf');
const correo = require('./correo');
const precios = require('../assets/precios.js');

const RAIZ = path.resolve(__dirname, '..');

/* Fuera del proyecto, como las fotos y los videos: así un despliegue no
   los toca y entran en el respaldo diario. */
const CARPETA = process.env.MERCA_FACTURAS || path.join(RAIZ, '.tmp', 'facturas');

/* Aviso cuando una secuencia se está acabando.
 *
 * La tarea pide 50, y para B15 —que tiene 50— está bien. Para B01, que
 * tiene QUINCE en total, avisar a los 50 sería avisar desde el primer
 * día y para siempre, que es igual que no avisar. Se usa el menor de
 * los dos: 50, o un tercio del rango. */
const AVISAR_BAJO = (rango) => Math.max(3, Math.min(50, Math.ceil(rango / 3)));

const TITULOS = {
  recibo: 'RECIBO DE PAGO',
  factura_consumo: 'FACTURA DE CONSUMO',
  factura_credito_fiscal: 'FACTURA DE CRÉDITO FISCAL',
  nota_credito: 'NOTA DE CRÉDITO',
};

const pesos = (n) => `RD$${Number(n || 0).toLocaleString('en-US')}`;

const fechaLarga = (iso) => new Date(iso).toLocaleDateString('es-DO', {
  day: '2-digit', month: 'long', year: 'numeric',
});

/* ── El documento ───────────────────────────────────────── */

/* Dibuja el comprobante. Devuelve el PDF en memoria.
 *
 * La maqueta es una rejilla de dos columnas con los márgenes de una
 * carta. No hay nada dinámico salvo el número de líneas del detalle,
 * y por eso el cursor vertical se va pasando de bloque en bloque. */
function dibujar(f, { emisor }) {
  const d = pdf.documento();
  const M = 46;                       // margen
  const ANCHO_UTIL = d.ANCHO - M * 2;
  const AZUL = '#071A2B';
  const AMBAR = '#F2A900';
  const GRIS = '#60717D';
  const TEXTO = '#33475A';

  /* Membrete. El nombre va compuesto, no como imagen: incrustar un
     logotipo obligaría a decodificar PNG a mano por no traer
     dependencias, y el resultado se vería peor que el texto. */
  d.rect(0, 0, d.ANCHO, 92, AZUL);
  d.rect(0, 92, d.ANCHO, 4, AMBAR);
  d.texto('Merca', M, 44, { tamano: 21, tipo: 'negrita', color: '#FFFFFF' });
  d.texto('Maquinarias', M + pdf.anchoDe('Merca', 21, true), 44, { tamano: 21, tipo: 'negrita', color: AMBAR });
  d.texto(emisor.razonSocial, M, 64, { tamano: 8.5, color: '#8FA3B3' });
  d.texto(`RNC ${emisor.rnc}`, M, 76, { tamano: 8.5, color: '#8FA3B3' });
  d.texto(emisor.domicilioFiscal, d.ANCHO - M - 260, 64, {
    tamano: 8, color: '#8FA3B3', alinear: 'derecha', ancho: 260,
  });
  d.texto('mercamaquinarias.com', d.ANCHO - M - 260, 76, {
    tamano: 8, color: '#8FA3B3', alinear: 'derecha', ancho: 260,
  });

  /* Título y numeración. */
  let y = 132;
  d.texto(TITULOS[f.tipo] || 'COMPROBANTE', M, y, { tamano: 15, tipo: 'negrita', color: AZUL });
  d.texto(f.numero, d.ANCHO - M - 220, y, {
    tamano: 12, tipo: 'negrita', color: AZUL, alinear: 'derecha', ancho: 220,
  });

  y += 16;
  d.texto(fechaLarga(f.fecha), M, y, { tamano: 9, color: GRIS });
  if (f.ncf) {
    d.texto(`NCF ${f.ncf}`, d.ANCHO - M - 220, y, {
      tamano: 9.5, tipo: 'negrita', color: AZUL, alinear: 'derecha', ancho: 220,
    });
  } else {
    d.texto('Sin valor fiscal', d.ANCHO - M - 220, y, {
      tamano: 9, tipo: 'oblicua', color: GRIS, alinear: 'derecha', ancho: 220,
    });
  }

  y += 12;
  d.linea(M, y, d.ANCHO - M, y, { color: '#DEDCD4' });

  /* A quién se le factura. */
  y += 26;
  d.texto('CLIENTE', M, y, { tamano: 8, tipo: 'negrita', color: GRIS });
  y += 15;
  d.texto(f.razon_social || 'Consumidor final', M, y, { tamano: 11, tipo: 'negrita', color: AZUL });
  if (f.rnc) { y += 14; d.texto(`RNC ${f.rnc}`, M, y, { tamano: 9, color: TEXTO }); }
  if (f.direccion) { y = d.parrafo(f.direccion, M, y + 14, 300, { tamano: 9, color: TEXTO }) - 4; }

  /* El detalle. */
  y += 30;
  d.rect(M, y - 12, ANCHO_UTIL, 22, '#F7F5EF');
  d.texto('CONCEPTO', M + 8, y + 3, { tamano: 8, tipo: 'negrita', color: GRIS });
  d.texto('IMPORTE', d.ANCHO - M - 108, y + 3, {
    tamano: 8, tipo: 'negrita', color: GRIS, alinear: 'derecha', ancho: 100,
  });

  y += 30;
  const finConcepto = d.parrafo(f.concepto || 'Servicio contratado', M + 8, y, 330, { tamano: 9.5, color: TEXTO });
  d.texto(pesos(f.subtotal), d.ANCHO - M - 108, y, {
    tamano: 9.5, color: TEXTO, alinear: 'derecha', ancho: 100,
  });
  y = Math.max(finConcepto, y + 14) + 6;
  d.linea(M, y, d.ANCHO - M, y, { color: '#ECEAE3' });

  /* Totales, pegados a la derecha. */
  const xEtiqueta = d.ANCHO - M - 260;
  const xCifra = d.ANCHO - M - 108;
  y += 20;
  d.texto('Subtotal', xEtiqueta, y, { tamano: 9.5, color: TEXTO, alinear: 'derecha', ancho: 140 });
  d.texto(pesos(f.subtotal), xCifra, y, { tamano: 9.5, color: TEXTO, alinear: 'derecha', ancho: 100 });
  y += 16;
  d.texto(`ITBIS (${Math.round(precios.ITBIS * 100)} %)`, xEtiqueta, y, {
    tamano: 9.5, color: TEXTO, alinear: 'derecha', ancho: 140,
  });
  d.texto(pesos(f.itbis), xCifra, y, { tamano: 9.5, color: TEXTO, alinear: 'derecha', ancho: 100 });

  y += 10;
  d.linea(xEtiqueta, y, d.ANCHO - M, y, { color: AZUL, grosor: 1.2 });
  y += 20;
  d.texto('TOTAL', xEtiqueta, y, { tamano: 11, tipo: 'negrita', color: AZUL, alinear: 'derecha', ancho: 140 });
  d.texto(pesos(f.total), xCifra, y, {
    tamano: 15, tipo: 'negrita', color: AZUL, alinear: 'derecha', ancho: 100,
  });

  /* Forma de pago y referencia. */
  y += 36;
  if (f.referencia) {
    d.texto('Referencia del pago', M, y, { tamano: 8, tipo: 'negrita', color: GRIS });
    d.texto(f.referencia, M, y + 14, { tamano: 9.5, color: TEXTO });
  }
  if (f.anula_a_numero) {
    d.texto('Anula el comprobante', M + 220, y, { tamano: 8, tipo: 'negrita', color: GRIS });
    d.texto(f.anula_a_numero, M + 220, y + 14, { tamano: 9.5, tipo: 'negrita', color: AZUL });
  }

  /* Nota legal, al pie. Distinta según el tipo, porque lo que hay que
     advertir es distinto: un recibo no fiscal tiene que decirlo con
     todas las letras. */
  const notas = {
    recibo: 'Este documento es un recibo de pago y NO constituye un comprobante fiscal '
      + 'con valor tributario. Se emite como constancia del pago recibido y del servicio '
      + 'contratado. Si necesita una factura con Número de Comprobante Fiscal, escríbanos '
      + 'a facturacion@mercamaquinarias.com.',
    factura_consumo: 'Comprobante fiscal para consumidor final, válido conforme a las '
      + 'disposiciones de la Dirección General de Impuestos Internos.',
    factura_credito_fiscal: 'Comprobante fiscal con derecho a crédito fiscal, válido conforme '
      + 'a las disposiciones de la Dirección General de Impuestos Internos. Conserve este '
      + 'documento para sus registros contables.',
    nota_credito: 'Nota de crédito emitida para anular total o parcialmente el comprobante '
      + 'que se indica. No sustituye a la devolución del importe, que se tramita por separado.',
  };

  const yNota = d.ALTO - 132;
  d.linea(M, yNota - 16, d.ANCHO - M, yNota - 16, { color: '#ECEAE3' });
  d.parrafo(notas[f.tipo] || '', M, yNota, ANCHO_UTIL, { tamano: 8, color: GRIS, interlinea: 1.5 });

  d.texto(`${emisor.razonSocial} · RNC ${emisor.rnc} · ${emisor.domicilioFiscal}`,
    M, d.ALTO - 52, { tamano: 7.5, color: '#8FA3B3' });
  d.texto('Generado automáticamente por mercamaquinarias.com · No requiere firma ni sello.',
    M, d.ALTO - 40, { tamano: 7.5, color: '#8FA3B3' });

  return d.terminar();
}

/* ── Guardar en disco ───────────────────────────────────── */

/* Por año y mes, con el número de comprobante como nombre. Buscar «la
   factura MM-2026-000123» es entonces buscar un archivo, sin consultar
   nada. */
function guardarPdf(numero, fecha, bytes) {
  const d = new Date(fecha);
  const carpeta = path.join(CARPETA, String(d.getUTCFullYear()),
    String(d.getUTCMonth() + 1).padStart(2, '0'));
  fs.mkdirSync(carpeta, { recursive: true });

  const archivo = path.join(carpeta, `${numero}.pdf`);
  fs.writeFileSync(archivo, bytes);
  return path.relative(CARPETA, archivo).split(path.sep).join('/');
}

const rutaAbsoluta = (relativa) => path.join(CARPETA, relativa);

const leerPdf = (relativa) => {
  /* La ruta viene de la base, no de una petición, pero se comprueba
     igual: el día que alguien añada un parámetro que llegue hasta aquí,
     esta línea es la que evita que se sirva /etc/passwd. */
  const abs = path.resolve(CARPETA, relativa);
  if (!abs.startsWith(path.resolve(CARPETA) + path.sep)) return null;
  try { return fs.readFileSync(abs); } catch { return null; }
};

/* ── Emisión ────────────────────────────────────────────── */

/* Qué tipo de comprobante corresponde, y con qué NCF.
 *
 * Aquí es donde vive la consecuencia de que falte el B02: si el cliente
 * no pide RNC, se intenta la factura de consumo y, al no haber
 * secuencia, se cae al recibo no fiscal. El día que exista, este mismo
 * código emite la factura sin tocar una línea. */
function decidirTipo({ quiereFiscal }) {
  if (quiereFiscal) {
    const ncf = db.tomarNcf('B01');
    if (ncf) return { tipo: 'factura_credito_fiscal', ...ncf };
    /* Sin B01 disponible no se puede prometer crédito fiscal. Se emite
       el recibo y se avisa: es preferible un comprobante honesto que
       una factura sin número autorizado. */
    return { tipo: 'recibo', ncf: null, agotada: 'B01' };
  }

  const ncf = db.tomarNcf('B02');
  if (ncf) return { tipo: 'factura_consumo', ...ncf };
  return { tipo: 'recibo', ncf: null };
}

/* Emite el comprobante de un pago. Devuelve la fila creada.
 *
 * No manda el correo: eso lo hace `enviar()`, aparte, para que un fallo
 * del proveedor de correo no impida que el comprobante quede emitido y
 * guardado. Emitir y notificar son dos cosas distintas y fallan por
 * motivos distintos. */
function emitirPorPago(pago, { concepto, cliente = {}, emisor = correo.EMPRESA }) {
  const yaEsta = db.facturaDePago(pago.id);
  if (yaEsta) return yaEsta;                    // no se emite dos veces

  const decision = decidirTipo({ quiereFiscal: !!cliente.rnc });

  const { id: idFactura, numero } = db.crearFactura({
    pagoId: pago.id,
    organizacionId: pago.organizacion_id,
    tipo: decision.tipo,
    ncf: decision.ncf,
    razonSocial: cliente.razonSocial || null,
    rnc: cliente.rnc || null,
    direccion: cliente.direccion || null,
    concepto,
    subtotal: pago.subtotal,
    itbis: pago.itbis,
    total: pago.total,
    moneda: pago.moneda || 'DOP',
    fecha: pago.creado,
  });

  const fila = db.facturaPorId(idFactura);
  const bytes = dibujar({ ...fila, referencia: pago.referencia }, { emisor });
  const ruta = guardarPdf(numero, fila.fecha, bytes);
  db.anotarPdf(idFactura, ruta);

  return { ...db.facturaPorId(idFactura), agotada: decision.agotada };
}

/* Nota de crédito que anula un comprobante. El original no se toca:
   solo se le anota quién lo anuló. */
function emitirNotaCredito(original, { motivo, emisor = correo.EMPRESA } = {}) {
  if (!original) return null;
  if (original.anulado_por) return db.facturaPorId(original.anulado_por);

  const ncf = db.tomarNcf('B04');

  const { id: idNota, numero } = db.crearFactura({
    pagoId: original.pago_id,
    organizacionId: original.organizacion_id,
    tipo: 'nota_credito',
    ncf: ncf ? ncf.ncf : null,
    razonSocial: original.razon_social,
    rnc: original.rnc,
    direccion: original.direccion,
    concepto: `Anulación de ${original.numero}${motivo ? ` · ${motivo}` : ''}`,
    subtotal: original.subtotal,
    itbis: original.itbis,
    total: original.total,
    moneda: original.moneda,
    anulaA: original.id,
  });

  db.marcarAnulada(original.id, idNota);

  const fila = db.facturaPorId(idNota);
  const bytes = dibujar({ ...fila, anula_a_numero: original.numero }, { emisor });
  db.anotarPdf(idNota, guardarPdf(numero, fila.fecha, bytes));

  return db.facturaPorId(idNota);
}

/* ── Envío ──────────────────────────────────────────────── */

/* Dos correos independientes: al cliente y al buzón de facturación.
 *
 * Cada uno se marca por separado en la base. Si el del cliente rebota
 * —correo mal escrito, buzón lleno— la copia interna tiene que salir
 * igual: es la que hace de archivo. Por eso NO van como un solo mensaje
 * con copia, y por eso el fallo de uno no corta el otro. */
async function enviar(factura, { correoCliente } = {}) {
  const pdfBytes = factura.ruta_pdf ? leerPdf(factura.ruta_pdf) : null;
  const adjunto = pdfBytes
    ? [{ content: pdfBytes.toString('base64'), name: `${factura.numero}.pdf` }]
    : [];

  const titulo = TITULOS[factura.tipo] || 'Comprobante';
  const asunto = `Comprobante ${factura.numero} · MercaMaquinarias`;

  const resumen = [
    `${titulo} ${factura.numero}`,
    factura.ncf ? `NCF: ${factura.ncf}` : 'Documento sin valor fiscal',
    `Fecha: ${fechaLarga(factura.fecha)}`,
    `Cliente: ${factura.razon_social || 'Consumidor final'}`,
    factura.rnc ? `RNC: ${factura.rnc}` : null,
    '',
    `Subtotal:  ${pesos(factura.subtotal)}`,
    `ITBIS:     ${pesos(factura.itbis)}`,
    `Total:     ${pesos(factura.total)}`,
  ].filter((l) => l !== null).join('\n');

  db.sumarIntentoEnvio(factura.id);

  /* Al cliente. */
  if (correoCliente && !factura.enviada_cliente) {
    const r = await correo.enviar({
      para: correoCliente,
      responderA: correo.BUZONES.facturacion,
      asunto,
      texto: [
        'Hola:', '',
        `Adjuntamos el comprobante de su pago.`, '',
        resumen, '',
        'MercaMaquinarias',
      ].join('\n'),
      adjuntos: adjunto,
    });
    if (r && r.entregado) db.marcarEnviada(factura.id, 'cliente');
  }

  /* Al buzón de facturación, SIEMPRE y aparte.
     El asunto lleva número, cliente e importe para que se pueda buscar
     en el buzón sin abrir nada: ese correo es el archivo. */
  if (!factura.enviada_interna) {
    const r = await correo.enviar({
      para: correo.BUZONES.facturacion,
      responderA: correo.BUZONES.facturacion,
      asunto: `Comprobante ${factura.numero} · ${factura.razon_social || 'Consumidor final'} · ${pesos(factura.total)}`,
      texto: resumen,
      adjuntos: adjunto,
    });
    if (r && r.entregado) db.marcarEnviada(factura.id, 'interna');
  }

  return db.facturaPorId(factura.id);
}

/* Secuencias que se están acabando. Lo consulta la tarea diaria. */
function secuenciasBajas() {
  return db.secuenciasNcf()
    .filter((s) => s.activa)
    .map((s) => ({ ...s, umbral: AVISAR_BAJO(s.hasta - s.desde + 1) }))
    .filter((s) => s.quedan <= s.umbral);
}

module.exports = {
  CARPETA, TITULOS,
  dibujar, guardarPdf, leerPdf, rutaAbsoluta,
  emitirPorPago, emitirNotaCredito, enviar, secuenciasBajas, decidirTipo,
};
