// src/api.ts
// Capa de acceso a datos.

export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';
export const IS_DEMO_MODE = !APPS_SCRIPT_URL;

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
  { id: 'pac1', clinicaId: 'la-vina', nombre: 'José',      apellido: 'Hernández', cedula: 'V-12345678', fechaNacimiento: '1985-03-15', telefono: '0412-1112222', email: 'jose@gmail.com',       direccion: 'Av. Principal, Casa 5',    fechaRegistro: '2024-01-10', tipoReferencia: 'Profesional-Especialista', referidorNombre: 'Dr. Lugo (Cardiología)', referidorContacto: '0412-9990000' },
  { id: 'pac2', clinicaId: 'la-vina', nombre: 'Carmen',    apellido: 'López',     cedula: 'V-23456789', fechaNacimiento: '1992-07-22', telefono: '0414-2223333', email: 'carmen@gmail.com',     direccion: 'Calle 2, Apto 3B',         fechaRegistro: '2024-01-15', tipoReferencia: 'Paciente-Clinica',          referidorNombre: 'Clínica Ergodental' },
  { id: 'pac3', clinicaId: 'la-vina', nombre: 'Roberto',   apellido: 'Díaz',      cedula: 'V-34567890', fechaNacimiento: '1978-11-08', telefono: '0416-3334444', email: 'roberto@gmail.com',    direccion: 'Urb. Las Flores, Casa 12', fechaRegistro: '2024-02-03', tipoReferencia: 'Foraneo-30',                referidorNombre: 'Clínica Dental Valencia',  referidorContacto: '0241-1234567' },
  { id: 'pac4', clinicaId: 'la-vina', nombre: 'Valentina', apellido: 'Torres',    cedula: 'V-45678901', fechaNacimiento: '2001-05-30', telefono: '0424-4445555', email: 'valentina@gmail.com', direccion: 'Res. El Parque, Piso 4',   fechaRegistro: '2024-02-20', tipoReferencia: 'Foraneo-10',                referidorNombre: 'Casa Médica Caracas',       referidorContacto: '0212-5552222' },
  { id: 'pac5', clinicaId: 'la-vina', nombre: 'Miguel',    apellido: 'Ramírez',   cedula: 'V-56789012', fechaNacimiento: '1969-09-14', telefono: '0426-5556666', email: 'miguel@gmail.com',     direccion: 'Sector Norte, Mz 3 Casa 8', fechaRegistro: '2024-03-05', tipoReferencia: 'Paciente-Clinica',         referidorNombre: 'Clínica Ergodental' },
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

// ─── Cliente API (fetch con fallback demo) ────────────────────────────────────

const API_KEY = import.meta.env.VITE_API_KEY || 'ERGO_SECRET_2024';

// Simple memory cache (2 min)
const CACHE_TTL = 120 * 1000;
const apiCache = new Map<string, { data: any, timestamp: number }>();

const ACTION_FALLBACKS: Record<string, string[]> = {
  updateCita: ['actualizarCita', 'saveCita', 'editCita'],
  updatePaciente: ['actualizarPaciente', 'savePaciente', 'editPaciente'],
  updatePersonal: ['actualizarPersonal', 'savePersonal', 'editPersonal'],
  updateClinica: ['actualizarClinica', 'saveClinica', 'editClinica'],
  updatePresupuesto: ['actualizarPresupuesto', 'savePresupuesto', 'editPresupuesto'],
};

