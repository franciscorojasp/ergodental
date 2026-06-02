// src/api.ts
// Capa de acceso a datos.
import { supabase as realSupabase, IS_SUPABASE_CONNECTED } from './lib/supabase';
import { VITE_USE_GOOGLE_SHEETS, googleSheetsApi, googleSheetsRequest } from './lib/googleSheets';

export const supabase = VITE_USE_GOOGLE_SHEETS ? {
  ...googleSheetsApi,
  auth: realSupabase ? realSupabase.auth : {} as any
} as any : realSupabase;

export const IS_DEMO_EMAILS = ['demo@ergodentalve.com']; // Only use a specific non-production email for demo

// Helper para detectar si estamos en modo Demo (por falta de conexión o por usuario Demo actualmente guardado)
export const isDemoSession = () => {
  if (!IS_SUPABASE_CONNECTED) return true;
  const saved = localStorage.getItem('ergo_user');
  if (saved) {
    try {
      const u = JSON.parse(saved);
      // Francisco y Admins SUPER_ADMINS nunca son demo si hay conexión
      const SUPER_ADMINS = ['francisco.rojasp@gmail.com', 'blascojennifer47@gmail.com', 'vera.hugo712@gmail.com', 'carlosalejandroverablasco183@gmail.com'];
      if (SUPER_ADMINS.includes(u.email?.toLowerCase())) return false;
      
      const DEMO_EMAILS = [
        'demo@ergodentalve.com',
        'admin@ergodentalve.com',
        'doctor@ergodentalve.com',
        'asistente@ergodentalve.com',
        'recepcion@ergodentalve.com',
        'pro@ergodentalve.com'
      ];
      return DEMO_EMAILS.includes(u.email?.toLowerCase());
    } catch { return false; }
  }
  return false;
};

// ─── HELPERS DE TRATAMIENTO DE DATOS ───────────────────────────────────────
export const isValidUUID = (id: any): boolean => {
  if (typeof id !== 'string') return false;
  const looseUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return looseUuidRegex.test(id);
};

export const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const UUID_KEYS = ['paciente_id', 'doctor_id', 'cita_id', 'proveedor_id', 'presupuesto_id'];

export function sanitizeData(payload: any): any {
  if (Array.isArray(payload)) return payload.map(sanitizeData);
  if (payload !== null && typeof payload === 'object') {
    const next: any = {};
    for (const k in payload) {
      const v = payload[k];
      // Sanitizar UUIDs no válidos a null para evitar crash en Postgres
      if (UUID_KEYS.includes(k) && v !== null && !isValidUUID(v)) {
        next[k] = null;
      } else if (v === "" || v === undefined) {
        next[k] = null;
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        next[k] = sanitizeData(v);
      } else {
        next[k] = v;
      }
    }
    return next;
  }
  return payload;
}

// Mantenemos la constante para compatibilidad, pero ahora es dinámica
export const IS_DEMO_MODE = !IS_SUPABASE_CONNECTED;

export function getSyncQueueCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const q = JSON.parse(localStorage.getItem('ergo_sync_queue') || '[]');
    return q.length;
  } catch { return 0; }
}

export function forceSync(): Promise<void> {
  return processSyncQueue();
}

// --- PERSISTENCIA LOCAL PARA DATOS DEMO (SITIOS SIN SUPABASE CONFIGURADO) ---
const getDemoStore = <T>(key: string, initial: T[]): T[] => {
  if (typeof window === 'undefined') return initial;
  const saved = localStorage.getItem(`ergo_v1_${key}`);
  return saved ? JSON.parse(saved) : initial;
};

const saveDemoStore = (key: string, data: any[]) => {
  if (typeof window !== 'undefined') localStorage.setItem(`ergo_v1_${key}`, JSON.stringify(data));
};

// ─── MOTOR DE SINCRONIZACIÓN OFFLINE (SYNC QUEUE) ─────────────────────────

export interface SyncAction {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
  payload: any;
  timestamp: number;
  retries?: number;
}

function isMissingColumnError(err: any): boolean {
  if (!err) return false;
  const code = err.code;
  if (code === 'PGRST204' || code === '42703') return true;
  
  const msg = (err.message || String(err)).toLowerCase();
  if (
    msg.includes('column') && 
    (msg.includes('does not exist') || msg.includes('could not find'))
  ) {
    return true;
  }
  return false;
}

function extractMissingColumn(error: any): string | null {
  if (!error) return null;
  const msg = error.message || String(error);
  
  const match1 = msg.match(/Could not find the '([^']+)' column/i);
  if (match1) return match1[1];
  
  const match2 = msg.match(/column "([^"]+)"/i);
  if (match2) return match2[1];

  const match3 = msg.match(/column ([a-zA-Z0-9_]+) does not exist/i);
  if (match3) return match3[1];
  
  return null;
}

// Determina si un error es permanente/irrecuperable en lugar de transitorio de conexión
function isPermanentError(err: any): boolean {
  if (!err) return false;
  
  // Códigos de error de PostgreSQL/PostgREST conocidos que son permanentes
  // PGRSTxxx: PostgREST Syntax/Schema Errors
  // 42501: RLS Violation (Sin permisos)
  // 23505: Unique Violation
  // 23503: Foreign Key Violation
  // 23502: Not Null Violation
  // 22P02: Invalid Text Representation
  // 22001: String Data Right Truncation
  const code = err.code;
  if (code && typeof code === 'string') {
    if (
      code.startsWith('23') || 
      code.startsWith('42') || 
      code.startsWith('22') || 
      code.startsWith('PGRST')
    ) {
      return true;
    }
  }

  // Estatus HTTP que representan fallas definitivas de acceso o de sintaxis cliente
  const status = err.status || err.statusCode;
  if (status && [400, 401, 403, 409].includes(status)) {
    return true;
  }

  // Análisis robusto de mensajes comunes irrecuperables
  const msg = (err.message || String(err)).toLowerCase();
  if (
    msg.includes('schema cache') ||
    msg.includes('column of') ||
    msg.includes('does not exist') ||
    msg.includes('row-level security') ||
    msg.includes('violates unique constraint') ||
    msg.includes('violates foreign key')
  ) {
    return true;
  }

  return false;
}

// Guarda los fallos irrecuperables en un histórico local de fallas para depuración
function archiveFailedSyncAction(item: SyncAction, error: any) {
  if (typeof window === 'undefined') return;
  try {
    const failedList: any[] = JSON.parse(localStorage.getItem('ergo_sync_failed') || '[]');
    failedList.push({
      ...item,
      failed_at: Date.now(),
      error: {
        message: error?.message || String(error),
        code: error?.code,
        status: error?.status || error?.statusCode
      }
    });
    // Mantener un historial acotado a 50 elementos
    if (failedList.length > 50) {
      failedList.shift();
    }
    localStorage.setItem('ergo_sync_failed', JSON.stringify(failedList));
    console.warn(`⚠️ Elemento descartado y archivado en fallos (Tabla: ${item.table}):`, error);
  } catch (e) {
    console.error('Error guardando en ergo_sync_failed:', e);
  }
}

export function saveToSyncQueue(action: Omit<SyncAction, 'id' | 'timestamp'>) {
  if (typeof window === 'undefined') return;
  const queue: SyncAction[] = JSON.parse(localStorage.getItem('ergo_sync_queue') || '[]');
  queue.push({
    ...action,
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
    timestamp: Date.now()
  });
  localStorage.setItem('ergo_sync_queue', JSON.stringify(queue));
  console.log('📦 Guardado en Cola Offline:', action.table);
}

let isSyncing = false;

