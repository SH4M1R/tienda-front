"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Loader2, ScanBarcode, Search } from "lucide-react";
import { ApiError, api, errorMessage } from "@/lib/api";
import { money } from "@/lib/format";
import { fmtStock } from "@/lib/peso";
import type { PageResponse, Producto } from "@/lib/types";
import { Badge, cn, inputCls } from "./ui";
import { useFeedback } from "./feedback";

interface Props {
  onSelect: (p: Producto) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onlyActive?: boolean;
  clearOnSelect?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  showBarcodeIcon?: boolean;
}

/**
 * Buscador de productos por nombre o código de barras.
 * - Escribir busca por nombre (con debounce).
 * - Enter: intenta primero como código de barras exacto (lector/pistola) y, si no existe, toma el resultado resaltado.
 */
export default function ProductSearch({
  onSelect, placeholder = "Buscar por nombre o escanear código de barras…", autoFocus, onlyActive = true,
  clearOnSelect = true, inputRef, showBarcodeIcon = true,
}: Props) {
  const toast = useFeedback();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Producto[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const own = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? own;
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setResults([]); return; }
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api<PageResponse<Producto>>("/api/productos", { params: { q: t, estado: onlyActive ? true : undefined, size: 8, sort: "nombre,asc" } });
        setResults(r.content);
        setActive(0);
      } catch { /* se ignora; el usuario puede reintentar */ } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(id);
  }, [q, onlyActive]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function pick(p: Producto) {
    onSelect(p);
    if (clearOnSelect) { setQ(""); setResults([]); } else { setQ(p.nombre); }
    setOpen(false);
    ref.current?.focus();
  }

  async function onEnter() {
    const t = q.trim();
    if (!t) return;
    try {
      if (/^\S{4,}$/.test(t)) {
        try {
          const p = await api<Producto>(`/api/productos/barras/${encodeURIComponent(t)}`);
          if (!onlyActive || p.estado) { pick(p); return; }
          toast.error(`El producto "${p.nombre}" está inactivo`);
          return;
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 404)) throw e;
        }
      }
      let list = results;
      if (list.length === 0 && t.length >= 2) {
        list = (await api<PageResponse<Producto>>("/api/productos", { params: { q: t, estado: onlyActive ? true : undefined, size: 8 } })).content;
      }
      const chosen = list[Math.min(active, list.length - 1)];
      if (chosen) pick(chosen);
      else { toast.error("Producto no encontrado"); setQ(""); }
    } catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <div ref={box} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={ref} autoFocus={autoFocus} value={q} placeholder={placeholder}
          className={cn(inputCls, "pl-9", showBarcodeIcon && "pr-10")}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onEnter(); }
            else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : showBarcodeIcon && <ScanBarcode className="h-4 w-4" />}
        </span>
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {results.map((p, i) => (
            <li key={p.id}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => pick(p)}
                className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm", i === active ? "bg-primary-50" : "hover:bg-slate-50")}>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">{p.nombre}</span>
                  <span className="block truncate text-xs text-slate-500">{p.categoriaNombre}{p.barras ? ` · ${p.barras}` : ""}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-sm font-semibold text-slate-900">{money(p.precioVenta)}{p.porPeso ? " /kg" : ""}</span>
                  <Badge tone={p.stockActual <= 0 ? "red" : p.stockBajo ? "amber" : "green"}>Stock {fmtStock(p, p.stockActual)}</Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
