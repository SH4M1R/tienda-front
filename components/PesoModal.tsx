"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Button, Field, Modal, cn, inputCls } from "@/components/ui";
import { money } from "@/lib/format";
import { fmtPeso, gramosAPrecio, precioAGramos } from "@/lib/peso";

type Unidad = "kg" | "g";

interface Props {
  nombre: string;
  /** Precio por kg. */
  precioKg: number;
  /** Peso máximo que se puede llevar (gramos): stock menos lo que ya está en el carrito. */
  maxGramos: number;
  /** Peso inicial en gramos (al editar una línea). */
  gramosIniciales?: number;
  onConfirm: (gramos: number) => void;
  onClose: () => void;
}

const txt = (g: number, u: Unidad) => (g <= 0 ? "" : u === "kg" ? String(Number((g / 1000).toFixed(3))) : String(Math.round(g)));

/**
 * Venta por peso: se escribe el peso O el monto y el otro se calcula al instante
 * (S/ 5 a S/ 3.33 el kg -> 1.5 kg; 1.5 kg -> S/ 5).
 * Montar con `key` distinto en cada apertura para reiniciar el estado.
 */
export default function PesoModal({ nombre, precioKg, maxGramos, gramosIniciales = 0, onConfirm, onClose }: Props) {
  const [unidad, setUnidad] = useState<Unidad>(gramosIniciales > 0 && gramosIniciales < 1000 ? "g" : "kg");
  const [gramos, setGramos] = useState(gramosIniciales);
  const [pesoTxt, setPesoTxt] = useState(txt(gramosIniciales, gramosIniciales > 0 && gramosIniciales < 1000 ? "g" : "kg"));
  const [precioTxt, setPrecioTxt] = useState(gramosIniciales > 0 ? gramosAPrecio(precioKg, gramosIniciales).toFixed(2) : "");

  const total = gramosAPrecio(precioKg, gramos);
  const excede = gramos > maxGramos;
  const valido = gramos > 0 && !excede && total > 0;

  function cambiarPeso(v: string, u: Unidad = unidad) {
    setPesoTxt(v);
    const n = Number(v);
    const g = v === "" || !Number.isFinite(n) || n < 0 ? 0 : Math.round(u === "kg" ? n * 1000 : n);
    setGramos(g);
    setPrecioTxt(g > 0 ? gramosAPrecio(precioKg, g).toFixed(2) : "");
  }
  function cambiarPrecio(v: string) {
    setPrecioTxt(v);
    const n = Number(v);
    const g = v === "" || !Number.isFinite(n) || n < 0 ? 0 : precioAGramos(precioKg, n);
    setGramos(g);
    setPesoTxt(txt(g, unidad));
  }
  function cambiarUnidad(u: Unidad) {
    setUnidad(u);
    setPesoTxt(txt(gramos, u));
  }
  const rapido = (g: number) => { setGramos(g); setPesoTxt(txt(g, unidad)); setPrecioTxt(gramosAPrecio(precioKg, g).toFixed(2)); };
  const confirmar = () => { if (valido) onConfirm(gramos); };

  return (
    <Modal open onClose={onClose} title="Venta por peso" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={confirmar} disabled={!valido}><Check className="h-4 w-4" />Agregar</Button></>}>
      <div className="space-y-4" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } }}>
        <div>
          <p className="text-sm font-medium text-slate-900">{nombre}</p>
          <p className="text-xs text-slate-500">{money(precioKg)} por kg · Disponible: {fmtPeso(maxGramos)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso">
            <div className="flex gap-1.5">
              <input autoFocus type="number" min="0" step={unidad === "kg" ? "0.001" : "1"} inputMode="decimal" className={inputCls} value={pesoTxt}
                onChange={(e) => cambiarPeso(e.target.value)} placeholder={unidad === "kg" ? "0.000" : "0"} />
              <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-0.5 text-xs">
                {(["kg", "g"] as Unidad[]).map((u) => (
                  <button key={u} type="button" onClick={() => cambiarUnidad(u)}
                    className={cn("rounded-md px-2 font-medium", unidad === u ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100")}>{u}</button>
                ))}
              </div>
            </div>
          </Field>
          <Field label="Precio (S/)">
            <input type="number" min="0" step="0.01" inputMode="decimal" className={inputCls} value={precioTxt}
              onChange={(e) => cambiarPrecio(e.target.value)} placeholder="0.00" />
          </Field>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[250, 500, 1000, 2000].map((g) => (
            <button key={g} type="button" onClick={() => rapido(g)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium hover:bg-slate-200">{fmtPeso(g)}</button>
          ))}
        </div>

        <div className="rounded-lg bg-slate-900 p-4 text-white">
          <div className="flex justify-between text-sm text-slate-300"><span>Peso</span><span>{gramos > 0 ? fmtPeso(gramos) : "—"}</span></div>
          <div className="flex items-end justify-between"><span className="text-sm text-slate-300">Total</span><span className="text-3xl font-semibold">{money(total)}</span></div>
        </div>
        {excede && <p className="text-xs text-red-600">Supera el stock disponible ({fmtPeso(maxGramos)}).</p>}
      </div>
    </Modal>
  );
}
