"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage, type Params } from "./api";

export function useFetch<T>(path: string | null, params?: Params) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const key = (path ?? "") + JSON.stringify(params ?? {});

  useEffect(() => {
    if (!path) { setData(null); setLoading(false); return; }
    let cancel = false;
    setLoading(true);
    setError(null);
    api<T>(path, { params })
      .then((d) => { if (!cancel) setData(d ?? null); })
      .catch((e) => { if (!cancel) setError(errorMessage(e)); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload, setData };
}

/** Detecta lectores de código de barras (teclean muy rápido y terminan con Enter) cuando no hay un campo enfocado. */
export function useBarcodeScanner(onScan: (code: string) => void, enabled = true) {
  const cb = useRef(onScan);
  useEffect(() => { cb.current = onScan; });
  useEffect(() => {
    if (!enabled) return;
    let buf = "";
    let last = 0;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      const now = Date.now();
      if (now - last > 80) buf = "";
      last = now;
      if (e.key === "Enter") {
        if (buf.length >= 4) cb.current(buf);
        buf = "";
        return;
      }
      if (e.key.length === 1) buf += e.key;
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled]);
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
