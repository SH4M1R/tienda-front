"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ban, Calendar, ChevronLeft, ChevronRight, Eye, Plus, Printer, Receipt } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, errorMessage } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { fmtDateTime, money } from "@/lib/format";
import { COMPROBANTES, medioLabel, type PageResponse, type Venta } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorBox, Loading, Modal, PageHeader, Pagination, Table, Td, Th } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import { fmtPeso } from "@/lib/peso";

function fechaLarga(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const t = new Date(a, m - 1, d).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Listado de ventas navegable por día (más reciente primero), con tabla paginada del día elegido. */
export default function VentasPage() {
  const { isAdmin } = useAuth();
  const toast = useFeedback();
  const dias = useFetch<string[]>("/api/ventas/dias");
  const [idx, setIdx] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sel, setSel] = useState<Venta | null>(null);

  const lista = dias.data ?? [];
  const idxOk = Math.min(Math.max(0, idx), Math.max(0, lista.length - 1));
  const dia = lista[idxOk];
  useEffect(() => { setPage(0); }, [dia, size]);

  const { data, loading, error, reload } = useFetch<PageResponse<Venta>>(dia ? "/api/ventas" : null, { desde: dia, hasta: dia, page, size });
  const totalDia = useMemo(() => (data?.content ?? []).filter((v) => v.estado).reduce((s, v) => s + v.total, 0), [data]);

  function irAFecha(f: string) {
    if (!f) return;
    const i = lista.indexOf(f);
    if (i === -1) toast.info("No hay ventas registradas en la fecha seleccionada");
    else setIdx(i);
  }

  async function anular(v: Venta) {
    const ok = await toast.confirm({
      title: "Anular venta", danger: true, confirmText: "Anular venta",
      message: `Se anulará ${v.comprobante ?? "la venta"} por ${money(v.total)} y el stock volverá a sus lotes. Esta acción no se puede deshacer.`,
    });
    if (!ok) return;
    try { await api(`/api/ventas/${v.id}/anular`, { method: "PATCH" }); toast.success("Venta anulada"); setSel(null); reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  }

  const btnNav = "flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <>
      <PageHeader title="Listado de ventas" subtitle={isAdmin ? "Historial de ventas registradas." : "Historial de tus ventas registradas."}
        actions={<Link href="/ventas/nueva"><Button><Plus className="h-4 w-4" />Generar venta</Button></Link>} />

      {dias.error ? <ErrorBox message={dias.error} onRetry={dias.reload} /> : dias.loading ? <Loading /> : lista.length === 0 ? (
        <Card><EmptyState title={isAdmin ? "Aún no hay ventas registradas" : "Aún no has registrado ventas"} /></Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xs">
            <button className={btnNav} onClick={() => setIdx(Math.min(lista.length - 1, idxOk + 1))} disabled={idxOk >= lista.length - 1} title="Día anterior">
              <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Día anterior</span>
            </button>
            <div className="flex items-center gap-2 text-center">
              <div className="relative flex cursor-pointer items-center justify-center rounded-xl bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20" title="Seleccionar fecha">
                <Calendar className="h-[18px] w-[18px]" />
                <input type="date" value={dia ?? ""} onChange={(e) => irAFecha(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </div>
              <p className="text-sm font-bold text-slate-800">{dia ? fechaLarga(dia) : ""}</p>
            </div>
            <button className={btnNav} onClick={() => setIdx(Math.max(0, idxOk - 1))} disabled={idxOk === 0} title="Día siguiente">
              <span className="hidden sm:inline">Día siguiente</span><ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Resumen del día</span>
            </div>
            {error ? <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div> : loading && !data ? <Loading /> : !data || data.content.length === 0 ? <EmptyState title="Sin ventas este día" /> : (
              <div className={loading ? "opacity-60 transition-opacity" : ""}>
                <Table>
                  <thead className="bg-primary/10 text-primary">
                    <tr><Th>N.º venta</Th><Th>Cliente</Th>{isAdmin && <Th>Vendedor</Th>}<Th>Hora</Th><Th>Método de pago</Th><Th right>Total</Th><Th>Estado</Th><Th right>Acciones</Th></tr>
                  </thead>
                  <tbody>
                    {data.content.map((v) => (
                      <tr key={v.id}>
                        <Td className="font-mono text-xs text-slate-600">{v.comprobante ?? `#${String(v.id).padStart(6, "0")}`}</Td>
                        <Td className="font-medium text-slate-800">{v.clienteNombre ?? <span className="text-slate-400">Clientes Varios</span>}</Td>
                        {isAdmin && <Td>{v.empleadoNombre}</Td>}
                        <Td>{new Date(v.fecha).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</Td>
                        <Td className="font-medium">{medioLabel(v.metodoPago)}</Td>
                        <Td right className="font-semibold text-slate-900">{money(v.total)}</Td>
                        <Td>{v.estado ? <Badge tone="primary">Válida</Badge> : <Badge tone="gray">Anulada</Badge>}</Td>
                        <Td right>
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setSel(v)} title="Ver detalle" className="rounded-lg border-2 p-2 text-emerald-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600"><Eye className="h-4 w-4" /></button>
                            <button onClick={() => window.open(`/ventas/boleta?id=${v.id}`, "_blank")} title="Imprimir boleta" className="rounded-lg border-2 p-2 text-primary transition-colors hover:bg-primary/10"><Receipt className="h-4 w-4" /></button>
                            {isAdmin && <button onClick={() => anular(v)} disabled={!v.estado} title="Anular venta" className="rounded-lg border-2 p-2 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"><Ban className="h-4 w-4" /></button>}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <Pagination page={data.page} totalPages={data.totalPages} total={data.totalElements} onChange={setPage}
                  pageSize={size} onPageSizeChange={setSize} itemLabel="ventas" />
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={!!sel} onClose={() => setSel(null)} title={`Venta ${sel?.comprobante ?? ""}`} size="sm"
        footer={sel && <>
          {isAdmin && sel.estado && <Button variant="danger" onClick={() => anular(sel)}><Ban className="h-4 w-4" />Anular</Button>}
          <Button onClick={() => window.open(`/ventas/boleta?id=${sel.id}`, "_blank")}><Printer className="h-4 w-4" />Imprimir boleta</Button>
        </>}>
        {sel && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-slate-500">Comprobante</span><span className="text-right font-medium">{COMPROBANTES.find((c) => c.value === sel.tipoVenta)?.label ?? "Nota de Venta"}</span>
              <span className="text-slate-500">Fecha</span><span className="text-right">{fmtDateTime(sel.fecha)}</span>
              <span className="text-slate-500">Cliente</span><span className="text-right">{sel.clienteNombre || "Público general"}</span>
              <span className="text-slate-500">Cajero</span><span className="text-right">{sel.empleadoNombre}</span>
              <span className="text-slate-500">Pago</span><span className="text-right">{medioLabel(sel.metodoPago)}</span>
              {!sel.estado && <><span className="text-slate-500">Estado</span><span className="text-right font-semibold text-red-600">ANULADA</span></>}
            </div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {sel.detalles.map((d) => (
                <div key={d.id} className="flex justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 truncate">{d.productoNombre} <span className="text-slate-400">× {d.tipoVenta === "PESO" ? fmtPeso(d.cantidad) : d.cantidad}{d.tipoVenta === "CAJA" ? " caja(s)" : ""}</span></span>
                  <span className="shrink-0 font-medium">{money(d.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-base font-bold"><span>Total</span><span>{money(sel.total)}</span></div>
          </div>
        )}
      </Modal>
    </>
  );
}
