import { request } from '@/api/http';
import { fetchPagina, type Pagina } from '@/api/paginacion';

export const IGV_RATE = 0.18;

export type UnidadMedida = 'UNIDAD' | 'CAJA' | 'KG';

export interface DetalleCompraResponse {
  id: number;
  productoId: number;
  productoNombre: string;
  lote?: string | null;
  fechaVencimiento?: string | null;
  unidadMedida: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export interface Compra {
  id: number;
  comprobante: string;
  serie?: string | null;
  numero?: string | null;
  fechaEmision: string;
  fechaRegistro: string;
  regularizar: boolean;
  proveedorId: number;
  proveedorNombre: string;
  empleadoId: number;
  empleadoNombre: string;
  precioIncluyeIgv: boolean;
  descripcion?: string | null;
  subtotal: number;
  igv: number;
  total: number;
  percepcion?: number | null;
  pagar: number;
  tipoPago: string;
  medioPago: string;
  estado: boolean;
  estadoPago: boolean;
  detalles: DetalleCompraResponse[];
}

/** Línea del carrito de la pantalla "Ingresar compra". */
export interface DetalleCompraItem {
  key: string;
  productoId: number;
  nombreProducto: string;
  unidadMedida: UnidadMedida;
  lote?: string;
  fechaVencimiento?: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

export interface CompraRequest {
  comprobante: string;
  serie: string | null;
  numero: string | null;
  fechaEmision: string;
  proveedorId: number;
  precioIncluyeIgv: boolean;
  descripcion?: string | null;
  percepcion: number;
  tipoPago: string;
  medioPago: string;
  regularizar: boolean;
  detalles: {
    productoId: number;
    lote: string | null;
    fechaVencimiento: string | null;
    unidadMedida: UnidadMedida;
    cantidad: number;
    precioUnitario: number;
  }[];
}

export const comprasApi = {
  listarPaginado: (page = 0, size = 10, f: { desde?: string; hasta?: string } = {}): Promise<Pagina<Compra>> =>
    fetchPagina<Compra>('/compras', page, size, f),
  obtener: (id: number) => request<Compra>(`/compras/${id}`),
  crear: (payload: CompraRequest) => request<Compra>('/compras', { method: 'POST', body: payload }),
  anular: (id: number) => request<Compra>(`/compras/${id}/anular`, { method: 'PATCH' }),
  marcarPagada: (id: number) => request<Compra>(`/compras/${id}/pagar`, { method: 'PATCH' }),
};
