import { api, type Params } from "./api";
import type { PageResponse } from "./types";

/** Forma de página que usan los componentes copiados de Botica (Paginacion, usePaginaServidor). */
export interface Pagina<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  size: number;
}

/** Pide UNA página al backend de la Tienda (Spring Page, 0-based) y la adapta a `Pagina<T>`. */
export async function fetchPagina<T>(path: string, page = 0, size = 10, params: Params = {}): Promise<Pagina<T>> {
  const r = await api<PageResponse<T>>(path, { params: { ...params, page, size } });
  return { data: r.content, total: r.totalElements, totalPages: Math.max(r.totalPages, 1), page: r.page, size: r.size };
}

export const paginaVacia = <T,>(page: number, size: number): Pagina<T> => ({ data: [], total: 0, totalPages: 1, page, size });
