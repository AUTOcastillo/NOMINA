/**
 * Base de datos de la Nómina Semanal — Autoservicio Castillo
 * ----------------------------------------------------------
 * Este script se pega en una Hoja de Google (Extensiones → Apps Script)
 * y se publica como "Aplicación web". La app (index.html) le envía y le
 * pide los datos. Todo queda guardado en 3 pestañas de la hoja:
 *   Empleados · Dias · Semanas
 *
 * IMPORTANTE: cambia la clave de abajo por una tuya. Es la misma que vas
 * a escribir en la app (Ajustes → Base de datos). Sin ella nadie puede
 * leer ni modificar la nómina aunque tenga el enlace.
 */
const CLAVE = 'CAMBIA-ESTA-CLAVE';

const N_EMPLEADOS = 3;
const HOJAS = {
  Empleados: ['Empleado', 'Nombre', 'Normal', 'Hasta 9 pm', 'Corrido', 'Actualizado'],
  Dias:      ['Empleado', 'Nombre', 'Fecha', 'Día', 'Tipo', 'Jornada', 'Valor', 'Actualizado'],
  Semanas:   ['Empleado', 'Nombre', 'Semana (lunes)', 'Pagada', 'Fecha de pago', 'Adelanto', 'Nota', 'Actualizado'],
};
// Columnas de fecha que se guardan como texto (AAAA-MM-DD) para que Sheets no las convierta.
const COLS_TEXTO = { Empleados: [], Dias: [3], Semanas: [3, 5] };
const JORNADAS = { normal: 'Normal', largo: 'Hasta 9 pm', corrido: 'Corrido' };
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const TARIFAS = { normal: 60000, largo: 70000, corrido: 80000 };

/** Ejecuta esta función una vez desde el editor para crear las pestañas y dar permisos. */
function inicializar() {
  Object.keys(HOJAS).forEach(hoja);
  Logger.log('Listo: pestañas Empleados, Dias y Semanas creadas.');
}

function doGet() {
  return json({ ok: true, mensaje: 'Base de datos de nómina activa.' });
}

