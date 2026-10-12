'use client';

import { AlertTriangle, X } from 'lucide-react';

interface CajaCerradaModalProps {
  open: boolean;
  onClose: () => void;
  onIrAArqueo: () => void;
}

export function CajaCerradaModal({ open, onClose, onIrAArqueo }: CajaCerradaModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" />
            <h2 className="text-lg font-bold text-zinc-800">Caja no abierta</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-600">
            Debes abrir tu caja (arqueo) antes de poder generar una venta.
          </p>
          <div className="flex justify-end gap-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={onIrAArqueo} 
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all"
            >
              Ir a Arqueo de Caja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}