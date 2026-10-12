'use client';

import { useAuth } from '@/lib/auth-context';
import { ROLES } from '@/lib/types';

export interface SesionEmpleado {
  id: number;
  nombre: string;
  /** Etiqueta del rol ("Administrador", "Cajero", "Almacén"). */
  rol: string;
  /** Código del rol en el backend ("ADMIN", "CAJERO", "ALMACEN"). */
  rolCodigo: string;
}

/**
 * Misma interfaz que el hook de Botica, respaldado por la sesión JWT de la Tienda.
 * La sesión real (token, permisos) vive en `lib/auth-context`.
 */
export function useSession() {
  const { user, ready, logout, isAdmin } = useAuth();
  const empleado: SesionEmpleado | null = user
    ? { id: user.id, nombre: user.nombre, rol: ROLES.find((r) => r.value === user.rol)?.label ?? user.rol, rolCodigo: user.rol }
    : null;
  return { empleado, cargando: !ready, esAdministrador: isAdmin, cerrarSesion: logout };
}
