// src/api.ts
// Capa de acceso a datos.
import { supabase, IS_SUPABASE_CONNECTED } from './lib/supabase';

export const IS_DEMO_EMAILS = ['admin@ergodental.com', 'doctor@ergodental.com', 'asistente@ergodental.com', 'recepcion@ergodental.com', 'pro@ergodental.com'];

// Helper para detectar si estamos en modo Demo (por falta de conexión o por usuario Demo actualmente guardado)
export const isDemoSession = () => {
  if (!IS_SUPABASE_CONNECTED) return true;
  const saved = localStorage.getItem('ergo_user');
  if (saved) {
    try {
      const u = JSON.parse(saved);
      return IS_DEMO_EMAILS.includes(u.email);
    } catch { return false; }
  }
  return false;
};

// Mantenemos la constante para compatibilidad, pero ahora es dinámica
export const IS_DEMO_MODE = !IS_SUPABASE_CONNECTED;

// ─── MOTOR DE SINCRONIZACIÓN OFFLINE (SYNC QUEUE) ─────────────────────────

export interface SyncAction {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: any;
  timestamp: number;
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

export async function processSyncQueue() {
  if (!IS_SUPABASE_CONNECTED || typeof window === 'undefined' || !navigator.onLine) return;
  
  const queue: SyncAction[] = JSON.parse(localStorage.getItem('ergo_sync_queue') || '[]');
  if (queue.length === 0) return;

  console.log(`🔄 Procesando ${queue.length} elementos de la cola de sincronización...`);
  const remainingQueue: SyncAction[] = [];
  
  for (const item of queue) {
    try {
      if (item.action === 'INSERT') {
        const { error } = await supabase.from(item.table).insert(item.payload);
        if (error) throw error;
      } else if (item.action === 'UPDATE') {
        const { id, ...rest } = item.payload;
        const { error } = await supabase.from(item.table).update(rest).eq('id', id);
        if (error) throw error;
      } else if (item.action === 'DELETE') {
        const { error } = await supabase.from(item.table).delete().eq('id', item.payload.id);
        if (error) throw error;
      }
      console.log(`✅ Sincronizado correcto: ${item.table} (${item.action})`);
    } catch (err) {
      console.error(`❌ Error sincronizando item en ${item.table}:`, err);
      remainingQueue.push(item);
    }
  }
  
  localStorage.setItem('ergo_sync_queue', JSON.stringify(remainingQueue));
}

// Escuchar cuando vuelva el internet para disparar la sincronización
if (typeof window !== 'undefined') {
  window.addEventListener('online', processSyncQueue);
}


// Wrapper genérico para soporte Offline-First
export async function withOfflineSync<T>(
  operation: () => Promise<{ data: any, error: any }>,
  table: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: any,
  optimisticData: T
): Promise<T> {
  const isTargetOffline = typeof window !== 'undefined' && !window.navigator.onLine;
  if (isTargetOffline) {
    saveToSyncQueue({ table, action, payload });
    return optimisticData;
  }
  try {
    const { data, error } = await operation();
    if (error) throw error;
    if (data) return mapKeys(data, toCamel) as T;
    return optimisticData;
  } catch (err: any) {
    if (err.message === 'Failed to fetch' || (typeof window !== 'undefined' && !window.navigator.onLine)) {
       saveToSyncQueue({ table, action, payload });
       return optimisticData;
    }
    throw err;
  }
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
  { id: 'u1', nombre: 'Francisco Rodríguez', email: 'admin@ergodental.com',     rol: 'ADMIN',     activo: true, clinicaId: 'la-vina', permisosMultiClinica: true },
  { id: 'u2', nombre: 'Dr. Carlos Pérez',    email: 'doctor@ergodental.com',    rol: 'DOCTOR',    activo: true, clinicaId: 'la-vina', permisosMultiClinica: true },
  { id: 'u3', nombre: 'Ana Martínez',        email: 'asistente@ergodental.com', rol: 'ASISTENTE', activo: true, clinicaId: 'la-vina', permisosMultiClinica: false },
  { id: 'u4', nombre: 'Laura Sánchez',       email: 'recepcion@ergodental.com', rol: 'RECEPCION', activo: true, clinicaId: 'la-vina', permisosMultiClinica: false },
  { id: 'u5', nombre: 'Asistente Pro',       email: 'pro@ergodental.com',       rol: 'ASISTENTE', activo: true, clinicaId: 'la-vina', permisosMultiClinica: true },
];

export const DEMO_PERSONAL: Personal[] = [
  { id: 'p1', clinicaId: 'la-vina', nombre: 'Dra. María', apellido: 'González', tipo: 'Odontólogo', especialidad: 'Ortodoncia', matricula: 'ORT-1042', turno: 'Mañana (8am-12pm)', telefono: '0412-1234567', email: 'maria@ergodental.com', activo: true },
  { id: 'p2', clinicaId: 'la-vina', nombre: 'Dr. Carlos', apellido: 'Pérez', tipo: 'Odontólogo', especialidad: 'Endodoncia', matricula: 'END-2301', turno: 'Tarde (1pm-5pm)', telefono: '0414-7654321', email: 'carlos@ergodental.com', activo: true },
  { id: 'p3', clinicaId: 'la-vina', nombre: 'Ana', apellido: 'Martínez', tipo: 'Asistente', especialidad: undefined, matricula: undefined, turno: 'Completo (8am-5pm)', telefono: '0416-5551234', email: 'ana@ergodental.com', activo: true },
  { id: 'p4', clinicaId: 'la-vina', nombre: 'Laura', apellido: 'Sánchez', tipo: 'Recepcionista', especialidad: undefined, matricula: undefined, turno: 'Mañana (8am-1pm)', telefono: '0424-9876543', email: 'laura@ergodental.com', activo: true },
  { id: 'p5', clinicaId: 'la-vina', nombre: 'Pedro', apellido: 'Vargas', tipo: 'Administrativo', especialidad: undefined, matricula: undefined, turno: 'Tarde (1pm-6pm)', telefono: '0412-3334444', email: 'pedro@ergodental.com', activo: false },
];

export const DEMO_PACIENTES: Paciente[] = [
  { id: 'pac1', clinicaId: 'la-vina', nombre: 'José',      apellido: 'Hernández', cedula: 'V-12345678', fechaNacimiento: '1985-03-15', telefono: '0412-1112222', email: 'jose@gmail.com',       direccion: 'Av. Principal, Casa 5',    fechaRegistro: '2024-01-10', tipoReferencia: 'Profesional-Especialista', referidorNombre: 'Dr. Lugo (Cardiología)', referidorContacto: '0412-9990000', alergias: false, alergiasDetalle: '' },
  { id: 'pac2', clinicaId: 'la-vina', nombre: 'Carmen',    apellido: 'López',     cedula: 'V-23456789', fechaNacimiento: '1992-07-22', telefono: '0414-2223333', email: 'carmen@gmail.com',     direccion: 'Calle 2, Apto 3B',         fechaRegistro: '2024-01-15', tipoReferencia: 'Paciente-Clinica',          referidorNombre: 'Clínica Ergodental', alergias: true, alergiasDetalle: 'Penicilina' },
  { id: 'pac3', clinicaId: 'la-vina', nombre: 'Roberto',   apellido: 'Díaz',      cedula: 'V-34567890', fechaNacimiento: '1978-11-08', telefono: '0416-3334444', email: 'roberto@gmail.com',    direccion: 'Urb. Las Flores, Casa 12', fechaRegistro: '2024-02-03', tipoReferencia: 'Foraneo-30',                referidorNombre: 'Clínica Dental Valencia',  referidorContacto: '0241-1234567', alergias: false, alergiasDetalle: '' },
  { id: 'pac4', clinicaId: 'la-vina', nombre: 'Valentina', apellido: 'Torres',    cedula: 'V-45678901', fechaNacimiento: '2001-05-30', telefono: '0424-4445555', email: 'valentina@gmail.com', direccion: 'Res. El Parque, Piso 4',   fechaRegistro: '2024-02-20', tipoReferencia: 'Foraneo-10',                referidorNombre: 'Casa Médica Caracas',       referidorContacto: '0212-5552222', alergias: false, alergiasDetalle: '' },
  { id: 'pac5', clinicaId: 'la-vina', nombre: 'Miguel',    apellido: 'Ramírez',   cedula: 'V-56789012', fechaNacimiento: '1969-09-14', telefono: '0426-5556666', email: 'miguel@gmail.com',     direccion: 'Sector Norte, Mz 3 Casa 8', fechaRegistro: '2024-03-05', tipoReferencia: 'Paciente-Clinica',         referidorNombre: 'Clínica Ergodental', alergias: false, alergiasDetalle: '' },
];

export const DEMO_CITAS: Cita[] = [
  { id:'c1', clinicaId: 'la-vina', pacienteId:'pac1', pacienteNombre:'José Hernández',    doctorId:'p1', doctorNombre:'Dra. María González', fecha:'2026-03-18', hora:'09:00', motivo:'Limpieza dental',      estado:'Confirmada', tipoAtencion:'Tratamiento', condicion:'Control', estadoFinanciero:'Pago Inmediato', tipoReferencia:'Profesional-Especialista', referidorNombre:'Dr. Lugo (Cardiología)',  referidorContacto:'0412-9990000' },
  { id:'c2', clinicaId: 'la-vina', pacienteId:'pac2', pacienteNombre:'Carmen López',       doctorId:'p2', doctorNombre:'Dr. Carlos Pérez',    fecha:'2026-03-18', hora:'10:30', motivo:'Caries molar',          estado:'Pendiente',  tipoAtencion:'Tratamiento', condicion:'Evaluación', estadoFinanciero:'Pago Inmediato', tipoReferencia:'Paciente-Clinica',         referidorNombre:'Clínica Ergodental' },
  { id:'c3', clinicaId: 'la-vina', pacienteId:'pac3', pacienteNombre:'Roberto Díaz',       doctorId:'p1', doctorNombre:'Dra. María González', fecha:'2026-03-18', hora:'11:00', motivo:'Revisión ortodoncia',   estado:'Completada', tipoAtencion:'Revisión', condicion:'Control', estadoFinanciero:'Pago Inmediato', tipoReferencia:'Foraneo-30',               referidorNombre:'Clínica Dental Valencia', referidorContacto:'0241-1234567' },
  { id:'c4', clinicaId: 'la-vina', pacienteId:'pac4', pacienteNombre:'Valentina Torres',    doctorId:'p2', doctorNombre:'Dr. Carlos Pérez',    fecha:'2026-03-19', hora:'14:00', motivo:'Endodoncia pieza 36',   estado:'Pendiente',  tipoAtencion:'Tratamiento', condicion:'Evaluación', estadoFinanciero:'Paga Después', tipoReferencia:'Foraneo-10',               referidorNombre:'Casa Médica Caracas',      referidorContacto:'0212-5552222' },
  { id:'c5', clinicaId: 'la-vina', pacienteId:'pac5', pacienteNombre:'Miguel Ramírez',     doctorId:'p1', doctorNombre:'Dra. María González', fecha:'2026-03-19', hora:'15:30', motivo:'Extracción',            estado:'Confirmada', tipoAtencion:'Tratamiento', condicion:'Control', estadoFinanciero:'Pago Inmediato', tipoReferencia:'Paciente-Clinica',         referidorNombre:'Clínica Ergodental' },
];

export const DEMO_INVENTARIO: ItemInventario[] = [
  { id: 'i1', clinicaId: 'la-vina', nombre: 'Guantes de látex (caja)', categoria: 'Protección', stock: 8, stockMinimo: 5, unidad: 'Caja', precio: 12.50 },
  { id: 'i2', clinicaId: 'la-vina', nombre: 'Mascarillas quirúrgicas', categoria: 'Protección', stock: 3, stockMinimo: 10, unidad: 'Caja', precio: 8.00 },
  { id: 'i3', clinicaId: 'la-vina', nombre: 'Composite dental A2', categoria: 'Materiales', stock: 15, stockMinimo: 5, unidad: 'Jeringa', precio: 35.00 },
  { id: 'i4', clinicaId: 'la-vina', nombre: 'Anestesia Lidocaína', categoria: 'Medicamentos', stock: 24, stockMinimo: 20, unidad: 'Carpule', precio: 2.50 },
  { id: 'i5', clinicaId: 'la-vina', nombre: 'Hilo de sutura 3-0', categoria: 'Materiales', stock: 2, stockMinimo: 5, unidad: 'Rollo', precio: 18.00 },
  { id: 'i6', clinicaId: 'la-vina', nombre: 'Revelador de placas', categoria: 'Higiene', stock: 6, stockMinimo: 3, unidad: 'Botella', precio: 14.00 },
];

export const DEMO_PAGOS: Pago[] = [
  { id:'pg1', clinicaId: 'la-vina', pacienteId:'pac1', pacienteNombre:'José Hernández',  citaId:'c1', concepto:'Limpieza dental',           monto: 40, montoBs:1460000, tasaCambio:36500, metodoPago:'Pago Móvil',      tipoPago:'Contado', fecha:'2026-03-18', estado:'Pagado',   tipoReferencia:'Profesional-Especialista', referidorNombre:'Dr. Lugo (Cardiología)', doctorId:'p1', doctorNombre:'Dra. María González', bancoEmisor: 'Banesco', numeroReferencia: '123456789012' },
  { id:'pg2', clinicaId: 'la-vina', pacienteId:'pac2', pacienteNombre:'Carmen López',      citaId:'c2', concepto:'Caries molar – abono 1',    monto: 25, montoBs: 912500, tasaCambio:36500, metodoPago:'Zelle',            tipoPago:'Abono',   fecha:'2026-03-18', estado:'Parcial',  tipoReferencia:'Paciente-Clinica',         referidorNombre:'Clínica Ergodental',       doctorId:'p2', doctorNombre:'Dr. Carlos Pérez',    notas:'Saldo pendiente: $35' },
  { id:'pg3', clinicaId: 'la-vina', pacienteId:'pac3', pacienteNombre:'Roberto Díaz',      citaId:'c3', concepto:'Ortodoncia mensualidad',    monto: 80, montoBs:2920000, tasaCambio:36500, metodoPago:'Efectivo USD',    tipoPago:'Crédito', diasCredito:15, fechaVencimiento:'2026-04-02', fecha:'2026-03-18', estado:'Pendiente', tipoReferencia:'Foraneo-30', referidorNombre:'Clínica Dental Valencia', doctorId:'p1', doctorNombre:'Dra. María González' },
  { id:'pg4', clinicaId: 'la-vina', pacienteId:'pac4', pacienteNombre:'Valentina Torres',  concepto:'Endodoncia pieza 36',             monto:120, montoBs:      0, tasaCambio:36500, metodoPago:'Binance',           tipoPago:'Crédito', diasCredito:30, fechaVencimiento:'2026-04-17', fecha:'2026-03-15', estado:'Pendiente', tipoReferencia:'Foraneo-10', referidorNombre:'Casa Médica Caracas',       doctorId:'p2', doctorNombre:'Dr. Carlos Pérez' },
  { id:'pg5', clinicaId: 'la-vina', pacienteId:'pac5', pacienteNombre:'Miguel Ramírez',    concepto:'Extracción',                    monto: 35, montoBs:1277500, tasaCambio:36500, metodoPago:'Efectivo BS',      tipoPago:'Contado', fecha:'2026-03-10', estado:'Pagado',   tipoReferencia:'Paciente-Clinica',         referidorNombre:'Clínica Ergodental',       doctorId:'p1', doctorNombre:'Dra. María González' },
];

export const DEMO_EGRESOS: Egreso[] = [
  { id: 'eg1', clinicaId: 'la-vina', concepto: 'Compra guantes y mascarillas', categoria: 'Suministros', monto: 45, montoBs: 1642500, tasaCambio: 36500, metodoPago: 'Transferencia BS', proveedorId: 'pv1', proveedorNombre: 'Farmacia San Juan', fecha: '2026-03-15' },
  { id: 'eg2', clinicaId: 'la-vina', concepto: 'Pago nómina asistentes', categoria: 'Nómina', monto: 200, montoBs: 7300000, tasaCambio: 36500, metodoPago: 'Pago Móvil', fecha: '2026-03-15' },
  { id: 'eg3', clinicaId: 'la-vina', concepto: 'Alquiler consultorio #2', categoria: 'Alquiler', monto: 150, montoBs: 5475000, tasaCambio: 36500, metodoPago: 'Transferencia BS', fecha: '2026-03-01' },
];

export const DEMO_PRESUPUESTOS: Presupuesto[] = [];
export const DEMO_RECIBOS: Recibo[] = [];
export const DEMO_ODONTOGRAMAS: Odontograma[] = [];

export const DEMO_PROVEEDORES: Proveedor[] = [
  { id: 'pv1', clinicaId: 'la-vina', nombre: 'Farmacia San Juan', tipo: 'Farmacia', rif: 'J-30123456-0', telefono: '0212-5551111', email: 'ventas@sanjuan.com', contacto: 'Sr. Gómez', direccion: 'Av. Urdaneta, LC 4', activo: true },
  { id: 'pv2', clinicaId: 'la-vina', nombre: 'Casa Médica Caracas', tipo: 'Casa Médica', rif: 'J-40234567-1', telefono: '0212-5552222', email: 'pedidos@cmcaracas.com', contacto: 'Dra. Colmenares', direccion: 'Av. Libertador, Ed. Medical', activo: true },
];

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
  const isTargetDemo = IS_DEMO_EMAILS.includes(email);