export async function processSyncQueue() {
  if (isSyncing || !IS_SUPABASE_CONNECTED || typeof window === 'undefined' || !navigator.onLine) return;
  
  const queue: SyncAction[] = JSON.parse(localStorage.getItem('ergo_sync_queue') || '[]');
  if (queue.length === 0) return;

  isSyncing = true;
  console.log(`🔄 Procesando ${queue.length} elementos de la cola de sincronización...`);
  const remainingQueue: SyncAction[] = [];
  
  for (const item of queue) {
    let success = false;
    let attempt = 0;
    const maxAttempts = 15;
    
    while (attempt < maxAttempts && !success) {
      try {
        // ─── GOBERNANZA DE DATOS PROACTIVA (REPARADOR v2.0) ────────────
        // Este bloque actúa como un normalizador de esquema para tablas especiales.
        
        // 1. Odontogramas: Asegurar Verdad de Producción (columna 'datos')
        if (item.table === 'odontogramas') {
          if ((item.payload.data || item.payload.piezas) && !item.payload.datos) {
            item.payload.datos = item.payload.piezas || item.payload.data;
          }
          // Eliminamos campos temporales de UI o incompatibles
          delete item.payload.id; 
          delete item.payload.data;
          delete item.payload.piezas;
          delete item.payload.last_updated;
        }
        // ─────────────────────────────────────────────────────────────

        let operation;
        if (item.table === 'odontogramas') {
          operation = supabase.from('odontogramas').upsert(item.payload, { onConflict: 'paciente_id' });
        } else if (item.action === 'INSERT') {
          operation = supabase.from(item.table).insert(item.payload);
        } else if (item.action === 'UPDATE') {
          const { id, ...rest } = item.payload;
          if (!id) throw new Error('Missing ID for update');
          operation = supabase.from(item.table).update(rest).eq('id', id);
        } else if (item.action === 'UPSERT') {
          operation = supabase.from(item.table).upsert(item.payload, { onConflict: 'id' });
        } else if (item.action === 'DELETE') {
          operation = supabase.from(item.table).delete().eq('id', item.payload.id);
        } else {
          throw new Error('Action not supported');
        }

        const { error } = await operation;
        if (error) throw error;
        
        success = true;
        console.log(`✅ Sincronizado correcto: ${item.table} (${item.action})`);
      } catch (err: any) {
        const isMissingCol = isMissingColumnError(err);
        if (isMissingCol) {
          const missingCol = extractMissingColumn(err);
          if (missingCol && item.payload && typeof item.payload === 'object') {
            console.warn(`🧹 [SyncQueue] Detectada columna faltante '${missingCol}' en tabla '${item.table}'. Sanitizando payload y reintentando...`);
            delete item.payload[missingCol];
            const camelCol = missingCol.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
            const snakeCol = missingCol.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            delete item.payload[camelCol];
            delete item.payload[snakeCol];
            
            attempt++;
            continue; // Reintentar la operación inmediatamente con el payload sanitizado
          }
        }

        console.error(`❌ Error sincronizando item en ${item.table}:`, err);
        localStorage.setItem('ergo_last_sync_error', err?.message || JSON.stringify(err));
        
        const currentRetries = (item.retries || 0) + 1;
        const isPermanent = isPermanentError(err);
        
        if (isPermanent || currentRetries >= 5) {
          archiveFailedSyncAction(item, err);
        } else {
          remainingQueue.push({
            ...item,
            retries: currentRetries
          });
        }
        break; // Detener reintentos para este elemento si no es recuperable o ya falló
      } 
    }
  }
  
  localStorage.setItem('ergo_sync_queue', JSON.stringify(remainingQueue));
  isSyncing = false;
  
  // Despachar evento para que SyncIndicator se actualice inmediatamente
  window.dispatchEvent(new Event('ergo_sync_completed'));
}

// Escuchar cuando vuelva el internet para disparar la sincronización
if (typeof window !== 'undefined') {
  window.addEventListener('online', processSyncQueue);
  // Latido cada 30 segundos para asegurar sincronización en segundo plano (Primer Mundo)
  setInterval(() => {
    if (navigator.onLine) processSyncQueue();
  }, 30000);
}


// Wrapper genérico para soporte Offline-First
export async function withOfflineSync<T>(
  operation: () => Promise<{ data: any, error: any }>,
  table: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT',
  payload: any,
  optimisticData: T
): Promise<T> {
  const isTargetOffline = typeof window === 'undefined' || !navigator.onLine;
  
  if (isTargetOffline || !IS_SUPABASE_CONNECTED) {
    if (typeof window !== 'undefined') saveToSyncQueue({ table, action, payload });
    return optimisticData;
  }

  let attempt = 0;
  const maxAttempts = 15;
  while (attempt < maxAttempts) {
    try {
      const res = await operation();
      if (res.error) throw res.error;
      if (res.data) return mapKeys(res.data, toCamel) as T;
      return optimisticData;
    } catch (err: any) {
      console.warn(`⚠️ Fallo en operación Supabase (${table}) [intento ${attempt + 1}]:`, err.message || err);
      
      const isMissingCol = isMissingColumnError(err);
      if (isMissingCol) {
        const missingCol = extractMissingColumn(err);
        if (missingCol && payload && typeof payload === 'object') {
          console.warn(`🧹 Detectada columna faltante '${missingCol}' en tabla '${table}'. Sanitizando payload y reintentando...`);
          delete payload[missingCol];
          const camelCol = missingCol.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
          const snakeCol = missingCol.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          delete payload[camelCol];
          delete payload[snakeCol];
          
          attempt++;
          continue; // Reintentar la operación con el payload sanitizado
        }
      }

      if (typeof window !== 'undefined') saveToSyncQueue({ table, action, payload });
      return optimisticData;
    }
  }

  if (typeof window !== 'undefined') saveToSyncQueue({ table, action, payload });
  return optimisticData;
}
// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Rol = 'ADMIN' | 'DOCTOR' | 'ASISTENTE' | 'RECEPCION';

export interface Clinica {
  id: string;
  nombre: string;
  nombreCorto: string;
  razonSocial?: string;
  rif?: string;
  direccion?: string;
  telefonos?: string[];
  correos?: string[];
  instagram?: string;
  logoUrl?: string;
}

export const CLINICAS: Clinica[] = [
  {
    id: 'consolidado',
    nombre: 'Consolidado Global',
    nombreCorto: 'Global',
    razonSocial: 'Múltiples Clínicas',
    rif: 'N/A',
    direccion: 'Multisede',
    telefonos: [],
    correos: [],
    instagram: '',
  },
  { 
    id: 'la-vina', 
    nombre: 'Clínica Odontológica La Viña', 
    nombreCorto: 'La Viña',
    razonSocial: 'Inversiones La Viña C.A.',
    rif: 'J-12345678-9',
    direccion: 'Av. Bolívar Norte, C.C. La Viña Plaza, Piso 2, Valencia',
    telefonos: ['0241-8251122', '0412-1234567'],
    correos: ['contacto@lavina.com', 'administracion@lavina.com'],
    instagram: '@lavinaodontologia',
    logoUrl: 'https://placehold.co/200x200/00c6ff/ffffff?text=La+Viña'
  },
  { 
    id: 'alianza', 
    nombre: 'Alianza Dental Care', 
    nombreCorto: 'Alianza',
    razonSocial: 'Servicios Alianza Dental S.A.',
    rif: 'J-98765432-1',
    direccion: 'Urb. El Viñedo, Calle 139, Edif. Alianza, Valencia',
    telefonos: ['0241-8215566'],
    correos: ['info@alianzadental.com'],
    instagram: '@alianzadental',
    logoUrl: 'https://placehold.co/200x200/7b61ff/ffffff?text=Alianza'
  },
];

export const BANCOS_VE = [
  'Banesco', 'Banco de Venezuela', 'Mercantil', 'BBVA Provincial', 'BNC', 'Banplus', 'Bancamiga',
  'Banco del Tesoro', 'Bicentenario', 'Exterior', 'BFC', 'Sofitasa', 'Bancrecer', 'Plaza', 'Otros'
];

export type TipoAtencion = 'Consulta' | 'Emergencia' | 'Revisión' | 'Tratamiento';
export type CondicionPaciente = 'Control' | 'Evaluación' | 'Emergencia';
export type EstadoFinanciero = 'Abono' | 'Exonerado' | 'Garantía' | 'Paciente No Atendido' | 'Paga Después' | 'Pago Anticipado' | 'Pago Inmediato';

// ─── Sistema de Referencias y Comisiones ─────────────────────────────────────

export type TipoReferencia =
  | 'Profesional-Especialista'
  | 'Paciente-Clinica'
  | 'Foraneo-30'
  | 'Foraneo-10';

export interface ReglaReferencia {
  tipo: TipoReferencia;
  label: string;
  descripcion: string;
  pctClinica: number;
  pctForaneo: number;
  pctProfesional: number;
}

export const TABLA_REFERENCIAS: ReglaReferencia[] = [
  {
    tipo: 'Profesional-Especialista',
    label: 'Profesional – Especialista',
    descripcion: 'Profesional y/o especialista trae paciente',
    pctClinica: 30, pctForaneo: 0, pctProfesional: 70,
  },
  {
    tipo: 'Paciente-Clinica',
    label: 'Paciente de la Clínica',
    descripcion: 'Clínica pone el paciente',
    pctClinica: 40, pctForaneo: 0, pctProfesional: 60,
  },
  {
    tipo: 'Foraneo-30',
    label: 'Foráneos 30%',
    descripcion: 'Condición Pago Especial',
    pctClinica: 30, pctForaneo: 30, pctProfesional: 70,
  },
  {
    tipo: 'Foraneo-10',
    label: 'Foráneos 10%',
    descripcion: 'Referido de otras clínicas',
    pctClinica: 30, pctForaneo: 10, pctProfesional: 70,
  },
];

