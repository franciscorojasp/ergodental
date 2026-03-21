// src/components/RoleGuard.tsx
// Guardia de permisos a nivel de componente.
// Envuelve cualquier elemento y lo muestra solo si el rol tiene permiso.
// Se usa tanto para rutas completas como para botones/secciones dentro de páginas.

import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useClinica } from '../contexts/ClinicaContext';
import { canAccess, canDo, type Modulo, type Accion } from '../permissions';

interface RoleGuardProps {
  modulo: Modulo;
  accion?: Accion;
  children: ReactNode;
  /** Si es true, redirige a /unauthorized en vez de ocultar el elemento */
  redirigir?: boolean;
  /** Qué mostrar si no hay permiso (opcional — por defecto nada) */
  fallback?: ReactNode;
}

export default function RoleGuard({
  modulo,
  accion,
  children,
  redirigir = false,
  fallback = null,
}: RoleGuardProps) {
  const { user } = useAuth();
  const { clinica } = useClinica();
  const rol = user?.rol;

  // Verificar acceso al módulo
  const tieneAcceso = accion
    ? canDo(rol, modulo, accion)
    : canAccess(rol, modulo);

  if (!tieneAcceso) {
    if (redirigir) return <Navigate to="/unauthorized" replace />;
    return <>{fallback}</>;
  }

  // Prevenir creación/edición en vista consolidada
  if (clinica.id === 'consolidado' && accion && accion !== 'ver') {
    if (redirigir) return <Navigate to="/unauthorized" replace />;
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
