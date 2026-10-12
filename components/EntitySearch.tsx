"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Search } from "lucide-react";
import { api, type Params } from "@/lib/api";
import type { PageResponse } from "@/lib/types";
import { cn, inputCls } from "./ui";

interface Props<T> {
  endpoint: string;
  render: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  placeholder?: string;
  minChars?: number;
  params?: Params;
  /** Se ejecuta con Enter cuando el texto tiene el formato indicado (p. ej. DNI de 8 dígitos). */
  onEnterText?: (text: string) => void;
  autoFocus?: boolean;
}

/** Selector genérico con búsqueda remota (clientes, proveedores…). El endpoint debe devolver PageResponse y aceptar ?q= */
export default function EntitySearch<T extends { id: number }>({
  endpoint, render, onSelect, placeholder = "Buscar…", minChars = 2, params, onEnterText, autoFocus,
}: Props<T>) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const paramKey = JSON.stringify(params ?? {});

  useEffect(() => {
    const t = q.trim();
    if (t.length < minChars) { setItems([]); return; }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api<PageResponse<T>>(endpoint, { params: { ...params, q: t, size: 8 } });
        setItems(r.content);
      } catch { setItems([]); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, endpoint, minChars, paramKey]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={box} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q} placeholder={placeholder} autoFocus={autoFocus} className={cn(inputCls, "pl-9")}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnterText) { e.preventDefault(); onEnterText(q.trim()); }
        }}
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
      {open && items.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {items.map((it) => (
            <li key={it.id}>
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50"
                onClick={() => { onSelect(it); setQ(""); setItems([]); setOpen(false); }}>
                {render(it)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
