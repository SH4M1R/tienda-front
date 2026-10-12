"use client";
import { money } from "@/lib/format";
import type { ResumenCaja } from "@/lib/types";
import { FileSpreadsheet, FileText, Receipt } from "lucide-react";
import { useState } from "react";
import { useConfig } from "@/lib/config-context";
import { errorMessage } from "@/lib/api";
import { exportarReporte, type Col, type EmpresaDoc, type Formato } from "@/lib/reportes";
import { fmtMoneda } from "@/lib/reportes/formato";
import { Button, cn } from "./ui";
import { useFeedback } from "./feedback";

function ImprimirArqueo({ r }: { r: ResumenCaja }) {
  const { empresa, pub, nombre } = useConfig();
  const toast = useFeedback();
  const [busy, setBusy] = useState<Formato | null>(null);
  async function imprimir(formato: Formato) {
    setBusy(formato);
    const emp: EmpresaDoc = { nombre, ruc: empresa?.ruc, direccion: empresa?.direccion, telefono: empresa?.telefono, logo: empresa?.logo ?? pub.logo };
    type Fila = { concepto: string; monto: number };
    const filas: Fila[] = [
      { concepto: "Monto inicial", monto: r.montoInicial },
      { concepto: "Ventas en efectivo", monto: r.ventasEfectivo },
      { concepto: "Ventas con tarjeta", monto: r.ventasTarjeta },
      { concepto: "Ventas por transferencia", monto: r.ventasTransferencia },
      { concepto: "Ventas Yape / Plin", monto: r.ventasYapePlin },
      { concepto: "Ingresos (efectivo)", monto: r.ingresosEfectivo },
      { concepto: "Egresos (efectivo)", monto: -r.egresosEfectivo },
    ];
    const cols: Col<Fila>[] = [
      { header: "Concepto", width: 6, render: (f) => f.concepto },
      { header: "Monto", width: 3, align: "right", render: (f) => fmtMoneda(f.monto), value: (f) => f.monto },
    ];
    const resumen = [
      { label: "Total ventas", value: fmtMoneda(r.totalVentas) },
      { label: "EFECTIVO ESPERADO", value: fmtMoneda(r.efectivoEsperado), bold: true },
      ...(r.montoFinal != null ? [
        { label: "Efectivo contado", value: fmtMoneda(r.montoFinal) },
        { label: "Dejado en caja", value: fmtMoneda(r.montoDejado ?? 0) },
        { label: "DIFERENCIA", value: fmtMoneda(r.diferencia ?? 0), bold: true },
      ] : []),
    ];
    try {
      await exportarReporte({ titulo: `Arqueo de caja #${r.cajaId}`, subtitulo: [r.abierta ? "Caja abierta" : "Caja cerrada"], columnas: cols, filas, resumen, archivo: `arqueo_caja_${r.cajaId}` }, formato, emp);
    } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  }
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="secondary" loading={busy === "pos80"} disabled={!!busy} onClick={() => imprimir("pos80")}><Receipt className="h-4 w-4" />POS 80</Button>
      <Button size="sm" variant="secondary" loading={busy === "a4"} disabled={!!busy} onClick={() => imprimir("a4")}><FileText className="h-4 w-4" />A4</Button>
      <Button size="sm" variant="secondary" loading={busy === "excel"} disabled={!!busy} onClick={() => imprimir("excel")}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
    </div>
  );
}

export default function ResumenView({ r }: { r: ResumenCaja }) {
  const items = [
    ["Monto inicial", r.montoInicial], ["Ventas en efectivo", r.ventasEfectivo], ["Ventas con tarjeta", r.ventasTarjeta],
    ["Ventas por transferencia", r.ventasTransferencia], ["Ventas Yape / Plin", r.ventasYapePlin],
    ["Ingresos (efectivo)", r.ingresosEfectivo], ["Egresos (efectivo)", r.egresosEfectivo],
  ] as const;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([l, v]) => (
          <div key={l} className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs text-slate-500">{l}</p><p className="mt-1 text-lg font-semibold text-slate-900">{money(v)}</p>
          </div>
        ))}
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
          <p className="text-xs text-primary-700">Total ventas</p><p className="mt-1 text-lg font-semibold text-primary-800">{money(r.totalVentas)}</p>
        </div>
        
        <div className="rounded-lg bg-slate-900 p-4 text-white">
          <p className="text-xs uppercase tracking-wide text-slate-300">Efectivo esperado en caja</p>
          <p className="mt-1 text-3xl font-semibold">{money(r.efectivoEsperado)}</p>
      </div>
      </div>
      {r.montoFinal != null && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Efectivo contado</p><p className="mt-1 text-lg font-semibold">{money(r.montoFinal)}</p></div>
          <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Dejado en caja</p><p className="mt-1 text-lg font-semibold">{money(r.montoDejado)}</p></div>
          <div className={cn("rounded-lg border p-3", (r.diferencia ?? 0) === 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}>
            <p className="text-xs text-slate-500">Diferencia</p>
            <p className={cn("mt-1 text-lg font-semibold", (r.diferencia ?? 0) === 0 ? "text-emerald-700" : "text-red-700")}>{money(r.diferencia)}</p>
          </div>
        </div>
      )}
      <ImprimirArqueo r={r} />
    </div>
  );
}
