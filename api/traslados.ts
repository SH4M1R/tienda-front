import { request } from '@/api/http';
import { fetchPagina, type Pagina } from '@/api/paginacion';
export { sucursalesApi, type Sucursal } from '@/api/empresa';

export type TipoTraslado = 'INGRESO' | 'EGRESO';

export interface TrasladoDetalle {
  id: number;
  productoId: number;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Traslado {
  id: number;
  tipo: TipoTraslado;
  sucursalId: number;
  sucursalNombre: string;
  fecha: string;
  total: number;
  observacion?: string | null;
  detalles: TrasladoDetalle[];
}

export interface TrasladoDetalleInput {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
}

export interface TrasladoInput {
  tipo: TipoTraslado;
  sucursalId: number;
  observacion?: string;
  detalles: TrasladoDetalleInput[];
}

export const trasladosApi = {
  listarPaginado: (page = 0, size = 10, tipo?: TipoTraslado, q = ''): Promise<Pagina<Traslado>> =>
    fetchPagina<Traslado>('/traslados', page, size, { tipo, q: q || undefined, desde: '2000-01-01' }),
  crear: (data: TrasladoInput) => request<Traslado>('/traslados', { method: 'POST', body: data }),
};