export interface DesgloseComision {
  montoTotal: number;
  clinica: number;
  profesional: number;
  foraneo: number;
  pctClinicaEfectivo: number;
  pctProfesionalEfectivo: number;
  pctForaneoEfectivo: number;
}

export function calcularComision(monto: number, tipo: TipoReferencia): DesgloseComision {
  const regla = TABLA_REFERENCIAS.find(r => r.tipo === tipo)!;
  const foraneo = monto * (regla.pctForaneo / 100);
  const neto    = monto - foraneo;
  const clinica     = neto * (regla.pctClinica / 100);
  const profesional = neto * (regla.pctProfesional / 100);
  return {
    montoTotal: monto,
    clinica:        parseFloat(clinica.toFixed(2)),
    profesional:    parseFloat(profesional.toFixed(2)),
    foraneo:        parseFloat(foraneo.toFixed(2)),
    pctClinicaEfectivo:      parseFloat(((clinica / monto) * 100).toFixed(1)),
    pctProfesionalEfectivo:  parseFloat(((profesional / monto) * 100).toFixed(1)),
    pctForaneoEfectivo:      parseFloat(((foraneo / monto) * 100).toFixed(1)),
  };
}

// ─── Entidades ────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  clinicaId?: string;
  permisosMultiClinica?: boolean;
}

export interface Personal {
  id: string;
  clinicaId: string;
  nombre: string;
  apellido: string;
  tipo: 'Odontólogo' | 'Enfermera' | 'Asistente' | 'Administrativo' | 'Recepcionista' | 'Coordinador';
  especialidad?: string;
  matricula?: string;
  turno: string;
  telefono: string;
  email: string;
  activo: boolean;
  foto?: string;
  lastUpdated?: number;
}

export interface Paciente {
  id: string;
  clinicaId: string;
  nombre: string;
  apellido: string;
  cedula: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  direccion: string;
  fechaRegistro: string;
  tipoReferencia?: TipoReferencia;
  referidorNombre?: string;
  referidorContacto?: string;
  alergias: boolean;
  alergiasDetalle: string;
  lastUpdated?: number;
}

export interface Cita {
  id: string;
  clinicaId: string;
  pacienteId: string;
  pacienteNombre: string;
  doctorId: string;
  doctorNombre: string;
  fecha: string;
  hora: string;
  motivo: string;
  estado: 'Pendiente' | 'Confirmada' | 'Completada' | 'Cancelada';
  tipoAtencion: TipoAtencion;
  condicion: CondicionPaciente;
  estadoFinanciero: EstadoFinanciero;
  tipoReferencia?: TipoReferencia;
  referidorNombre?: string;
  referidorContacto?: string;
  lastUpdated?: number;
}

export interface EvolucionClinica {
  id: string;
  clinicaId: string;
  pacienteId: string;
  fecha: string;
  doctorNombre: string;
  procedimiento: string;
  notas: string;
  materiales?: string;
}

export interface Laboratorio {
  id: string;
  clinicaId: string;
  pacienteId: string;
  pacienteNombre: string;
  trabajo: string;
  laboratorioNombre: string;
  fechaEnvio: string;
  fechaEntregaPrevista: string;
  estado: 'Enviado' | 'Recibido' | 'Atrasado';
  costo: number;
}

export interface PiezaDental {
  numero: number;
  estado: 'sano' | 'caries' | 'corona' | 'extraccion' | 'endodoncia' | 'implante' | 'ausente';
  notas: string;
}

export interface Odontograma {
  id: string;
  pacienteId: string;
  piezas: PiezaDental[];
  fecha: string;
}

export interface ItemInventario {
  id: string;
  clinicaId: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  unidad: string;
  precio: number;
}

export type MetodoPago =
  | 'Efectivo BS'
  | 'Pago Móvil'
  | 'Transferencia BS'
  | 'Punto de Venta BS'
  | 'Efectivo USD'
  | 'USDT'
  | 'PayPal'
  | 'Zelle'
  | 'Binance';

export type TipoCredito = 5 | 10 | 15 | 20 | 25 | 30;

export interface Pago {
  id: string;
  clinicaId: string;
  pacienteId: string;
  pacienteNombre: string;
  citaId?: string;
  concepto: string;
  monto: number;
  montoBs: number;
  tasaCambio: number;
  metodoPago: MetodoPago;
  tipoPago: 'Contado' | 'Abono' | 'Crédito';
  diasCredito?: TipoCredito;
  fechaVencimiento?: string;
  fecha: string;
  estado: 'Pagado' | 'Pendiente' | 'Vencido' | 'Parcial';
  notas?: string;
  moneda?: 'USD' | 'BS';
  referencia?: string;
  tipoReferencia?: TipoReferencia;
  referidorNombre?: string;
  doctorId?: string;
  doctorNombre?: string;
  // Detalles Venezuela
  bancoEmisor?: string;
  numeroReferencia?: string;
  telefonoOrigen?: string;
  comprobante?: string;
  lastUpdated?: number;
}

export interface Egreso {
  id: string;
  clinicaId: string;
  concepto: string;
  categoria: 'Suministros' | 'Servicios' | 'Nómina' | 'Proveedor' | 'Alquiler' | 'Equipos' | 'Otro';
  monto: number;
  montoBs: number;
  tasaCambio: number;
  metodoPago: MetodoPago;
  proveedorId?: string;
  proveedorNombre?: string;
  fecha: string;
  notas?: string;
  lastUpdated?: number;
}

export interface Proveedor {
  id: string;
  clinicaId: string;
  nombre: string;
  tipo: 'Clínica' | 'Casa Médica' | 'Farmacia' | 'Botica' | 'Laboratorio' | 'Otro';
  rif: string;
  telefono: string;
  email: string;
  contacto: string;
  direccion: string;
  activo: boolean;
}

export type EstadoPresupuesto = 'Borrador' | 'Enviado' | 'Aprobado' | 'Rechazado' | 'Recibido';

export interface Presupuesto {
  id: string;
  clinicaId: string;
  pacienteId: string;
  pacienteNombre: string;
  items: { id: string, descripcion: string, cantidad: number, precio: number, subtotal: number }[];
  total: number;
  estado: EstadoPresupuesto;
  fecha: string;
  notas?: string;
}

export interface Recibo {
  id: string;
  presupuestoId: string;
  pacienteId: string;
  pacienteNombre: string;
  clinicaId: string;
  monto: number;
  metodoPago: string;
  fecha: string;
  nroRecibo: string;
}

// ─── Datos Demo ────────────────────────────────────────────────────────────────

export const DEMO_USUARIOS: Usuario[] = [
  { id: 'u1', nombre: 'Francisco Rodríguez', email: 'admin@ergodentalve.com',     rol: 'ADMIN',     activo: true, clinicaId: 'la-vina', permisosMultiClinica: true },
  { id: 'u2', nombre: 'Dr. Carlos Pérez',    email: 'doctor@ergodentalve.com',    rol: 'DOCTOR',    activo: true, clinicaId: 'la-vina', permisosMultiClinica: true },
  { id: 'u3', nombre: 'Ana Martínez',        email: 'asistente@ergodentalve.com', rol: 'ASISTENTE', activo: true, clinicaId: 'la-vina', permisosMultiClinica: false },
  { id: 'u4', nombre: 'Laura Sánchez',       email: 'recepcion@ergodentalve.com', rol: 'RECEPCION', activo: true, clinicaId: 'la-vina', permisosMultiClinica: false },
  { id: 'u5', nombre: 'Asistente Pro',       email: 'pro@ergodentalve.com',       rol: 'ASISTENTE', activo: true, clinicaId: 'la-vina', permisosMultiClinica: true },
];

export const DEMO_PERSONAL = getDemoStore<Personal>('personal', [
  { id: 'p1', clinicaId: 'la-vina', nombre: 'Dra. María', apellido: 'González', tipo: 'Odontólogo', especialidad: 'Ortodoncia', matricula: 'ORT-1042', turno: 'Mañana (8am-12pm)', telefono: '0412-1234567', email: 'maria@ergodentalve.com', activo: true },
  { id: 'p2', clinicaId: 'la-vina', nombre: 'Dr. Carlos', apellido: 'Pérez', tipo: 'Odontólogo', especialidad: 'Endodoncia', matricula: 'END-2301', turno: 'Tarde (1pm-5pm)', telefono: '0414-7654321', email: 'carlos@ergodentalve.com', activo: true },
  { id: 'p3', clinicaId: 'la-vina', nombre: 'Ana', apellido: 'Martínez', tipo: 'Asistente', especialidad: '', matricula: '', turno: 'Completo (8am-5pm)', telefono: '0416-5551234', email: 'ana@ergodentalve.com', activo: true },
  { id: 'p4', clinicaId: 'la-vina', nombre: 'Laura', apellido: 'Sánchez', tipo: 'Recepcionista', especialidad: '', matricula: '', turno: 'Mañana (8am-1pm)', telefono: '0424-9876543', email: 'laura@ergodentalve.com', activo: true },
  { id: 'p5', clinicaId: 'la-vina', nombre: 'Pedro', apellido: 'Vargas', tipo: 'Administrativo', especialidad: '', matricula: '', turno: 'Tarde (1pm-6pm)', telefono: '0412-3334444', email: 'pedro@ergodentalve.com', activo: false },
] as Personal[]);

