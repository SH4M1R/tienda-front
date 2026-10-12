'use client';

import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface Props {
  open: boolean;
  numeroArqueo?: string;
  /** Efectivo que el sistema espera encontrar en caja. */
  esperado: number;
  onClose: () => void;
  onConfirm: (montoFinal: number, montoDejado: number) => Promise<void>;
}

const money = (n: number) => `S/ ${n.toFixed(2)}`;

export default function CerrarCajaModal({ open, numeroArqueo, esperado, onClose, onConfirm }: Props) {
  const [montoFinal, setMontoFinal] = useState('');
  const [montoDejado, setMontoDejado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const final = Number(montoFinal);
  const dif = montoFinal.trim() === '' || Number.isNaN(final) ? null : final - esperado;

  const handleConfirmar = async () => {
    const dejado = Number(montoDejado);
    if (montoFinal.trim() === '' || Number.isNaN(final) || final < 0) { setError('Ingresa el efectivo contado.'); return; }
    if (montoDejado.trim() === '' || Number.isNaN(dejado) || dejado < 0) { setError('Ingresa el monto que dejas en caja.'); return; }
    setEnviando(true);
    setError('');
    try {
      await onConfirm(final, dejado);
      setMontoFinal(''); setMontoDejado('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la caja.');
    } finally {
      setEnviando(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-zinc-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-primary" />
            <h3 className="font-semibold text-sm text-zinc-900">Cerrar {numeroArqueo ?? 'caja'}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-500">
            Cuenta el efectivo físico. El sistema espera <b className="text-zinc-700">{money(esperado)}</b> en caja.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Efectivo contado (S/)</label>
            <input type="number" min={0} step="0.01" value={montoFinal} onChange={(e) => setMontoFinal(e.target.value)} placeholder="0.00" className={inputClass} autoFocus />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Monto dejado en caja (S/)</label>
            <input type="number" min={0} step="0.01" value={montoDejado} onChange={(e) => setMontoDejado(e.target.value)} placeholder="0.00" className={inputClass} />
            <p className="text-[11px] text-zinc-400">Para el siguiente turno.</p>
          </div>

          {dif !== null && (
            <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${dif === 0 ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-700'}`}>
              {dif === 0 ? 'La caja cuadra perfectamente.' : dif > 0 ? `Sobrante de ${money(dif)}` : `Faltante de ${money(Math.abs(dif))}`}
            </p>
          )}

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={enviando} className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-500 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-50">Cancelar</button>
            <button onClick={handleConfirmar} disabled={enviando} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50">
              {enviando ? 'Cerrando...' : 'Cerrar caja'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