async function apiFetch<T>(action: string, data?: object): Promise<T> {
  const callApi = async (actionName: string): Promise<T> => {
    if (IS_DEMO_MODE) throw new Error('DEMO');

    const isQuery = actionName === 'login' || !data;
    const cacheKey = `${actionName}_${JSON.stringify(data || {})}`;

    // Check cache for queries
    if (isQuery && actionName !== 'login') {
      const cached = apiCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
      }
    }

    // En producción usamos el proxy de Vercel para ocultar la URL del script y la API KEY
    const isProd = import.meta.env.PROD;
    const baseUrl = isProd ? '/api/proxy' : APPS_SCRIPT_URL;

    const urlParams = new URLSearchParams();
    urlParams.set('action', actionName);
    urlParams.set('key', API_KEY);
    if (isQuery && data) urlParams.set('payload', JSON.stringify(data));

    const url = `${baseUrl}?${urlParams.toString()}`;

    const options: RequestInit = {
      method: isQuery ? 'GET' : 'POST',
      mode: 'cors',
      redirect: 'follow'
    };

    if (!isQuery) {
      options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      options.body = JSON.stringify(data || {});
      // Invalidate cache on mutations
      apiCache.clear();
    }

    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let result;

      try {
        result = JSON.parse(text);
      } catch (e) {
        if (text.includes('google-signin') || text.includes('Service Login')) {
          throw new Error('Permisos de Google: Abre el script en tu navegador y autorízalo.');
        }
        throw new Error('La base de datos no respondió correctamente. Revisa la URL.');
      }

      if (result.error) throw new Error(result.error);

      // Store in cache for successful queries
      if (isQuery && actionName !== 'login') {
        apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      return result;
    } catch (err: any) {
      console.error('API Error:', err);
      if (err.message.includes('Failed to fetch')) {
        throw new Error('Error de conexión. Revisa si la URL del script es correcta o si tu navegador bloquea a Google.');
      }
      throw err;
    }
  };

  const fallbackActions = ACTION_FALLBACKS[action] || [];

  try {
    return await callApi(action);
  } catch (error: any) {
    const message: string = error?.message || '';
    if (message.includes('Acción no reconocida') && fallbackActions.length) {
      for (const fallback of fallbackActions) {
        try {
          return await callApi(fallback);
        } catch (inner: any) {
          if (!inner.message.includes('Acción no reconocida')) throw inner;
        }
      }
    }
    throw error;
  }
}

// Auth
export async function loginUser(email: string, password: string): Promise<Usuario> {
  if (IS_DEMO_MODE) {
    const DEMO_CREDS: Record<string, string> = {
      'admin@ergodental.com':     'Ergodental2024!',
      'doctor@ergodental.com':    'Ergodental2024!',
      'asistente@ergodental.com': 'Ergodental2024!',
      'recepcion@ergodental.com': 'Ergodental2024!',
    };
    if (DEMO_CREDS[email] === password) {
      const user = DEMO_USUARIOS.find(u => u.email === email);
      if (user) return user;
    }
    throw new Error('Credenciales incorrectas');
  }
  return apiFetch<Usuario>('login', { email, password });
}

// Pacientes
export async function getPacientes(): Promise<Paciente[]> {
  if (IS_DEMO_MODE) return DEMO_PACIENTES;
  return apiFetch<Paciente[]>('getPacientes');
}

export async function createPaciente(p: Omit<Paciente, 'id' | 'fechaRegistro'>): Promise<Paciente> {
  if (IS_DEMO_MODE) {
    const nuevo: Paciente = { ...p, id: `pac${Date.now()}`, fechaRegistro: new Date().toISOString().split('T')[0] };
    DEMO_PACIENTES.unshift(nuevo);
    return nuevo;
  }
  return apiFetch<Paciente>('createPaciente', p);
}

export async function updatePaciente(p: Partial<Paciente> & { id: string }): Promise<Paciente> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_PACIENTES.findIndex(x => x.id === p.id);
    if (idx !== -1) DEMO_PACIENTES[idx] = { ...DEMO_PACIENTES[idx], ...p };
    return DEMO_PACIENTES[idx];
  }
  return apiFetch<Paciente>('updatePaciente', p);
}

export async function deletePaciente(id: string): Promise<void> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_PACIENTES.findIndex(x => x.id === id);
    if (idx !== -1) DEMO_PACIENTES.splice(idx, 1);
    return;
  }
  await apiFetch('deletePaciente', { id });
}

// Personal
export async function getPersonal(): Promise<Personal[]> {
  if (IS_DEMO_MODE) return DEMO_PERSONAL;
  return apiFetch<Personal[]>('getPersonal');
}

export async function createPersonal(p: Omit<Personal, 'id'>): Promise<Personal> {
  if (IS_DEMO_MODE) {
    const nuevo: Personal = { ...p, id: `per${Date.now()}` };
    DEMO_PERSONAL.unshift(nuevo);
    return nuevo;
  }
  return apiFetch<Personal>('createPersonal', p);
}

