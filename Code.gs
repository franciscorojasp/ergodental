/**
 * ErgoDental Backend - Google Apps Script (Versión Vinculada a ErgoDental_DB)
 * Gestiona el acceso a Google Sheets como base de datos para Ergodental.
 */

// ID extraído de la URL oficial de la base de datos ErgoDental_DB:
// https://docs.google.com/spreadsheets/d/1VRXeKo_3lVmtUBwZoZzumyRQ1pVlP_eapNWUMztqJAs/edit
const SPREADSHEET_ID = '1VRXeKo_3lVmtUBwZoZzumyRQ1pVlP_eapNWUMztqJAs'; 

// Clave de seguridad sincronizada con el frontend web de Vercel
const API_KEY = 'ERGO_SECRET_2024';

function getSheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function doGet(e) {
  const key = e.parameter ? e.parameter.key : null;
  if (key !== API_KEY) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'No autorizado' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = e.parameter ? e.parameter.action : null;
  let data = null;
  if (e.parameter && e.parameter.payload) {
    try {
      data = JSON.parse(e.parameter.payload);
    } catch (err) {
      data = e.parameter.payload;
    }
  }
  return handleAction(action, data);
}

function doPost(e) {
  const key = e.parameter ? e.parameter.key : null;
  if (key !== API_KEY) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'No autorizado' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = e.parameter ? e.parameter.action : null;
  let data = {};
  try {
    data = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (err) {
    data = {};
  }
  return handleAction(action, data);
}

function handleAction(action, data) {
  try {
    let result;
    switch (action) {
      // --- TEST Y DIAGNÓSTICO ---
      case 'ping':
      case 'getPing': {
        const ss = getSheet();
        result = {
          status: 'ok',
          databaseName: ss.getName(),
          databaseId: ss.getId(),
          sheetsCount: ss.getSheets().length,
          timestamp: new Date().toISOString()
        };
        break;
      }

      // --- AUTENTICACIÓN Y GESTIÓN DE USUARIOS ---
      case 'login': 
        result = loginUser(data.email, data.password); 
        break;
      case 'getUsuarios': 
        result = getData('Usuarios'); 
        break;
      case 'createUsuario': 
        result = addData('Usuarios', data); 
        break;
      case 'updateUsuario': 
        result = updateData('Usuarios', data); 
        break;
      case 'deleteUsuario': 
        result = deleteData('Usuarios', data.id || data); 
        break;

      // --- PACIENTES ---
      case 'getPacientes': 
        result = getData('Pacientes'); 
        break;
      case 'createPaciente': 
        result = addData('Pacientes', data); 
        break;
      case 'updatePaciente': 
        result = updateData('Pacientes', data); 
        break;
      case 'deletePaciente': 
        result = deleteData('Pacientes', data.id || data); 
        break;

      // --- PERSONAL Y DOCTORES ---
      case 'getPersonal': 
        result = getData('Personal'); 
        break;
      case 'createPersonal': 
        result = addData('Personal', data); 
        break;
      case 'updatePersonal': 
        result = updateData('Personal', data); 
        break;
      case 'deletePersonal': 
        result = deleteData('Personal', data.id || data); 
        break;

      // --- CITAS MÉDICAS ---
      case 'getCitas': 
        result = getData('Citas'); 
        break;
      case 'createCita': 
        result = addData('Citas', data); 
        break;
      case 'updateCita': 
        result = updateData('Citas', data); 
        break;
      case 'deleteCita': 
        result = deleteData('Citas', data.id || data); 
        break;

      // --- PAGOS Y FACTURACIÓN ---
      case 'getPagos': 
        result = getData('Pagos'); 
        break;
      case 'createPago': 
        result = addData('Pagos', data); 
        break;
      case 'deletePago': 
        result = deleteData('Pagos', data.id || data); 
        break;

      // --- EGRESOS Y GASTOS ---
      case 'getEgresos': 
        result = getData('Egresos'); 
        break;
      case 'createEgreso': 
        result = addData('Egresos', data); 
        break;
      case 'deleteEgreso': 
        result = deleteData('Egresos', data.id || data); 
        break;

      // --- INVENTARIO ---
      case 'getInventario': 
        result = getData('Inventario'); 
        break;
      case 'createItemInventario': 
        result = addData('Inventario', data); 
        break;
      case 'updateItemInventario': 
        result = updateData('Inventario', data); 
        break;
      case 'deleteItemInventario': 
        result = deleteData('Inventario', data.id || data); 
        break;

      // --- PROVEEDORES ---
      case 'getProveedores': 
        result = getData('Proveedores'); 
        break;
      case 'createProveedor': 
        result = addData('Proveedores', data); 
        break;
      case 'updateProveedor': 
        result = updateData('Proveedores', data); 
        break;
      case 'deleteProveedor': 
        result = deleteData('Proveedores', data.id || data); 
        break;

      // --- LABORATORIOS DENTALES ---
      case 'getLaboratorios':
      case 'getLaboratorio': 
        result = getData('Laboratorios'); 
        break;
      case 'createLaboratorio': 
        result = addData('Laboratorios', data); 
        break;
      case 'updateLaboratorio': 
        result = updateData('Laboratorios', data); 
        break;
      case 'deleteLaboratorio': 
        result = deleteData('Laboratorios', data.id || data); 
        break;

      // --- HISTORIA CLÍNICA Y EVOLUCIONES ---
      case 'getEvoluciones':
      case 'getEvolucionClinica': 
        result = getData('EvolucionesClinicas'); 
        break;
      case 'createEvolucion':
      case 'createEvolucionClinica': 
        result = addData('EvolucionesClinicas', data); 
        break;
      case 'updateEvolucionClinica': 
        result = updateData('EvolucionesClinicas', data); 
        break;

      // --- PRESUPUESTOS CLÍNICOS ---
      case 'getPresupuestos': 
        result = getData('Presupuestos'); 
        break;
      case 'createPresupuesto':
        if (data.items && typeof data.items === 'object') data.items = JSON.stringify(data.items);
        result = addData('Presupuestos', data);
        break;
      case 'updatePresupuesto':
        if (data.items && typeof data.items === 'object') data.items = JSON.stringify(data.items);
        result = updateData('Presupuestos', data);
        break;
      case 'deletePresupuesto': 
        result = deleteData('Presupuestos', data.id || data); 
        break;

      // --- RECIBOS Y FACTURAS ---
      case 'getRecibos':
      case 'getFacturas': 
        result = getData('Facturas'); 
        break;
      case 'createRecibo':
      case 'createFactura': 
        result = addData('Facturas', data); 
        break;
      case 'deleteRecibo':
      case 'deleteFactura': 
        result = deleteData('Facturas', data.id || data); 
        break;

      // --- ODONTOGRAMA DENTAL ---
      case 'getOdontograma': 
        result = getData('Odontogramas'); 
        break;
      case 'saveOdontograma':
        if (data.piezas && typeof data.piezas === 'object') data.piezas = JSON.stringify(data.piezas);
        if (data.id) result = updateData('Odontogramas', data);
        else result = addData('Odontogramas', data);
        break;

      // --- TASA CAMBIO Y CONFIGURACIÓN ---
      case 'getTasaHoy': 
        result = getTasaHoy(); 
        break;
      case 'saveTasaHoy': 
        result = saveTasaHoy(data.monto); 
        break;
      case 'getClinica': 
        result = getData('Clinicas'); 
        break;
      case 'createClinica': 
        result = addData('Clinicas', data); 
        break;
      case 'updateClinica': 
        result = updateClinica(data); 
        break;
      case 'logAuditoria': 
        result = logAuditoria(data); 
        break;
      case 'getGlobalCorrelativo': 
        result = getGlobalCorrelativo(); 
        break;

      default: 
        throw new Error('Acción no reconocida: ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── FUNCIONES DE LÓGICA Y SEGURIDAD ─────────────────────────────────────────

function hashPassword(pwd) {
  if (!pwd) return '';
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pwd);
  let hash = '';
  for (let i = 0; i < digest.length; i++) {
    let byte = digest[i];
    if (byte < 0) byte += 256;
    let bStr = byte.toString(16);
    if (bStr.length === 1) bStr = '0' + bStr;
    hash += bStr;
  }
  return hash;
}

function loginUser(email, password) {
  const users = getData('Usuarios');
  const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('Credenciales inválidas');

  const isInactive = user.activo === false || String(user.activo).toLowerCase() === 'false';
  if (isInactive) {
    throw new Error('Tu cuenta está registrada pero aún está pendiente de activación por un Administrador.');
  }

  const inputHash = hashPassword(password);
  const storedPass = user.password;
  const isAlreadyHashed = (typeof storedPass === 'string' && storedPass.length === 64 && /^[0-9a-f]+$/.test(storedPass));

  if (isAlreadyHashed) {
    if (storedPass !== inputHash) throw new Error('Credenciales inválidas');
  } else {
    // Si la contraseña estaba en texto plano, validar y actualizar a hash automáticamente
    if (storedPass !== password) throw new Error('Credenciales inválidas');
    user.password = inputHash;
    updateData('Usuarios', user);
  }

  // Devolver el usuario sin exponer el hash de contraseña
  const { password: _, ...userSafe } = user;
  return userSafe;
}

function sanitizeInput(val) {
  if (typeof val !== 'string') return val;
  if (val.startsWith('=') || val.startsWith('+') || val.startsWith('-') || val.startsWith('@')) {
    return "'" + val;
  }
  return val;
}

function getData(sheetName) {
  const ss = getSheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function addData(sheetName, obj) {
  const ss = getSheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('No se encontró la pestaña: ' + sheetName);

  if (!obj.id) obj.id = 'ID-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  obj.lastUpdated = new Date().getTime();

  // Si es un usuario y viene contraseña en texto plano, calcular su hash
  if (sheetName === 'Usuarios' && obj.password) {
    const isAlreadyHashed = (typeof obj.password === 'string' && obj.password.length === 64 && /^[0-9a-f]+$/.test(obj.password));
    if (!isAlreadyHashed) {
      obj.password = hashPassword(obj.password);
    }
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = headers.map(h => {
    let val = sanitizeInput(obj[h]);
    return val !== undefined ? val : '';
  });
  sheet.appendRow(newRow);
  return obj;
}

function updateData(sheetName, obj) {
  const ss = getSheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('No se encontró la pestaña: ' + sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  const timeIndex = headers.indexOf('lastUpdated');

  if (idIndex === -1) throw new Error('La pestaña no tiene columna "id"');

  // Si se está actualizando la contraseña de un usuario en texto plano
  if (sheetName === 'Usuarios' && obj.password) {
    const isAlreadyHashed = (typeof obj.password === 'string' && obj.password.length === 64 && /^[0-9a-f]+$/.test(obj.password));
    if (!isAlreadyHashed) {
      obj.password = hashPassword(obj.password);
    }
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] == obj.id) {
      obj.lastUpdated = new Date().getTime();

      const rowRange = sheet.getRange(i + 1, 1, 1, headers.length);
      const updatedRow = headers.map(h => {
        let val = sanitizeInput(obj[h]);
        return val !== undefined ? val : data[i][headers.indexOf(h)];
      });
      rowRange.setValues([updatedRow]);
      return obj;
    }
  }
  throw new Error('No se encontró el registro con ID: ' + obj.id);
}

function deleteData(sheetName, id) {
  const ss = getSheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('No se encontró la pestaña: ' + sheetName);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const data = allData.slice(1);
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) throw new Error('La pestaña no tiene columna "id"');

  for (let i = 0; i < data.length; i++) {
    if (data[i][idIndex] == id) {
      sheet.deleteRow(i + 2);
      return { success: true, id: id };
    }
  }
  throw new Error('Registro no encontrado para eliminar con ID: ' + id);
}

function getTasaHoy() {
  const config = getData('Configuracion');
  const tasaRow = config.find(c => c.clave === 'tasa_bcv');
  return { tasa: tasaRow ? parseFloat(tasaRow.valor) : 0 };
}

function saveTasaHoy(monto) {
  const ss = getSheet();
  const sheet = ss.getSheetByName('Configuracion');
  if (!sheet) throw new Error('No se encontró la pestaña Configuracion');
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === 'tasa_bcv') {
      sheet.getRange(i + 1, 2).setValue(monto);
      return { success: true };
    }
  }
  sheet.appendRow(['tasa_bcv', monto]);
  return { success: true };
}

function updateClinica(clinica) {
  return clinica;
}

function logAuditoria(data) {
  const ss = getSheet();
  let sheet = ss.getSheetByName('Auditoria');
  if (!sheet) {
    sheet = ss.insertSheet('Auditoria');
    sheet.appendRow(['id', 'fecha', 'usuario', 'accion', 'detalle', 'documentoId']);
  }
  const id = 'AUD-' + Date.now();
  sheet.appendRow([id, new Date().toISOString(), data.usuario || 'Sistema', data.accion, data.detalle, data.documentoId || '']);
  return { success: true };
}

function getGlobalCorrelativo() {
  const ss = getSheet();
  let sheet = ss.getSheetByName('Configuracion');
  if (!sheet) {
    sheet = ss.insertSheet('Configuracion');
    sheet.appendRow(['clave', 'valor']);
  }
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  let currentVal = 1000;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'correlativo_global') {
      rowIndex = i + 1;
      currentVal = parseInt(data[i][1], 10) || 1000;
      break;
    }
  }

  currentVal++;
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 2).setValue(currentVal);
  } else {
    sheet.appendRow(['correlativo_global', currentVal]);
  }

  const code = currentVal.toString().padStart(6, '0');
  return { correlativo: 'DOC-' + code };
}

