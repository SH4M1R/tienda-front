'use client';

import { Fragment, useState } from 'react';
import { usePaginaServidor } from '@/hooks/usePaginaServidor';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, Plus, Printer } from 'lucide-react';
import { trasladosApi } from '@/api/traslados';
import type { Traslado, TipoTraslado } from '@/api/traslados';
import { previsualizarReporte, type Col, type ReportDef } from '@/lib/reportes';
import { useEmpresaDoc } from '@/hooks/useEmpresaDoc';
import Paginacion from '@/components/Paginacion';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface Props {
  tipo: TipoTraslado;
}

export default function TrasladoListado({ tipo }: Props) {
  const empresa = useEmpresaDoc();
  const [search, setSearch] = useState('');
  const q = useDebounce(search.trim(), 300);
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [menuImprimirId, setMenuImprimirId] = useState<number | null>(null);

  const {
    items: traslados, total: totalItems, totalPages: totalPaginas, page: paginaSegura, size: pageSize,
    loading, setPage: setCurrentPage, cambiarTamano,
  } = usePaginaServidor<Traslado>(
    (p, sz) => trasladosApi.listarPaginado(p, sz, tipo, q),
    [tipo, q],
    PAGE_SIZE_OPTIONS[0]
  );

  const handleImprimir = async (traslado: Traslado, formato: 'pos80' | 'a4') => {
    setMenuImprimirId(null);
    const cols: Col<Traslado['detalles'][number]>[] = [
      { header: 'Producto', width: 5, render: (d) => d.productoNombre },
      { header: 'Cant.', width: 1.5, align: 'right', render: (d) => String(d.cantidad), value: (d) => d.cantidad },
      { header: 'P.U.', width: 2, align: 'right', pos: false, render: (d) => `S/ ${d.precioUnitario.toFixed(2)}`, value: (d) => d.precioUnitario },
      { header: 'Subtotal', width: 2.5, align: 'right', render: (d) => `S/ ${d.subtotal.toFixed(2)}`, value: (d) => d.subtotal },
    ];
    const def: ReportDef<Traslado['detalles'][number]> = {
      titulo: `${traslado.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'} #${String(traslado.id).padStart(6, '0')}`,
      subtitulo: [
        `Sucursal: ${traslado.sucursalNombre}`,
        `Fecha: ${new Date(traslado.fecha).toLocaleString('es-PE')}`,
        ...(traslado.observacion ? [`Observación: ${traslado.observacion}`] : []),
      ],
      columnas: cols,
      filas: traslado.detalles,
      resumen: [{ label: 'TOTAL', value: `S/ ${traslado.total.toFixed(2)}`, bold: true }],
      archivo: `traslado_${traslado.id}`,
    };
    await previsualizarReporte(def, formato, empresa);
  };

  const titulo = tipo === 'INGRESO' ? 'Ingresos' : 'Egresos';
  const rutaRegistro =
    tipo === 'INGRESO'
      ? '/traslados/ingresos/registrar'
      : '/traslados/egresos/registrar';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">{titulo}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {tipo === 'INGRESO'
              ? 'Historial de productos ingresados desde otra sucursal.'
              : 'Historial de productos egresados hacia otra sucursal.'}
          </p>
        </div>
        <Link
          href={rutaRegistro}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold shadow-xs hover:bg-primary-dark transition-all"
        >
          <Plus size={14} /> Registrar {tipo === 'INGRESO' ? 'ingreso' : 'egreso'}
        </Link>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
          <Search size={16} />
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por sucursal o producto..."
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {loading && traslados.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            Cargando {titulo.toLowerCase()}...
          </div>
        ) : traslados.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            No se encontraron {titulo.toLowerCase()}.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                    <th className="px-5 py-3">FECHA</th>
                    <th className="px-5 py-3">SUCURSAL</th>
                    <th className="px-5 py-3">PRODUCTOS</th>
                    <th className="px-5 py-3">TOTAL</th>
                    <th className="px-5 py-3 text-right">ACCIONES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {traslados.map((t) => (
                    <Fragment key={t.id}>
                      <tr className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-5 py-3 text-zinc-600">
                          {new Date(t.fecha).toLocaleString('es-PE')}
                        </td>
                        <td className="px-5 py-3 font-semibold text-zinc-800">
                          {t.sucursalNombre}
                        </td>
                        <td className="px-5 py-3 text-zinc-600">
                          {t.detalles.length} producto(s)
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                            S/ {t.total.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1 relative">
                            <button
                              onClick={() =>
                                setMenuImprimirId(menuImprimirId === t.id ? null : t.id)
                              }
                              title="Imprimir reporte"
                              className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border-2"
                            >
                              <Printer size={16} />
                            </button>

                            {menuImprimirId === t.id && (
                              <div className="absolute right-0 top-10 z-10 w-40 bg-white border border-zinc-200 rounded-lg shadow-md overflow-hidden">
                                <button
                                  onClick={() => handleImprimir(t, 'pos80')}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
                                >
                                  Ticket (80mm)
                                </button>
                                <button
                                  onClick={() => handleImprimir(t, 'a4')}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
                                >
                                  Formato A4
                                </button>
                              </div>
                            )}

                            <button
                              onClick={() =>
                                setExpandidoId(expandidoId === t.id ? null : t.id)
                              }
                              className="p-2 text-primary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border-2"
                              title="Ver detalle"
                            >
                              {expandidoId === t.id ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandidoId === t.id && (
                        <tr>
                          <td colSpan={5} className="px-5 py-4 bg-zinc-50/60">
                            {t.observacion && (
                              <p className="text-xs text-zinc-500 mb-3">
                                <span className="font-semibold text-zinc-600">
                                  Observación:
                                </span>{' '}
                                {t.observacion}
                              </p>
                            )}
                            <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-primary/10 border-b border-zinc-200 text-left font-bold text-primary uppercase tracking-wider">
                                    <th className="px-4 py-2">PRODUCTO</th>
                                    <th className="px-4 py-2">CANTIDAD</th>
                                    <th className="px-4 py-2">PRECIO UNITARIO</th>
                                    <th className="px-4 py-2">SUBTOTAL</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                  {t.detalles.map((d) => (
                                    <tr key={d.id}>
                                      <td className="px-4 py-2 font-semibold text-zinc-700">
                                        {d.productoNombre}
                                      </td>
                                      <td className="px-4 py-2 text-zinc-600">
                                        {d.cantidad}
                                      </td>
                                      <td className="px-4 py-2 text-zinc-600">
                                        S/ {d.precioUnitario.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-2 text-zinc-600">
                                        S/ {d.subtotal.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {traslados.length > 0 && (
              <Paginacion
                currentPage={paginaSegura}
                totalPages={totalPaginas}
                pageSize={pageSize}
                totalItems={totalItems}
                itemLabel={tipo === 'INGRESO' ? 'ingresos' : 'egresos'}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setCurrentPage}
                onPageSizeChange={cambiarTamano}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}