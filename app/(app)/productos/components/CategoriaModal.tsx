'use client';

import { useState } from 'react';
import { X, Tag } from 'lucide-react';

interface CategoriaModalProps {
  open: boolean;
  item?: { id: number; nombre: string } | null;
  onClose: () => void;
  onSave: (nombre: string) => Promise<void>;
}

export default function CategoriaModal({ open, item, onClose, onSave }: CategoriaModalProps) {
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prev, setPrev] = useState<string | null>(null);
  const clave = open ? `${item?.id ?? 'nuevo'}` : null;
  if (clave !== prev) {
    setPrev(clave);
    if (open) { setNombre(item?.nombre ?? ''); setError(''); }
  }
  if (!open) return null;

  const handleClose = () => {
    setNombre('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return setError('El nombre es obligatorio.');

    setSaving(true);
    setError('');
    try {
      await onSave(nombre.trim());
      handleClose();
    } catch {
      setError('No se pudo guardar. Verifica que no exista ya.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-primary transition-colors duration-300" />
            <h2 className="text-sm font-bold text-zinc-800">{item ? 'Editar categoría' : 'Nueva categoría'}</h2>
          </div>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600">Nombre de la categoría</label>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Abarrotes"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={handleClose} className="px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}