export const DEMO_PACIENTES = getDemoStore<Paciente>('pacientes', [
  { id: 'pac1', clinicaId: 'la-vina', nombre: 'José',      apellido: 'Hernández', cedula: 'V-12345678', fechaNacimiento: '1985-03-15', telefono: '0412-1112222', email: 'jose@gmail.com',       direccion: 'Av. Principal, Casa 5',    fechaRegistro: '2024-01-10', tipoReferencia: 'Profesional-Especialista', referidorNombre: 'Dr. Lugo (Cardiología)', referidorContacto: '0412-9990000', alergias: false, alergiasDetalle: '' },
  { id: 'pac2', clinicaId: 'la-vina', nombre: 'Carmen',    apellido: 'López',     cedula: 'V-23456789', fechaNacimiento: '1992-07-22', telefono: '0414-2223333', email: 'carmen@gmail.com',     direccion: 'Calle 2, Apto 3B',         fechaRegistro: '2024-01-15', tipoReferencia: 'Paciente-Clinica',          referidorNombre: 'Clínica Ergodentalve', alergias: true, alergiasDetalle: 'Penicilina' },
  { id: 'pac3', clinicaId: 'la-vina', nombre: 'Roberto',   apellido: 'Díaz',      cedula: 'V-34567890', fechaNacimiento: '1978-11-08', telefono: '0416-3334444', email: 'roberto@gmail.com',    direccion: 'Urb. Las Flores, Casa 12', fechaRegistro: '2024-02-03', tipoReferencia: 'Foraneo-30',                referidorNombre: 'Clínica Dental Valencia',  referidorContacto: '0241-1234567', alergias: false, alergiasDetalle: '' },
  { id: 'pac4', clinicaId: 'la-vina', nombre: 'Valentina', apellido: 'Torres',    cedula: 'V-45678901', fechaNacimiento: '2001-05-30', telefono: '0424-4445555', email: 'valentina@gmail.com', direccion: 'Res. El Parque, Piso 4',   fechaRegistro: '2024-02-20', tipoReferencia: 'Foraneo-10',                referidorNombre: 'Casa Médica Caracas',       referidorContacto: '0212-5552222', alergias: false, alergiasDetalle: '' },
  { id: 'pac5', clinicaId: 'la-vina', nombre: 'Miguel',    apellido: 'Ramírez',   cedula: 'V-56789012', fechaNacimiento: '1969-09-14', telefono: '0426-5556666', email: 'miguel@gmail.com',     direccion: 'Sector Norte, Mz 3 Casa 8', fechaRegistro: '2024-03-05', tipoReferencia: 'Paciente-Clinica',         referidorNombre: 'Clínica Ergodentalve', alergias: false, alergiasDetalle: '' },
] as Paciente[]);

export const DEMO_CITAS = getDemoStore<Cita>('citas', [
  { id:'c1', clinicaId: 'la-vina', pacienteId:'pac1', pacienteNombre:'José Hernández',    doctorId:'p1', doctorNombre:'Dra. María González', fecha:'2026-03-18', hora:'09:00', motivo:'Limpieza dental',      estado:'Confirmada', tipoAtencion:'Tratamiento', condicion:'Control', estadoFinanciero:'Pago Inmediato', tipoReferencia:'Profesional-Especialista', referidorNombre:'Dr. Lugo (Cardiología)',  referidorContacto:'0412-9990000' },
  { id:'c2', clinicaId: 'la-vina', pacienteId:'pac2', pacienteNombre:'Carmen López',       doctorId:'p2', doctorNombre:'Dr. Carlos Pérez',    fecha:'2026-03-18', hora:'10:30', motivo:'Caries molar',          estado:'Pendiente',  tipoAtencion:'Tratamiento', condicion:'Evaluación', estadoFinanciero:'Pago Inmediato', tipoReferencia:'Paciente-Clinica',         referidorNombre:'Clínica Ergodentalve' },
  { id:'c3', clinicaId: 'la-vina', pacienteId:'pac3', pacienteNombre:'Roberto Díaz',       doctorId:'p1', doctorNombre:'Dra. María González', fecha:'2026-03-18', hora:'11:00', motivo:'Revisión ortodoncia',   estado:'Completada', tipoAtencion:'Revisión', condicion:'Control', estadoFinanciero:'Pago Inmediato', tipoReferencia:'Foraneo-30',               referidorNombre:'Clínica Dental Valencia', referidorContacto:'0241-1234567' },
  { id:'c4', clinicaId: 'la-vina', pacienteId:'pac4', pacienteNombre:'Valentina Torres',    doctorId:'p2', doctorNombre:'Dr. Carlos Pérez',    fecha:'2026-03-19', hora:'14:00', motivo:'Endodoncia pieza 36',   estado:'Pendiente',  tipoAtencion:'Tratamiento', condicion:'Evaluación', estadoFinanciero:'Paga Después', tipoReferencia:'Foraneo-10',               referidorNombre:'Casa Médica Caracas',      referidorContacto:'0212-5552222' },
  { id:'c5', clinicaId: 'la-vina', pacienteId:'pac5', pacienteNombre:'Miguel Ramírez',     doctorId:'p1', doctorNombre:'Dra. María González', fecha:'2026-03-19', hora:'15:30', motivo:'Extracción',            estado:'Confirmada', tipoAtencion:'Tratamiento', condicion:'Control', estadoFinanciero:'Pago Inmediato', tipoReferencia:'Paciente-Clinica',         referidorNombre:'Clínica Ergodentalve' },
] as Cita[]);

export const DEMO_INVENTARIO = getDemoStore<ItemInventario>('inventario', [
  { id: 'i1', clinicaId: 'la-vina', nombre: 'Guantes de látex (caja)', categoria: 'Protección', stock: 8, stockMinimo: 5, unidad: 'Caja', precio: 12.50 },
  { id: 'i2', clinicaId: 'la-vina', nombre: 'Mascarillas quirúrgicas', categoria: 'Protección', stock: 3, stockMinimo: 10, unidad: 'Caja', precio: 8.00 },
  { id: 'i3', clinicaId: 'la-vina', nombre: 'Composite dental A2', categoria: 'Materiales', stock: 15, stockMinimo: 5, unidad: 'Jeringa', precio: 35.00 },
  { id: 'i4', clinicaId: 'la-vina', nombre: 'Anestesia Lidocaína', categoria: 'Medicamentos', stock: 24, stockMinimo: 20, unidad: 'Carpule', precio: 2.50 },
  { id: 'i5', clinicaId: 'la-vina', nombre: 'Hilo de sutura 3-0', categoria: 'Materiales', stock: 2, stockMinimo: 5, unidad: 'Rollo', precio: 18.00 },
  { id: 'i6', clinicaId: 'la-vina', nombre: 'Revelador de placas', categoria: 'Higiene', stock: 6, stockMinimo: 3, unidad: 'Botella', precio: 14.00 },
] as ItemInventario[]);

