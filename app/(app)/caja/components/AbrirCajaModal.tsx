'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AbrirCajaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (montoInicial: number) => Promise<void>;
}

export default function AbrirCajaModal({ open, onClose, onConfirm }: AbrirCajaModalProps) {
  const [monto, setMonto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = Number(monto);
    if (!monto || isNaN(valor) || valor < 0) {
      setError('Ingresa un monto inicial válido.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onConfirm(valor);
      setMonto('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la caja.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-800">Abrir Caja</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Monto inicial (efectivo)</label>
            <input
              type="number" step="0.01" min="0" autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="S/ 0.00"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-60">
              {saving ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
