'use client';

import { useEffect, useState } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import type { TipoMovimiento, CategoriaMovimiento, MedioPago } from '@/api/movimientoCaja';

interface RegistrarMovimientoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    tipo: TipoMovimiento;
    categoria: CategoriaMovimiento;
    numero: string;
    fechaEmision: string;
    descripcion: string;
    monto: number;
    medioPago: MedioPago;
  }) => Promise<void>;
}

const CATEGORIAS_INGRESO: { value: CategoriaMovimiento; label: string }[] = [
  { value: 'APORTE_CAPITAL', label: 'Aporte de capital' },
  { value: 'DEVOLUCION', label: 'Devolución recibida' },
  { value: 'OTRO', label: 'Otro' },
];

const CATEGORIAS_EGRESO: { value: CategoriaMovimiento; label: string }[] = [
  { value: 'RETIRO_EFECTIVO', label: 'Retiro de efectivo' },
  { value: 'PAGO_PROVEEDOR', label: 'Pago a proveedor' },
  { value: 'PAGO_SERVICIOS', label: 'Pago de servicios' },
  { value: 'GASTO_VARIO', label: 'Gasto vario' },
  { value: 'DEVOLUCION', label: 'Devolución entregada' },
  { value: 'OTRO', label: 'Otro' },
];

const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'YAPE_PLIN', label: 'Yape / Plin' },
];

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function RegistrarMovimientoModal({
  open,
  onClose,
  onConfirm,
}: RegistrarMovimientoModalProps) {
  const [tipo, setTipo] = useState<TipoMovimiento>('EGRESO');
  const [categoria, setCategoria] = useState<CategoriaMovimiento>('RETIRO_EFECTIVO');
  const [numero, setNumero] = useState('');
  const [fechaEmision, setFechaEmision] = useState(hoyISO());
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [medioPago, setMedioPago] = useState<MedioPago>('EFECTIVO');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTipo('EGRESO');
      setCategoria('RETIRO_EFECTIVO');
      setNumero('');
      setFechaEmision(hoyISO());
      setDescripcion('');
      setMonto('');
      setMedioPago('EFECTIVO');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const categorias = tipo === 'INGRESO' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;

  const handleTipoChange = (nuevoTipo: TipoMovimiento) => {
    setTipo(nuevoTipo);
    const primera = nuevoTipo === 'INGRESO' ? CATEGORIAS_INGRESO[0] : CATEGORIAS_EGRESO[0];
    setCategoria(primera.value);
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!numero.trim()) return setError('El número es obligatorio.');
    if (!fechaEmision) return setError('La fecha de emisión es obligatoria.');
    if (!descripcion.trim()) return setError('El motivo es obligatorio.');
    const montoNum = Number(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) return setError('Ingresa un importe válido mayor a cero.');

    setSaving(true);
    try {
      await onConfirm({
        tipo,
        categoria,
        numero: numero.trim(),
        fechaEmision,
        descripcion: descripcion.trim(),
        monto: montoNum,
        medioPago,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el movimiento.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "text-xs font-semibold text-zinc-600";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-primary transition-colors duration-300" />
            <h2 className="text-sm font-bold text-zinc-800">
              Datos del {tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-zinc-400 hover:text-zinc-600"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleTipoChange('INGRESO')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tipo === 'INGRESO' ? 'bg-green-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => handleTipoChange('EGRESO')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tipo === 'EGRESO' ? 'bg-red-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Egreso
            </button>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Tipo</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaMovimiento)} className={inputClass}>
              {categorias.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Número de Transacción</label>
              <input autoFocus value={numero} onChange={(e) => setNumero(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Fecha Emisión</label>
              <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelClass}>Motivo</label>
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelClass}>Importe</label>
              <div className="flex items-center rounded-lg border border-zinc-300 bg-zinc-50 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all">
                <span className="pl-3 text-sm text-zinc-500">S/.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full px-2 py-2 bg-transparent text-sm focus:outline-hidden"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Medio Pago</label>
              <select value={medioPago} onChange={(e) => setMedioPago(e.target.value as MedioPago)} className={inputClass}>
                {MEDIOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
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