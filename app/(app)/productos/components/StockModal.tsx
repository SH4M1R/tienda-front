'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { productosApi, type LoteProducto, type Producto } from '@/api/productos';

interface StockModalProps {
  open: boolean;
  producto: Producto | null;
  onClose: () => void;
  /** Se llama después de crear o editar un lote (para refrescar stock y alertas). */
  onChanged?: () => void;
}

interface FormLote { id: number | null; lote: string; fechaVencimiento: string; stock: string }

const vacio: FormLote = { id: null, lote: '', fechaVencimiento: '', stock: '' };

const inputClass = 'w-full px-3 py-1.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';

export default function StockModal({ open, producto, onClose, onChanged }: StockModalProps) {
  const [lotes, setLotes] = useState<LoteProducto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormLote | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async (id: number) => {
    setCargando(true);
    setError('');
    try {
      setLotes(await productosApi.lotes(id));
    } catch {
      setError('No se pudieron cargar los lotes de este producto.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !producto) return;
    setForm(null);
    void cargar(producto.id);
  }, [open, producto, cargar]);

  if (!open || !producto) return null;

  const stockTotal = lotes.reduce((sum, l) => sum + l.stock, 0);

  const editar = (l: LoteProducto) => {
    setError('');
    setForm({ id: l.id, lote: l.lote ?? '', fechaVencimiento: l.fechaVencimiento ?? '', stock: String(l.stock) });
  };

  const guardar = async () => {
    if (!form) return;
    const stock = Number(form.stock);
    if (form.stock === '' || !Number.isInteger(stock) || stock < 0) return setError('El stock debe ser un número entero mayor o igual a 0.');
    setGuardando(true);
    setError('');
    try {
      const payload = { lote: form.lote.trim() || null, fechaVencimiento: form.fechaVencimiento || null, stock };
      if (form.id == null) await productosApi.crearLote(producto.id, payload);
      else await productosApi.actualizarLote(producto.id, form.id, payload);
      setForm(null);
      await cargar(producto.id);
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo guardar el lote.');
    } finally {
      setGuardando(false);
    }
  };

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

        <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200 shrink-0 flex items-center justify-between gap-3">
          <span className="text-sm text-zinc-600">
            Stock total: <span className="font-bold text-zinc-800">{stockTotal}</span>
            <span className="text-zinc-400"> · Mínimo: {producto.stockMinimo}</span>
          </span>
          {!form && (
            <button
              type="button"
              onClick={() => { setError(''); setForm({ ...vacio }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-all cursor-pointer"
            >
              <Plus size={14} /> Nuevo lote
            </button>
          )}
        </div>

        {form && (
          <div className="px-6 py-4 border-b border-zinc-200 bg-primary/5 shrink-0 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{form.id == null ? 'Nuevo lote' : 'Editar lote'}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Lote</label>
                <input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} placeholder="Sin lote" className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">F. Vencimiento</label>
                <input type="date" value={form.fechaVencimiento} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600">Stock (und)</label>
                <input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} disabled={guardando} className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
              <button type="button" onClick={guardar} disabled={guardando} className="px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-all disabled:opacity-60 flex items-center gap-1.5 cursor-pointer">
                <Check size={14} /> {guardando ? 'Guardando...' : 'Guardar lote'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {cargando ? (
            <div className="py-10 text-center text-sm text-zinc-400">Cargando lotes...</div>
          ) : lotes.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-400">Este producto no tiene lotes. Crea el primero con «Nuevo lote».</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-100 text-left text-[11px] font-bold uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2.5">Lote</th>
                  <th className="px-4 py-2.5">F. Vencimiento</th>
                  <th className="px-4 py-2.5 text-right">Stock</th>
                  <th className="px-4 py-2.5 text-right"></th>
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
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => editar(l)}
                        title="Editar lote"
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors border-2 cursor-pointer"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
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
