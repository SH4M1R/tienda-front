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
  const url = new URL(API_BASE + path);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const token = tokenStore.get();
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.");
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }

  if (!res.ok) {
    if (res.status === 401 && opts.auth !== false) unauthorizedHandler?.();
    const d = data as { message?: string; errors?: Record<string, string> } | null;
    throw new ApiError(res.status, d?.message ?? `Error ${res.status}`, d?.errors);
  }
  return data as T;
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

/** Subida multipart (archivo) con JWT; el navegador define el Content-Type con su boundary. */
export async function apiUpload<T = unknown>(path: string, campo: string, archivo: File): Promise<T> {
  const fd = new FormData();
  fd.append(campo, archivo);
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try { res = await fetch(API_BASE + path, { method: "POST", headers, body: fd }); }
  catch { throw new ApiError(0, "No se pudo conectar con el servidor. Verifique que el backend esté en ejecución."); }
  const text = await res.text();
  let data: unknown = null;
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }
  if (!res.ok) {
    if (res.status === 401) unauthorizedHandler?.();
    const d = data as { message?: string } | null;
    throw new ApiError(res.status, d?.message ?? `Error ${res.status}`);
  }
  return data as T;
}