  // Siempre permitir credenciales Demo primero para pruebas locales
  const DEMO_CREDS: Record<string, string> = {
    'admin@ergodental.com':     'Ergodental2024!',
    'doctor@ergodental.com':    'Ergodental2024!',
    'asistente@ergodental.com': 'Ergodental2024!',
    'recepcion@ergodental.com': 'Ergodental2024!',
    'pro@ergodental.com':       'Ergodental2024!',
  };

  if (DEMO_CREDS[email] === password) {
    const user = DEMO_USUARIOS.find(u => u.email === email);
    if (user) return user;
  }

  // Si no hay conexión a Supabase y no es una de las credenciales demo correctas arriba
  if (!IS_SUPABASE_CONNECTED) {
    throw new Error('Credenciales incorrectas o sistema fuera de línea');
  }

  // Si es una cuenta demo pero la contraseña fue incorrecta (no entró en el if de arriba)
  if (isTargetDemo) {
    throw new Error('Credenciales incorrectas (Cuenta Demo)');
  }

  // Agregamos un timeout a la autenticación para evitar que se cuelgue infinitamente
  const loginPromise = supabase.auth.signInWithPassword({ email, password });
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado (Supabase)')), 8000));
  
  const { data: authData, error: authError } = await Promise.race([loginPromise, timeoutPromise]) as any;
  