export async function updatePersonal(p: Partial<Personal> & { id: string }): Promise<Personal> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_PERSONAL.findIndex(x => x.id === p.id);
    if (idx !== -1) DEMO_PERSONAL[idx] = { ...DEMO_PERSONAL[idx], ...p };
    return DEMO_PERSONAL[idx];
  }
  return apiFetch<Personal>('updatePersonal', p);
}

export async function deletePersonal(id: string): Promise<void> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_PERSONAL.findIndex(x => x.id === id);
    if (idx !== -1) DEMO_PERSONAL.splice(idx, 1);
    return;
  }
  await apiFetch('deletePersonal', { id });
}

// Citas
export async function getCitas(): Promise<Cita[]> {
  if (IS_DEMO_MODE) return DEMO_CITAS;
  return apiFetch<Cita[]>('getCitas');
}

export async function createCita(c: Omit<Cita, 'id'>): Promise<Cita> {
  if (IS_DEMO_MODE) {
    const nueva: Cita = { ...c, id: `cit${Date.now()}` };
    DEMO_CITAS.unshift(nueva);
    return nueva;
  }
  return apiFetch<Cita>('createCita', c);
}

export async function updateCita(c: Partial<Cita> & { id: string }): Promise<Cita> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_CITAS.findIndex(x => x.id === c.id);
    if (idx !== -1) DEMO_CITAS[idx] = { ...DEMO_CITAS[idx], ...c };
    return DEMO_CITAS[idx];
  }
  return apiFetch<Cita>('updateCita', c);
}

export async function deleteCita(id: string): Promise<void> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_CITAS.findIndex(x => x.id === id);
    if (idx !== -1) DEMO_CITAS.splice(idx, 1);
    return;
  }
  await apiFetch('deleteCita', { id });
}

// Inventario
export async function getInventario(): Promise<ItemInventario[]> {
  if (IS_DEMO_MODE) return DEMO_INVENTARIO;
  return apiFetch<ItemInventario[]>('getInventario');
}

export async function createItemInventario(item: Omit<ItemInventario, 'id'>): Promise<ItemInventario> {
  if (IS_DEMO_MODE) {
    const nuevo: ItemInventario = { ...item, id: `inv${Date.now()}` };
    DEMO_INVENTARIO.push(nuevo);
    return nuevo;
  }
  return apiFetch<ItemInventario>('createItemInventario', item);
}

// Finanzas
export async function getPagos(): Promise<Pago[]> {
  if (IS_DEMO_MODE) return DEMO_PAGOS;
  return apiFetch<Pago[]>('getPagos');
}

export async function createPago(p: Omit<Pago, 'id'>): Promise<Pago> {
  if (IS_DEMO_MODE) {
    const nuevo: Pago = { ...p, id: `pg${Date.now()}` };
    DEMO_PAGOS.push(nuevo);
    return nuevo;
  }
  return apiFetch<Pago>('createPago', p);
}

export async function getEgresos(): Promise<Egreso[]> {
  if (IS_DEMO_MODE) return DEMO_EGRESOS;
  return apiFetch<Egreso[]>('getEgresos');
}

export async function createEgreso(e: Omit<Egreso, 'id'>): Promise<Egreso> {
  if (IS_DEMO_MODE) {
    const nuevo: Egreso = { ...e, id: `eg${Date.now()}` };
    DEMO_EGRESOS.push(nuevo);
    return nuevo;
  }
  return apiFetch<Egreso>('createEgreso', e);
}

export async function getProveedores(): Promise<Proveedor[]> {
  if (IS_DEMO_MODE) return DEMO_PROVEEDORES;
  return apiFetch<Proveedor[]>('getProveedores');
}

export async function createProveedor(p: Omit<Proveedor, 'id'>): Promise<Proveedor> {
  if (IS_DEMO_MODE) {
    const nuevo: Proveedor = { ...p, id: `pv${Date.now()}` };
    DEMO_PROVEEDORES.push(nuevo);
    return nuevo;
  }
  return apiFetch<Proveedor>('createProveedor', p);
}

export async function updateClinica(c: Clinica): Promise<Clinica> {
  if (IS_DEMO_MODE) {
    const idx = CLINICAS.findIndex(cl => cl.id === c.id);
    if (idx !== -1) CLINICAS[idx] = { ...c };
    return c;
  }
  return apiFetch<Clinica>('updateClinica', c);
}

