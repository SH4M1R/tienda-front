import { request } from '@/api/http';
import { fetchPagina, type Pagina } from '@/api/paginacion';

/** Roles del sistema: `value` es el código que guarda el backend. */
export const ROLES: { value: string; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'CAJERO', label: 'Cajero' },
  { value: 'ALMACEN', label: 'Almacén' },
];

export const rolLabel = (codigo: string) => ROLES.find((r) => r.value === codigo)?.label ?? codigo;

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export interface Empleado {
  id: number;
  nombre: string;
  username: string;
  rol: string;
  estado: boolean;
  horaEntrada?: string | null;
  horaSalida?: string | null;
  diaDescanso?: string | null;
}

export interface EmpleadoPayload {
  nombre: string;
  username: string;
  password?: string;
  rol: string;
  estado: boolean;
  horaEntrada?: string | null;
  horaSalida?: string | null;
  diaDescanso?: string | null;
}

const cuerpo = (d: EmpleadoPayload) => ({
  ...d,
  password: d.password || undefined,
  horaEntrada: d.horaEntrada || null,
  horaSalida: d.horaSalida || null,
  diaDescanso: d.diaDescanso || null,
});

export const empleadosCrudApi = {
  pagina: (page: number, size: number, q?: string): Promise<Pagina<Empleado>> =>
    fetchPagina<Empleado>('/empleados', page, size, { q }),
  /** Todos los empleados (para el módulo de permisos). */
  listar: async (): Promise<Empleado[]> => (await fetchPagina<Empleado>('/empleados', 0, 200)).data,
  crear: (data: EmpleadoPayload) =>
    request<Empleado>('/empleados', { method: 'POST', body: cuerpo(data) }),
  actualizar: (id: number, data: EmpleadoPayload) =>
    request<Empleado>(`/empleados/${id}`, { method: 'PUT', body: cuerpo(data) }),
  eliminar: (id: number) => request<void>(`/empleados/${id}`, { method: 'DELETE' }),
  cambiarEstado: (id: number, activo: boolean) =>
    request<Empleado>(`/empleados/${id}/estado`, { method: 'PATCH', params: { activo } }),
};
