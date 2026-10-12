'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ROLES, DIAS_SEMANA } from '@/api/empleados';
import type { Empleado, EmpleadoPayload } from '@/api/empleados';

interface EmpleadoModalProps {
  open: boolean;
  empleado: Empleado | null;
  onClose: () => void;
  onSave: (data: EmpleadoPayload) => Promise<void>;
}

const emptyForm: EmpleadoPayload = {
  nombre: '', username: '', password: '', rol: ROLES[1].value, estado: true,
  horaEntrada: '', horaSalida: '', diaDescanso: DIAS_SEMANA[6]
};

export default function EmpleadoModal({ open, empleado, onClose, onSave }: EmpleadoModalProps) {
  const [form, setForm] = useState<EmpleadoPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    setForm(empleado ? {
      nombre: empleado.nombre,
      username: empleado.username,
      password: '',
      rol: empleado.rol,
      estado: empleado.estado,
      horaEntrada: empleado.horaEntrada ?? '',
      horaSalida: empleado.horaSalida ?? '',
      diaDescanso: empleado.diaDescanso ?? DIAS_SEMANA[6],
    } : emptyForm);
  }, [empleado, open]);

  if (!open) return null;

  const set = (field: keyof EmpleadoPayload, value: EmpleadoPayload[keyof EmpleadoPayload]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    if (!form.username.trim()) return setError('El usuario es obligatorio.');
    if (!empleado && !form.password?.trim()) return setError('La contraseña es obligatoria.');

    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el empleado.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "text-xs font-semibold text-zinc-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-800">{empleado ? 'Editar empleado' : 'Nuevo empleado'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className={labelClass}>Nombre completo</label>
            <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Usuario</label>
              <input value={form.username} onChange={(e) => set('username', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Rol</label>
              <select value={form.rol} onChange={(e) => set('rol', e.target.value)} className={inputClass}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>
              {empleado ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder={empleado ? 'Dejar en blanco para no cambiarla' : ''}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Hora de entrada</label>
              <input type="time" value={form.horaEntrada ?? ''} onChange={(e) => set('horaEntrada', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Hora de salida</label>
              <input type="time" value={form.horaSalida ?? ''} onChange={(e) => set('horaSalida', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Día de descanso</label>
            <select value={form.diaDescanso ?? ''} onChange={(e) => set('diaDescanso', e.target.value)} className={inputClass}>
              {DIAS_SEMANA.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.estado} onChange={(e) => set('estado', e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-sm font-medium text-zinc-700">Empleado activo</span>
          </label>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}