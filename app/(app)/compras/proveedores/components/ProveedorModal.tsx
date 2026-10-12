'use client';

import { useEffect, useState } from 'react';
import { X, Building2 } from 'lucide-react';
import type { Proveedor, ProveedorRequestDTO } from '@/api/proveedores';

interface ProveedorModalProps {
  open: boolean;
  proveedor?: Proveedor | null;
  onClose: () => void;
  onSave: (data: ProveedorRequestDTO) => Promise<void> | void;
}

const initialForm: ProveedorRequestDTO = {
  tipoDocumento: 'RUC',
  numeroDocumento: '',
  nombres: '',
  departamento: '',
  provincia: '',
  distrito: '',
  direccion: '',
  telefono: '',
  correo: '',
  contactoNombres: '',
  contactoCelular: '',
  contactoCorreo: '',
};

export default function ProveedorModal({
  open,
  proveedor,
  onClose,
  onSave,
}: ProveedorModalProps) {
  const [form, setForm] = useState<ProveedorRequestDTO>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (proveedor) {
      setForm({
        tipoDocumento: proveedor.tipoDocumento || 'RUC',
        numeroDocumento: proveedor.numeroDocumento || '',
        nombres: proveedor.nombres || '',
        departamento: proveedor.departamento || '',
        provincia: proveedor.provincia || '',
        distrito: proveedor.distrito || '',
        direccion: proveedor.direccion || '',
        telefono: proveedor.telefono || '',
        correo: proveedor.correo || '',
        contactoNombres: proveedor.contactoNombres || '',
        contactoCelular: proveedor.contactoCelular || '',
        contactoCorreo: proveedor.contactoCorreo || '',
      });
    } else {
      setForm(initialForm);
    }
    setError('');
  }, [proveedor, open]);

  if (!open) return null;

  const handleClose = () => {
    setForm(initialForm);
    setError('');
    onClose();
  };

  const handleChange = (campo: keyof ProveedorRequestDTO, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numeroDocumento.trim() || !form.nombres.trim()) {
      return setError('El número de documento y la razón social son obligatorios.');
    }

    setSaving(true);
    setError('');
    try {
      await onSave(form);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all';
  const labelClass = 'text-xs font-semibold text-zinc-600';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 shrink-0">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-primary transition-colors duration-300" />
            <h2 className="text-sm font-bold text-zinc-800">
              {proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario con Scroll si es necesario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Documento y Tipo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Tipo Documento</label>
              <select
                value={form.tipoDocumento}
                onChange={(e) => handleChange('tipoDocumento', e.target.value)}
                className={inputClass}
              >
                <option value="RUC">RUC</option>
                <option value="DNI">DNI</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className={labelClass}>N° Documento *</label>
              <input
                autoFocus
                value={form.numeroDocumento}
                onChange={(e) => handleChange('numeroDocumento', e.target.value)}
                className={inputClass}
                placeholder="Ej. 20123456789"
              />
            </div>
          </div>

          {/* Nombre / Razón Social */}
          <div className="space-y-1">
            <label className={labelClass}>Nombres / Razón Social *</label>
            <input
              value={form.nombres}
              onChange={(e) => handleChange('nombres', e.target.value)}
              className={inputClass}
              placeholder="Ej. Distribuidora Comercial S.A.C."
            />
          </div>

          {/* Ubicación */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Departamento</label>
              <input
                value={form.departamento}
                onChange={(e) => handleChange('departamento', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Provincia</label>
              <input
                value={form.provincia}
                onChange={(e) => handleChange('provincia', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Distrito</label>
              <input
                value={form.distrito}
                onChange={(e) => handleChange('distrito', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Dirección */}
          <div className="space-y-1">
            <label className={labelClass}>Dirección</label>
            <input
              value={form.direccion}
              onChange={(e) => handleChange('direccion', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Teléfono y Correo Principal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Teléfono Empresa</label>
              <input
                value={form.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Correo Empresa</label>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => handleChange('correo', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Sección Datos de Contacto */}
          <div className="pt-2 border-t border-zinc-100">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Persona de Contacto
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className={labelClass}>Contacto Nombres</label>
                <input
                  value={form.contactoNombres}
                  onChange={(e) => handleChange('contactoNombres', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Contacto Celular</label>
                <input
                  value={form.contactoCelular}
                  onChange={(e) => handleChange('contactoCelular', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>Contacto Correo</label>
                <input
                  type="email"
                  value={form.contactoCorreo}
                  onChange={(e) => handleChange('contactoCorreo', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs transition-all disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}