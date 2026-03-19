// src/permissions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Módulo central de permisos – Ergodental RBAC
// Basado en estándares de sistemas clínicos dentales (Dentrix, Dental Cloud,
// Carestream Dental) y regulaciones HIPAA de acceso mínimo necesario.
// ─────────────────────────────────────────────────────────────────────────────

import type { Rol } from './api';

// ── Módulos del sistema ───────────────────────────────────────────────────────
export type Modulo =
  | 'dashboard'
  | 'pacientes'
  | 'citas'
  | 'personal'
  | 'odontograma'
  | 'finanzas'
  | 'inventario'
  | 'proveedores'
  | 'configuracion';

// ── Acciones posibles ─────────────────────────────────────────────────────────
export type Accion = 'ver' | 'crear' | 'editar' | 'eliminar' | 'exportar';

// ── Matriz de permisos por módulo y rol ───────────────────────────────────────
// Principio: privilegio mínimo necesario para cada función clínica.
// ADMIN   → control total + auditoría + finanzas + configuración
// DOCTOR  → acceso clínico completo (pacientes + odontograma) + ver personal
// ASISTENTE → apoyo clínico (citas + odontograma read) + inventario
// RECEPCION → front-desk (pacientes + citas) sin acceso clínico ni financiero
type PermisoModulo = {
  rolesConAcceso: Rol[];
  acciones: Partial<Record<Accion, Rol[]>>;
};

export const PERMISSIONS: Record<Modulo, PermisoModulo> = {
  dashboard: {
    rolesConAcceso: ['ADMIN', 'DOCTOR', 'ASISTENTE', 'RECEPCION'],
    acciones: {
      ver: ['ADMIN', 'DOCTOR', 'ASISTENTE', 'RECEPCION'],
    },
  },

  pacientes: {
    rolesConAcceso: ['ADMIN', 'DOCTOR', 'ASISTENTE', 'RECEPCION'],
    acciones: {
      ver:      ['ADMIN', 'DOCTOR', 'ASISTENTE', 'RECEPCION'],
      crear:    ['ADMIN', 'DOCTOR', 'RECEPCION'],  // Asistente no crea pacientes
      editar:   ['ADMIN', 'DOCTOR'],               // Solo médico y admin editan historia
      eliminar: ['ADMIN'],                          // Solo admin puede eliminar
      exportar: ['ADMIN', 'DOCTOR'],
    },
  },

  citas: {
    rolesConAcceso: ['ADMIN', 'DOCTOR', 'ASISTENTE', 'RECEPCION'],
    acciones: {
      ver:      ['ADMIN', 'DOCTOR', 'ASISTENTE', 'RECEPCION'],
      crear:    ['ADMIN', 'DOCTOR', 'RECEPCION'],  // Recepción agenda citas
      editar:   ['ADMIN', 'DOCTOR', 'RECEPCION'],
      eliminar: ['ADMIN'],
    },
  },

  personal: {
    // Solo ADMIN y DOCTOR ven el equipo (DOCTOR puede ver a sus colegas)
    rolesConAcceso: ['ADMIN', 'DOCTOR'],
    acciones: {
      ver:      ['ADMIN', 'DOCTOR'],
      crear:    ['ADMIN'],   // Solo admin crea cuentas de personal
      editar:   ['ADMIN'],
      eliminar: ['ADMIN'],
    },
  },

  odontograma: {
    // Asistente puede VER pero no modificar diagnósticos clínicos
    rolesConAcceso: ['ADMIN', 'DOCTOR', 'ASISTENTE'],
    acciones: {
      ver:    ['ADMIN', 'DOCTOR', 'ASISTENTE'],
      crear:  ['ADMIN', 'DOCTOR'],
      editar: ['ADMIN', 'DOCTOR'],
    },
  },

  finanzas: {
    // Exclusivo ADMIN — principio de segregación de funciones financieras
    rolesConAcceso: ['ADMIN'],
    acciones: {
      ver:      ['ADMIN'],
      crear:    ['ADMIN'],
      editar:   ['ADMIN'],
      eliminar: ['ADMIN'],
      exportar: ['ADMIN'],
    },
  },

  inventario: {
    // ADMIN gestiona, DOCTOR y ASISTENTE consultan stock
    rolesConAcceso: ['ADMIN', 'DOCTOR', 'ASISTENTE'],
    acciones: {
      ver:      ['ADMIN', 'DOCTOR', 'ASISTENTE'],
      crear:    ['ADMIN'],
      editar:   ['ADMIN'],
      eliminar: ['ADMIN'],
    },
  },

  proveedores: {
    // Solo ADMIN — información de contratos y proveedores es confidencial
    rolesConAcceso: ['ADMIN'],
    acciones: {
      ver:      ['ADMIN'],
      crear:    ['ADMIN'],
      editar:   ['ADMIN'],
      eliminar: ['ADMIN'],
    },
  },
  configuracion: {
    rolesConAcceso: ['ADMIN'],
    acciones: {
      ver: ['ADMIN'],
      editar: ['ADMIN'],
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** ¿El rol tiene acceso al módulo? */
export function canAccess(rol: Rol | undefined, modulo: Modulo): boolean {
  if (!rol) return false;
  return PERMISSIONS[modulo].rolesConAcceso.includes(rol);
}

/** ¿El rol puede realizar una acción específica en un módulo? */
export function canDo(rol: Rol | undefined, modulo: Modulo, accion: Accion): boolean {
  if (!rol) return false;
  const allowed = PERMISSIONS[modulo].acciones[accion];
  if (!allowed) return false;
  return allowed.includes(rol);
}

// ── Mapa Módulo ↔ Ruta ─────────────────────────────────────────────────────────
export const RUTA_MODULO: Record<string, Modulo> = {
  '/dashboard':   'dashboard',
  '/pacientes':   'pacientes',
  '/citas':       'citas',
  '/personal':    'personal',
  '/odontograma': 'odontograma',
  '/finanzas':    'finanzas',
  '/inventario':  'inventario',
  '/proveedores': 'proveedores',
  '/configuracion': 'configuracion',
};

// ── Etiquetas del rol ─────────────────────────────────────────────────────────
export const ROL_LABEL: Record<Rol, string> = {
  ADMIN:     '🛡️ Administrador',
  DOCTOR:    '👨‍⚕️ Doctor / Odontólogo',
  ASISTENTE: '🩺 Asistente Clínico',
  RECEPCION: '🖥️ Recepción',
};

export const ROL_BADGE_CLASS: Record<Rol, string> = {
  ADMIN:     'badge-admin',
  DOCTOR:    'badge-doctor',
  ASISTENTE: 'badge-asistente',
  RECEPCION: 'badge-recepcion',
};

// ── Ruta de redirección por defecto por rol ────────────────────────────────────
export const ROL_HOME: Record<Rol, string> = {
  ADMIN:     '/dashboard',
  DOCTOR:    '/pacientes',
  ASISTENTE: '/citas',
  RECEPCION: '/citas',
};
