'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Plus, ImagePlus, Trash2, ImageIcon } from 'lucide-react';
import { categoriasApi, urlImagenProducto } from "@/api/productos";
import type { Producto, ProductoPayload, Categoria } from "@/api/productos";
import CategoriaModal from './CategoriaModal';

export function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 cursor-pointer ${checked ? 'bg-primary' : 'bg-zinc-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}


/** Cambio de imagen pedido en el modal: subir un archivo nuevo o quitar la actual. */
export interface CambioImagen { archivo: File | null; quitar: boolean }

interface ProductoModalProps {
  open: boolean;
  producto: Producto | null;
  onClose: () => void;
  onSave: (data: ProductoPayload, imagen: CambioImagen) => Promise<Producto>;
}

const emptyForm: ProductoPayload = {
  nombre: '', precioCompra: 0, precioVenta: 0, stockMinimo: 0, estado: true, barras: '',
  unidadesCaja: null, precioCaja: null, factor: null, categoriaId: 0, porPeso: false,
};

export default function ProductoModal({ open, producto, onClose, onSave }: ProductoModalProps) {
  const [form, setForm] = useState<ProductoPayload>(emptyForm);
  const [vendePorCaja, setVendePorCaja] = useState(false);
  // El costo se ingresa por caja/paquete; el costo por unidad se calcula con el factor.
  const [factor, setFactor] = useState<number>(1);
  const [costoPaquete, setCostoPaquete] = useState<number>(0);
  // Producto por peso: el saco/paquete se guarda entero pero se vende por kg o gramos (stock interno en gramos).
  const [porPeso, setPorPeso] = useState(false);
  const [pesoKg, setPesoKg] = useState<number>(0);
  const [stockMinKg, setStockMinKg] = useState<number>(0);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalCatAbierto, setModalCatAbierto] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cargarCategorias = () => categoriasApi.listar().then(setCategorias).catch(() => setCategorias([]));

  useEffect(() => {
    if (!open) return;
    cargarCategorias();
    setError('');
    setForm(producto ? {
      nombre: producto.nombre,
      precioCompra: producto.precioCompra,
      precioVenta: producto.precioVenta,
      stockMinimo: producto.stockMinimo ?? 0,
      estado: producto.estado,
      barras: producto.barras ?? '',
      unidadesCaja: producto.unidadesCaja ?? null,
      precioCaja: producto.precioCaja ?? null,
      factor: producto.factor ?? null,
      categoriaId: producto.categoriaId,
      porPeso: !!producto.porPeso,
    } : emptyForm);
    const f = producto ? (producto.factor && producto.factor > 0 ? producto.factor : producto.unidadesCaja && producto.unidadesCaja > 0 ? producto.unidadesCaja : 1) : 1;
    const pp = !!producto?.porPeso;
    setPorPeso(pp);
    setPesoKg(pp ? f / 1000 : 0);
    setStockMinKg(pp ? (producto?.stockMinimo ?? 0) / 1000 : 0);
    setFactor(f);
    // Por peso: precioCompra es por kg y el factor está en gramos
    setCostoPaquete(producto ? Number((producto.precioCompra * (pp ? f / 1000 : f)).toFixed(4)) : 0);
    setVendePorCaja(!pp && !!producto && !!producto.unidadesCaja && !!producto.precioCaja);
    setArchivo(null);
    setQuitarImagen(false);
  }, [producto, open]);

  // Vista previa local del archivo elegido (sin límite de tamaño)
  useEffect(() => {
    if (!archivo) { setPreview(null); return; }
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  if (!open) return null;

  const set = <K extends keyof ProductoPayload>(field: K, value: ProductoPayload[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleGuardarCategoria = async (nombre: string) => {
    const nueva = await categoriasApi.crear({ nombre });
    await cargarCategorias();
    set('categoriaId', nueva.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.');
    if (!form.categoriaId) return setError('Selecciona una categoría.');
    if (porPeso) {
      if (!(pesoKg > 0) || Math.round(pesoKg * 1000) < 1) return setError('Ingresa el peso del saco o paquete en kg.');
    } else if (!factor || factor < 1 || !Number.isInteger(factor)) return setError('Ingresa el factor (unidades por caja o paquete, mínimo 1).');
    if (!(costoPaquete >= 0)) return setError('Ingresa el precio costo.');
    if (!form.precioVenta || form.precioVenta <= 0) return setError(porPeso ? 'Ingresa el precio de venta por kg.' : 'Ingresa el precio de venta.');
    if (!porPeso && vendePorCaja && (factor < 2 || !form.precioCaja || form.precioCaja <= 0)) {
      return setError('Para vender por caja el factor debe ser mayor a 1 y debes indicar el precio de la caja.');
    }

    const data: ProductoPayload = {
      ...form,
      precioCompra: costoUnitario,
      nombre: form.nombre.trim(),
      barras: form.barras?.trim() || null,
      unidadesCaja: !porPeso && vendePorCaja ? factor : null,
      factor: porPeso ? factorEfectivo : factor,
      precioCaja: !porPeso && vendePorCaja ? form.precioCaja : null,
      porPeso,
      stockMinimo: porPeso ? Math.round(stockMinKg * 1000) : form.stockMinimo,
    };

    setSaving(true);
    setError('');
    try {
      await onSave(data, { archivo, quitar: quitarImagen });
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'No se pudo guardar el producto.');
    } finally {
      setSaving(false);
    }
  };

  const factorEfectivo = porPeso ? Math.round(pesoKg * 1000) : factor;
  // Por unidad: costo por unidad. Por peso: costo por KG.
  const costoUnitario = porPeso
    ? (costoPaquete > 0 && pesoKg > 0 ? Number((costoPaquete / pesoKg).toFixed(4)) : 0)
    : (costoPaquete > 0 && factor > 0 ? Number((costoPaquete / factor).toFixed(4)) : 0);
  const gananciaUnidadPct = costoUnitario > 0 ? ((form.precioVenta - costoUnitario) / costoUnitario) * 100 : 0;
  const costoCaja = costoPaquete;
  const gananciaCajaPct = costoCaja > 0 && form.precioCaja ? ((form.precioCaja - costoCaja) / costoCaja) * 100 : 0;

  const imagenActual = !quitarImagen && producto ? urlImagenProducto(producto) : null;
  const imagenMostrada = preview ?? imagenActual;

  const inputClass = "w-full px-3 py-2 rounded-lg border border-zinc-300 bg-zinc-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const calculatedInputClass = "w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-700 cursor-not-allowed";
  const labelClass = "text-xs font-semibold text-zinc-600";
  const addBtnClass = "flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-zinc-800">{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Información General</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className={labelClass}>Nombre del Producto</label>
                <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={labelClass}>Categoría</label>
                  <button type="button" onClick={() => setModalCatAbierto(true)} className={addBtnClass}>
                    <Plus size={12} /> Nueva
                  </button>
                </div>
                <select value={form.categoriaId} onChange={(e) => set('categoriaId', Number(e.target.value))} className={inputClass}>
                  <option value={0} disabled>Selecciona...</option>
                  {categorias.map((cat) => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="space-y-1">
                <label className={labelClass}>Código de barras</label>
                <input 
                  value={form.barras ?? ''} 
                  onChange={(e) => set('barras', e.target.value)} 
                  className={inputClass} 
                />
              </div>

              <div className="flex items-center pt-2 md:pt-7">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={form.estado} 
                    onChange={(e) => set('estado', e.target.checked)} 
                    className="w-4 h-4 accent-primary rounded cursor-pointer" 
                  />
                  <span className="text-sm font-medium text-zinc-700">Producto activo</span>
                </label>
                <label className="ml-4 flex items-center gap-2 cursor-pointer select-none" title="Se compra por saco/paquete y se vende por kg o gramos">
                  <input type="checkbox" checked={porPeso} onChange={(e) => setPorPeso(e.target.checked)} className="w-4 h-4 accent-primary rounded cursor-pointer" />
                  <span className="text-sm font-medium text-zinc-700">Se vende por peso</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Imagen del producto</label>
                <div className="flex items-center gap-3">
                  {imagenMostrada ? (
                    <img src={imagenMostrada} alt="Vista previa" className="h-16 w-16 rounded-lg border border-zinc-200 object-cover shrink-0" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-zinc-300">
                      <ImageIcon size={22} />
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0] ?? null; if (f) { setArchivo(f); setQuitarImagen(false); } e.target.value = ''; }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary border-2 border-primary/30 hover:bg-primary/10 rounded-lg transition-colors cursor-pointer">
                      <ImagePlus size={14} /> {imagenMostrada ? 'Cambiar' : 'Agregar imagen'}
                    </button>
                    {imagenMostrada && (
                      <button type="button" onClick={() => { setArchivo(null); setQuitarImagen(true); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 border-2 border-red-100 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                        <Trash2 size={14} /> Quitar
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">Se guarda en la carpeta definida en Configuración de la empresa.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Precios y Stock</h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {porPeso ? (
                <div className="space-y-1">
                  <label className={labelClass}>Peso del saco/paquete (kg)</label>
                  <input type="number" min="0" step="0.001" value={pesoKg || ''} placeholder="Ej. 50"
                    onChange={(e) => setPesoKg(e.target.value ? Math.max(0, Number(e.target.value)) : 0)} className={inputClass} />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className={labelClass}>Factor (unidades por caja/paquete)</label>
                  <input type="number" min="1" step="1" value={factor || ''} placeholder="Ej. 12"
                    onChange={(e) => setFactor(e.target.value ? Math.max(0, Math.floor(Number(e.target.value))) : 0)} className={inputClass} />
                </div>
              )}
              <div className="space-y-1">
                <label className={labelClass}>{porPeso ? 'Precio costo por saco/paquete' : 'Precio costo por caja/paquete'}</label>
                <input type="number" step="0.01" min="0" value={costoPaquete} onChange={(e) => setCostoPaquete(Number(e.target.value))} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>{porPeso ? 'Precio costo por kg' : 'Precio costo por unidad'}</label>
                <input type="text" disabled value={`S/ ${costoUnitario.toFixed(4)}`} className={calculatedInputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>{porPeso ? 'Precio venta por kg' : 'Precio venta unidad'}</label>
                <input type="number" step="0.01" min="0" value={form.precioVenta} onChange={(e) => set('precioVenta', Number(e.target.value))} className={inputClass} />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>{porPeso ? '% Ganancia (kg)' : '% Ganancia (Unidades)'}</label>
                <input
                  type="text"
                  disabled
                  value={`${gananciaUnidadPct >= 0 ? '+' : ''}${gananciaUnidadPct.toFixed(1)}%`}
                  className={`${calculatedInputClass} ${gananciaUnidadPct < 0 ? 'text-red-500' : 'text-primary'}`}
                />
              </div>
              <div className="space-y-1">
                <label className={labelClass}>{porPeso ? 'Stock Mínimo (kg)' : 'Stock Mínimo'}</label>
                {porPeso
                  ? <input type="number" min="0" step="0.001" value={stockMinKg} onChange={(e) => setStockMinKg(Number(e.target.value))} className={inputClass} />
                  : <input type="number" min="0" value={form.stockMinimo ?? ''} onChange={(e) => set('stockMinimo', Number(e.target.value))} className={inputClass} />}
              </div>
            </div>

            {porPeso && (
              <p className="text-[11px] text-zinc-400">
                Se compra por saco/paquete (o por kg) y se guarda el stock en gramos; en ventas el cajero indica el peso o el monto y se calcula el otro.
              </p>
            )}

            {!producto && (
              <p className="text-[11px] text-zinc-400">El stock se ingresa desde Compras o Traslados (cada ingreso crea su lote).</p>
            )}
          </div>

          {!porPeso && <div className="space-y-4 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Presentaciones de Venta</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Actívalo si también se vende por caja (usa el factor como unidades por caja).</p>
              </div>
              <ToggleSwitch checked={vendePorCaja} onChange={setVendePorCaja} />
            </div>

            {vendePorCaja && (
              <div className="rounded-xl border border-zinc-200 p-4 space-y-3 max-w-md">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={labelClass}>Unidades por caja</label>
                    <input type="text" disabled value={factor > 0 ? factor : ''} className={calculatedInputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Precio por caja</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={form.precioCaja ?? ''}
                      onChange={(e) => set('precioCaja', e.target.value ? Number(e.target.value) : null)}
                      className={inputClass}
                      placeholder="S/ 0.00"
                    />
                  </div>
                </div>
                {form.precioCaja && factor > 1 ? (
                  <p className="text-xs text-zinc-500 font-medium">
                    Costo caja: S/ {costoCaja.toFixed(2)} | Ganancia: <span className={gananciaCajaPct < 0 ? 'text-red-500 font-bold' : 'text-primary font-bold'}>{gananciaCajaPct >= 0 ? '+' : ''}{gananciaCajaPct.toFixed(1)}%</span>
                  </p>
                ) : null}
              </div>
            )}
          </div>}

          <div className="flex items-center justify-end pt-2 border-t border-zinc-100">
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-xs hover:shadow-md transition-all disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      <CategoriaModal open={modalCatAbierto} onClose={() => setModalCatAbierto(false)} onSave={handleGuardarCategoria} />
    </div>
  );
}