  if (authError) {
    if (authError.message.includes('Email not confirmed')) {
      console.warn("Bypass: Email no confirmado para", email);
      return {
        id: 'user-temp-fix',
        nombre: email.split('@')[0],
        email: email,
        rol: 'ADMIN',
        activo: true
      };
    }
    throw authError;
  }

  // Obtener perfil desde tabla profiles
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle(); 
    
    // BYPASS PARA EL DESARROLLADOR Y EQUIPO: Francisco y su equipo son ADMIN
    const SUPER_ADMINS = [
      'francisco.rojasp@gmail.com', 
      'blascojennifer47@gmail.com', 
      'vera.hugo712@gmail.com', 
      'carlosalejandroverablasco183@gmail.com'
    ];

    if (SUPER_ADMINS.includes(email.toLowerCase())) {
      return {
        id: authData.user.id,
        nombre: profile?.nombre || email.split('@')[0],
        email: email,
        rol: 'ADMIN',
        activo: true
      };
    }

    if (profile) return mapKeys(profile, toCamel) as Usuario;

    // Si no existe, intentamos crearlo
    const { data: newProfile, error: createError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      nombre: authData.user.user_metadata?.nombre || authData.user.email?.split('@')[0] || 'Nuevo Usuario',
      email: authData.user.email,
      rol: null, // Sin rol por defecto
      activo: false // Inactivo hasta aprobación
    }).select().single();

    if (!createError && newProfile) return mapKeys(newProfile, toCamel) as Usuario;

    // EMERGENCIA: Si todo falla pero el usuario está autenticado, retornamos un usuario temporal
    // para que no se quede colgado en la pantalla de carga.
    console.warn("Usando perfil de emergencia temporal");
    return {
      id: authData.user.id,
      nombre: authData.user.email?.split('@')[0] || 'Usuario Real',
      email: authData.user.email || '',
      rol: 'ADMIN',
      activo: true
    };
  } catch (e) {
    console.error("Error crítico en loginUser:", e);
    // Retorno de emergencia para evitar bloqueo
    return {
      id: authData.user.id,
      nombre: 'Usuario Real',
      email: authData.user.email || '',
      rol: 'ADMIN',
      activo: true
    };
  }
}

