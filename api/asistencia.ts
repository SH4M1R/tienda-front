import { request } from '@/api/http';

export interface Asistencia {
  id: number;
  empleadoId: number;
  empleadoNombre: string;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  tardanza: boolean;
  minutosTardanza: number | null;
}

export interface EmpleadoAsistencia { id: number; nombre: string; username: string }

export interface AsistenciaCredenciales { username: string; password: string }

export const asistenciaApi = {
  empleados: () => request<EmpleadoAsistencia[]>('/asistencia/empleados'),
  hoyTodos: () => request<Asistencia[]>('/asistencia/hoy-todos'),
  marcarEntrada: (data: AsistenciaCredenciales) => request<Asistencia>('/asistencia/entrada', { method: 'POST', body: data }),
  marcarSalida: (data: AsistenciaCredenciales) => request<Asistencia>('/asistencia/salida', { method: 'POST', body: data }),
};
