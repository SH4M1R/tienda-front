'use client';

import {
  BarChart2, CheckCircle, CreditCard, FileSpreadsheet, FileText, Loader2, Printer, ShoppingBag, ShoppingCart,
  TrendingUp, Users, Wallet, Activity, Boxes, CalendarClock, AlertTriangle, Receipt, Calendar,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import GraficoReporte from '@/components/GraficoReporte';
import ModalAviso from '@/components/ModalAviso';
import Paginacion from '@/components/Paginacion';
import { exportarReporte, previsualizarReporte, type Grafico, type ReportDef } from '@/lib/reportes';
import { REPORTES, type ReporteItem } from '@/lib/reportes/catalogo';
import { useEmpresaDoc } from '@/hooks/useEmpresaDoc';

type Modulo = 'Ventas' | 'Caja' | 'Compras' | 'Inventario' | 'Gestión';

const MODULOS: { id: Modulo; grupos: ReporteItem['grupo'][] }[] = [
  { id: 'Ventas', grupos: ['Ventas'] },
  { id: 'Caja', grupos: ['Caja'] },
  { id: 'Compras', grupos: ['Compras'] },
  { id: 'Inventario', grupos: ['Inventario'] },
  { id: 'Gestión', grupos: ['Personal', 'General'] },
];

const ICONOS: Record<string, React.ElementType> = {
  'ventas-periodo': Calendar,
  'ventas-empleado': Users,
  'ventas-medio': CreditCard,
  'top-productos': ShoppingBag,
  'ventas-producto': BarChart2,
  'cierres-caja': Wallet,
  'flujo-caja': Activity,
  'compras-proveedor': ShoppingCart,
  'cuentas-por-pagar': Receipt,
  'inventario-valorizado': Boxes,
  'alerta-stock': AlertTriangle,
  'por-vencer': CalendarClock,
  asistencia: CheckCircle,
  consolidado: TrendingUp,
};

const cardClass = 'bg-white rounded-2xl border border-zinc-200 shadow-xs';
const inputClass = 'px-3 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';
const labelClass = 'flex flex-col gap-1 text-xs font-semibold text-zinc-500';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoy = () => iso(new Date());
const inicioDeMes = () => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)); };

const fechaTxt = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };

export default function ReportesPage() {
  const emp = useEmpresaDoc();
  const [modulo, setModulo] = useState<Modulo>('Ventas');
  const [id, setId] = useState('ventas-periodo');
  const [desde, setDesde] = useState(inicioDeMes());
  const [hasta, setHasta] = useState(hoy());
  const [dias, setDias] = useState('30');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [def, setDef] = useState<ReportDef<any> | null>(null);
  const [grafico, setGrafico] = useState<Grafico | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState<string | null>(null);
  const [generado, setGenerado] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(25);
  const [aviso, setAviso] = useState<{ open: boolean; mensaje: string }>({ open: false, mensaje: '' });
  const peticion = useRef(0);

  const item = useMemo(() => REPORTES.find((r) => r.id === id) ?? REPORTES[0], [id]);
  const items = useMemo(() => {
    const m = MODULOS.find((x) => x.id === modulo)!;
    return REPORTES.filter((r) => m.grupos.includes(r.grupo));
  }, [modulo]);

  const generar = async (reporte: ReporteItem = item) => {
    if (reporte.periodo && desde > hasta) {
      setAviso({ open: true, mensaje: 'La fecha de inicio no puede ser mayor a la fecha fin.' });
      return;
    }
    const mia = ++peticion.current;
    setCargando(true);
    try {
      const r = await reporte.construir(desde, hasta, Number(dias) || 30);
      if (mia !== peticion.current) return; // llegó una respuesta más nueva
      setDef(r);
      setGrafico(reporte.grafico?.(r.filas) ?? null);
      setPagina(1);
      setGenerado(true);
    } catch (e) {
      if (mia === peticion.current) setAviso({ open: true, mensaje: e instanceof Error ? e.message : 'Ocurrió un error al generar el reporte.' });
    } finally {
      if (mia === peticion.current) setCargando(false);
    }
  };

  useEffect(() => {
    void generar(REPORTES[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegir = (nuevo: ReporteItem) => {
    setId(nuevo.id);
    setDef(null);
    setGrafico(null);
    setGenerado(false);
    void generar(nuevo);
  };

  const cambiarModulo = (m: Modulo) => {
    setModulo(m);
    const primero = REPORTES.find((r) => MODULOS.find((x) => x.id === m)!.grupos.includes(r.grupo));
    if (primero) elegir(primero);
  };

  const exportar = async (formato: 'pos80' | 'a4' | 'excel') => {
    if (!def) return;
    setExportando(formato);
    try {
      if (formato === 'pos80') await previsualizarReporte(def, 'pos80', emp);
      else await exportarReporte(def, formato, emp);
    } catch (e) {
      setAviso({ open: true, mensaje: e instanceof Error ? e.message : 'No se pudo exportar el reporte.' });
    } finally {
      setExportando(null);
    }
  };

  const filas = def?.filas ?? [];
  const totalPaginas = Math.max(1, Math.ceil(filas.length / tamano));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filas.slice((paginaSegura - 1) * tamano, paginaSegura * tamano);

  return (
    <div className="space-y-6">
      <ModalAviso isOpen={aviso.open} titulo="Reportes" mensaje={aviso.mensaje} tipo="error" onClose={() => setAviso({ open: false, mensaje: '' })} />

      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Reportes</h1>
        <p className="text-sm text-zinc-500 mt-1">Genera, visualiza e imprime información clave de tu negocio</p>
      </div>

      {/* Categorías */}
      <div className="flex border-b border-zinc-200 bg-white rounded-xl shadow-xs overflow-x-auto p-1.5 gap-1">
        {MODULOS.map((m) => {
          const act = modulo === m.id;
          return (
            <button
              key={m.id}
              onClick={() => cambiarModulo(m.id)}
              className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer text-center ${
                act ? 'bg-primary text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {m.id}
            </button>
          );
        })}
      </div>

      {/* Reportes de la categoría */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((r) => {
          const Icono = ICONOS[r.id] ?? FileText;
          const activo = id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => elegir(r)}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                activo ? 'bg-white border-primary ring-2 ring-primary/20 shadow-md' : 'bg-white border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${activo ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                <Icono size={20} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold truncate ${activo ? 'text-primary' : 'text-zinc-800'}`}>{r.titulo}</p>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{r.descripcion}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {/* Filtros y acciones */}
        <div className={`${cardClass} p-4 flex flex-wrap items-end gap-3`}>
          {item.periodo && (
            <>
              <label className={labelClass}>
                Desde
                <input type="date" className={inputClass} value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
              </label>
              <label className={labelClass}>
                Hasta
                <input type="date" className={inputClass} value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
              </label>
            </>
          )}
          {item.id === 'por-vencer' && (
            <label className={labelClass}>
              Días de margen
              <input type="number" min={1} className={`${inputClass} w-28`} value={dias} onChange={(e) => setDias(e.target.value)} />
            </label>
          )}
          <button
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer"
            disabled={cargando}
            onClick={() => generar()}
          >
            {cargando ? 'Generando…' : 'Generar'}
          </button>

          <div className="ml-auto flex flex-wrap gap-2">
            <button
              disabled={!filas.length || !!exportando}
              onClick={() => exportar('pos80')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {exportando === 'pos80' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} POS80
            </button>
            <button
              disabled={!filas.length || !!exportando}
              onClick={() => exportar('a4')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {exportando === 'a4' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} A4
            </button>
            <button
              disabled={!filas.length || !!exportando}
              onClick={() => exportar('excel')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {exportando === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Excel
            </button>
          </div>
        </div>

        {/* Gráfico, resumen y tabla */}
        <div className={cardClass}>
          <div className="px-5 py-3 border-b border-zinc-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-zinc-800">{item.titulo}</h2>
              <p className="text-xs text-zinc-500">{item.periodo ? `Del ${fechaTxt(desde)} al ${fechaTxt(hasta)}` : 'Información actual'}</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{item.grupo}</span>
          </div>

          {def?.resumen && def.resumen.length > 0 && (
            <div className="px-5 py-3 border-b border-zinc-100 flex flex-wrap gap-x-8 gap-y-2">
              {def.resumen.map((r) => (
                <div key={r.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{r.label}</p>
                  <p className={`text-sm ${r.bold ? 'font-black text-primary' : 'font-bold text-zinc-700'}`}>{r.value}</p>
                </div>
              ))}
            </div>
          )}

          {grafico && (
            <div className="p-4 border-b border-zinc-100">
              <GraficoReporte g={grafico} />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-primary/10">
                <tr>
                  {def?.columnas.map((c) => (
                    <th key={c.header} className={`px-5 py-3 text-xs font-bold uppercase tracking-wide text-primary ${c.align === 'right' ? 'text-right' : ''}`}>
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {def && visibles.map((f, i) => (
                  <tr key={i} className="hover:bg-zinc-50/60">
                    {def.columnas.map((c) => (
                      <td key={c.header} className={`px-5 py-3 text-sm text-zinc-700 ${c.align === 'right' ? 'text-right whitespace-nowrap' : ''}`}>
                        {c.render(f)}
                      </td>
                    ))}
                  </tr>
                ))}
                {filas.length === 0 && (
                  <tr>
                    <td colSpan={Math.max(def?.columnas.length ?? 1, 1)} className="px-5 py-12 text-center text-sm text-zinc-400">
                      {cargando ? 'Cargando…' : generado ? 'Sin datos para mostrar.' : 'Pulsa "Generar".'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filas.length > 0 && (
            <Paginacion
              currentPage={paginaSegura}
              totalPages={totalPaginas}
              pageSize={tamano}
              totalItems={filas.length}
              itemLabel="registros"
              onPageChange={setPagina}
              onPageSizeChange={(s) => { setTamano(s); setPagina(1); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
