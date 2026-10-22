"use client";
import { fmtDateTime, money } from "@/lib/format";
import { medioLabel, type Empresa, type Venta } from "@/lib/types";
import { fmtPeso } from "@/lib/peso";

/** Comprobante en formato ticket 80mm. Se imprime con window.print() gracias a la clase `print-area`. */
export default function Ticket({ venta, empresa, nombre }: { venta: Venta; empresa: Empresa | null; nombre: string }) {
  const titulo = venta.tipoVenta === "FACTURA" ? "FACTURA" : venta.tipoVenta === "BOLETA" ? "BOLETA DE VENTA" : "TICKET DE VENTA";
  return (
    <div className="print-area mx-auto w-[300px] bg-white p-3 font-mono text-[12px] leading-tight text-black">
      <div className="text-center">
        {empresa?.logo && <img src={empresa.logo} alt="" className="mx-auto mb-1 max-h-14" />}
        <p className="text-sm font-bold">{empresa?.razonSocial || nombre}</p>
        {empresa?.nombreComercial && empresa.razonSocial && <p>{empresa.nombreComercial}</p>}
        {empresa?.ruc && <p>RUC: {empresa.ruc}</p>}
        {empresa?.direccion && <p>{empresa.direccion}{empresa.ciudad ? ` - ${empresa.ciudad}` : ""}</p>}
        {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
      </div>
      <div className="my-2 border-y border-dashed border-black py-1 text-center">
        <p className="font-bold">{titulo}</p>
        <p>{venta.comprobante ?? `#${venta.id}`}</p>
        {!venta.estado && <p className="font-bold">*** ANULADA ***</p>}
      </div>
      <p>Fecha: {fmtDateTime(venta.fecha)}</p>
      <p>Cajero: {venta.empleadoNombre}</p>
      <p>Cliente: {venta.clienteNombre || "PÚBLICO GENERAL"}</p>
      <div className="my-2 border-t border-dashed border-black" />
      {venta.detalles.map((d) => (
        <div key={d.id} className="mb-1">
          <p className="truncate">{d.productoNombre}</p>
          <div className="flex justify-between">
            <span>{d.tipoVenta === "PESO" ? `${fmtPeso(d.cantidad)} x ${d.precioUnitario.toFixed(2)}/kg` : `${d.cantidad} ${d.tipoVenta === "CAJA" ? "caja(s)" : "und"} x ${d.precioUnitario.toFixed(2)}`}</span>
            <span>{d.subtotal.toFixed(2)}</span>
          </div>
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-black" />
      <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{money(venta.total)}</span></div>
      <p>Pago: {medioLabel(venta.metodoPago)}</p>
      {venta.vuelto != null && venta.vuelto > 0 && <p>Vuelto: {money(venta.vuelto)}</p>}
      <p className="mt-3 text-center">¡Gracias por su compra!</p>
    </div>
  );
}