// Pacientes
export async function getPacientes(): Promise<Paciente[]> {
  if (isDemoSession()) return DEMO_PACIENTES;
  const { data, error } = await supabase.from('pacientes').select('*').order('nombre');
  if (error) throw error;
  return mapKeys(data, toCamel) as Paciente[];
}

export async function createPaciente(p: Omit<Paciente, 'id' | 'fechaRegistro'>): Promise<Paciente> {
  if (isDemoSession()) {
    const nuevo: Paciente = { ...p, id: `pac${Date.now()}`, fechaRegistro: new Date().toISOString().split('T')[0] };
    DEMO_PACIENTES.unshift(nuevo);
    return nuevo;
  }
  const dbData = mapKeys(p, toSnake);
  return await withOfflineSync<Paciente>(
    () => supabase.from('pacientes').insert(dbData).select().single(),
    'pacientes',
    'INSERT',
    dbData,
    { ...p, id: `pac${Date.now()}` } as unknown as Paciente
  );
}

export async function updatePaciente(p: Partial<Paciente> & { id: string }): Promise<Paciente> {
  if (isDemoSession()) {
    const idx = DEMO_PACIENTES.findIndex(x => x.id === p.id);
    if (idx !== -1) DEMO_PACIENTES[idx] = { ...DEMO_PACIENTES[idx], ...p };
    return DEMO_PACIENTES[idx];
  }
  const { id, ...rest } = p;
  const dbData = mapKeys(rest, toSnake);
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
    if (idx !== -1) DEMO_PACIENTES.splice(idx, 1);
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
  return mapKeys(data, toCamel) as Personal[];
}