export const DEMO_PAGOS = getDemoStore<Pago>('pagos', [
  { id:'pg1', clinicaId: 'la-vina', pacienteId:'pac1', pacienteNombre:'José Hernández',  citaId:'c1', concepto:'Limpieza dental',           monto: 40, montoBs:1460000, tasaCambio:36500, metodoPago:'Pago Móvil',      tipoPago:'Contado', fecha:'2026-03-18', estado:'Pagado',   tipoReferencia:'Profesional-Especialista', referidorNombre:'Dr. Lugo (Cardiología)', doctorId:'p1', doctorNombre:'Dra. María González', bancoEmisor: 'Banesco', numeroReferencia: '123456789012' },
  { id:'pg2', clinicaId: 'la-vina', pacienteId:'pac2', pacienteNombre:'Carmen López',      citaId:'c2', concepto:'Caries molar – abono 1',    monto: 25, montoBs: 912500, tasaCambio:36500, metodoPago:'Zelle',            tipoPago:'Abono',   fecha:'2026-03-18', estado:'Parcial',  tipoReferencia:'Paciente-Clinica',         referidorNombre:'Clínica Ergodentalve',       doctorId:'p2', doctorNombre:'Dr. Carlos Pérez',    notas:'Saldo pendiente: $35' },
  { id:'pg3', clinicaId: 'la-vina', pacienteId:'pac3', pacienteNombre:'Roberto Díaz',      citaId:'c3', concepto:'Ortodoncia mensualidad',    monto: 80, montoBs:2920000, tasaCambio:36500, metodoPago:'Efectivo USD',    tipoPago:'Crédito', diasCredito:15, fechaVencimiento:'2026-04-02', fecha:'2026-03-18', estado:'Pendiente', tipoReferencia:'Foraneo-30', referidorNombre:'Clínica Dental Valencia', doctorId:'p1', doctorNombre:'Dra. María González' },
  { id:'pg4', clinicaId: 'la-vina', pacienteId:'pac4', pacienteNombre:'Valentina Torres',    concepto:'Endodoncia pieza 36',             monto:120, montoBs:      0, tasaCambio:36500, metodoPago:'Binance',           tipoPago:'Crédito', diasCredito:30, fechaVencimiento:'2026-04-17', fecha:'2026-03-15', estado:'Pendiente', tipoReferencia:'Foraneo-10', referidorNombre:'Casa Médica Caracas',       doctorId:'p2', doctorNombre:'Dr. Carlos Pérez' },
  { id:'pg5', clinicaId: 'la-vina', pacienteId:'pac5', pacienteNombre:'Miguel Ramírez',    concepto:'Extracción',                    monto: 35, montoBs:1277500, tasaCambio:36500, metodoPago:'Efectivo BS',      tipoPago:'Contado', fecha:'2026-03-10', estado:'Pagado',   tipoReferencia:'Paciente-Clinica',         referidorNombre:'Clínica Ergodentalve',       doctorId:'p1', doctorNombre:'Dra. María González' },
] as Pago[]);

export const DEMO_EGRESOS = getDemoStore<Egreso>('egresos', [
  { id: 'eg1', clinicaId: 'la-vina', concepto: 'Compra guantes y mascarillas', categoria: 'Suministros', monto: 45, montoBs: 1642500, tasaCambio: 36500, metodoPago: 'Transferencia BS', proveedorId: 'pv1', proveedorNombre: 'Farmacia San Juan', fecha: '2026-03-15' },
  { id: 'eg2', clinicaId: 'la-vina', concepto: 'Pago nómina asistentes', categoria: 'Nómina', monto: 200, montoBs: 7300000, tasaCambio: 36500, metodoPago: 'Pago Móvil', fecha: '2026-03-15' },
  { id: 'eg3', clinicaId: 'la-vina', concepto: 'Alquiler consultorio #2', categoria: 'Alquiler', monto: 150, montoBs: 5475000, tasaCambio: 36500, metodoPago: 'Transferencia BS', fecha: '2026-03-01' },
] as Egreso[]);

export const DEMO_PRESUPUESTOS: Presupuesto[] = getDemoStore<Presupuesto>('presupuestos', []);
export const DEMO_RECIBOS: Recibo[] = getDemoStore<Recibo>('recibos', []);
export const DEMO_ODONTOGRAMAS: Odontograma[] = getDemoStore<Odontograma>('odontogramas', []);

export const DEMO_PROVEEDORES: Proveedor[] = getDemoStore<Proveedor>('proveedores', [
  { id: 'pv1', clinicaId: 'la-vina', nombre: 'Farmacia San Juan', tipo: 'Farmacia', rif: 'J-30123456-0', telefono: '0212-5551111', email: 'ventas@sanjuan.com', contacto: 'Sr. Gómez', direccion: 'Av. Urdaneta, LC 4', activo: true },
  { id: 'pv2', clinicaId: 'la-vina', nombre: 'Casa Médica Caracas', tipo: 'Casa Médica', rif: 'J-40234567-1', telefono: '0212-5552222', email: 'pedidos@cmcaracas.com', contacto: 'Dra. Colmenares', direccion: 'Av. Libertador, Ed. Medical', activo: true },
] as Proveedor[]);

// ─── Cliente Supabase (con fallback demo) ────────────────────────────────────

// Helper para convertir de snake_case (DB) a camelCase (App)
function mapKeys(obj: any, mapper: (k: string) => string): any {
  if (Array.isArray(obj)) return obj.map(v => mapKeys(v, mapper));
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, k) => {
      acc[mapper(k)] = mapKeys(obj[k], mapper);
      return acc;
    }, {} as any);
  }
  return obj;
}

const toCamel = (s: string) => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
const toSnake = (s: string) => s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

export function mergeOfflineQueue<T>(table: string, remoteData: T[]): T[] {
  if (typeof window === 'undefined') return remoteData;
  try {
    const queue: any[] = JSON.parse(localStorage.getItem('ergo_sync_queue') || '[]');
    const tableActions = queue.filter(x => x.table === table);
    if (tableActions.length === 0) return remoteData;

    let merged = [...remoteData];

    for (const action of tableActions) {
      if (action.action === 'INSERT') {
        const item = mapKeys(action.payload, toCamel) as T;
        const exists = merged.some((x: any) => x.id === (item as any).id);
        if (!exists) {
          merged.unshift(item);
        }
      } else if (action.action === 'UPDATE') {
        const item = mapKeys(action.payload, toCamel) as any;
        const idx = merged.findIndex((x: any) => x.id === item.id);
        if (idx !== -1) {
          merged[idx] = { ...merged[idx], ...item };
        }
      } else if (action.action === 'UPSERT') {
        const item = mapKeys(action.payload, toCamel) as any;
        const idx = merged.findIndex((x: any) => x.id === item.id);
        if (idx !== -1) {
          merged[idx] = { ...merged[idx], ...item };
        } else {
          merged.unshift(item);
        }
      } else if (action.action === 'DELETE') {
        const payload = action.payload;
        const idToDelete = payload.id;
        merged = merged.filter((x: any) => x.id !== idToDelete);
      }
    }

    return merged;
  } catch (e) {
    console.error('Error merging offline queue:', e);
    return remoteData;
  }
}

// --- Evoluciones ---
export async function getEvoluciones() { 
  if (isDemoSession()) return []; 
  const { data, error } = await supabase.from('evoluciones_clinicas').select('*');
  if (error) throw error;
  return mapKeys(data, toCamel) as EvolucionClinica[];
}

export async function createEvolucion(data: Partial<EvolucionClinica>) { 
  if (isDemoSession()) return data as EvolucionClinica;
  const dbData = mapKeys(data, toSnake);
  const { data: created, error } = await supabase.from('evoluciones_clinicas').insert(dbData).select().single();
  if (error) throw error;
  return mapKeys(created, toCamel) as EvolucionClinica;
}

// --- Laboratorios ---
export async function getLaboratorios() { 
  if (isDemoSession()) return [];
  const { data, error } = await supabase.from('laboratorios').select('*');
  if (error) throw error;
  return mapKeys(data, toCamel) as Laboratorio[];
}

export async function createLaboratorio(data: Partial<Laboratorio>) { 
  if (isDemoSession()) return data as Laboratorio;
  const dbData = mapKeys(data, toSnake);
  const { data: created, error } = await supabase.from('laboratorios').insert(dbData).select().single();
  if (error) throw error;
  return mapKeys(created, toCamel) as Laboratorio;
}

export async function updateLaboratorio(data: Partial<Laboratorio>) { 
  if (isDemoSession()) return data as Laboratorio;
  const { id, ...rest } = data;
  const dbData = mapKeys(rest, toSnake);
  const { data: updated, error } = await supabase.from('laboratorios').update(dbData).eq('id', id).select().single();
  if (error) throw error;
  return mapKeys(updated, toCamel) as Laboratorio;
}

export async function deleteLaboratorio(id: string) { 
  if (isDemoSession()) return;
  await withOfflineSync<void>(
    () => supabase.from('laboratorios').delete().eq('id', id) as any,
    'laboratorios',
    'DELETE',
    { id: id },
    undefined as void
  );
}

// Auth
export async function resetPasswordForEmail(email: string) {
  const isTargetDemo = IS_DEMO_EMAILS.includes(email);
  if (!IS_SUPABASE_CONNECTED || isTargetDemo) {
    // En modo demo simulamos éxito
    return { data: {}, error: null };
  }
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/#/reset-password`,
  });
}

export async function updatePassword(password: string) {
  if (isDemoSession()) {
    return { data: {}, error: null };
  }
  
  // Verificamos si hay una sesión activa antes de intentar actualizar
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No hay una sesión activa para cambiar la contraseña. Por favor, usa el enlace de tu correo nuevamente.');
  }

  return await supabase.auth.updateUser({ password });
}

export async function verifyRecoveryCode(email: string, token: string) {
  if (!IS_SUPABASE_CONNECTED) {
    return { data: {}, error: null };
  }
  return await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });
}