function doPost(e) {
  let cuerpo;
  try { cuerpo = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'Solicitud inválida' }); }
  if (!cuerpo || cuerpo.clave !== CLAVE) return json({ ok: false, error: 'Clave incorrecta' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const db = cargar();
    if (cuerpo.accion === 'leer') return json({ ok: true, ...aObjeto(db) });
    (cuerpo.cambios || []).forEach(c => aplicar(db, c));
    escribir(db);
    return json({ ok: true, aplicados: (cuerpo.cambios || []).length });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- tablas

function hoja(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, HOJAS[nombre].length).setValues([HOJAS[nombre]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Lee las 3 pestañas a memoria. */
function cargar() {
  const db = {};
  Object.keys(HOJAS).forEach(nombre => {
    const sh = hoja(nombre), n = HOJAS[nombre].length, filas = sh.getLastRow() - 1;
    db[nombre] = filas > 0 ? sh.getRange(2, 1, filas, n).getValues().filter(f => f[0] !== '' && f[0] !== null) : [];
  });
  return db;
}

/** Reescribe las 3 pestañas, ordenadas por empleado y fecha. */
function escribir(db) {
  Object.keys(HOJAS).forEach(nombre => {
    const sh = hoja(nombre), n = HOJAS[nombre].length;
    const filas = db[nombre].slice().sort((a, b) =>
      (Number(a[0]) - Number(b[0])) || String(texto(a[2])).localeCompare(String(texto(b[2]))));
    const viejas = sh.getLastRow() - 1;
    if (viejas > 0) sh.getRange(2, 1, viejas, n).clearContent();
    if (!filas.length) return;
    COLS_TEXTO[nombre].forEach(c => sh.getRange(2, c, filas.length, 1).setNumberFormat('@'));
    sh.getRange(2, 1, filas.length, n).setValues(filas);
  });
}

// ---------------------------------------------------------------- cambios

function aplicar(db, c) {
  const ahora = new Date();
  const emp = Number(c.emp) + 1;                    // en la hoja: 1, 2, 3
  if (c.t === 'todo') {                             // reemplazar todo (restaurar copia / primera subida)
    db.Empleados = []; db.Dias = []; db.Semanas = [];
    (c.empleados || []).slice(0, N_EMPLEADOS).forEach((e, i) => {
      aplicar(db, { t: 'empleado', emp: i, nombre: e.config && e.config.empleado, tarifas: e.config && e.config.tarifas });
      Object.keys(e.dias || {}).forEach(f => aplicar(db, { t: 'dia', emp: i, fecha: f, ...e.dias[f] }));
      Object.keys(e.semanas || {}).forEach(l => aplicar(db, { t: 'semana', emp: i, lunes: l, ...e.semanas[l] }));
    });
    return;
  }
  if (c.t === 'empleado') {
    const t = Object.assign({}, TARIFAS, c.tarifas || {});
    upsert(db.Empleados, f => Number(f[0]) === emp, [emp, c.nombre || '', t.normal, t.largo, t.corrido, ahora]);
    // Actualiza el nombre en las otras pestañas para que la hoja se lea fácil.
    db.Dias.concat(db.Semanas).forEach(f => { if (Number(f[0]) === emp) f[1] = c.nombre || ''; });
    return;
  }
  const nombre = nombreDe(db, emp);
  if (c.t === 'dia') {
    const igual = f => Number(f[0]) === emp && texto(f[2]) === c.fecha;
    if (!c.tipo || !JORNADAS[c.tipo]) { borrar(db.Dias, igual); return; }
    const dia = DIAS[new Date(c.fecha + 'T12:00:00').getDay()];
    upsert(db.Dias, igual, [emp, nombre, c.fecha, dia, c.tipo, JORNADAS[c.tipo], Number(c.valor) || 0, ahora]);
    return;
  }
  if (c.t === 'semana') {
    const igual = f => Number(f[0]) === emp && texto(f[2]) === c.lunes;
    if (!c.pagada && !Number(c.adelanto) && !c.nota) { borrar(db.Semanas, igual); return; }
    upsert(db.Semanas, igual, [emp, nombre, c.lunes, c.pagada ? 'Sí' : 'No', c.fechaPago || '',
      Number(c.adelanto) || 0, c.nota || '', ahora]);
    return;
  }
  if (c.t === 'borrarHistorial') {
    db.Dias = db.Dias.filter(f => Number(f[0]) !== emp);
    db.Semanas = db.Semanas.filter(f => Number(f[0]) !== emp);
  }
}

function upsert(tabla, igual, fila) {
  const i = tabla.findIndex(igual);
  if (i >= 0) tabla[i] = fila; else tabla.push(fila);
}
function borrar(tabla, igual) {
  for (let i = tabla.length - 1; i >= 0; i--) if (igual(tabla[i])) tabla.splice(i, 1);
}
function nombreDe(db, emp) {
  const f = db.Empleados.find(f => Number(f[0]) === emp);
  return f ? f[1] : '';
}

// ---------------------------------------------------------------- lectura

/** Convierte las pestañas al formato que usa la app. */
function aObjeto(db) {
  const empleados = [];
  for (let i = 0; i < N_EMPLEADOS; i++)
    empleados.push({ config: { empleado: '', tarifas: Object.assign({}, TARIFAS) }, dias: {}, semanas: {} });
  const idx = v => Number(v) - 1;
  db.Empleados.forEach(f => {
    const e = empleados[idx(f[0])]; if (!e) return;
    e.config = { empleado: String(f[1] || ''), tarifas: { normal: Number(f[2]) || TARIFAS.normal, largo: Number(f[3]) || TARIFAS.largo, corrido: Number(f[4]) || TARIFAS.corrido } };
  });
  db.Dias.forEach(f => {
    const e = empleados[idx(f[0])]; if (!e || !JORNADAS[f[4]]) return;
    e.dias[texto(f[2])] = { tipo: String(f[4]), valor: Number(f[6]) || 0 };
  });
  db.Semanas.forEach(f => {
    const e = empleados[idx(f[0])]; if (!e) return;
    e.semanas[texto(f[2])] = { pagada: f[3] === 'Sí' || f[3] === true, fechaPago: texto(f[4]) || null,
      adelanto: Number(f[5]) || 0, nota: String(f[6] || '') };
  });
  const vacia = !db.Empleados.length && !db.Dias.length && !db.Semanas.length;
  return { vacia, empleados };
}

function texto(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v).trim();
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