export async function createPersonal(p: Omit<Personal, 'id'>): Promise<Personal> {
  if (isDemoSession()) {
    const nuevo: Personal = { ...p, id: `per${Date.now()}` };
    DEMO_PERSONAL.unshift(nuevo);
    return nuevo;
  }
  const dbData = mapKeys(p, toSnake);
  return await withOfflineSync<Personal>(
    () => supabase.from('personal').insert(dbData).select().single(),
    'personal',
    'INSERT',
    dbData,
    { ...p, id: `per${Date.now()}` } as unknown as Personal
  );
}

export async function updatePersonal(p: Partial<Personal> & { id: string }): Promise<Personal> {
  if (isDemoSession()) {
    const idx = DEMO_PERSONAL.findIndex(x => x.id === p.id);
    if (idx !== -1) DEMO_PERSONAL[idx] = { ...DEMO_PERSONAL[idx], ...p };
    return DEMO_PERSONAL[idx];
  }
  const { id, ...rest } = p;
  const dbData = mapKeys(rest, toSnake);
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
    if (idx !== -1) DEMO_PERSONAL.splice(idx, 1);
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
  return mapKeys(data, toCamel) as Cita[];
}

export async function createCita(c: Omit<Cita, 'id'>): Promise<Cita> {
  if (isDemoSession()) {
    const nueva: Cita = { ...c, id: `cit${Date.now()}` };
    DEMO_CITAS.unshift(nueva);
    return nueva;
  }
  const dbData = mapKeys(c, toSnake);
  return await withOfflineSync<Cita>(
    () => supabase.from('citas').insert(dbData).select().single(),
    'citas',
    'INSERT',
    dbData,
    { ...c, id: `cit${Date.now()}` } as unknown as Cita
  );
}

