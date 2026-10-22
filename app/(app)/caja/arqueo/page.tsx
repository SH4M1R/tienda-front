"use client";

import { useState } from "react";
import { Lock, Eye, Unlock } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useAuth } from "@/lib/auth-context";
import { fmtDateTime, money } from "@/lib/format";
import type { Caja, PageResponse, ResumenCaja } from "@/lib/types";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorBox, Loading, Modal, PageHeader, Pagination, Table, Td, Th } from "@/components/ui";
import { useFeedback } from "@/components/feedback";
import ResumenView from "@/components/ResumenView";
import AbrirCajaModal from "../components/AbrirCajaModal";
import CerrarCajaModal from "../components/CerrarCajaModal";

export default function ArqueoPage() {
  const toast = useFeedback();
  const { user } = useAuth();

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
      toast.success("Caja aperturada con éxito");
      window.dispatchEvent(new Event("caja:actualizada"));
      caja.reload();
      hist.reload();
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  }

  async function cerrar(montoFinal: number, montoDejado: number) {
    try {
      const r = await api<ResumenCaja>("/api/caja/cerrar", { body: { montoFinal, montoDejado } });
      setCierre(r);
      toast.success("Caja cerrada correctamente");
      window.dispatchEvent(new Event("caja:actualizada"));
      caja.reload();
      hist.reload();
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader title="Arqueo de caja" />

      {/* Sección Superior: Control de Caja Actual y Resumen de Métodos de Pago */}
      {caja.loading ? (
        <Loading />
      ) : caja.error ? (
        <ErrorBox message={caja.error} onRetry={caja.reload} />
      ) : !caja.data ? (
          <div className="p-2">
            <Button onClick={() => setAbrirOpen(true)}>
              <Unlock className="h-4 w-4" /> Aperturar caja
            </Button>
          </div>
      ) : (
        <div className="mb-6 grid gap-4 xl:grid-cols-3">
          {/* Panel con la Tabla / Resumen de Métodos de Pago */}
          <Card className="xl:col-span-3">
            <div className="p-5">
              {resumen.loading && !resumen.data ? (
                <Loading />
              ) : resumen.data ? (
                <ResumenView r={resumen.data} />
              ) : (
                <ErrorBox message={resumen.error ?? "Sin datos"} onRetry={resumen.reload} />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tabla del Historial de Cajas */}
      <Card>
        <CardHeader title="Historial de cajas" />
        {hist.loading ? (
          <Loading />
        ) : hist.error ? (
          <div className="p-4"><ErrorBox message={hist.error} onRetry={hist.reload} /></div>
        ) : !hist.data || hist.data.content.length === 0 ? (
          <EmptyState title="Aún no hay cajas registradas" />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>N.º</Th>
                  <Th>Responsable</Th>
                  <Th>Apertura</Th>
                  <Th>Cierre</Th>
                  <Th right>Inicial</Th>
                  <Th right>Contado</Th>
                  <Th>Estado</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {hist.data.content.map((c) => {
                  // Determina si esta fila corresponde a la caja actual abierta del usuario
                  const esMiCaja =
                    (caja.data != null && c.id === caja.data.id) ||
                    (user?.nombre != null && c.empleadoNombre === user.nombre);

                  return (
                    <tr key={c.id}>
                      <Td className="font-medium">#{c.id}</Td>
                      <Td>{c.empleadoNombre}</Td>
                      <Td>{fmtDateTime(c.fechaInicio)}</Td>
                      <Td>{fmtDateTime(c.fechaFin)}</Td>
                      <Td right>{money(c.montoInicial)}</Td>
                      <Td right>{c.montoFinal != null ? money(c.montoFinal) : "—"}</Td>
                      <Td>
                        {c.abierta ? <Badge tone="green">Abierta</Badge> : <Badge>Cerrada</Badge>}
                      </Td>
                      <Td right>
                        <div className="flex items-center justify-end gap-1.5">
                          {c.abierta && (
                            esMiCaja ? (
                              <button
                                type="button"
                                onClick={() => setCerrarOpen(true)}
                                title="Cerrar mi caja"
                                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors border-2 cursor-pointer"
                              >
                                <Lock size={14} />
                              </button>
                            ) : (
                              <span
                                title="Solo el usuario que abrió esta caja puede cerrarla"
                                className="px-2 py-1 text-xs text-zinc-400 border border-zinc-200 rounded-lg bg-zinc-50"
                              >
                                —
                              </span>
                            )
                          )}

                          <button
                            type="button"
                            onClick={() => setVerId(c.id)}
                            title="Ver resumen"
                            className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border-2 cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
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