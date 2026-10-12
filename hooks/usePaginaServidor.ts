'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pagina } from '@/api/paginacion';

export function usePaginaServidor<T>(
  fetcher: (page0: number, size: number) => Promise<Pagina<T>>,
  deps: unknown[] = [],
  initialSize = 25
) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const fetcherRef = useRef(fetcher);
  useEffect(() => { fetcherRef.current = fetcher; });

  const depsKey = JSON.stringify(deps);
  const prevDeps = useRef(depsKey);

  useEffect(() => {
    // Si cambió un filtro y no estamos en la página 1, volvemos a 1 (eso relanza el efecto)
    if (prevDeps.current !== depsKey) {
      prevDeps.current = depsKey;
      if (page !== 1) { setPage(1); return; }
    }
    let cancelado = false;
    setLoading(true);
    setError(null);
    fetcherRef.current(page - 1, size)
      .then((r) => {
        if (cancelado) return;
        setItems(r.data);
        setTotal(r.total);
        setTotalPages(Math.max(r.totalPages, 1));
      })
      .catch((e) => !cancelado && setError(e instanceof Error ? e.message : 'Error al cargar'))
      .finally(() => !cancelado && setLoading(false));
    return () => { cancelado = true; };
  }, [page, size, tick, depsKey]);

  const cambiarTamano = useCallback((n: number) => { setSize(n); setPage(1); }, []);
  const recargar = useCallback(() => setTick((t) => t + 1), []);

  return { items, setItems, total, totalPages, page, size, loading, error, setPage, cambiarTamano, recargar };
}