export async function loginUser(email: string, password: string): Promise<Usuario> {
  // 1. Credenciales Demo (Local)
  const DEMO_CREDS: Record<string, string> = {
    'admin@ergodentalve.com':     'Ergodentalve2024!',
    'doctor@ergodentalve.com':    'Ergodentalve2024!',
    'asistente@ergodentalve.com': 'Ergodentalve2024!',
    'recepcion@ergodentalve.com': 'Ergodentalve2024!',
    'pro@ergodentalve.com':       'Ergodentalve2024!',
  };

  if (DEMO_CREDS[email] === password) {
    const user = DEMO_USUARIOS.find(u => u.email === email);
    if (user) return user;
  }

  // 2. Validación de Red
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    throw new Error('No tienes conexión a internet activa para iniciar sesión.');
  }

  if (!IS_SUPABASE_CONNECTED || !supabase) {
    throw new Error('Configuración de base de datos no disponible en línea.');
  }

  // 3. Autenticación Directa (Sin límites de tiempo artificiales)
  if (VITE_USE_GOOGLE_SHEETS) {
    try {
      const user = await googleSheetsRequest('login', { email, password });
      return user as Usuario;
    } catch (err: any) {
      // Fallback para Administradores de la Propiedad en Google Sheets
      const SUPER_ADMINS = [
        'francisco.rojasp@gmail.com', 
        'blascojennifer47@gmail.com', 
        'vera.hugo712@gmail.com', 
        'carlosalejandroverablasco183@gmail.com'
      ];
      if (SUPER_ADMINS.includes(email.toLowerCase())) {
        return {
          id: 'admin_' + Date.now(),
          nombre: email.split('@')[0],
          email: email,
          rol: 'ADMIN',
          activo: true
        };
      }
      throw err;
    }
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw authError;

  // 4. Carga de Perfil de Usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

  // 5. Fallback para Administradores de la Propiedad (Garantizar acceso)
  const SUPER_ADMINS = [
    'francisco.rojasp@gmail.com', 
    'blascojennifer47@gmail.com', 
    'vera.hugo712@gmail.com', 
    'carlosalejandroverablasco183@gmail.com'
  ];
  if (profile) return mapKeys(profile, toCamel) as Usuario;

  if (SUPER_ADMINS.includes(email.toLowerCase())) {
    return {
      id: authData.user.id,
      nombre: email.split('@')[0],
      email: email,
      rol: 'ADMIN',
      activo: true
    };
  }

  throw new Error('No se encontró un perfil activo para esta cuenta.');
}

// Pacientes
export async function getPacientes(): Promise<Paciente[]> {
  if (isDemoSession()) return DEMO_PACIENTES;
  const { data, error } = await supabase.from('pacientes').select('*').order('nombre');
  if (error) throw error;
  const remote = mapKeys(data, toCamel) as Paciente[];
  return mergeOfflineQueue<Paciente>('pacientes', remote);
}

export async function createPaciente(p: Omit<Paciente, 'id' | 'fechaRegistro'>): Promise<Paciente> {
  if (isDemoSession()) {
    const nuevo: Paciente = { ...p, id: `pac${Date.now()}`, fechaRegistro: new Date().toISOString().split('T')[0] };
    DEMO_PACIENTES.unshift(nuevo);
    saveDemoStore('pacientes', DEMO_PACIENTES);
    return nuevo;
  }
  const clientUUID = generateUUID();
  const dbData = sanitizeData({ ...mapKeys(p, toSnake), id: clientUUID });
  // Blindaje Estructural v1.9
  delete dbData.last_updated;
  
  return await withOfflineSync<Paciente>(
    () => supabase.from('pacientes').insert(dbData).select().single(),
    'pacientes',
    'INSERT',
    dbData,
    { ...p, id: clientUUID } as unknown as Paciente
  );
}

export async function updatePaciente(p: Partial<Paciente> & { id: string }): Promise<Paciente> {
  if (isDemoSession()) {
    const idx = DEMO_PACIENTES.findIndex(x => x.id === p.id);
    if (idx !== -1) {
      DEMO_PACIENTES[idx] = { ...DEMO_PACIENTES[idx], ...p };
      saveDemoStore('pacientes', DEMO_PACIENTES);
    }
    return DEMO_PACIENTES[idx];
  }
  const { id, ...rest } = p;
  const dbData = sanitizeData(mapKeys(rest, toSnake));
  // Blindaje Estructural v1.9
  delete dbData.last_updated;

  return await withOfflineSync<Paciente>(
    () => supabase.from('pacientes').update(dbData).eq('id', id).select().single(),
    'pacientes',
    'UPDATE',
    { ...dbData, id },
    p as unknown as Paciente
  );
}

export async function deletePaciente(id: string): Promise<void> {
  if (isDemoSession()) {
    const idx = DEMO_PACIENTES.findIndex(x => x.id === id);
    if (idx !== -1) {
      DEMO_PACIENTES.splice(idx, 1);
      saveDemoStore('pacientes', DEMO_PACIENTES);
    }
    return;
  }
  await withOfflineSync<void>(
    () => supabase.from('pacientes').delete().eq('id', id) as any,
    'pacientes',
    'DELETE',
    { id: id },
    undefined as void
  );
}

// Personal
export async function getPersonal(): Promise<Personal[]> {
  if (isDemoSession()) return DEMO_PERSONAL;
  const { data, error } = await supabase.from('personal').select('*').order('nombre');
  if (error) throw error;
  const remote = mapKeys(data, toCamel) as Personal[];
  return mergeOfflineQueue<Personal>('personal', remote);
}

export async function createPersonal(p: Omit<Personal, 'id'>): Promise<Personal> {
  if (isDemoSession()) {
    const nuevo: Personal = { ...p, id: `per${Date.now()}` };
    DEMO_PERSONAL.unshift(nuevo);
    saveDemoStore('personal', DEMO_PERSONAL);
    return nuevo;
  }
  const clientUUID = generateUUID();
  const dbData = sanitizeData({ ...mapKeys(p, toSnake), id: clientUUID });
  // Blindaje Estructural v1.9 (Inmunidad Total)
  delete dbData.last_updated;

  return await withOfflineSync<Personal>(
    () => supabase.from('personal').insert(dbData).select().single(),
    'personal',
    'INSERT',
    dbData,
    { ...p, id: clientUUID } as unknown as Personal
  );
}

export async function updatePersonal(p: Partial<Personal> & { id: string }): Promise<Personal> {
  if (isDemoSession()) {
    const idx = DEMO_PERSONAL.findIndex(x => x.id === p.id);
    if (idx !== -1) {
      DEMO_PERSONAL[idx] = { ...DEMO_PERSONAL[idx], ...p };
      saveDemoStore('personal', DEMO_PERSONAL);
    }
    return DEMO_PERSONAL[idx];
  }
  const { id, ...rest } = p;
  const dbData = sanitizeData(mapKeys(rest, toSnake));
  // Blindaje Estructural v1.9 (Inmunidad Total)
  delete dbData.last_updated;

  return await withOfflineSync<Personal>(
    () => supabase.from('personal').update(dbData).eq('id', id).select().single(),
    'personal',
    'UPDATE',
    { ...dbData, id },
    p as unknown as Personal
  );
}

export async function deletePersonal(id: string): Promise<void> {
  if (isDemoSession()) {
    const idx = DEMO_PERSONAL.findIndex(x => x.id === id);
    if (idx !== -1) {
      DEMO_PERSONAL.splice(idx, 1);
      saveDemoStore('personal', DEMO_PERSONAL);
    }
    return;
  }
  await withOfflineSync<void>(
    () => supabase.from('personal').delete().eq('id', id) as any,
    'personal',
    'DELETE',
    { id: id },
    undefined as void
  );
}

// Citas
export async function getCitas(): Promise<Cita[]> {
  if (isDemoSession()) return DEMO_CITAS;
  const { data, error } = await supabase.from('citas').select('*').order('fecha', { ascending: false });
  if (error) throw error;
  const remote = mapKeys(data, toCamel) as Cita[];
  return mergeOfflineQueue<Cita>('citas', remote);
}

export async function createCita(c: Omit<Cita, 'id'>): Promise<Cita> {
  if (isDemoSession()) {
    const nueva: Cita = { ...c, id: `cit${Date.now()}` };
    DEMO_CITAS.unshift(nueva);
    saveDemoStore('citas', DEMO_CITAS);
    return nueva;
  }
  const clientUUID = generateUUID();
  const dbData = sanitizeData({ ...mapKeys(c, toSnake), id: clientUUID });
  
  return await withOfflineSync<Cita>(
    () => supabase.from('citas').insert(dbData).select().single(),
    'citas',
    'INSERT',
    dbData,
    { ...c, id: clientUUID } as unknown as Cita
  );
}