// ─── INICIALIZACIÓN DE TODAS LAS PESTAÑAS ────────────────────────────────────
function setupDatabase() {
  const ss = getSheet();
  const sheetsConfig = [
    { name: 'Usuarios', headers: ['id', 'nombre', 'email', 'rol', 'activo', 'clinicaId', 'permisosMultiClinica', 'password', 'lastUpdated'] },
    { name: 'Pacientes', headers: ['id', 'clinicaId', 'nombre', 'apellido', 'cedula', 'fechaNacimiento', 'telefono', 'email', 'direccion', 'fechaRegistro', 'tipoReferencia', 'referidorNombre', 'referidorContacto', 'alergias', 'alergiasDetalle', 'lastUpdated'] },
    { name: 'Personal', headers: ['id', 'clinicaId', 'nombre', 'apellido', 'tipo', 'especialidad', 'matricula', 'turno', 'telefono', 'email', 'activo', 'foto', 'lastUpdated'] },
    { name: 'Citas', headers: ['id', 'clinicaId', 'pacienteId', 'pacienteNombre', 'doctorId', 'doctorNombre', 'fecha', 'hora', 'motivo', 'estado', 'tipoAtencion', 'condicion', 'estadoFinanciero', 'tipoReferencia', 'referidorNombre', 'referidorContacto', 'lastUpdated'] },
    { name: 'Pagos', headers: ['id', 'clinicaId', 'pacienteId', 'pacienteNombre', 'citaId', 'concepto', 'monto', 'montoBs', 'tasaCambio', 'metodoPago', 'tipoPago', 'diasCredito', 'fechaVencimiento', 'fecha', 'estado', 'notas', 'moneda', 'referencia', 'tipoReferencia', 'referidorNombre', 'doctorId', 'doctorNombre', 'bancoEmisor', 'numeroReferencia', 'telefonoOrigen', 'comprobante', 'lastUpdated'] },
    { name: 'Egresos', headers: ['id', 'clinicaId', 'concepto', 'categoria', 'monto', 'montoBs', 'tasaCambio', 'metodoPago', 'proveedorId', 'proveedorNombre', 'fecha', 'notas', 'lastUpdated'] },
    { name: 'Inventario', headers: ['id', 'clinicaId', 'nombre', 'categoria', 'stock', 'stockMinimo', 'unidad', 'precio', 'lastUpdated'] },
    { name: 'Proveedores', headers: ['id', 'clinicaId', 'nombre', 'tipo', 'rif', 'telefono', 'email', 'contacto', 'direccion', 'activo', 'lastUpdated'] },
    { name: 'Odontogramas', headers: ['id', 'pacienteId', 'datos', 'fecha', 'lastUpdated'] },
    { name: 'Presupuestos', headers: ['id', 'clinicaId', 'pacienteId', 'pacienteNombre', 'items', 'total', 'estado', 'fecha', 'notas', 'lastUpdated'] },
    { name: 'Facturas', headers: ['id', 'presupuestoId', 'pacienteId', 'pacienteNombre', 'clinicaId', 'monto', 'metodoPago', 'fecha', 'nroRecibo', 'lastUpdated'] },
    { name: 'EvolucionesClinicas', headers: ['id', 'clinicaId', 'pacienteId', 'fecha', 'doctorNombre', 'procedimiento', 'notas', 'materiales', 'lastUpdated'] },
    { name: 'Laboratorios', headers: ['id', 'clinicaId', 'pacienteId', 'pacienteNombre', 'trabajo', 'laboratorioNombre', 'fechaEnvio', 'fechaEntregaPrevista', 'estado', 'costo', 'lastUpdated'] },
    { name: 'Clinicas', headers: ['id', 'nombre', 'nombreCorto', 'razonSocial', 'rif', 'direccion', 'telefonos', 'correos', 'instagram', 'logoUrl', 'lastUpdated'] },
    { name: 'Configuracion', headers: ['clave', 'valor'] }
  ];

  sheetsConfig.forEach(config => {
    let sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
      sheet.appendRow(config.headers);
      sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    } else {
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(config.headers);
        sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold').setBackground('#f3f3f3');
      }
    }
  });

  const defaultSheet = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  // Usuario administrador por defecto si no existe
  const usuariosSheet = ss.getSheetByName('Usuarios');
  if (usuariosSheet.getLastRow() <= 1) {
    const pwdHash = hashPassword('Ergodentalve2024!');
    usuariosSheet.appendRow(['u1', 'Administrador', 'admin@ergodentalve.com', 'ADMIN', true, 'consolidado', true, pwdHash, new Date().getTime()]);
  }

  SpreadsheetApp.getUi().alert('¡Base de datos Ergodental configurada con éxito!');
}
