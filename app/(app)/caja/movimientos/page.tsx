'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Ban, Plus } from 'lucide-react';
import RegistrarMovimientoModal from '../components/RegistrarMovimientoModal';
import { movimientoCajaApi } from '@/api/movimientoCaja';
import type { MovimientoCaja } from '@/api/movimientoCaja';

function formatFecha(fecha: string | null) {
  if (!fecha) return '';
  return fecha.replace('T', ' ').slice(0, 19);
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function hoyISO() {
  return iso(new Date());
}

function haceUnaSemanaISO() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return iso(d);
}

const CATEGORIA_LABEL: Record<string, string> = {
  RETIRO_EFECTIVO: 'Retiro de efectivo',
  PAGO_PROVEEDOR: 'Pago a proveedor',
  PAGO_SERVICIOS: 'Pago de servicios',
  GASTO_VARIO: 'Gasto vario',
  APORTE_CAPITAL: 'Aporte de capital',
  DEVOLUCION: 'Devolución',
  OTRO: 'Otro',
};

const MEDIO_PAGO_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  YAPE_PLIN: 'Yape / Plin',
};

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const [desde, setDesde] = useState(haceUnaSemanaISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'INGRESO' | 'EGRESO'>('TODOS');
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const data = await movimientoCajaApi.listar(desde, hasta);
      setMovimientos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los movimientos.');
      setMovimientos([]);
    } finally {
      setCargando(false);
    }
  };

  const handleAnular = async (mov: MovimientoCaja) => {
    if (!confirm(`¿Anular el movimiento "${mov.numero}"? Esta acción no se puede deshacer.`)) return;
    setError('');
    try {
      await movimientoCajaApi.anular(mov.id);
      await cargarDatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo anular el movimiento.');
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    let lista = Array.isArray(movimientos) ? movimientos : [];
    if (filtroTipo !== 'TODOS') {
      lista = lista.filter((m) => m.tipo === filtroTipo);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter((m) =>
        (m.numero?.toLowerCase() ?? '').includes(q) ||
        (m.descripcion?.toLowerCase() ?? '').includes(q) ||
        (m.empleadoNombre?.toLowerCase() ?? '').includes(q)
      );
    }
    return lista;
  }, [movimientos, busqueda, filtroTipo]);

  const totales = useMemo(() => {
    const activos = filtrados.filter((m) => !m.anulado);
    const ingresos = activos.filter((m) => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0);
    const egresos = activos.filter((m) => m.tipo === 'EGRESO').reduce((s, m) => s + m.monto, 0);
    return { ingresos, egresos, neto: ingresos - egresos };
  }, [filtrados]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / registrosPorPagina));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const paginados = filtrados.slice(
    (paginaSegura - 1) * registrosPorPagina,
    paginaSegura * registrosPorPagina
  );

  const tabClass = (active: boolean) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
      active ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'
    }`;

  const inputClass = "px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary tracking-tight">Ingresos y Egresos</h1>
        <button
          onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all cursor-pointer"
        >
          <Plus size={16} /> Registrar movimiento
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <ArrowUpCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-semibold">Total Ingresos</p>
            <p className="text-lg font-bold text-green-600">S/. {totales.ingresos.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <ArrowDownCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-semibold">Total Egresos</p>
            <p className="text-lg font-bold text-red-600">S/. {totales.egresos.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ArrowUpCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-semibold">Neto</p>
            <p className={`text-lg font-bold ${totales.neto >= 0 ? 'text-primary' : 'text-red-600'}`}>
              S/. {totales.neto.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 p-5 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => { setFiltroTipo('TODOS'); setPaginaActual(1); }} className={tabClass(filtroTipo === 'TODOS')}>Todos</button>
          <button onClick={() => { setFiltroTipo('INGRESO'); setPaginaActual(1); }} className={tabClass(filtroTipo === 'INGRESO')}>Ingresos</button>
          <button onClick={() => { setFiltroTipo('EGRESO'); setPaginaActual(1); }} className={tabClass(filtroTipo === 'EGRESO')}>Egresos</button>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputClass} />
          </div>
          <button
            onClick={() => { setPaginaActual(1); cargarDatos(); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/80 rounded-lg shadow-xs hover:shadow-md transition-all"
          >
            Mostrar
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            Mostrar
            <select
              value={registrosPorPagina}
              onChange={(e) => { setRegistrosPorPagina(Number(e.target.value)); setPaginaActual(1); }}
              className={inputClass}
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            registros
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-600">Buscar:</label>
            <input
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wide text-zinc-400 border-b border-zinc-200">
                <th className="py-2 px-2">#</th>
                <th className="py-2 px-2">Tipo</th>
                <th className="py-2 px-2">Categoría</th>
                <th className="py-2 px-2">Número</th>
                <th className="py-2 px-2">Fecha Emisión</th>
                <th className="py-2 px-2">Motivo</th>
                <th className="py-2 px-2">Importe</th>
                <th className="py-2 px-2">Medio Pago</th>
                <th className="py-2 px-2">Empleado</th>
                <th className="py-2 px-2">Fecha Registro</th>
                <th className="py-2 px-2">Estado</th>
                <th className="py-2 px-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr><td colSpan={12} className="py-6 text-center text-zinc-400">Cargando...</td></tr>
              )}
              {!cargando && paginados.length === 0 && (
                <tr><td colSpan={12} className="py-6 text-center text-zinc-400">Sin registros.</td></tr>
              )}
              {!cargando && paginados.map((m, i) => (
                <tr key={m.id} className={`border-b border-zinc-100 hover:bg-zinc-50 ${m.anulado ? 'opacity-50' : ''}`}>
                  <td className="py-2 px-2">{(paginaSegura - 1) * registrosPorPagina + i + 1}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      m.tipo === 'INGRESO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {m.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td className="py-2 px-2">{CATEGORIA_LABEL[m.categoria] ?? m.categoria}</td>
                  <td className="py-2 px-2 font-semibold text-primary">{m.numero ?? '—'}</td>
                  <td className="py-2 px-2">{m.fechaEmision ?? ''}</td>
                  <td className="py-2 px-2 max-w-[220px] truncate" title={m.descripcion}>{m.descripcion}</td>
                  <td className={`py-2 px-2 font-semibold ${m.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                    {m.tipo === 'INGRESO' ? '+' : '-'} S/. {m.monto.toFixed(2)}
                  </td>
                  <td className="py-2 px-2">{MEDIO_PAGO_LABEL[m.medioPago] ?? m.medioPago}</td>
                  <td className="py-2 px-2">{m.empleadoNombre}</td>
                  <td className="py-2 px-2">{formatFecha(m.fechaRegistro)}</td>
                  <td className="py-2 px-2">
                    {m.anulado ? (
                      <span className="text-xs font-semibold text-zinc-400">Anulado</span>
                    ) : (
                      <span className="text-xs font-semibold text-green-600">Activo</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {!m.anulado && (
                      <button
                        onClick={() => handleAnular(m)}
                        title="Anular movimiento"
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-200 hover:bg-zinc-300 text-zinc-600 transition-colors"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500">
            Mostrando registros del {filtrados.length === 0 ? 0 : (paginaSegura - 1) * registrosPorPagina + 1} al{' '}
            {Math.min(paginaSegura * registrosPorPagina, filtrados.length)} de un total de {filtrados.length} registros
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={paginaSegura <= 1}
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white text-xs font-semibold">{paginaSegura}</span>
            <button
              disabled={paginaSegura >= totalPaginas}
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <RegistrarMovimientoModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onConfirm={async (data) => {
          await movimientoCajaApi.registrar(data);
          await cargarDatos();
        }}
      />
    </div>
  );
}