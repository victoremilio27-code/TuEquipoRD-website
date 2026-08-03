/* ═══════════════════════════════════════════════════════════
   TuEquipoRD · Entrar, crear cuenta y recuperar la contraseña

   Cinco formularios en la misma pantalla y una sola vista visible a
   la vez. El servidor manda: aquí solo se evita el viaje de ida y
   vuelta cuando el error es evidente y se traduce lo que responde.

   El servidor nunca dice si un correo existe; estas pantallas
   tampoco, ni siquiera cambiando el texto entre un caso y otro.
   ═══════════════════════════════════════════════════════════ */

const VISTAS = ['formEntrar', 'formCrear', 'formCodigo', 'formRecuperar', 'formNuevaClave'];

/* Correo y tipo de la verificación en curso. Vive en memoria: si se
   recarga la página hay que empezar de nuevo, que es lo correcto para
   algo que caduca en diez minutos. */
let pendiente = { correo: '', tipo: 'verificacion' };

const destinoTrasEntrar = () => {
  const pedido = new URLSearchParams(location.search).get('destino');
  return /^[\w-]+\.html$/.test(pedido || '') ? pedido : 'panel.html';
};

function montarCuenta() {
  const el = (id) => document.getElementById(id);
  if (!el('formEntrar')) return;

  const aviso = el('avisoAcceso');
  const pestanas = document.querySelector('.pestanas');

  const mostrarAviso = (texto, clase = '') => {
    aviso.hidden = !texto;
    aviso.className = `acceso__aviso ${clase}`.trim();
    aviso.textContent = texto || '';
  };

  /* Cambia de vista. Las pestañas solo tienen sentido en las dos
     primeras: en medio de una verificación estorban. */
  function vista(cual, { conservarAviso = false } = {}) {
    VISTAS.forEach((v) => { el(v).hidden = v !== cual; });
    pestanas.hidden = !['formEntrar', 'formCrear'].includes(cual);
    el('tabEntrar').classList.toggle('pestanas__op--activa', cual === 'formEntrar');
    el('tabCrear').classList.toggle('pestanas__op--activa', cual === 'formCrear');
    el('tabEntrar').setAttribute('aria-selected', String(cual === 'formEntrar'));
    el('tabCrear').setAttribute('aria-selected', String(cual === 'formCrear'));
    if (!conservarAviso) mostrarAviso('');

    const primero = el(cual).querySelector('input:not([type=hidden]):not([hidden])');
    if (primero && cual !== 'formEntrar') primero.focus();
  }

  el('tabEntrar').addEventListener('click', () => vista('formEntrar'));
  el('tabCrear').addEventListener('click', () => vista('formCrear'));
  el('irRecuperar').addEventListener('click', () => vista('formRecuperar'));
  el('btnCancelarRec').addEventListener('click', () => vista('formEntrar'));
  el('btnVolverAcceso').addEventListener('click', () => vista('formEntrar'));

  if (new URLSearchParams(location.search).get('crear') === '1') vista('formCrear');

  // Los campos de empresa solo existen para la cuenta de dealer.
  const tipo = el('tipoCuenta');
  function pintarTipo() {
    const dealer = (tipo.querySelector('input:checked') || {}).value === 'dealer';
    document.querySelectorAll('.campo-v--empresa').forEach((c) => { c.hidden = !dealer; });
    el('notaRnc').hidden = !dealer;
    el('new-telefono').closest('.campo-v').querySelector('span').textContent =
      dealer ? 'Teléfono principal *' : 'Teléfono';
  }
  tipo.addEventListener('change', pintarTipo);
  pintarTipo();

  // Formato del teléfono y de los códigos mientras se escribe.
  const telefono = el('new-telefono');
  telefono.addEventListener('input', () => {
    const d = telefono.value.replace(/\D/g, '').slice(0, 10);
    telefono.value = d.length <= 3 ? d
      : d.length <= 6 ? `(${d.slice(0, 3)}) ${d.slice(3)}`
        : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  });

  ['cod-codigo', 'nue-codigo'].forEach((idCampo) => {
    const campo = el(idCampo);
    campo.addEventListener('input', () => {
      campo.value = campo.value.replace(/\D/g, '').slice(0, 6);
      // Seis dígitos ya son un código completo: se envía solo, que es
      // lo que espera quien acaba de pegarlo desde el correo.
      if (campo.value.length === 6) campo.form.requestSubmit();
    });
  });

  /* Envío común: bloquea el botón mientras dura. Sin esto, una
     conexión lenta invita a pulsar tres veces y crear tres cuentas. */
  async function enviar(form, ruta, cuerpo, alTerminar) {
    const boton = form.querySelector('button[type="submit"]');
    const rotulo = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Un momento…';
    mostrarAviso('');
    try {
      const datos = await api(ruta, { metodo: 'POST', cuerpo });
      if (!datos) throw new Error('No hay conexión con el servidor. Inténtelo de nuevo.');
      alTerminar(datos);
    } catch (e) {
      mostrarAviso(e.message);
    } finally {
      boton.disabled = false;
      boton.textContent = rotulo;
    }
  }

  /* Una respuesta puede traer sesión abierta o pedir un código; es
     lo único que hay que distinguir. */
  function seguir(datos) {
    if (datos.usuario) { location.href = destinoTrasEntrar(); return; }

    if (datos.verificacion === 'restablecer') {
      pendiente = { correo: datos.correo, tipo: 'restablecer' };
      el('nuevaIntro').textContent = datos.mensaje;
      vista('formNuevaClave');
      return;
    }
    pendiente = { correo: datos.correo, tipo: datos.verificacion || 'verificacion' };
    el('codigoIntro').innerHTML = `${esc(datos.mensaje)} Lo enviamos a <b>${esc(datos.correo)}</b>.`;
    el('cod-codigo').value = '';
    vista('formCodigo');
  }

  // ── Entrar ──
  el('formEntrar').addEventListener('submit', (ev) => {
    ev.preventDefault();
    enviar(el('formEntrar'), '/cuenta/entrar', {
      correo: el('ent-correo').value.trim(),
      clave: el('ent-clave').value,
    }, seguir);
  });

  // ── Crear cuenta ──
  el('formCrear').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const dealer = (tipo.querySelector('input:checked') || {}).value === 'dealer';
    const clave = el('new-clave').value;

    if (clave.length < 10) return mostrarAviso('La contraseña debe tener al menos 10 caracteres.');
    if (dealer) {
      if (el('new-telefono').value.replace(/\D/g, '').length !== 10) {
        return mostrarAviso('Indique el teléfono principal de la empresa, de 10 dígitos.');
      }
      if (el('new-direccion').value.trim().length < 8) {
        return mostrarAviso('Indique la dirección de la oficina principal.');
      }
      if (!el('new-provincia').value) return mostrarAviso('Elija la provincia de la oficina principal.');
    }

    enviar(el('formCrear'), '/cuenta/registro', {
      correo: el('new-correo').value.trim(),
      clave,
      nombre: el('new-nombre').value.trim(),
      telefono: el('new-telefono').value.trim(),
      tipo: dealer ? 'dealer' : 'particular',
      empresa: el('new-empresa').value.trim(),
      rnc: el('new-rnc').value.trim(),
      direccion: el('new-direccion').value.trim(),
      provincia: el('new-provincia').value,
      municipio: el('new-municipio').value.trim(),
    }, seguir);
  });

  // ── Código de verificación o de acceso ──
  el('formCodigo').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const codigo = el('cod-codigo').value.trim();
    if (codigo.length !== 6) return mostrarAviso('El código tiene 6 dígitos.');

    enviar(el('formCodigo'), '/cuenta/verificar', {
      correo: pendiente.correo, tipo: pendiente.tipo, codigo,
    }, seguir);
  });

  el('btnReenviar').addEventListener('click', async () => {
    await api('/cuenta/reenviar', {
      metodo: 'POST', cuerpo: { correo: pendiente.correo, tipo: pendiente.tipo }, silencioso: true,
    });
    el('cod-codigo').value = '';
    mostrarAviso('Le enviamos un código nuevo. El anterior dejó de servir.', 'acceso__aviso--bien');
  });

  // ── Recuperar la contraseña ──
  el('formRecuperar').addEventListener('submit', (ev) => {
    ev.preventDefault();
    enviar(el('formRecuperar'), '/cuenta/recuperar', { correo: el('rec-correo').value.trim() }, seguir);
  });

  el('formNuevaClave').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const codigo = el('nue-codigo').value.trim();
    const clave = el('nue-clave').value;
    if (codigo.length !== 6) return mostrarAviso('El código tiene 6 dígitos.');
    if (clave.length < 10) return mostrarAviso('La contraseña debe tener al menos 10 caracteres.');

    enviar(el('formNuevaClave'), '/cuenta/restablecer', {
      correo: pendiente.correo, codigo, clave,
    }, seguir);
  });

  el('btnReenviarRec').addEventListener('click', async () => {
    await api('/cuenta/reenviar', {
      metodo: 'POST', cuerpo: { correo: pendiente.correo, tipo: 'restablecer' }, silencioso: true,
    });
    el('nue-codigo').value = '';
    mostrarAviso('Le enviamos un código nuevo. El anterior dejó de servir.', 'acceso__aviso--bien');
  });

  // Quien ya entró no tiene nada que hacer aquí.
  cargarSesion().then(() => { if (haySesion()) location.replace(destinoTrasEntrar()); });
}

document.addEventListener('DOMContentLoaded', montarCuenta);
