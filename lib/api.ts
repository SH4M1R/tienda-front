import { mockBackupSql, mockRequest, mockSubirImagen } from "@/mock/server";

/** Modo demostración: todas las llamadas se resuelven en memoria (src/mock), sin backend. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8020").replace(/\/$/, "");
const TOKEN_KEY = "tienda_token";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(t: string) { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* noop */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* noop */ } },
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export type Params = Record<string, string | number | boolean | null | undefined>;
interface Opts { method?: string; body?: unknown; params?: Params; auth?: boolean; signal?: AbortSignal }

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) { unauthorizedHandler = fn; }

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined ? "POST" : "GET");
  try {
    return await mockRequest<T>(method, path, opts.params, opts.body, opts.auth !== false);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && opts.auth !== false) unauthorizedHandler?.();
    throw e;
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.errors) {
      const first = Object.values(e.errors)[0];
      if (first) return first;
    }
    return e.message;
  }
  return e instanceof Error ? e.message : "Ocurrió un error inesperado";
}

/** Descarga de la copia de seguridad (en modo demostración se genera en el navegador). */
export async function apiDownload(path: string, nombrePorDefecto: string): Promise<void> {
  if (!tokenStore.get()) throw new ApiError(401, "Sesión no válida");
  void path;
  const { nombre, contenido } = mockBackupSql();
  const url = URL.createObjectURL(new Blob([contenido], { type: "application/sql" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre || nombrePorDefecto;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Subida de archivo (imagen de producto): se guarda en memoria como data-URL. */
export async function apiUpload<T = unknown>(path: string, campo: string, archivo: File): Promise<T> {
  void campo;
  return (await mockSubirImagen(path, archivo)) as T;
}
