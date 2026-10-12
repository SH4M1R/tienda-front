'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus } from 'lucide-react';
import type { Producto } from '@/api/productos';
import { trasladosApi, sucursalesApi } from '@/api/traslados';
import type { TipoTraslado, Sucursal, TrasladoDetalleInput } from '@/api/traslados';
import BuscadorProductos from './BuscadorProductos';
import SucursalModal from './SucursalModal';

interface LineaDetalle extends TrasladoDetalleInput {
  nombreProducto: string;
  stockActual: number;
}

interface Props {
  tipo: TipoTraslado;
}

export default function TrasladoRegistroForm({ tipo }: Props) {
  const router = useRouter();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [idSucursal, setIdSucursal] = useState<number | ''>('');
  const [observacion, setObservacion] = useState('');
  const [lineas, setLineas] = useState<LineaDetalle[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [sucursalModalOpen, setSucursalModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sucursalesApi.listar().then(setSucursales).catch(() => setSucursales([]));
  }, []);

  const total = useMemo(() => lineas.reduce((acc, l) => acc + l.cantidad * l.precioUnitario, 0), [lineas]);

  const agregarProducto = (producto: Producto) => {
    setLineas((prev) => {
      const existente = prev.find((l) => l.productoId === producto.id);
      if (existente) {
        return prev.map((l) => l.productoId === producto.id ? { ...l, cantidad: l.cantidad + 1 } : l);
      }
      return [...prev, {
        productoId: producto.id,
        nombreProducto: producto.nombre,
        stockActual: producto.stockActual ?? 0,
        cantidad: 1,
        precioUnitario: producto.precioCompra,
      }];
    });
  };

  const handleSucursalCreada = (sucursal: Sucursal) => {
    setSucursales((prev) => [...prev, sucursal]);
    setIdSucursal(sucursal.id);
  };

  const actualizarLinea = (productoId: number, campo: 'cantidad' | 'precioUnitario', valor: number) => {
    setLineas((prev) => prev.map((l) => l.productoId === productoId ? { ...l, [campo]: valor } : l));
  };

  const quitarLinea = (productoId: number) => {
    setLineas((prev) => prev.filter((l) => l.productoId !== productoId));
  };

  const handleGuardar = async () => {
    setError(null);
    if (!idSucursal) { setError('Selecciona una sucursal.'); return; }
    if (lineas.length === 0) { setError('Agrega al menos un producto.'); return; }
    if (tipo === 'EGRESO') {
      const sinStock = lineas.find((l) => l.cantidad > l.stockActual);
      if (sinStock) { setError(`Stock insuficiente para "${sinStock.nombreProducto}" (disponible: ${sinStock.stockActual}).`); return; }
    }

    setGuardando(true);
    try {
      await trasladosApi.crear({
        tipo,
        sucursalId: Number(idSucursal),
        observacion: observacion.trim() || undefined,
        detalles: lineas.map(({ productoId, cantidad, precioUnitario }) => ({ productoId, cantidad, precioUnitario })),
      });
      router.push(tipo === 'INGRESO' ? '/traslados/ingresos' : '/traslados/egresos');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Ocurrió un error al registrar el traslado.');
    } finally {
      setGuardando(false);
    }
  };

  const titulo = tipo === 'INGRESO' ? 'Registrar ingreso' : 'Registrar egreso';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">{titulo}</h1>
          <p className="text-sm text-zinc-500 mt-1">Busca los productos y registra las cantidades del traslado.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Sucursal</label>
            <div className="flex gap-2">
              <select
                value={idSucursal}
                onChange={(e) => setIdSucursal(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              >
                <option value="">Selecciona una sucursal...</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSucursalModalOpen(true)}
                title="Nueva sucursal"
                className="shrink-0 px-3 rounded-lg border border-zinc-300 text-zinc-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Observación (opcional)</label>
            <input
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej. traslado por reposición de stock"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Buscar producto</label>
          <BuscadorProductos onSelect={agregarProducto} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {lineas.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">Aún no has agregado productos.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary/10 border-b border-zinc-200 text-left text-xs font-bold text-primary uppercase tracking-wider">
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3 w-32">Cantidad</th>
                <th className="px-5 py-3 w-36">Precio unitario</th>
                <th className="px-5 py-3 w-32">Subtotal</th>
                <th className="px-5 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {lineas.map((l) => (
                <tr key={l.productoId} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="px-5 py-3 font-semibold text-zinc-800">
                    {l.nombreProducto}
                    {tipo === 'EGRESO' && (
                      <p className="text-xs font-normal text-zinc-400">Stock actual: {l.stockActual}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      min={1}
                      value={l.cantidad}
                      onChange={(e) => actualizarLinea(l.productoId, 'cantidad', Math.max(1, Number(e.target.value)))}
                      className="w-24 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={l.precioUnitario}
                      onChange={(e) => actualizarLinea(l.productoId, 'precioUnitario', Math.max(0, Number(e.target.value)))}
                      className="w-28 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                  </td>
                  <td className="px-5 py-3 font-semibold text-zinc-700">S/ {(l.cantidad * l.precioUnitario).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => quitarLinea(l.productoId)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border-2">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {error && <p className="text-sm text-red-500 font-medium mb-1">{error}</p>}
          <p className="text-sm text-zinc-500">Total del traslado</p>
          <p className="text-2xl font-bold text-zinc-900">S/ {total.toFixed(2)}</p>
        </div>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : `Registrar ${tipo === 'INGRESO' ? 'ingreso' : 'egreso'}`}
        </button>
      </div>

      <SucursalModal
        open={sucursalModalOpen}
        onClose={() => setSucursalModalOpen(false)}
        onCreated={handleSucursalCreada}
      />
    </div>
  );
}