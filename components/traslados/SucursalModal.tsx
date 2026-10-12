'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { sucursalesApi, type Sucursal } from '@/api/traslados';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (sucursal: Sucursal) => void;
}

export default function SucursalModal({ open, onClose, onCreated }: Props) {
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleClose = () => {
    setNombre('');
    setError(null);
    onClose();
  };

  const handleGuardar = async () => {
    setError(null);
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    setGuardando(true);
    try {
      const sucursal = await sucursalesApi.crear(nombre.trim());
      onCreated(sucursal);
      setNombre('');
      onClose();
    } catch {
      setError('Ocurrió un error al crear la sucursal.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">Nueva sucursal</h2>
          <button onClick={handleClose} className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGuardar()}
            placeholder="Ej. Sucursal Miraflores"
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          {error && <p className="text-xs text-red-500 font-medium mt-1.5">{error}</p>}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold text-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Crear sucursal'}
          </button>
        </div>
      </div>
    </div>
  );
}