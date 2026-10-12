"use client";
import { useState } from "react";
import { Eye, Lock, Unlock } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { fmtDateTime, money } from "@/lib/format";
import type { Caja, PageResponse, ResumenCaja } from "@/lib/types";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBox, IconButton, Loading, Modal, PageHeader, Pagination, Table, Td, Th } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import ResumenView from "@/components/ResumenView";
import AbrirCajaModal from "../components/AbrirCajaModal";
import CerrarCajaModal from "../components/CerrarCajaModal";

export default function ArqueoPage() {
  const toast = useFeedback();
  const caja = useFetch<Caja>("/api/caja/actual");
  const resumen = useFetch<ResumenCaja>(caja.data ? "/api/caja/actual/resumen" : null);
  const [page, setPage] = useState(0);
  const hist = useFetch<PageResponse<Caja>>("/api/caja/historial", { page, size: 10 });

  const [abrirOpen, setAbrirOpen] = useState(false);
  const [cerrarOpen, setCerrarOpen] = useState(false);
  const [cierre, setCierre] = useState<ResumenCaja | null>(null);
  const [verId, setVerId] = useState<number | null>(null);
  const ver = useFetch<ResumenCaja>(verId ? `/api/caja/${verId}/resumen` : null);

  const esperado = resumen.data?.efectivoEsperado ?? 0;

  async function abrir(montoInicial: number) {
    try {
      await api("/api/caja/abrir", { body: { montoInicial } });
    } catch (e) { throw new Error(errorMessage(e)); }
    toast.success("Caja aperturada");
    window.dispatchEvent(new Event("caja:actualizada"));
    caja.reload(); hist.reload();
  }

  async function cerrar(montoFinal: number, montoDejado: number) {
    try {
      const r = await api<ResumenCaja>("/api/caja/cerrar", { body: { montoFinal, montoDejado } });
      setCierre(r);
      window.dispatchEvent(new Event("caja:actualizada"));
    } catch (e) { throw new Error(errorMessage(e)); }
    caja.reload(); hist.reload();
  }

  return (
    <>
      <PageHeader title="Arqueo de caja" subtitle="Apertura, control y cierre de tu turno." />

      {caja.loading ? <Loading /> : caja.error ? <ErrorBox message={caja.error} onRetry={caja.reload} /> : !caja.data ? (
        <Card className="mb-6 max-w-lg">
          <CardHeader title="Aperturar caja" subtitle="No tienes una caja abierta." />
          <div className="p-5">
            <Button onClick={() => setAbrirOpen(true)}><Unlock className="h-4 w-4" />Aperturar caja</Button>
          </div>
        </Card>
      ) : (
        <div className="mb-6 grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title={`Caja #${caja.data.id} abierta`} subtitle={`Desde ${fmtDateTime(caja.data.fechaInicio)} · ${caja.data.empleadoNombre}`} actions={<Badge tone="green">Abierta</Badge>} />
            <div className="p-5">{resumen.loading && !resumen.data ? <Loading /> : resumen.data ? <ResumenView r={resumen.data} /> : <ErrorBox message={resumen.error ?? "Sin datos"} onRetry={resumen.reload} />}</div>
          </Card>
          <Card>
            <CardHeader title="Cerrar caja" subtitle="Cuenta el efectivo físico antes de cerrar." />
            <div className="p-5">
              <Button variant="danger" className="w-full" onClick={() => setCerrarOpen(true)}><Lock className="h-4 w-4" />Cerrar caja</Button>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader title="Historial de cajas" />
        {hist.loading ? <Loading /> : hist.error ? <div className="p-4"><ErrorBox message={hist.error} onRetry={hist.reload} /></div> : !hist.data || hist.data.content.length === 0 ? <EmptyState title="Aún no hay cajas registradas" /> : (
          <>
            <Table>
              <thead><tr><Th>N.º</Th><Th>Responsable</Th><Th>Apertura</Th><Th>Cierre</Th><Th right>Inicial</Th><Th right>Contado</Th><Th>Estado</Th><Th /></tr></thead>
              <tbody>
                {hist.data.content.map((c) => (
                  <tr key={c.id}>
                    <Td className="font-medium">#{c.id}</Td><Td>{c.empleadoNombre}</Td><Td>{fmtDateTime(c.fechaInicio)}</Td><Td>{fmtDateTime(c.fechaFin)}</Td>
                    <Td right>{money(c.montoInicial)}</Td><Td right>{c.montoFinal != null ? money(c.montoFinal) : "—"}</Td>
                    <Td>{c.abierta ? <Badge tone="green">Abierta</Badge> : <Badge>Cerrada</Badge>}</Td>
                    <Td right><IconButton icon={Eye} label="Ver arqueo" onClick={() => setVerId(c.id)} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={hist.data.page} totalPages={hist.data.totalPages} total={hist.data.totalElements} onChange={setPage} />
          </>
        )}
      </Card>

      <AbrirCajaModal open={abrirOpen} onClose={() => setAbrirOpen(false)} onConfirm={abrir} />
      <CerrarCajaModal open={cerrarOpen} numeroArqueo={caja.data ? `caja #${caja.data.id}` : undefined} esperado={esperado} onClose={() => setCerrarOpen(false)} onConfirm={cerrar} />
      <Modal open={!!cierre} onClose={() => setCierre(null)} title="Caja cerrada" size="lg" footer={<Button onClick={() => setCierre(null)}>Entendido</Button>}>
        {cierre && <ResumenView r={cierre} />}
      </Modal>
      <Modal open={!!verId} onClose={() => setVerId(null)} title={`Arqueo de caja #${verId ?? ""}`} size="lg">
        {ver.loading ? <Loading /> : ver.data ? <ResumenView r={ver.data} /> : ver.error ? <ErrorBox message={ver.error} /> : null}
      </Modal>
    </>
  );
}