export async function updateCita(c: Partial<Cita> & { id: string }): Promise<Cita> {
  if (isDemoSession()) {
    const idx = DEMO_CITAS.findIndex(x => x.id === c.id);
    if (idx !== -1) {
      DEMO_CITAS[idx] = { ...DEMO_CITAS[idx], ...c };
      saveDemoStore('citas', DEMO_CITAS);
    }
    return DEMO_CITAS[idx];
  }
  const { id, ...rest } = c;
  const dbData = mapKeys(rest, toSnake);

  return await withOfflineSync<Cita>(
    () => supabase.from('citas').update(dbData).eq('id', id).select().single(),
    'citas',
    'UPDATE',
    { ...dbData, id },
    c as unknown as Cita
  );
}

export async function deleteCita(id: string): Promise<void> {
  if (isDemoSession()) {
    const idx = DEMO_CITAS.findIndex(x => x.id === id);
    if (idx !== -1) {
      DEMO_CITAS.splice(idx, 1);
      saveDemoStore('citas', DEMO_CITAS);
    }
    return;
  }
  await withOfflineSync<void>(
    () => supabase.from('citas').delete().eq('id', id) as any,
    'citas',
    'DELETE',
    { id: id },
    undefined as void
  );
}

// Inventario
export async function getInventario(): Promise<ItemInventario[]> {
  if (isDemoSession()) return DEMO_INVENTARIO;
  const { data, error } = await supabase.from('inventario').select('*').order('nombre');
  if (error) throw error;
  const remote = mapKeys(data, toCamel) as ItemInventario[];
  return mergeOfflineQueue<ItemInventario>('inventario', remote);
}

export async function createItemInventario(item: Omit<ItemInventario, 'id'>): Promise<ItemInventario> {
  if (isDemoSession()) {
    const nuevo: ItemInventario = { ...item, id: `inv${Date.now()}` };
    DEMO_INVENTARIO.push(nuevo);
    saveDemoStore('inventario', DEMO_INVENTARIO);
    return nuevo;
  }
  const clientUUID = generateUUID();
  const dbData = sanitizeData({ ...mapKeys(item, toSnake), id: clientUUID });
  // Blindaje Estructural v1.9 (Inmunidad Total)
  delete dbData.last_updated;

  return await withOfflineSync<ItemInventario>(
    () => supabase.from('inventario').insert(dbData).select().single(),
    'inventario',
    'INSERT',
    dbData,
    { ...item, id: clientUUID } as unknown as ItemInventario
  );
}

// Finanzas
export async function getPagos(): Promise<Pago[]> {
  if (isDemoSession()) return DEMO_PAGOS;
  const { data, error } = await supabase.from('pagos').select('*').order('fecha', { ascending: false });
  if (error) throw error;
  const remote = mapKeys(data, toCamel) as Pago[];
  return mergeOfflineQueue<Pago>('pagos', remote);
}

export async function createPago(p: Omit<Pago, 'id'>): Promise<Pago> {
  if (isDemoSession()) {
    const nuevo: Pago = { ...p, id: `pg${Date.now()}` };
    DEMO_PAGOS.push(nuevo);
    saveDemoStore('pagos', DEMO_PAGOS);
    return nuevo;
  }
  const clientUUID = generateUUID();
  const dbData = sanitizeData({ ...mapKeys(p, toSnake), id: clientUUID });
  // Blindaje Estructural v1.9
  delete dbData.last_updated;

  return await withOfflineSync<Pago>(
    () => supabase.from('pagos').insert(dbData).select().single(),
    'pagos',
    'INSERT',
    dbData,
    { ...p, id: clientUUID } as unknown as Pago
  );
}

export async function getEgresos(): Promise<Egreso[]> {
  if (isDemoSession()) return DEMO_EGRESOS;
  const { data, error } = await supabase.from('egresos').select('*').order('fecha', { ascending: false });
  if (error) throw error;
  const remote = mapKeys(data, toCamel) as Egreso[];
  return mergeOfflineQueue<Egreso>('egresos', remote);
}

export async function createEgreso(e: Omit<Egreso, 'id'>): Promise<Egreso> {
  if (isDemoSession()) {
    const nuevo: Egreso = { ...e, id: `eg${Date.now()}` };
    DEMO_EGRESOS.push(nuevo);
    saveDemoStore('egresos', DEMO_EGRESOS);
    return nuevo;
  }
  const clientUUID = generateUUID();
  const dbData = sanitizeData({ ...mapKeys(e, toSnake), id: clientUUID });
  // Blindaje Estructural v1.9
  delete dbData.last_updated;

  return await withOfflineSync<Egreso>(
    () => supabase.from('egresos').insert(dbData).select().single(),
    'egresos',
    'INSERT',
    dbData,
    { ...e, id: clientUUID } as unknown as Egreso
  );
}

export async function getProveedores(): Promise<Proveedor[]> {
  if (isDemoSession()) return DEMO_PROVEEDORES;
  const { data, error } = await supabase.from('proveedores').select('*').order('nombre');
  if (error) throw error;
  const remote = mapKeys(data, toCamel) as Proveedor[];
  return mergeOfflineQueue<Proveedor>('proveedores', remote);
}

export async function createProveedor(p: Omit<Proveedor, 'id'>): Promise<Proveedor> {
  if (isDemoSession()) {
    const nuevo: Proveedor = { ...p, id: `pv${Date.now()}` };
    DEMO_PROVEEDORES.push(nuevo);
    saveDemoStore('proveedores', DEMO_PROVEEDORES);
    return nuevo;
  }
  const clientUUID = generateUUID();
  const dbData = sanitizeData({ ...mapKeys(p, toSnake), id: clientUUID });
  // Blindaje Estructural v1.9 (Inmunidad Total)
  delete dbData.last_updated;

  return await withOfflineSync<Proveedor>(
    () => supabase.from('proveedores').insert(dbData).select().single(),
    'proveedores',
    'INSERT',
    dbData,
    { ...p, id: clientUUID } as unknown as Proveedor
  );
}

export async function updateClinica(c: Clinica): Promise<Clinica> {
  if (isDemoSession()) {
    const idx = CLINICAS.findIndex(cl => cl.id === c.id);
    if (idx !== -1) CLINICAS[idx] = { ...c };
    return c;
  }
  const { id, ...rest } = c;
  const dbData = mapKeys(rest, toSnake);
  return await withOfflineSync<Clinica>(
    () => supabase.from('clinicas').update(dbData).eq('id', id).select().single(),
    'clinicas',
    'UPDATE',
    { ...dbData, id },
    c as unknown as Clinica
  );
}

// Tasa del Día
export async function getTasaHoy(): Promise<number | null> {
  if (isDemoSession()) return null;
  const { data, error } = await supabase.from('tasa_bcv').select('monto').order('fecha', { ascending: false }).limit(1).maybeSingle();
  if (error) return null;
  return data ? data.monto : null;
}

export async function getHistorialTasasDB(): Promise<any[]> {
  if (isDemoSession()) return [];
  const { data, error } = await supabase.from('tasa_bcv')
    .select('monto, fecha, usuario')
    .order('fecha', { ascending: false })
    .limit(90);
  
  if (error) {
    console.error("Error obteniendo historial de tasas desde DB:", error);
    return [];
  }
  return data;
}

export interface AuditoriaLog {
  usuario: string;
  accion: string;
  detalle?: string;
  documentoId?: string;
}

export async function logAuditoria(log: AuditoriaLog): Promise<void> {
  if (isDemoSession()) return;
  const dbData = mapKeys(log, toSnake);
  try {
    if (!navigator.onLine) throw new Error('Offline');
    await supabase.from('auditoria_logs').insert(dbData);
  } catch(err) {
    saveToSyncQueue({ table: 'auditoria_logs', action: 'INSERT', payload: dbData });
  }
}

export async function saveTasaHoy(monto: number, usuario?: string): Promise<void> {
  if (isDemoSession()) return;
  
  const payload = { monto, usuario };
  try {
    if (!navigator.onLine) throw new Error('Offline');
    const { error } = await supabase.from('tasa_bcv').insert(payload);
    if (error) throw error;
  } catch (err) {
    console.warn("Fallo al guardar tasa en DB (quizás sin internet), guardando en cola offline...");
    saveToSyncQueue({
      table: 'tasa_bcv',
      action: 'INSERT',
      payload
    });
  }

  if (usuario) {
    await logAuditoria({
      usuario,
      accion: 'CAMBIO TASA BCV',
      detalle: `Tasa actualizada a Bs ${monto}`
    });
  }
}

// Presupuestos
export async function getPresupuestos(): Promise<Presupuesto[]> {
  if (isDemoSession()) return DEMO_PRESUPUESTOS;
  const { data, error } = await supabase.from('presupuestos').select('*').order('fecha', { ascending: false });
  if (error) throw error;
  const remote = mapKeys(data, toCamel) as Presupuesto[];
  return mergeOfflineQueue<Presupuesto>('presupuestos', remote);
}

