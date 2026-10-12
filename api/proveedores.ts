import { request } from '@/api/http';
import { fetchPagina, type Pagina } from '@/api/paginacion';

export interface Proveedor {
  id: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  contactoNombres?: string | null;
  contactoCelular?: string | null;
  contactoCorreo?: string | null;
}

export interface ProveedorRequestDTO {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  contactoNombres?: string;
  contactoCelular?: string;
  contactoCorreo?: string;
}

export const proveedorApi = {
  /** Una página de proveedores (índice base 0) con búsqueda por nombre, documento o contacto. */
  pagina: (page: number, size: number, q?: string): Promise<Pagina<Proveedor>> =>
    fetchPagina<Proveedor>('/proveedores', page, size, { q }),
  obtener: (id: number) => request<Proveedor>(`/proveedores/${id}`),
  crear: (data: ProveedorRequestDTO) => request<Proveedor>('/proveedores', { method: 'POST', body: data }),
  actualizar: (id: number, data: ProveedorRequestDTO) =>
    request<Proveedor>(`/proveedores/${id}`, { method: 'PUT', body: data }),
};