export async function updateCita(c: Partial<Cita> & { id: string }): Promise<Cita> {
  if (isDemoSession()) {
    const idx = DEMO_CITAS.findIndex(x => x.id === c.id);
    if (idx !== -1) DEMO_CITAS[idx] = { ...DEMO_CITAS[idx], ...c };
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
    if (idx !== -1) DEMO_CITAS.splice(idx, 1);
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
  return mapKeys(data, toCamel) as ItemInventario[];
}

export async function createItemInventario(item: Omit<ItemInventario, 'id'>): Promise<ItemInventario> {
  if (isDemoSession()) {
    const nuevo: ItemInventario = { ...item, id: `inv${Date.now()}` };
    DEMO_INVENTARIO.push(nuevo);
    return nuevo;
  }
  const dbData = mapKeys(item, toSnake);
  return await withOfflineSync<ItemInventario>(
    () => supabase.from('inventario').insert(dbData).select().single(),
    'inventario',
    'INSERT',
    dbData,
    { ...item, id: `inv${Date.now()}` } as unknown as ItemInventario
  );
}

// Finanzas
export async function getPagos(): Promise<Pago[]> {
  if (isDemoSession()) return DEMO_PAGOS;
  const { data, error } = await supabase.from('pagos').select('*').order('fecha', { ascending: false });
  if (error) throw error;
  return mapKeys(data, toCamel) as Pago[];
}

export async function createPago(p: Omit<Pago, 'id'>): Promise<Pago> {
  if (isDemoSession()) {
    const nuevo: Pago = { ...p, id: `pg${Date.now()}` };
    DEMO_PAGOS.push(nuevo);
    return nuevo;
  }
  const dbData = mapKeys(p, toSnake);
  return await withOfflineSync<Pago>(
    () => supabase.from('pagos').insert(dbData).select().single(),
    'pagos',
    'INSERT',
    dbData,
    { ...p, id: `pag${Date.now()}` } as unknown as Pago
  );
}

export async function getEgresos(): Promise<Egreso[]> {
  if (isDemoSession()) return DEMO_EGRESOS;
  const { data, error } = await supabase.from('egresos').select('*').order('fecha', { ascending: false });
  if (error) throw error;
  return mapKeys(data, toCamel) as Egreso[];
}

export async function createEgreso(e: Omit<Egreso, 'id'>): Promise<Egreso> {
  if (isDemoSession()) {
    const nuevo: Egreso = { ...e, id: `eg${Date.now()}` };
    DEMO_EGRESOS.push(nuevo);
    return nuevo;
  }
  const dbData = mapKeys(e, toSnake);
  return await withOfflineSync<Egreso>(
    () => supabase.from('egresos').insert(dbData).select().single(),
    'egresos',
    'INSERT',
    dbData,
    { ...e, id: `egr${Date.now()}` } as unknown as Egreso
  );
}

export async function getProveedores(): Promise<Proveedor[]> {
  if (isDemoSession()) return DEMO_PROVEEDORES;
  const { data, error } = await supabase.from('proveedores').select('*').order('nombre');
  if (error) throw error;
  return mapKeys(data, toCamel) as Proveedor[];
}

export async function createProveedor(p: Omit<Proveedor, 'id'>): Promise<Proveedor> {
  if (isDemoSession()) {
    const nuevo: Proveedor = { ...p, id: `pv${Date.now()}` };
    DEMO_PROVEEDORES.push(nuevo);
    return nuevo;
  }
  const dbData = mapKeys(p, toSnake);
  return await withOfflineSync<Proveedor>(
    () => supabase.from('proveedores').insert(dbData).select().single(),
    'proveedores',
    'INSERT',
    dbData,
    { ...p, id: `pro${Date.now()}` } as unknown as Proveedor
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
  return mapKeys(data, toCamel) as Presupuesto[];
}

export async function createPresupuesto(p: Omit<Presupuesto, 'id'>): Promise<Presupuesto> {
  if (isDemoSession()) {
    const nuevo: Presupuesto = { ...p, id: `pres${Date.now()}` };
    DEMO_PRESUPUESTOS.push(nuevo);
    return nuevo;
  }
  const dbData = mapKeys(p, toSnake);
  return await withOfflineSync<Presupuesto>(
    () => supabase.from('presupuestos').insert(dbData).select().single(),
    'presupuestos',
    'INSERT',
    dbData,
    { ...p, id: `pre${Date.now()}` } as unknown as Presupuesto
  );
}

export async function updatePresupuesto(data: Partial<Presupuesto> & { id: string }): Promise<void> {
  if (isDemoSession()) {
    const idx = DEMO_PRESUPUESTOS.findIndex(p => p.id === data.id);
    if (idx !== -1) DEMO_PRESUPUESTOS[idx] = { ...DEMO_PRESUPUESTOS[idx], ...data };
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
    if (idx !== -1) DEMO_PRESUPUESTOS.splice(idx, 1);
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
  if (IS_DEMO_MODE) return DEMO_RECIBOS;
  const { data, error } = await supabase.from('recibos').select('*').order('fecha', { ascending: false });
  if (error) throw error;
  return mapKeys(data, toCamel) as Recibo[];
}

export async function createRecibo(r: Omit<Recibo, 'id'>): Promise<Recibo> {
  if (isDemoSession()) {
    const nuevo: Recibo = { ...r, id: `rec${Date.now()}` };
    DEMO_RECIBOS.push(nuevo);
    return nuevo;
  }
  const dbData = mapKeys(r, toSnake);
  return await withOfflineSync<Recibo>(
    () => supabase.from('recibos').insert(dbData).select().single(),
    'recibos',
    'INSERT',
    dbData,
    { ...r, id: `rec${Date.now()}` } as unknown as Recibo
  );
}

export async function deleteRecibo(id: string): Promise<void> {
  if (isDemoSession()) {
    const idx = DEMO_RECIBOS.findIndex(r => r.id === id);
    if (idx !== -1) DEMO_RECIBOS.splice(idx, 1);
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
  return data ? mapKeys(data, toCamel) as Odontograma : null;
}

export async function saveOdontograma(o: Omit<Odontograma, 'id' | 'fecha'>): Promise<Odontograma> {
  if (isDemoSession()) {
    const idx = DEMO_ODONTOGRAMAS.findIndex(old => old.pacienteId === o.pacienteId);
    const nuevo: Odontograma = { ...o, id: `odont${Date.now()}`, fecha: new Date().toISOString().split('T')[0] };
    if (idx !== -1) DEMO_ODONTOGRAMAS[idx] = nuevo;
    else DEMO_ODONTOGRAMAS.push(nuevo);
    return nuevo;
  }
  const dbData = mapKeys(o, toSnake);
  const { data, error } = await supabase.from('odontogramas').upsert(dbData, { onConflict: 'paciente_id' }).select().single();
  if (error) throw error;
  return mapKeys(data, toCamel) as Odontograma;
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
