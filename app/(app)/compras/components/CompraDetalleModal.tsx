"use client";

import { X } from "lucide-react";
import type { Compra } from "@/api/compras";

interface CompraDetalleModalProps {
  compra: Compra | null;
  onClose: () => void;
}

export default function CompraDetalleModal({ compra, onClose }: CompraDetalleModalProps) {
  if (!compra) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl overflow-hidden">
        
        {/* Header Estático (Arriba) */}
        <div className="flex shrink-0 items-center justify-between bg-primary px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Compra #{String(compra.id).padStart(6, "0")}
          </h2>
          <button 
            onClick={onClose} 
            className="text-white hover:text-white/80 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 p-6">
          {/* Información General */}
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-zinc-400">Proveedor</p>
              <p className="font-medium text-zinc-800">{compra.proveedorNombre}</p>
            </div>
            <div>
              <p className="text-zinc-400">Comprobante</p>
              <p className="font-medium text-zinc-800">
                {compra.comprobante} {compra.serie ?? ''}{compra.serie && compra.numero ? '-' : ''}{compra.numero ?? ''}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Fecha Emisión</p>
              <p className="font-medium text-zinc-800">{compra.fechaEmision}</p>
            </div>
            <div>
              <p className="text-zinc-400">Registrado por</p>
              <p className="font-medium text-zinc-800">{compra.empleadoNombre ?? "—"}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-left text-xs font-bold uppercase text-zinc-400">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">U.M</th>
                  <th className="px-4 py-3">Cant</th>
                  <th className="px-4 py-3">P.U</th>
                  <th className="px-4 py-3">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {compra.detalles.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-700">{d.productoNombre}</td>
                    <td className="px-4 py-3 text-zinc-600">{d.lote ?? "-"}{d.fechaVencimiento ? ` · vence ${d.fechaVencimiento}` : ""}</td>
                    <td className="px-4 py-3 text-zinc-600">{d.unidadMedida}</td>
                    <td className="px-4 py-3 text-zinc-600">{d.cantidad}</td>
                    <td className="px-4 py-3 text-zinc-600">S/ {d.precioUnitario.toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800">S/ {d.importe.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100 bg-white p-6 pt-4">
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-zinc-400">Subtotal</p>
              <p className="text-base font-bold text-zinc-800">S/ {compra.subtotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-400">IGV</p>
              <p className="text-base font-bold text-zinc-800">S/ {compra.igv.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-400">Percepción</p>
              <p className="text-base font-bold text-zinc-800">S/ {(compra.percepcion ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-zinc-400">Pagar</p>
              <p className="text-base font-bold text-primary">S/ {compra.pagar.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}