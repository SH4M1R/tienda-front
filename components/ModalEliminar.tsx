'use client';

import { useState } from 'react';
import { Trash2, X, AlertCircle } from 'lucide-react';

interface ModalEliminarProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  titulo?: string;
  mensaje: string;
  errorMensajeDefault?: string;
}

export default function ModalEliminar({
  isOpen,
  onClose,
  onConfirm,
  titulo = 'Confirmar eliminación',
  mensaje,
  errorMensajeDefault,
}: ModalEliminarProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmar = async () => {
    try {
      setCargando(true);
      setError(null);
      await onConfirm();
      handleClose();
    } catch {
      setError(
        errorMensajeDefault ||
          'Ocurrió un error al intentar eliminar este registro.'
      );
    } finally {
      setCargando(false);
    }
  };

  const handleClose = () => {
    if (cargando) return;
    setError(null);
    setCargando(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Trash2 size={20} className="text-red-500" />
            <h2 className="text-lg font-bold text-zinc-800">{titulo}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={cargando}
            className="text-zinc-400 transition-colors hover:text-zinc-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          <p className="text-sm text-zinc-600 leading-relaxed">{mensaje}</p>

          {/* Banner de error cuando la API retorna una excepción */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={cargando}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={cargando}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all hover:bg-red-700 hover:shadow-md disabled:opacity-50"
            >
              {cargando ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}