// Tasa del Día
export async function getTasaHoy(): Promise<number | null> {
  if (IS_DEMO_MODE) return null; // Fallback a local en demo
  try {
    const res = await apiFetch<{ tasa: number }>('getTasaHoy');
    return res.tasa;
  } catch {
    return null;
  }
}

export async function saveTasaHoy(monto: number): Promise<void> {
  if (IS_DEMO_MODE) return;
  await apiFetch('saveTasaHoy', { monto });
}

// Presupuestos
export async function getPresupuestos(): Promise<Presupuesto[]> {
  if (IS_DEMO_MODE) return DEMO_PRESUPUESTOS;
  return apiFetch<Presupuesto[]>('getPresupuestos');
}

export async function createPresupuesto(p: Omit<Presupuesto, 'id'>): Promise<Presupuesto> {
  if (IS_DEMO_MODE) {
    const nuevo: Presupuesto = { ...p, id: `pres${Date.now()}` };
    DEMO_PRESUPUESTOS.push(nuevo);
    return nuevo;
  }
  return apiFetch<Presupuesto>('createPresupuesto', p);
}

export async function updatePresupuesto(data: Partial<Presupuesto> & { id: string }): Promise<void> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_PRESUPUESTOS.findIndex(p => p.id === data.id);
    if (idx !== -1) DEMO_PRESUPUESTOS[idx] = { ...DEMO_PRESUPUESTOS[idx], ...data };
    return;
  }
  await apiFetch('updatePresupuesto', data);
}

export async function deletePresupuesto(id: string): Promise<void> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_PRESUPUESTOS.findIndex(p => p.id === id);
    if (idx !== -1) DEMO_PRESUPUESTOS.splice(idx, 1);
    return;
  }
  await apiFetch('deletePresupuesto', { id });
}

// Recibos
export async function getRecibos(): Promise<Recibo[]> {
  if (IS_DEMO_MODE) return DEMO_RECIBOS;
  return apiFetch<Recibo[]>('getRecibos');
}

export async function createRecibo(r: Omit<Recibo, 'id'>): Promise<Recibo> {
  if (IS_DEMO_MODE) {
    const nuevo: Recibo = { ...r, id: `rec${Date.now()}` };
    DEMO_RECIBOS.push(nuevo);
    return nuevo;
  }
  return apiFetch<Recibo>('createRecibo', r);
}

export async function deleteRecibo(id: string): Promise<void> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_RECIBOS.findIndex(r => r.id === id);
    if (idx !== -1) DEMO_RECIBOS.splice(idx, 1);
    return;
  }
  await apiFetch('deleteRecibo', { id });
}

// Odontogramas
export async function getOdontograma(pacienteId: string): Promise<Odontograma | null> {
  if (IS_DEMO_MODE) {
    return DEMO_ODONTOGRAMAS.find(o => o.pacienteId === pacienteId) || null;
  }
  return apiFetch<Odontograma | null>('getOdontograma', { pacienteId });
}

export async function saveOdontograma(o: Omit<Odontograma, 'id' | 'fecha'>): Promise<Odontograma> {
  if (IS_DEMO_MODE) {
    const idx = DEMO_ODONTOGRAMAS.findIndex(old => old.pacienteId === o.pacienteId);
    const nuevo: Odontograma = { ...o, id: `odont${Date.now()}`, fecha: new Date().toISOString().split('T')[0] };
    if (idx !== -1) DEMO_ODONTOGRAMAS[idx] = nuevo;
    else DEMO_ODONTOGRAMAS.push(nuevo);
    return nuevo;
  }
  return apiFetch<Odontograma>('saveOdontograma', o);
}

// ─── REPORTES Y CORRELATIVO ─────────────────────────────────────────────────
export async function getGlobalCorrelativo(): Promise<string> {
  if (IS_DEMO_MODE) {
    const next = parseInt(localStorage.getItem('ERGO_DEMO_CORR') || '0', 10) + 1;
    localStorage.setItem('ERGO_DEMO_CORR', next.toString());
    return `DOC-${next.toString().padStart(6, '0')}`;
  }
  const result = await apiFetch<{correlativo: string}>('getGlobalCorrelativo');
  return result.correlativo;
}
