import { api, type Params } from '@/lib/api';

export interface Pagina<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  size: number;
}

/** Respuesta paginada del backend de la Tienda (PageResponse). */
interface PageResponse<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }

/** Pide UNA página (índice base 0) al backend y la devuelve con la misma forma que usa Botica. */
export async function fetchPagina<T>(path: string, page = 0, size = 50, params: Params = {}): Promise<Pagina<T>> {
  const r = await api<PageResponse<T>>(`/api${path}`, { params: { ...params, page, size } });
  return { data: r.content, total: r.totalElements, totalPages: Math.max(r.totalPages, 1), page: r.page, size: r.size };
}

export const paginaVacia = <T>(page: number, size: number): Pagina<T> =>
  ({ data: [], total: 0, totalPages: 1, page, size });
