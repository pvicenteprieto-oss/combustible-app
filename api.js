// ============================================================
//  CONTROL DE COMBUSTIBLE — Apps Script API v5
//  Pegá este código en Extensiones > Apps Script
//  Implementar > Administrar implementaciones > Nueva versión
//
//  Hojas necesarias (creá cada una como pestaña en Sheets):
//  usuarios, camiones, cargas, recargas, ajustes, desvios,
//  sesiones, ordenes, cargas_estacion, calisters,
//  cargas_calister, recargas_calister, config, cisterna
// ============================================================

function doGet(e)  { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const p = e.parameter;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let result;
    switch(p.action) {
      case 'getAll':                result = getAllData(ss); break;
      // Equipos
      case 'addEquipo':             result = addRow(ss, 'camiones', JSON.parse(p.data)); break;
      case 'updateEquipo':          result = updateRow(ss, 'camiones', JSON.parse(p.data)); break;
      case 'deleteEquipo':          result = deleteRow(ss, 'camiones', p.id); break;
      // Cargas cisterna
      case 'addCarga':              result = addRow(ss, 'cargas', JSON.parse(p.data)); break;
      case 'addDesvio':             result = addRow(ss, 'desvios', JSON.parse(p.data)); break;
      // Cisternas
      case 'updateCisterna':        result = updateCisternaLevel(ss, p.id, parseFloat(p.value)); break;
      case 'addRecarga':            result = addRow(ss, 'recargas', JSON.parse(p.data)); break;
      case 'addAjuste':             result = addRow(ss, 'ajustes', JSON.parse(p.data)); break;
      // Calisters
      case 'addCalister':           result = addRow(ss, 'calisters', JSON.parse(p.data)); break;
      case 'updateCalister':        result = updateRow(ss, 'calisters', JSON.parse(p.data)); break;
      case 'addCargaCalister':      result = addRow(ss, 'cargas_calister', JSON.parse(p.data)); break;
      case 'addRecargaCalister':    result = addRow(ss, 'recargas_calister', JSON.parse(p.data)); break;
      // Estación de servicio
      case 'addOrden':              result = addRow(ss, 'ordenes', JSON.parse(p.data)); break;
      case 'updateOrden':           result = updateRow(ss, 'ordenes', JSON.parse(p.data)); break;
      case 'addCargaEstacion':      result = addRow(ss, 'cargas_estacion', JSON.parse(p.data)); break;
      case 'updateCargaEstacion':   result = updateRow(ss, 'cargas_estacion', JSON.parse(p.data)); break;
      // Usuarios y sesiones
      case 'addUsuario':            result = addRow(ss, 'usuarios', JSON.parse(p.data)); break;
      case 'updateUsuario':         result = updateRow(ss, 'usuarios', JSON.parse(p.data)); break;
      case 'deleteUsuario':         result = deleteRow(ss, 'usuarios', p.id); break;
      case 'addSesion':             result = addRow(ss, 'sesiones', JSON.parse(p.data)); break;
      // Config
      case 'saveConfig':            result = saveConfig(ss, JSON.parse(p.data)); break;
      default:                      result = { error: 'Acción desconocida: ' + p.action };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getAllData(ss) {
  const cisternas = getCisternas(ss);
  return {
    usuarios:         sheetToObjects(ss, 'usuarios'),
    camiones:         sheetToObjects(ss, 'camiones'),
    cargas:           sheetToObjects(ss, 'cargas'),
    recargas:         sheetToObjects(ss, 'recargas'),
    ajustes:          sheetToObjects(ss, 'ajustes'),
    desvios:          sheetToObjects(ss, 'desvios'),
    sesiones:         sheetToObjects(ss, 'sesiones'),
    ordenes:          sheetToObjects(ss, 'ordenes'),
    cargas_estacion:  sheetToObjects(ss, 'cargas_estacion'),
    calisters:        sheetToObjects(ss, 'calisters'),
    cargas_calister:  sheetToObjects(ss, 'cargas_calister'),
    recargas_calister:sheetToObjects(ss, 'recargas_calister'),
    cisternas:        cisternas,
    config:           getConfig(ss)
  };
}

function sheetToObjects(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function addRow(ss, name, obj) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return { error: 'Hoja no encontrada: ' + name };
  if (sheet.getLastRow() === 0) sheet.appendRow(Object.keys(obj));
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ''));
  return { ok: true };
}

function updateRow(ss, name, obj) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return { error: 'Hoja no encontrada' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  if (idCol === -1) return { error: 'Columna id no encontrada' };
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(obj.id)) {
      sheet.getRange(i+1,1,1,headers.length).setValues([headers.map(h => obj[h] !== undefined ? obj[h] : data[i][headers.indexOf(h)])]);
      return { ok: true };
    }
  }
  return addRow(ss, name, obj);
}

function deleteRow(ss, name, id) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return { error: 'Hoja no encontrada' };
  const data = sheet.getDataRange().getValues();
  const idCol = data[0].indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) { sheet.deleteRow(i+1); return { ok: true }; }
  }
  return { error: 'No encontrado' };
}

// Cisternas: se guardan en hoja 'cisterna' como registros con id
function getCisternas(ss) {
  const sheet = ss.getSheetByName('cisterna');
  if (!sheet || sheet.getLastRow() < 2) {
    // Valores por defecto si no existe
    return [
      { id:'c1', nombre:'Cisterna 1', combustible:'Diesel común',  capacidad:1500, current:0 },
      { id:'c2', nombre:'Cisterna 2', combustible:'Diesel premium', capacidad:1500, current:0 }
    ];
  }
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h,i) => { obj[h] = row[i]; });
    return obj;
  });
}

function updateCisternaLevel(ss, id, value) {
  const sheet = ss.getSheetByName('cisterna');
  if (!sheet) return { error: 'Hoja cisterna no encontrada' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const curCol = headers.indexOf('current');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.getRange(i+1, curCol+1).setValue(value);
      return { ok: true, current: value };
    }
  }
  return { error: 'Cisterna no encontrada' };
}

function getConfig(ss) {
  const sheet = ss.getSheetByName('config');
  if (!sheet || sheet.getLastRow() < 2)
    return { lowAlertPct:15, tolerance:25, minRecords:3, estacion:'' };
  const data = sheet.getDataRange().getValues();
  const cfg = {};
  data.slice(1).forEach(row => { cfg[row[0]] = row[1]; });
  return cfg;
}

function saveConfig(ss, cfg) {
  let sheet = ss.getSheetByName('config');
  if (!sheet) sheet = ss.insertSheet('config');
  sheet.clearContents();
  sheet.appendRow(['clave','valor']);
  Object.entries(cfg).forEach(([k,v]) => sheet.appendRow([k,v]));
  return { ok: true };
}
