import { request } from '@/api/http';
import { API_BASE, apiUpload } from '@/lib/api';
import { fetchPagina, type Pagina } from '@/api/paginacion';

export interface Categoria { id: number; nombre: string }

export interface Producto {
  id: number;
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  stockMinimo: number;
  estado: boolean;
  barras: string | null;
  unidadesCaja: number | null;
  precioCaja: number | null;
  factor: number | null;
  categoriaId: number;
  categoriaNombre: string;
  stockActual: number;
  stockBajo: boolean;
  imagen?: string | null;
}

export interface ProductoPayload {
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  stockMinimo: number;
  estado: boolean;
  barras: string | null;
  unidadesCaja: number | null;
  precioCaja: number | null;
  factor: number | null;
  categoriaId: number;
}

export interface LoteProducto {
  id: number;
  productoId: number;
  productoNombre: string;
  lote: string | null;
  fechaVencimiento: string | null;
  stock: number;
  diasParaVencer: number | null;
}

export interface LotePayload { lote: string | null; fechaVencimiento: string | null; stock: number }

export interface FiltroProductos { q?: string; categoriaId?: number; estado?: boolean }

/** URL pública de la imagen del producto (el nombre del archivo cambia con cada imagen nueva, así que sirve de versión). */
export const urlImagenProducto = (p: Pick<Producto, 'id' | 'imagen'>): string | null =>
  p.imagen ? `${API_BASE}/api/productos/${p.id}/imagen?v=${encodeURIComponent(p.imagen)}` : null;

export const productosApi = {
  subirImagen: (id: number, archivo: File) => apiUpload<Producto>(`/api/productos/${id}/imagen`, 'archivo', archivo),
  eliminarImagen: (id: number) => request<Producto>(`/productos/${id}/imagen`, { method: 'DELETE' }),
  pagina: (page: number, size: number, f: FiltroProductos = {}): Promise<Pagina<Producto>> =>
    fetchPagina<Producto>('/productos', page, size, { q: f.q, categoriaId: f.categoriaId, estado: f.estado }),
  /** Cantidad de productos que cumplen el filtro (consulta de una sola fila). */
  contar: async (f: FiltroProductos = {}) => (await productosApi.pagina(0, 1, f)).total,
  /** Búsqueda rápida para selectores (solo activos). */
  buscar: async (q: string, size = 15) => (await productosApi.pagina(0, size, { q, estado: true })).data,
  crear: (data: ProductoPayload) => request<Producto>('/productos', { method: 'POST', body: data }),
  actualizar: (id: number, data: ProductoPayload) => request<Producto>(`/productos/${id}`, { method: 'PUT', body: data }),
  cambiarEstado: (id: number, activo: boolean) =>
    request<Producto>(`/productos/${id}/estado`, { method: 'PATCH', params: { activo } }),
  stockBajo: () => request<Producto[]>('/productos/alertas/stock-bajo'),
  porVencer: (dias: number) => request<LoteProducto[]>('/productos/alertas/por-vencer', { params: { dias } }),
  lotes: (id: number) => request<LoteProducto[]>(`/productos/${id}/lotes`),
  crearLote: (id: number, data: LotePayload) => request<LoteProducto>(`/productos/${id}/lotes`, { method: 'POST', body: data }),
  actualizarLote: (id: number, loteId: number, data: LotePayload) => request<LoteProducto>(`/productos/${id}/lotes/${loteId}`, { method: 'PUT', body: data }),
};

export const categoriasApi = {
  listar: () => request<Categoria[]>('/categorias'),
  crear: (data: { nombre: string }) => request<Categoria>('/categorias', { method: 'POST', body: data }),
  actualizar: (id: number, data: { nombre: string }) => request<Categoria>(`/categorias/${id}`, { method: 'PUT', body: data }),
  eliminar: (id: number) => request<void>(`/categorias/${id}`, { method: 'DELETE' }),
};
