import { api, type Params } from '@/lib/api';

/**
 * Cliente HTTP de los módulos portados desde Botica.
 * Mantiene la forma `request<T>('/ruta', { method, body })` pero usa el cliente con JWT de la Tienda
 * (prefijo /api, cabecera Authorization, cierre de sesión en 401, errores como Error(message)).
 * `body` puede ser un objeto (se serializa) o un string JSON ya serializado.
 */
export interface RequestOptions { method?: string; body?: unknown; params?: Params }

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let body = options.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { /* se envía tal cual */ }
  }
  return api<T>(`/api${path}`, { method: options.method, body, params: options.params });
}