export async function createPresupuesto(p: Omit<Presupuesto, 'id'>): Promise<Presupuesto> {
  if (isDemoSession()) {
    const nuevo: Presupuesto = { ...p, id: `pres${Date.now()}` };
    DEMO_PRESUPUESTOS.push(nuevo);
    saveDemoStore('presupuestos', DEMO_PRESUPUESTOS);
    return nuevo;
  }
  const clientUUID = generateUUID();
  const dbData = sanitizeData({ ...mapKeys(p, toSnake), id: clientUUID });
  // Blindaje Estructural v1.9 (Inmunidad Total)
  delete dbData.last_updated;

  return await withOfflineSync<Presupuesto>(
    () => supabase.from('presupuestos').insert(dbData).select().single(),
    'presupuestos',
    'INSERT',
    dbData,
    { ...p, id: clientUUID } as unknown as Presupuesto
  );
}

export async function updatePresupuesto(data: Partial<Presupuesto> & { id: string }): Promise<void> {
  if (isDemoSession()) {
    const idx = DEMO_PRESUPUESTOS.findIndex(p => p.id === data.id);
    if (idx !== -1) {
      DEMO_PRESUPUESTOS[idx] = { ...DEMO_PRESUPUESTOS[idx], ...data };
      saveDemoStore('presupuestos', DEMO_PRESUPUESTOS);
    }
    return;
  }
  const { id, ...rest } = data;
  const dbData = mapKeys(rest, toSnake);
  const { error } = await supabase.from('presupuestos').update(dbData).eq('id', id);
  if (error) throw error;
}

export async function deletePresupuesto(id: string): Promise<void> {
  if (isDemoSession()) {
    const idx = DEMO_PRESUPUESTOS.findIndex(p => p.id === id);
    if (idx !== -1) {
      DEMO_PRESUPUESTOS.splice(idx, 1);
      saveDemoStore('presupuestos', DEMO_PRESUPUESTOS);
    }
    return;
  }
  await withOfflineSync<void>(
    () => supabase.from('presupuestos').delete().eq('id', id) as any,
    'presupuestos',
    'DELETE',
    { id: id },
    undefined as void
  );
}

// Recibos
export async function getRecibos(): Promise<Recibo[]> {
  if (isDemoSession()) return DEMO_RECIBOS;
  const { data, error } = await supabase.from('recibos').select('*').order('fecha', { ascending: false });
  if (error) throw error;
  const remote = mapKeys(data, toCamel) as Recibo[];
  return mergeOfflineQueue<Recibo>('recibos', remote);
}

export async function createRecibo(r: Omit<Recibo, 'id'>): Promise<Recibo> {
  if (isDemoSession()) {
    const nuevo: Recibo = { ...r, id: `rec${Date.now()}` };
    DEMO_RECIBOS.push(nuevo);
    saveDemoStore('recibos', DEMO_RECIBOS);
    return nuevo;
  }
  const clientUUID = generateUUID();
  const dbData = sanitizeData({ ...mapKeys(r, toSnake), id: clientUUID });
  return await withOfflineSync<Recibo>(
    () => supabase.from('recibos').insert(dbData).select().single(),
    'recibos',
    'INSERT',
    dbData,
    { ...r, id: clientUUID } as unknown as Recibo
  );
}

export async function deleteRecibo(id: string): Promise<void> {
  if (isDemoSession()) {
    const idx = DEMO_RECIBOS.findIndex(r => r.id === id);
    if (idx !== -1) {
      DEMO_RECIBOS.splice(idx, 1);
      saveDemoStore('recibos', DEMO_RECIBOS);
    }
    return;
  }
  await withOfflineSync<void>(
    () => supabase.from('recibos').delete().eq('id', id) as any,
    'recibos',
    'DELETE',
    { id: id },
    undefined as void
  );
}

// Odontogramas
export async function getOdontograma(pacienteId: string): Promise<Odontograma | null> {
  if (isDemoSession()) {
    return DEMO_ODONTOGRAMAS.find(o => o.pacienteId === pacienteId) || null;
  }
  const { data, error } = await supabase.from('odontogramas').select('*').eq('paciente_id', pacienteId).maybeSingle();
  if (error) throw error;
  
  if (data) {
    const raw = mapKeys(data, toCamel) as any;
    // Soporte para nombres de columna históricos/detectados (Verdad de Producción: 'datos')
    return {
      ...raw,
      piezas: raw.datos || raw.piezasDentales || raw.piezas || raw.data || []
    } as Odontograma;
  }
  return null;
}

export async function saveOdontograma(o: Omit<Odontograma, 'id' | 'fecha'>): Promise<Odontograma> {
  if (isDemoSession()) {
    const idx = DEMO_ODONTOGRAMAS.findIndex(old => old.pacienteId === o.pacienteId);
    const nuevo: Odontograma = { ...o, id: `odont${Date.now()}`, fecha: new Date().toISOString().split('T')[0] };
    if (idx !== -1) DEMO_ODONTOGRAMAS[idx] = nuevo;
    else DEMO_ODONTOGRAMAS.push(nuevo);
    saveDemoStore('odontogramas', DEMO_ODONTOGRAMAS);
    return nuevo;
  }

  // Mapeo del Odontograma: El servidor de producción espera 'datos' estrictamente
  const dbData = {
    paciente_id: o.pacienteId,
    datos: sanitizeData(o.piezas) 
  };

  return await withOfflineSync<Odontograma>(
    async () => {
      // Usar paciente_id como clave única de conflicto para evitar fallos por ID numérico
      const { data, error } = await supabase.from('odontogramas').upsert(dbData, { onConflict: 'paciente_id' }).select().single();
      return { data, error };
    },
    'odontogramas',
    'UPSERT',
    dbData,
    { ...o, id: `tmp_${Date.now()}`, fecha: new Date().toISOString() } as unknown as Odontograma
  );
}


// ─── REPORTES Y CORRELATIVO ─────────────────────────────────────────────────
export async function getGlobalCorrelativo(): Promise<string> {
  if (isDemoSession()) {
    const next = parseInt(localStorage.getItem('ERGO_DEMO_CORR') || '0', 10) + 1;
    localStorage.setItem('ERGO_DEMO_CORR', next.toString());
    return `DOC-${next.toString().padStart(6, '0')}`;
  }
  try {
    const { data, error } = await supabase.rpc('next_correlativo');
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn("RPC next_correlativo no encontrado o falló. Usando serial de emergencia.");
    const fallback = `ERR-${Math.floor(Date.now()/1000)}`;
    return fallback;
  }
}

// ─── REGISTRO DE NUEVOS USUARIOS ─────────────────────────────────────────────

export async function signUpNewUser(email: string, password: string) {
  if (!IS_SUPABASE_CONNECTED) {
    return { data: {}, error: null };
  }
  // Suponiendo que Supabase está configurado para enviar confirmación
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre: email.split('@')[0],
      }
    }
  });
}

export async function verifyRegistrationOtp(email: string, token: string) {
  if (!IS_SUPABASE_CONNECTED) {
    return { data: {}, error: null };
  }
  return await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });
}

export async function resendRegistrationCode(email: string) {
  if (!IS_SUPABASE_CONNECTED) {
    return { data: {}, error: null };
  }
  return await supabase.auth.resend({
    type: 'signup',
    email,
  });
}

// --- Gestión de Usuarios (Aprobación y Roles) ---
export async function getProfiles(): Promise<Usuario[]> {
  if (isDemoSession()) return DEMO_USUARIOS;
  const { data, error } = await supabase.from('profiles').select('*').order('email');
  if (error) throw error;
  return mapKeys(data, toCamel) as Usuario[];
}

export async function updateProfile(p: Partial<Usuario> & { id: string }): Promise<Usuario> {
  if (isDemoSession()) {
    const idx = DEMO_USUARIOS.findIndex(u => u.id === p.id);
    if (idx !== -1) DEMO_USUARIOS[idx] = { ...DEMO_USUARIOS[idx], ...p };
    return DEMO_USUARIOS[idx];
  }
  const { id, ...rest } = p;
  const dbData = mapKeys(rest, toSnake);
  return await withOfflineSync<Usuario>(
    () => supabase.from('profiles').update(dbData).eq('id', id).select().single(),
    'profiles',
    'UPDATE',
    { ...dbData, id },
    p as unknown as Usuario
  );
}

export async function deleteProfile(id: string): Promise<void> {
  if (isDemoSession()) return;
  await withOfflineSync<void>(
    () => supabase.from('profiles').delete().eq('id', id) as any,
    'profiles',
    'DELETE',
    { id: id },
    undefined as void
  );
}
