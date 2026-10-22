'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, FileDown, FileSpreadsheet, X as XIcon } from 'lucide-react';
import { productosApi } from '@/api/productos';
import type { Producto } from '@/api/productos';
import { api, errorMessage } from '@/lib/api';
import { useConfig } from '@/lib/config-context';
import { useDebounce } from '@/hooks/useDebounce';
import type { Kardex } from '@/lib/types';
import type { FilaKardex } from '@/lib/reportes/kardexPdf';
import { fmtStock } from '@/lib/peso';

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function haceUnMesISO() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export default function KardexPage() {
  const { empresa, pub } = useConfig();
  const [kardex, setKardex] = useState<Kardex | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exportandoPdf, setExportandoPdf] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const q = useDebounce(busqueda.trim(), 250);
  const [sugerenciasProducto, setSugerencias] = useState<Producto[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  const [desde, setDesde] = useState(haceUnMesISO());
  const [hasta, setHasta] = useState(hoyISO());

  useEffect(() => {
    if (!q || productoSeleccionado) { setSugerencias([]); return; }
    let activo = true;
    productosApi.buscar(q, 8).then((l) => { if (activo) setSugerencias(l); }).catch(() => { if (activo) setSugerencias([]); });
    return () => { activo = false; };
  }, [q, productoSeleccionado]);

  // Movimientos del producto en el rango (el servidor calcula el saldo corrido)
  useEffect(() => {
    if (!productoSeleccionado) { setKardex(null); return; }
    let activo = true;
    setCargando(true);
    setError('');
    api<Kardex>(`/api/productos/${productoSeleccionado.id}/kardex`, { params: { desde, hasta } })
      .then((k) => { if (activo) setKardex(k); })
      .catch((e) => { if (activo) setError(errorMessage(e)); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [productoSeleccionado, desde, hasta]);

  const seleccionarProducto = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setBusqueda(producto.nombre);
    setMostrarSugerencias(false);
  };

  const limpiarProducto = () => {
    setProductoSeleccionado(null);
    setBusqueda('');
  };

  const filasVisibles = useMemo<FilaKardex[]>(() => {
    if (!kardex) return [];
    const costo = kardex.costoActual;
    return kardex.movimientos.map((m) => {
      const entrada = m.entrada > 0;
      const unidades = entrada ? m.entrada : m.salida;
      return {
        fecha: new Date(m.fecha),
        descripcion: `${m.documento} · ${m.detalle}`,
        entradaUnidades: entrada ? unidades : 0,
        entradaCostoUnit: entrada ? m.costoUnitario : 0,
        entradaValorTotal: entrada ? unidades * m.costoUnitario : 0,
        salidaUnidades: entrada ? 0 : unidades,
        salidaCostoUnit: entrada ? 0 : m.costoUnitario,
        salidaValorTotal: entrada ? 0 : unidades * m.costoUnitario,
        existenciaUnidades: m.saldo,
        existenciaCostoUnit: costo,
        existenciaValorTotal: m.saldo * costo,
      };
    });
  }, [kardex]);

  const productoKardex = productoSeleccionado ? { nombre: productoSeleccionado.nombre, precioCosto: kardex?.costoActual ?? productoSeleccionado.precioCompra } : null;

  const handleExportarPdf = async () => {
    if (!productoKardex) return;
    setExportandoPdf(true);
    setError('');
    try {
      const { generarKardexPdf } = await import('@/lib/reportes/kardexPdf');
      const blob = await generarKardexPdf(productoKardex, filasVisibles, desde, hasta, empresa?.logo ?? pub.logo ?? undefined);
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el PDF del kardex.');
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleExportarExcel = async () => {
    if (!productoKardex) return;
    const { exportarKardexExcel } = await import('@/lib/reportes/kardexExcel');
    await exportarKardexExcel(productoKardex, filasVisibles, desde, hasta);
  };

  const inputClass =
    'px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Kardex</h1>
          <p className="text-sm text-zinc-500 mt-1">Movimientos de entradas, salidas y existencias por producto.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportarPdf}
            disabled={!productoSeleccionado || filasVisibles.length === 0 || exportandoPdf}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown size={16} />
            {exportandoPdf ? 'Generando...' : 'Exportar PDF'}
          </button>
          <button
            onClick={handleExportarExcel}
            disabled={!productoSeleccionado || filasVisibles.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative w-full sm:w-[480px]">
            <label className="text-xs font-semibold text-zinc-600 block mb-1">Producto</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Search size={16} />
              </span>
              <input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setProductoSeleccionado(null);
                  setMostrarSugerencias(true);
                }}
                onFocus={() => setMostrarSugerencias(true)}
                onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                placeholder="Buscar por nombre o código de barras..."
                className="w-full pl-9 pr-9 py-2 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              {productoSeleccionado && (
                <button
                  onClick={limpiarProducto}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Quitar producto"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>

            {mostrarSugerencias && sugerenciasProducto.length > 0 && (
              <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg divide-y divide-zinc-100 min-w-full sm:min-w-[480px]">
                {sugerenciasProducto.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => seleccionarProducto(p)}
                    className="w-full flex items-start justify-between px-3 py-2 text-left hover:bg-zinc-50 transition-colors gap-3"
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-zinc-800 truncate">{p.nombre}</p>
                      <p className="text-[11px] text-zinc-500">{p.categoriaNombre}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                        Stock: {fmtStock(p, p.stockActual)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        {cargando && <p className="text-center text-zinc-400 py-10">Cargando información...</p>}

        {!cargando && !productoSeleccionado && (
          <p className="text-center text-zinc-400 py-10">Busca y selecciona un producto para ver su kardex.</p>
        )}

        {!cargando && productoSeleccionado && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-zinc-200">
              <thead>
                <tr className="bg-primary/10 text-primary font-bold uppercase tracking-wide">
                  <th rowSpan={2} className="border border-zinc-200 px-2 py-2">Fecha</th>
                  <th rowSpan={2} className="border border-zinc-200 px-2 py-2 text-left">Descripción</th>
                  <th colSpan={3} className="border border-zinc-200 px-2 py-2">Entradas</th>
                  <th colSpan={3} className="border border-zinc-200 px-2 py-2">Salidas</th>
                  <th colSpan={3} className="border border-zinc-200 px-2 py-2">Existencias</th>
                </tr>
                <tr className="bg-primary/5 text-primary font-semibold uppercase text-[10px] tracking-wide">
                  <th className="border border-zinc-200 px-2 py-1">Unidades</th>
                  <th className="border border-zinc-200 px-2 py-1">Costo Unit</th>
                  <th className="border border-zinc-200 px-2 py-1">Valor Total</th>
                  <th className="border border-zinc-200 px-2 py-1">Unidades</th>
                  <th className="border border-zinc-200 px-2 py-1">Costo Unit</th>
                  <th className="border border-zinc-200 px-2 py-1">Valor Total</th>
                  <th className="border border-zinc-200 px-2 py-1">Unidades</th>
                  <th className="border border-zinc-200 px-2 py-1">Costo Unit</th>
                  <th className="border border-zinc-200 px-2 py-1">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {filasVisibles.length === 0 && (
                  <tr>
                    <td colSpan={11} className="border border-zinc-200 px-2 py-6 text-center text-zinc-400">
                      Sin movimientos en el rango de fechas seleccionado.
                    </td>
                  </tr>
                )}
                {filasVisibles.map((f, i) => (
                  <tr key={i} className="hover:bg-zinc-50 text-center">
                    <td className="border border-zinc-200 px-2 py-1.5 whitespace-nowrap">
                      {f.fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="border border-zinc-200 px-2 py-1.5 text-left">{f.descripcion}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.entradaUnidades || ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.entradaUnidades ? f.entradaCostoUnit.toFixed(2) : ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.entradaUnidades ? f.entradaValorTotal.toFixed(2) : ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.salidaUnidades || ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.salidaUnidades ? f.salidaCostoUnit.toFixed(2) : ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.salidaUnidades ? f.salidaValorTotal.toFixed(2) : ''}</td>
                    <td className="border border-zinc-200 px-2 py-1.5 font-semibold text-primary">{f.existenciaUnidades}</td>
                    <td className="border border-zinc-200 px-2 py-1.5">{f.existenciaCostoUnit.toFixed(2)}</td>
                    <td className="border border-zinc-200 px-2 py-1.5 font-semibold">{f.existenciaValorTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}