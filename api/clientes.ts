import { request } from '@/api/http';
import { fetchPagina, type Pagina } from '@/api/paginacion';

export interface Cliente {
  id: number;
  nombres: string;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  dni?: string | null;
  codVerifica?: string | null;
  telefono?: string | null;
  nombreCompleto?: string | null;
}

export interface ClienteRequest {
  nombres: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  dni?: string;
  codVerifica?: string;
  telefono?: string;
}

export interface DniDatos {
  success?: boolean;
  dni: string;
  nombres: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  codVerifica?: string;
}

export interface RucDatos {
  success?: boolean;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string | null;
  direccion?: string | null;
  estado?: string | null;
  condicion?: string | null;
  telefonos?: string[] | null;
}

export function getNombreCompleto(c: Pick<Cliente, 'nombres' | 'apellidoPaterno' | 'apellidoMaterno'>): string {
  return [c.nombres, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ');
}

/** Divide "Nombres ApPaterno ApMaterno": las dos últimas palabras son apellidos. */
export function splitNombreCompleto(full: string): { nombres: string; apellidoPaterno: string; apellidoMaterno: string } {
  const p = full.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 3) return { nombres: p.slice(0, -2).join(' '), apellidoPaterno: p[p.length - 2], apellidoMaterno: p[p.length - 1] };
  if (p.length === 2) return { nombres: p[0], apellidoPaterno: p[1], apellidoMaterno: '' };
  return { nombres: p[0] ?? '', apellidoPaterno: '', apellidoMaterno: '' };
}

export const clientesApi = {
  listarPaginado: (page = 0, size = 10, q?: string): Promise<Pagina<Cliente>> =>
    fetchPagina<Cliente>('/clientes', page, size, { q }),
  crear: (data: ClienteRequest) => request<Cliente>('/clientes', { method: 'POST', body: data }),
  actualizar: (id: number, data: ClienteRequest) => request<Cliente>(`/clientes/${id}`, { method: 'PUT', body: data }),
  consultarDni: (dni: string) => request<DniDatos>(`/clientes/dni/${dni}`),
  consultarRuc: (ruc: string) => request<RucDatos>(`/clientes/ruc/${ruc}`),
};
