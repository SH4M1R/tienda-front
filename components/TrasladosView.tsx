"use client";
import { useMemo, useState } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { daysAgo, fmtDateTime, money, today } from "@/lib/format";
import type { PageResponse, Producto, Sucursal, Traslado } from "@/lib/types";
import { Badge, Button, Card, DateRange, EmptyState, ErrorBox, Field, IconButton, Loading, Modal, PageHeader, Pagination, Table, Td, Th, cn, inputCls } from "@/components/ui";
import { useFeedback } from "./feedback";
import ProductSearch from "./ProductSearch";

interface Line { producto: Producto; cantidad: number; precio: string }

export default function TrasladosView({ tipo }: { tipo: "INGRESO" | "EGRESO" }) {
  const toast = useFeedback();
  const ingreso = tipo === "INGRESO";
  const [desde, setDesde] = useState(daysAgo(29));
  const [hasta, setHasta] = useState(today());
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useFetch<PageResponse<Traslado>>("/api/traslados", { tipo, desde, hasta, page, size: 15 });
  const sucursales = useFetch<Sucursal[]>("/api/sucursales");

  const [open, setOpen] = useState(false);
  const [sucursalId, setSucursalId] = useState("");
  const [obs, setObs] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [sel, setSel] = useState<Traslado | null>(null);

  const total = useMemo(() => lines.reduce((a, l) => a + l.cantidad * (l.precio === "" ? l.producto.precioCompra : Number(l.precio)), 0), [lines]);

  function nuevo() { setSucursalId(""); setObs(""); setLines([]); setOpen(true); }
  const add = (p: Producto) => setLines((ls) => ls.some((l) => l.producto.id === p.id) ? ls.map((l) => l.producto.id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l) : [...ls, { producto: p, cantidad: 1, precio: "" }]);
  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  async function guardar() {
    setSaving(true);
    try {
      await api("/api/traslados", { body: { tipo, sucursalId: Number(sucursalId), observacion: obs || null,
        detalles: lines.map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad, precioUnitario: l.precio === "" ? null : Number(l.precio) })) } });
      toast.success(ingreso ? "Ingreso registrado: stock actualizado" : "Egreso registrado: stock descontado");
      setOpen(false); reload();
    } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  }

  return (
    <>
      <PageHeader title={ingreso ? "Ingresos por traslado" : "Egresos por traslado"}
        subtitle={ingreso ? "Mercadería que ingresa desde otra sucursal (suma stock)." : "Mercadería que sale hacia otra sucursal (descuenta stock por lote)."}
        actions={<Button onClick={nuevo}><Plus className="h-4 w-4" />{ingreso ? "Nuevo ingreso" : "Nuevo egreso"}</Button>} />
      <Card>
        <div className="border-b border-slate-100 p-4"><DateRange desde={desde} hasta={hasta} onDesde={(v) => { setDesde(v); setPage(0); }} onHasta={(v) => { setHasta(v); setPage(0); }} /></div>
        {error ? <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div> : loading ? <Loading /> : !data || data.content.length === 0 ? <EmptyState title="Sin traslados en este rango" /> : (
          <>
            <Table>
              <thead><tr><Th>N.º</Th><Th>Fecha</Th><Th>Sucursal</Th><Th>Observación</Th><Th right>Ítems</Th><Th right>Total</Th><Th /></tr></thead>
              <tbody>{data.content.map((t) => (
                <tr key={t.id}><Td className="font-medium">#{t.id}</Td><Td>{fmtDateTime(t.fecha)}</Td><Td>{t.sucursalNombre}</Td><Td className="max-w-xs truncate text-slate-500">{t.observacion ?? "—"}</Td>
                  <Td right>{t.detalles.length}</Td><Td right className="font-semibold text-slate-900">{money(t.total)}</Td><Td right><IconButton icon={Eye} label="Ver detalle" onClick={() => setSel(t)} /></Td></tr>))}</tbody>
            </Table>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.totalElements} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={ingreso ? "Nuevo ingreso por traslado" : "Nuevo egreso por traslado"} size="lg"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button loading={saving} onClick={guardar} disabled={!sucursalId || lines.length === 0}>Registrar</Button></>}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={ingreso ? "Sucursal de origen" : "Sucursal de destino"} required>
              <select className={inputCls} value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}><option value="">Seleccione…</option>{sucursales.data?.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
            </Field>
            <Field label="Observación"><input className={inputCls} value={obs} onChange={(e) => setObs(e.target.value)} /></Field>
          </div>
          {sucursales.data?.length === 0 && <p className="text-xs text-amber-700">No hay sucursales. Créalas en Configuración → Sucursales.</p>}
          <div><p className="mb-1 text-xs font-medium text-slate-600">Agregar productos</p><ProductSearch onSelect={add} /></div>
          {lines.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="bg-slate-50 text-left text-xs uppercase text-slate-500"><th className="px-3 py-2">Producto</th><th className="px-2 py-2">Cant. (und)</th><th className="px-2 py-2">Precio unit.</th><th className="px-3 py-2 text-right">Subtotal</th><th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((l, i) => {
                    const p = l.precio === "" ? l.producto.precioCompra : Number(l.precio);
                    return (
                      <tr key={l.producto.id}>
                        <td className="px-3 py-2 font-medium">{l.producto.nombre}<div className="text-xs font-normal text-slate-400">Stock: {l.producto.stockActual}</div></td>
                        <td className="px-2 py-2"><input type="number" min={1} className={cn(inputCls, "w-24")} value={l.cantidad} onChange={(e) => set(i, { cantidad: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} /></td>
                        <td className="px-2 py-2"><input type="number" min={0} step="0.01" className={cn(inputCls, "w-28")} value={l.precio} placeholder={l.producto.precioCompra.toFixed(2)} onChange={(e) => set(i, { precio: e.target.value })} /></td>
                        <td className="px-3 py-2 text-right tabular-nums">{money(l.cantidad * p)}</td>
                        <td className="px-2"><button onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Quitar"><Trash2 className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold"><span>Total</span><span>{money(total)}</span></div>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!sel} onClose={() => setSel(null)} title={`Traslado #${sel?.id ?? ""}`} size="md">
        {sel && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={sel.tipo === "INGRESO" ? "green" : "amber"}>{sel.tipo}</Badge><span>{sel.sucursalNombre}</span><span className="text-slate-400">· {fmtDateTime(sel.fecha)}</span></div>
            {sel.observacion && <p className="text-slate-600">{sel.observacion}</p>}
            <Table><thead><tr><Th>Producto</Th><Th right>Cant.</Th><Th right>P. unit.</Th><Th right>Subtotal</Th></tr></thead>
              <tbody>{sel.detalles.map((d) => <tr key={d.id}><Td>{d.productoNombre}</Td><Td right>{d.cantidad}</Td><Td right>{money(d.precioUnitario)}</Td><Td right>{money(d.subtotal)}</Td></tr>)}</tbody></Table>
            <p className="text-right font-semibold">Total: {money(sel.total)}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
