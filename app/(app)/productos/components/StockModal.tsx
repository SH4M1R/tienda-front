'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { productosApi, type LoteProducto, type Producto } from '@/api/productos';

interface StockModalProps {
  open: boolean;
  producto: Producto | null;
  onClose: () => void;
}

export default function StockModal({ open, producto, onClose }: StockModalProps) {
  const [lotes, setLotes] = useState<LoteProducto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !producto) return;
    let activo = true;
    setCargando(true);
    setError('');
    productosApi.lotes(producto.id)
      .then((d) => { if (activo) setLotes(d); })
      .catch(() => { if (activo) setError('No se pudieron cargar los lotes de este producto.'); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [open, producto]);

  if (!open || !producto) return null;

  const stockTotal = lotes.reduce((sum, l) => sum + l.stock, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-zinc-800">Lotes de stock</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{producto.nombre}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200 shrink-0 flex items-center justify-between">
          <span className="text-sm text-zinc-600">
            Stock total: <span className="font-bold text-zinc-800">{stockTotal}</span>
            <span className="text-zinc-400"> · Mínimo: {producto.stockMinimo}</span>
          </span>
          <span className="text-[11px] text-zinc-400">El stock se modifica desde Compras o Traslados.</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <div className="py-10 text-center text-sm text-zinc-400">Cargando lotes...</div>
          ) : lotes.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">Este producto no tiene lotes con stock.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-100 text-left text-[11px] font-bold uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Lote</th>
                  <th className="px-4 py-2.5">F. Vencimiento</th>
                  <th className="px-4 py-2.5 text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lotes.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-50/60">
                    <td className="px-4 py-2 text-zinc-700">{l.lote ?? <span className="text-zinc-400 italic">sin lote</span>}</td>
                    <td className="px-4 py-2 text-zinc-700">
                      {l.fechaVencimiento ? new Date(l.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-PE') : <span className="text-zinc-400 italic">sin fecha</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-zinc-800">{l.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {error && <p className="px-6 py-2 text-xs text-red-500 font-medium shrink-0">{error}</p>}

        <div className="flex justify-end px-6 py-4 border-t border-zinc-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
