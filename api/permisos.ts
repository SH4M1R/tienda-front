import { request } from '@/api/http';

export const permisosApi = {
  obtener: (idEmpleado: number) => request<string[]>(`/empleados/${idEmpleado}/permisos`),
  guardar: (idEmpleado: number, rutas: string[]) =>
    request<string[]>(`/empleados/${idEmpleado}/permisos`, { method: 'PUT', body: { rutas } }),
};
